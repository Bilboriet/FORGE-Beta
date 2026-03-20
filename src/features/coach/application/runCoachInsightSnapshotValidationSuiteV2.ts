import type { BuildCoachInsightSnapshotInputV2 } from "./coachInsightInputTypesV2";
import { buildCoachInsightSnapshotV2 } from "./buildCoachInsightSnapshotV2";
import type { CoachInsightStatusV2 } from "./coachInsightTypesV2";

export type CoachInsightSnapshotValidationCaseV2 = {
  id: string;
  input: BuildCoachInsightSnapshotInputV2;
  expected: {
    actionableCount?: number;
    topPriorityMuscleIds?: string[];
    muscleStatuses?: Record<string, CoachInsightStatusV2>;
    totalStimulus?: number;
    summary?: Partial<{
      underMuscles: number;
      balancedMuscles: number;
      overMuscles: number;
      actionableCount: number;
    }>;
  };
};

export function runCoachInsightSnapshotValidationSuiteV2(
  cases: CoachInsightSnapshotValidationCaseV2[]
): {
  total: number;
  passed: number;
  failed: number;
  results: {
    id: string;
    passed: boolean;
    errors: string[];
  }[];
} {
  const EPSILON = 1e-6;

  const results = cases.map((testCase) => {
    const snapshot = buildCoachInsightSnapshotV2(testCase.input);
    const errors: string[] = [];

    if (typeof testCase.expected.actionableCount === "number") {
      if (snapshot.summary.actionableCount !== testCase.expected.actionableCount) {
        errors.push(
          `actionableCount mismatch: expected ${testCase.expected.actionableCount}, got ${snapshot.summary.actionableCount}`
        );
      }
    }

    if (testCase.expected.topPriorityMuscleIds) {
      const actualIds = snapshot.topPriorities.map((item) => item.muscleId);
      const expectedIds = testCase.expected.topPriorityMuscleIds;
      const sameLength = actualIds.length === expectedIds.length;
      const sameOrder =
        sameLength && actualIds.every((muscleId, index) => muscleId === expectedIds[index]);

      if (!sameOrder) {
        errors.push(
          `topPriorityMuscleIds mismatch: expected [${expectedIds.join(", ")}], got [${actualIds.join(", ")}]`
        );
      }
    }

    if (testCase.expected.muscleStatuses) {
      const muscleById = new Map(snapshot.muscles.map((muscle) => [muscle.muscleId, muscle] as const));

      for (const muscleId in testCase.expected.muscleStatuses) {
        const expectedStatus = testCase.expected.muscleStatuses[muscleId];
        const muscle = muscleById.get(muscleId);

        if (!muscle) {
          errors.push(`missing muscle entry for ${muscleId}`);
          continue;
        }

        if (muscle.status !== expectedStatus) {
          errors.push(
            `status mismatch for ${muscleId}: expected ${expectedStatus}, got ${muscle.status}`
          );
        }
      }
    }

    if (typeof testCase.expected.totalStimulus === "number") {
      if (Math.abs(snapshot.totalStimulus - testCase.expected.totalStimulus) > EPSILON) {
        errors.push(
          `totalStimulus mismatch: expected ${testCase.expected.totalStimulus}, got ${snapshot.totalStimulus}`
        );
      }
    }

    if (testCase.expected.summary) {
      const expectedSummary = testCase.expected.summary;

      if (
        typeof expectedSummary.underMuscles === "number" &&
        snapshot.summary.underMuscles !== expectedSummary.underMuscles
      ) {
        errors.push(
          `summary underMuscles mismatch: expected ${expectedSummary.underMuscles}, got ${snapshot.summary.underMuscles}`
        );
      }

      if (
        typeof expectedSummary.balancedMuscles === "number" &&
        snapshot.summary.balancedMuscles !== expectedSummary.balancedMuscles
      ) {
        errors.push(
          `summary balancedMuscles mismatch: expected ${expectedSummary.balancedMuscles}, got ${snapshot.summary.balancedMuscles}`
        );
      }

      if (
        typeof expectedSummary.overMuscles === "number" &&
        snapshot.summary.overMuscles !== expectedSummary.overMuscles
      ) {
        errors.push(
          `summary overMuscles mismatch: expected ${expectedSummary.overMuscles}, got ${snapshot.summary.overMuscles}`
        );
      }

      if (
        typeof expectedSummary.actionableCount === "number" &&
        snapshot.summary.actionableCount !== expectedSummary.actionableCount
      ) {
        errors.push(
          `summary actionableCount mismatch: expected ${expectedSummary.actionableCount}, got ${snapshot.summary.actionableCount}`
        );
      }
    }

    if (snapshot.mode !== "session") {
      errors.push(`snapshot structure mismatch: expected mode session, got ${snapshot.mode}`);
    }

    if (!Array.isArray(snapshot.heatmap) || !Array.isArray(snapshot.topPriorities) || !Array.isArray(snapshot.muscles)) {
      errors.push("snapshot structure mismatch: expected heatmap, topPriorities, and muscles arrays");
    }

    return {
      id: testCase.id,
      passed: errors.length === 0,
      errors,
    };
  });

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}
