import {
  comparePriorityRankingRecordsV2,
  comparePriorityRankingRecordsWithDecisionV2,
} from "./priorityRankingComparatorV2";
import {
  derivePriorityConfidenceStateV2,
  derivePriorityEligibilityStateV2,
  derivePrioritySeverityV2,
  derivePriorityStabilityStateV2,
} from "./priorityRankingDerivationV2";
import { buildPriorityRankingRecordV2 } from "./priorityRankingRecordBuilderV2";
import type {
  PriorityComparatorDecisionV2,
  PriorityRankingDerivationInputV2,
  PriorityRankingRecordV2,
} from "./priorityRankingTypesV2";

export type PriorityOrderingValidationCaseV2 = {
  id: string;
  inputs: readonly PriorityRankingDerivationInputV2[];
  expectedOrder: readonly string[];
  expectedTopDecisionPath?: PriorityComparatorDecisionV2["decisionPath"];
};

function buildPriorityRankingRecordFromInputV2(
  input: PriorityRankingDerivationInputV2
): PriorityRankingRecordV2 {
  const derivation = {
    eligibility: derivePriorityEligibilityStateV2(input),
    severity: derivePrioritySeverityV2(input),
    confidence: derivePriorityConfidenceStateV2(input),
    stability: derivePriorityStabilityStateV2(input),
  };

  return buildPriorityRankingRecordV2(input, derivation);
}

function sortPriorityRankingInputsV2(
  inputs: readonly PriorityRankingDerivationInputV2[]
): PriorityRankingRecordV2[] {
  return inputs
    .map(buildPriorityRankingRecordFromInputV2)
    .sort((left, right) => comparePriorityRankingRecordsV2(left, right));
}

export const priorityOrderingValidationCasesV2: PriorityOrderingValidationCaseV2[] = [
  {
    id: "ordering_consistency_priority_misranking_like",
    inputs: [
      {
        muscleId: "upper_chest",
        classId: "C",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "mild",
          relativeDeviationSubscore: 0.24,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "upper_chest",
      },
      {
        muscleId: "lower_lats",
        classId: "C",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 0.78,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "high",
        patternDistribution: "distributed",
        patternRepeatState: "repeated",
        deterministicFallbackKey: "lower_lats",
      },
    ],
    expectedOrder: ["lower_lats", "upper_chest"],
  },
  {
    id: "session_boundary_suppressed_signal_stays_below_strong_issue",
    inputs: [
      {
        muscleId: "upper_lats",
        classId: "C",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 1,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "high",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "upper_lats",
      },
      {
        muscleId: "upper_chest",
        classId: "C",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: true,
          relativeDeviationBand: "boundary_adjacent",
          relativeDeviationSubscore: 0.0769,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "low",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "upper_chest",
      },
    ],
    expectedOrder: ["upper_lats", "upper_chest"],
    expectedTopDecisionPath: "eligibility",
  },
  {
    id: "confidence_override_close_case",
    inputs: [
      {
        muscleId: "upper_chest",
        classId: "C",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "moderate",
          relativeDeviationSubscore: 0.52,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "upper_chest",
      },
      {
        muscleId: "biceps_long_head",
        classId: "B",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "moderate",
          relativeDeviationSubscore: 0.5,
        },
        directVsIndirectProfile: {
          dominance: "indirect",
          intentClarity: "ambiguous",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "biceps_long_head",
      },
    ],
    expectedOrder: ["upper_chest", "biceps_long_head"],
    expectedTopDecisionPath: "near_margin_confidence_override",
  },
  {
    id: "session_direct_signal_beats_noisy_support_like_signal",
    inputs: [
      {
        muscleId: "mid_chest",
        classId: "C",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 0.8,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "high",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "mid_chest",
      },
      {
        muscleId: "serratus_anterior",
        classId: "D",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 0.8,
        },
        directVsIndirectProfile: {
          dominance: "indirect",
          intentClarity: "ambiguous",
          classNoiseLevel: "high",
        },
        actionLikelihood: "high",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "serratus_anterior",
      },
    ],
    expectedOrder: ["mid_chest", "serratus_anterior"],
    expectedTopDecisionPath: "eligibility",
  },
  {
    id: "weekly_stability_influence_spike_vs_pattern",
    inputs: [
      {
        muscleId: "gluteus_maximus",
        classId: "E",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "moderate",
          relativeDeviationSubscore: 0.55,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "high",
        patternDistribution: "distributed",
        patternRepeatState: "repeated",
        deterministicFallbackKey: "gluteus_maximus",
      },
      {
        muscleId: "gluteus_medius",
        classId: "E",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "moderate",
          relativeDeviationSubscore: 0.54,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "high",
        patternDistribution: "clustered",
        patternRepeatState: "isolated",
        deterministicFallbackKey: "gluteus_medius",
      },
    ],
    expectedOrder: ["gluteus_maximus", "gluteus_medius"],
    expectedTopDecisionPath: "near_margin_stability_override",
  },
  {
    id: "weekly_full_recurrence_beats_partial_recurrence",
    inputs: [
      {
        muscleId: "upper_chest",
        classId: "C",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 1,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "high",
        patternDistribution: "distributed",
        patternRepeatState: "repeated",
        deterministicFallbackKey: "upper_chest",
      },
      {
        muscleId: "mid_chest",
        classId: "C",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 1,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "high",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "mid_chest",
      },
    ],
    expectedOrder: ["upper_chest", "mid_chest"],
    expectedTopDecisionPath: "stability",
  },
  {
    id: "same_tier_tightening_blocks_false_confidence_override",
    inputs: [
      {
        muscleId: "neutral_lats",
        classId: "C",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "moderate",
          relativeDeviationSubscore: 0.72,
        },
        directVsIndirectProfile: {
          dominance: "indirect",
          intentClarity: "ambiguous",
          classNoiseLevel: "high",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "neutral_lats",
      },
      {
        muscleId: "mid_chest",
        classId: "C",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "moderate",
          relativeDeviationSubscore: 0.28,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "mid_chest",
      },
    ],
    expectedOrder: ["mid_chest", "neutral_lats"],
    expectedTopDecisionPath: "eligibility",
  },
  {
    id: "weekly_class_b_ambiguity_preserves_deterministic_fallback",
    inputs: [
      {
        muscleId: "biceps_long_head",
        classId: "B",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 0.8875,
        },
        directVsIndirectProfile: {
          dominance: "mixed",
          intentClarity: "mixed",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "high",
        patternDistribution: "distributed",
        patternRepeatState: "repeated",
        deterministicFallbackKey: "biceps_long_head",
      },
      {
        muscleId: "biceps_short_head",
        classId: "B",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 0.8875,
        },
        directVsIndirectProfile: {
          dominance: "mixed",
          intentClarity: "mixed",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "high",
        patternDistribution: "distributed",
        patternRepeatState: "repeated",
        deterministicFallbackKey: "biceps_short_head",
      },
    ],
    expectedOrder: ["biceps_long_head", "biceps_short_head"],
    expectedTopDecisionPath: "deterministic_fallback",
  },
  {
    id: "mild_overreaction_defense",
    inputs: [
      {
        muscleId: "deltoid_lateral",
        classId: "B",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "mild",
          relativeDeviationSubscore: 0.3,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "high",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "deltoid_lateral",
      },
      {
        muscleId: "lower_lats",
        classId: "C",
        timeWindowMode: "session",
        rawDeviationContext: {
          status: "under",
          deviationDirection: "under",
          isNearBoundary: false,
          relativeDeviationBand: "moderate",
          relativeDeviationSubscore: 0.45,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "lower_lats",
      },
    ],
    expectedOrder: ["lower_lats", "deltoid_lateral"],
  },
  {
    id: "serratus_like_false_reduce_guardrail",
    inputs: [
      {
        muscleId: "serratus_anterior",
        classId: "D",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 0.5,
        },
        directVsIndirectProfile: {
          dominance: "indirect",
          intentClarity: "ambiguous",
          classNoiseLevel: "high",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "serratus_anterior",
      },
      {
        muscleId: "mid_chest",
        classId: "C",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 0.52,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "low",
        },
        actionLikelihood: "medium",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "mid_chest",
      },
    ],
    expectedOrder: ["mid_chest", "serratus_anterior"],
    expectedTopDecisionPath: "near_margin_confidence_override",
  },
  {
    id: "weekly_class_d_support_stays_below_direct_signal",
    inputs: [
      {
        muscleId: "mid_chest",
        classId: "C",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 1,
        },
        directVsIndirectProfile: {
          dominance: "direct",
          intentClarity: "clear",
          classNoiseLevel: "medium",
        },
        actionLikelihood: "high",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "mid_chest",
      },
      {
        muscleId: "serratus_anterior",
        classId: "D",
        timeWindowMode: "weekly",
        rawDeviationContext: {
          status: "over",
          deviationDirection: "over",
          isNearBoundary: false,
          relativeDeviationBand: "strong",
          relativeDeviationSubscore: 1,
        },
        directVsIndirectProfile: {
          dominance: "indirect",
          intentClarity: "ambiguous",
          classNoiseLevel: "high",
        },
        actionLikelihood: "high",
        patternDistribution: "mixed",
        patternRepeatState: "partial",
        deterministicFallbackKey: "serratus_anterior",
      },
    ],
    expectedOrder: ["mid_chest", "serratus_anterior"],
    expectedTopDecisionPath: "eligibility",
  },
];

export function runPriorityOrderingValidationSuiteV2(
  cases: readonly PriorityOrderingValidationCaseV2[] = priorityOrderingValidationCasesV2
): {
  total: number;
  passed: number;
  failed: number;
  results: {
    id: string;
    passed: boolean;
    errors: string[];
  }[];
} {
  const results = cases.map((testCase) => {
    const records = sortPriorityRankingInputsV2(testCase.inputs);
    const actualOrder = records.map((record) => record.muscleId);
    const errors: string[] = [];
    const sameLength = actualOrder.length === testCase.expectedOrder.length;
    const sameOrder =
      sameLength && actualOrder.every((muscleId, index) => muscleId === testCase.expectedOrder[index]);

    if (!sameOrder) {
      errors.push(
        `priority order mismatch: expected [${testCase.expectedOrder.join(", ")}], got [${actualOrder.join(", ")}]`
      );
    }

    if (testCase.expectedTopDecisionPath && records.length >= 2) {
      const topComparison = comparePriorityRankingRecordsWithDecisionV2(records[0], records[1]);

      if (topComparison.decision.decisionPath !== testCase.expectedTopDecisionPath) {
        errors.push(
          `decision path mismatch: expected ${testCase.expectedTopDecisionPath}, got ${topComparison.decision.decisionPath}`
        );
      }
    }

    return {
      id: testCase.id,
      passed: errors.length === 0,
      errors,
    };
  });

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}
