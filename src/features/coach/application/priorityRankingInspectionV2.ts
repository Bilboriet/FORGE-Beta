import type {
  BuildCoachInsightSnapshotInputV2,
  BuildWeeklyCoachInsightSnapshotInputV2,
} from "./coachInsightInputTypesV2";
import { buildCoachInsightSnapshotV2 } from "./buildCoachInsightSnapshotV2";
import { buildWeeklyCoachInsightSnapshotV2 } from "./buildWeeklyCoachInsightSnapshotV2";
import type { CoachInsightSnapshotV2 } from "./coachInsightTypesV2";
import { getLastPriorityRankingTraceSnapshotV2 } from "./priorityRankingTraceV2";
import type { PriorityRankingRecordV2 } from "./priorityRankingTypesV2";

export type PriorityRankingInspectionRowV2 = {
  muscleId: string;
  surfacedPriorityIndex: number | null;
  eligibility: string;
  severityTier: string;
  severityEdgeState: string;
  severitySubscore: number;
  confidence: string;
  stability: string;
  derivedEligibilityReason: string;
  derivedSeverityReason: string;
  derivedConfidenceReason: string;
  derivedStabilityReason: string;
  comparisonPathSummary: string[];
  finalComparableShape: PriorityRankingRecordV2;
};

export type PriorityRankingInspectionSnapshotV2 = {
  mode: "session" | "weekly";
  rows: PriorityRankingInspectionRowV2[];
};

export type PriorityRankingInspectionResultV2 = {
  snapshot: CoachInsightSnapshotV2;
  inspection: PriorityRankingInspectionSnapshotV2;
};

function buildPriorityRankingInspectionSnapshotV2(
  snapshot: CoachInsightSnapshotV2
): PriorityRankingInspectionSnapshotV2 {
  const traceSnapshot = getLastPriorityRankingTraceSnapshotV2();
  const inspectionMode = traceSnapshot?.mode ?? snapshot.mode;
  const priorityIndexByMuscleId = new Map(
    snapshot.topPriorities.map((priority, index) => [priority.muscleId, index] as const)
  );

  const rows = traceSnapshot
    ? Array.from(traceSnapshot.traces.values())
        .map((trace) => ({
          muscleId: trace.muscleId,
          surfacedPriorityIndex: priorityIndexByMuscleId.get(trace.muscleId) ?? null,
          eligibility: trace.finalComparableShape.priorityEligibilityState,
          severityTier: trace.finalComparableShape.severityTier,
          severityEdgeState: trace.finalComparableShape.severityEdgeState,
          severitySubscore: trace.finalComparableShape.severitySubscore,
          confidence: trace.finalComparableShape.confidenceState,
          stability: trace.finalComparableShape.stabilityState,
          derivedEligibilityReason: trace.derivedEligibilityReason,
          derivedSeverityReason: trace.derivedSeverityReason,
          derivedConfidenceReason: trace.derivedConfidenceReason,
          derivedStabilityReason: trace.derivedStabilityReason,
          comparisonPathSummary: [...trace.comparisonPathSummary],
          finalComparableShape: { ...trace.finalComparableShape },
        }))
        .sort((left, right) => {
          const leftPriorityIndex = left.surfacedPriorityIndex;
          const rightPriorityIndex = right.surfacedPriorityIndex;

          if (leftPriorityIndex !== null && rightPriorityIndex !== null) {
            return leftPriorityIndex - rightPriorityIndex;
          }

          if (leftPriorityIndex !== null) {
            return -1;
          }

          if (rightPriorityIndex !== null) {
            return 1;
          }

          return left.muscleId.localeCompare(right.muscleId);
        })
    : [];

  return {
    mode: inspectionMode,
    rows,
  };
}

/**
 * Debug-only helper for inspected session flows.
 * Runs the live integrated snapshot builder, then converts the latest internal
 * trace store into a compact inspection snapshot without changing runtime data.
 */
export function inspectSessionPriorityRankingV2(
  input: BuildCoachInsightSnapshotInputV2
): PriorityRankingInspectionResultV2 {
  const snapshot = buildCoachInsightSnapshotV2(input);

  return {
    snapshot,
    inspection: buildPriorityRankingInspectionSnapshotV2(snapshot),
  };
}

/**
 * Debug-only helper for inspected weekly flows.
 * Runs the live integrated weekly builder, then converts the latest internal
 * trace store into a compact inspection snapshot without changing runtime data.
 */
export function inspectWeeklyPriorityRankingV2(
  input: BuildWeeklyCoachInsightSnapshotInputV2
): PriorityRankingInspectionResultV2 {
  const snapshot = buildWeeklyCoachInsightSnapshotV2(input);

  return {
    snapshot,
    inspection: buildPriorityRankingInspectionSnapshotV2(snapshot),
  };
}
