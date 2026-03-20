import { useEffect, useRef } from "react";
import type { WorkoutSession } from "../types";
import { formatSessionDateV2 } from "../lib/workoutUtils";
import { workoutVolume } from "../utils";
import { formatWeightFromKg, type UnitSystem } from "../units";

type SessionDetailPanelProps = {
  open: boolean;
  session: WorkoutSession | null;
  units: UnitSystem;
  onClose: () => void;
  onRepeat: (session: WorkoutSession) => void;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function SessionDetailPanel({
  open,
  session,
  units,
  onClose,
  onRepeat,
}: SessionDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !session) return;

    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [];
    const firstFocusable = focusables[0] ?? panelRef.current;
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (item) => !item.hasAttribute("disabled")
      );

      if (items.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      lastFocusedRef.current?.focus();
    };
  }, [open, session, onClose]);

  if (!open || !session) return null;

  return (
    <div className="plasma-dialog-root">
      <button type="button" className="plasma-overlay" aria-label="Close session details" onClick={onClose} />

      <section
        ref={panelRef}
        className="plasma-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logv2-panel-title"
        tabIndex={-1}
      >
        <div className="plasma-panel-inner">
          <header className="plasma-panel-header">
            <div>
              <p className="plasma-log-label">Session Detail</p>
              <h2 id="logv2-panel-title" className="plasma-panel-title">
                {session.title?.trim() || "Untitled Session"}
              </h2>
              <p className="plasma-panel-meta">
                {formatSessionDateV2(session.date)} &middot; {session.exercises.length} exercises &middot;{" "}
                {formatWeightFromKg(workoutVolume(session), units, 0)} {units}
              </p>
            </div>

            <button
              type="button"
              className="plasma-btn-ghost plasma-btn-icon"
              onClick={onClose}
              aria-label="Close session detail panel"
            >
              &times;
            </button>
          </header>

          <div className="plasma-detail-list">
            {session.exercises.map((exercise) => (
              <article key={exercise.id} className="plasma-detail-item">
                <strong className="plasma-detail-title">{exercise.exercise.name || "Unnamed exercise"}</strong>
                <span className="plasma-detail-meta">{exercise.sets.length} sets logged</span>
                {(exercise.sets ?? []).length > 0 ? (
                  <div className="plasma-detail-set-list">
                    {exercise.sets.map((set, index) => (
                      <span key={set.id} className="plasma-detail-set">
                        Set {index + 1}: {set.reps} reps x {formatWeightFromKg(set.weightKg, units, 1)} {units}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="plasma-panel-actions">
            <button type="button" className="plasma-btn-primary" onClick={() => onRepeat(session)}>
              Repeat
            </button>
            <button type="button" className="plasma-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
