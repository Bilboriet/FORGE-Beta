import type { NormalizedSetStimulusWarningV2 } from "./stimulusNormalizationConfigV2";

export type NormalizationEdgeCasePolicyV2 = {
  caseId: string;
  description: string;
  policy: string;
  outcome: string;
  warnings?: NormalizedSetStimulusWarningV2[];
  notes?: string;
};

// Edge-case policy is kept separate from normal tuning so defensive behavior is
// explicit and easy to audit. Conservative fallback is preferred because missing
// data should usually resolve to neutral behavior rather than guessed amplification,
// while invalid core inputs should resolve to safe zero behavior.
export const stimulusNormalizationEdgeCasePolicyV2: NormalizationEdgeCasePolicyV2[] = [
  {
    caseId: "invalid_reps_non_positive_or_non_finite",
    description: "Reps are zero, negative, or non-finite.",
    policy: "Treat reps as invalid core input.",
    outcome: "Return safe zero normalized stimulus and zeroed component factors.",
    warnings: ["InvalidReps"],
    notes: "Invalid core inputs resolve to safe zero rather than guessed set quality.",
  },
  {
    caseId: "missing_rir_with_default_mode",
    description: "RIR is missing while effort.rirMode is explicit_or_default.",
    policy: "Use configured defaultRir conservatively.",
    outcome: "Resolve effort through fallback RIR instead of assuming near-failure effort.",
    warnings: ["MissingRIR", "UsedDefaultRIR"],
  },
  {
    caseId: "rir_below_min_or_above_max",
    description: "RIR is outside the configured clamp range.",
    policy: "Clamp RIR to the configured min/max bounds.",
    outcome: "Use the nearest valid RIR tier for effort resolution.",
    warnings: ["ClampedRIR"],
    notes: "Clamping keeps the discrete model explainable and bounded.",
  },
  {
    caseId: "reps_below_lowest_bracket",
    description: "Reps fall below the lowest configured rep bracket.",
    policy: "Clamp conceptually to the nearest rep bracket.",
    outcome: "Use the lowest bracket factor rather than inventing a new rep-range rule.",
    warnings: ["ClampedRepRange"],
  },
  {
    caseId: "reps_above_highest_bracket",
    description: "Reps exceed the highest configured rep bracket.",
    policy: "Clamp conceptually to the nearest rep bracket.",
    outcome: "Use the highest bracket factor rather than inventing a new rep-range rule.",
    warnings: ["ClampedRepRange"],
  },
  {
    caseId: "weighted_bodyweight_missing_context",
    description: "loadingType is weighted_bodyweight but required bodyweight context is missing.",
    policy: "Keep bodyweight handling neutral when explicit context is missing.",
    outcome: "Use neutral bodyweight factor rather than guessing bodyweight or external load.",
    warnings: ["MissingBodyweightContext"],
    notes: "Missing data resolves conservatively to neutral behavior.",
  },
  {
    caseId: "assisted_bodyweight_missing_context",
    description: "loadingType is assisted_bodyweight but required bodyweight context is missing.",
    policy: "Keep bodyweight handling neutral when explicit context is missing.",
    outcome: "Use neutral bodyweight factor rather than guessing assistance or bodyweight.",
    warnings: ["MissingBodyweightContext"],
  },
  {
    caseId: "bodyweight_with_load_present",
    description: "loadingType is bodyweight and set.load is provided.",
    policy: "Ignore set.load for plain bodyweight handling in V2.",
    outcome: "Bodyweight factor stays neutral.",
    warnings: ["IgnoredLoad"],
    notes: "Plain bodyweight remains neutral in V2 even if context or stray load data exists.",
  },
  {
    caseId: "weighted_bodyweight_with_set_load_present",
    description: "loadingType is weighted_bodyweight and set.load is present alongside explicit context fields.",
    policy: "Use bodyweightContext.externalLoadKg as the explicit source and ignore set.load.",
    outcome: "Resolve weighted-bodyweight handling only from explicit bodyweight context fields.",
    warnings: ["IgnoredLoad"],
  },
  {
    caseId: "assisted_bodyweight_with_set_load_present",
    description: "loadingType is assisted_bodyweight and set.load is present alongside explicit context fields.",
    policy: "Use bodyweightContext.assistanceLoadKg as the explicit source and ignore set.load.",
    outcome: "Resolve assisted-bodyweight handling only from explicit bodyweight context fields.",
    warnings: ["IgnoredLoad"],
  },
  {
    caseId: "plain_bodyweight_with_or_without_context",
    description: "loadingType is bodyweight and bodyweight context may be present or absent.",
    policy: "Keep bodyweight normalization neutral in V2.",
    outcome: "Do not amplify or penalize normalized stimulus from plain bodyweight context alone.",
    notes: "Absence of bodyweight context should not emit MissingBodyweightContext for plain bodyweight.",
  },
  {
    caseId: "external_loading_with_bodyweight_context_present",
    description: "loadingType is external and bodyweight context is present.",
    policy: "Ignore bodyweight and height for stimulus scaling in external-loading cases.",
    outcome: "Bodyweight factor stays neutral.",
    notes: "Height and bodyweight are not global multipliers in V2.",
  },
  {
    caseId: "empty_rep_range_brackets",
    description: "Rep bracket config is empty or unavailable unexpectedly.",
    policy: "Fall back to a neutral rep-range factor.",
    outcome: "Use safe neutral behavior rather than failing or inventing a bracket.",
    notes: "This should not happen in normal typed usage, but the defensive outcome stays explainable.",
  },
  {
    caseId: "missing_effort_factor_lookup",
    description: "A resolved RIR does not have a matching factor entry unexpectedly.",
    policy: "Fall back to the configured defaultRir factor, then to neutral if necessary.",
    outcome: "Use safe bounded effort behavior rather than failing or inventing precision.",
    notes: "This keeps the effort model robust without broadening the warning surface.",
  },
];
