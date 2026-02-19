import type { ExerciseRef } from "../types";

function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function words(s: string): string[] {
  return norm(s).split(/[^a-z0-9]+/g).filter(Boolean);
}

export type ExerciseSearchHit = {
  ex: ExerciseRef;
  score: number;
};

export function scoreExerciseName(name: string, query: string): number {
  const q = norm(query);
  if (!q) return 0;
  const n = norm(name);

  // Special rule: for very short queries (<=2), only prefix matches count.
  if (q.length <= 2) {
    if (n === q) return 1000;
    if (n.startsWith(q)) return 900 - Math.min(100, n.length - q.length);
    const ws = words(n);
    const wordIdx = ws.findIndex((w) => w.startsWith(q));
    if (wordIdx >= 0) return 850 - Math.min(50, wordIdx * 5);
    return 0;
  }

  if (!n.includes(q)) return 0;
  if (n === q) return 1000;
  if (n.startsWith(q)) return 900 - Math.min(100, n.length - q.length);

  const ws = words(n);
  const wordIdx = ws.findIndex((w) => w.startsWith(q));
  if (wordIdx >= 0) return 850 - Math.min(50, wordIdx * 5);

  const pos = n.indexOf(q);
  return 700 - Math.min(200, pos);
}

export function searchExercises(exercises: ExerciseRef[], query: string): ExerciseSearchHit[] {
  const q = norm(query);
  if (!q) return [];

  const hits: ExerciseSearchHit[] = [];
  for (const ex of exercises) {
    const s = scoreExerciseName(ex.name, q);
    if (s <= 0) continue;
    hits.push({ ex, score: s });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.ex.name.localeCompare(b.ex.name);
  });

  return hits;
}

export function filterExercisesBySearch(exercises: ExerciseRef[], query: string): ExerciseRef[] {
  return searchExercises(exercises, query).map((h) => h.ex);
}
