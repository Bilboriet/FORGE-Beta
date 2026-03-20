import type {
  BuildCoachInsightSnapshotInputV2,
  BuildWeeklyCoachInsightSnapshotInputV2,
} from "./coachInsightInputTypesV2";
import { buildCoachInsightSnapshotV2 } from "./buildCoachInsightSnapshotV2";
import { buildWeeklyCoachInsightSnapshotV2 } from "./buildWeeklyCoachInsightSnapshotV2";
import type { CoachInsightSnapshotV2 } from "./coachInsightTypesV2";
import type { CoachTargetBehaviorValidationCaseV2 } from "./coachTargetBehaviorValidationCasesV2";

function buildSnapshotFromCaseInput(
  input: CoachTargetBehaviorValidationCaseV2["input"]
): CoachInsightSnapshotV2 {
  if (input.mode === "weekly") {
    const weeklyInput: BuildWeeklyCoachInsightSnapshotInputV2 = {
      sessions: [...(input.sessions ?? [])],
      targets: [...input.targets],
      exerciseCatalog: [...input.exerciseCatalog],
      favoriteExerciseIds: [...(input.favoriteExerciseIds ?? [])],
      recentlyUsedExerciseIds: [...(input.recentlyUsedExerciseIds ?? [])],
      generatedAt: input.generatedAt,
    };

    return buildWeeklyCoachInsightSnapshotV2(weeklyInput);
  }

  const sessionInput: BuildCoachInsightSnapshotInputV2 = {
    session:
      input.session ??
      ({
        id: "validation_empty_session",
        date: "2026-03-17",
        exercises: [],
      } as BuildCoachInsightSnapshotInputV2["session"]),
    targets: [...input.targets],
    exerciseCatalog: [...input.exerciseCatalog],
    favoriteExerciseIds: [...(input.favoriteExerciseIds ?? [])],
    recentlyUsedExerciseIds: [...(input.recentlyUsedExerciseIds ?? [])],
    generatedAt: input.generatedAt,
  };

  return buildCoachInsightSnapshotV2(sessionInput);
}

function expectedSignMatches(actualValue: number, expectedSign: "positive" | "negative" | "zero"): boolean {
  if (expectedSign === "positive") {
    return actualValue > 0;
  }

  if (expectedSign === "negative") {
    return actualValue < 0;
  }

  return actualValue === 0;
}

export function runCoachTargetBehaviorValidationSuiteV2(
  cases: CoachTargetBehaviorValidationCaseV2[]
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
  const results = cases.map((testCase) => {
    const snapshot = buildSnapshotFromCaseInput(testCase.input);
    const muscleById = new Map(snapshot.muscles.map((muscle) => [muscle.muscleId, muscle] as const));
    const priorityByMuscleId = new Map(
      snapshot.topPriorities.map((priority) => [priority.muscleId, priority] as const)
    );
    const catalogEntriesByExerciseId = new Map<string, string[]>();
    const errors: string[] = [];

    for (const option of testCase.input.exerciseCatalog) {
      const existing = catalogEntriesByExerciseId.get(option.exerciseId);

      if (existing) {
        existing.push(option.muscleId);
      } else {
        catalogEntriesByExerciseId.set(option.exerciseId, [option.muscleId]);
      }
    }

    if (testCase.expected.muscleStatuses) {
      for (const muscleId in testCase.expected.muscleStatuses) {
        const muscle = muscleById.get(muscleId);
        const expectedStatus = testCase.expected.muscleStatuses[muscleId];

        if (!muscle) {
          errors.push(`missing muscle entry for ${muscleId}`);
          continue;
        }

        if (muscle.status !== expectedStatus) {
          errors.push(`status mismatch for ${muscleId}: expected ${expectedStatus}, got ${muscle.status}`);
        }
      }
    }

    if (testCase.expected.recommendationPresence) {
      for (const muscleId in testCase.expected.recommendationPresence) {
        const expectedPresence = testCase.expected.recommendationPresence[muscleId];
        const priority = priorityByMuscleId.get(muscleId);

        if (expectedPresence && !priority) {
          errors.push(`expected recommendation for ${muscleId} but none found`);
        }

        if (!expectedPresence && priority) {
          errors.push(`expected no recommendation for ${muscleId} but found one`);
        }
      }
    }

    if (testCase.expected.recommendationDirections) {
      for (const muscleId in testCase.expected.recommendationDirections) {
        const expectedDirection = testCase.expected.recommendationDirections[muscleId];
        const priority = priorityByMuscleId.get(muscleId);

        if (!priority) {
          errors.push(`expected recommendation for ${muscleId} but none found`);
          continue;
        }

        if (priority.direction !== expectedDirection) {
          errors.push(
            `expected direction ${expectedDirection} for ${muscleId} but got ${priority.direction}`
          );
        }
      }
    }

    if (testCase.expected.priorityOrder) {
      const actualOrder = snapshot.topPriorities.map((priority) => priority.muscleId);
      const expectedOrder = testCase.expected.priorityOrder;
      const sameLength = actualOrder.length === expectedOrder.length;
      const sameOrder =
        sameLength && actualOrder.every((muscleId, index) => muscleId === expectedOrder[index]);

      if (!sameOrder) {
        errors.push(
          `priority order mismatch: expected [${expectedOrder.join(", ")}], got [${actualOrder.join(", ")}]`
        );
      }
    }

    if (typeof testCase.expected.actionableCount === "number") {
      if (snapshot.summary.actionableCount !== testCase.expected.actionableCount) {
        errors.push(
          `actionableCount mismatch: expected ${testCase.expected.actionableCount}, got ${snapshot.summary.actionableCount}`
        );
      }
    }

    if (testCase.expected.setAdjustmentSigns) {
      for (const muscleId in testCase.expected.setAdjustmentSigns) {
        const expectedSign = testCase.expected.setAdjustmentSigns[muscleId];
        const priority = priorityByMuscleId.get(muscleId);
        const muscle = muscleById.get(muscleId);

        if (!muscle) {
          errors.push(`missing muscle entry for ${muscleId}`);
          continue;
        }

        const actualValue = priority?.totalSuggestedSetChange ?? muscle.recommendedSetChange;

        if (!expectedSignMatches(actualValue, expectedSign)) {
          errors.push(`expected ${expectedSign} set adjustment for ${muscleId} but got ${actualValue}`);
        }
      }
    }

    if (testCase.expected.suggestionTargetMuscles) {
      for (const muscleId in testCase.expected.suggestionTargetMuscles) {
        const allowedMuscles = testCase.expected.suggestionTargetMuscles[muscleId];
        const priority = priorityByMuscleId.get(muscleId);
        const muscle = muscleById.get(muscleId);
        const suggestions = priority?.exercises ?? muscle?.topExerciseSuggestions ?? [];

        if (!muscle) {
          errors.push(`missing muscle entry for ${muscleId}`);
          continue;
        }

        if (suggestions.length === 0) {
          errors.push(`expected suggestions for ${muscleId} but none found`);
          continue;
        }

        for (const suggestion of suggestions) {
          const suggestionMuscles = catalogEntriesByExerciseId.get(suggestion.exerciseId) ?? [];
          const matchesExpectedTarget = suggestionMuscles.some((candidate) =>
            allowedMuscles.includes(candidate)
          );

          if (!matchesExpectedTarget) {
            errors.push(
              `expected suggestion target ${allowedMuscles.join(", ")} for ${muscleId} but got ${suggestion.exerciseId}`
            );
          }
        }
      }
    }

    if (
      !Array.isArray(snapshot.heatmap) ||
      !Array.isArray(snapshot.topPriorities) ||
      !Array.isArray(snapshot.muscles)
    ) {
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
