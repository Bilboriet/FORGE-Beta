import type { ExerciseBlock, SetLog, WorkoutSession, MuscleGroup } from "./types";

/* -----------------------------
   1RM (Epley)
   - Estimat: weight * (1 + reps/30)
----------------------------- */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/* -----------------------------
   Volum
   - "tonnage": reps * weight
----------------------------- */
export function setVolume(set: SetLog): number {
  const reps = Number((set as any)?.reps) || 0;
  const w = Number((set as any)?.weightKg) || 0;
  return reps * w;
}

export function exerciseVolume(block: ExerciseBlock): number {
  const sets: SetLog[] = Array.isArray(block.sets) ? (block.sets as SetLog[]) : [];
  return sets.reduce<number>((sum, s) => {
    const reps = Number(s.reps ?? 0);
    const w = Number(s.weightKg ?? 0);
    if (!Number.isFinite(reps) || !Number.isFinite(w)) return sum;
    return sum + Math.max(0, reps) * Math.max(0, w);
  }, 0);
}

export function workoutVolume(session: WorkoutSession): number {
  const blocks: ExerciseBlock[] = Array.isArray(session.exercises) ? (session.exercises as ExerciseBlock[]) : [];
  return blocks.reduce<number>((sum, b) => sum + exerciseVolume(b), 0);
}

export function bestSet(sets: SetLog[]): SetLog | null {
  const arr: SetLog[] = Array.isArray(sets) ? sets : [];
  if (!arr.length) return null;

  return arr.reduce<SetLog>((best, current) => {
    const bw = Number(best.weightKg ?? 0);
    const cw = Number(current.weightKg ?? 0);
    if (cw > bw) return current;
    return best;
  }, arr[0]);
}

export function isNew1RMPR(prevBest: number, set: SetLog) {
  const est = estimate1RM_Epley(Number(set.weightKg ?? 0), Number(set.reps ?? 0)) ?? 0;
  return est > prevBest + 0.0001;
}

export function volumeByMuscleGroup(
  sessions: WorkoutSession[]
): Record<MuscleGroup, number> {
  const base: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    abs: 0,
    forearms: 0,
    other: 0,
  };

  for (const session of sessions ?? []) {
    const blocks = Array.isArray((session as any)?.exercises) ? (session as any).exercises : [];
    for (const block of blocks) {
      const mg = ((block as any)?.exercise?.muscleGroup ?? "other") as MuscleGroup;
      base[mg] += exerciseVolume(block);
    }
  }
  return base;
}

/* -----------------------------
   Små helpers
----------------------------- */
export function clampNumber(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  // date is "YYYY-MM-DD" so lexicographic sort works
  return items.slice().sort((a, b) => b.date.localeCompare(a.date));
}

/* -----------------------------
   Robust stats (for fatigue V1+)
----------------------------- */
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function median(values: number[]): number {
  const arr = (Array.isArray(values) ? values : []).map(toNum).filter((x) => Number.isFinite(x));
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid] ?? 0;
  const a = s[mid - 1] ?? 0;
  const b = s[mid] ?? 0;
  return (a + b) / 2;
}

export function mad(values: number[]): number {
  const m = median(values);
  const dev = (Array.isArray(values) ? values : []).map((x) => Math.abs(toNum(x) - m));
  return median(dev);
}

export function mean(values: number[]): number {
  const arr = (Array.isArray(values) ? values : []).map(toNum);
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

export function stddev(values: number[]): number {
  const arr = (Array.isArray(values) ? values : []).map(toNum);
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let acc = 0;
  for (const v of arr) {
    const d = v - m;
    acc += d * d;
  }
  return Math.sqrt(acc / (arr.length - 1));
}

/* --------------------------------------------------------------------------
   Chart data prep (V1)
   Deterministisk "coach"-pipeline:
   - sanitize
   - (valgfritt) rolling sum/mean
   - outlier clamp (winsorize via percentiler)
   - EMA smoothing (trend)

   NOTE:
   - Ingen deps.
   - Returnerer alltid arrays med samme lengde som input,
     slik at indeks = samme dag/økt i UI.
-------------------------------------------------------------------------- */

export type RollingMode = "sum" | "mean";

export type ChartPrepOptions = {
  clampPercentile?: number; // f.eks 0.05 => clamp til p5..p95
  emaWindow?: number; // typisk 5–9
  rollingWindow?: number; // typisk 4–8
  rollingMode?: RollingMode;
};

function toFiniteNumber(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function quantile(sortedAsc: number[], q: number): number {
  if (!sortedAsc.length) return 0;
  const qq = clampNumber(q, 0, 1);
  const pos = (sortedAsc.length - 1) * qq;
  const base = Math.floor(pos);
  const rest = pos - base;
  const v0 = sortedAsc[base] ?? sortedAsc[0];
  const v1 = sortedAsc[base + 1] ?? v0;
  return v0 + (v1 - v0) * rest;
}

export function rollingSum(values: number[], window: number): number[] {
  const w = Math.max(1, Math.floor(window || 1));
  const out: number[] = [];
  let acc = 0;
  const q: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const v = toFiniteNumber(values[i]);
    q.push(v);
    acc += v;

    if (q.length > w) acc -= q.shift() ?? 0;
    out.push(acc);
  }
  return out;
}

export function rollingMean(values: number[], window: number): number[] {
  const w = Math.max(1, Math.floor(window || 1));
  const sums = rollingSum(values, w);
  return sums.map((s, i) => s / Math.min(i + 1, w));
}

export function ema(values: number[], window: number): number[] {
  const w = Math.max(1, Math.floor(window || 1));
  const alpha = 2 / (w + 1); // standard EMA

  const out: number[] = [];
  let prev = toFiniteNumber(values[0]);

  for (let i = 0; i < values.length; i++) {
    const v = toFiniteNumber(values[i]);
    prev = i === 0 ? v : alpha * v + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

export function clampOutliersPercentile(values: number[], p: number): number[] {
  const pp = clampNumber(p, 0, 0.49);
  if (values.length < 4 || pp <= 0) return values.slice();

  const sorted = values
    .map((v) => toFiniteNumber(v))
    .slice()
    .sort((a, b) => a - b);

  const lo = quantile(sorted, pp);
  const hi = quantile(sorted, 1 - pp);

  return values.map((v) => clampNumber(toFiniteNumber(v), lo, hi));
}

export function prepareChartSeries(
  values: number[],
  opts: ChartPrepOptions = {}
): { raw: number[]; base: number[]; trend: number[] } {
  const raw = (Array.isArray(values) ? values : []).map(toFiniteNumber);

  // base = raw eller rolling-variant
  let base = raw.slice();
  if (opts.rollingWindow && opts.rollingWindow > 1 && opts.rollingMode) {
    base =
      opts.rollingMode === "sum"
        ? rollingSum(base, opts.rollingWindow)
        : rollingMean(base, opts.rollingWindow);
  }

  // Outlier clamp på base
  const clamped =
    typeof opts.clampPercentile === "number" && opts.clampPercentile > 0
      ? clampOutliersPercentile(base, opts.clampPercentile)
      : base;

  // Trend = EMA på clamped base
  const trend =
    typeof opts.emaWindow === "number" && opts.emaWindow > 1
      ? ema(clamped, opts.emaWindow)
      : clamped.slice();

  return { raw, base: clamped, trend };
}
// --- Strength metrics (V1) ---
// Estimated 1RM (Epley). Returns null if reps/weight not valid.
export function estimate1RM_Epley(weightKg: number, reps: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return null;
  if (weightKg <= 0) return null;
  if (reps <= 0) return null;

  // Epley: 1RM = w * (1 + reps/30)
  return weightKg * (1 + reps / 30);
}

export type ExerciseEstimateHint = {
  e1rmKg: number;
  worksetKg: number;
  usableSetCount: number;
};

export function estimateWorksetLoadFromE1RM(e1rmKg: number, targetReps: number): number | null {
  if (!Number.isFinite(e1rmKg) || e1rmKg <= 0) return null;
  if (!Number.isFinite(targetReps) || targetReps <= 0) return null;
  return e1rmKg / (1 + targetReps / 30);
}

export function estimateExerciseFromHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
  targetReps: number
): ExerciseEstimateHint | null {
  if (!exerciseId) return null;

  const usableE1Rms: number[] = [];
  const recentSessions = sortByDateDesc(Array.isArray(sessions) ? sessions : []).slice(0, 8);

  for (const session of recentSessions) {
    const blocks = Array.isArray(session.exercises) ? session.exercises : [];
    for (const block of blocks) {
      if (block.exercise?.id !== exerciseId) continue;
      const sets = Array.isArray(block.sets) ? block.sets : [];
      for (const set of sets) {
        const e1rm = estimate1RM_Epley(Number(set.weightKg ?? 0), Number(set.reps ?? 0));
        if (e1rm && Number.isFinite(e1rm) && e1rm > 0) usableE1Rms.push(e1rm);
      }
    }
  }

  if (usableE1Rms.length < 3) return null;

  const recentRelevant = usableE1Rms.slice(0, 12);
  const e1rmKg = median(recentRelevant);
  const worksetKg = estimateWorksetLoadFromE1RM(e1rmKg, targetReps);
  if (!worksetKg) return null;

  return {
    e1rmKg,
    worksetKg,
    usableSetCount: recentRelevant.length,
  };
}
