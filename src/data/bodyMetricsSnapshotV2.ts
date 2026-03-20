import type { BodyweightContextV2 } from "./stimulusEngineV2";
import type {
  SessionBodyMetricsSnapshotV2,
  UserBodyMetricsV2,
  WorkoutSession,
} from "../types";

export function buildSessionBodyMetricsSnapshotV2(
  bodyMetrics: Pick<UserBodyMetricsV2, "bodyweightKg" | "heightCm"> | null | undefined
): SessionBodyMetricsSnapshotV2 {
  if (!bodyMetrics) {
    return {
      bodyweightKg: null,
      heightCm: null,
      capturedAt: new Date().toISOString(),
      source: "unknown",
    };
  }

  const bodyweightKg =
    typeof bodyMetrics.bodyweightKg === "number" && Number.isFinite(bodyMetrics.bodyweightKg)
      ? bodyMetrics.bodyweightKg
      : null;
  const heightCm =
    typeof bodyMetrics.heightCm === "number" && Number.isFinite(bodyMetrics.heightCm)
      ? bodyMetrics.heightCm
      : null;

  return {
    bodyweightKg,
    heightCm,
    capturedAt: new Date().toISOString(),
    source: bodyweightKg != null || heightCm != null ? "profile_snapshot" : "unknown",
  };
}

export function createWorkoutSessionWithLockedBodyMetricsV2(
  workout: WorkoutSession,
  bodyMetrics: Pick<UserBodyMetricsV2, "bodyweightKg" | "heightCm"> | null | undefined
): WorkoutSession {
  return {
    ...workout,
    bodyMetricsSnapshot: buildSessionBodyMetricsSnapshotV2(bodyMetrics),
  };
}

export function toBodyweightContextFromSessionSnapshotV2(
  snapshot?: SessionBodyMetricsSnapshotV2 | null
): BodyweightContextV2 | null {
  if (!snapshot) {
    return null;
  }

  return {
    userBodyweightKg: snapshot.bodyweightKg,
    userHeightCm: snapshot.heightCm,
  };
}
