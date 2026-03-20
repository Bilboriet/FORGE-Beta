import type { WorkoutSession } from "../types";
import type { UnitSystem } from "../units";
import { RecentSessionCard } from "./RecentSessionCard";

type RecentSessionsSectionProps = {
  sessions: WorkoutSession[];
  units: UnitSystem;
  onOpenSession: (session: WorkoutSession) => void;
};

export function RecentSessionsSection({ sessions, units, onOpenSession }: RecentSessionsSectionProps) {
  return (
    <section className="plasma-section-secondary" aria-labelledby="logv2-recents-title">
      <div className="plasma-section-head">
        <div>
          <h2 id="logv2-recents-title" className="plasma-section-title">
            Recent Sessions
          </h2>
          <p className="plasma-section-text">The last five saved sessions, ready to inspect or repeat.</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="plasma-input-row">
          <p>No sessions saved yet.</p>
          <p>Your recent work will show up here once you save the first session.</p>
        </div>
      ) : (
        <div className="plasma-recent-grid">
          {sessions.map((session) => (
            <RecentSessionCard key={session.id} session={session} units={units} onOpen={onOpenSession} />
          ))}
        </div>
      )}
    </section>
  );
}
