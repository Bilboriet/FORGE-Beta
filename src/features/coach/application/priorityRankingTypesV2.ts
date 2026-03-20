export type PriorityEligibilityStateV2 =
  | "suppressed"
  | "weak"
  | "normal"
  | "strong";

export type PrioritySeverityTierV2 =
  | "mild"
  | "moderate"
  | "strong";

export type PrioritySeverityEdgeStateV2 =
  | "low_edge"
  | "mid_band"
  | "high_edge";

export type PriorityConfidenceStateV2 =
  | "low"
  | "medium"
  | "high";

export type PriorityStabilityStateV2 =
  | "unstable"
  | "mixed"
  | "stable";

export type PriorityTimeWindowModeV2 = "session" | "weekly";

export type PriorityTargetClassIdV2 = "A" | "B" | "C" | "D" | "E";

export type PriorityRawDeviationContextV2 = {
  status: "under" | "balanced" | "over";
  deviationDirection: "under" | "over" | "none";
  isNearBoundary: boolean;
  relativeDeviationBand: "boundary_adjacent" | "mild" | "moderate" | "strong";
  relativeDeviationSubscore: number;
};

export type PriorityDirectIndirectProfileV2 = {
  dominance: "direct" | "mixed" | "indirect";
  intentClarity: "clear" | "mixed" | "ambiguous";
  classNoiseLevel: "low" | "medium" | "high";
};

/**
 * Pre-ranking context only.
 * Must not contain precomputed eligibility, severity tier, confidence/stability
 * state, combined rank score, or any hidden priority judgment.
 */
export type PriorityRankingDerivationInputV2 = {
  muscleId: string;
  classId: PriorityTargetClassIdV2;
  timeWindowMode: PriorityTimeWindowModeV2;
  rawDeviationContext: PriorityRawDeviationContextV2;
  directVsIndirectProfile: PriorityDirectIndirectProfileV2;
  actionLikelihood: "low" | "medium" | "high";
  patternDistribution: "clustered" | "mixed" | "distributed";
  patternRepeatState: "isolated" | "partial" | "repeated";
  deterministicFallbackKey: string;
};

export type PriorityEligibilityDerivationResultV2 = {
  state: PriorityEligibilityStateV2;
  reason: string;
  notes: string[];
};

export type PrioritySeverityDerivationResultV2 = {
  tier: PrioritySeverityTierV2;
  subscore: number;
  edgeState: PrioritySeverityEdgeStateV2;
  reason: string;
  notes: string[];
};

export type PriorityConfidenceDerivationResultV2 = {
  state: PriorityConfidenceStateV2;
  reason: string;
  notes: string[];
};

export type PriorityStabilityDerivationResultV2 = {
  state: PriorityStabilityStateV2;
  reason: string;
  notes: string[];
};

export type PriorityRankingRecordV2 = {
  muscleId: string;
  classId: PriorityTargetClassIdV2;
  timeWindowMode: PriorityTimeWindowModeV2;
  priorityEligibilityState: PriorityEligibilityStateV2;
  severityTier: PrioritySeverityTierV2;
  severitySubscore: number;
  severityEdgeState: PrioritySeverityEdgeStateV2;
  confidenceState: PriorityConfidenceStateV2;
  stabilityState: PriorityStabilityStateV2;
  deterministicFallbackKey: string;
};

export type PriorityComparisonPathV2 =
  | "eligibility"
  | "severity_tier"
  | "severity_subscore"
  | "confidence"
  | "stability"
  | "near_margin_confidence_override"
  | "near_margin_stability_override"
  | "deterministic_fallback";

export type PriorityComparatorDecisionV2 = {
  winnerMuscleId: string;
  loserMuscleId: string;
  decisionPath: PriorityComparisonPathV2;
  reason: string;
};

export type PriorityComparatorTraceV2 = {
  leftMuscleId: string;
  rightMuscleId: string;
  decisionPath: PriorityComparisonPathV2;
  reason: string;
  overrideApplied: boolean;
  overrideType?: "confidence" | "stability";
};

export type PriorityRankingTraceV2 = {
  muscleId: string;
  derivedEligibilityReason: string;
  derivedSeverityReason: string;
  derivedConfidenceReason: string;
  derivedStabilityReason: string;
  rankingNotes: string[];
  comparisonPathSummary: string[];
  finalComparableShape: PriorityRankingRecordV2;
};
