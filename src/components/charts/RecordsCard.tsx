// src/components/RecordsCard.tsx
import type { ReactNode } from "react";

export type RecordRow = {
  label: string;
  value: string;
  badge?: string; // optional small badge (e.g. "PR")
};

function Row({ label, value, badge }: RecordRow) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "10px 2px",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {badge ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              padding: "2px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,59,59,0.35)",
              background: "rgba(255,59,59,0.10)",
              color: "var(--red)",
            }}
          >
            {badge}
          </span>
        ) : null}
        <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 900 }}>{value}</div>
      </div>
    </div>
  );
}

export function RecordsCard({
  title = "🏆 Records",
  rows,
  footer,
}: {
  title?: string;
  rows: RecordRow[];
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 16,
        background: "var(--card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
      </div>

      <div style={{ padding: "6px 14px" }}>
        {rows.map((r, idx) => (
          <div key={`${r.label}-${idx}`}>
            <Row {...r} />
            {idx !== rows.length - 1 ? (
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
            ) : null}
          </div>
        ))}
      </div>

      {footer ? (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
