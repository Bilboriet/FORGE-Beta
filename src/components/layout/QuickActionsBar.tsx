// src/components/QuickActionsBar.tsx
import type { CSSProperties } from "react";
import { LS_KEYS } from "../../constants";
import { useT } from "../../hooks/useT";

type ShortcutTab = "dashboard" | "log" | "history" | "analytics" | "diet";

function go(tab: ShortcutTab) {
  window.dispatchEvent(new CustomEvent("forge:navigate", { detail: { tab } }));
}

export function ShortcutsBar({ hasSessions }: { hasSessions?: boolean }) {
  const t = useT();
  const computedHasSessions = (() => {
    if (typeof hasSessions === "boolean") return hasSessions;
    try {
      const raw = localStorage.getItem(LS_KEYS.sessions);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  })();
  const btnBase: CSSProperties = {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--text)",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
    transition: "opacity 140ms ease, transform 140ms ease",
  };

  const primary: CSSProperties = {
    ...btnBase,
    border: "1px solid rgba(var(--accentHot-rgb),0.55)",
    background: "var(--redSoft)",
    color: "var(--red)",
  };

  const disabled: CSSProperties = {
    ...btnBase,
    opacity: 0.45,
    cursor: "not-allowed",
  };

  return (
    <div
      className="forge-anim forge-anim--slide"
      style={{
        padding: 12,
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--surface2)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 180 }}>
        <div style={{ color: "var(--text)", fontWeight: 900 }}>{t("dashboard.quickActions.title")}</div>
        <div
          style={{
            color: "var(--muted)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          {computedHasSessions
            ? t("dashboard.quickActions.subtitle.hasSessions")
            : t("dashboard.quickActions.subtitle.noSessions")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" style={btnBase} onClick={() => go("dashboard")}>{t("dashboard.quickActions.dashboard")}</button>
        <button type="button" style={primary} onClick={() => go("log")}>{t("dashboard.quickActions.log")}</button>
        <button
          type="button"
          style={computedHasSessions ? btnBase : disabled}
          onClick={() => (computedHasSessions ? go("history") : null)}
          disabled={!computedHasSessions}
        >
          {t("dashboard.quickActions.history")}
        </button>
        <button
          type="button"
          style={computedHasSessions ? btnBase : disabled}
          onClick={() => (computedHasSessions ? go("analytics") : null)}
          disabled={!computedHasSessions}
        >
          {t("dashboard.quickActions.analytics")}
        </button>
        <button type="button" style={btnBase} onClick={() => go("diet")}>{t("dashboard.quickActions.diet")}</button>
      </div>
    </div>
  );
}

// Backwards-compatible alias (older pages might still import QuickActionsBar)
export const QuickActionsBar = ShortcutsBar;

