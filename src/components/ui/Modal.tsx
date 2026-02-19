// src/components/Modal.tsx
import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthPx?: number; // default 520
};

export function Modal({ open, title, onClose, children, footer, widthPx = 520 }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onTabChange = () => onClose();
    window.addEventListener("forge:tab-change", onTabChange as EventListener);
    return () => window.removeEventListener("forge:tab-change", onTabChange as EventListener);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.62)",
        display: "grid",
        placeItems: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          width: "min(100%, " + widthPx + "px)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            padding: "14px 14px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(10,10,10,0.92)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 16, color: "var(--text)" }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)",
              borderRadius: 12,
              padding: "8px 10px",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 14, display: "grid", gap: 12 }}>{children}</div>

        {footer ? (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              padding: 14,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(10,10,10,0.92)",
              backdropFilter: "blur(12px)",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
