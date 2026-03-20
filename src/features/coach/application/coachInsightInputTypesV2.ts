import type { WorkoutSession } from "../../../types";

export type CoachTargetEntryV2 = {
  muscleId: string;
  min: number;
  max: number;
};

export type CoachExerciseCatalogEntryV2 = {
  exerciseId: string;
  exerciseName: string;
  muscleId: string;
  prescriptionWeight: number;
  redundancyGroup?: string | null;
};

export type BuildCoachInsightSnapshotInputV2 = {
  session: WorkoutSession;
  targets: CoachTargetEntryV2[];
  exerciseCatalog: CoachExerciseCatalogEntryV2[];
  favoriteExerciseIds: string[];
  recentlyUsedExerciseIds: string[];
  generatedAt?: string;
};

export type BuildWeeklyCoachInsightSnapshotInputV2 = {
  sessions: WorkoutSession[];
  targets: CoachTargetEntryV2[];
  exerciseCatalog: CoachExerciseCatalogEntryV2[];
  favoriteExerciseIds: string[];
  recentlyUsedExerciseIds: string[];
  generatedAt?: string;
};
