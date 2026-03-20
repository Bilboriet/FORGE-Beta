export type CoachInsightModeV2 = "session" | "weekly";

export type CoachInsightStatusV2 = "under" | "balanced" | "over";

export type MuscleHeatmapEntryV2 = {
  muscleId: string;
  label: string;
  status: CoachInsightStatusV2;
  ratio: number;
  intensity: number;
  actualStimulus: number;
  targetMin: number | null;
  targetMax: number | null;
};

export type CoachExerciseSuggestionCardV2 = {
  exerciseId: string;
  exerciseName: string;
  suggestedSetChange: number;
  displayText: string;
};

export type CoachPriorityCardV2 = {
  muscleId: string;
  headline: string;
  summary: string;
  direction: "increase" | "decrease";
  totalSuggestedSetChange: number;
  status: Extract<CoachInsightStatusV2, "under" | "over">;
  severity: number;
  exercises: CoachExerciseSuggestionCardV2[];
};

export type CoachMuscleDetailV2 = {
  muscleId: string;
  label: string;
  status: CoachInsightStatusV2;
  actualStimulus: number;
  targetMin: number | null;
  targetMax: number | null;
  ratio: number;
  deviation: number;
  severity: number;
  recommendedSetChange: number;
  topExerciseSuggestions: CoachExerciseSuggestionCardV2[];
};

export type CoachInsightSnapshotV2 = {
  mode: CoachInsightModeV2;
  generatedAt: string;
  totalStimulus: number;
  heatmap: MuscleHeatmapEntryV2[];
  topPriorities: CoachPriorityCardV2[];
  muscles: CoachMuscleDetailV2[];
  summary: {
    underMuscles: number;
    balancedMuscles: number;
    overMuscles: number;
    actionableCount: number;
  };
};
