// src/components/ConsistencyHeatmap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useForgeSettings } from "../../hooks/useForgeSettings";
import { useT } from "../../hooks/useT";
import type { HeatmapDay } from "../../utils/consistency";

type Range = 30 | 90 | 180;

type Props = {
  days: HeatmapDay[];
  range: Range;
  onRangeChange: (r: Range) => void;

  // optional: show a tiny dot for sessions count
  showSessionDot?: boolean; // default true
};

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfWeekMonday(d: Date) {
  // JS: 0=Sun..6=Sat. We want Monday.
  const day = d.getDay();
  const diff = (day + 6) % 7; // Mon->0 ... Sun->6
  const out = new Date(d);
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function rangeKey(r: Range) {
  if (r === 30) return "analytics.heatmap.rangeShort.d30";
  if (r === 90) return "analytics.heatmap.rangeShort.d90";
  return "analytics.heatmap.rangeShort.d180";
}

function levelColor(level: number) {
  // Keep Forge vibe: muted dark -> deep red
  switch (level) {
    case 0:
      return "rgba(255,255,255,0.06)";
    case 1:
      return "rgba(220,38,38,0.25)";
    case 2:
      return "rgba(220,38,38,0.45)";
    case 3:
      return "rgba(220,38,38,0.65)";
    case 4:
      return "rgba(220,38,38,0.85)";
    default:
      return "rgba(255,255,255,0.06)";
  }
}

export function ConsistencyHeatmap({ days, range, onRangeChange, showSessionDot = true }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [settings] = useForgeSettings();
  const t = useT();
  const lang = settings?.language ?? "no";
  const numberLocale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "no-NO";

  const fmtNumber = (n: number) => {
    try {
      return new Intl.NumberFormat(numberLocale).format(n);
    } catch {
      return String(n);
    }
  };

  const fmtDate = (iso: string) => {
    // Compact day.month (localized)
    const d = parseISO(iso);
    try {
      return new Intl.DateTimeFormat(numberLocale, { day: "2-digit", month: "2-digit" }).format(d);
    } catch {
      // fallback: YYYY-MM-DD -> DD.MM
      const [, m, dd] = iso.split("-");
      return `${dd}.${m}`;
    }
  };

  const monthLabel = (d: Date) => {
    try {
      return new Intl.DateTimeFormat(numberLocale, { month: "short" }).format(d);
    } catch {
      const m = d.getMonth();
      return ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"][m] ?? "";
    }
  };

  const [active, setActive] = useState<HeatmapDay | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; place: "above" | "below" } | null>(null);

  // Close tooltip on outside click / scroll
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setActive(null);
      setTip(null);
    }
    function onScroll() {
      setActive(null);
      setTip(null);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const { cols, padded, monthLabels } = useMemo(() => {
    const base = Array.isArray(days) ? days : [];
    if (base.length === 0) return { cols: 0, padded: [] as (HeatmapDay | null)[], monthLabels: [] as string[] };

    const start = parseISO(base[0].dateISO);
    const end = parseISO(base[base.length - 1].dateISO);

    const gridStart = startOfWeekMonday(start);
    const gridEnd = addDays(startOfWeekMonday(end), 6); // to Sunday

    const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const c = Math.ceil(totalDays / 7);

    const byISO = new Map<string, HeatmapDay>();
    for (const d of base) byISO.set(d.dateISO, d);

    const out: (HeatmapDay | null)[] = [];
    for (let i = 0; i < totalDays; i++) {
      const cur = addDays(gridStart, i);
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(
        2,
        "0"
      )}`;
      out.push(byISO.get(iso) ?? null);
    }

    // Month labels: show month when the first day in a week-column is in a new month
    const labels: string[] = [];
    let lastMonth = -1;
    for (let col = 0; col < c; col++) {
      const weekStart = addDays(gridStart, col * 7);
      const m = weekStart.getMonth();
      if (m !== lastMonth) {
        labels.push(monthLabel(weekStart));
        lastMonth = m;
      } else {
        labels.push("");
      }
    }

    return { cols: c, padded: out, monthLabels: labels };
  }, [days, numberLocale]);

  // 7 rows (Mon..Sun)
  const rows = 7;

  const weekdayLabels = [
    t("analytics.heatmap.weekday.mon"),
    t("analytics.heatmap.weekday.tue"),
    t("analytics.heatmap.weekday.wed"),
    t("analytics.heatmap.weekday.thu"),
    t("analytics.heatmap.weekday.fri"),
    t("analytics.heatmap.weekday.sat"),
    t("analytics.heatmap.weekday.sun"),
  ];

  // Show fewer labels for cleanliness
  const labelRowSet = new Set([0, 2, 4, 6]); // Mon, Wed, Fri, Sun

  const cellSize = 14; // px (square)
  const cellGap = 4; // px

  const dayLine = (d: HeatmapDay) => {
    const sessionsKey = d.sessions === 1 ? "analytics.heatmap.sessions.one" : "analytics.heatmap.sessions.other";
    return `${t(sessionsKey, { n: d.sessions })} • ${t("analytics.heatmap.volume", { n: fmtNumber(Math.round(d.volume)) })}`;
  };

  const activeLine = active ? dayLine(active) : "";

  return (
    <div ref={rootRef} style={{ display: "grid", gap: 10, position: "relative" }}>
      {/* Top controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[30, 90, 180].map((r) => {
            const rr = r as Range;
            const isOn = rr === range;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(rr)}
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  background: isOn ? "rgba(220,38,38,0.25)" : "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {t(rangeKey(rr))}
              </button>
            );
          })}
        </div>

        <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "right" }}>
          {active ? (
            <>
              <div style={{ color: "var(--text)", fontWeight: 900 }}>{fmtDate(active.dateISO)}</div>
              <div>{activeLine}</div>
            </>
          ) : (
            t("analytics.heatmap.tapPrompt")
          )}
        </div>
      </div>

      {/* Month markers + grid (scrolls horizontally on mobile) */}
      <div style={{ overflowX: "auto", paddingBottom: 2 }}>
        <div style={{ display: "grid", gap: 6, minWidth: cols * (cellSize + cellGap) + 28 }}>
          {/* month labels row */}
          {cols > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `auto repeat(${cols}, ${cellSize}px)`,
                columnGap: cellGap,
                alignItems: "end",
              }}
            >
              <div style={{ width: 28 }} />
              {monthLabels.map((lab, i) => (
                <div
                  key={`m-${i}`}
                  style={{
                    height: 14,
                    fontSize: 11,
                    color: "var(--muted)",
                    textTransform: "lowercase",
                    opacity: lab ? 0.9 : 0,
                  }}
                >
                  {lab}
                </div>
              ))}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `auto repeat(${cols}, ${cellSize}px)`,
              columnGap: cellGap,
              rowGap: cellGap,
              alignItems: "center",
            }}
          >
            {/* rows (Mon..Sun): label + week columns */}
            {Array.from({ length: rows }).map((_, row) => {
              return (
                <div key={`row-${row}`} style={{ display: "contents" }}>
                  <div
                    style={{
                      width: 28,
                      fontSize: 11,
                      color: "var(--muted)",
                      opacity: labelRowSet.has(row) ? 0.85 : 0,
                      lineHeight: `${cellSize}px`,
                    }}
                  >
                    {weekdayLabels[row]}
                  </div>

                  {Array.from({ length: cols }).map((__, col) => {
                    const idx = col * 7 + row;
                    const d = padded[idx] ?? null;
                    const isEmpty = !d;
                    const isActive = d && active?.dateISO === d.dateISO;

                    const bg = isEmpty ? "rgba(255,255,255,0.04)" : levelColor(d!.level);

                    return (
                      <button
                        key={`c-${col}-${row}`}
                        type="button"
                        onClick={(e) => {
                          if (!d) return;
                          setActive(d);
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          const rootRect = rootRef.current?.getBoundingClientRect();
                          const x = rect.left - (rootRect?.left ?? 0) + rect.width / 2;
                          const y = rect.top - (rootRect?.top ?? 0);
                          setTip({ x, y, place: "above" });
                        }}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: 4,
                          border: isActive ? "1px solid rgba(255,255,255,0.65)" : "1px solid rgba(0,0,0,0)",
                          background: bg,
                          padding: 0,
                          position: "relative",
                          cursor: d ? "pointer" : "default",
                        }}
                        aria-label={d ? `${fmtDate(d.dateISO)}: ${dayLine(d)}` : undefined}
                      >
                        {showSessionDot && d && d.sessions > 0 ? (
                          <span
                            style={{
                              position: "absolute",
                              right: 1,
                              bottom: 1,
                              width: 3,
                              height: 3,
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.85)",
                              opacity: d.sessions >= 2 ? 0.9 : 0.6,
                            }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
