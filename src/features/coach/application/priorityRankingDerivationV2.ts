import type {
  PriorityConfidenceDerivationResultV2,
  PriorityEligibilityDerivationResultV2,
  PriorityRankingDerivationInputV2,
  PrioritySeverityEdgeStateV2,
  PrioritySeverityDerivationResultV2,
  PriorityStabilityDerivationResultV2,
} from "./priorityRankingTypesV2";

function derivePrioritySeverityEdgeStateV2(subscore: number): PrioritySeverityEdgeStateV2 {
  // Structural posture helper only.
  // These placeholder cut points are for code-prep shape, not final tuned constants.
  if (subscore <= 0.33) {
    return "low_edge";
  }

  if (subscore >= 0.67) {
    return "high_edge";
  }

  return "mid_band";
}

/**
 * Derives whether a signal should enter the priority board and how strongly.
 * This is the first non-placeholder logic pass.
 * The logic remains intentionally conservative and provisional, but it now
 * applies real state selection instead of relying on a generic fallback.
 */
export function derivePriorityEligibilityStateV2(
  input: PriorityRankingDerivationInputV2
): PriorityEligibilityDerivationResultV2 {
  const { rawDeviationContext, actionLikelihood, directVsIndirectProfile, timeWindowMode } = input;
  const { relativeDeviationBand, isNearBoundary } = rawDeviationContext;
  const { dominance, classNoiseLevel, intentClarity } = directVsIndirectProfile;

  if (relativeDeviationBand === "boundary_adjacent" || (isNearBoundary && actionLikelihood === "low")) {
    return {
      state: "suppressed",
      reason: "Boundary-adjacent, low-action signals are suppressed in the first real eligibility pass.",
      notes: ["Provisional rule: threshold-adjacent maintain-like signals should not enter ranking strongly."],
    };
  }

  if (
    timeWindowMode === "weekly" &&
    input.patternRepeatState === "isolated" &&
    input.patternDistribution === "clustered" &&
    actionLikelihood !== "high"
  ) {
    return {
      state: "suppressed",
      reason: "Weekly isolated clustered patterns stay suppressed unless action value is clearly high.",
      notes: ["Provisional weekly spike caution to avoid unstable ranking noise."],
    };
  }

  if (relativeDeviationBand === "mild") {
    if (actionLikelihood === "high" && dominance === "direct" && intentClarity === "clear") {
      return {
        state: "weak",
        reason: "Mild direct high-action signals remain weak in this conservative first-pass eligibility model.",
        notes: [
          "Provisional restriction: mild signals should not compete with moderate or strong issues yet.",
          "This path may be revisited only after later severity and comparator refinement.",
        ],
      };
    }

    return {
      state: "weak",
      reason: "Mild or uncertain signals enter ranking weakly in the first real eligibility pass.",
      notes: ["Provisional rule: mild issues should stay below clearer actionable problems."],
    };
  }

  if (relativeDeviationBand === "moderate") {
    if (actionLikelihood === "low") {
      return {
        state: "weak",
        reason: "Moderate deviation with low action value remains weak.",
        notes: ["Provisional rule: deviation alone is not enough without action clarity."],
      };
    }

    if (dominance === "indirect" && classNoiseLevel === "high") {
      return {
        state: "weak",
        reason: "Indirect high-noise moderate signals are kept weak until confidence is stronger.",
        notes: ["Provisional rule: noisy indirect cases are harder to elevate."],
      };
    }

    return {
      state: "normal",
      reason: "Moderate deviations with usable action clarity enter ranking normally.",
      notes: ["First real logic pass: moderate actionable issues are priority-eligible."],
    };
  }

  if (relativeDeviationBand === "strong") {
    if (actionLikelihood === "high" && dominance === "direct" && intentClarity === "clear") {
      return {
        state: "strong",
        reason: "Strong, direct, clear, actionable signals enter ranking strongly.",
        notes: ["First real logic pass: high-confidence strong deviations should surface at the top tier."],
      };
    }

    if (dominance === "indirect" && classNoiseLevel === "high") {
      return {
        state: "normal",
        reason: "Strong but noisy indirect signals are temporarily capped at normal during this provisional eligibility pass.",
        notes: [
          "Temporary cap: this branch stays visible without allowing noisy indirect cases to reach strong eligibility.",
          "Future confidence and comparator refinement may push this lower if guardrail review supports it.",
        ],
      };
    }

    return {
      state: "normal",
      reason: "Strong deviations enter ranking normally when action value is meaningful but not fully clear.",
      notes: ["Provisional rule: strong issues surface even when not yet high-confidence strong."],
    };
  }

  return {
    state: "weak",
    reason: "Fallback weak state remains as a provisional safety net for unclassified inputs.",
    notes: [
      "TODO: tighten any remaining unclassified eligibility paths.",
      "This fallback should shrink further as non-placeholder logic expands.",
    ],
  };
}

/**
 * Derives class-relative severity tier and within-tier ordering subscore.
 * Severity remains intentionally simple in this pass.
 * The goal here is to preserve stable class-relative severity hierarchy while
 * eligibility, confidence, and stability move beyond scaffold defaults first.
 */
export function derivePrioritySeverityV2(
  input: PriorityRankingDerivationInputV2
): PrioritySeverityDerivationResultV2 {
  const { relativeDeviationBand, relativeDeviationSubscore } = input.rawDeviationContext;
  const edgeState = derivePrioritySeverityEdgeStateV2(relativeDeviationSubscore);

  if (relativeDeviationBand === "strong") {
    return {
      tier: "strong",
      subscore: relativeDeviationSubscore,
      edgeState,
      reason: "Severity derives from the pre-ranking class-relative deviation band, with edge posture for near-margin handling.",
      notes: ["TODO: replace with tuned class-relative severity derivation."],
    };
  }

  if (relativeDeviationBand === "moderate") {
    return {
      tier: "moderate",
      subscore: relativeDeviationSubscore,
      edgeState,
      reason: "Severity derives from the pre-ranking class-relative deviation band, with edge posture for near-margin handling.",
      notes: ["TODO: keep subscore within-tier only."],
    };
  }

  return {
    tier: "mild",
    subscore: relativeDeviationSubscore,
    edgeState,
    reason: "Severity derives from the pre-ranking class-relative deviation band, with provisional mild fallback and visible edge posture.",
    notes: [
      "TODO: tighten mild vs boundary-adjacent handling.",
      "TODO: replace default mild fallback before production ranking logic.",
    ],
  };
}

/**
 * Derives interpretive confidence from directness, intent clarity, and class noise.
 * This is the first real confidence pass.
 * It remains provisional, but now applies explicit class-aware caution for
 * indirect-heavy and noisy interpretation patterns.
 */
export function derivePriorityConfidenceStateV2(
  input: PriorityRankingDerivationInputV2
): PriorityConfidenceDerivationResultV2 {
  const { dominance, intentClarity, classNoiseLevel } = input.directVsIndirectProfile;
  const { classId } = input;

  if (dominance === "direct" && intentClarity === "clear" && classNoiseLevel === "low") {
    return {
      state: "high",
      reason: "Direct-dominant, clear-intent, low-noise signals receive high confidence.",
      notes: ["First real logic pass: high confidence requires clean direct evidence."],
    };
  }

  if (classId === "D" && (dominance !== "direct" || intentClarity !== "clear")) {
    return {
      state: "low",
      reason: "Class D signals remain low confidence unless evidence is clearly direct and unambiguous.",
      notes: ["Provisional safeguard for noisy support/stabilizer interpretation."],
    };
  }

  if (classId === "B" && dominance === "indirect") {
    return {
      state: "low",
      reason: "Class B indirect-heavy signals remain low confidence in the first real pass.",
      notes: ["Provisional safeguard against compound-synergist inflation."],
    };
  }

  if (dominance === "indirect" || intentClarity === "ambiguous" || classNoiseLevel === "high") {
    return {
      state: "low",
      reason: "Indirect, ambiguous, or high-noise signals receive low confidence.",
      notes: ["First real logic pass: low-confidence conditions are explicitly recognized."],
    };
  }

  if (dominance === "mixed" || intentClarity === "mixed" || classNoiseLevel === "medium") {
    return {
      state: "medium",
      reason: "Mixed-evidence signals receive medium confidence.",
      notes: ["First real logic pass: mixed direct/indirect evidence stays interpretable but not fully trusted."],
    };
  }

  return {
    state: "medium",
    reason: "Residual unclassified confidence cases default conservatively to medium in this provisional pass.",
    notes: [
      "High confidence must be earned through explicit direct, clear, low-noise evidence rather than fallback.",
      "This remains provisional and subject to later guardrail-led refinement.",
    ],
  };
}

/**
 * Derives time-window robustness for the signal.
 * This is the first real stability pass.
 * Weekly mode is intentionally more discriminating than session mode, while
 * remaining simple and provisional.
 */
export function derivePriorityStabilityStateV2(
  input: PriorityRankingDerivationInputV2
): PriorityStabilityDerivationResultV2 {
  const { timeWindowMode, patternDistribution, patternRepeatState, classId } = input;

  if (timeWindowMode === "session") {
    if (patternDistribution === "distributed" || patternRepeatState === "repeated") {
      return {
        state: "stable",
        reason: "Session-mode repeated or distributed evidence is treated as stable.",
        notes: ["First real logic pass: session mode uses lighter-touch stability handling."],
      };
    }

    return {
      state: "mixed",
      reason: "Session-mode clustered or partial evidence is treated as mixed rather than unstable.",
      notes: ["Provisional rule: session mode remains less punitive than weekly mode."],
    };
  }

  if (patternRepeatState === "isolated" && patternDistribution === "clustered") {
    return {
      state: "unstable",
      reason: "Weekly isolated clustered patterns are treated as unstable.",
      notes: [
        "First real logic pass: weekly spike-dominant patterns should not rank as robust.",
        classId === "E" ? "Class E weekly caution applies here." : "Weekly caution applies here.",
      ],
    };
  }

  if (patternRepeatState === "repeated" && patternDistribution === "distributed") {
    return {
      state: "stable",
      reason: "Repeated distributed weekly patterns are treated as stable.",
      notes: ["First real logic pass: broad repeated patterns are considered robust."],
    };
  }

  if (classId === "E" && (patternRepeatState === "partial" || patternDistribution === "mixed")) {
    return {
      state: "mixed",
      reason: "Class E weekly patterns with partial or mixed distribution stay mixed under extra caution.",
      notes: ["Provisional weekly lower-body caution without full tuning."],
    };
  }

  return {
    state: "mixed",
    reason: "Weekly mixed-pattern evidence defaults to mixed stability in the first real pass.",
    notes: [
      "TODO: implement fuller stability derivation once weekly sensitivity is reviewed.",
      "This remains provisional and guardrail-led.",
    ],
  };
}
