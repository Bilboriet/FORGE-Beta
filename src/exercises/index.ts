// src/exercises/index.ts

import { BASE_EXERCISES } from "./baseExercises";
import { EXERCISE_VARIANTS } from "./variants";
import type { BaseExercise, ExerciseVariant } from "./types";
import { toExerciseRef } from "./types";
import type { ExerciseRef } from "../types";

export { BASE_EXERCISES } from "./baseExercises";
export { EXERCISE_VARIANTS } from "./variants";
export type { BaseExercise, ExerciseVariant, EquipmentTag, MovementCategory } from "./types";
export { toExerciseRef } from "./types";

// ---- Derived helpers ----

export const CORE_EXERCISE_VARIANTS: ExerciseVariant[] = EXERCISE_VARIANTS.filter(
  (v) => v.isCore
);

export const CORE_EXERCISE_IDS: string[] = CORE_EXERCISE_VARIANTS.map((v) => v.id);

export function normalizeExerciseName(name: string): string {
  return (name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function dedupeExercises(list: ExerciseRef[]): ExerciseRef[] {
  const out: ExerciseRef[] = [];
  const seenIds = new Set<string>();
  const seenNameKeys = new Set<string>();
  let droppedById = 0;
  let droppedByName = 0;

  for (const ex of list ?? []) {
    const rawId = (ex?.id ?? "").trim();
    if (rawId) {
      if (seenIds.has(rawId)) {
        droppedById += 1;
        continue;
      }
      seenIds.add(rawId);
    }

    const nameKey = `${normalizeExerciseName(ex?.name ?? "")}::${ex?.muscleGroup ?? "other"}`;
    if (seenNameKeys.has(nameKey)) {
      droppedByName += 1;
      continue;
    }
    seenNameKeys.add(nameKey);
    out.push(ex);
  }

  if (import.meta.env.DEV && (droppedById > 0 || droppedByName > 0)) {
    console.warn(
      `[Forge] Exercise library dedupe dropped ${droppedById} duplicate id(s) and ${droppedByName} duplicate name(s).`
    );
  }

  return out;
}

const EXERCISE_LIBRARY_RAW: ExerciseRef[] = EXERCISE_VARIANTS.map(toExerciseRef);
export const EXERCISE_LIBRARY: ExerciseRef[] = dedupeExercises(EXERCISE_LIBRARY_RAW);

export const EXERCISE_BY_ID: Record<string, ExerciseVariant> = Object.fromEntries(
  EXERCISE_VARIANTS.map((v) => [v.id, v])
);

export const BASE_BY_ID: Record<string, BaseExercise> = Object.fromEntries(
  BASE_EXERCISES.map((b) => [b.id, b])
);

export function getVariant(id: string): ExerciseVariant | null {
  return EXERCISE_BY_ID[id] ?? null;
}

export function getBase(id: string): BaseExercise | null {
  return BASE_BY_ID[id] ?? null;
}

export function getBaseForVariant(variantId: string): BaseExercise | null {
  const v = getVariant(variantId);
  if (!v) return null;
  return getBase(v.baseId);
}

export function getCoreFirstList(): ExerciseVariant[] {
  // Favorites/Recents layer is handled in the picker hook.
  // This is the "Core" list.
  return CORE_EXERCISE_VARIANTS;
}
