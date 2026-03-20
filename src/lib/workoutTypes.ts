export type WorkoutSetDraftV2 = {
  id: string;
};

export type WorkoutExerciseDraftV2 = {
  id: string;
  name: string;
  sets: WorkoutSetDraftV2[];
};

export type WorkoutDraftV2 = {
  id: string;
  title: string;
  date: string;
  updatedAt: string;
  exercises: WorkoutExerciseDraftV2[];
};

export type WorkoutSessionV2 = {
  id: string;
  title: string;
  date: string;
  savedAt: string;
  exercises: WorkoutExerciseDraftV2[];
};
