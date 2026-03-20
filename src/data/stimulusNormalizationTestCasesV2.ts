import type { LoggedSetV2 } from "./stimulusEngineV2";
import type { ExerciseNormalizationMetaV2 } from "./exerciseDatabase";

export type NormalizationTestCaseV2 = {
  id: string;
  description: string;
  set: LoggedSetV2;
  exerciseMeta: ExerciseNormalizationMetaV2;
  notes?: string;
};

function externalMeta(): ExerciseNormalizationMetaV2 {
  return {
    loadingType: "external",
    movementClass: "compound",
    equipmentType: "barbell",
    laterality: "bilateral",
  };
}

function bodyweightMeta(): ExerciseNormalizationMetaV2 {
  return {
    loadingType: "bodyweight",
    movementClass: "compound",
    equipmentType: "bodyweight",
    laterality: "bilateral",
  };
}

function weightedBodyweightMeta(): ExerciseNormalizationMetaV2 {
  return {
    loadingType: "weighted_bodyweight",
    movementClass: "compound",
    equipmentType: "bodyweight",
    laterality: "bilateral",
  };
}

function assistedBodyweightMeta(): ExerciseNormalizationMetaV2 {
  return {
    loadingType: "assisted_bodyweight",
    movementClass: "compound",
    equipmentType: "machine",
    laterality: "bilateral",
  };
}

// These cases are chosen to cover the main normalization contrast points:
// effort, rep bracket, loading type, ignored-load behavior, and defensive input handling.
// The goal is broad behavioral coverage first, not exhaustive permutations.
export const stimulusNormalizationTestCasesV2: NormalizationTestCaseV2[] = [
  {
    id: "effort_near_failure_rir_0",
    description: "Same reps/load baseline at 0 RIR for high-quality effort contrast.",
    set: { reps: 10, load: 60, rir: 0 },
    exerciseMeta: externalMeta(),
    notes: "Contrast against higher-RIR cases with the same reps and external load.",
  },
  {
    id: "effort_near_failure_rir_2",
    description: "Same reps/load baseline at 2 RIR for high-quality but slightly lower effort.",
    set: { reps: 10, load: 60, rir: 2 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "effort_further_from_failure_rir_4",
    description: "Same reps/load baseline at 4 RIR to confirm stronger discounting.",
    set: { reps: 10, load: 60, rir: 4 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "effort_missing_rir_fallback",
    description: "Missing RIR should follow the configured fallback path.",
    set: { reps: 10, load: 60 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "effort_clamped_rir_high",
    description: "Out-of-range high RIR should clamp to the configured maximum.",
    set: { reps: 10, load: 60, rir: 8 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "rep_range_low",
    description: "Low-rep external work with matched effort for rep bracket contrast.",
    set: { reps: 4, load: 100, rir: 2 },
    exerciseMeta: externalMeta(),
    notes: "Contrast against moderate and high-rep cases with the same RIR.",
  },
  {
    id: "rep_range_moderate",
    description: "Moderate-rep external work with matched effort for neutral bracket contrast.",
    set: { reps: 12, load: 65, rir: 2 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "rep_range_high",
    description: "High-rep external work with matched effort for upper bracket contrast.",
    set: { reps: 24, load: 30, rir: 2 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "rep_range_clamped_high",
    description: "Out-of-range high reps should clamp to the nearest bracket conceptually.",
    set: { reps: 40, load: 15, rir: 2 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "loading_external_with_load",
    description: "External loading should treat set.load as the relevant load input context.",
    set: { reps: 8, load: 80, rir: 2 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "loading_bodyweight_neutral",
    description: "Pure bodyweight movement should remain neutral in V2 bodyweight handling.",
    set: {
      reps: 10,
      rir: 2,
      bodyweightContext: {
        userBodyweightKg: 82,
        userHeightCm: 182,
      },
    },
    exerciseMeta: bodyweightMeta(),
    notes: "Bodyweight context exists, but should not create an automatic multiplier in V2.",
  },
  {
    id: "loading_bodyweight_ignored_load",
    description: "Load present on a bodyweight movement should be ignored.",
    set: {
      reps: 10,
      load: 25,
      rir: 2,
      bodyweightContext: {
        userBodyweightKg: 82,
      },
    },
    exerciseMeta: bodyweightMeta(),
  },
  {
    id: "loading_weighted_bodyweight_full_context",
    description: "Weighted bodyweight should use explicit bodyweight context when present.",
    set: {
      reps: 8,
      load: 20,
      rir: 1,
      bodyweightContext: {
        userBodyweightKg: 82,
        externalLoadKg: 20,
      },
    },
    exerciseMeta: weightedBodyweightMeta(),
    notes: "set.load is present here only to test ignored-load warning behavior against explicit externalLoadKg.",
  },
  {
    id: "loading_weighted_bodyweight_missing_context",
    description: "Weighted bodyweight without explicit context should resolve conservatively to neutral bodyweight behavior.",
    set: {
      reps: 8,
      rir: 1,
    },
    exerciseMeta: weightedBodyweightMeta(),
  },
  {
    id: "loading_assisted_bodyweight_full_context",
    description: "Assisted bodyweight should use explicit assistance context when present.",
    set: {
      reps: 12,
      load: 35,
      rir: 2,
      bodyweightContext: {
        userBodyweightKg: 82,
        assistanceLoadKg: 35,
      },
    },
    exerciseMeta: assistedBodyweightMeta(),
    notes: "set.load is present here only to test ignored-load warning behavior against explicit assistanceLoadKg.",
  },
  {
    id: "loading_assisted_bodyweight_missing_context",
    description: "Assisted bodyweight without explicit context should resolve conservatively to neutral bodyweight behavior.",
    set: {
      reps: 12,
      rir: 2,
    },
    exerciseMeta: assistedBodyweightMeta(),
  },
  {
    id: "invalid_reps_zero",
    description: "Zero reps should be treated as invalid and return safe zero output.",
    set: { reps: 0, load: 50, rir: 2 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "invalid_reps_negative",
    description: "Negative reps should be treated as invalid and return safe zero output.",
    set: { reps: -5, load: 50, rir: 2 },
    exerciseMeta: externalMeta(),
  },
  {
    id: "missing_optional_inputs_external",
    description: "External movement with only reps should still resolve through conservative defaults.",
    set: { reps: 8 },
    exerciseMeta: externalMeta(),
  },
];
