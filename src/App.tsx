// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav, type TabKey } from "./components/layout/BottomNav";
import { PageMotion } from "./components/layout/Pagemotion";
import { useT } from "./hooks/useT";
import { DashboardPage } from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import BodyPageV2 from "./pages/BodyPageV2";
import DietPage from "./pages/DietPage";
import ExerciseDatabasePage from "./pages/ExerciseDatabasePage";
import { SettingsPage } from "./pages/SettingsPage";
import { LS_KEYS } from "./constants";
import { LogPageV2 } from "./pages/LogPageV2";
import { WORKOUT_V2_KEYS } from "./lib/workoutUtils";

function Page({ tab }: { tab: TabKey }) {
  switch (tab) {
    case "dashboard":
      return <DashboardPage />;
    case "logg":
      return <LogPageV2 />;
    case "historikk":
      return <HistoryPage />;
    case "analyse":
      return <AnalyticsPage />;
    case "kropp":
      return <BodyPageV2 />;
    case "database":
      return <ExerciseDatabasePage />;
    case "diett":
      return <DietPage />;
    case "innstillinger":
      return <SettingsPage />;
    default:
      return <LogPageV2 />;
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
  const [startupNoticeOpen, setStartupNoticeOpen] = useState(true);

  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const rawDraft = localStorage.getItem(LS_KEYS.log_draft_v1);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && Array.isArray(draft.exercises) && draft.exercises.length > 0) return "logg";
      }
      const rawV2Draft = localStorage.getItem(WORKOUT_V2_KEYS.currentDraft);
      if (rawV2Draft) {
        const draft = JSON.parse(rawV2Draft);
        if (draft && Array.isArray(draft.exercises) && draft.exercises.length > 0) return "logg";
      }
      const raw = localStorage.getItem(LS_KEYS.active_tab_v1);
      if (!raw) return "dashboard";
      const t = raw as TabKey;
      const allowed: TabKey[] = ["dashboard", "logg", "historikk", "analyse", "kropp", "database", "diett", "innstillinger"];
      return allowed.includes(t) ? t : "dashboard";
    } catch {
      return "dashboard";
    }
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      const rawDraft = localStorage.getItem(LS_KEYS.log_draft_v1);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && Array.isArray(draft.exercises) && draft.exercises.length > 0) return true;
      }
      const rawV2Draft = localStorage.getItem(WORKOUT_V2_KEYS.currentDraft);
      if (!rawV2Draft) return false;
      const draft = JSON.parse(rawV2Draft);
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
      case "kropp":
        return "Body";
      case "database":
        return "Exercise Database";
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
      <header className="forgeHeader">
        <div className="forgeTopBarInner">
          <div className="forge-logo-wrap">
            <p className="forgeBrand">FORGE</p>
          </div>
        </div>
      </header>

      <div className="forge-pageLabel">{pageLabel}</div>

      <main className="forgeMain">
        <PageMotion key={String(tab)} variant={motionVariant}>
          <Page tab={tab} />
        </PageMotion>
      </main>

      <BottomNav active={tab} onChange={setTab} hasDraft={hasDraft} />

      {startupNoticeOpen ? (
        <div className="forge-introOverlay" role="dialog" aria-modal="true" aria-label="Notice">
          <section className="forge-introPanel">
            <div className="forge-introContent">
              <h2 className="forge-introTitle">WELCOME TO FORGE</h2>
              <div className="forge-introText">
                <p><strong>DEV NOTES!</strong></p>
                <p>The app is in the stages of early development.</p>

                <p><strong>Notice</strong></p>
                <p>
                  FORGE is under development. everything is subject to change.
                  Remember to save your data by signing in via magic link. you can find it in settings.
                  A more personalized user-account system is being built soon. this is where you will fill
                  out yor body weight, hight etc. In order for the FORGE to make correct workout-calculations.
                </p>

                <p><strong>NEWS</strong></p>
                <p><strong>BODYPAGE</strong></p>
                <p>
                  -Bodypage was recently added: it&apos;s stimuli-engine is still being tuned. During this
                  period, Bodyapge may seem somewhat unstable. The Bodypage will be the heart of the app,
                  and the engine that works underneath has been built in order to map the stimuli your muscles
                  recieve, based on factors such as the movement pattern of the logged exersice. The individual
                  exersices is also tuned with stimuli-biases based on the given exersice: For eksample, one
                  exersise might hit the biceps long head, while another exercis gives greater stimulation to
                  the biceps short head. The engine takes all this and more into account in order to distribute
                  stimuli to the muscles in a comprehensive and realistic way, Although the engine is built.
                  the need for extensive testing and tuning is required for making the muscle map model as
                  accurate as possible. We are still in the early stages of testing and tuning, and many exiting
                  and usefull functions are going to be built on top of this muscle-map in order to let the users
                  have a full overview of everything related to stimuli, recovery, progress and growth. This is
                  the tool for ultimate musclebalance and body overview in relation to your personal training.
                </p>
                <p>
                  -MUSCLE MAP with ZONES in bodypage. This is the visual information that gives you an imediate
                  overview and idea of how your work out-day/week/month/year/ is going so far. The musclezones
                  will glow if they have newly been trained. the level of glow is determined by how hard they
                  have worked during the given period of time. this will give you the ability to get a 1 second
                  glanse assessment on how your current week is going and what you have accomplished so far. In
                  addition it gives you the ability to spot any blind zones on the bodymap that you might
                  othervise tend to miss while working out, thereby giving you the tool needed to impliment
                  possitive changes to your workout routine and therefore improve your strenght/phsiqye or
                  whatever else your goal is.
                </p>
                <p>
                  -When a muscle zone is pressed, a module will open with information related to the muscle.
                  This information is currently somewhat mathemathical, but will be made more digestable shortly.
                </p>
                <p>
                  -within this modul, exercise-propositions for training the selected muscle will also be listed,
                  thereby making it easyer for the user to plan out a new workout routine, or for a new lifter to
                  easily find his or her way around the gym. within theese modules, detailed information about your
                  muscle can be wieved.
                </p>

                <p><strong>SMARTER FORGE COACH</strong></p>
                <p>
                  - Experimental Forgecoach recently added. The coach is designed to work with the exercise
                  database and Bodypage. The goal is to make it calculate suggestions based on your input stats.
                  The stats will accumulate over time, thereby giving the coach more data and the ability to make
                  more correct assessments. this is an experimental feauture and will be fine tuned in the coming
                  weeks. The FORGE coach will make suggestions to for eksample increase or decrease your sets during
                  a week in order to have a more balanced workout . As of now it enters testing and will make false
                  suggestions or remarks. this is why good feedback and information can make a world of differance.
                </p>
                <p><strong>Visual design is not final!</strong></p>
              </div>
            </div>
            <div className="forge-introActions">
              <button
                className="forge-btn forge-btn--hot"
                onClick={() => {
                  setStartupNoticeOpen(false);
                }}
              >
                OK
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
