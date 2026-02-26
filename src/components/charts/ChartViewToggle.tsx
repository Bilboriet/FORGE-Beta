import type React from "react";

export type ChartView = "line" | "bar";

export function ChartViewToggle({
  value,
  onChange,
  size = "md",
  disabled = false,
}: {
  value: ChartView;
  onChange: (v: ChartView) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const isLine = value === "line";

  const dims =
    size === "sm"
      ? { h: 32, pad: 3, font: 12, w: 164 }
      : { h: 36, pad: 3, font: 13, w: 184 };

  const base: React.CSSProperties = {
    width: dims.w,
    height: dims.h,
    padding: dims.pad,
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.48) 100%), var(--surface)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    position: "relative",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? "none" : "auto",
  };

  const knob: React.CSSProperties = {
    position: "absolute",
    top: dims.pad,
    left: dims.pad,
    width: `calc(50% - ${dims.pad}px)`,
    height: `calc(100% - ${dims.pad * 2}px)`,
    borderRadius: 999,
    border: "1px solid rgba(var(--accentHot-rgb),0.40)",
    background: "linear-gradient(180deg, rgba(var(--accentHot-rgb),0.16) 0%, rgba(0,0,0,0.45) 100%), var(--surface2)",
    boxShadow: "inset 0 -2px 0 rgba(var(--accentGlow-rgb),0.34), 0 6px 12px rgba(var(--accentGlow-rgb),0.16)",
    transform: isLine ? "translateX(0%)" : "translateX(100%)",
    transition: "transform 160ms ease",
    willChange: "transform",
  };

  const btn: React.CSSProperties = {
    border: "none",
    background: "transparent",
    color: "var(--muted)",
    fontWeight: 850,
    fontSize: dims.font,
    cursor: "pointer",
    zIndex: 1,
    display: "grid",
    placeItems: "center",
    padding: 0,
    outline: "none",
  };

  const activeText: React.CSSProperties = {
    color: "var(--accentHot)",
  };

  return (
    <div
      role="group"
      aria-label="Diagramvisning"
      style={base}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onChange("line");
        if (e.key === "ArrowRight") onChange("bar");
      }}
    >
      <div style={knob} aria-hidden />

      <button
        type="button"
        aria-pressed={isLine}
        onClick={() => onChange("line")}
        style={{ ...btn, ...(isLine ? activeText : null) }}
      >
        Linje
      </button>

      <button
        type="button"
        aria-pressed={!isLine}
        onClick={() => onChange("bar")}
        style={{ ...btn, ...(!isLine ? activeText : null) }}
      >
        Søyle
      </button>
    </div>
  );
}
