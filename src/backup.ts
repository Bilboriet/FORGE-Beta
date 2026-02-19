// src/backup.ts
// V1: file-based export/import/reset for Forge localStorage.

import { LS_KEYS } from "./constants";

// Extra keys that are not part of LS_KEYS, but are still part of the Forge UX.
export const LS_EXTRA_KEYS = {
  settings_v1: "forge:settings_v1",
  analytics_exercise_v1: "forge:analytics_exercise_v1",
  analytics_fatigue_scope_v1: "forge:analytics_fatigue_scope_v1",
  exercise_filter_presets_v1: "exercise_filter_presets_v1",
} as const;

export type ForgeBackupV1 = {
  schema: "forge_backup_v1";
  createdAt: string; // ISO
  app: {
    name: "Forge";
    version?: string;
  };
  data: Record<string, unknown>;
};

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // keep raw as string if it wasn't JSON (rare)
    return raw;
  }
}

export function getBackupKeys(): string[] {
  const base = Object.values(LS_KEYS) as string[];
  const extra = Object.values(LS_EXTRA_KEYS) as string[];
  // Deduplicate while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of [...base, ...extra]) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function buildBackup(): ForgeBackupV1 {
  const keys = getBackupKeys();
  const data: Record<string, unknown> = {};

  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    data[k] = safeParse(raw);
  }

  return {
    schema: "forge_backup_v1",
    createdAt: new Date().toISOString(),
    app: { name: "Forge" },
    data,
  };
}

export function downloadBackupFile(backup: ForgeBackupV1) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `forge-backup-${backup.createdAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export function isForgeBackupV1(x: any): x is ForgeBackupV1 {
  return (
    x &&
    typeof x === "object" &&
    x.schema === "forge_backup_v1" &&
    typeof x.createdAt === "string" &&
    x.data &&
    typeof x.data === "object"
  );
}

// Replace-mode import: deterministic and safest.
export function applyBackupReplace(backup: ForgeBackupV1) {
  const keys = getBackupKeys();

  // Clear known keys first
  for (const k of keys) localStorage.removeItem(k);

  // Write back only known keys from backup
  for (const k of keys) {
    if (!(k in backup.data)) continue;
    localStorage.setItem(k, JSON.stringify((backup.data as any)[k]));
  }
}

export function resetAllForgeData() {
  const keys = getBackupKeys();
  for (const k of keys) localStorage.removeItem(k);
}
