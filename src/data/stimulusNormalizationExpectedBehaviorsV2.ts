import type { NormalizedSetStimulusWarningV2 } from "./stimulusNormalizationConfigV2";

export type NormalizationExpectedBehaviorV2 = {
  id: string;
  expectedWarnings?: NormalizedSetStimulusWarningV2[];
  expectedNoWarnings?: NormalizedSetStimulusWarningV2[];
  expectedComparisons?: {
    greaterThan?: string[];
    lessThan?: string[];
    equalTo?: string[];
  };
  expectedComponents?: Partial<{
    effortFactor: number;
    repRangeFactor: number;
    bodyweightFactor: number;
  }>;
  expectedNormalizedStimulus?: number;
  notes?: string;
};

// Relative assertions are preferred for most normalization QA because they protect
// the intended behavior without overfitting the exact implementation. Exact assertions
// are still appropriate for warnings, discrete config factors, and safe-zero outcomes.
//
// This layer is meant to protect behavior and tuning intent, not to freeze every
// implementation detail too early.
export const stimulusNormalizationExpectedBehaviorsV2: NormalizationExpectedBehaviorV2[] = [
  {
    id: "effort_near_failure_rir_0",
    expectedNoWarnings: ["MissingRIR", "UsedDefaultRIR", "ClampedRIR"],
    expectedComparisons: {
      greaterThan: ["effort_near_failure_rir_2", "effort_further_from_failure_rir_4", "effort_missing_rir_fallback"],
    },
    expectedComponents: {
      effortFactor: 1,
      repRangeFactor: 1,
      bodyweightFactor: 1,
    },
    notes: "Near-failure work should outrank fallback and higher-RIR contrast cases.",
  },
  {
    id: "effort_near_failure_rir_2",
    expectedNoWarnings: ["MissingRIR", "UsedDefaultRIR", "ClampedRIR"],
    expectedComparisons: {
      lessThan: ["effort_near_failure_rir_0"],
      greaterThan: ["effort_further_from_failure_rir_4", "effort_missing_rir_fallback"],
    },
    expectedComponents: {
      effortFactor: 0.92,
      repRangeFactor: 1,
      bodyweightFactor: 1,
    },
  },
  {
    id: "effort_further_from_failure_rir_4",
    expectedNoWarnings: ["MissingRIR", "UsedDefaultRIR", "ClampedRIR"],
    expectedComparisons: {
      lessThan: ["effort_near_failure_rir_0", "effort_near_failure_rir_2", "effort_missing_rir_fallback"],
    },
    expectedComponents: {
      effortFactor: 0.68,
      repRangeFactor: 1,
      bodyweightFactor: 1,
    },
  },
  {
    id: "effort_missing_rir_fallback",
    expectedWarnings: ["MissingRIR", "UsedDefaultRIR"],
    expectedNoWarnings: ["ClampedRIR"],
    expectedComparisons: {
      lessThan: ["effort_near_failure_rir_0", "effort_near_failure_rir_2"],
      greaterThan: ["effort_further_from_failure_rir_4"],
    },
    expectedComponents: {
      effortFactor: 0.82,
      repRangeFactor: 1,
      bodyweightFactor: 1,
    },
    notes: "Fallback RIR should be conservative, but still represent meaningful work.",
  },
  {
    id: "effort_clamped_rir_high",
    expectedWarnings: ["ClampedRIR"],
    expectedNoWarnings: ["MissingRIR", "UsedDefaultRIR"],
    expectedComparisons: {
      lessThan: ["effort_further_from_failure_rir_4", "effort_missing_rir_fallback"],
    },
    expectedComponents: {
      effortFactor: 0.5,
      repRangeFactor: 1,
      bodyweightFactor: 1,
    },
    notes: "Clamped high RIR should resolve to the configured max-RIR bucket.",
  },
  {
    id: "rep_range_low",
    expectedNoWarnings: ["ClampedRepRange"],
    expectedComparisons: {
      lessThan: ["rep_range_moderate"],
    },
    expectedComponents: {
      effortFactor: 0.92,
      repRangeFactor: 0.92,
      bodyweightFactor: 1,
    },
  },
  {
    id: "rep_range_moderate",
    expectedNoWarnings: ["ClampedRepRange"],
    expectedComparisons: {
      greaterThan: ["rep_range_low", "rep_range_high"],
    },
    expectedComponents: {
      effortFactor: 0.92,
      repRangeFactor: 1,
      bodyweightFactor: 1,
    },
    notes: "Moderate reps are the neutral top bracket in V2.",
  },
  {
    id: "rep_range_high",
    expectedNoWarnings: ["ClampedRepRange"],
    expectedComparisons: {
      lessThan: ["rep_range_moderate"],
      greaterThan: ["rep_range_clamped_high"],
    },
    expectedComponents: {
      effortFactor: 0.92,
      repRangeFactor: 0.94,
      bodyweightFactor: 1,
    },
  },
  {
    id: "rep_range_clamped_high",
    expectedWarnings: ["ClampedRepRange"],
    expectedComponents: {
      effortFactor: 0.92,
      repRangeFactor: 0.94,
      bodyweightFactor: 1,
    },
    notes: "Out-of-range high reps should clamp to the nearest configured bracket.",
  },
  {
    id: "loading_external_with_load",
    expectedNoWarnings: ["IgnoredLoad", "MissingBodyweightContext"],
    expectedComponents: {
      bodyweightFactor: 1,
    },
    notes: "External loading stays neutral in the bodyweight model.",
  },
  {
    id: "loading_bodyweight_neutral",
    expectedNoWarnings: ["IgnoredLoad", "MissingBodyweightContext"],
    expectedComponents: {
      bodyweightFactor: 1,
    },
    notes: "Plain bodyweight remains neutral in V2 even when context exists.",
  },
  {
    id: "loading_bodyweight_ignored_load",
    expectedWarnings: ["IgnoredLoad"],
    expectedNoWarnings: ["MissingBodyweightContext"],
    expectedComponents: {
      bodyweightFactor: 1,
    },
  },
  {
    id: "loading_weighted_bodyweight_full_context",
    expectedWarnings: ["IgnoredLoad"],
    expectedNoWarnings: ["MissingBodyweightContext"],
    expectedComparisons: {
      greaterThan: ["loading_weighted_bodyweight_missing_context"],
    },
    expectedComponents: {
      bodyweightFactor: 1.06,
    },
    notes: "Weighted bodyweight gets only a limited positive adjustment.",
  },
  {
    id: "loading_weighted_bodyweight_missing_context",
    expectedWarnings: ["MissingBodyweightContext"],
    expectedNoWarnings: ["IgnoredLoad"],
    expectedComponents: {
      bodyweightFactor: 1,
    },
    notes: "Missing context should stay conservative and neutral.",
  },
  {
    id: "loading_assisted_bodyweight_full_context",
    expectedWarnings: ["IgnoredLoad"],
    expectedNoWarnings: ["MissingBodyweightContext"],
    expectedComparisons: {
      lessThan: ["loading_weighted_bodyweight_full_context", "loading_assisted_bodyweight_missing_context"],
    },
    expectedComponents: {
      bodyweightFactor: 0.9,
    },
    notes: "Assisted bodyweight gets a modest negative adjustment only with explicit context.",
  },
  {
    id: "loading_assisted_bodyweight_missing_context",
    expectedWarnings: ["MissingBodyweightContext"],
    expectedNoWarnings: ["IgnoredLoad"],
    expectedComponents: {
      bodyweightFactor: 1,
    },
  },
  {
    id: "invalid_reps_zero",
    expectedWarnings: ["InvalidReps"],
    expectedNormalizedStimulus: 0,
    notes: "Invalid reps should return safe zero behavior.",
  },
  {
    id: "invalid_reps_negative",
    expectedWarnings: ["InvalidReps"],
    expectedNormalizedStimulus: 0,
  },
  {
    id: "missing_optional_inputs_external",
    expectedWarnings: ["MissingRIR", "UsedDefaultRIR"],
    expectedNoWarnings: ["IgnoredLoad", "MissingBodyweightContext"],
    expectedComponents: {
      effortFactor: 0.82,
      repRangeFactor: 0.98,
      bodyweightFactor: 1,
    },
    notes: "Missing optional inputs should resolve through conservative defaults rather than failing.",
  },
];
