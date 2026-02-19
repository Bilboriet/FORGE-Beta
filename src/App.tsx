// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav, type TabKey } from "./components/layout/BottomNav";
import { PageMotion } from "./components/layout/Pagemotion";
import { useT } from "./hooks/useT";
import { DashboardPage } from "./pages/DashboardPage";
import { LogPage } from "./pages/LogPage";
import HistoryPage from "./pages/HistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DietPage from "./pages/DietPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LS_KEYS } from "./constants";
import forgeLogo from "./assets/forge_logo_clean.png";

function Page({ tab }: { tab: TabKey }) {
  switch (tab) {
    case "dashboard":
      return <DashboardPage />;
    case "logg":
      return <LogPage />;
    case "historikk":
      return <HistoryPage />;
    case "analyse":
      return <AnalyticsPage />;
    case "diett":
      return <DietPage />;
    case "innstillinger":
      return <SettingsPage />;
    default:
      return <LogPage />;
  }
}

type QuickTab = "log" | "history" | "analytics";

function quickTabToTabKey(t: QuickTab): TabKey {
  switch (t) {
    case "log":
      return "logg";
    case "history":
      return "historikk";
    case "analytics":
      return "analyse";
    default:
      return "dashboard";
  }
}

export default function App() {
  const tr = useT();

  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const rawDraft = localStorage.getItem(LS_KEYS.log_draft_v1);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && Array.isArray(draft.exercises) && draft.exercises.length > 0) return "logg";
      }
      const raw = localStorage.getItem(LS_KEYS.active_tab_v1);
      if (!raw) return "dashboard";
      const t = raw as TabKey;
      const allowed: TabKey[] = ["dashboard", "logg", "historikk", "analyse", "diett", "innstillinger"];
      return allowed.includes(t) ? t : "dashboard";
    } catch {
      return "dashboard";
    }
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      const rawDraft = localStorage.getItem(LS_KEYS.log_draft_v1);
      if (!rawDraft) return false;
      const draft = JSON.parse(rawDraft);
      return !!(draft && Array.isArray(draft.exercises) && draft.exercises.length > 0);
    } catch {
      return false;
    }
  });

  const navOverrideRef = useRef(false);
  const scrollPositionsRef = useRef<Partial<Record<TabKey, number>>>({});
  const prevTabRef = useRef<TabKey>(tab);

  useEffect(() => {
    const onDraft = (ev: Event) => {
      const ce = ev as CustomEvent<{ hasDraft?: boolean }>;
      if (typeof ce.detail?.hasDraft === "boolean") setHasDraft(ce.detail.hasDraft);
    };
    window.addEventListener("forge:draft", onDraft as EventListener);
    return () => window.removeEventListener("forge:draft", onDraft as EventListener);
  }, []);

  useEffect(() => {
    const onNavigate = (ev: Event) => {
      const ce = ev as CustomEvent<{ tab?: QuickTab }>;
      const target = ce.detail?.tab;
      if (!target) return;
      navOverrideRef.current = true;
      setTab(quickTabToTabKey(target));
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("forge:navigate", onNavigate as EventListener);
    return () => window.removeEventListener("forge:navigate", onNavigate as EventListener);
  }, []);

  // Remember/restore scroll position per tab (mobile-friendly "app feel")
  useEffect(() => {
    const prev = prevTabRef.current;
    scrollPositionsRef.current[prev] = window.scrollY || 0;
    const nextY = scrollPositionsRef.current[tab] ?? 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: nextY, behavior: "auto" });
    });
    prevTabRef.current = tab;
  }, [tab]);

  // Global route-change signal for transient overlays/modals.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("forge:tab-change", { detail: { tab } }));
  }, [tab]);

  const motionVariant = useMemo(() => {
    return tab === "logg" ? ("slide" as const) : ("fade" as const);
  }, [tab]);

  const pageLabel = useMemo(() => {
    switch (tab) {
      case "dashboard":
        return tr("tab.dashboard");
      case "logg":
        return tr("tab.log");
      case "historikk":
        return tr("tab.history");
      case "analyse":
        return tr("tab.analytics");
      case "diett":
        return tr("tab.diet");
      case "innstillinger":
        return tr("tab.settings");
      default:
        return "";
    }
  }, [tab, tr]);

  return (
    <div className="forgeShell">
      <header className="forgeTopBar">
        <div className="forgeTopBarInner">
          <div className="forge-logo-wrap">
            <img src={forgeLogo} alt="FORGE" className="forge-logo-img" />
          </div>
          <span className="forgeBrandSub">V1</span>
        </div>
      </header>

      <div className="forge-pageLabel">{pageLabel}</div>

      <main className="forgeMain">
        <PageMotion key={String(tab)} variant={motionVariant}>
          <Page tab={tab} />
        </PageMotion>
      </main>

      <BottomNav active={tab} onChange={setTab} hasDraft={hasDraft} />
    </div>
  );
}
