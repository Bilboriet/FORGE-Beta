import { estimateE1RM } from "./stimulusEngineV2";

type RawSet = { exerciseId: string; load: number; reps: number; date?: string };
type Params = {
  sets: readonly RawSet[];
  daysWindow?: number;
  repsCap?: number;
};

export function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const clampedQ = Math.max(0, Math.min(1, q));
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * clampedQ;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const t = pos - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

export function buildBestE1rmMap(params: Params): Record<string, number> {
  const daysWindow = params.daysWindow ?? 56;
  const repsCap = params.repsCap ?? 12;
  const now = Date.now();
  const cutoffMs = now - daysWindow * 24 * 60 * 60 * 1000;

  const grouped = new Map<string, number[]>();

  for (const set of params.sets) {
    const load = Number(set.load);
    const reps = Number(set.reps);
    if (!(load > 0) || !(reps > 0)) continue;
    if (reps > repsCap) continue;

    if (set.date) {
      const ms = new Date(set.date).getTime();
      if (!Number.isFinite(ms) || ms < cutoffMs) continue;
    }

    const e1rm = estimateE1RM(load, reps);
    if (!(e1rm > 0)) continue;

    const arr = grouped.get(set.exerciseId) ?? [];
    arr.push(e1rm);
    grouped.set(set.exerciseId, arr);
  }

  const out: Record<string, number> = {};

  for (const [exerciseId, e1rms] of grouped.entries()) {
    let filtered = e1rms;

    if (e1rms.length >= 5) {
      const med = quantile(e1rms, 0.5);
      const floor = med * 0.5;
      filtered = e1rms.filter((x) => x >= floor);
    }

    if (!filtered.length) continue;

    const best = filtered.length < 3 ? Math.max(...filtered) : quantile(filtered, 0.9);
    out[exerciseId] = best;
  }

  return out;
}

export type { RawSet, Params };
