import type { ReactNode } from "react";

type ActiveSessionCardProps = {
  title: string;
  formattedDate: string;
  exerciseCount: number;
  volume: number;
  canSave: boolean;
  onTitleChange: (value: string) => void;
  onSave: () => void;
  children: ReactNode;
};

export function ActiveSessionCard({
  title,
  formattedDate,
  exerciseCount,
  volume,
  canSave,
  onTitleChange,
  onSave,
  children,
}: ActiveSessionCardProps) {
  return (
    <section className="plasma-hero" aria-labelledby="logv2-active-session-title">
      <div className="plasma-hero-corner" aria-hidden="true" />
      <div className="plasma-hero-inner">
        <div className="plasma-hero-top">
          <div className="plasma-meta-block">
            <p className="plasma-log-label">Active Session</p>
            <p className="plasma-log-value">{formattedDate}</p>
          </div>

          <button type="button" className="plasma-btn-primary" onClick={onSave} disabled={!canSave}>
            Save Workout
          </button>
        </div>

        <label className="sr-only" htmlFor="logv2-active-session-title">
          Session title
        </label>
        <input
          id="logv2-active-session-title"
          className="plasma-hero-input"
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Name this session"
        />

        <div className="plasma-metric-grid" aria-label="Session summary">
          <div className="plasma-stat-card">
            <span className="plasma-stat-label">Exercises</span>
            <strong className="plasma-stat-value">{exerciseCount}</strong>
          </div>
          <div className="plasma-stat-card">
            <span className="plasma-stat-label">Sets</span>
            <strong className="plasma-stat-value">{volume}</strong>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}
