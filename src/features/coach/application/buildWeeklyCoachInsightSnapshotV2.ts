import type { WorkoutSession } from "../../../types";
import type { BuildWeeklyCoachInsightSnapshotInputV2 } from "./coachInsightInputTypesV2";
import type { CoachInsightSnapshotV2, CoachPriorityCardV2 } from "./coachInsightTypesV2";
import { comparePriorityRankingRecordsWithDecisionV2 } from "./priorityRankingComparatorV2";
import {
  derivePriorityConfidenceStateV2,
  derivePriorityEligibilityStateV2,
  derivePrioritySeverityV2,
  derivePriorityStabilityStateV2,
} from "./priorityRankingDerivationV2";
import { buildPriorityRankingRecordV2 } from "./priorityRankingRecordBuilderV2";
import {
  appendComparatorDecisionToTraceV2,
  buildPriorityRankingTraceV2,
  setLastPriorityRankingTraceSnapshotV2,
} from "./priorityRankingTraceV2";
import type { PriorityRankingDerivationInputV2 } from "./priorityRankingTypesV2";
import {
  buildCoachMuscleComputationsV2,
  buildCoachSummaryV2,
  buildExerciseSuggestionCardsV2,
  buildMuscleDetailsV2,
  computeStimulusSnapshotBaseV2,
  getActionLikelihoodFromSuggestedSetChangeV2,
  getPriorityDirectnessProfileForMuscleV2,
  getPriorityTargetClassIdForMuscleV2,
  getRelativeDeviationBandV2,
  normalizeRelativeDeviationSubscoreV2,
} from "./buildCoachInsightSnapshotV2";

const WEEKLY_MIN_ACTIONABLE_SEVERITY_V2 = 0.1;

type WeeklyAggregationRowV2 = {
  muscleId: string;
  label: string;
  status: "under" | "over";
  averageSeverity: number;
  sessionCount: number;
};

export function buildWeeklyCoachInsightSnapshotV2(
  input: BuildWeeklyCoachInsightSnapshotInputV2
): CoachInsightSnapshotV2 {
  const base = computeStimulusSnapshotBaseV2(input.sessions);
  const computations = buildCoachMuscleComputationsV2(base.analysisTotals, input.targets);
  const weeklyPriorities = buildWeeklyPriorityCardsV2(
    input.sessions,
    input.targets,
    input.exerciseCatalog,
    input.favoriteExerciseIds,
    input.recentlyUsedExerciseIds
  );
  const priorityByMuscleId = new Map(weeklyPriorities.map((card) => [card.muscleId, card] as const));
  const muscles = buildMuscleDetailsV2(
    computations,
    priorityByMuscleId,
    input.exerciseCatalog,
    input.favoriteExerciseIds,
    input.recentlyUsedExerciseIds
  );

  return {
    mode: "weekly",
    generatedAt: input.generatedAt ?? "static",
    totalStimulus: base.totalStimulus,
    heatmap: computations.map((item) => ({
      muscleId: item.muscleId,
      label: item.label,
      status: item.status,
      ratio: item.ratio,
      intensity: item.intensity,
      actualStimulus: item.actualStimulus,
      targetMin: item.targetMin,
      targetMax: item.targetMax,
    })),
    topPriorities: weeklyPriorities,
    muscles,
    summary: buildCoachSummaryV2(computations, weeklyPriorities.length),
  };
}

function buildWeeklyPriorityCardsV2(
  sessions: readonly WorkoutSession[],
  targets: BuildWeeklyCoachInsightSnapshotInputV2["targets"],
  exerciseCatalog: BuildWeeklyCoachInsightSnapshotInputV2["exerciseCatalog"],
  favoriteExerciseIds: readonly string[],
  recentlyUsedExerciseIds: readonly string[]
): CoachPriorityCardV2[] {
  const grouped = new Map<
    string,
    {
      muscleId: string;
      label: string;
      status: "under" | "over";
      totalSeverity: number;
      sessionCount: number;
    }
  >();

  for (const session of sessions) {
    const perSessionBase = computeStimulusSnapshotBaseV2([session]);
    const perSessionMuscles = buildCoachMuscleComputationsV2(perSessionBase.analysisTotals, targets);

    for (const muscle of perSessionMuscles) {
      if (
        muscle.status === "balanced" ||
        muscle.severity < WEEKLY_MIN_ACTIONABLE_SEVERITY_V2
      ) {
        continue;
      }

      const key = `${muscle.muscleId}::${muscle.status}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.totalSeverity += muscle.severity;
        existing.sessionCount += 1;
      } else {
        grouped.set(key, {
          muscleId: muscle.muscleId,
          label: muscle.label,
          status: muscle.status,
          totalSeverity: muscle.severity,
          sessionCount: 1,
        });
      }
    }
  }

  const dominantByMuscleId = new Map<string, WeeklyAggregationRowV2>();

  for (const row of grouped.values()) {
    const candidate: WeeklyAggregationRowV2 = {
      muscleId: row.muscleId,
      label: row.label,
      status: row.status,
      averageSeverity: row.totalSeverity / row.sessionCount,
      sessionCount: row.sessionCount,
    };

    const existing = dominantByMuscleId.get(row.muscleId);
    if (!existing) {
      dominantByMuscleId.set(row.muscleId, candidate);
      continue;
    }

    if (candidate.averageSeverity > existing.averageSeverity) {
      dominantByMuscleId.set(row.muscleId, candidate);
      continue;
    }

    if (candidate.averageSeverity < existing.averageSeverity) {
      continue;
    }

    if (candidate.sessionCount > existing.sessionCount) {
      dominantByMuscleId.set(row.muscleId, candidate);
      continue;
    }

    if (candidate.sessionCount < existing.sessionCount) {
      continue;
    }

    if (candidate.status === "under" && existing.status === "over") {
      dominantByMuscleId.set(row.muscleId, candidate);
    }
  }

  return sortWeeklyAggregationRowsWithRankingV2(
    Array.from(dominantByMuscleId.values()),
    sessions.length
  )
    .map((priority) => {
      const rawDelta = Math.round(priority.averageSeverity * 8);
      const clampedDelta = Math.max(1, Math.min(8, rawDelta));
      const signedDelta = priority.status === "under" ? clampedDelta : -clampedDelta;

      return {
        muscleId: priority.muscleId,
        headline: priority.status === "under" ? `Increase ${priority.label}` : `Reduce ${priority.label}`,
        summary:
          priority.status === "under"
            ? `Add ${clampedDelta} total sets to ${priority.label} across the next training week.`
            : `Reduce ${clampedDelta} total sets from ${priority.label} across the next training week.`,
        direction: signedDelta > 0 ? "increase" : "decrease",
        totalSuggestedSetChange: signedDelta,
        status: priority.status,
        severity: priority.averageSeverity,
        exercises: buildExerciseSuggestionCardsV2(
          priority.muscleId,
          signedDelta,
          exerciseCatalog,
          favoriteExerciseIds,
          recentlyUsedExerciseIds
        ),
      } satisfies CoachPriorityCardV2;
    });
}

function sortWeeklyAggregationRowsWithRankingV2(
  rows: readonly WeeklyAggregationRowV2[],
  totalSessionCount: number
): WeeklyAggregationRowV2[] {
  const traceByMuscleId = new Map<string, ReturnType<typeof buildPriorityRankingTraceV2>>();

  const orderedRows = rows
    .map((row) => {
      const suggestedSetChange = getSuggestedWeeklySetChangeV2(row);
      const input = buildWeeklyPriorityRankingInputV2(row, totalSessionCount, suggestedSetChange);
      const derivation = {
        eligibility: derivePriorityEligibilityStateV2(input),
        severity: derivePrioritySeverityV2(input),
        confidence: derivePriorityConfidenceStateV2(input),
        stability: derivePriorityStabilityStateV2(input),
      };
      const record = buildPriorityRankingRecordV2(input, derivation);

      traceByMuscleId.set(row.muscleId, buildPriorityRankingTraceV2(input, record, derivation));

      return {
        row,
        record,
      };
    })
    .sort((left, right) => {
      const comparison = comparePriorityRankingRecordsWithDecisionV2(left.record, right.record);
      const leftTrace = traceByMuscleId.get(left.row.muscleId);
      const rightTrace = traceByMuscleId.get(right.row.muscleId);

      if (leftTrace) {
        traceByMuscleId.set(
          left.row.muscleId,
          appendComparatorDecisionToTraceV2(leftTrace, comparison.decision, comparison.trace)
        );
      }

      if (rightTrace) {
        traceByMuscleId.set(
          right.row.muscleId,
          appendComparatorDecisionToTraceV2(rightTrace, comparison.decision, comparison.trace)
        );
      }

      return comparison.sortOrder;
    })
    .map((entry) => entry.row);

  setLastPriorityRankingTraceSnapshotV2("weekly", traceByMuscleId);

  return orderedRows;
}

function buildWeeklyPriorityRankingInputV2(
  row: WeeklyAggregationRowV2,
  totalSessionCount: number,
  suggestedSetChange: number
): PriorityRankingDerivationInputV2 {
  return {
    muscleId: row.muscleId,
    classId: getPriorityTargetClassIdForMuscleV2(row.muscleId),
    timeWindowMode: "weekly",
    rawDeviationContext: {
      status: row.status,
      deviationDirection: row.status,
      isNearBoundary: row.averageSeverity < 0.15,
      relativeDeviationBand: getRelativeDeviationBandV2(row.averageSeverity),
      relativeDeviationSubscore: normalizeRelativeDeviationSubscoreV2(row.averageSeverity),
    },
    directVsIndirectProfile: getPriorityDirectnessProfileForMuscleV2(row.muscleId, "weekly"),
    actionLikelihood: getActionLikelihoodFromSuggestedSetChangeV2(suggestedSetChange),
    // Weekly integration currently has count-level pattern evidence only.
    // This stays deliberately structural and conservative until richer weekly
    // pattern data is integrated above the ranking adapter.
    patternDistribution: getWeeklyPatternDistributionV2(row.sessionCount, totalSessionCount),
    patternRepeatState: getWeeklyPatternRepeatStateV2(row.sessionCount, totalSessionCount),
    deterministicFallbackKey: row.muscleId,
  };
}

function getSuggestedWeeklySetChangeV2(row: WeeklyAggregationRowV2): number {
  const rawDelta = Math.round(row.averageSeverity * 8);
  const clampedDelta = Math.max(1, Math.min(8, rawDelta));
  return row.status === "under" ? clampedDelta : -clampedDelta;
}

function getWeeklyPatternDistributionV2(
  sessionCount: number,
  totalSessionCount: number
): PriorityRankingDerivationInputV2["patternDistribution"] {
  // Count-based weekly proxy only.
  // This is deliberately stricter than true temporal spacing logic and should
  // only express weak recurrence posture. Actionable appearance count is not
  // reliable evidence of true spacing quality across the week.
  if (totalSessionCount <= 1) {
    return "clustered";
  }

  if (totalSessionCount >= 4 && sessionCount === totalSessionCount) {
    return "distributed";
  }

  return "mixed";
}

function getWeeklyPatternRepeatStateV2(
  sessionCount: number,
  totalSessionCount: number
): PriorityRankingDerivationInputV2["patternRepeatState"] {
  // Count-based weekly proxy only.
  // Repeated is awarded very narrowly so simple appearance count is not
  // mistaken for a strong temporal robustness signal.
  if (totalSessionCount <= 1) {
    return "isolated";
  }

  if (totalSessionCount >= 4 && sessionCount === totalSessionCount) {
    return "repeated";
  }

  return "partial";
}
