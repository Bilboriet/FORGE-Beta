import { useEffect, useRef, useState } from "react";
import { ExercisePickerModal } from "../components/ui/ExercisePickerModal";
import type { ExerciseBlock, ExerciseRef, SetLog } from "../types";
import { exerciseVolume } from "../utils";
import type { ExerciseEstimateHint } from "../utils";
import {
  formatLoadCompactFromKg,
  formatWeightFromKg,
  parseWeightInputToKg,
  unitLabel,
  type UnitSystem,
} from "../units";

type ExerciseListEditorProps = {
  exercises: ExerciseBlock[];
  units: UnitSystem;
  onAddExercise: (exercise: ExerciseRef) => void;
  onAddSet: (blockId: string) => void;
  onRemoveSet: (blockId: string, setId: string) => void;
  onRemoveExercise: (blockId: string) => void;
  onUpdateExercise: (blockId: string, patch: Partial<ExerciseBlock>) => void;
  onUpdateSet: (blockId: string, setId: string, patch: Partial<SetLog>) => void;
  pendingScrollExerciseId: string | null;
  onScrollHandled: () => void;
  exerciseEstimates: Record<string, ExerciseEstimateHint | null>;
};

export function ExerciseListEditor({
  exercises,
  units,
  onAddExercise,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onUpdateExercise,
  onUpdateSet,
  pendingScrollExerciseId,
  onScrollHandled,
  exerciseEstimates,
}: ExerciseListEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [setInputs, setSetInputs] = useState<Record<string, { reps?: string; weight?: string }>>({});
  const [targetRepInputs, setTargetRepInputs] = useState<Record<string, string>>({});
  const exerciseRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!pendingScrollExerciseId) return;
    const target = exerciseRefs.current[pendingScrollExerciseId];
    if (!target) return;
    let frameOne = 0;
    let frameTwo = 0;
    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        const refreshedTarget = exerciseRefs.current[pendingScrollExerciseId];
        if (!refreshedTarget) return;
        const scroller = document.scrollingElement ?? document.documentElement;
        const rect = refreshedTarget.getBoundingClientRect();
        const topOffset = 112;
        const targetTop = Math.max(0, window.scrollY + rect.top - topOffset);
        scroller.scrollTo({ top: targetTop, behavior: "smooth" });
        onScrollHandled();
      });
    });

    return () => {
      if (frameOne) window.cancelAnimationFrame(frameOne);
      if (frameTwo) window.cancelAnimationFrame(frameTwo);
    };
  }, [onScrollHandled, pendingScrollExerciseId, exercises]);

  useEffect(() => {
    setTargetRepInputs((current) => {
      const next: Record<string, string> = {};
      for (const block of exercises) {
        if (Object.prototype.hasOwnProperty.call(current, block.id)) {
          next[block.id] = current[block.id];
          continue;
        }
        next[block.id] = String(block.targetReps ?? 12);
      }
      return next;
    });
  }, [exercises]);

  const commitTargetReps = (block: ExerciseBlock, rawValue: string) => {
    const trimmed = rawValue.trim();
    const previousValue = Number.isFinite(block.targetReps) && (block.targetReps ?? 0) > 0 ? Math.trunc(block.targetReps!) : 12;
    const nextValue = trimmed === "" ? previousValue : Number(trimmed);
    const safeValue = Number.isFinite(nextValue) && nextValue > 0 ? Math.trunc(nextValue) : previousValue;

    setTargetRepInputs((current) => ({
      ...current,
      [block.id]: String(safeValue),
    }));

    if (safeValue !== block.targetReps) {
      onUpdateExercise(block.id, {
        targetReps: safeValue,
      });
    }
  };

  return (
    <section className="plasma-editor" aria-labelledby="logv2-editor-title">
      <div className="plasma-section-head">
        <div>
          <h2 id="logv2-editor-title" className="plasma-section-title">
            Active Workout
          </h2>
          <p className="plasma-section-text">
            Add exercises from the database, then log reps and kg set by set.
          </p>
        </div>

        <button type="button" className="plasma-btn-secondary" onClick={() => setPickerOpen(true)}>
          Add Exercise
        </button>
      </div>

      {pickerOpen ? (
        <ExercisePickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          placement="top"
          onPick={(exercise) => {
            onAddExercise(exercise);
            setPickerOpen(false);
          }}
        />
      ) : null}

      {exercises.length === 0 ? (
        <div className="plasma-input-row">
          <p>No exercises yet.</p>
          <p>Start by adding one exercise from the full database.</p>
        </div>
      ) : (
        <div className="plasma-exercise-list">
          {exercises.map((block) => (
            <article
              key={block.id}
              className="plasma-input-row plasma-exercise-block"
              data-exercise-block-id={block.id}
              ref={(node) => {
                if (node) {
                  exerciseRefs.current[block.id] = node;
                  return;
                }
                delete exerciseRefs.current[block.id];
              }}
            >
              <div className="plasma-exercise-header">
                <div className="plasma-exercise-meta">
                  <strong className="plasma-detail-title">{block.exercise.name}</strong>
                  <span className="plasma-detail-meta">{(block.exercise.muscleGroup ?? "other").toUpperCase()}</span>
                </div>

                <button
                  type="button"
                  className="plasma-btn-ghost plasma-btn-icon"
                  onClick={() => onRemoveExercise(block.id)}
                  aria-label={`Remove ${block.exercise.name}`}
                >
                  &times;
                </button>
              </div>

              <div className="plasma-exercise-tools">
                <label className="plasma-target-field">
                  <span className="plasma-target-label">Target reps</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="plasma-input plasma-input--compact"
                    value={targetRepInputs[block.id] ?? String(block.targetReps ?? 12)}
                    onChange={(event) => {
                      setTargetRepInputs((current) => ({
                        ...current,
                        [block.id]: event.target.value,
                      }));
                    }}
                    onBlur={(event) => {
                      commitTargetReps(block, event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    aria-label="Target reps"
                  />
                </label>
              </div>

              {(block.sets ?? []).length === 0 ? (
                <div className="plasma-empty-note">No sets logged yet. Add the first set below.</div>
              ) : (
                <div className="plasma-set-list">
                  {block.sets.map((set, index) => (
                    <div key={set.id} className="plasma-set-grid">
                      <div className="plasma-set-index">Set {index + 1}</div>

                      <label className="plasma-set-field">
                        <span className="plasma-set-label">{unitLabel(units).toUpperCase()}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.5}
                          className="plasma-input"
                          value={
                            setInputs[set.id]?.weight ??
                            (Number.isFinite(set.weightKg) ? formatWeightFromKg(set.weightKg, units, 1) : "")
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            setSetInputs((current) => ({
                              ...current,
                              [set.id]: { ...(current[set.id] ?? {}), weight: value },
                            }));
                            const kg = value === "" ? 0 : (parseWeightInputToKg(value, units) ?? 0);
                            onUpdateSet(block.id, set.id, { weightKg: kg });
                          }}
                          onBlur={() => {
                            const raw = setInputs[set.id]?.weight;
                            if (raw === undefined) return;
                            const trimmed = raw.trim();
                            const kg = trimmed === "" ? 0 : (parseWeightInputToKg(trimmed, units) ?? 0);
                            const cleaned = trimmed === "" ? "" : formatWeightFromKg(kg, units, 1);
                            setSetInputs((current) => ({
                              ...current,
                              [set.id]: { ...(current[set.id] ?? {}), weight: cleaned },
                            }));
                            onUpdateSet(block.id, set.id, {
                              weightKg: cleaned === "" ? 0 : (parseWeightInputToKg(cleaned, units) ?? 0),
                            });
                          }}
                          aria-label={unitLabel(units).toUpperCase()}
                          placeholder="0"
                        />
                      </label>

                      <label className="plasma-set-field">
                        <span className="plasma-set-label">Reps</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          className="plasma-input"
                          value={setInputs[set.id]?.reps ?? (Number.isFinite(set.reps) && set.reps > 0 ? String(set.reps) : "")}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSetInputs((current) => ({
                              ...current,
                              [set.id]: { ...(current[set.id] ?? {}), reps: value },
                            }));
                            const next = value === "" ? 0 : Number(value);
                            onUpdateSet(block.id, set.id, { reps: Number.isFinite(next) ? next : 0 });
                          }}
                          onBlur={() => {
                            const raw = setInputs[set.id]?.reps;
                            if (raw === undefined) return;
                            const next = raw.trim() === "" ? 0 : Number(raw.trim());
                            const cleaned = Number.isFinite(next) && next > 0 ? String(Math.trunc(next)) : "";
                            setSetInputs((current) => ({
                              ...current,
                              [set.id]: { ...(current[set.id] ?? {}), reps: cleaned },
                            }));
                            onUpdateSet(block.id, set.id, { reps: cleaned === "" ? 0 : Number(cleaned) });
                          }}
                          aria-label="Reps"
                          placeholder="0"
                        />
                      </label>

                      <button
                        type="button"
                        className="plasma-set-remove"
                        aria-label={`Remove set ${index + 1}`}
                        onClick={() => onRemoveSet(block.id, set.id)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="plasma-set-row">
                <button type="button" className="plasma-btn-tertiary" onClick={() => onAddSet(block.id)}>
                  Add Set
                </button>

                <div className="plasma-row-meta">
                  Exercise volume: {formatLoadCompactFromKg(exerciseVolume(block), units)}
                </div>
              </div>

              {exerciseEstimates[block.id] ? (
                <div className="plasma-estimate-note">
                  <span>
                    Estimated work set: {formatWeightFromKg(exerciseEstimates[block.id]!.worksetKg, units, 1)}{" "}
                    {unitLabel(units)} × {block.targetReps ?? 12}
                  </span>
                  <span>
                    Estimated e1RM: {formatWeightFromKg(exerciseEstimates[block.id]!.e1rmKg, units, 1)} {unitLabel(units)}
                  </span>
                </div>
              ) : (
                <div className="plasma-estimate-note plasma-estimate-note--muted">
                  Estimate unlocks after a few logged sets for this exercise.
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
