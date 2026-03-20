import { useEffect, useMemo, useState } from "react";
import { ActiveSessionCard } from "../ui/ActiveSessionCard";
import { ExerciseListEditor } from "../ui/ExerciseListEditor";
import { RecentSessionsSection } from "../ui/RecentSessionsSection";
import { SessionDetailPanel } from "../ui/SessionDetailPanel";
import { createWorkoutSessionWithLockedBodyMetricsV2 } from "../data/bodyMetricsSnapshotV2";
import { LS_KEYS } from "../constants";
import { useBodyMetricsV2 } from "../hooks/useBodyMetricsV2";
import { useForgeSettings } from "../hooks/useForgeSettings";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatSessionDateV2 } from "../lib/workoutUtils";
import type { ExerciseBlock, ExerciseRef, SetLog, WorkoutSession } from "../types";
import { sortByDateDesc } from "../utils";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyWorkout(): WorkoutSession {
  return {
    id: createId(),
    date: todayISO(),
    title: "",
    exercises: [],
  };
}

function createRepeatWorkout(session: WorkoutSession): WorkoutSession {
  return {
    id: createId(),
    date: todayISO(),
    title: session.title ?? "",
    exercises: session.exercises.map((exercise, index) => ({
      id: createId(),
      order: index,
      exercise: exercise.exercise,
      sets: [],
    })),
  };
}

function emitDraftState(hasDraft: boolean) {
  window.dispatchEvent(new CustomEvent("forge:draft", { detail: { hasDraft } }));
}

export function LogPageV2() {
  const [bodyMetrics] = useBodyMetricsV2();
  const [settings] = useForgeSettings();
  const units = settings?.units === "lb" ? "lb" : "kg";

  const [sessions, setSessions] = useLocalStorage<WorkoutSession[]>(LS_KEYS.sessions, []);
  const [draft, setDraft] = useLocalStorage<WorkoutSession | null>(LS_KEYS.log_draft_v1, null);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    emitDraftState(draft !== null);
  }, [draft]);

  const recentSessions = useMemo(() => sortByDateDesc(Array.isArray(sessions) ? sessions : []).slice(0, 5), [sessions]);
  const activeWorkout = draft;
  const hasActiveWorkout = activeWorkout !== null;
  const exerciseCount = activeWorkout?.exercises.length ?? 0;
  const setCount =
    activeWorkout?.exercises.reduce((sum, exercise) => sum + (exercise.sets?.length ?? 0), 0) ?? 0;
  const canSave = (activeWorkout?.exercises.length ?? 0) > 0;

  const updateDraft = (updater: (current: WorkoutSession) => WorkoutSession) => {
    setDraft((current) => {
      if (!current) return current;
      return updater(current);
    });
  };

  const startNewWorkout = () => {
    setDraft(createEmptyWorkout());
  };

  const addExerciseBlock = (exercise: ExerciseRef) => {
    updateDraft((current) => {
      const nextBlock: ExerciseBlock = {
        id: createId(),
        order: current.exercises.length,
        exercise: {
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
        },
        sets: [],
      };

      return {
        ...current,
        exercises: [...current.exercises, nextBlock],
      };
    });
  };

  const removeExerciseBlock = (blockId: string) => {
    updateDraft((current) => ({
      ...current,
      exercises: current.exercises
        .filter((block) => block.id !== blockId)
        .map((block, index) => ({ ...block, order: index })),
    }));
  };

  const addSet = (blockId: string) => {
    updateDraft((current) => ({
      ...current,
      exercises: current.exercises.map((block) =>
        block.id === blockId
          ? {
              ...block,
              sets: [
                ...block.sets,
                {
                  id: createId(),
                  kind: "work",
                  reps: 8,
                  weightKg: 50,
                } satisfies SetLog,
              ],
            }
          : block
      ),
    }));
  };

  const updateSet = (blockId: string, setId: string, patch: Partial<SetLog>) => {
    updateDraft((current) => ({
      ...current,
      exercises: current.exercises.map((block) =>
        block.id === blockId
          ? {
              ...block,
              sets: block.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
            }
          : block
      ),
    }));
  };

  const removeSet = (blockId: string, setId: string) => {
    updateDraft((current) => ({
      ...current,
      exercises: current.exercises.map((block) =>
        block.id === blockId
          ? {
              ...block,
              sets: block.sets.filter((set) => set.id !== setId),
            }
          : block
      ),
    }));
  };

  const handleSave = () => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) return;

    const nextWorkout = createWorkoutSessionWithLockedBodyMetricsV2(activeWorkout, bodyMetrics);
    setSessions((current) => sortByDateDesc([nextWorkout, ...(Array.isArray(current) ? current : [])]));
    setSelectedSession(nextWorkout);
    setPanelOpen(true);
    setDraft(null);
  };

  const handleRepeat = (session: WorkoutSession) => {
    setDraft(createRepeatWorkout(session));
    setPanelOpen(false);
  };

  return (
    <div className="plasma-log-theme plasma-log-page">
      <div className="plasma-log-shell">
        <header className="plasma-log-header">
          <div className="plasma-log-heading">
            <p className="plasma-log-kicker">Workout Log</p>
            <h1 className="plasma-log-title plasma-log-title--compact">Log Workout</h1>
          </div>

          <div className="plasma-log-badges" aria-label="Workout status">
            <span className="plasma-log-badge">{hasActiveWorkout ? "Workout active" : "No active workout"}</span>
            <span className="plasma-log-badge">{recentSessions.length} recent sessions</span>
          </div>
        </header>

        {!hasActiveWorkout ? (
          <section className="plasma-section-secondary plasma-start-card">
            <div className="plasma-start-copy">
              <h2 className="plasma-section-title">Start a new workout</h2>
              <p className="plasma-section-text">
                Open a real workout draft, then add exercises from the full database and log sets as you go.
              </p>
            </div>

            <button type="button" className="plasma-btn-primary" onClick={startNewWorkout}>
              Start New Workout
            </button>
          </section>
        ) : (
          <ActiveSessionCard
            title={activeWorkout.title ?? ""}
            formattedDate={formatSessionDateV2(activeWorkout.date)}
            exerciseCount={exerciseCount}
            volume={setCount}
            canSave={canSave}
            onTitleChange={(value) => updateDraft((current) => ({ ...current, title: value }))}
            onSave={handleSave}
          >
            <ExerciseListEditor
              exercises={activeWorkout.exercises}
              units={units}
              onAddExercise={addExerciseBlock}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onRemoveExercise={removeExerciseBlock}
              onUpdateSet={updateSet}
            />
          </ActiveSessionCard>
        )}

        <RecentSessionsSection
          sessions={recentSessions}
          units={units}
          onOpenSession={(session) => {
            setSelectedSession(session);
            setPanelOpen(true);
          }}
        />
      </div>

      <SessionDetailPanel
        open={panelOpen}
        session={selectedSession}
        units={units}
        onClose={() => setPanelOpen(false)}
        onRepeat={handleRepeat}
      />
    </div>
  );
}

export default LogPageV2;
