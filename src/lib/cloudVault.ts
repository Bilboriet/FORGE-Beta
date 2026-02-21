import { LS_KEYS } from "../constants";
import { supabase } from "./supabaseClient";

export type VaultResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

type WithOptionalId = { id?: string; [k: string]: unknown };

const CHUNK_SIZE = 100;

/*
  Supabase SQL (run only if tables do not already exist):

  create table if not exists public.workout_sessions (
    user_id uuid not null references auth.users(id) on delete cascade,
    client_id text not null,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    primary key (user_id, client_id)
  );

  create table if not exists public.workout_templates (
    user_id uuid not null references auth.users(id) on delete cascade,
    client_id text not null,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    primary key (user_id, client_id)
  );

  alter table public.workout_sessions enable row level security;
  alter table public.workout_templates enable row level security;

  create policy "sessions own rows"
    on public.workout_sessions for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy "templates own rows"
    on public.workout_templates for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
*/

export function nowISO() {
  return new Date().toISOString();
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createStableId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `forge_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureHasIds<T extends WithOptionalId>(items: T[]) {
  let didChange = false;
  const updated = (Array.isArray(items) ? items : []).map((item) => {
    if (item && typeof item.id === "string" && item.id.trim()) return item;
    didChange = true;
    return { ...item, id: createStableId() } as T;
  });
  return { items: updated, didChange };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function upsertRows(table: "workout_sessions" | "workout_templates", rows: Record<string, unknown>[]) {
  if (!supabase || rows.length === 0) return;

  for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
    const primary = await supabase
      .from(table)
      .upsert(chunk, { onConflict: "user_id,client_id" });

    if (!primary.error) continue;

    const fallback = await supabase
      .from(table)
      .upsert(chunk, { onConflict: "client_id" });

    if (!fallback.error) continue;

    for (const row of chunk) {
      const single = await supabase
        .from(table)
        .upsert(row, { onConflict: "user_id,client_id" });
      if (single.error) throw single.error;
    }
  }
}

export async function backupToCloud(userId: string): Promise<VaultResult> {
  if (!supabase) return { ok: false, message: "Supabase not configured." };

  try {
    const rawSessions = readJson<WithOptionalId[]>(LS_KEYS.sessions, []);
    const rawTemplates = readJson<WithOptionalId[]>(LS_KEYS.templates, []);

    const ensuredSessions = ensureHasIds(rawSessions);
    const ensuredTemplates = ensureHasIds(rawTemplates);

    if (ensuredSessions.didChange) writeJson(LS_KEYS.sessions, ensuredSessions.items);
    if (ensuredTemplates.didChange) writeJson(LS_KEYS.templates, ensuredTemplates.items);

    const updatedAt = nowISO();

    const sessionRows = ensuredSessions.items.map((item) => ({
      user_id: userId,
      client_id: String(item.id),
      data: item,
      updated_at: updatedAt,
    }));
    const templateRows = ensuredTemplates.items.map((item) => ({
      user_id: userId,
      client_id: String(item.id),
      data: item,
      updated_at: updatedAt,
    }));

    await upsertRows("workout_sessions", sessionRows);
    await upsertRows("workout_templates", templateRows);

    localStorage.setItem(LS_KEYS.cloudLastBackupAt, updatedAt);
    return { ok: true };
  } catch {
    return { ok: false, message: "Cloud backup failed." };
  }
}

export async function restoreFromCloud(userId: string): Promise<VaultResult> {
  if (!supabase) return { ok: false, message: "Supabase not configured." };

  try {
    const [sessionsRes, templatesRes] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select("data")
        .eq("user_id", userId),
      supabase
        .from("workout_templates")
        .select("data")
        .eq("user_id", userId),
    ]);

    if (sessionsRes.error || templatesRes.error) {
      return { ok: false, message: "Cloud restore failed." };
    }

    const sessions = (sessionsRes.data ?? []).map((r: any) => r.data).filter(Boolean);
    const templates = (templatesRes.data ?? []).map((r: any) => r.data).filter(Boolean);

    writeJson(LS_KEYS.sessions, sessions);
    writeJson(LS_KEYS.templates, templates);
    localStorage.setItem(LS_KEYS.cloudLastRestoreAt, nowISO());

    return { ok: true };
  } catch {
    return { ok: false, message: "Cloud restore failed." };
  }
}

export async function getCloudSummary(userId: string): Promise<{
  sessionsCount: number;
  templatesCount: number;
  latestUpdatedAt?: string;
} | null> {
  if (!supabase) return null;

  try {
    const [sessionsCountRes, templatesCountRes, latestSessionRes, latestTemplateRes] = await Promise.all([
      supabase.from("workout_sessions").select("*", { head: true, count: "exact" }).eq("user_id", userId),
      supabase.from("workout_templates").select("*", { head: true, count: "exact" }).eq("user_id", userId),
      supabase
        .from("workout_sessions")
        .select("updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workout_templates")
        .select("updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (
      sessionsCountRes.error ||
      templatesCountRes.error ||
      latestSessionRes.error ||
      latestTemplateRes.error
    ) {
      return null;
    }

    const sLatest = latestSessionRes.data?.updated_at as string | undefined;
    const tLatest = latestTemplateRes.data?.updated_at as string | undefined;
    const latestUpdatedAt = [sLatest, tLatest].filter(Boolean).sort().at(-1);

    return {
      sessionsCount: sessionsCountRes.count ?? 0,
      templatesCount: templatesCountRes.count ?? 0,
      latestUpdatedAt,
    };
  } catch {
    return null;
  }
}
