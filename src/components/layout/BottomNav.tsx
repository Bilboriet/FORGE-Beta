// src/components/BottomNav.tsx
import { useEffect, useRef } from "react";
import { useT } from "../../hooks/useT";

export type TabKey =
  | "dashboard"
  | "logg"
  | "historikk"
  | "analyse"
  | "kropp"
  | "database"
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
    { key: "kropp", label: "Body" },
    { key: "database", label: "Database" },
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
    <nav className="forge-bottomnav">
      <div className="forge-bottomnav__inner" ref={scrollRef}>
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
              aria-current={isActive ? "page" : undefined}
              className={`forge-tab ${isActive ? "forge-tab--hot" : "forge-tab--cold"}`}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textShadow: isActive
                    ? "0 0 4px rgba(181, 81, 57, 0.24)"
                    : "none",
                }}
              >
                <span>{tab.label}</span>
                {hasDraft && tab.key === "logg" && (
                  <span
                    title={tr("nav.draft.title")}
                    className="forge-bottomnav__draft"
                  >
                    {tr("nav.draft.badge")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
