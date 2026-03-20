import type {
  PriorityComparatorDecisionV2,
  PriorityComparatorTraceV2,
  PriorityConfidenceStateV2,
  PriorityEligibilityStateV2,
  PriorityRankingRecordV2,
  PrioritySeverityTierV2,
  PriorityStabilityStateV2,
} from "./priorityRankingTypesV2";

// Scaffold placeholder only.
// This is not a tuned threshold and must be replaced during the first non-placeholder logic pass.
const PLACEHOLDER_NEAR_MARGIN_SUBSCORE_GAP_V2 = 0.2;

/**
 * Structural categorical ordering helper only.
 * These values are not tuned scoring constants and must not be reused as a flat score.
 */
export function eligibilityRankValueV2(state: PriorityEligibilityStateV2): number {
  switch (state) {
    case "strong":
      return 4;
    case "normal":
      return 3;
    case "weak":
      return 2;
    case "suppressed":
      return 1;
  }
}

/**
 * Structural categorical ordering helper only.
 */
export function severityTierRankValueV2(tier: PrioritySeverityTierV2): number {
  switch (tier) {
    case "strong":
      return 3;
    case "moderate":
      return 2;
    case "mild":
      return 1;
  }
}

/**
 * Structural categorical ordering helper only.
 */
export function confidenceRankValueV2(state: PriorityConfidenceStateV2): number {
  switch (state) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

/**
 * Structural categorical ordering helper only.
 */
export function stabilityRankValueV2(state: PriorityStabilityStateV2): number {
  switch (state) {
    case "stable":
      return 3;
    case "mixed":
      return 2;
    case "unstable":
      return 1;
  }
}

/**
 * True only when severity comparison is structurally close enough for lower-layer refinement.
 * Tuned near-margin sensitivity will be introduced later.
 */
export function isNearMarginSeverityCaseV2(
  left: PriorityRankingRecordV2,
  right: PriorityRankingRecordV2
): boolean {
  const leftTier = severityTierRankValueV2(left.severityTier);
  const rightTier = severityTierRankValueV2(right.severityTier);
  const tierGap = Math.abs(leftTier - rightTier);

  if (tierGap === 0) {
    // Same-tier comparisons are only near-margin when edge posture is structurally
    // aligned enough that within-tier subscore closeness is meaningful.
    if (left.severityEdgeState === right.severityEdgeState) {
      return Math.abs(left.severitySubscore - right.severitySubscore) <= PLACEHOLDER_NEAR_MARGIN_SUBSCORE_GAP_V2;
    }

    return false;
  }

  if (tierGap > 1) return false;

  const higher = leftTier > rightTier ? left : right;
  const lower = leftTier > rightTier ? right : left;

  if (higher.severityEdgeState !== "low_edge" || lower.severityEdgeState !== "high_edge") {
    return false;
  }

  return Math.abs(left.severitySubscore - right.severitySubscore) <= PLACEHOLDER_NEAR_MARGIN_SUBSCORE_GAP_V2;
}

/**
 * Confidence can only refine comparisons when eligibility is not clearly separated
 * and severity remains near-margin.
 * This is a narrow close-case trust refinement, not a general confidence-first rule.
 */
export function isConfidenceOverrideAllowedV2(
  left: PriorityRankingRecordV2,
  right: PriorityRankingRecordV2
): boolean {
  const eligibilityGap = Math.abs(
    eligibilityRankValueV2(left.priorityEligibilityState) -
      eligibilityRankValueV2(right.priorityEligibilityState)
  );

  const confidenceGap = Math.abs(
    confidenceRankValueV2(left.confidenceState) -
      confidenceRankValueV2(right.confidenceState)
  );

  return (
    eligibilityGap === 0 &&
    isNearMarginSeverityCaseV2(left, right) &&
    confidenceGap > 0
  );
}

/**
 * Stability can only refine comparisons in narrow weekly-relevant near-margin cases.
 * This remains intentionally conservative until weekly sensitivity is tuned.
 */
export function isStabilityOverrideAllowedV2(
  left: PriorityRankingRecordV2,
  right: PriorityRankingRecordV2
): boolean {
  const eligibilityGap = Math.abs(
    eligibilityRankValueV2(left.priorityEligibilityState) -
      eligibilityRankValueV2(right.priorityEligibilityState)
  );

  return (
    eligibilityGap === 0 &&
    isNearMarginSeverityCaseV2(left, right) &&
    isWeeklyPatternDisplacementCaseV2(left, right)
  );
}

/**
 * Optional narrow hook for weekly stable-pattern versus spike displacement cases.
 * This is intentionally structural and narrow:
 * weekly mode only, and only clear stable-versus-unstable displacement.
 * It is not a general weekly preference rule.
 */
export function isWeeklyPatternDisplacementCaseV2(
  left: PriorityRankingRecordV2,
  right: PriorityRankingRecordV2
): boolean {
  return (
    left.timeWindowMode === "weekly" &&
    right.timeWindowMode === "weekly" &&
    (
      (left.stabilityState === "stable" && right.stabilityState === "unstable") ||
      (left.stabilityState === "unstable" && right.stabilityState === "stable")
    )
  );
}

function compareNumbersDescending(left: number, right: number): number {
  if (left > right) return -1;
  if (left < right) return 1;
  return 0;
}

function buildComparatorTrace(
  left: PriorityRankingRecordV2,
  right: PriorityRankingRecordV2,
  decision: PriorityComparatorDecisionV2,
  overrideApplied: boolean,
  overrideType?: "confidence" | "stability"
): PriorityComparatorTraceV2 {
  return {
    leftMuscleId: left.muscleId,
    rightMuscleId: right.muscleId,
    decisionPath: decision.decisionPath,
    reason: decision.reason,
    overrideApplied,
    overrideType,
  };
}

/**
 * Sort-compatible comparator for canonical ranking records.
 * Ordinary sorting does not require comparator trace capture.
 */
export function comparePriorityRankingRecordsV2(
  left: PriorityRankingRecordV2,
  right: PriorityRankingRecordV2
): number {
  return comparePriorityRankingRecordsWithDecisionV2(left, right).sortOrder;
}

/**
 * Rich comparator variant that preserves decision-path visibility.
 * Near-margin sensitivity is intentionally placeholder-only in this scaffold.
 */
export function comparePriorityRankingRecordsWithDecisionV2(
  left: PriorityRankingRecordV2,
  right: PriorityRankingRecordV2
): {
  sortOrder: number;
  decision: PriorityComparatorDecisionV2;
  trace: PriorityComparatorTraceV2;
} {
  const eligibilityOrder = compareNumbersDescending(
    eligibilityRankValueV2(left.priorityEligibilityState),
    eligibilityRankValueV2(right.priorityEligibilityState)
  );

  if (eligibilityOrder !== 0) {
    const decision: PriorityComparatorDecisionV2 = eligibilityOrder < 0
      ? {
          winnerMuscleId: left.muscleId,
          loserMuscleId: right.muscleId,
          decisionPath: "eligibility",
          reason: "Eligibility state decided the comparison.",
        }
      : {
          winnerMuscleId: right.muscleId,
          loserMuscleId: left.muscleId,
          decisionPath: "eligibility",
          reason: "Eligibility state decided the comparison.",
        };

    return {
      sortOrder: eligibilityOrder,
      trace: buildComparatorTrace(left, right, decision, false),
      decision,
    };
  }

  const severityTierOrder = compareNumbersDescending(
    severityTierRankValueV2(left.severityTier),
    severityTierRankValueV2(right.severityTier)
  );

  const severitySubscoreOrder = compareNumbersDescending(left.severitySubscore, right.severitySubscore);
  const nearMarginSeverity = isNearMarginSeverityCaseV2(left, right);

  if (severityTierOrder !== 0 && !nearMarginSeverity) {
    const decision: PriorityComparatorDecisionV2 = severityTierOrder < 0
      ? {
          winnerMuscleId: left.muscleId,
          loserMuscleId: right.muscleId,
          decisionPath: "severity_tier",
          reason: "A clear severity tier gap decided the comparison.",
        }
      : {
          winnerMuscleId: right.muscleId,
          loserMuscleId: left.muscleId,
          decisionPath: "severity_tier",
          reason: "A clear severity tier gap decided the comparison.",
        };

    return {
      sortOrder: severityTierOrder,
      trace: buildComparatorTrace(left, right, decision, false),
      decision,
    };
  }

  if (isConfidenceOverrideAllowedV2(left, right)) {
    const confidenceOrder = compareNumbersDescending(
      confidenceRankValueV2(left.confidenceState),
      confidenceRankValueV2(right.confidenceState)
    );

    if (confidenceOrder !== 0) {
      const decision: PriorityComparatorDecisionV2 = confidenceOrder < 0
        ? {
            winnerMuscleId: left.muscleId,
            loserMuscleId: right.muscleId,
            decisionPath: "near_margin_confidence_override",
            reason: "Confidence refined a near-margin severity comparison.",
          }
        : {
            winnerMuscleId: right.muscleId,
            loserMuscleId: left.muscleId,
            decisionPath: "near_margin_confidence_override",
            reason: "Confidence refined a near-margin severity comparison.",
          };

      return {
        sortOrder: confidenceOrder,
        trace: buildComparatorTrace(left, right, decision, true, "confidence"),
        decision,
      };
    }
  }

  if (isStabilityOverrideAllowedV2(left, right) && isWeeklyPatternDisplacementCaseV2(left, right)) {
    const stabilityOrder = compareNumbersDescending(
      stabilityRankValueV2(left.stabilityState),
      stabilityRankValueV2(right.stabilityState)
    );

    if (stabilityOrder !== 0) {
      const decision: PriorityComparatorDecisionV2 = stabilityOrder < 0
        ? {
            winnerMuscleId: left.muscleId,
            loserMuscleId: right.muscleId,
            decisionPath: "near_margin_stability_override",
            reason: "Weekly stability refined a near-margin comparison.",
          }
        : {
            winnerMuscleId: right.muscleId,
            loserMuscleId: left.muscleId,
            decisionPath: "near_margin_stability_override",
            reason: "Weekly stability refined a near-margin comparison.",
          };

      return {
        sortOrder: stabilityOrder,
        trace: buildComparatorTrace(left, right, decision, true, "stability"),
        decision,
      };
    }
  }

  if (severityTierOrder !== 0) {
    const decision: PriorityComparatorDecisionV2 = severityTierOrder < 0
      ? {
          winnerMuscleId: left.muscleId,
          loserMuscleId: right.muscleId,
          decisionPath: "severity_tier",
          reason: "Severity tier remained decisive after override checks.",
        }
      : {
          winnerMuscleId: right.muscleId,
          loserMuscleId: left.muscleId,
          decisionPath: "severity_tier",
          reason: "Severity tier remained decisive after override checks.",
        };

    return {
      sortOrder: severityTierOrder,
      trace: buildComparatorTrace(left, right, decision, false),
      decision,
    };
  }

  if (severitySubscoreOrder !== 0) {
    const decision: PriorityComparatorDecisionV2 = severitySubscoreOrder < 0
      ? {
          winnerMuscleId: left.muscleId,
          loserMuscleId: right.muscleId,
          decisionPath: "severity_subscore",
          reason: "Severity subscore resolved an in-tier comparison.",
        }
      : {
          winnerMuscleId: right.muscleId,
          loserMuscleId: left.muscleId,
          decisionPath: "severity_subscore",
          reason: "Severity subscore resolved an in-tier comparison.",
        };

    return {
      sortOrder: severitySubscoreOrder,
      trace: buildComparatorTrace(left, right, decision, false),
      decision,
    };
  }

  const confidenceOrder = compareNumbersDescending(
    confidenceRankValueV2(left.confidenceState),
    confidenceRankValueV2(right.confidenceState)
  );

  if (confidenceOrder !== 0) {
    const decision: PriorityComparatorDecisionV2 = confidenceOrder < 0
      ? {
          winnerMuscleId: left.muscleId,
          loserMuscleId: right.muscleId,
          decisionPath: "confidence",
          reason: "Confidence resolved a close comparison.",
        }
      : {
          winnerMuscleId: right.muscleId,
          loserMuscleId: left.muscleId,
          decisionPath: "confidence",
          reason: "Confidence resolved a close comparison.",
        };

    return {
      sortOrder: confidenceOrder,
      trace: buildComparatorTrace(left, right, decision, false),
      decision,
    };
  }

  const stabilityOrder = compareNumbersDescending(
    stabilityRankValueV2(left.stabilityState),
    stabilityRankValueV2(right.stabilityState)
  );

  if (stabilityOrder !== 0) {
    const decision: PriorityComparatorDecisionV2 = stabilityOrder < 0
      ? {
          winnerMuscleId: left.muscleId,
          loserMuscleId: right.muscleId,
          decisionPath: "stability",
          reason: "Stability resolved a close comparison.",
        }
      : {
          winnerMuscleId: right.muscleId,
          loserMuscleId: left.muscleId,
          decisionPath: "stability",
          reason: "Stability resolved a close comparison.",
        };

    return {
      sortOrder: stabilityOrder,
      trace: buildComparatorTrace(left, right, decision, false),
      decision,
    };
  }

  const fallbackOrder = left.deterministicFallbackKey.localeCompare(right.deterministicFallbackKey);
  const normalizedFallbackOrder = fallbackOrder < 0 ? -1 : fallbackOrder > 0 ? 1 : 0;
  const decision: PriorityComparatorDecisionV2 = normalizedFallbackOrder <= 0
    ? {
        winnerMuscleId: left.muscleId,
        loserMuscleId: right.muscleId,
        decisionPath: "deterministic_fallback",
        reason: "Deterministic fallback preserved stable ordering.",
      }
    : {
        winnerMuscleId: right.muscleId,
        loserMuscleId: left.muscleId,
        decisionPath: "deterministic_fallback",
        reason: "Deterministic fallback preserved stable ordering.",
      };

  return {
    sortOrder: normalizedFallbackOrder,
    trace: buildComparatorTrace(left, right, decision, false),
    decision,
  };
}
