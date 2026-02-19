// src/components/ChartHeader.tsx
import type { MiniChartMode } from "./MiniLineChart";

type Props = {
  title: string;

  // key metrics
  last?: number | null;
  best?: number | null;
  deltaLabel?: string; // e.g. "+2.5 kg", "-1.2%", "Plateau"
  subtitle?: string; // e.g. "Best 1RM (Epley)" or "Volume"

  // right-side toggle (optional)
  mode?: MiniChartMode;
  onModeChange?: (m: MiniChartMode) => void;

  // small badge (optional)
  badge?: string; // e.g. "PR", "7D", "ALL"
};

function fmt(v: number) {
  const abs = Math.abs(v);
  if (abs >= 100) return String(Math.round(v));
  if (abs >= 10) return String(Math.round(v * 10) / 10);
  return String(Math.round(v * 100) / 100);
}

export function ChartHeader({
  title,
  last = null,
  best = null,
  deltaLabel,
  subtitle,
  mode,
  onModeChange,
  badge,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.2,
              color: "rgba(255,255,255,0.92)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
            title={title}
          >
            {title}
          </div>

          {badge ? (
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(255,59,59,0.12)",
                border: "1px solid rgba(255,59,59,0.28)",
                color: "rgba(255,255,255,0.92)",
                userSelect: "none",
                flex: "0 0 auto",
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        {subtitle ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              opacity: 0.92,
              marginTop: 3,
            }}
          >
            {subtitle}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 8,
            alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Last{" "}
            <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 800 }}>
              {last === null ? "—" : fmt(last)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Best{" "}
            <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 800 }}>
              {best === null ? "—" : fmt(best)}
            </span>
          </div>

          {deltaLabel ? (
            <div
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.86)",
              }}
            >
              {deltaLabel}
            </div>
          ) : null}
        </div>
      </div>

      {mode && onModeChange ? (
        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
          <button
            type="button"
            onClick={() => onModeChange("line")}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                mode === "line"
                  ? "rgba(255,59,59,0.16)"
                  : "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Line
          </button>
          <button
            type="button"
            onClick={() => onModeChange("bar")}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                mode === "bar"
                  ? "rgba(255,59,59,0.16)"
                  : "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Bars
          </button>
        </div>
      ) : null}
    </div>
  );
}
