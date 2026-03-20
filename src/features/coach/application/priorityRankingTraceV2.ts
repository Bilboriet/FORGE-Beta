import type {
  PriorityComparatorDecisionV2,
  PriorityComparatorTraceV2,
  PriorityConfidenceDerivationResultV2,
  PriorityEligibilityDerivationResultV2,
  PriorityRankingDerivationInputV2,
  PriorityRankingRecordV2,
  PriorityRankingTraceV2,
  PrioritySeverityDerivationResultV2,
  PriorityStabilityDerivationResultV2,
} from "./priorityRankingTypesV2";

export type DebugPriorityTraceMapV2 = Map<string, PriorityRankingTraceV2>;

export type DebugPriorityTraceSnapshotV2 = {
  mode: "session" | "weekly";
  traces: ReadonlyMap<string, PriorityRankingTraceV2>;
};

export type PriorityDerivationTraceInputsV2 = {
  eligibility: PriorityEligibilityDerivationResultV2;
  severity: PrioritySeverityDerivationResultV2;
  confidence: PriorityConfidenceDerivationResultV2;
  stability: PriorityStabilityDerivationResultV2;
};

let lastPriorityRankingTraceSnapshotV2: DebugPriorityTraceSnapshotV2 | null = null;

function clonePriorityRankingTraceV2(trace: PriorityRankingTraceV2): PriorityRankingTraceV2 {
  return {
    ...trace,
    rankingNotes: [...trace.rankingNotes],
    comparisonPathSummary: [...trace.comparisonPathSummary],
    finalComparableShape: { ...trace.finalComparableShape },
  };
}

function clonePriorityTraceMapV2(
  traces: ReadonlyMap<string, PriorityRankingTraceV2>
): DebugPriorityTraceMapV2 {
  return new Map(
    Array.from(traces.entries(), ([muscleId, trace]) => [muscleId, clonePriorityRankingTraceV2(trace)] as const)
  );
}

/**
 * Builds the lean per-item trace artifact.
 * Comparator traces are optional and can be attached separately in inspected flows.
 */
export function buildPriorityRankingTraceV2(
  input: PriorityRankingDerivationInputV2,
  record: PriorityRankingRecordV2,
  derivation: PriorityDerivationTraceInputsV2
): PriorityRankingTraceV2 {
  return {
    muscleId: input.muscleId,
    derivedEligibilityReason: derivation.eligibility.reason,
    derivedSeverityReason: derivation.severity.reason,
    derivedConfidenceReason: derivation.confidence.reason,
    derivedStabilityReason: derivation.stability.reason,
    rankingNotes: [
      ...derivation.eligibility.notes,
      ...derivation.severity.notes,
      ...derivation.confidence.notes,
      ...derivation.stability.notes,
    ],
    comparisonPathSummary: [],
    finalComparableShape: record,
  };
}

/**
 * Optional helper for inspected/debug flows.
 * Ordinary sorting does not need to persist every pairwise comparator decision.
 */
export function appendComparatorDecisionToTraceV2(
  trace: PriorityRankingTraceV2,
  decision: PriorityComparatorDecisionV2,
  comparatorTrace?: PriorityComparatorTraceV2
): PriorityRankingTraceV2 {
  const summary = comparatorTrace
    ? `${decision.decisionPath}: ${decision.reason} (override=${comparatorTrace.overrideApplied ? comparatorTrace.overrideType ?? "yes" : "none"})`
    : `${decision.decisionPath}: ${decision.reason}`;

  return {
    ...trace,
    comparisonPathSummary: [...trace.comparisonPathSummary, summary],
  };
}

/**
 * Debug-only in-memory snapshot store for the most recent ranking trace pass.
 * This must never affect snapshot contracts or runtime ordering behavior.
 */
export function setLastPriorityRankingTraceSnapshotV2(
  mode: DebugPriorityTraceSnapshotV2["mode"],
  traces: ReadonlyMap<string, PriorityRankingTraceV2>
): void {
  lastPriorityRankingTraceSnapshotV2 = {
    mode,
    traces: clonePriorityTraceMapV2(traces),
  };
}

/**
 * Debug-only accessor for inspected flows.
 * Returns a defensive copy so callers cannot mutate the stored snapshot.
 */
export function getLastPriorityRankingTraceSnapshotV2(): DebugPriorityTraceSnapshotV2 | null {
  if (!lastPriorityRankingTraceSnapshotV2) {
    return null;
  }

  return {
    mode: lastPriorityRankingTraceSnapshotV2.mode,
    traces: clonePriorityTraceMapV2(lastPriorityRankingTraceSnapshotV2.traces),
  };
}
