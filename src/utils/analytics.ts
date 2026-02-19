import type { ExerciseRef, MuscleGroup, WorkoutSession } from "../types";
import { workoutVolume } from "../utils";

type WeeklyPoint = { weekLabel: string; totalVolume: number };
type E1RMPoint = { weekLabel: string; e1rm: number };
type PRItem = { exerciseId: string; exerciseName: string; weightKg: number; reps: number; e1rm: number };
type MusclePoint = { muscle: MuscleGroup; totalVolume: number };

export function normalizeExerciseKey(name: string) {
  return (name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[().,\-_/]/g, " ")
    .replace(/\s+/g, " ");
}

function toBaseExerciseKey(name: string) {
  return normalizeExerciseKey(name).replace(/\s+\b(barbell|dumbbell|machine|cable|smith|rope|wide|close|single|arm|high|pulley|reverse|grip)\b/g, "").trim();
}

function parseISODate(iso: string) {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function startOfDayLocal(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function weekKey(date: Date) {
  const dt = startOfDayLocal(date);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const week1 = new Date(dt.getFullYear(), 0, 4);
  const weekNo =
    1 +
    Math.round(
      ((dt.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${dt.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function rollingMean(values: number[], window: number) {
  const w = Math.max(1, Math.floor(window));
  const out: number[] = [];
  let sum = 0;
  const q: number[] = [];
  for (const raw of values) {
    const v = Number.isFinite(raw) ? raw : 0;
    q.push(v);
    sum += v;
    if (q.length > w) sum -= q.shift() ?? 0;
    out.push(sum / q.length);
  }
  return out;
}

export function getSessionsInRange(sessions: WorkoutSession[], days: number) {
  const cutoff = daysAgo(Math.max(0, days) - 1);
  return (sessions ?? []).filter((s) => startOfDayLocal(parseISODate(s.date)) >= cutoff);
}

export function groupByWeek(sessions: WorkoutSession[]): WeeklyPoint[] {
  const map = new Map<string, number>();
  for (const s of sessions ?? []) {
    const key = weekKey(parseISODate(s.date));
    map.set(key, (map.get(key) ?? 0) + workoutVolume(s));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, totalVolume]) => ({ weekLabel, totalVolume }));
}

export function computeWeeklyVolumeSeries(sessions: WorkoutSession[], maxWeeks = 16): WeeklyPoint[] {
  const grouped = groupByWeek(sessions);
  return grouped.slice(-Math.max(1, maxWeeks));
}

export function computeVolumeTrendSeries(series: WeeklyPoint[], window = 4): number[] {
  const values = (series ?? []).map((x) => Number.isFinite(x.totalVolume) ? x.totalVolume : 0);
  return rollingMean(values, window);
}

export function computeE1RMSeriesForExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
  exerciseName?: string
): E1RMPoint[] {
  const selectedId = (exerciseId ?? "").trim();
  const selectedNameKey = normalizeExerciseKey(exerciseName ?? "");
  const selectedBaseKey = toBaseExerciseKey(exerciseName ?? "");
  if (!selectedId && !selectedNameKey && !selectedBaseKey) return [];

  const matchesSelectedExercise = (blockExercise: { id?: string; name?: string }) => {
    if (selectedId && blockExercise.id === selectedId) return true;
    const blockName = blockExercise.name ?? "";
    const blockNameKey = normalizeExerciseKey(blockName);
    if (selectedNameKey && blockNameKey === selectedNameKey) return true;
    if (selectedBaseKey && toBaseExerciseKey(blockName) === selectedBaseKey) return true;
    return false;
  };

  const bySession = new Map<string, number>();
  for (const s of sessions ?? []) {
    const sessionKey = s.date;
    let sessionBest = bySession.get(sessionKey) ?? 0;
    for (const b of s.exercises ?? []) {
      if (!matchesSelectedExercise(b.exercise)) continue;
      for (const set of b.sets ?? []) {
        const w = Number(set.weightKg) || 0;
        const r = Number(set.reps) || 0;
        if (w <= 0 || r <= 0) continue;
        const e1rm = w * (1 + r / 30);
        if (e1rm > sessionBest) sessionBest = e1rm;
      }
    }
    if (sessionBest > 0) bySession.set(sessionKey, sessionBest);
  }
  return [...bySession.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, e1rm]) => ({ weekLabel, e1rm }));
}

export function computePRList(sessions: WorkoutSession[]): PRItem[] {
  const map = new Map<string, PRItem>();
  for (const s of sessions ?? []) {
    for (const b of s.exercises ?? []) {
      for (const set of b.sets ?? []) {
        const weightKg = Number(set.weightKg) || 0;
        const reps = Number(set.reps) || 0;
        if (weightKg <= 0 || reps <= 0) continue;
        const e1rm = weightKg * (1 + reps / 30);
        const prev = map.get(b.exercise.id);
        const better =
          !prev ||
          weightKg > prev.weightKg ||
          (weightKg === prev.weightKg && reps > prev.reps);
        if (better) {
          map.set(b.exercise.id, {
            exerciseId: b.exercise.id,
            exerciseName: b.exercise.name,
            weightKg,
            reps,
            e1rm,
          });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => {
    if (b.weightKg !== a.weightKg) return b.weightKg - a.weightKg;
    return b.e1rm - a.e1rm;
  });
}

export function computeMuscleVolume(
  sessions: WorkoutSession[],
  exerciseLibrary: ExerciseRef[]
): MusclePoint[] {
  const groups = new Set<MuscleGroup>();
  for (const ex of exerciseLibrary ?? []) groups.add(ex.muscleGroup);
  groups.add("other");

  const map = new Map<MuscleGroup, number>();
  for (const g of groups) map.set(g, 0);

  for (const s of sessions ?? []) {
    for (const b of s.exercises ?? []) {
      const g = (b.exercise.muscleGroup ?? "other") as MuscleGroup;
      let volume = 0;
      for (const set of b.sets ?? []) {
        volume += (Number(set.reps) || 0) * (Number(set.weightKg) || 0);
      }
      map.set(g, (map.get(g) ?? 0) + volume);
    }
  }

  return [...map.entries()]
    .map(([muscle, totalVolume]) => ({ muscle, totalVolume }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}
