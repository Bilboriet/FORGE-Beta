import type { RegionStats } from "../../engine/bodyViewModelV2";
import AdvancedToggle from "./AdvancedToggle";
import MuscleMetricRows from "./MuscleMetricRows";
import StackedDistributionBar from "./StackedDistributionBar";

export function RegionPanel({
  stats,
  showAdvanced,
  onToggleAdvanced,
}: {
  stats: RegionStats;
  showAdvanced: boolean;
  onToggleAdvanced: (next: boolean) => void;
}) {
  const visible = showAdvanced
    ? stats.muscles
    : stats.muscles.filter((m) => !m.isAdvanced && !m.hiddenByDefault);

  return (
    <div className="bodyV2Inspector" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 20 }}>{stats.label}</div>
          <div className="bodyV2Muted">Top 3: {stats.top3.map((x) => x.label).join(", ") || "N/A"}</div>
        </div>
        <AdvancedToggle value={showAdvanced} onChange={onToggleAdvanced} />
      </div>

      <StackedDistributionBar muscles={visible} />

      {visible.length === 0 ? (
        <div className="bodyV2MetricCard bodyV2Muted" style={{ padding: "10px 12px" }}>
          No muscle data in this view.
        </div>
      ) : (
        <MuscleMetricRows muscles={visible} />
      )}
    </div>
  );
}

export default RegionPanel;
