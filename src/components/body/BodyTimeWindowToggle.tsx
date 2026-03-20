import type { BodyTimeWindow } from "../../engine/bodyViewModelV2";

export function BodyTimeWindowToggle({
  value,
  onChange,
}: {
  value: BodyTimeWindow;
  onChange: (next: BodyTimeWindow) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        className={value === "last7" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
        onClick={() => onChange("last7")}
      >
        7d
      </button>
      <button
        className={value === "last30" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
        onClick={() => onChange("last30")}
      >
        30d
      </button>
      <button
        className={value === "all" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
        onClick={() => onChange("all")}
      >
        All
      </button>
    </div>
  );
}

export default BodyTimeWindowToggle;

