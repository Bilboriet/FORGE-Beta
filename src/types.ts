// src/types.ts
// FORGE V1 - Canonical data model
// NOTE: V1 uses kg and Norwegian UI text. V2 will add unit + language switching.

export type ID = string;

export type UserBodyMetricsV2 = {
  bodyweightKg: number | null;
  heightCm: number | null;
  updatedAt: string;
  source: "manual";
};

export type SessionBodyMetricsSnapshotV2 = {
  bodyweightKg: number | null;
  heightCm: number | null;
  capturedAt: string;
  source: "profile_snapshot" | "manual_override" | "unknown";
};

// -------------------------
// Sets (one logged set)
// -------------------------
export type SetKind = "warmup" | "work" | "backoff" | "dropset";

export type SetLog = {
  id: ID;
  kind: SetKind;

  reps: number;        // e.g. 5
  weightKg: number;    // canonical unit (kg)

  rir?: number;        // optional, 0..6 typical
  note?: string;       // optional note per set
};

// -------------------------
// Exercise reference (from library)
// -------------------------
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "forearms"
  | "other";

export type ExerciseRef = {
  id: ID;               // stable id, e.g. "bench_press"
  name: string;         // display name (Norwegian in V1)
  muscleGroup: MuscleGroup; // primary group (V1)
};

// -------------------------
// Exercise block inside a workout
// -------------------------
export type ExerciseBlock = {
  id: ID;               // unique per block
  order: number;        // ordering within a workout
  exercise: ExerciseRef;
  targetReps?: number;

  sets: SetLog[];
  note?: string;
};

// -------------------------
// Workout session (one workout)
// -------------------------
export type WorkoutSession = {
  id: ID;

  date: string;         // "YYYY-MM-DD"
  title?: string;       // e.g. "Push", "Legs"
  note?: string;
  bodyMetricsSnapshot?: SessionBodyMetricsSnapshotV2;

  exercises: ExerciseBlock[];
};

export interface WorkoutTemplate {
  id: ID;
  name: string;
  exerciseIds: string[]; // ordered
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

// -------------------------
// Diet (V1)
// -------------------------
export type DietPhase = "cut" | "maintenance" | "bulk" | "refeed";

export type DietLog = {
  id: ID;
  date: string;         // "YYYY-MM-DD"

  calories?: number;    // kcal
  proteinG?: number;
  carbsG?: number;
  fatG?: number;

  bodyweightKg?: number;

  sleepHours?: number;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;

  phase?: DietPhase;
  note?: string;
};

// -------------------------
// Settings (V1 locked; V2 expands)
// -------------------------
export type Theme = "dark_red";

export type SettingsV1 = {
  theme: Theme; // always "dark_red" in V1
};

// -------------------------
// Personal layout (V1)
// -------------------------

export type WidgetLayoutState = {
  id: string;
  order: number;
  hidden?: boolean;
  collapsed?: boolean;
  minimized?: boolean;
  wide?: boolean; // for resizable widgets (charts)
};

export type PageLayoutV1 = {
  version: 1;
  widgets: WidgetLayoutState[];
};
