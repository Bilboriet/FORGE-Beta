import { exerciseDatabaseMuscles } from "../../../data/exerciseDatabase";
import { getExerciseNormalizationMetaV2 } from "../../../data/exerciseDatabase";
import { toBodyweightContextFromSessionSnapshotV2 } from "../../../data/bodyMetricsSnapshotV2";
import {
  computeStimulusEngineV2,
  type LoggedStimulusSetV2,
  type StimulusAnalysisTotalsV2,
} from "../../../data/stimulusEngineV2";
import {
  comparePriorityRankingRecordsWithDecisionV2,
} from "./priorityRankingComparatorV2";
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
import type {
  PriorityDirectIndirectProfileV2,
  PriorityRankingDerivationInputV2,
  PriorityTargetClassIdV2,
} from "./priorityRankingTypesV2";
import type { WorkoutSession } from "../../../types";
import type {
  BuildCoachInsightSnapshotInputV2,
  CoachExerciseCatalogEntryV2,
  CoachTargetEntryV2,
} from "./coachInsightInputTypesV2";
import type {
  CoachExerciseSuggestionCardV2,
  CoachInsightSnapshotV2,
  CoachInsightStatusV2,
  CoachMuscleDetailV2,
  CoachPriorityCardV2,
} from "./coachInsightTypesV2";

// Session-only boundary refinement:
// - rankable threshold controls whether a real under/over deviation is allowed
//   to enter the ranking pipeline at all
// - actionable threshold remains the stronger posture boundary used for
//   interpreting how assertive the resulting set-change signal should feel
// This separation lets weak-but-real session deviations produce ranking traces
// without changing the ranking core itself.
const SESSION_MIN_RANKABLE_SEVERITY_V2 = 0.05;
const SESSION_MIN_ACTIONABLE_SEVERITY_V2 = 0.1;

const muscleLabelByIdV2 = new Map(
  exerciseDatabaseMuscles.map((entry) => [entry.id, entry.displayName] as const)
);

const muscleMetaByIdV2 = new Map(
  exerciseDatabaseMuscles.map((entry) => [entry.id, entry] as const)
);

type ComputedStimulusSnapshotBaseV2 = {
  totalStimulus: number;
  analysisTotals: StimulusAnalysisTotalsV2;
};

type CoachMuscleComputationV2 = {
  muscleId: string;
  label: string;
  actualStimulus: number;
  targetMin: number | null;
  targetMax: number | null;
  status: CoachInsightStatusV2;
  ratio: number;
  deviation: number;
  severity: number;
  intensity: number;
};

type SessionPrioritySeedV2 = {
  muscleId: string;
  label: string;
  status: "under" | "over";
  severity: number;
  suggestedSetChange: number;
};

type RankedCatalogOptionV2 = CoachExerciseCatalogEntryV2 & {
  score: number;
};

export function buildCoachInsightSnapshotV2(
  input: BuildCoachInsightSnapshotInputV2
): CoachInsightSnapshotV2 {
  const base = computeStimulusSnapshotBaseV2([input.session]);
  const computations = buildCoachMuscleComputationsV2(base.analysisTotals, input.targets);
  const priorities = buildSessionPrioritySeedsV2(computations);
  const topPriorities = buildPriorityCardsV2(
    priorities,
    input.exerciseCatalog,
    input.favoriteExerciseIds,
    input.recentlyUsedExerciseIds
  );
  const priorityByMuscleId = new Map(topPriorities.map((card) => [card.muscleId, card] as const));

  const muscles = buildMuscleDetailsV2(
    computations,
    priorityByMuscleId,
    input.exerciseCatalog,
    input.favoriteExerciseIds,
    input.recentlyUsedExerciseIds
  );

  return {
    mode: "session",
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
    topPriorities,
    muscles,
    summary: buildCoachSummaryV2(computations, topPriorities.length),
  };
}

export function computeStimulusSnapshotBaseV2(
  sessions: readonly WorkoutSession[]
): ComputedStimulusSnapshotBaseV2 {
  const sets = sessions.flatMap(compileLoggedStimulusSetsV2);
  const result = computeStimulusEngineV2({ sets });
  const totalStimulus = Object.values(result.analysisTotals).reduce((sum, value) => sum + value, 0);

  return {
    totalStimulus,
    analysisTotals: result.analysisTotals,
  };
}

export function compileLoggedStimulusSetsV2(session: WorkoutSession): LoggedStimulusSetV2[] {
  const output: LoggedStimulusSetV2[] = [];
  const sessionBodyMetrics = session.bodyMetricsSnapshot ?? null;

  for (const block of session.exercises ?? []) {
    const normalizationMeta = getExerciseNormalizationMetaV2(block.exercise.id);

    for (const set of block.sets ?? []) {
      const reps = Number(set.reps ?? 0);
      if (!(reps > 0)) {
        continue;
      }

      const load = Number.isFinite(set.weightKg) ? set.weightKg : null;
      const bodyweightContext = toBodyweightContextFromSessionSnapshotV2(sessionBodyMetrics);

      if (bodyweightContext && load != null) {
        if (normalizationMeta.loadingType === "weighted_bodyweight") {
          bodyweightContext.externalLoadKg = load;
        } else if (normalizationMeta.loadingType === "assisted_bodyweight") {
          bodyweightContext.assistanceLoadKg = load;
        }
      }

      output.push({
        exerciseId: block.exercise.id,
        reps,
        load,
        rir: typeof set.rir === "number" && Number.isFinite(set.rir) ? set.rir : null,
        bodyweightContext,
      });
    }
  }

  return output;
}

export function buildCoachMuscleComputationsV2(
  analysisTotals: StimulusAnalysisTotalsV2,
  targets: readonly CoachTargetEntryV2[]
): CoachMuscleComputationV2[] {
  const targetByMuscleId = new Map(targets.map((target) => [target.muscleId, target] as const));
  const trackedMuscleIds = new Set<string>([
    ...Object.keys(analysisTotals),
    ...targets.map((target) => target.muscleId),
  ]);

  const maxActualStimulus = Math.max(
    0,
    ...Array.from(trackedMuscleIds, (muscleId) => Number(analysisTotals[muscleId] ?? 0))
  );

  return Array.from(trackedMuscleIds)
    .map((muscleId) => {
      const target = targetByMuscleId.get(muscleId) ?? null;
      const actualStimulus = Number(analysisTotals[muscleId] ?? 0);

      let status: CoachInsightStatusV2 = "balanced";
      let deviation = 0;
      let ratio = 0;
      let severity = 0;
      let targetMin: number | null = target?.min ?? null;
      let targetMax: number | null = target?.max ?? null;

      if (target) {
        if (actualStimulus < target.min) {
          status = "under";
          deviation = target.min - actualStimulus;
          ratio = target.min > 0 ? Math.min(actualStimulus / target.min, 1) : 0;
          severity = target.min > 0 ? deviation / target.min : 0;
        } else if (actualStimulus > target.max) {
          status = "over";
          deviation = actualStimulus - target.max;
          ratio = target.max > 0 ? Math.min(actualStimulus / target.max, 1) : 0;
          severity = target.max > 0 ? deviation / target.max : 0;
        } else {
          status = "balanced";
          const midpoint = (target.min + target.max) / 2;
          ratio = midpoint > 0 ? Math.min(actualStimulus / midpoint, 1) : 0;
        }
      }

      return {
        muscleId,
        label: muscleLabelByIdV2.get(muscleId) ?? muscleId,
        actualStimulus,
        targetMin,
        targetMax,
        status,
        ratio,
        deviation,
        severity,
        intensity: maxActualStimulus > 0 ? Math.min(actualStimulus / maxActualStimulus, 1) : 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label) || a.muscleId.localeCompare(b.muscleId));
}

export function buildCoachSummaryV2(
  muscles: readonly CoachMuscleComputationV2[],
  actionableCount: number
): CoachInsightSnapshotV2["summary"] {
  let underMuscles = 0;
  let balancedMuscles = 0;
  let overMuscles = 0;

  for (const muscle of muscles) {
    if (muscle.status === "under") {
      underMuscles += 1;
    } else if (muscle.status === "over") {
      overMuscles += 1;
    } else {
      balancedMuscles += 1;
    }
  }

  return {
    underMuscles,
    balancedMuscles,
    overMuscles,
    actionableCount,
  };
}

export function buildSessionPrioritySeedsV2(
  muscles: readonly CoachMuscleComputationV2[]
): SessionPrioritySeedV2[] {
  const seeds = muscles
    .filter(
      (muscle): muscle is CoachMuscleComputationV2 & { status: "under" | "over" } =>
        (muscle.status === "under" || muscle.status === "over") &&
        muscle.severity >= SESSION_MIN_RANKABLE_SEVERITY_V2
    )
    .map((muscle) => {
      // Session-only refinement:
      // weak-but-real deviations may now enter ranking below the stronger
      // actionable threshold, but they keep a conservative minimum set-change
      // posture instead of being treated as highly actionable by default.
      const severityForSetChange = Math.max(muscle.severity, SESSION_MIN_ACTIONABLE_SEVERITY_V2);
      const rawDelta = Math.round(severityForSetChange * 5);
      const clampedDelta = Math.max(1, Math.min(5, rawDelta));

      return {
        muscleId: muscle.muscleId,
        label: muscle.label,
        status: muscle.status,
        severity: muscle.severity,
        suggestedSetChange: muscle.status === "under" ? clampedDelta : -clampedDelta,
      };
    });

  return sortSessionPrioritySeedsWithRankingV2(seeds, muscles);
}

export function buildPriorityCardsV2(
  priorities: readonly SessionPrioritySeedV2[],
  exerciseCatalog: readonly CoachExerciseCatalogEntryV2[],
  favoriteExerciseIds: readonly string[],
  recentlyUsedExerciseIds: readonly string[]
): CoachPriorityCardV2[] {
  return priorities.map((priority) => {
    const suggestions = buildExerciseSuggestionCardsV2(
      priority.muscleId,
      priority.suggestedSetChange,
      exerciseCatalog,
      favoriteExerciseIds,
      recentlyUsedExerciseIds
    );

    return {
      muscleId: priority.muscleId,
      headline: priority.status === "under" ? `Increase ${priority.label}` : `Reduce ${priority.label}`,
      summary:
        priority.status === "under"
          ? `Add ${Math.abs(priority.suggestedSetChange)} sets to ${priority.label} next session.`
          : `Reduce ${Math.abs(priority.suggestedSetChange)} sets from ${priority.label} next session.`,
      direction: priority.suggestedSetChange > 0 ? "increase" : "decrease",
      totalSuggestedSetChange: priority.suggestedSetChange,
      status: priority.status,
      severity: priority.severity,
      exercises: suggestions,
    };
  });
}

export function buildMuscleDetailsV2(
  muscles: readonly CoachMuscleComputationV2[],
  priorityByMuscleId: ReadonlyMap<string, CoachPriorityCardV2>,
  exerciseCatalog: readonly CoachExerciseCatalogEntryV2[],
  favoriteExerciseIds: readonly string[],
  recentlyUsedExerciseIds: readonly string[]
): CoachMuscleDetailV2[] {
  return muscles.map((muscle) => {
    const priority = priorityByMuscleId.get(muscle.muscleId);
    const suggestedSetChange = priority?.totalSuggestedSetChange ?? 0;

    return {
      muscleId: muscle.muscleId,
      label: muscle.label,
      status: muscle.status,
      actualStimulus: muscle.actualStimulus,
      targetMin: muscle.targetMin,
      targetMax: muscle.targetMax,
      ratio: muscle.ratio,
      deviation: muscle.deviation,
      severity: muscle.severity,
      recommendedSetChange: suggestedSetChange,
      topExerciseSuggestions:
        priority?.exercises ??
        buildExerciseSuggestionCardsV2(
          muscle.muscleId,
          0,
          exerciseCatalog,
          favoriteExerciseIds,
          recentlyUsedExerciseIds
        ),
    };
  });
}

export function buildExerciseSuggestionCardsV2(
  muscleId: string,
  suggestedSetChange: number,
  exerciseCatalog: readonly CoachExerciseCatalogEntryV2[],
  favoriteExerciseIds: readonly string[],
  recentlyUsedExerciseIds: readonly string[]
): CoachExerciseSuggestionCardV2[] {
  const favoriteIds = new Set(favoriteExerciseIds);
  const recentIds = new Set(recentlyUsedExerciseIds);

  const ranked = exerciseCatalog
    .filter((option) => option.muscleId === muscleId)
    .map((option) => {
      const favoriteBonus = favoriteIds.has(option.exerciseId) ? 0.15 : 0;
      const recentUseBonus = recentIds.has(option.exerciseId) ? 0.1 : 0;

      return {
        ...option,
        score: option.prescriptionWeight + favoriteBonus + recentUseBonus,
      } satisfies RankedCatalogOptionV2;
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.prescriptionWeight !== a.prescriptionWeight) {
        return b.prescriptionWeight - a.prescriptionWeight;
      }

      return a.exerciseName.localeCompare(b.exerciseName);
    })
    .slice(0, 3);

  if (ranked.length === 0) {
    return [];
  }

  const absoluteChange = Math.abs(suggestedSetChange);
  const sign = suggestedSetChange < 0 ? -1 : 1;
  const allocations = distributeSetChangeAcrossOptionsV2(ranked, absoluteChange);

  return ranked.map((option, index) => {
    const change = allocations[index] * sign;

    return {
      exerciseId: option.exerciseId,
      exerciseName: option.exerciseName,
      suggestedSetChange: change,
      displayText:
        change > 0
          ? `Add ${Math.abs(change)} sets`
          : change < 0
            ? `Reduce ${Math.abs(change)} sets`
            : "No set change",
    };
  });
}

function distributeSetChangeAcrossOptionsV2(
  options: readonly RankedCatalogOptionV2[],
  totalChange: number
): number[] {
  if (options.length === 0) {
    return [];
  }

  if (totalChange <= 0) {
    return options.map(() => 0);
  }

  const totalScore = options.reduce((sum, option) => sum + option.score, 0);
  const shares = options.map((option, index) => {
    const rawShare =
      totalScore > 0 ? (totalChange * option.score) / totalScore : totalChange / options.length;
    const floored = Math.floor(rawShare);

    return {
      index,
      floored,
      remainder: rawShare - floored,
      score: option.score,
      exerciseName: option.exerciseName,
    };
  });

  let remaining = totalChange - shares.reduce((sum, share) => sum + share.floored, 0);

  shares.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.exerciseName.localeCompare(b.exerciseName);
  });

  for (let index = 0; index < shares.length && remaining > 0; index += 1) {
    shares[index].floored += 1;
    remaining -= 1;
  }

  shares.sort((a, b) => a.index - b.index);

  return shares.map((share) => share.floored);
}

function sortSessionPrioritySeedsWithRankingV2(
  seeds: readonly SessionPrioritySeedV2[],
  muscles: readonly CoachMuscleComputationV2[]
): SessionPrioritySeedV2[] {
  const muscleById = new Map(muscles.map((muscle) => [muscle.muscleId, muscle] as const));
  const traceByMuscleId = new Map<string, ReturnType<typeof buildPriorityRankingTraceV2>>();

  const orderedSeeds = seeds
    .map((seed) => {
      const muscle = muscleById.get(seed.muscleId);
      if (!muscle) {
        return {
          seed,
          record: null,
        };
      }

      const input = buildSessionPriorityRankingInputV2(muscle, seed);
      const derivation = {
        eligibility: derivePriorityEligibilityStateV2(input),
        severity: derivePrioritySeverityV2(input),
        confidence: derivePriorityConfidenceStateV2(input),
        stability: derivePriorityStabilityStateV2(input),
      };
      const record = buildPriorityRankingRecordV2(input, derivation);

      traceByMuscleId.set(seed.muscleId, buildPriorityRankingTraceV2(input, record, derivation));

      return {
        seed,
        record,
      };
    })
    .sort((left, right) => {
      if (left.record && right.record) {
        const comparison = comparePriorityRankingRecordsWithDecisionV2(left.record, right.record);
        const leftTrace = traceByMuscleId.get(left.seed.muscleId);
        const rightTrace = traceByMuscleId.get(right.seed.muscleId);

        if (leftTrace) {
          traceByMuscleId.set(
            left.seed.muscleId,
            appendComparatorDecisionToTraceV2(leftTrace, comparison.decision, comparison.trace)
          );
        }

        if (rightTrace) {
          traceByMuscleId.set(
            right.seed.muscleId,
            appendComparatorDecisionToTraceV2(rightTrace, comparison.decision, comparison.trace)
          );
        }

        return comparison.sortOrder;
      }

      if (left.record && !right.record) {
        return -1;
      }

      if (!left.record && right.record) {
        return 1;
      }

      return (
        right.seed.severity - left.seed.severity ||
        left.seed.muscleId.localeCompare(right.seed.muscleId)
      );
    })
    .map((entry) => entry.seed);

  setLastPriorityRankingTraceSnapshotV2("session", traceByMuscleId);

  return orderedSeeds;
}

function buildSessionPriorityRankingInputV2(
  muscle: CoachMuscleComputationV2,
  seed: SessionPrioritySeedV2
): PriorityRankingDerivationInputV2 {
  return {
    muscleId: seed.muscleId,
    classId: getPriorityTargetClassIdForMuscleV2(seed.muscleId),
    timeWindowMode: "session",
    rawDeviationContext: {
      status: seed.status,
      deviationDirection: seed.status,
      isNearBoundary: muscle.severity < 0.15,
      relativeDeviationBand: getRelativeDeviationBandV2(muscle.severity),
      relativeDeviationSubscore: normalizeRelativeDeviationSubscoreV2(muscle.severity),
    },
    directVsIndirectProfile: getPriorityDirectnessProfileForMuscleV2(seed.muscleId, "session"),
    actionLikelihood: getActionLikelihoodFromSuggestedSetChangeV2(seed.suggestedSetChange),
    // Session mode does not have multi-session pattern shape available here yet,
    // so the adapter stays conservative and avoids inventing stability evidence.
    patternDistribution: "mixed",
    patternRepeatState: "partial",
    deterministicFallbackKey: seed.muscleId,
  };
}

export function getPriorityTargetClassIdForMuscleV2(muscleId: string): PriorityTargetClassIdV2 {
  const family = muscleMetaByIdV2.get(muscleId)?.family ?? "other";

  // Provisional integration adapter only.
  // This uses a few narrow muscle-aware corrections first, then falls back to
  // broad family metadata. It is not the final class model.
  if (muscleId === "rectus_abdominis" || muscleId === "obliques") {
    return "C";
  }

  if (muscleId === "serratus_anterior" || muscleId === "hip_flexors") {
    return "D";
  }

  if (muscleId === "adductors") {
    return "E";
  }

  if (
    muscleId === "deltoid_anterior" ||
    muscleId === "deltoid_lateral" ||
    muscleId === "deltoid_posterior" ||
    muscleId === "infraspinatus_teresminor"
  ) {
    return "B";
  }

  switch (family) {
    case "biceps":
    case "triceps":
    case "forearms":
      return "B";
    case "glutes":
    case "quads":
    case "hamstrings":
    case "calves":
      return "E";
    case "back":
    case "chest":
      return "C";
    case "abs":
    case "other":
      return "A";
    case "shoulders":
      return "B";
    default:
      return "A";
  }
}

export function getPriorityDirectnessProfileForMuscleV2(
  muscleId: string,
  timeWindowMode: "session" | "weekly"
): PriorityDirectIndirectProfileV2 {
  const family = muscleMetaByIdV2.get(muscleId)?.family ?? "other";

  // Provisional integration adapter only.
  // The current coach builders do not carry direct-vs-indirect attribution, so
  // this uses existing family metadata as a narrow structural proxy.
  switch (family) {
    case "back":
    case "chest":
    case "quads":
    case "glutes":
    case "hamstrings":
      return {
        dominance: "direct",
        intentClarity: "clear",
        classNoiseLevel: timeWindowMode === "session" ? "low" : "medium",
      };
    case "biceps":
    case "triceps":
    case "shoulders":
      return {
        dominance: "mixed",
        intentClarity: "mixed",
        classNoiseLevel: "medium",
      };
    default:
      return {
        dominance: "indirect",
        intentClarity: "ambiguous",
        classNoiseLevel: "high",
      };
  }
}

export function getRelativeDeviationBandV2(
  severity: number
): PriorityRankingDerivationInputV2["rawDeviationContext"]["relativeDeviationBand"] {
  // Provisional severity-band adapter only.
  // This converts existing coach severity into the ranking subsystem's
  // structural deviation bands without locking final tuned thresholds.
  if (severity < 0.15) {
    return "boundary_adjacent";
  }

  if (severity < 0.35) {
    return "mild";
  }

  if (severity < 0.65) {
    return "moderate";
  }

  return "strong";
}

export function normalizeRelativeDeviationSubscoreV2(severity: number): number {
  return Math.max(0, Math.min(severity, 1));
}

export function getActionLikelihoodFromSuggestedSetChangeV2(
  suggestedSetChange: number
): PriorityRankingDerivationInputV2["actionLikelihood"] {
  const absoluteChange = Math.abs(suggestedSetChange);

  if (absoluteChange >= 4) {
    return "high";
  }

  if (absoluteChange >= 2) {
    return "medium";
  }

  return "low";
}
