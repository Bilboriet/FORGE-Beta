// src/components/PieCard.tsx
import { useMemo } from "react";
import { MiniPieChart, type PieSlice } from "./MiniPieChart";
import { useT } from "../../hooks/useT";

type Props = {
  title: string;
  subtitle?: string;
  slices: PieSlice[];
  centerLabel?: string;
  centerSubLabel?: string;
  footer?: string;
};

function pct(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function PieCard({
  title,
  subtitle,
  slices,
  centerLabel,
  centerSubLabel,
  footer,
}: Props) {
  const t = useT();
  const total = useMemo(
    () => (Array.isArray(slices) ? slices.reduce((s, x) => s + (x.value || 0), 0) : 0),
    [slices]
  );

  const top = useMemo(() => {
    if (!slices?.length) return null;
    const sorted = [...slices].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return sorted[0] ?? null;
  }, [slices]);

  return (
    <div
      className="forge-surface forgeCardInner"
      style={{
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
          {title.toUpperCase()}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ color: "var(--text)", fontWeight: 950 }}>
            {subtitle ?? (top ? `${top.label} • ${pct(top.value, total)}%` : "—")}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            {total > 0 ? `${t("common.total")}: ${Math.round(total)}` : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <MiniPieChart
          slices={slices}
          size={150}
          thickness={18}
          centerLabel={centerLabel}
          centerSubLabel={centerSubLabel}
        />

        {/* legend */}
        <div style={{ display: "grid", gap: 8 }}>
          {slices
            .filter((s) => (s.value ?? 0) > 0)
            .slice(0, 6)
            .map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <div style={{ color: "var(--text)", fontWeight: 800 }}>
                  {s.label}
                </div>
                <div style={{ color: "var(--muted)" }}>
                  {pct(s.value, total)}%
                </div>
              </div>
            ))}
        </div>
      </div>

      {footer ? (
        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.35 }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}

