import { stimulusDriverRulesV2 } from "./stimulusDriverRulesV2";
import type { StimulusDriverRuleV2 } from "./stimulusDriverRulesV2";
import { stimulusRedistributionRulesV2 } from "./stimulusRedistributionRulesV2";
import type { RedistributionRuleV2 } from "./stimulusRedistributionRulesV2";
import {
  getExerciseNormalizationMetaV2,
  type LoadingTypeV2,
} from "./exerciseDatabase";
import {
  computeNormalizedSetStimulusV2,
  stimulusNormalizationConfigV2,
} from "./stimulusNormalizationConfigV2";

/**
 * Forge Stimulus Engine V2.
 *
 * This engine computes analysis-layer stimulus from logged exercise work.
 * Driver rules define direct analysis outputs, while redistribution rules
 * convert helper or neutral buckets into final analysis outputs.
 *
 * Canonical muscle rollup is not the primary output of this engine.
 */

export type StimulusAnalysisTotalsV2 = Record<string, number>;

export type StimulusFamilyOutputRowV2 = {
  analysisKey: string;
  value: number;
};

export type StimulusFamilyOutputV2 = {
  familyKey: string;
  rows: StimulusFamilyOutputRowV2[];
};

export type StimulusConfidenceSummaryV2 = {
  high: number;
  medium: number;
  low: number;
};

export type StimulusEngineResultV2 = {
  analysisTotals: StimulusAnalysisTotalsV2;
  familyOutputs: StimulusFamilyOutputV2[];
  confidenceSummary: StimulusConfidenceSummaryV2;
};

/**
 * Bodyweight may be used selectively for bodyweight exercise context.
 * Height is stored for analytics and future use only.
 * Height must NOT affect normalized stimulus in V2.
 */
export type BodyweightContextV2 = {
  userBodyweightKg?: number | null;
  userHeightCm?: number | null;
  externalLoadKg?: number | null;
  assistanceLoadKg?: number | null;
};

export type LoggedSetV2 = {
  reps: number;
  load?: number | null;
  rir?: number | null;
  bodyweightContext?: BodyweightContextV2 | null;
};

export type LoggedStimulusSetV2 = LoggedSetV2 & {
  exerciseId: string;
};

export type ComputeStimulusInputV2 = {
  sets: LoggedStimulusSetV2[];
};

const driverRuleByExerciseId = new Map<string, StimulusDriverRuleV2>();
for (const rule of stimulusDriverRulesV2) {
  for (const exerciseId of rule.exerciseIds) {
    if (!driverRuleByExerciseId.has(exerciseId)) {
      driverRuleByExerciseId.set(exerciseId, rule);
    }
  }
}

const redistributionRuleByInputBucket = new Map<string, RedistributionRuleV2>();
for (const rule of stimulusRedistributionRulesV2) {
  if (!redistributionRuleByInputBucket.has(rule.inputBucketKey)) {
    redistributionRuleByInputBucket.set(rule.inputBucketKey, rule);
  }
}

// Visible family outputs are anatomy-facing rows used by UI and validation.
// They can include direct family outputs from driver rules as well as outputs
// reached through redistribution, but they must exclude convenience/helper buckets.
const visibleFamilyOutputKeysByFamilyKey = new Map<string, string[]>([
  ["family_biceps", ["biceps_long_head", "biceps_short_head", "brachialis"]],
  ["family_triceps", ["triceps_long_head", "triceps_lateral_head", "triceps_medial_head"]],
  ["family_quads", ["rectus_femoris", "vastus_lateralis", "vastus_medialis"]],
  ["family_hamstrings", ["medial_hamstring", "lateral_hamstring"]],
  ["family_mid_lower_chest", ["mid_chest", "lower_chest"]],
  ["family_mid_lower_traps", ["middle_traps", "lower_traps"]],
]);

export function levelWeight(level: "primary" | "secondary" | "tertiary" | "stabilizer"): number {
  switch (level) {
    case "primary":
      return 1.0;
    case "secondary":
      return 0.6;
    case "tertiary":
      return 0.3;
    case "stabilizer":
      return 0.1;
    default:
      return 0;
  }
}

export function createEmptyConfidenceSummary(): StimulusConfidenceSummaryV2 {
  return {
    high: 0,
    medium: 0,
    low: 0,
  };
}

export function normalizeNumber(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }

  return value;
}

export function resolveEffectiveLoadV2(set: LoggedSetV2, loadingType: LoadingTypeV2): number {
  const explicitLoad = normalizeNumber(set.load);
  const bodyweightContext = set.bodyweightContext ?? null;
  const userBodyweightKg = normalizeNumber(bodyweightContext?.userBodyweightKg);
  const externalLoadKg = normalizeNumber(bodyweightContext?.externalLoadKg);
  const assistanceLoadKg = normalizeNumber(bodyweightContext?.assistanceLoadKg);

  switch (loadingType) {
    case "bodyweight":
      if (userBodyweightKg > 0) {
        return userBodyweightKg;
      }
      return Math.max(explicitLoad, 1);
    case "weighted_bodyweight":
      if (userBodyweightKg > 0 && externalLoadKg > 0) {
        return userBodyweightKg + externalLoadKg;
      }
      if (userBodyweightKg > 0 && explicitLoad > 0) {
        return userBodyweightKg + explicitLoad;
      }
      if (userBodyweightKg > 0) {
        return userBodyweightKg;
      }
      return Math.max(explicitLoad, 1);
    case "assisted_bodyweight":
      if (userBodyweightKg > 0 && assistanceLoadKg > 0) {
        return Math.max(userBodyweightKg - assistanceLoadKg, 1);
      }
      if (userBodyweightKg > 0 && explicitLoad > 0) {
        return Math.max(userBodyweightKg - explicitLoad, 1);
      }
      if (userBodyweightKg > 0) {
        return userBodyweightKg;
      }
      return 1;
    case "external":
    default:
      return Math.max(explicitLoad, 1);
  }
}

export function addToTotal(record: Record<string, number>, key: string, value: number): void {
  record[key] = normalizeNumber(record[key]) + normalizeNumber(value);
}

export function sortFamilyRowsDescending(rows: StimulusFamilyOutputRowV2[]): StimulusFamilyOutputRowV2[] {
  return [...rows].sort((a, b) => b.value - a.value);
}

export function pruneZeroValueTotals(totals: StimulusAnalysisTotalsV2): StimulusAnalysisTotalsV2 {
  return Object.fromEntries(
    Object.entries(totals).filter(([, value]) => normalizeNumber(value) > 0)
  );
}

export function getDriverRuleForExerciseId(exerciseId: string): StimulusDriverRuleV2 | undefined {
  return driverRuleByExerciseId.get(exerciseId);
}

export function getRedistributionRuleForInputBucket(inputBucketKey: string): RedistributionRuleV2 | undefined {
  return redistributionRuleByInputBucket.get(inputBucketKey);
}

export function computeStimulusEngineV2(input: ComputeStimulusInputV2): StimulusEngineResultV2 {
  void stimulusDriverRulesV2;

  const analysisTotals: StimulusAnalysisTotalsV2 = {};
  const confidenceSummary = createEmptyConfidenceSummary();

  for (const set of input.sets) {
    const rule = getDriverRuleForExerciseId(set.exerciseId);
    if (!rule) {
      continue;
    }

    const normalizationMeta = getExerciseNormalizationMetaV2(set.exerciseId);
    const normalizedSet = computeNormalizedSetStimulusV2(
      set,
      normalizationMeta,
      stimulusNormalizationConfigV2
    );
    const reps = normalizeNumber(set.reps);
    const effectiveLoad = resolveEffectiveLoadV2(set, normalizationMeta.loadingType);
    const baseStimulus = reps * effectiveLoad * normalizedSet.normalizedStimulus;

    if (baseStimulus <= 0) {
      continue;
    }

    for (const output of rule.outputs) {
      addToTotal(analysisTotals, output.analysisKey, baseStimulus * levelWeight(output.level));
    }

    confidenceSummary[rule.confidence] += baseStimulus;
  }

  const redistributedTotals: StimulusAnalysisTotalsV2 = { ...analysisTotals };

  // V2 base rule: redistribute helper and neutral buckets into final analysis outputs.
  // This keeps the engine output anatomy-facing, even though the upstream driver layer
  // still uses some convenience buckets as intermediate inputs.
  for (const rule of stimulusRedistributionRulesV2) {
    const inputBucketValue = normalizeNumber(redistributedTotals[rule.inputBucketKey]);
    if (inputBucketValue <= 0) {
      continue;
    }

    // Clear the helper/input bucket before redistribution so passthrough-style
    // family rules (for example mid_chest -> mid_chest) preserve the output
    // instead of adding to self and then zeroing the final value away.
    redistributedTotals[rule.inputBucketKey] = 0;

    for (const outputKey of rule.finalOutputAnalysisKeys) {
      const weight = normalizeNumber(rule.weights[outputKey]);
      if (weight <= 0) {
        continue;
      }

      addToTotal(redistributedTotals, outputKey, inputBucketValue * weight);
    }
  }

  const familyOutputs: StimulusFamilyOutputV2[] = [];

  for (const [familyKey, visibleOutputKeys] of visibleFamilyOutputKeysByFamilyKey.entries()) {
    const rows = sortFamilyRowsDescending(
      visibleOutputKeys
        .map((analysisKey) => ({
          analysisKey,
          value: normalizeNumber(redistributedTotals[analysisKey]),
        }))
        .filter((row) => row.value > 0)
    );

    familyOutputs.push({
      familyKey,
      rows,
    });
  }

  const finalAnalysisTotals = pruneZeroValueTotals(redistributedTotals);

  return {
    analysisTotals: finalAnalysisTotals,
    familyOutputs,
    confidenceSummary,
  };
}
