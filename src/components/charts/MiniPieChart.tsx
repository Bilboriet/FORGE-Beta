// src/components/MiniPieChart.tsx
import { useId, useMemo } from "react";

export type PieSlice = {
  label: string;
  value: number;
};

type Props = {
  slices: PieSlice[];
  size?: number; // px
  thickness?: number; // px (ring thickness)
  centerLabel?: string;
  centerSubLabel?: string;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startRad: number,
  endRad: number
) {
  const startOuter = polarToCartesian(cx, cy, rOuter, startRad);
  const endOuter = polarToCartesian(cx, cy, rOuter, endRad);
  const startInner = polarToCartesian(cx, cy, rInner, startRad);
  const endInner = polarToCartesian(cx, cy, rInner, endRad);

  const largeArcFlag = endRad - startRad > Math.PI ? 1 : 0;

  // outer arc -> line -> inner arc back -> close
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

export function MiniPieChart({
  slices,
  size = 150,
  thickness = 18,
  centerLabel,
  centerSubLabel,
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const pieGlowId = `pieGlow-${uid}`;
  const safeSlices = useMemo(() => {
    const arr = (Array.isArray(slices) ? slices : [])
      .map((s) => ({
        label: String(s.label ?? ""),
        value: Number.isFinite(s.value) ? s.value : 0,
      }))
      .filter((s) => s.value > 0);

    // sort desc (premium: stable “largest first”)
    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [slices]);

  const total = useMemo(
    () => safeSlices.reduce((sum, s) => sum + s.value, 0),
    [safeSlices]
  );

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = Math.max(1, rOuter - thickness);

  // Forge palette: token-driven heated red tones (no legacy white palette)
  const palette = [
    "var(--accentHot)",
    "rgba(var(--accentHot-rgb), 0.90)",
    "rgba(var(--accentHot-rgb), 0.78)",
    "rgba(var(--accentHot-rgb), 0.62)",
    "rgba(var(--accentHot-rgb), 0.48)",
    "rgba(var(--accentHot-rgb), 0.36)",
  ];

  const arcs = useMemo(() => {
    if (!safeSlices.length || total <= 0) return [];

    const startAt = -Math.PI / 2; // start at top
    let cursor = startAt;

    return safeSlices.map((s, i) => {
      const frac = clamp01(s.value / total);
      const delta = frac * Math.PI * 2;
      const start = cursor;
      const end = cursor + delta;
      cursor = end;

      return {
        ...s,
        frac,
        start,
        end,
        fill: palette[i % palette.length],
      };
    });
  }, [safeSlices, total]);

  if (!safeSlices.length || total <= 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 20,
          border: "1px solid var(--strokeSubtle)",
          background: "linear-gradient(180deg, var(--surface) 0%, #0f1118 100%)",
          backgroundImage:
            "linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(255,255,255,0) 30%)," +
            "radial-gradient(120% 90% at 8% 0%, rgba(92,108,168,0.14) 0%, rgba(0,0,0,0) 56%)," +
            "radial-gradient(120% 90% at 92% 12%, rgba(72,88,148,0.09) 0%, rgba(0,0,0,0) 62%)",
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
          fontSize: 12,
        }}
      >
        Ingen data
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={pieGlowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.9" floodColor="rgba(var(--accentGlow-rgb),0.36)" />
            <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="rgba(var(--accentHot-rgb),0.20)" />
          </filter>
        </defs>
        {/* subtle ring bg */}
        <circle
          cx={cx}
          cy={cy}
          r={(rOuter + rInner) / 2}
          stroke="rgba(var(--accentHot-rgb), 0.14)"
          strokeWidth={rOuter - rInner}
          fill="none"
        />

        {arcs.map((a, idx) => (
          <path
            key={`${a.label}-${idx}`}
            d={arcPath(cx, cy, rOuter, rInner, a.start, a.end)}
            fill={a.fill}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
            filter={`url(#${pieGlowId})`}
          />
        ))}

        {/* center labels */}
        {(centerLabel || centerSubLabel) ? (
          <>
            {centerLabel ? (
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={16}
                fontWeight={950}
                fill="var(--text)"
              >
                {centerLabel}
              </text>
            ) : null}

            {centerSubLabel ? (
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={800}
                fill="var(--muted)"
              >
                {centerSubLabel}
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
    </div>
  );
}
