// src/components/BottomNav.tsx
import { useEffect, useRef } from "react";
import { useT } from "../../hooks/useT";

export type TabKey =
  | "dashboard"
  | "logg"
  | "historikk"
  | "analyse"
  | "diett"
  | "innstillinger";

export function BottomNav({
  active,
  onChange,
  hasDraft = false,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  hasDraft?: boolean;
}) {
  // translation helper (NO fallback happens inside useT)
  const tr = useT();

  const tabs: { key: TabKey; label: string }[] = [
    { key: "dashboard", label: tr("tab.dashboard") },
    { key: "logg", label: tr("tab.log") },
    { key: "historikk", label: tr("tab.history") },
    { key: "analyse", label: tr("tab.analytics") },
    { key: "diett", label: tr("tab.diet") },
    { key: "innstillinger", label: tr("tab.settings") },
  ];


  const scrollRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});


  useEffect(() => {
    const el = scrollRef.current;
    const btn = btnRefs.current[active];
    if (!el || !btn) return;

    const elRect = el.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    if (btnRect.left < elRect.left || btnRect.right > elRect.right) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    // Don't vibrate here (Chrome blocks it until a user gesture). We vibrate onClick instead.
  }, [active]);

  return (
    <nav className="forge-bottom-nav">
      <div className="forge-bottom-nav__edge forge-bottom-nav__edge--left" />
      <div className="forge-bottom-nav__edge forge-bottom-nav__edge--right" />
      <style>{`
        .bottom-nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ position: "relative" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 18,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(11,11,15,0.92), rgba(11,11,15,0))",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 18,
            pointerEvents: "none",
            background:
              "linear-gradient(270deg, rgba(11,11,15,0.92), rgba(11,11,15,0))",
          }}
        />
        <div
        className="bottom-nav-scroll"
        ref={scrollRef}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          gap: 8,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          paddingInline: 6,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              ref={(el) => {
                btnRefs.current[tab.key] = el;
              }}
              onClick={() => {
                try {
                  // light haptics on supported mobile devices
                  (navigator as any)?.vibrate?.(10);
                } catch {
                  // ignore
                }
                onChange(tab.key);
              }}
              style={{
                padding: "10px 10px",
                minWidth: 96,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
              className={`forge-btn forge-btn--sm ${isActive ? "forge-btn--hot" : "forge-btn--metal"}`}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textShadow: isActive
                    ? "var(--forge-glow-soft)"
                    : "none",
                }}
              >
                <span>{tab.label}</span>
                {hasDraft && tab.key === "logg" && (
                  <span
                    title={tr("nav.draft.title")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 6px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 900,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.08)",
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tr("nav.draft.badge")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
