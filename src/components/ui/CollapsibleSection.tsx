// src/components/CollapsibleSection.tsx
import { useMemo, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const headerStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 12,
      borderRadius: 14,
      border: "1px solid var(--border)",
      background: "var(--surface2)",
      cursor: "pointer",
      userSelect: "none",
      textAlign: "left",
    }),
    []
  );

  const chevronStyle = useMemo<React.CSSProperties>(
    () => ({
      width: 28,
      height: 28,
      borderRadius: 10,
      display: "grid",
      placeItems: "center",
      border: "1px solid var(--border)",
      background: "var(--surface2)",
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 200ms ease",
    }),
    [open]
  );

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={headerStyle}
        aria-expanded={open}
      >
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <div style={{ color: "var(--text)", fontWeight: 950 }}>
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                color: "var(--muted)",
                fontSize: 12,
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={chevronStyle} aria-hidden="true">
          {/* Enkel chevron uten ikonlib */}
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="M6.5 9.5L12 15l5.5-5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {open ? (
        <div style={{ display: "grid", gap: 12 }}>{children}</div>
      ) : null}
    </section>
  );
}
