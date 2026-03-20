import type { BodyMode } from "../../engine/bodyViewModelV2";

export function BodyModeToggle({
  value,
  onChange,
}: {
  value: BodyMode;
  onChange: (next: BodyMode) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        className={value === "stimulus" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
        onClick={() => onChange("stimulus")}
      >
        Stimulus
      </button>
      <button
        className={value === "stabilizers" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
        onClick={() => onChange("stabilizers")}
      >
        Stabilizers
      </button>
    </div>
  );
}

export default BodyModeToggle;

