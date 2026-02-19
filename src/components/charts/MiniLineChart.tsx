// src/components/MiniLineChart.tsx
import { useId, useMemo, useRef, useState } from "react";

export type MiniChartMode = "line" | "bar";

type Props = {
  points: number[]; // primary (trend/base)

  // optional secondary (raw)
  secondaryPoints?: number[];
  primaryLabel?: string;
  secondaryLabel?: string;

  // visual
  height?: number; // px
  mode?: MiniChartMode; // "line" | "bar"
  showGrid?: boolean; // default true

  // interactivity
  activeIndex?: number | null;
  onActivate?: (index: number | null) => void;

  ariaLabel?: string;

  // optional markers
  highlightIndices?: number[]; // indices to visually emphasize (e.g., PR points)
  barStyle?: "default" | "forgeMeter";
};

type Pt = { x: number; y: number };

function computeDomain(values: number[]) {
  const finite = (values ?? []).filter((v) => Number.isFinite(v));
  if (!finite.length) return [0, 1] as const;

  const min = Math.min(...finite);
  const max = Math.max(...finite);

  let yMin = min;
  let yMax = max;

  if (min === max) {
    const pad = Math.max(5, min * 0.05);
    yMin = min - pad;
    yMax = max + pad;
  } else {
    const pad = (max - min) * 0.1;
    yMin = min - pad;
    yMax = max + pad;
  }

  if (yMin === yMax) {
    yMax = yMin + 1;
  }

  return [yMin, yMax] as const;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function roundSmart(v: number) {
  if (!Number.isFinite(v)) return 0;
  const abs = Math.abs(v);
  if (abs >= 100) return Math.round(v);
  if (abs >= 10) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

// Catmull–Rom → Cubic Bezier (smooth, men fortsatt tro mot datapunktene)
function buildSmoothPath(points: Pt[], tension = 0.9) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
  }

  const t = clamp01(tension);
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + ((p2.x - p0.x) / 6) * t;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * t;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * t;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * t;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

export function MiniLineChart({
  points,
  secondaryPoints,
  primaryLabel = "Trend",
  secondaryLabel = "Raw",
  height = 96,
  mode = "line",
  showGrid = true,
  activeIndex = null,
  onActivate,
  ariaLabel = "Mini chart",
  highlightIndices = [],
  barStyle = "default",
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Tap to lock selection. Double click to clear (desktop).
  const [locked, setLocked] = useState(false);

  const { min, max, normalized, safe } = useMemo(() => {
    const arr = (Array.isArray(points) ? points : []).map((x) =>
      Number.isFinite(x) ? x : 0
    );

    const minV = arr.length ? Math.min(...arr) : 0;
    const maxV = arr.length ? Math.max(...arr) : 0;
    const [yMin, yMax] = computeDomain(arr);
    const span = Math.max(1e-6, yMax - yMin);
    const norm = arr.map((v) => (v - yMin) / span);

    return { min: minV, max: maxV, normalized: norm, safe: arr };
  }, [points]);

  const n = normalized.length;

  const title =
    n === 0
      ? "Ingen data"
      : `Min: ${roundSmart(min)} • Max: ${roundSmart(max)} • Punkter: ${n}`;

  // Layout/padding i viewBox
  const PAD_X = 6;
  const PAD_Y = 8;
  const innerW = 100 - PAD_X * 2;
  const innerH = 100 - PAD_Y * 2;
  const baseY = 100 - PAD_Y;

  function indexFromClientX(clientX: number) {
    if (!wrapRef.current) return null;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) return null;
    if (n <= 0) return null;

    const idx = Math.floor((x / rect.width) * n);
    return Math.max(0, Math.min(n - 1, idx));
  }

  function activate(idx: number | null) {
    onActivate?.(idx);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (locked) return;
    const idx = indexFromClientX(e.clientX);
    if (idx === null) return;
    activate(idx);
  }

  function handlePointerLeave() {
    if (locked) return;
    activate(null);
  }

  function handlePointerDown(e: React.PointerEvent) {
    const idx = indexFromClientX(e.clientX);
    if (idx === null) return;

    setLocked(true);
    activate(idx);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function handleDoubleClick() {
    setLocked(false);
    activate(null);
  }

  const plotPoints = useMemo<Pt[]>(() => {
    if (n === 0) return [];
    if (n === 1) {
      const x = PAD_X;
      const y = PAD_Y + (1 - clamp01(normalized[0] ?? 0)) * innerH;
      return [{ x, y }];
    }
    return normalized.map((p, i) => {
      const x = PAD_X + (i / (n - 1)) * innerW;
      const y = PAD_Y + (1 - clamp01(p)) * innerH;
      return { x, y };
    });
  }, [n, normalized, innerW, innerH]);

  const linePath = useMemo(() => buildSmoothPath(plotPoints, 0.9), [plotPoints]);

  const areaPath = useMemo(() => {
    if (!linePath || plotPoints.length === 0) return "";
    const rightX = PAD_X + innerW;
    return `${linePath} L ${rightX} ${baseY} L ${PAD_X} ${baseY} Z`;
  }, [linePath, plotPoints.length, baseY, innerW]);

  const bars = useMemo(() => {
    if (n === 0) return [];
    const colW = 100 / n;

    return normalized.map((p, i) => {
      const x = i * colW;
      const w = colW;
      const h = clamp01(p) * 100;
      const y = 100 - h;

      const visualW = Math.max(2.4, w * 0.68);
      const vx = x + (w - visualW) / 2;

      return { x, w, y, h, vx, vw: visualW, value: safe[i] ?? 0 };
    });
  }, [normalized, n, safe]);

  const activeBar =
    activeIndex !== null && activeIndex >= 0 ? bars[activeIndex] : null;

  const primaryValue =
    activeIndex !== null && activeIndex >= 0 ? safe[activeIndex] : null;

  const secondaryValue =
    secondaryPoints &&
    activeIndex !== null &&
    activeIndex >= 0 &&
    activeIndex < secondaryPoints.length
      ? Number.isFinite(secondaryPoints[activeIndex])
        ? secondaryPoints[activeIndex]
        : 0
      : null;

  const activePt =
    activeIndex !== null && activeIndex >= 0 ? plotPoints[activeIndex] : null;

  // Forge token-driven accents (match global chart + meter styling)
  const NEON = "var(--red)";
  const NEON_SOFT = "var(--forge-red-hot)";
  const NEON_TINT = "var(--redSoft)";

  const neonGlowId = `forgeNeonGlow-${uid}`;
  const dotGridId = `forgeDotGrid-${uid}`;
  const areaId = `forgeArea-${uid}`;
  const lineId = `forgeLine-${uid}`;
  const barFillId = `forgeBarFill-${uid}`;
  const barGlowId = `forgeBarGlow-${uid}`;
  const clipId = `forgeClip-${uid}`;

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(120% 90% at 50% 0%, rgba(255,80,40,0.10) 0%, rgba(0,0,0,0) 60%)," +
          "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)," +
          "rgba(0,0,0,0.55)",
        boxShadow:
          "0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        overflow: "hidden",
        position: "relative",
        touchAction: "manipulation",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      aria-label={ariaLabel}
      title={title}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      role="img"
    >
      {/* Top-left value badge (glass) */}
      {primaryValue !== null && n > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 10,
            fontSize: 12,
            color: "rgba(255,255,255,0.92)",
            padding: "8px 10px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            userSelect: "none",
            pointerEvents: "none",
            lineHeight: 1.25,
            display: "grid",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ color: "rgba(255,255,255,0.72)" }}>{primaryLabel}</span>
            <span style={{ fontWeight: 900 }}>{roundSmart(primaryValue)}</span>
          </div>
          {secondaryValue !== null ? (
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>{secondaryLabel}</span>
              <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: 800 }}>
                {roundSmart(secondaryValue)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          {/* Heated metal glow (token-driven, no legacy palette) */}
          <filter id={neonGlowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="var(--forge-red-hot)" />
            <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="var(--forge-red-mid)" />
            <feDropShadow dx="0" dy="0" stdDeviation="2.8" floodColor="var(--forge-red-deep)" />
          </filter>

          {/* Dotted grid */}
          <pattern id={dotGridId} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.6" fill="rgba(255,255,255,0.14)" />
          </pattern>

          {/* Area fill */}
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--forge-red-top, #ff3a2a)" stopOpacity="0.14" />
            <stop offset="100%" stopColor={NEON} stopOpacity="0.00" />
          </linearGradient>

          {/* Line gradient */}
          <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--forge-red-top, #ff3a2a)" stopOpacity="0.9" />
            <stop offset="50%" stopColor="var(--forge-red, #e11d2a)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--forge-red-bottom, #7a0f16)" stopOpacity="0.92" />
          </linearGradient>

          {/* Bar fill + subtle forge glow (match .forgeMeterFill) */}
          <linearGradient id={barFillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--forge-red-top)" />
            <stop offset="50%" stopColor="var(--red)" />
            <stop offset="100%" stopColor="var(--forge-red-bottom)" />
          </linearGradient>
          <filter id={barGlowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="var(--forge-red-hot)" />
            <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="var(--forge-red-mid)" />
            <feDropShadow dx="0" dy="0" stdDeviation="2.8" floodColor="var(--forge-red-deep)" />
          </filter>

          {/* Clip to inner plot */}
          <clipPath id={clipId}>
            <rect x={PAD_X} y={PAD_Y} width={innerW} height={innerH} rx="0" ry="0" />
          </clipPath>
        </defs>

        {showGrid ? (
          <g clipPath={`url(#${clipId})`}>
            <rect
              x={PAD_X}
              y={PAD_Y}
              width={innerW}
              height={innerH}
              fill={`url(#${dotGridId})`}
              opacity="0.30"
            />
          </g>
        ) : null}

        {/* Active spotlight */}
        {activeBar ? (
          <rect x={activeBar.x} y={0} width={activeBar.w} height={100} fill={NEON_TINT} opacity="0.35" />
        ) : null}

        {mode === "bar" ? (
          <>
            {/* Bars beholdes */}
            {bars.map((b, idx) => {
              const isActive = idx === activeIndex;
              const topRadius = Math.min(6, b.vw * 0.22);
              return (
                <rect
                  key={idx}
                  x={b.vx}
                  y={b.y}
                  width={b.vw}
                  height={b.h}
                  rx={topRadius}
                  ry={topRadius}
                  fill={`url(#${barFillId})`}
                  filter={`url(#${barGlowId})`}
                  opacity={isActive ? 1 : 0.92}
                />
              );
            })}
          </>
        ) : (
          <g clipPath={`url(#${clipId})`}>
            {areaPath ? <path d={areaPath} fill={`url(#${areaId})`} /> : null}

            {/* Highlight markers (e.g., PR points) */}
            {plotPoints.length > 0 && highlightIndices.length > 0
              ? highlightIndices
                  .filter((i) => Number.isFinite(i) && i >= 0 && i < plotPoints.length)
                  .map((i) => {
                    const p = plotPoints[i];
                    return (
                      <g key={`hi-${i}`}>
                        <circle cx={p.x} cy={p.y} r={6.6} fill={NEON_SOFT} opacity="0.22" />
                        <circle cx={p.x} cy={p.y} r={2.4} fill={NEON} filter={`url(#${neonGlowId})`} />
                      </g>
                    );
                  })
              : null}

            {activePt ? (
              <>
                <line
                  x1={activePt.x}
                  y1={PAD_Y}
                  x2={activePt.x}
                  y2={baseY}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="0.8"
                  opacity="0.9"
                />
                <circle cx={activePt.x} cy={activePt.y} r={2.9} fill="rgba(0,0,0,0.55)" />
                <circle cx={activePt.x} cy={activePt.y} r={2.2} fill={NEON} filter={`url(#${neonGlowId})`} />
                <circle cx={activePt.x} cy={activePt.y} r={6.2} fill={NEON_SOFT} opacity="0.35" />
              </>
            ) : null}

            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke={NEON}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.16"
                filter={`url(#${neonGlowId})`}
              />
            ) : null}

            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke={`url(#${lineId})`}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {plotPoints.length === 1 ? (
              <g>
                <line
                  x1={PAD_X}
                  y1={plotPoints[0].y}
                  x2={PAD_X + innerW}
                  y2={plotPoints[0].y}
                  stroke={NEON}
                  strokeWidth="2.2"
                  opacity="0.85"
                />
                <circle
                  cx={plotPoints[0].x}
                  cy={plotPoints[0].y}
                  r={2.8}
                  fill={NEON}
                  filter={`url(#${neonGlowId})`}
                />
              </g>
            ) : null}
          </g>
        )}

        {/* Hit areas */}
        {bars.map((b, idx) => (
          <rect
            key={`hit-${idx}`}
            x={b.x}
            y={0}
            width={b.w}
            height={100}
            fill="transparent"
            pointerEvents="all"
            onPointerMove={(e) => {
              if (locked) return;
              activate(idx);
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              setLocked(true);
              activate(idx);
              e.stopPropagation();
              try {
                (e.currentTarget as SVGRectElement).setPointerCapture(e.pointerId);
              } catch {}
            }}
          />
        ))}
      </svg>

      {n > 0 ? (
        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 8,
            fontSize: 11,
            color: "rgba(255,255,255,0.62)",
            opacity: 0.9,
            userSelect: "none",
          }}
        >
          {locked ? "Låst (dobbelklikk for å nullstille)" : "Hover/tap for detaljer"}
        </div>
      ) : null}
    </div>
  );
}

