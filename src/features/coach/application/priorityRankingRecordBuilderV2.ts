import type {
  PriorityConfidenceDerivationResultV2,
  PriorityEligibilityDerivationResultV2,
  PriorityRankingDerivationInputV2,
  PriorityRankingRecordV2,
  PrioritySeverityDerivationResultV2,
  PriorityStabilityDerivationResultV2,
} from "./priorityRankingTypesV2";

/**
 * Pure assembly helper for the canonical comparable ranking record.
 * This file must not hide any additional ranking policy.
 */
export function buildPriorityRankingRecordV2(
  input: PriorityRankingDerivationInputV2,
  derivation: {
    eligibility: PriorityEligibilityDerivationResultV2;
    severity: PrioritySeverityDerivationResultV2;
    confidence: PriorityConfidenceDerivationResultV2;
    stability: PriorityStabilityDerivationResultV2;
  }
): PriorityRankingRecordV2 {
  return {
    muscleId: input.muscleId,
    classId: input.classId,
    timeWindowMode: input.timeWindowMode,
    priorityEligibilityState: derivation.eligibility.state,
    severityTier: derivation.severity.tier,
    severitySubscore: derivation.severity.subscore,
    severityEdgeState: derivation.severity.edgeState,
    confidenceState: derivation.confidence.state,
    stabilityState: derivation.stability.state,
    deterministicFallbackKey: input.deterministicFallbackKey,
  };
}
