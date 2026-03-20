import { exerciseDatabase, exerciseDatabaseById, toExerciseRef } from "../../../data/exerciseDatabase";
import type { WorkoutSession } from "../../../types";
import type { CoachExerciseCatalogEntryV2, CoachTargetEntryV2 } from "./coachInsightInputTypesV2";
import type { CoachInsightStatusV2 } from "./coachInsightTypesV2";

export type CoachTargetBehaviorValidationCaseV2 = {
  id: string;
  description: string;
  input: {
    mode?: "session" | "weekly";
    session?: WorkoutSession;
    sessions?: WorkoutSession[];
    targets: CoachTargetEntryV2[];
    exerciseCatalog: CoachExerciseCatalogEntryV2[];
    favoriteExerciseIds?: string[];
    recentlyUsedExerciseIds?: string[];
    generatedAt?: string;
  };
  expected: {
    muscleStatuses?: Record<string, CoachInsightStatusV2>;
    recommendationDirections?: Record<string, "increase" | "decrease">;
    recommendationPresence?: Record<string, boolean>;
    priorityOrder?: string[];
    actionableCount?: number;
    setAdjustmentSigns?: Record<string, "positive" | "negative" | "zero">;
    suggestionTargetMuscles?: Record<string, string[]>;
  };
};

function buildCoachExerciseCatalogFromDatabase(): CoachExerciseCatalogEntryV2[] {
  const entries = new Map<string, CoachExerciseCatalogEntryV2>();

  for (const entry of exerciseDatabase) {
    for (const muscleId of entry.primaryAnalysisTargets ?? []) {
      const key = `${entry.id}::${muscleId}`;
      const previous = entries.get(key);

      entries.set(key, {
        exerciseId: entry.id,
        exerciseName: entry.displayName,
        muscleId,
        prescriptionWeight: Math.max(previous?.prescriptionWeight ?? 0, 1),
        redundancyGroup: entry.movementTemplate ?? null,
      });
    }

    for (const muscleId of entry.secondaryAnalysisTargets ?? []) {
      const key = `${entry.id}::${muscleId}`;
      const previous = entries.get(key);

      entries.set(key, {
        exerciseId: entry.id,
        exerciseName: entry.displayName,
        muscleId,
        prescriptionWeight: Math.max(previous?.prescriptionWeight ?? 0, 0.55),
        redundancyGroup: entry.movementTemplate ?? null,
      });
    }
  }

  return Array.from(entries.values()).sort(
    (a, b) =>
      a.muscleId.localeCompare(b.muscleId) ||
      a.exerciseName.localeCompare(b.exerciseName) ||
      a.exerciseId.localeCompare(b.exerciseId)
  );
}

function createSession(
  id: string,
  date: string,
  entries: Array<{
    exerciseId: string;
    reps: number;
    weightKg: number;
    rir?: number;
  }>
): WorkoutSession {
  return {
    id,
    date,
    exercises: entries.map((entry, index) => {
      const exercise = exerciseDatabaseById.get(entry.exerciseId);

      if (!exercise) {
        throw new Error(`Unknown validation exercise: ${entry.exerciseId}`);
      }

      return {
        id: `${id}_block_${index + 1}`,
        order: index,
        exercise: toExerciseRef(exercise),
        sets: [
          {
            id: `${id}_set_${index + 1}`,
            kind: "work",
            reps: entry.reps,
            weightKg: entry.weightKg,
            ...(typeof entry.rir === "number" ? { rir: entry.rir } : {}),
          },
        ],
      };
    }),
  };
}

const VALIDATION_EXERCISE_CATALOG_V2 = buildCoachExerciseCatalogFromDatabase();

export const coachTargetBehaviorValidationCasesV2: CoachTargetBehaviorValidationCaseV2[] = [
  {
    id: "session_upper_chest_under_target",
    description:
      "Upper chest with zero session stimulus should classify under target and produce an increase recommendation.",
    input: {
      mode: "session",
      session: createSession("case_1", "2026-03-10", []),
      targets: [{ muscleId: "upper_chest", min: 1500, max: 2000 }],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      generatedAt: "validation:session_upper_chest_under_target",
    },
    expected: {
      muscleStatuses: { upper_chest: "under" },
      recommendationPresence: { upper_chest: true },
      recommendationDirections: { upper_chest: "increase" },
      setAdjustmentSigns: { upper_chest: "positive" },
      priorityOrder: ["upper_chest"],
      actionableCount: 1,
    },
  },
  {
    id: "session_upper_chest_balanced_band",
    description:
      "Upper chest stimulus inside its target band should remain balanced with no actionable recommendation.",
    input: {
      mode: "session",
      session: createSession("case_2", "2026-03-10", [
        { exerciseId: "incline_dumbbell_press", reps: 10, weightKg: 180 },
      ]),
      targets: [{ muscleId: "upper_chest", min: 1700, max: 1900 }],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      generatedAt: "validation:session_upper_chest_balanced_band",
    },
    expected: {
      muscleStatuses: { upper_chest: "balanced" },
      recommendationPresence: { upper_chest: false },
      setAdjustmentSigns: { upper_chest: "zero" },
      priorityOrder: [],
      actionableCount: 0,
    },
  },
  {
    id: "session_lateral_delt_over_target",
    description:
      "Lateral delt stimulus above its max should classify over target and produce a decrease recommendation.",
    input: {
      mode: "session",
      session: createSession("case_3", "2026-03-10", [
        { exerciseId: "machine_lateral_raise", reps: 20, weightKg: 100 },
      ]),
      targets: [{ muscleId: "deltoid_lateral", min: 1000, max: 1400 }],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      generatedAt: "validation:session_lateral_delt_over_target",
    },
    expected: {
      muscleStatuses: { deltoid_lateral: "over" },
      recommendationPresence: { deltoid_lateral: true },
      recommendationDirections: { deltoid_lateral: "decrease" },
      setAdjustmentSigns: { deltoid_lateral: "negative" },
      priorityOrder: ["deltoid_lateral"],
      actionableCount: 1,
    },
  },
  {
    id: "session_back_priority_ordering",
    description:
      "A fully unstimulated upper lat target should rank above a mildly under-target mid-back target in priority ordering.",
    input: {
      mode: "session",
      session: createSession("case_4", "2026-03-10", [
        { exerciseId: "seated_cable_row", reps: 15, weightKg: 60 },
      ]),
      targets: [
        { muscleId: "upper_lats", min: 1700, max: 2200 },
        { muscleId: "mid_back", min: 1000, max: 1300 },
      ],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      generatedAt: "validation:session_back_priority_ordering",
    },
    expected: {
      muscleStatuses: {
        upper_lats: "under",
        mid_back: "under",
      },
      recommendationPresence: {
        upper_lats: true,
        mid_back: true,
      },
      recommendationDirections: {
        upper_lats: "increase",
        mid_back: "increase",
      },
      setAdjustmentSigns: {
        upper_lats: "positive",
        mid_back: "positive",
      },
      priorityOrder: ["upper_lats", "mid_back"],
      actionableCount: 2,
    },
  },
  {
    id: "session_rectus_femoris_zero_stimulus",
    description:
      "A quad target with zero session stimulus should remain stable, under target, and produce a logical positive adjustment.",
    input: {
      mode: "session",
      session: createSession("case_5", "2026-03-10", []),
      targets: [{ muscleId: "rectus_femoris", min: 1200, max: 1600 }],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      generatedAt: "validation:session_rectus_femoris_zero_stimulus",
    },
    expected: {
      muscleStatuses: { rectus_femoris: "under" },
      recommendationPresence: { rectus_femoris: true },
      recommendationDirections: { rectus_femoris: "increase" },
      setAdjustmentSigns: { rectus_femoris: "positive" },
      priorityOrder: ["rectus_femoris"],
      actionableCount: 1,
    },
  },
  {
    id: "session_mixed_under_balanced_over",
    description:
      "A mixed session should keep under, balanced, and over muscles distinct while preserving logical priority ordering.",
    input: {
      mode: "session",
      session: createSession("case_6", "2026-03-10", [
        { exerciseId: "incline_dumbbell_press", reps: 10, weightKg: 180 },
        { exerciseId: "machine_lateral_raise", reps: 20, weightKg: 100 },
      ]),
      targets: [
        { muscleId: "upper_lats", min: 1500, max: 1800 },
        { muscleId: "upper_chest", min: 1700, max: 1900 },
        { muscleId: "deltoid_lateral", min: 1000, max: 1400 },
      ],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      generatedAt: "validation:session_mixed_under_balanced_over",
    },
    expected: {
      muscleStatuses: {
        upper_lats: "under",
        upper_chest: "balanced",
        deltoid_lateral: "over",
      },
      recommendationPresence: {
        upper_lats: true,
        upper_chest: false,
        deltoid_lateral: true,
      },
      recommendationDirections: {
        upper_lats: "increase",
        deltoid_lateral: "decrease",
      },
      setAdjustmentSigns: {
        upper_lats: "positive",
        upper_chest: "zero",
        deltoid_lateral: "negative",
      },
      priorityOrder: ["upper_lats", "deltoid_lateral"],
      actionableCount: 2,
    },
  },
  {
    id: "session_lower_lats_suggestion_matching",
    description:
      "An under-target lower lat should return deterministic suggestions whose catalog mappings stay in the intended lower-lat area.",
    input: {
      mode: "session",
      session: createSession("case_7", "2026-03-10", []),
      targets: [{ muscleId: "lower_lats", min: 1600, max: 2100 }],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      favoriteExerciseIds: ["machine_low_row"],
      recentlyUsedExerciseIds: ["single_arm_cable_lat_row"],
      generatedAt: "validation:session_lower_lats_suggestion_matching",
    },
    expected: {
      muscleStatuses: { lower_lats: "under" },
      recommendationPresence: { lower_lats: true },
      recommendationDirections: { lower_lats: "increase" },
      setAdjustmentSigns: { lower_lats: "positive" },
      priorityOrder: ["lower_lats"],
      actionableCount: 1,
      suggestionTargetMuscles: { lower_lats: ["lower_lats"] },
    },
  },
  {
    id: "weekly_upper_chest_under_target",
    description:
      "Weekly snapshot path should stay deterministic and actionable when upper chest remains under target across the week.",
    input: {
      mode: "weekly",
      sessions: [
        createSession("case_8_a", "2026-03-10", []),
        createSession("case_8_b", "2026-03-12", []),
      ],
      targets: [{ muscleId: "upper_chest", min: 1500, max: 2000 }],
      exerciseCatalog: VALIDATION_EXERCISE_CATALOG_V2,
      generatedAt: "validation:weekly_upper_chest_under_target",
    },
    expected: {
      muscleStatuses: { upper_chest: "under" },
      recommendationPresence: { upper_chest: true },
      recommendationDirections: { upper_chest: "increase" },
      setAdjustmentSigns: { upper_chest: "positive" },
      priorityOrder: ["upper_chest"],
      actionableCount: 1,
      suggestionTargetMuscles: { upper_chest: ["upper_chest"] },
    },
  },
];
