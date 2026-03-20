import { createWorkoutSessionWithLockedBodyMetricsV2 } from "./bodyMetricsSnapshotV2";
import { toBodyweightContextFromSessionSnapshotV2 } from "./bodyMetricsSnapshotV2";
import { computeStimulusEngineV2, resolveEffectiveLoadV2 } from "./stimulusEngineV2";
import { getExerciseNormalizationMetaV2 } from "./exerciseDatabase";
import type { LoggedStimulusSetV2 } from "./stimulusEngineV2";
import {
  computeNormalizedSetStimulusV2,
  stimulusNormalizationConfigV2,
} from "./stimulusNormalizationConfigV2";
import type { ExerciseNormalizationMetaV2 } from "./exerciseDatabase";
import type { UserBodyMetricsV2, WorkoutSession } from "../types";

export type StimulusNormalizationIntegrationValidationResultV2 = {
  id: string;
  passed: boolean;
  error?: string;
};

function createBodyMetricsV2(bodyweightKg: number | null, heightCm: number | null): UserBodyMetricsV2 {
  return {
    bodyweightKg,
    heightCm,
    updatedAt: "2026-03-18T08:00:00.000Z",
    source: "manual",
  };
}

function createSessionV2(
  exerciseId: string,
  setOverrides?: Partial<WorkoutSession["exercises"][number]["sets"][number]>,
  sessionOverrides?: Partial<WorkoutSession>
): WorkoutSession {
  return {
    id: `session_${exerciseId}`,
    date: "2026-03-18",
    title: exerciseId,
    exercises: [
      {
        id: "block_1",
        order: 0,
        exercise: {
          id: exerciseId,
          name: exerciseId,
          muscleGroup: "back",
        },
        sets: [
          {
            id: "set_1",
            kind: "work",
            reps: 8,
            weightKg: 20,
            rir: 2,
            ...setOverrides,
          },
        ],
      },
    ],
    ...sessionOverrides,
  };
}

function totalStimulusForSession(session: WorkoutSession): number {
  const result = computeStimulusEngineV2({ sets: compileLoggedStimulusSetsForValidationV2(session) });
  return Object.values(result.analysisTotals).reduce((sum, value) => sum + value, 0);
}

function compileLoggedStimulusSetsForValidationV2(session: WorkoutSession): LoggedStimulusSetV2[] {
  const output: LoggedStimulusSetV2[] = [];
  const sessionBodyMetrics = session.bodyMetricsSnapshot ?? null;

  for (const block of session.exercises ?? []) {
    const normalizationMeta = getExerciseNormalizationMetaV2(block.exercise.id);

    for (const set of block.sets ?? []) {
      const reps = Number(set.reps ?? 0);
      if (!(reps > 0)) {
        continue;
      }

      const load = Number.isFinite(set.weightKg) ? set.weightKg : null;
      const bodyweightContext = toBodyweightContextFromSessionSnapshotV2(sessionBodyMetrics);

      if (bodyweightContext && load != null) {
        if (normalizationMeta.loadingType === "weighted_bodyweight") {
          bodyweightContext.externalLoadKg = load;
        } else if (normalizationMeta.loadingType === "assisted_bodyweight") {
          bodyweightContext.assistanceLoadKg = load;
        }
      }

      output.push({
        exerciseId: block.exercise.id,
        reps,
        load,
        rir: typeof set.rir === "number" && Number.isFinite(set.rir) ? set.rir : null,
        bodyweightContext,
      });
    }
  }

  return output;
}

export function runStimulusNormalizationIntegrationValidationV2(): StimulusNormalizationIntegrationValidationResultV2[] {
  const lighterPullUp = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("pull_up", { weightKg: 0 }),
    createBodyMetricsV2(82, 182)
  );
  const heavierPullUp = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("pull_up", { weightKg: 0 }),
    createBodyMetricsV2(95, 182)
  );
  const pullUpLightStimulus = totalStimulusForSession(lighterPullUp);
  const pullUpHeavyStimulus = totalStimulusForSession(heavierPullUp);

  const assistedLow = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("assisted_triceps_dip", { weightKg: 15, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const assistedHigh = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("assisted_triceps_dip", { weightKg: 40, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const assistedLowStimulus = totalStimulusForSession(assistedLow);
  const assistedHighStimulus = totalStimulusForSession(assistedHigh);
  const assistedCompiled = compileLoggedStimulusSetsForValidationV2(assistedLow);
  const assistedPullLight = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("assisted_pull_up", { weightKg: 15, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const assistedPullHeavy = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("assisted_pull_up", { weightKg: 40, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const assistedPullLightStimulus = totalStimulusForSession(assistedPullLight);
  const assistedPullHeavyStimulus = totalStimulusForSession(assistedPullHeavy);
  const assistedPullCompiled = compileLoggedStimulusSetsForValidationV2(assistedPullLight);
  const weightedPullLight = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("weighted_pull_up", { weightKg: 10, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const weightedPullHeavy = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("weighted_pull_up", { weightKg: 25, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const weightedPullLightStimulus = totalStimulusForSession(weightedPullLight);
  const weightedPullHeavyStimulus = totalStimulusForSession(weightedPullHeavy);
  const weightedPullCompiled = compileLoggedStimulusSetsForValidationV2(weightedPullLight);
  const weightedChestDipsLight = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("weighted_chest_dips", { weightKg: 10, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const weightedChestDipsHeavy = createWorkoutSessionWithLockedBodyMetricsV2(
    createSessionV2("weighted_chest_dips", { weightKg: 25, rir: 2 }),
    createBodyMetricsV2(82, 182)
  );
  const weightedChestDipsLightStimulus = totalStimulusForSession(weightedChestDipsLight);
  const weightedChestDipsHeavyStimulus = totalStimulusForSession(weightedChestDipsHeavy);
  const weightedChestDipsCompiled = compileLoggedStimulusSetsForValidationV2(weightedChestDipsLight);

  const weightedMeta: ExerciseNormalizationMetaV2 = {
    loadingType: "weighted_bodyweight",
    movementClass: "compound",
    equipmentType: "bodyweight",
    laterality: "bilateral",
  };
  const weightedLight = computeNormalizedSetStimulusV2(
    {
      reps: 8,
      rir: 1,
      load: 20,
      bodyweightContext: {
        userBodyweightKg: 82,
        userHeightCm: 182,
        externalLoadKg: 20,
      },
    },
    weightedMeta,
    stimulusNormalizationConfigV2
  );
  const weightedHeavy = computeNormalizedSetStimulusV2(
    {
      reps: 8,
      rir: 1,
      load: 20,
      bodyweightContext: {
        userBodyweightKg: 95,
        userHeightCm: 182,
        externalLoadKg: 20,
      },
    },
    weightedMeta,
    stimulusNormalizationConfigV2
  );
  const weightedLightEffectiveLoad = resolveEffectiveLoadV2(
    {
      reps: 8,
      rir: 1,
      load: 20,
      bodyweightContext: {
        userBodyweightKg: 82,
        userHeightCm: 182,
        externalLoadKg: 20,
      },
    },
    "weighted_bodyweight"
  );
  const weightedHeavyEffectiveLoad = resolveEffectiveLoadV2(
    {
      reps: 8,
      rir: 1,
      load: 20,
      bodyweightContext: {
        userBodyweightKg: 95,
        userHeightCm: 182,
        externalLoadKg: 20,
      },
    },
    "weighted_bodyweight"
  );

  const externalNearFailure = computeStimulusEngineV2({
    sets: [
      {
        exerciseId: "neutral_grip_lat_pulldown",
        reps: 10,
        load: 60,
        rir: 0,
      },
    ],
  });
  const externalFarFromFailure = computeStimulusEngineV2({
    sets: [
      {
        exerciseId: "neutral_grip_lat_pulldown",
        reps: 10,
        load: 60,
        rir: 4,
      },
    ],
  });
  const nearFailureStimulus = Object.values(externalNearFailure.analysisTotals).reduce(
    (sum, value) => sum + value,
    0
  );
  const farFromFailureStimulus = Object.values(externalFarFromFailure.analysisTotals).reduce(
    (sum, value) => sum + value,
    0
  );
  const externalLoadOnly = computeStimulusEngineV2({
    sets: [
      {
        exerciseId: "neutral_grip_lat_pulldown",
        reps: 8,
        load: 70,
      },
    ],
  });
  const externalLoadOnlyStimulus = Object.values(externalLoadOnly.analysisTotals).reduce(
    (sum, value) => sum + value,
    0
  );

  const legacyPullUp = createSessionV2("pull_up", { weightKg: 0 });
  const legacyCompiled = compileLoggedStimulusSetsForValidationV2(legacyPullUp);
  const fallbackMeta = getExerciseNormalizationMetaV2("flat_barbell_bench_press");
  const hipFlexorRaiseIds = [
    "hanging_knee_raise",
    "hanging_leg_raise",
    "captains_chair_knee_raise",
    "captains_chair_leg_raise",
    "parallel_bar_knee_raise",
    "parallel_bar_leg_raise",
  ] as const;
  const hipFlexorRaiseMetaResolved = hipFlexorRaiseIds.every(
    (exerciseId) => getExerciseNormalizationMetaV2(exerciseId).loadingType === "bodyweight"
  );
  const pullUpFamilyIds = [
    "pull_up",
    "neutral_grip_pull_up",
    "chin_up",
    "wide_grip_pull_up",
  ] as const;
  const pullUpFamilyMetaResolved = pullUpFamilyIds.every(
    (exerciseId) => getExerciseNormalizationMetaV2(exerciseId).loadingType === "bodyweight"
  );
  const assistedPullUpMetaResolved =
    getExerciseNormalizationMetaV2("assisted_pull_up").loadingType === "assisted_bodyweight";
  const weightedPullUpMetaResolved =
    getExerciseNormalizationMetaV2("weighted_pull_up").loadingType === "weighted_bodyweight";
  const weightedPullUpVariantIds = [
    "weighted_pull_up",
    "weighted_chin_up",
    "weighted_neutral_grip_pull_up",
    "weighted_wide_grip_pull_up",
  ] as const;
  const weightedPullUpVariantsMetaResolved = weightedPullUpVariantIds.every(
    (exerciseId) => getExerciseNormalizationMetaV2(exerciseId).loadingType === "weighted_bodyweight"
  );
  const weightedDipVariantIds = [
    "weighted_chest_dips",
    "weighted_triceps_dip",
  ] as const;
  const weightedDipVariantsMetaResolved = weightedDipVariantIds.every(
    (exerciseId) => getExerciseNormalizationMetaV2(exerciseId).loadingType === "weighted_bodyweight"
  );
  const dipFamilyExpectedLoadingTypes = [
    ["chest_dips", "bodyweight"],
    ["weighted_chest_dips", "weighted_bodyweight"],
    ["triceps_biased_dip", "bodyweight"],
    ["weighted_triceps_dip", "weighted_bodyweight"],
    ["machine_dip", "external"],
    ["seated_dip_machine", "external"],
    ["assisted_triceps_dip", "assisted_bodyweight"],
  ] as const;
  const dipFamilyMetaResolved = dipFamilyExpectedLoadingTypes.every(
    ([exerciseId, loadingType]) => getExerciseNormalizationMetaV2(exerciseId).loadingType === loadingType
  );

  return [
    {
      id: "bodyweight_pull_up_uses_locked_session_bodyweight",
      passed: pullUpHeavyStimulus > pullUpLightStimulus,
      error:
        pullUpHeavyStimulus > pullUpLightStimulus
          ? undefined
          : "Expected heavier locked bodyweight to increase pull-up stimulus in the active coach path.",
    },
    {
      id: "weighted_bodyweight_uses_locked_session_bodyweight_when_available",
      passed:
        weightedHeavyEffectiveLoad > weightedLightEffectiveLoad &&
        weightedHeavy.normalizedStimulus === weightedLight.normalizedStimulus &&
        weightedHeavy.resolvedInputs.loadingType === "weighted_bodyweight",
      error:
        weightedHeavyEffectiveLoad > weightedLightEffectiveLoad &&
        weightedHeavy.normalizedStimulus === weightedLight.normalizedStimulus &&
        weightedHeavy.resolvedInputs.loadingType === "weighted_bodyweight"
          ? undefined
          : "Expected weighted bodyweight handling to use locked bodyweight in effective load resolution while keeping the normalization factor bounded.",
    },
    {
      id: "assisted_bodyweight_more_assistance_reduces_stimulus",
      passed: assistedLowStimulus > assistedHighStimulus,
      error:
        assistedLowStimulus > assistedHighStimulus
          ? undefined
          : "Expected higher assistance to reduce assisted bodyweight stimulus after integration.",
    },
    {
      id: "assisted_bodyweight_uses_locked_session_bodyweight_when_available",
      passed:
        assistedCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        assistedCompiled[0]?.bodyweightContext?.assistanceLoadKg === 15,
      error:
        assistedCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        assistedCompiled[0]?.bodyweightContext?.assistanceLoadKg === 15
          ? undefined
          : "Expected assisted bodyweight compile path to carry locked session bodyweight and assistance load context.",
    },
    {
      id: "assisted_pull_up_uses_locked_session_bodyweight_when_available",
      passed:
        assistedPullCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        assistedPullCompiled[0]?.bodyweightContext?.assistanceLoadKg === 15,
      error:
        assistedPullCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        assistedPullCompiled[0]?.bodyweightContext?.assistanceLoadKg === 15
          ? undefined
          : "Expected assisted pull-up compile path to carry locked session bodyweight and assistance load context.",
    },
    {
      id: "assisted_pull_up_more_assistance_reduces_stimulus",
      passed: assistedPullLightStimulus > assistedPullHeavyStimulus,
      error:
        assistedPullLightStimulus > assistedPullHeavyStimulus
          ? undefined
          : "Expected higher assistance to reduce assisted pull-up stimulus in the active coach path.",
    },
    {
      id: "weighted_pull_up_uses_locked_session_bodyweight_when_available",
      passed:
        weightedPullCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        weightedPullCompiled[0]?.bodyweightContext?.externalLoadKg === 10,
      error:
        weightedPullCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        weightedPullCompiled[0]?.bodyweightContext?.externalLoadKg === 10
          ? undefined
          : "Expected weighted pull-up compile path to carry locked session bodyweight and external load context.",
    },
    {
      id: "weighted_pull_up_more_external_load_increases_stimulus",
      passed: weightedPullHeavyStimulus > weightedPullLightStimulus,
      error:
        weightedPullHeavyStimulus > weightedPullLightStimulus
          ? undefined
          : "Expected higher external load to increase weighted pull-up stimulus in the active coach path.",
    },
    {
      id: "weighted_chest_dips_use_locked_session_bodyweight_when_available",
      passed:
        weightedChestDipsCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        weightedChestDipsCompiled[0]?.bodyweightContext?.externalLoadKg === 10,
      error:
        weightedChestDipsCompiled[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        weightedChestDipsCompiled[0]?.bodyweightContext?.externalLoadKg === 10
          ? undefined
          : "Expected weighted chest dips compile path to carry locked session bodyweight and external load context.",
    },
    {
      id: "weighted_chest_dips_more_external_load_increases_stimulus",
      passed: weightedChestDipsHeavyStimulus > weightedChestDipsLightStimulus,
      error:
        weightedChestDipsHeavyStimulus > weightedChestDipsLightStimulus
          ? undefined
          : "Expected higher external load to increase weighted chest-dips stimulus in the active coach path.",
    },
    {
      id: "external_loading_still_respects_effort_normalization",
      passed: nearFailureStimulus > farFromFailureStimulus,
      error:
        nearFailureStimulus > farFromFailureStimulus
          ? undefined
          : "Expected lower-RIR external loading to produce higher stimulus than the high-RIR contrast case.",
    },
    {
      id: "external_load_only_exercises_remain_valid",
      passed: externalLoadOnlyStimulus > 0,
      error:
        externalLoadOnlyStimulus > 0
          ? undefined
          : "Expected external-load-only exercises to remain valid after normalization wiring.",
    },
    {
      id: "legacy_sessions_without_snapshot_remain_safe",
      passed: legacyCompiled[0]?.bodyweightContext == null,
      error:
        legacyCompiled[0]?.bodyweightContext == null
          ? undefined
          : "Expected legacy sessions without a locked snapshot to keep null bodyweightContext.",
    },
    {
      id: "missing_normalization_metadata_falls_back_to_external",
      passed: fallbackMeta.loadingType === "external",
      error:
        fallbackMeta.loadingType === "external"
          ? undefined
          : "Expected exercises without explicit normalization metadata to fall back to external loading safely.",
    },
    {
      id: "hip_flexor_raise_family_has_explicit_bodyweight_metadata",
      passed: hipFlexorRaiseMetaResolved,
      error: hipFlexorRaiseMetaResolved
        ? undefined
        : "Expected the highest-priority hip-flexor raise entries to resolve explicitly to bodyweight loading.",
    },
    {
      id: "pull_up_family_has_explicit_bodyweight_metadata",
      passed: pullUpFamilyMetaResolved,
      error: pullUpFamilyMetaResolved
        ? undefined
        : "Expected the pull-up family entries in wave 2 to resolve explicitly to bodyweight loading.",
    },
    {
      id: "assisted_pull_up_has_explicit_assisted_bodyweight_metadata",
      passed: assistedPullUpMetaResolved,
      error: assistedPullUpMetaResolved
        ? undefined
        : "Expected assisted_pull_up to resolve explicitly to assisted_bodyweight loading in the active coach path.",
    },
    {
      id: "weighted_pull_up_has_explicit_weighted_bodyweight_metadata",
      passed: weightedPullUpMetaResolved,
      error: weightedPullUpMetaResolved
        ? undefined
        : "Expected weighted_pull_up to resolve explicitly to weighted_bodyweight loading in the active coach path.",
    },
    {
      id: "weighted_pull_up_variants_have_explicit_weighted_bodyweight_metadata",
      passed: weightedPullUpVariantsMetaResolved,
      error: weightedPullUpVariantsMetaResolved
        ? undefined
        : "Expected the weighted pull-up variants to resolve explicitly to weighted_bodyweight loading in the active coach path.",
    },
    {
      id: "weighted_dip_variants_have_explicit_weighted_bodyweight_metadata",
      passed: weightedDipVariantsMetaResolved,
      error: weightedDipVariantsMetaResolved
        ? undefined
        : "Expected the weighted dip variants to resolve explicitly to weighted_bodyweight loading in the active coach path.",
    },
    {
      id: "dip_family_has_explicit_loading_type_metadata",
      passed: dipFamilyMetaResolved,
      error: dipFamilyMetaResolved
        ? undefined
        : "Expected the active dip family entries in wave 3 to resolve explicitly to their intended loading types.",
    },
  ];
}
