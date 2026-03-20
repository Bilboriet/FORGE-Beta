import type {
  WorkoutDraftV2,
  WorkoutExerciseDraftV2,
  WorkoutSessionV2,
  WorkoutSetDraftV2,
} from "./workoutTypes";

export const WORKOUT_V2_KEYS = {
  sessions: "forge:v2:sessions",
  currentDraft: "forge:v2:currentDraft",
} as const;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function createIdV2(prefix = "forge_v2"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function todayIsoV2(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatSessionDateV2(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function createSetDraftV2(): WorkoutSetDraftV2 {
  return { id: createIdV2("set") };
}

export function createExerciseDraftV2(name = ""): WorkoutExerciseDraftV2 {
  return {
    id: createIdV2("exercise"),
    name,
    sets: [],
  };
}

export function createEmptyDraftV2(): WorkoutDraftV2 {
  return {
    id: createIdV2("draft"),
    title: "",
    date: todayIsoV2(),
    updatedAt: new Date().toISOString(),
    exercises: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeExerciseV2(value: unknown): WorkoutExerciseDraftV2 | null {
  if (!isObject(value)) return null;

  const name = typeof value.name === "string" ? value.name : "";
  const rawSets = Array.isArray(value.sets) ? value.sets : [];
  const sets = rawSets
    .map((set) => {
      if (!isObject(set)) return null;
      return {
        id: typeof set.id === "string" ? set.id : createIdV2("set"),
      } satisfies WorkoutSetDraftV2;
    })
    .filter((set): set is WorkoutSetDraftV2 => set !== null);

  return {
    id: typeof value.id === "string" ? value.id : createIdV2("exercise"),
    name,
    sets,
  };
}

export function normalizeDraftV2(value: unknown): WorkoutDraftV2 {
  if (!isObject(value)) {
    return createEmptyDraftV2();
  }

  const rawExercises = Array.isArray(value.exercises) ? value.exercises : [];
  const exercises = rawExercises
    .map(normalizeExerciseV2)
    .filter((exercise): exercise is WorkoutExerciseDraftV2 => exercise !== null);

  return {
    id: typeof value.id === "string" ? value.id : createIdV2("draft"),
    title: typeof value.title === "string" ? value.title : "",
    date: typeof value.date === "string" ? value.date : todayIsoV2(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    exercises,
  };
}

export function normalizeSessionV2(value: unknown): WorkoutSessionV2 | null {
  if (!isObject(value)) return null;

  const rawExercises = Array.isArray(value.exercises) ? value.exercises : [];
  const exercises = rawExercises
    .map(normalizeExerciseV2)
    .filter((exercise): exercise is WorkoutExerciseDraftV2 => exercise !== null);

  return {
    id: typeof value.id === "string" ? value.id : createIdV2("session"),
    title: typeof value.title === "string" ? value.title : "",
    date: typeof value.date === "string" ? value.date : todayIsoV2(),
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    exercises,
  };
}

export function loadDraftV2(): WorkoutDraftV2 {
  const storage = safeStorage();
  if (!storage) return createEmptyDraftV2();

  try {
    return normalizeDraftV2(JSON.parse(storage.getItem(WORKOUT_V2_KEYS.currentDraft) ?? "null"));
  } catch {
    return createEmptyDraftV2();
  }
}

export function saveDraftV2(draft: WorkoutDraftV2): void {
  const storage = safeStorage();
  if (!storage) return;

  storage.setItem(
    WORKOUT_V2_KEYS.currentDraft,
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    } satisfies WorkoutDraftV2)
  );
}

export function loadSessionsV2(): WorkoutSessionV2[] {
  const storage = safeStorage();
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(WORKOUT_V2_KEYS.sessions) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeSessionV2)
      .filter((session): session is WorkoutSessionV2 => session !== null);
  } catch {
    return [];
  }
}

export function saveSessionsV2(sessions: WorkoutSessionV2[]): void {
  const storage = safeStorage();
  if (!storage) return;

  storage.setItem(WORKOUT_V2_KEYS.sessions, JSON.stringify(sortSessionsNewestFirstV2(sessions)));
}

export function sortSessionsNewestFirstV2(sessions: WorkoutSessionV2[]): WorkoutSessionV2[] {
  return [...sessions].sort((left, right) => {
    const leftTime = new Date(left.savedAt).getTime();
    const rightTime = new Date(right.savedAt).getTime();

    if (rightTime !== leftTime) return rightTime - leftTime;
    return right.date.localeCompare(left.date);
  });
}

export function getExerciseCountV2(session: Pick<WorkoutDraftV2, "exercises">): number {
  return session.exercises.length;
}

export function getVolumeV2(session: Pick<WorkoutDraftV2, "exercises">): number {
  return session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
}

export function sanitizeExercisesV2(exercises: WorkoutExerciseDraftV2[]): WorkoutExerciseDraftV2[] {
  return exercises
    .map((exercise) => ({
      ...exercise,
      name: exercise.name.trim(),
    }))
    .filter((exercise) => exercise.name.length > 0);
}

export function canSaveDraftV2(draft: WorkoutDraftV2): boolean {
  return sanitizeExercisesV2(draft.exercises).length > 0;
}

export function buildSessionFromDraftV2(draft: WorkoutDraftV2): WorkoutSessionV2 {
  return {
    id: createIdV2("session"),
    title: draft.title.trim(),
    date: draft.date,
    savedAt: new Date().toISOString(),
    exercises: sanitizeExercisesV2(draft.exercises).map((exercise) => ({
      id: createIdV2("exercise"),
      name: exercise.name,
      sets: exercise.sets.map(() => createSetDraftV2()),
    })),
  };
}

export function repeatSessionAsDraftV2(session: WorkoutSessionV2): WorkoutDraftV2 {
  return {
    id: createIdV2("draft"),
    title: session.title,
    date: todayIsoV2(),
    updatedAt: new Date().toISOString(),
    exercises: session.exercises.map((exercise) => ({
      id: createIdV2("exercise"),
      name: exercise.name,
      sets: [],
    })),
  };
}
