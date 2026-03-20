import { useMemo } from "react";
import type { BodyRegionKey } from "../../engine/bodyViewModelV2";

const ORDER: Array<{ key: BodyRegionKey; label: string }> = [
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "delts", label: "Delts" },
  { key: "arms", label: "Arms" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
];

export function BodyRegionStrip({
  active,
  onChange,
  totals,
}: {
  active: BodyRegionKey;
  onChange: (next: BodyRegionKey) => void;
  totals?: Partial<Record<BodyRegionKey, number>>;
}) {
  const maxTotal = useMemo(() => {
    const values = ORDER.map((r) => Number(totals?.[r.key] ?? 0)).filter((v) => Number.isFinite(v) && v > 0);
    return values.length ? Math.max(...values) : 0;
  }, [totals]);

  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {ORDER.map((r) => {
        const on = r.key === active;
        const raw = Number(totals?.[r.key] ?? 0);
        const safeRaw = Number.isFinite(raw) && raw > 0 ? raw : 0;
        const widthPct = maxTotal > 0 ? (safeRaw / maxTotal) * 100 : 0;
        return (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            style={{
              whiteSpace: "nowrap",
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid " + (on ? "rgba(var(--accentHot-rgb),0.5)" : "var(--border)"),
              background: on ? "rgba(var(--accentHot-rgb),0.12)" : "var(--surface2)",
              color: on ? "var(--red)" : "var(--text)",
              fontWeight: 850,
              cursor: "pointer",
              boxShadow: on ? "0 0 12px rgba(var(--accentGlow-rgb),0.22)" : "none",
            }}
          >
            <span style={{ display: "grid", gap: 5 }}>
              <span>{r.label}</span>
              <span
                style={{
                  display: "block",
                  width: 42,
                  height: 2,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: `${Math.max(0, Math.min(100, widthPct))}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: on ? "var(--accentHot)" : "rgba(var(--accentHot-rgb),0.72)",
                    transition: "width 220ms ease",
                  }}
                />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default BodyRegionStrip;
