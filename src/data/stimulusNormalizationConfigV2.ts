/**
 * Forge Stimulus Normalization V2 baseline config.
 *
 * Driver rules handle biomechanics and regional contribution.
 * Normalization handles set-level comparability only.
 *
 * Effort is the primary signal.
 * Rep range is a moderate modifier.
 * Bodyweight adjustments must stay limited and explicit.
 *
 * This config is intentionally simple to avoid fake precision.
 */

import type { LoggedSetV2 } from "./stimulusEngineV2";
import type { ExerciseNormalizationMetaV2, LoadingTypeV2 } from "./exerciseDatabase";

export type RepRangeBracketV2 = {
  minReps: number;
  maxReps: number;
  factor: number;
};

export type StimulusNormalizationConfigV2 = {
  hardSetBase: number;

  effort: {
    rirMode: "explicit_only" | "explicit_or_default";
    defaultRir: number;
    factorsByRir: Record<string, number>;
    clampMinRir: number;
    clampMaxRir: number;
  };

  repRange: {
    mode: "bracketed";
    brackets: RepRangeBracketV2[];
    outOfRangePolicy: "clamp_to_nearest";
  };

  bodyweight: {
    enabled: boolean;
    mode: "explicit_by_loading_type";
    weightedScaling: {
      enabled: boolean;
      maxBonus: number;
    };
    assistedScaling: {
      enabled: boolean;
      maxPenalty: number;
    };
  };

  fallbacks: {
    missingLoadBehavior: "ignore";
    missingBodyweightBehavior: "ignore";
    missingRirBehavior: "use_default_rir";
  };

  debug?: {
    includeBreakdown: boolean;
  };
};

// Warnings stay intentionally bounded so QA can reason about normalization
// outcomes without a large, unstable debug surface.
export type NormalizedSetStimulusWarningV2 =
  | "InvalidReps"
  | "MissingRIR"
  | "UsedDefaultRIR"
  | "MissingBodyweightContext"
  | "IgnoredLoad"
  | "ClampedRIR"
  | "ClampedRepRange";

export type NormalizedSetStimulusResultV2 = {
  normalizedStimulus: number;

  // Components are separated so QA and tuning can inspect the final normalized
  // value by factor without exposing wider engine internals or UI-specific fields.
  components: {
    hardSetBase: number;
    effortFactor: number;
    repRangeFactor: number;
    bodyweightFactor: number;
  };

  // Resolved inputs are limited to the values that matter for normalization QA:
  // the sanitized reps, the actual RIR used after fallback/clamp, and loading type.
  // The contract stays compact on purpose.
  resolvedInputs: {
    reps: number;
    rirUsed: number | null;
    loadingType: LoadingTypeV2;
  };

  // Warnings are first-class so missing or adjusted inputs are visible instead
  // of being hidden inside implementation details.
  warnings: NormalizedSetStimulusWarningV2[];
};

export const stimulusNormalizationConfigV2: StimulusNormalizationConfigV2 = {
  hardSetBase: 1,

  // Effort is primary because proximity to failure is the strongest set-quality
  // signal in the V2 model. Discrete RIR tiers stay readable and tunable without
  // implying precision that the logged data cannot support.
  effort: {
    rirMode: "explicit_or_default",
    // Missing RIR falls back conservatively rather than assuming near-failure work.
    defaultRir: 3,
    factorsByRir: {
      "0": 1,
      "1": 0.97,
      "2": 0.92,
      "3": 0.82,
      "4": 0.68,
      "5": 0.5,
    },
    clampMinRir: 0,
    // High-RIR work is increasingly discounted, and very high values are clamped
    // to keep the model simple rather than over-resolving low-quality effort.
    clampMaxRir: 5,
  },

  // Rep range is a moderate modifier rather than a dominant one. Bracketed
  // ranges are easier to explain and tune than precise curves, and they keep
  // the model aligned with the idea that hypertrophy can occur across a broad range.
  repRange: {
    mode: "bracketed",
    brackets: [
      // Low and high extremes are only modestly discounted.
      { minReps: 1, maxReps: 5, factor: 0.92 },
      { minReps: 6, maxReps: 10, factor: 0.98 },
      // The middle range is treated as the neutral baseline in V2.
      { minReps: 11, maxReps: 20, factor: 1.0 },
      { minReps: 21, maxReps: 30, factor: 0.94 },
    ],
    outOfRangePolicy: "clamp_to_nearest",
  },

  // Bodyweight handling is explicit by loadingType only. It is contextual, not
  // a global stimulus multiplier, and height is excluded from stimulus scaling
  // in V2. Missing bodyweight context should resolve conservatively to neutral behavior.
  bodyweight: {
    enabled: true,
    mode: "explicit_by_loading_type",
    weightedScaling: {
      enabled: true,
      // Weighted bodyweight movements may receive a small bonus when explicit
      // bodyweight and added-load context are present, but the adjustment must stay limited.
      maxBonus: 0.06,
    },
    assistedScaling: {
      enabled: true,
      // Assisted bodyweight movements may receive a modest penalty when explicit
      // bodyweight and assistance context are present, but the adjustment must stay limited.
      maxPenalty: 0.1,
    },
  },

  fallbacks: {
    missingLoadBehavior: "ignore",
    missingBodyweightBehavior: "ignore",
    missingRirBehavior: "use_default_rir",
  },

  debug: {
    includeBreakdown: true,
  },
};

export function computeNormalizedSetStimulusV2(
  set: LoggedSetV2,
  exerciseMeta: ExerciseNormalizationMetaV2,
  config: StimulusNormalizationConfigV2
): NormalizedSetStimulusResultV2 {
  // The flow is ordered so we resolve and sanitize inputs before looking up
  // factors, then emit warnings exactly where data is missing or adjusted.
  const warnings: NormalizedSetStimulusWarningV2[] = [];

  const hardSetBase = config.hardSetBase;
  const loadingType = exerciseMeta.loadingType;

  // Invalid inputs are handled conservatively: bad reps return zero stimulus
  // rather than guessing a usable set quality signal.
  const reps = Number.isFinite(set.reps) ? set.reps : 0;
  if (!(reps > 0)) {
    warnings.push("InvalidReps");
    return {
      normalizedStimulus: 0,
      components: {
        hardSetBase,
        effortFactor: 0,
        repRangeFactor: 0,
        bodyweightFactor: 0,
      },
      resolvedInputs: {
        reps,
        rirUsed: null,
        loadingType,
      },
      warnings,
    };
  }

  let rirUsed: number | null = null;
  const rawRir = typeof set.rir === "number" && Number.isFinite(set.rir) ? set.rir : null;

  if (rawRir == null) {
    warnings.push("MissingRIR");

    if (
      config.effort.rirMode === "explicit_or_default" &&
      config.fallbacks.missingRirBehavior === "use_default_rir"
    ) {
      rirUsed = config.effort.defaultRir;
      warnings.push("UsedDefaultRIR");
    }
  } else {
    rirUsed = rawRir;
  }

  if (rirUsed != null) {
    const clampedRir = Math.min(config.effort.clampMaxRir, Math.max(config.effort.clampMinRir, rirUsed));
    if (clampedRir !== rirUsed) {
      warnings.push("ClampedRIR");
    }
    rirUsed = clampedRir;
  }

  const effortFactor =
    rirUsed == null
      ? 1
      : config.effort.factorsByRir[String(rirUsed)] ?? config.effort.factorsByRir[String(config.effort.defaultRir)] ?? 1;

  let repRangeFactor = 1;
  const brackets = config.repRange.brackets;
  const matchingBracket = brackets.find((bracket) => reps >= bracket.minReps && reps <= bracket.maxReps);

  if (matchingBracket) {
    repRangeFactor = matchingBracket.factor;
  } else if (brackets.length > 0) {
    warnings.push("ClampedRepRange");
    const firstBracket = brackets[0];
    const lastBracket = brackets[brackets.length - 1];
    repRangeFactor = reps < firstBracket.minReps ? firstBracket.factor : lastBracket.factor;
  }

  // Bodyweight defaults to neutral in several cases because it is contextual,
  // not a global multiplier. Only explicit loadingType + explicit context can
  // produce a limited adjustment in V2.
  let bodyweightFactor = 1;
  const bodyweightContext = set.bodyweightContext ?? null;

  if (loadingType === "bodyweight") {
    if (set.load != null) {
      warnings.push("IgnoredLoad");
    }
  } else if (loadingType === "weighted_bodyweight") {
    if (set.load != null) {
      warnings.push("IgnoredLoad");
    }

    if (
      config.bodyweight.enabled &&
      config.bodyweight.weightedScaling.enabled &&
      bodyweightContext?.userBodyweightKg != null &&
      bodyweightContext?.externalLoadKg != null
    ) {
      bodyweightFactor = 1 + config.bodyweight.weightedScaling.maxBonus;
    } else {
      warnings.push("MissingBodyweightContext");
    }
  } else if (loadingType === "assisted_bodyweight") {
    if (set.load != null) {
      warnings.push("IgnoredLoad");
    }

    if (
      config.bodyweight.enabled &&
      config.bodyweight.assistedScaling.enabled &&
      bodyweightContext?.userBodyweightKg != null &&
      bodyweightContext?.assistanceLoadKg != null
    ) {
      bodyweightFactor = 1 - config.bodyweight.assistedScaling.maxPenalty;
    } else {
      warnings.push("MissingBodyweightContext");
    }
  }

  const normalizedStimulus = hardSetBase * effortFactor * repRangeFactor * bodyweightFactor;

  return {
    normalizedStimulus,
    components: {
      hardSetBase,
      effortFactor,
      repRangeFactor,
      bodyweightFactor,
    },
    resolvedInputs: {
      reps,
      rirUsed,
      loadingType,
    },
    warnings,
  };
}
