// src/exerciseLibrary.ts
// Backwards compatible export for the rest of the app.
//
// V1 components expect `EXERCISE_LIBRARY: ExerciseRef[]`.
// The new architecture (base + variants + core flag) lives in `src/exercises/*`.

export {
  EXERCISE_LIBRARY,
  EXERCISE_VARIANTS,
  CORE_EXERCISE_VARIANTS,
  CORE_EXERCISE_IDS,
  EXERCISE_BY_ID,
  BASE_EXERCISES,
  BASE_BY_ID,
  getVariant,
  getBase,
  getBaseForVariant,
  toExerciseRef,
} from "./exercises";
