import type { MuscleStat } from "../../engine/bodyViewModelV2";

export function StackedDistributionBar({ muscles }: { muscles: MuscleStat[] }) {
  if (!muscles.length) {
    return <div className="forgeInnerPlate" style={{ height: 16 }} />;
  }

  return (
    <div
      className="forgeInnerPlate"
      style={{ display: "flex", overflow: "hidden", minHeight: 16, borderRadius: 999, gap: 0 }}
    >
      {muscles.map((m, idx) => (
        <div
          key={m.muscleId}
          title={`${m.label}: ${m.percent.toFixed(1)}%`}
          style={{
            width: `${Math.max(0, m.percent)}%`,
            minWidth: m.percent > 0 ? 2 : 0,
            borderLeft: idx === 0 ? "none" : "1px solid var(--strokeSubtle)",
            background:
              idx % 4 === 0
                ? "rgba(var(--accentHot-rgb),0.34)"
                : idx % 4 === 1
                ? "rgba(var(--accentHot-rgb),0.26)"
                : idx % 4 === 2
                ? "rgba(var(--accentHot-rgb),0.20)"
                : "rgba(var(--accentHot-rgb),0.14)",
          }}
        />
      ))}
    </div>
  );
}

export default StackedDistributionBar;

