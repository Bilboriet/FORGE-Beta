// src/components/MiniDualLineChart.tsx
import { useMemo, useRef, useState } from "react";

type Props = {
  a: number[];
  b: number[];
  height?: number;
  ariaLabel?: string;

  aLabel?: string;
  bLabel?: string;

  activeIndex?: number | null;
  onActivate?: (index: number | null) => void;
};

type Pt = { x: number; y: number };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function toFinite(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

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

export function MiniDualLineChart({
  a,
  b,
  height = 96,
  ariaLabel = "Mini dual line chart",
  aLabel = "7d",
  bLabel = "28d",
  activeIndex = null,
  onActivate,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [locked, setLocked] = useState(false);

  const { safeA, safeB, normA, normB, min, max } = useMemo(() => {
    const safeA = (Array.isArray(a) ? a : []).map(toFinite);
    const safeB = (Array.isArray(b) ? b : []).map(toFinite);
    const n = Math.max(safeA.length, safeB.length);

    const all = [...safeA, ...safeB];
    const min = all.length ? Math.min(...all) : 0;
    const max = all.length ? Math.max(...all) : 0;
    const span = Math.max(1e-6, max - min);

    const padTo = (arr: number[]) => {
      if (arr.length === n) return arr;
      const out = arr.slice();
      while (out.length < n) out.push(0);
      return out;
    };

    const A = padTo(safeA);
    const B = padTo(safeB);

    const normA = A.map((v) => (v - min) / span);
    const normB = B.map((v) => (v - min) / span);

    return { safeA: A, safeB: B, normA, normB, min, max };
  }, [a, b]);

  const n = Math.max(safeA.length, safeB.length);

  const PAD_X = 6;
  const PAD_Y = 8;
  const innerW = 100 - PAD_X * 2;
  const innerH = 100 - PAD_Y * 2;

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

  const ptsA = useMemo<Pt[]>(() => {
    if (n === 0) return [];
    if (n === 1) {
      const x = PAD_X;
      const y = PAD_Y + (1 - clamp01(normA[0] ?? 0)) * innerH;
      return [{ x, y }];
    }
    return normA.map((p, i) => {
      const x = PAD_X + (i / (n - 1)) * innerW;
      const y = PAD_Y + (1 - clamp01(p)) * innerH;
      return { x, y };
    });
  }, [n, normA, innerW, innerH]);

  const ptsB = useMemo<Pt[]>(() => {
    if (n === 0) return [];
    if (n === 1) {
      const x = PAD_X;
      const y = PAD_Y + (1 - clamp01(normB[0] ?? 0)) * innerH;
      return [{ x, y }];
    }
    return normB.map((p, i) => {
      const x = PAD_X + (i / (n - 1)) * innerW;
      const y = PAD_Y + (1 - clamp01(p)) * innerH;
      return { x, y };
    });
  }, [n, normB, innerW, innerH]);

  const pathA = useMemo(() => buildSmoothPath(ptsA, 0.9), [ptsA]);
  const pathB = useMemo(() => buildSmoothPath(ptsB, 0.9), [ptsB]);

  const activePtA = activeIndex !== null && activeIndex >= 0 ? ptsA[activeIndex] : null;
  const activePtB = activeIndex !== null && activeIndex >= 0 ? ptsB[activeIndex] : null;

  // color: use same red family for A, muted for B
  const A_COL = "var(--forge-red)";
  const A_SOFT = "rgba(255, 80, 40, 0.28)";
  const B_COL = "rgba(122, 15, 22, 0.78)";

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
      title={n === 0 ? "Ingen data" : `Min: ${Math.round(min)} • Max: ${Math.round(max)} • Punkter: ${n}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      role="img"
    >
      {/* legend */}
      <div
        style={{
          position: "absolute",
          right: 12,
          top: 10,
          display: "flex",
          gap: 10,
          fontSize: 12,
          color: "rgba(255,255,255,0.82)",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          padding: "6px 8px",
        }}
      >
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 3, borderRadius: 99, background: A_COL }} />
          {aLabel}
        </span>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 3, borderRadius: 99, background: B_COL }} />
          {bLabel}
        </span>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="dualGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="var(--forge-red-hot)" />
            <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="var(--forge-red-mid)" />
            <feDropShadow dx="0" dy="0" stdDeviation="2.8" floodColor="var(--forge-red-deep)" />
          </filter>

          <clipPath id="dualClip">
            <rect x={PAD_X} y={PAD_Y} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        <g clipPath="url(#dualClip)">
          {pathB ? (
            <path
              d={pathB}
              fill="none"
              stroke={B_COL}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          ) : null}

          {pathA ? (
            <path
              d={pathA}
              fill="none"
              stroke={A_COL}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#dualGlow)"
              opacity="0.95"
            />
          ) : null}

          {activePtA ? (
            <>
              <circle cx={activePtA.x} cy={activePtA.y} r={6.0} fill={A_SOFT} opacity="0.32" />
              <circle cx={activePtA.x} cy={activePtA.y} r={2.2} fill={A_COL} filter="url(#dualGlow)" />
            </>
          ) : null}

          {activePtB ? (
            <>
              <circle cx={activePtB.x} cy={activePtB.y} r={2.0} fill={B_COL} opacity="0.95" />
            </>
          ) : null}
        </g>
      </svg>
    </div>
  );
}

