import { useEffect, type CSSProperties, type Ref } from "react";

type Props = {
  open: boolean;
  muscleId?: string;
  bodyMode?: "stimulus" | "stabilizers";
  onBodyModeChange?: (mode: "stimulus" | "stabilizers") => void;
  mode?: "dock" | "overlay" | "contextual";
  metricLine?: string;
  panelRef?: Ref<HTMLElement>;
  style?: CSSProperties;
  onClose: () => void;
};

export function BodyOverlayInspector({
  open,
  muscleId,
  bodyMode = "stimulus",
  onBodyModeChange,
  mode = "overlay",
  metricLine,
  panelRef,
  style,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open || (mode !== "overlay" && mode !== "contextual")) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, onClose]);

  return (
    <aside
      className={`bodyV2InspectorPanel ${
        mode === "dock" ? "bodyV2InspectorPanel--dock" : mode === "contextual" ? "bodyV2InspectorPanel--contextual" : "bodyV2InspectorPanel--overlay"
      }`}
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
      ref={panelRef}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bodyV2InspectorKicker">INSPECTOR C</div>
      <div className="bodyV2InspectorTitle">{muscleId ?? "No zone selected"}</div>
      <div className="bodyV2InspectorRow">{metricLine ?? "Stimulus 7d / 30d / All"}</div>
      {open && onBodyModeChange ? (
        <div className="bodyV2InspectorMode" role="group" aria-label="Mode">
          <button
            className="bodyV2Pill bodyV2Pill--mini"
            data-active={bodyMode === "stimulus"}
            type="button"
            onClick={() => onBodyModeChange("stimulus")}
          >
            Stimulus
          </button>
          <button
            className="bodyV2Pill bodyV2Pill--mini"
            data-active={bodyMode === "stabilizers"}
            type="button"
            onClick={() => onBodyModeChange("stabilizers")}
          >
            Stabilizers
          </button>
        </div>
      ) : null}
      <div className="bodyV2InspectorLine">Your Top - (placeholder)</div>
      <div className="bodyV2InspectorLine">High Activation - (placeholder)</div>
      <button className="bodyV2Chip bodyV2Chip--ghost" onClick={onClose} type="button">
        Close
      </button>
    </aside>
  );
}

export default BodyOverlayInspector;
