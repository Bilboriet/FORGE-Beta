import { computeStimulusEngineV2, type StimulusEngineResultV2 } from "./stimulusEngineV2";
import {
  stimulusValidationCasesV2,
  type StimulusValidationCaseV2,
  type StimulusValidationExpectationsV2,
} from "./stimulusValidationCasesV2";

export type StimulusValidationTopRowV2 = {
  analysisKey: string;
  value: number;
};

export type StimulusValidationFamilyTotalRowV2 = {
  familyKey: string;
  value: number;
};

export type StimulusValidationWarningV2 = {
  id: string;
  kind:
    | "MissingExpectedMuscle"
    | "ExpectedButNotTopDominant"
    | "HelperBucketLeak"
    | "EmptyFamilyOutput"
    | "SuspiciousDistribution";
  severity: "warning";
  message: string;
};

export type StimulusValidationReportV2 = {
  testCase: StimulusValidationCaseV2;
  result: StimulusEngineResultV2;
  topAnalysisTotals: StimulusValidationTopRowV2[];
  familyTotals: StimulusValidationFamilyTotalRowV2[];
  warnings: StimulusValidationWarningV2[];
};

const HELPER_BUCKET_KEYS = new Set([
  "biceps_neutral",
  "triceps_neutral",
  "triceps_lateral_medial",
  "quads_neutral",
  "hamstrings_neutral",
]);

const DOMINANT_TOP_COUNT = 5;
const MIN_PRESENT_VALUE = 0.0001;
const MIN_MEANINGFUL_CASE_SHARE = 0.02;
const MIN_MEANINGFUL_MAX_SHARE = 0.08;
const MIN_MEANINGFUL_FAMILY_SHARE = 0.12;

function toSortedTopAnalysisTotals(result: StimulusEngineResultV2): StimulusValidationTopRowV2[] {
  return Object.entries(result.analysisTotals)
    .map(([analysisKey, value]) => ({ analysisKey, value }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.analysisKey.localeCompare(b.analysisKey));
}

function toSortedFamilyTotals(result: StimulusEngineResultV2): StimulusValidationFamilyTotalRowV2[] {
  return result.familyOutputs
    .map((familyOutput) => ({
      familyKey: familyOutput.familyKey,
      value: familyOutput.rows.reduce((sum, row) => sum + row.value, 0),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.familyKey.localeCompare(b.familyKey));
}

function buildWarnings(
  expectations: StimulusValidationExpectationsV2,
  result: StimulusEngineResultV2,
  topAnalysisTotals: StimulusValidationTopRowV2[],
  familyTotals: StimulusValidationFamilyTotalRowV2[]
): StimulusValidationWarningV2[] {
  const warnings: StimulusValidationWarningV2[] = [];
  const topDominantKeys = new Set(topAnalysisTotals.slice(0, DOMINANT_TOP_COUNT).map((row) => row.analysisKey));
  const topDominantFamilyKeys = new Set(familyTotals.slice(0, 3).map((row) => row.familyKey));
  const totalStimulus = topAnalysisTotals.reduce((sum, row) => sum + row.value, 0);
  const maxStimulus = topAnalysisTotals[0]?.value ?? 0;
  const totalFamilyStimulus = familyTotals.reduce((sum, row) => sum + row.value, 0);
  const maxFamilyStimulus = familyTotals[0]?.value ?? 0;

  for (const analysisKey of expectations.dominantAnalysisKeys) {
    const value = result.analysisTotals[analysisKey] ?? 0;
    if (value <= MIN_PRESENT_VALUE) {
      warnings.push({
        id: `dominant-missing-${analysisKey}`,
        kind: "MissingExpectedMuscle",
        severity: "warning",
        message: `Expected dominant output '${analysisKey}' is missing from final analysis totals.`,
      });
      continue;
    }

    if (topDominantKeys.has(analysisKey)) {
      continue;
    }

    const caseShare = totalStimulus > 0 ? value / totalStimulus : 0;
    const maxShare = maxStimulus > 0 ? value / maxStimulus : 0;
    const matchingFamily = result.familyOutputs.find((familyOutput) =>
      familyOutput.rows.some((row) => row.analysisKey === analysisKey)
    );
    const familyTotal =
      matchingFamily?.rows.reduce((sum, row) => sum + row.value, 0) ?? 0;
    const familyValue =
      matchingFamily?.rows.find((row) => row.analysisKey === analysisKey)?.value ?? 0;
    const familyShare = familyTotal > 0 ? familyValue / familyTotal : 0;

    const isMeaningfulContribution =
      caseShare >= MIN_MEANINGFUL_CASE_SHARE ||
      maxShare >= MIN_MEANINGFUL_MAX_SHARE ||
      familyShare >= MIN_MEANINGFUL_FAMILY_SHARE;

    if (!isMeaningfulContribution) {
      warnings.push({
        id: `dominant-not-top-${analysisKey}`,
        kind: "ExpectedButNotTopDominant",
        severity: "warning",
        message: `Expected output '${analysisKey}' is present but remains low-ranking in this case.`,
      });
    }
  }

  for (const helperBucket of expectations.helperBucketsShouldBeRedistributed ?? []) {
    if ((result.analysisTotals[helperBucket] ?? 0) > 0.0001) {
      warnings.push({
        id: `helper-visible-${helperBucket}`,
        kind: "HelperBucketLeak",
        severity: "warning",
        message: `Helper bucket '${helperBucket}' still has visible final output after redistribution.`,
      });
    }
  }

  for (const familyKey of expectations.expectedFamilyKeys ?? []) {
    const familyOutput = result.familyOutputs.find((output) => output.familyKey === familyKey);
    if (!familyOutput || familyOutput.rows.length === 0) {
      warnings.push({
        id: `family-empty-${familyKey}`,
        kind: "EmptyFamilyOutput",
        severity: "warning",
        message: `Expected family output '${familyKey}' is empty.`,
      });
    }
  }

  for (const familyKey of expectations.expectedDominantFamilies ?? []) {
    const familyValue = familyTotals.find((row) => row.familyKey === familyKey)?.value ?? 0;
    if (familyValue <= MIN_PRESENT_VALUE) {
      warnings.push({
        id: `dominant-family-missing-${familyKey}`,
        kind: "EmptyFamilyOutput",
        severity: "warning",
        message: `Expected dominant family '${familyKey}' is missing or empty.`,
      });
      continue;
    }

    if (topDominantFamilyKeys.has(familyKey)) {
      continue;
    }

    const familyCaseShare = totalFamilyStimulus > 0 ? familyValue / totalFamilyStimulus : 0;
    const familyMaxShare = maxFamilyStimulus > 0 ? familyValue / maxFamilyStimulus : 0;
    const isMeaningfulFamilyContribution =
      familyCaseShare >= MIN_MEANINGFUL_CASE_SHARE || familyMaxShare >= MIN_MEANINGFUL_MAX_SHARE;

    if (!isMeaningfulFamilyContribution) {
      warnings.push({
        id: `dominant-family-not-top-${familyKey}`,
        kind: "ExpectedButNotTopDominant",
        severity: "warning",
        message: `Expected family '${familyKey}' is present but remains low-ranking in this case.`,
      });
    }
  }

  for (const familyOutput of result.familyOutputs) {
    for (const row of familyOutput.rows) {
      if (HELPER_BUCKET_KEYS.has(row.analysisKey)) {
        warnings.push({
          id: `helper-family-row-${familyOutput.familyKey}-${row.analysisKey}`,
          kind: "HelperBucketLeak",
          severity: "warning",
          message: `Helper bucket '${row.analysisKey}' appeared in final family output '${familyOutput.familyKey}'.`,
        });
      }
    }
  }

  return warnings;
}

export function runStimulusValidationCaseV2(testCase: StimulusValidationCaseV2): StimulusValidationReportV2 {
  const result = computeStimulusEngineV2({ sets: testCase.sets });
  const topAnalysisTotals = toSortedTopAnalysisTotals(result);
  const familyTotals = toSortedFamilyTotals(result);
  const warnings = buildWarnings(testCase.expectations, result, topAnalysisTotals, familyTotals);

  return {
    testCase,
    result,
    topAnalysisTotals,
    familyTotals,
    warnings,
  };
}

export function runStimulusValidationHarnessV2(): StimulusValidationReportV2[] {
  return stimulusValidationCasesV2.map(runStimulusValidationCaseV2);
}
