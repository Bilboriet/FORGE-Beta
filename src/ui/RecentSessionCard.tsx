import type { WorkoutSession } from "../types";
import { formatSessionDateV2 } from "../lib/workoutUtils";
import { workoutVolume } from "../utils";
import { formatLoadCompactFromKg, type UnitSystem } from "../units";

type RecentSessionCardProps = {
  session: WorkoutSession;
  units: UnitSystem;
  onOpen: (session: WorkoutSession) => void;
};

export function RecentSessionCard({ session, units, onOpen }: RecentSessionCardProps) {
  return (
    <button type="button" className="plasma-recent-card" onClick={() => onOpen(session)}>
      <span className="plasma-recent-date">{formatSessionDateV2(session.date)}</span>
      <strong className="plasma-recent-title">{session.title?.trim() || "Untitled Session"}</strong>
      <span className="plasma-recent-meta">
        {session.exercises.length} exercises &middot; {formatLoadCompactFromKg(workoutVolume(session), units)}
      </span>
    </button>
  );
}
