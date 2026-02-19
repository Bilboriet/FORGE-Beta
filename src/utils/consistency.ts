// src/utils/consistency.ts
import type { WorkoutSession } from "../types";
import { workoutVolume } from "../utils";

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type HeatmapDay = {
  dateISO: string; // YYYY-MM-DD
  level: HeatmapLevel;
  volume: number; // total kg*reps across sessions that day
  sessions: number;
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

// p90-ish: sort and take value at 90th percentile (robust to spikes)
export function percentile90(values: number[]) {
  const arr = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const idx = Math.max(0, Math.min(arr.length - 1, Math.floor(arr.length * 0.9) - 1));
  return arr[idx];
}

export function levelFromVolume(volume: number, p90: number): HeatmapLevel {
  if (!Number.isFinite(volume) || volume <= 0) return 0;
  const denom = p90 > 0 ? p90 : volume;
  const score = Math.max(0, Math.min(1, volume / denom));
  // 4 bins + zero
  if (score < 0.25) return 1;
  if (score < 0.5) return 2;
  if (score < 0.75) return 3;
  return 4;
}

export function buildHeatmapDays(
  sessions: WorkoutSession[],
  rangeDays: 30 | 90 | 180
): HeatmapDay[] {
  const byDate = new Map<string, { volume: number; sessions: number }>();

  for (const s of sessions ?? []) {
    const dateISO = (s as any).date as string;
    if (!dateISO) continue;
    const vol = workoutVolume(s);
    const cur = byDate.get(dateISO) ?? { volume: 0, sessions: 0 };
    cur.volume += Number.isFinite(vol) ? vol : 0;
    cur.sessions += 1;
    byDate.set(dateISO, cur);
  }

  const end = new Date(); // today
  const start = addDays(end, -(rangeDays - 1));

  // Build list with zeros for missing days
  const days: HeatmapDay[] = [];
  const volumes: number[] = [];

  for (let i = 0; i < rangeDays; i++) {
    const d = addDays(start, i);
    const iso = toISODate(d);
    const hit = byDate.get(iso);
    const v = hit?.volume ?? 0;
    const c = hit?.sessions ?? 0;
    days.push({ dateISO: iso, level: 0, volume: v, sessions: c });
    if (v > 0) volumes.push(v);
  }

  const p90 = percentile90(volumes);
  return days.map((x) => ({ ...x, level: levelFromVolume(x.volume, p90) }));
}

export function computeCurrentStreak(days: HeatmapDay[]) {
  // count consecutive non-zero days from the end (today backwards)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].sessions > 0) streak++;
    else break;
  }
  return streak;
}

export function computeBestStreak(days: HeatmapDay[]) {
  let best = 0;
  let cur = 0;
  for (const d of days) {
    if (d.sessions > 0) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

export function computeWeeksTrained(days: HeatmapDay[], weeks: number) {
  // last N weeks (including current week)
  // Group by ISO week-ish (Mon-Sun). We'll approximate by chunking backwards in 7-day blocks.
  const slice = days.slice(Math.max(0, days.length - weeks * 7));
  let count = 0;
  for (let w = 0; w < weeks; w++) {
    const block = slice.slice(w * 7, w * 7 + 7);
    if (block.some((d) => d.sessions > 0)) count++;
  }
  return count;
}
