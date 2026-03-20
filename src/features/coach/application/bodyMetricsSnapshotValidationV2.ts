import {
  buildSessionBodyMetricsSnapshotV2,
  createWorkoutSessionWithLockedBodyMetricsV2,
} from "../../../data/bodyMetricsSnapshotV2";
import { compileLoggedStimulusSetsV2 } from "./buildCoachInsightSnapshotV2";
import type { UserBodyMetricsV2, WorkoutSession } from "../../../types";

export type BodyMetricsSnapshotValidationResultV2 = {
  id: string;
  passed: boolean;
  error?: string;
};

function createValidationSessionV2(
  overrides?: Partial<WorkoutSession>
): WorkoutSession {
  return {
    id: "validation_session",
    date: "2026-03-18",
    title: "Validation Session",
    exercises: [
      {
        id: "block_1",
        order: 0,
        exercise: {
          id: "pull_up",
          name: "Pull Up",
          muscleGroup: "back",
        },
        sets: [
          {
            id: "set_1",
            kind: "work",
            reps: 8,
            weightKg: 0,
            rir: 2,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function createBodyMetricsV2(
  overrides?: Partial<UserBodyMetricsV2>
): UserBodyMetricsV2 {
  return {
    bodyweightKg: 82,
    heightCm: 182,
    updatedAt: "2026-03-18T08:00:00.000Z",
    source: "manual",
    ...overrides,
  };
}

export function runBodyMetricsSnapshotValidationV2(): BodyMetricsSnapshotValidationResultV2[] {
  const baseSession = createValidationSessionV2();
  const bodyMetrics = createBodyMetricsV2();
  const lockedSession = createWorkoutSessionWithLockedBodyMetricsV2(baseSession, bodyMetrics);
  bodyMetrics.bodyweightKg = 95;
  bodyMetrics.heightCm = 190;
  bodyMetrics.updatedAt = "2026-03-20T10:00:00.000Z";

  const compileWithSnapshot = compileLoggedStimulusSetsV2(lockedSession);
  const compileLegacy = compileLoggedStimulusSetsV2(baseSession);
  const nullSnapshot = buildSessionBodyMetricsSnapshotV2({
    bodyweightKg: null,
    heightCm: null,
  });

  return [
    {
      id: "new_saved_session_writes_snapshot",
      passed:
        lockedSession.bodyMetricsSnapshot?.bodyweightKg === 82 &&
        lockedSession.bodyMetricsSnapshot?.heightCm === 182 &&
        lockedSession.bodyMetricsSnapshot?.source === "profile_snapshot",
      error:
        lockedSession.bodyMetricsSnapshot?.source === "profile_snapshot"
          ? undefined
          : "Expected newly locked session to carry a profile_snapshot body metrics snapshot.",
    },
    {
      id: "changing_current_profile_later_does_not_mutate_saved_snapshot",
      passed:
        lockedSession.bodyMetricsSnapshot?.bodyweightKg === 82 &&
        lockedSession.bodyMetricsSnapshot?.heightCm === 182,
      error:
        lockedSession.bodyMetricsSnapshot?.bodyweightKg === 82 &&
        lockedSession.bodyMetricsSnapshot?.heightCm === 182
          ? undefined
          : "Expected saved session snapshot to remain locked to the original values.",
    },
    {
      id: "compile_path_reads_session_snapshot_not_live_profile",
      passed:
        compileWithSnapshot[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        compileWithSnapshot[0]?.bodyweightContext?.userHeightCm === 182,
      error:
        compileWithSnapshot[0]?.bodyweightContext?.userBodyweightKg === 82 &&
        compileWithSnapshot[0]?.bodyweightContext?.userHeightCm === 182
          ? undefined
          : "Expected compiled stimulus set to read bodyweightContext from the locked session snapshot.",
    },
    {
      id: "legacy_sessions_remain_safe",
      passed: compileLegacy[0]?.bodyweightContext == null && nullSnapshot.source === "unknown",
      error:
        compileLegacy[0]?.bodyweightContext == null && nullSnapshot.source === "unknown"
          ? undefined
          : "Expected legacy sessions without a snapshot to compile safely with null bodyweightContext.",
    },
  ];
}
