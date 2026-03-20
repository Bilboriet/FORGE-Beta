/**
 * Forge Stimulus Engine V2 redistribution rules.
 *
 * Neutral/helper buckets are input buckets only. They should be redistributed
 * into real final analysis muscles before final anatomical output is shown or
 * weighted downstream.
 *
 * This file does not define direct driver hierarchy. It only defines how
 * non-final input/helper buckets map into final anatomical analysis outputs.
 */

export type RedistributionRuleV2 = {
  id: string;
  familyKey: string;
  inputBucketKey: string;
  finalOutputAnalysisKeys: string[];
  weights: Record<string, number>;
  confidence: "high" | "medium" | "low";
  evidenceBasis: Array<"literature_backed" | "anatomy_backed" | "heuristic">;
  sourceNotes: string;
  notes?: string;
};

export const stimulusRedistributionRulesV2: RedistributionRuleV2[] = [
  {
    id: "rule_family_biceps_biceps_neutral_to_long_short",
    familyKey: "family_biceps",
    inputBucketKey: "biceps_neutral",
    finalOutputAnalysisKeys: ["biceps_long_head", "biceps_short_head"],
    weights: {
      biceps_long_head: 0.5,
      biceps_short_head: 0.5,
    },
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Neutral curl patterns are treated as roughly balanced between long and short head. Exact percentage is not treated as biological truth.",
    notes: "Input bucket only. Do not surface biceps_neutral as a final output line.",
  },
  {
    id: "rule_family_triceps_triceps_neutral_to_heads",
    familyKey: "family_triceps",
    inputBucketKey: "triceps_neutral",
    finalOutputAnalysisKeys: ["triceps_long_head", "triceps_lateral_head", "triceps_medial_head"],
    weights: {
      triceps_long_head: 0.33,
      triceps_lateral_head: 0.34,
      triceps_medial_head: 0.33,
    },
    confidence: "low",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Neutral compound triceps patterns are broadly distributed across heads. Exact percentages are low-confidence engine defaults, not hard biological truth.",
    notes: "Input bucket only. Do not surface triceps_neutral as a final output line.",
  },
  {
    id: "rule_family_triceps_triceps_lateral_medial_to_lateral_medial",
    familyKey: "family_triceps",
    inputBucketKey: "triceps_lateral_medial",
    finalOutputAnalysisKeys: ["triceps_lateral_head", "triceps_medial_head"],
    weights: {
      triceps_lateral_head: 0.5,
      triceps_medial_head: 0.5,
    },
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Helper bucket represents shared lateral/medial-dominant triceps contribution. Exact percentages are a practical V2 redistribution rule.",
    notes: "Helper bucket only. Do not surface triceps_lateral_medial as a final output line.",
  },
  {
    id: "rule_family_quads_quads_neutral_to_quad_outputs",
    familyKey: "family_quads",
    inputBucketKey: "quads_neutral",
    finalOutputAnalysisKeys: ["rectus_femoris", "vastus_lateralis", "vastus_medialis"],
    weights: {
      rectus_femoris: 0.33,
      vastus_lateralis: 0.34,
      vastus_medialis: 0.33,
    },
    confidence: "low",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Quad compounds clearly stimulate all three outputs. Exact head percentages are not strongly validated. This is a practical V2 neutral redistribution rule, not anatomical certainty.",
    notes: "Helper bucket only. Do not surface quads_neutral as a final output line.",
  },
  {
    id: "rule_family_hamstrings_hamstrings_neutral_to_medial_lateral",
    familyKey: "family_hamstrings",
    inputBucketKey: "hamstrings_neutral",
    finalOutputAnalysisKeys: ["medial_hamstring", "lateral_hamstring"],
    weights: {
      medial_hamstring: 0.5,
      lateral_hamstring: 0.5,
    },
    confidence: "low",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Hinge-family neutral hamstring work is treated as broad hamstring stimulus. Exact medial/lateral split is not treated as biologically exact.",
    notes: "Helper bucket only. Do not surface hamstrings_neutral as a final output line.",
  },
  {
    id: "rule_family_mid_lower_chest_mid_chest_passthrough",
    familyKey: "family_mid_lower_chest",
    inputBucketKey: "mid_chest",
    finalOutputAnalysisKeys: ["mid_chest"],
    weights: {
      mid_chest: 1,
    },
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Merged visual chest zone contains separate mid/lower analysis outputs. Family layer should preserve both outputs explicitly.",
    notes: "Explicit family passthrough rule for merged mid/lower chest handling.",
  },
  {
    id: "rule_family_mid_lower_chest_lower_chest_passthrough",
    familyKey: "family_mid_lower_chest",
    inputBucketKey: "lower_chest",
    finalOutputAnalysisKeys: ["lower_chest"],
    weights: {
      lower_chest: 1,
    },
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Merged visual chest zone contains separate mid/lower analysis outputs. Family layer should preserve both outputs explicitly.",
    notes: "Explicit family passthrough rule for merged mid/lower chest handling.",
  },
  {
    id: "rule_family_mid_lower_traps_middle_traps_passthrough",
    familyKey: "family_mid_lower_traps",
    inputBucketKey: "middle_traps",
    finalOutputAnalysisKeys: ["middle_traps"],
    weights: {
      middle_traps: 1,
    },
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Merged visual traps zone contains distinct middle/lower trap outputs. Family layer should preserve both explicitly.",
    notes: "Explicit family passthrough rule for merged mid/lower traps handling.",
  },
  {
    id: "rule_family_mid_lower_traps_lower_traps_passthrough",
    familyKey: "family_mid_lower_traps",
    inputBucketKey: "lower_traps",
    finalOutputAnalysisKeys: ["lower_traps"],
    weights: {
      lower_traps: 1,
    },
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Merged visual traps zone contains distinct middle/lower trap outputs. Family layer should preserve both explicitly.",
    notes: "Explicit family passthrough rule for merged mid/lower traps handling.",
  },
];
