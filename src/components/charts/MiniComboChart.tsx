// src/components/MiniComboChart.tsx
import { useId, useMemo, useRef, useState } from "react";

type Props = {
  bars: number[]; // bar values
  line?: number[]; // optional overlay line (same length as bars)

  height?: number; // px
  ariaLabel?: string;

  activeIndex?: number | null;
  onActivate?: (index: number | null) => void;
};

type Pt = { x: number; y: number };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function toFiniteNumber(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// Catmull–Rom → Cubic Bezier (smooth)
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

export function MiniComboChart({
  bars,
  line,
  height = 140,
  ariaLabel = "Combo chart",
  activeIndex = null,
  onActivate,
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [locked, setLocked] = useState(false);

  const safeBars = useMemo(() => (Array.isArray(bars) ? bars : []).map(toFiniteNumber), [bars]);
  const safeLine = useMemo(
    () => (Array.isArray(line) ? line : undefined)?.map(toFiniteNumber),
    [line]
  );

  const n = safeBars.length;

  const { min, max, normBars, normLine } = useMemo(() => {
    const all: number[] = [...safeBars];
    if (safeLine && safeLine.length) all.push(...safeLine);

    const minV = all.length ? Math.min(...all) : 0;
    const maxV = all.length ? Math.max(...all) : 0;
    const span = Math.max(1e-6, maxV - minV);

    const nb = safeBars.map((v) => (v - minV) / span);
    const nl = safeLine ? safeLine.map((v) => (v - minV) / span) : undefined;

    return { min: minV, max: maxV, normBars: nb, normLine: nl };
  }, [safeBars, safeLine]);

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

  const barsGeom = useMemo(() => {
    if (n === 0) return [];
    const colW = 100 / n;
    return normBars.map((p, i) => {
      const x = i * colW;
      const w = colW;
      const h = clamp01(p) * 100;
      const y = 100 - h;
      const visualW = Math.max(2.4, w * 0.68);
      const vx = x + (w - visualW) / 2;
      return { x, w, y, h, vx, vw: visualW, value: safeBars[i] ?? 0 };
    });
  }, [n, normBars, safeBars]);

  const linePts = useMemo<Pt[]>(() => {
    if (!normLine || n === 0) return [];
    if (n === 1) {
      const x = PAD_X;
      const y = PAD_Y + (1 - clamp01(normLine[0] ?? 0)) * innerH;
      return [{ x, y }];
    }
    return normLine.map((p, i) => {
      const x = PAD_X + (i / (n - 1)) * innerW;
      const y = PAD_Y + (1 - clamp01(p)) * innerH;
      return { x, y };
    });
  }, [normLine, n, innerW, innerH]);

  const linePath = useMemo(() => buildSmoothPath(linePts, 0.9), [linePts]);

  const activeBar = activeIndex !== null && activeIndex >= 0 ? barsGeom[activeIndex] : null;
  const activePt = activeIndex !== null && activeIndex >= 0 ? linePts[activeIndex] : null;

  const NEON = "var(--accentHot)";
  const NEON_SOFT = "rgba(var(--accentGlow-rgb), 0.20)";
  const NEON_TINT = "rgba(var(--accentHot-rgb), 0.10)";
  const comboGlowId = `comboGlow-${uid}`;
  const comboDotGridId = `comboDotGrid-${uid}`;
  const comboLineId = `comboLine-${uid}`;
  const comboBarFillId = `comboBarFill-${uid}`;
  const comboBarGlowId = `comboBarGlow-${uid}`;
  const comboClipId = `comboClip-${uid}`;

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height,
        borderRadius: 20,
        border: "1px solid var(--strokeSubtle)",
        background: "linear-gradient(180deg, var(--surface) 0%, #0f1118 100%)",
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(255,255,255,0) 30%)," +
          "radial-gradient(120% 90% at 8% 0%, rgba(92,108,168,0.14) 0%, rgba(0,0,0,0) 56%)," +
          "radial-gradient(120% 90% at 92% 12%, rgba(72,88,148,0.09) 0%, rgba(0,0,0,0) 62%)",
        boxShadow: "var(--cardShadow)",
        overflow: "hidden",
        position: "relative",
        touchAction: "manipulation",
      }}
      aria-label={ariaLabel}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      role="img"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={comboGlowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.9" floodColor="rgba(var(--accentGlow-rgb),0.40)" />
            <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="rgba(var(--accentHot-rgb),0.24)" />
          </filter>

          <pattern id={comboDotGridId} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.6" fill="rgba(255,255,255,0.10)" />
          </pattern>

          <linearGradient id={comboLineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accentGlow)" stopOpacity="0.9" />
            <stop offset="50%" stopColor="var(--accentHot)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accentHot)" stopOpacity="0.92" />
          </linearGradient>

          {/* Bar fill + subtle forge glow (match forgeMeterFill) */}
          <linearGradient id={comboBarFillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accentGlow)" stopOpacity="0.92" />
            <stop offset="22%" stopColor="var(--accentHot)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accentHot)" stopOpacity="0.98" />
          </linearGradient>
          <filter id={comboBarGlowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0.3" stdDeviation="0.7" floodColor="rgba(var(--accentGlow-rgb),0.30)" />
            <feDropShadow dx="0" dy="0.7" stdDeviation="1.2" floodColor="rgba(var(--accentHot-rgb),0.18)" />
          </filter>

          <clipPath id={comboClipId}>
            <rect x={PAD_X} y={PAD_Y} width={innerW} height={innerH} rx="0" ry="0" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${comboClipId})`}>
          <rect x={PAD_X} y={PAD_Y} width={innerW} height={innerH} fill={`url(#${comboDotGridId})`} opacity="0.22" />
        </g>

        {activeBar ? (
          <rect x={activeBar.x} y={0} width={activeBar.w} height={100} fill={NEON_TINT} opacity="0.24" />
        ) : null}

        {barsGeom.map((b, idx) => {
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
              fill={`url(#${comboBarFillId})`}
              filter={`url(#${comboBarGlowId})`}
              opacity={isActive ? 1 : 0.96}
            />
          );
        })}

        {linePath ? (
          <g clipPath={`url(#${comboClipId})`}>
            {activePt ? (
              <>
                <line
                  x1={activePt.x}
                  y1={PAD_Y}
                  x2={activePt.x}
                  y2={baseY}
                  stroke="rgba(237,237,237,0.30)"
                  strokeWidth="0.8"
                  opacity="0.7"
                />
                <circle cx={activePt.x} cy={activePt.y} r={2.6} fill="rgba(0,0,0,0.55)" />
                <circle cx={activePt.x} cy={activePt.y} r={2.0} fill={NEON} filter={`url(#${comboGlowId})`} />
                <circle cx={activePt.x} cy={activePt.y} r={5.4} fill={NEON_SOFT} opacity="0.22" />
              </>
            ) : null}

            <path
              d={linePath}
              fill="none"
              stroke={NEON}
              strokeWidth="4.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.12"
              filter={`url(#${comboGlowId})`}
            />

            <path
              d={linePath}
              fill="none"
              stroke={`url(#${comboLineId})`}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : null}

        {/* Hit areas */}
        {barsGeom.map((b, idx) => (
          <rect key={`hit-${idx}`} x={b.x} y={0} width={b.w} height={100} fill="transparent" />
        ))}
      </svg>
    </div>
  );
}

