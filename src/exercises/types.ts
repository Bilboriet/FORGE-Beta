// src/exercises/types.ts

import type { ExerciseRef, ID, MuscleGroup } from "../types";

// High-level buckets (useful for filters later)
export type MovementCategory = "push" | "pull" | "legs" | "core" | "neck" | "other";

// Keep this intentionally broad; refine later as needed.
export type EquipmentTag =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "plate_loaded"
  | "iso_lateral"
  | "converging"
  | "cable"
  | "smith"
  | "bodyweight"
  | "assisted"
  | "weighted"
  | "landmine"
  | "trap_bar"
  | "ez_bar"
  | "band"
  | "other";

// A "base" movement (concept), e.g. Bench Press
export type BaseExercise = {
  id: ID; // e.g. "bench_press"
  name: string; // display name (V1 can be Norwegian or English)
  muscleGroup: MuscleGroup;
  category: MovementCategory;
};

// A concrete selectable variant, e.g. Barbell Bench Press
export type ExerciseVariant = {
  id: ID; // unique variant id
  baseId: ID; // references BaseExercise.id
  name: string; // display name for picker
  muscleGroup: MuscleGroup; // primary group (kept on variant for simplicity)
  category: MovementCategory;

  equipment?: EquipmentTag;
  tags?: string[];

  // V1/V2 UX needs
  isCore: boolean; // included in the ~80 quick list
};

export function toExerciseRef(v: ExerciseVariant): ExerciseRef {
  return { id: v.id, name: v.name, muscleGroup: v.muscleGroup };
}
