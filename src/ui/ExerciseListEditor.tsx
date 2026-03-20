import { useState } from "react";
import { ExercisePickerModal } from "../components/ui/ExercisePickerModal";
import type { ExerciseBlock, ExerciseRef, SetLog } from "../types";
import { exerciseVolume } from "../utils";
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
  onUpdateSet: (blockId: string, setId: string, patch: Partial<SetLog>) => void;
};

export function ExerciseListEditor({
  exercises,
  units,
  onAddExercise,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onUpdateSet,
}: ExerciseListEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [setInputs, setSetInputs] = useState<Record<string, { reps?: string; weight?: string }>>({});

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
            <article key={block.id} className="plasma-input-row">
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

              {(block.sets ?? []).length === 0 ? (
                <div className="plasma-empty-note">No sets logged yet. Add the first set below.</div>
              ) : (
                <div className="plasma-set-list">
                  {block.sets.map((set, index) => (
                    <div key={set.id} className="plasma-set-grid">
                      <div className="plasma-set-index">Set {index + 1}</div>

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
                        placeholder="Reps"
                      />

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
                        placeholder={unitLabel(units).toUpperCase()}
                      />

                      <button
                        type="button"
                        className="plasma-btn-tertiary"
                        onClick={() => onRemoveSet(block.id, set.id)}
                      >
                        Remove
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
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
