import type { MuscleStat } from "../../engine/bodyViewModelV2";

export function MuscleMetricRows({ muscles }: { muscles: MuscleStat[] }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {muscles.map((m) => (
        <div
          key={m.muscleId}
          className="forgeInnerPlate"
          style={{
            padding: "8px 10px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ color: "var(--text)", fontWeight: 700 }}>{m.label}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{m.percent.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}

export default MuscleMetricRows;

