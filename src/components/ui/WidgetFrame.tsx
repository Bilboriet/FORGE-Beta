type WidgetFrameProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  density?: "tight" | "base" | "roomy";
  collapsed?: boolean;
  minimized?: boolean;
  onToggleCollapsed?: () => void;
  onToggleMinimized?: () => void;
  onHide?: () => void;
  canWiden?: boolean;
  wide?: boolean;
  onToggleWide?: () => void;
  dragHandleAttributes?: Record<string, unknown>;
  dragHandleListeners?: Record<string, unknown>;
  rootDragAttributes?: Record<string, unknown>;
  rootDragListeners?: Record<string, unknown>;
  isDragging?: boolean;
  minimizedView?: React.ReactNode;
};

export function WidgetFrame({
  children,
  title,
  subtitle,
  className,
  density = "base",
  collapsed = false,
  minimized = false,
  onToggleCollapsed,
  onToggleMinimized,
  onHide,
  canWiden = false,
  wide = false,
  onToggleWide,
  dragHandleAttributes,
  dragHandleListeners,
  rootDragAttributes,
  rootDragListeners,
  isDragging = false,
  minimizedView,
}: WidgetFrameProps) {
  const padClass =
    density === "tight"
      ? "forge-surface--tight"
      : density === "roomy"
      ? "forge-surface--roomy"
      : "forge-surface--base";

  const showToolbar =
    !!onToggleCollapsed || !!onToggleMinimized || !!onHide || (canWiden && !!onToggleWide);
  const showDragHandle = !!dragHandleAttributes || !!dragHandleListeners;

  return (
    <div
      className={`forge-surface ${padClass} ${className ?? ""}`}
      style={{
        display: "grid",
        gap: 8,
        opacity: isDragging ? 0.86 : 1,
        cursor: rootDragListeners ? "grab" : undefined,
      }}
      {...(rootDragAttributes ?? {})}
      {...(rootDragListeners ?? {})}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
            <div className="kpiLabel">{title}</div>
            {subtitle ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {showDragHandle ? (
              <button
                type="button"
                aria-label="Drag widget"
                title="Drag widget"
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: "6px 8px",
                  cursor: "grab",
                }}
                {...(dragHandleAttributes ?? {})}
                {...(dragHandleListeners ?? {})}
              >
                DRAG
              </button>
            ) : null}

            {canWiden && onToggleWide ? (
              <button
                type="button"
                onClick={onToggleWide}
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                {wide ? "BASE" : "WIDE"}
              </button>
            ) : null}

            {onToggleCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapsed}
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                {collapsed ? "OPEN" : "COLLAPSE"}
              </button>
            ) : null}

            {onToggleMinimized ? (
              <button
                type="button"
                onClick={onToggleMinimized}
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                {minimized ? "EXPAND" : "MIN"}
              </button>
            ) : null}

            {onHide ? (
              <button
                type="button"
                onClick={onHide}
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                HIDE
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!collapsed ? (
        <div>{minimized && minimizedView ? minimizedView : children}</div>
      ) : null}

      {!showToolbar && (collapsed || minimized) ? (
        <div>{children}</div>
      ) : null}
    </div>
  );
}
