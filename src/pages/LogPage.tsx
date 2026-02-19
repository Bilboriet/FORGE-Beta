import { useEffect, useMemo, useRef, useState } from "react";
import { EXERCISE_LIBRARY } from "../exerciseLibrary";
import { ExercisePickerModal } from "../components/ui/ExercisePickerModal";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useForgeSettings } from "../hooks/useForgeSettings";
import { useT } from "../hooks/useT";
import { CoachCard } from "../components/ui/CoachCard";
import type { ExerciseBlock, ExerciseRef, SetLog, WorkoutSession, WorkoutTemplate } from "../types";
import { estimate1RM_Epley, sortByDateDesc, workoutVolume } from "../utils";
import { LS_KEYS } from "../constants";
import { formatWeightFromKg, formatLoadCompactFromKg, parseWeightInputToKg, unitLabel } from "../units";

function newId() {
  // crypto.randomUUID() finnes ikke i alle miljøer (noen embedded/webviews).
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }
  // Fallback: ikke-kryptografisk, men stabil nok for local-only IDs
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyWorkout(): WorkoutSession {
  return {
    id: newId(),
    date: todayISO(),
    title: "",
    exercises: [],
  };
}


/** -----------------------------
 * PR helpers (local-only)
 * ----------------------------- */
type TopSet = { weightKg: number; reps: number };
type ExerciseBests = { topSet?: TopSet; best1RM?: number; bestVolume?: number };

type PRToast = {
  id: string;
  title: string;
  subtitle?: string;
  phase: "in" | "out";
};

function betterTopSet(a: TopSet, b: TopSet): boolean {
  if (a.weightKg !== b.weightKg) return a.weightKg > b.weightKg;
  return a.reps > b.reps;
}

function safe1RM(weightKg: number, reps: number): number {
  return estimate1RM_Epley(weightKg, reps) ?? 0;
}

function computeWorkoutBests(
  workout: WorkoutSession
): Map<string, { ex: ExerciseRef; bests: ExerciseBests }> {
  const map = new Map<string, { ex: ExerciseRef; bests: ExerciseBests }>();

  for (const block of workout.exercises ?? []) {
    const ex = block.exercise;
    const sets = block.sets ?? [];

    // Top set
    let top: TopSet | undefined;
    for (const s of sets) {
      const cand: TopSet = {
        weightKg: Number(s.weightKg) || 0,
        reps: Number(s.reps) || 0,
      };
      if (!top || betterTopSet(cand, top)) top = cand;
    }

    // Best e1RM
    let best1RM = 0;
    for (const s of sets) {
      const e = safe1RM(Number(s.weightKg) || 0, Number(s.reps) || 0);
      if (e > best1RM) best1RM = e;
    }

    // Volume
    const vol = sets.reduce(
      (sum, s) => sum + (Number(s.weightKg) || 0) * (Number(s.reps) || 0),
      0
    );

    map.set(ex.id, {
      ex,
      bests: {
        topSet: top,
        best1RM: best1RM > 0 ? best1RM : undefined,
        bestVolume: vol > 0 ? vol : undefined,
      },
    });
  }

  return map;
}

function computeHistoryBests(sessions: WorkoutSession[]): Map<string, ExerciseBests> {
  const bests = new Map<string, ExerciseBests>();

  for (const sesh of sessions ?? []) {
    for (const block of sesh.exercises ?? []) {
      const exId = block.exercise?.id;
      if (!exId) continue;

      const curr = bests.get(exId) ?? {};
      const sets = block.sets ?? [];

      // Top set
      for (const s of sets) {
        const cand: TopSet = {
          weightKg: Number(s.weightKg) || 0,
          reps: Number(s.reps) || 0,
        };
        if (!curr.topSet || betterTopSet(cand, curr.topSet)) curr.topSet = cand;
      }

      // e1RM
      for (const s of sets) {
        const e = safe1RM(Number(s.weightKg) || 0, Number(s.reps) || 0);
        if (!curr.best1RM || e > curr.best1RM) curr.best1RM = e;
      }

      // Volume (per session per exercise)
      const vol = sets.reduce(
        (sum, s) => sum + (Number(s.weightKg) || 0) * (Number(s.reps) || 0),
        0
      );
      if (!curr.bestVolume || vol > curr.bestVolume) curr.bestVolume = vol;

      bests.set(exId, curr);
    }
  }

  return bests;
}

type PRHit = {
  exerciseName: string;
  kind: "top" | "e1rm" | "vol";
  // canonical values in KG (UI formats via settings)
  weightKg?: number;
  reps?: number;
  valueKg?: number;
};

function detectPRsForWorkout(workout: WorkoutSession, previousSessions: WorkoutSession[]) {
  const historyBests = computeHistoryBests(previousSessions);
  const currentBests = computeWorkoutBests(workout);

  const hits: PRHit[] = [];

  for (const [, { ex, bests }] of currentBests.entries()) {
    const hist = historyBests.get(ex.id) ?? {};

    // Top set PR
    if (bests.topSet) {
      const prev = hist.topSet;
      const isPR = !prev || betterTopSet(bests.topSet, prev);
      if (isPR) {
        hits.push({
          exerciseName: ex.name,
          kind: "top",
          weightKg: bests.topSet.weightKg,
          reps: bests.topSet.reps,
        });
      }
    }

    // e1RM PR
    if (typeof bests.best1RM === "number" && bests.best1RM > 0) {
      const prev = hist.best1RM ?? 0;
      if (bests.best1RM > prev + 0.0001) {
        hits.push({
          exerciseName: ex.name,
          kind: "e1rm",
          valueKg: bests.best1RM,
        });
      }
    }

    // Exercise volume PR
    if (typeof bests.bestVolume === "number" && bests.bestVolume > 0) {
      const prev = hist.bestVolume ?? 0;
      if (bests.bestVolume > prev + 0.0001) {
        hits.push({
          exerciseName: ex.name,
          kind: "vol",
          valueKg: bests.bestVolume,
        });
      }
    }
  }

  return { hits, prCount: hits.length };
}

function computeSessionPRFlags(sessions: WorkoutSession[]): Set<string> {
  const sorted = sortByDateDesc(sessions);
  const prIds = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const older = sorted.slice(i + 1);
    const res = detectPRsForWorkout(current, older);
    if (res.prCount > 0) prIds.add(current.id);
  }

  return prIds;
}

function buildAggregateToast(
  hits: PRHit[],
  t: (key: string) => string
): { title: string; subtitle: string } {
  // Group by exercise name, keep kinds for each.
  const byExercise = new Map<string, Set<PRHit["kind"]>>();
  for (const h of hits) {
    const set = byExercise.get(h.exerciseName) ?? new Set<PRHit["kind"]>();
    set.add(h.kind);
    byExercise.set(h.exerciseName, set);
  }

  const exercises = [...byExercise.keys()];
  const topThree = exercises.slice(0, 3);
  const extra = exercises.length - topThree.length;

  const kindLabel = (k: PRHit["kind"]) =>
    k === "top"
      ? t("log.pr.kind.top")
      : k === "e1rm"
      ? t("log.pr.kind.e1rm")
      : t("log.pr.kind.vol");

  const order: PRHit["kind"][] = ["top", "e1rm", "vol"];

  const parts = topThree.map((name) => {
    const kinds = [...(byExercise.get(name) ?? new Set())];
    kinds.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return `${name} (${kinds.map(kindLabel).join(" / ")})`;
  });

  const more = extra > 0 ? ` • ${t("log.pr.more").replace("{n}", String(extra))}` : "";
  const subtitle = parts.join(" • ") + more;

  const title =
    hits.length === 1 ? t("log.pr.toast.single") : t("log.pr.toast.multi");

  return { title, subtitle };
}



export function LogPage() {
  const t = useT();
  const [sessions, setSessions] = useLocalStorage<WorkoutSession[]>(LS_KEYS.sessions, []);
  const [draft, setDraft] = useLocalStorage<WorkoutSession | null>(LS_KEYS.log_draft_v1, null);
  const [sleep, setSleep] = useLocalStorage<any[]>(LS_KEYS.sleep_v1, []);
  const [templates, setTemplates] = useLocalStorage<WorkoutTemplate[]>(LS_KEYS.templates, []);


  const [settings] = useForgeSettings();
  const units = settings?.units ?? "kg";
  const [workout, setWorkout] = useState<WorkoutSession>(createEmptyWorkout());
  const [setInputs, setSetInputs] = useState<Record<string, { reps?: string; weight?: string }>>({});
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateExerciseIds, setTemplateExerciseIds] = useState<string[]>([]);

  
  const sleepBtnRef = useRef<HTMLButtonElement | null>(null);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepBedtime, setSleepBedtime] = useState("");
  const [sleepWakeTime, setSleepWakeTime] = useState("");
  const [sleepQuality, setSleepQuality] = useState<string>("");
  const [sleepPos, setSleepPos] = useState<{ left: number; top: number } | null>(null);

const [pickerOpen, setPickerOpen] = useState(false);

  // UX: when adding exercises, keep the picker at the top so the user
  // doesn't have to scroll back up between additions.
  useEffect(() => {
    if (pickerOpen) {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
    }
  }, [pickerOpen]);
  const [pickedExercise, setPickedExercise] = useState<ExerciseRef | null>(
    EXERCISE_LIBRARY[0] ?? null
  );

  const [prToast, setPrToast] = useState<PRToast | null>(null);
  const toastTimersRef = useRef<number[]>([]);

  const [savePRBadgeCount, setSavePRBadgeCount] = useState<number>(0);
  const pendingAddedBlockIdRef = useRef<string | null>(null);
  const addedBlockRef = useRef<HTMLDivElement | null>(null);


// Restore in-progress workout draft (so it survives app/background/reload)
useEffect(() => {
  if (draft && Array.isArray(draft.exercises) && draft.exercises.length > 0) {
    setWorkout(draft);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Persist draft while logging (cleared automatically when workout is empty)
useEffect(() => {
  const hasContent =
    (workout.title && workout.title.trim().length > 0) ||
    (Array.isArray(workout.exercises) && workout.exercises.length > 0);

  if (hasContent) setDraft(workout);
  else setDraft(null);

  // Notify app shell (BottomNav badge / resume behavior)
  window.dispatchEvent(
    new CustomEvent("forge:draft", { detail: { hasDraft: hasContent } })
  );
}, [workout, setDraft]);

useEffect(() => {
  if (!pendingAddedBlockIdRef.current || !addedBlockRef.current) return;
  try {
    addedBlockRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    addedBlockRef.current.scrollIntoView();
  }
  pendingAddedBlockIdRef.current = null;
}, [workout.exercises]);


  // Toast timing: visible 10s (fade out last 0.6s)
  useEffect(() => {
    // clear previous timers
    toastTimersRef.current.forEach((id) => window.clearTimeout(id));
    toastTimersRef.current = [];

    if (!prToast) return;

    const exitId = window.setTimeout(() => {
      setPrToast((prev) => (prev ? { ...prev, phase: "out" } : prev));
    }, 9400);

    const removeId = window.setTimeout(() => {
      setPrToast(null);
    }, 10000);

    toastTimersRef.current = [exitId, removeId];

    return () => {
      toastTimersRef.current.forEach((id) => window.clearTimeout(id));
      toastTimersRef.current = [];
    };
  }, [prToast?.id]); // reset window when a new toast is shown

  // Auto-hide save badge
  useEffect(() => {
    if (savePRBadgeCount <= 0) return;
    const id = window.setTimeout(() => setSavePRBadgeCount(0), 4500);
    return () => window.clearTimeout(id);
  }, [savePRBadgeCount]);

  
  useEffect(() => {
    if (!sleepOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSleepOpen(false);
    setSleepPos(null);
setSleepPos(null); }
    };
    const onClick = (e: MouseEvent) => {
      const btn = sleepBtnRef.current;
      if (!btn) return;
      const t = e.target as Node;
      if (btn.contains(t)) return;
      const pop = document.getElementById("sleep-popover");
      if (pop && pop.contains(t)) return;
      setSleepOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [sleepOpen]);

const safeSessions = useMemo(() => (Array.isArray(sessions) ? sessions : []), [sessions]);
  const sortedSessions = useMemo(() => sortByDateDesc(safeSessions), [safeSessions]);
  const recentSessions = useMemo(() => sortedSessions.slice(0, 5), [sortedSessions]);
  const exerciseById = useMemo(() => {
    const m = new Map<string, ExerciseRef>();
    for (const ex of EXERCISE_LIBRARY) m.set(ex.id, ex);
    return m;
  }, []);

  const prSessionIds = useMemo(() => computeSessionPRFlags(safeSessions), [safeSessions]);

  const totalVolume = workoutVolume(workout);

  
  type SleepEntryV1 = {
    dateISO: string;
    bedtime: string;
    wakeTime: string;
    quality?: number;
  };

  function fmtSleepDuration(bedtime?: string, wakeTime?: string) {
    const b = (bedtime ?? "").trim();
    const w = (wakeTime ?? "").trim();
    if (!b || !w) return null;

    const [bh, bm] = b.split(":").map((x) => Number(x));
    const [wh, wm] = w.split(":").map((x) => Number(x));
    if (![bh, bm, wh, wm].every((n) => Number.isFinite(n))) return null;

    const bMin = bh * 60 + bm;
    let wMin = wh * 60 + wm;
    if (wMin < bMin) wMin += 24 * 60; // cross midnight
    const diff = Math.max(0, wMin - bMin);

    const h = Math.floor(diff / 60);
    const m2 = diff % 60;
    return `${h}t ${m2.toString().padStart(2, "0")}m`;
  }

  const sleepEntryForDay = useMemo(() => {
    const arr = Array.isArray(sleep) ? (sleep as SleepEntryV1[]) : [];
    return arr.find((s) => s.dateISO === workout.date);
  }, [sleep, workout.date]);

  function openSleepPopover() {
    const cur = sleepEntryForDay;
    setSleepBedtime(cur?.bedtime ?? "");
    setSleepWakeTime(cur?.wakeTime ?? "");
    setSleepQuality(cur?.quality ? String(cur.quality) : "");
        // Compute popover position near the button
    const r = sleepBtnRef.current?.getBoundingClientRect();
    const w = 320;
    const left = r ? Math.min(window.innerWidth - w - 16, Math.max(16, r.left)) : 16;
    const top = r ? Math.min(window.innerHeight - 240, r.bottom + 10) : 120;
    setSleepPos({ left, top });
    setSleepOpen(true);
  }

  function openNewTemplateModal() {
    setTemplateNameInput("");
    setTemplateExerciseIds([]);
    setTemplateModalOpen(true);
  }

  function openSaveAsTemplateModal() {
    if ((workout.exercises ?? []).length === 0) return;
    setTemplateNameInput((workout.title ?? "").trim() || "Workout Template");
    setTemplateExerciseIds((workout.exercises ?? []).map((b) => b.exercise.id));
    setTemplateModalOpen(true);
  }

  function addExerciseToTemplate(ex: ExerciseRef) {
    setTemplateExerciseIds((prev) => [...prev, ex.id]);
  }

  function removeTemplateExerciseAt(index: number) {
    setTemplateExerciseIds((prev) => prev.filter((_, i) => i !== index));
  }

  function saveTemplateFromModal() {
    const name = templateNameInput.trim();
    if (!name) {
      alert("Template needs a name.");
      return;
    }
    if (templateExerciseIds.length === 0) {
      alert("Template needs at least one exercise.");
      return;
    }

    const now = new Date().toISOString();
    const template: WorkoutTemplate = {
      id: newId(),
      name,
      exerciseIds: [...templateExerciseIds],
      createdAt: now,
      updatedAt: now,
    };
    setTemplates((prev) => [template, ...(Array.isArray(prev) ? prev : [])]);
    setTemplateModalOpen(false);
    setTemplatePickerOpen(false);
  }

  function startWorkoutFromTemplate(template: WorkoutTemplate) {
    const exercises: ExerciseBlock[] = template.exerciseIds.map((exId, index) => {
      const ex = exerciseById.get(exId);
      const safeExercise: ExerciseRef = ex ?? {
        id: exId,
        name: exId,
        muscleGroup: "other",
      };
      return {
        id: newId(),
        order: index,
        exercise: safeExercise,
        sets: [],
      };
    });

    const nextWorkout: WorkoutSession = {
      id: newId(),
      date: todayISO(),
      title: template.name,
      exercises,
    };

    setWorkout(nextWorkout);
    setSetInputs({});
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  function saveSleepPopover() {
    const qRaw = sleepQuality.trim() === "" ? undefined : Number(sleepQuality);
    const q = qRaw === undefined ? undefined : Math.min(5, Math.max(1, qRaw));
    const entry: SleepEntryV1 = {
      dateISO: workout.date,
      bedtime: sleepBedtime.trim(),
      wakeTime: sleepWakeTime.trim(),
      quality: Number.isFinite(q as number) ? q : undefined,
    };

    setSleep((prev: any[]) => {
      const arr = Array.isArray(prev) ? (prev as SleepEntryV1[]) : [];
      const idx = arr.findIndex((x) => x.dateISO === entry.dateISO);
      if (idx >= 0) {
        const copy = [...arr];
        copy[idx] = entry;
        return copy;
      }
      return [...arr, entry];
    });
    setSleepOpen(false);
  }

function addExerciseBlock(exercise: ExerciseRef) {
    // Older drafts / schema migrations might have `exercises` missing.
    // Never crash on add.
    const current = Array.isArray(workout.exercises) ? workout.exercises : [];
    // Defensive: some legacy/custom exercise refs could be missing fields.
    // Keep exercise NAMES as stored (English in the database) regardless of UI language.
    const safeExercise: ExerciseRef = {
      id: (exercise as any)?.id ?? newId(),
      name: (exercise as any)?.name ?? String((exercise as any)?.id ?? "Unknown"),
      muscleGroup: ((exercise as any)?.muscleGroup ?? "other") as any,
    };
    const block: ExerciseBlock = {
      id: newId(),
      order: 0,
      exercise: safeExercise,
      sets: [],
    };
    const next = [block, ...current].map((b, i) => ({ ...b, order: i }));
    pendingAddedBlockIdRef.current = block.id;
    setWorkout({ ...workout, exercises: next });
  }

  function removeExerciseBlock(blockId: string) {
    // Clean up any buffered input values for sets inside the removed exercise
    const removed = (workout.exercises ?? []).find((b) => b.id === blockId);
    const removedSetIds = (removed?.sets ?? []).map((s) => s.id);

    const next = (workout.exercises ?? [])
      .filter((b) => b.id !== blockId)
      .map((b, i) => ({ ...b, order: i }));
    setWorkout({ ...workout, exercises: next });

    if (removedSetIds.length > 0) {
      setSetInputs((prev) => {
        const copy = { ...prev };
        for (const id of removedSetIds) delete copy[id];
        return copy;
      });
    }
  }

  function addSet(blockId: string) {
    const set: SetLog = { id: newId(), kind: "work", reps: 8, weightKg: 50 };
    const next = (workout.exercises ?? []).map((b) =>
      b.id === blockId ? { ...b, sets: [...(b.sets ?? []), set] } : b
    );
    setWorkout({ ...workout, exercises: next });
  }

  function updateSet(blockId: string, setId: string, patch: Partial<SetLog>) {
    const next = (workout.exercises ?? []).map((b) => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        sets: (b.sets ?? []).map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      };
    });
    setWorkout({ ...workout, exercises: next });
  }

  function removeSet(blockId: string, setId: string) {
    const next = (workout.exercises ?? []).map((b) => {
      if (b.id !== blockId) return b;
      return { ...b, sets: (b.sets ?? []).filter((s) => s.id !== setId) };
    });
    setWorkout({ ...workout, exercises: next });
  }

  function closeToast() {
    setPrToast((prev) => (prev ? { ...prev, phase: "out" } : prev));
    window.setTimeout(() => setPrToast(null), 600);
  }

  function saveWorkout() {
    if ((workout.exercises ?? []).length === 0) {
      alert(t("log.alert.addExerciseBeforeSave"));
      return;
    }

    const prRes = detectPRsForWorkout(workout, safeSessions);

    if (prRes.prCount > 0) {
      const { title, subtitle } = buildAggregateToast(prRes.hits, t);
      setPrToast({
        id: newId(),
        title,
        subtitle,
        phase: "in",
      });
      setSavePRBadgeCount(prRes.prCount);
    } else {
      // If no PR, ensure no lingering toast
      setPrToast(null);
    }

    setSessions((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return sortByDateDesc([{ ...workout }, ...arr]);
    });

    setDraft(null);
    setWorkout(createEmptyWorkout());
    setSetInputs({});
  }
  const sleepLabelLeft = sleepEntryForDay
    ? (() => {
        const dur = fmtSleepDuration(sleepEntryForDay.bedtime, sleepEntryForDay.wakeTime);
        const q = sleepEntryForDay.quality ? `${sleepEntryForDay.quality}/5` : null;
        const bits = [
          t("sleep.status.prefix"),
          dur ? dur : `${sleepEntryForDay.bedtime || "—"} → ${sleepEntryForDay.wakeTime || "—"}`,
          q ? `• ${q}` : null,
        ].filter(Boolean);
        return bits.join(" ");
      })()
    : t("sleep.status.notLogged");

  const sleepCta = sleepEntryForDay ? t("sleep.cta.edit") : t("sleep.cta.log");

  const sleepStripe = (
    <div
      className="forge-surface forgeCardInner"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 12px",
      }}
    >
      <div style={{ color: "var(--text)", fontWeight: 900, fontSize: 13, lineHeight: "18px" }}>{sleepLabelLeft}</div>

      <button
        ref={sleepBtnRef}
        onClick={openSleepPopover}
        style={{
          border: "1px solid rgba(255,59,59,0.35)",
          background: "rgba(255,59,59,0.14)",
          color: "var(--text)",
          borderRadius: 999,
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: 950,
          fontSize: 13,
          lineHeight: "16px",
          whiteSpace: "nowrap",
        }}
      >
        {sleepCta}
      </button>

      {sleepOpen ? (
        <div
          id="sleep-popover"
          style={{
            position: "fixed",
            zIndex: 9999,
            left: sleepPos?.left ?? 16,
            top: sleepPos?.top ?? 120,
            width: 320,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(10,10,10,0.96)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <div style={{ fontWeight: 950 }}>{t("sleep.popover.title")} • {workout.date}</div>
            <button
              onClick={() => { setSleepOpen(false); setSleepPos(null); }}
              style={{
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
                borderRadius: 12,
                padding: "6px 8px",
                cursor: "pointer",
                fontWeight: 950,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>{t("sleep.fields.bedtime")}</div>
              <input
                type="time"
                value={sleepBedtime}
                onChange={(e) => setSleepBedtime(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.25)",
                  color: "var(--text)",
                  fontWeight: 900,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>{t("sleep.fields.wake")}</div>
              <input
                type="time"
                value={sleepWakeTime}
                onChange={(e) => setSleepWakeTime(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.25)",
                  color: "var(--text)",
                  fontWeight: 900,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>{t("sleep.fields.quality")}</div>
            <select
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.25)",
                color: "var(--text)",
                fontWeight: 900,
                outline: "none",
              }}
            >
              <option value="">—</option>
              <option value="1">1 ({t("sleep.quality.bad")})</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 ({t("sleep.quality.top")})</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={() => { setSleepOpen(false); setSleepPos(null); }}
              style={{
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 950,
              }}
            >
              Avbryt
            </button>
            <button
              onClick={saveSleepPopover}
              style={{
                border: "1px solid rgba(255,59,59,0.35)",
                background: "rgba(255,59,59,0.14)",
                color: "var(--text)",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 950,
              }}
            >
              Lagre
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );



  const builder = (
    <div>
      {/* Toast animations (scoped) */}
      <style>{`
        @keyframes forgeToastIn {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0px) scale(1); }
        }
        @keyframes forgeToastOut {
          from { opacity: 1; transform: translateY(0px) scale(1); }
          to   { opacity: 0; transform: translateY(8px) scale(0.99); }
        }
      `}</style>

      {/* Single Toast */}
      {prToast && (
        <div
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: 84,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              padding: 14,
              borderRadius: 16,
              background: "rgba(12,12,12,0.92)",
              border: "1px solid rgba(255,59,59,0.35)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              display: "grid",
              gap: 4,
              animation:
                prToast.phase === "in"
                  ? "forgeToastIn 240ms ease-out both"
                  : "forgeToastOut 600ms ease-in both",
            }}
          >
            <div style={{ fontWeight: 900, color: "var(--red)" }}>{prToast.title}</div>
            {prToast.subtitle ? (
              <div style={{ color: "var(--text)", opacity: 0.9 }}>{prToast.subtitle}</div>
            ) : null}

            <button
              onClick={closeToast}
              style={{
                marginTop: 8,
                justifySelf: "start",
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              {t("log.close")}
            </button>
          </div>
        </div>
      )}

      {/* Header card */}
      <div
        className="forge-surface forgeCardInner"
        style={{
          marginTop: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>
              {t("log.field.date")}
            </label>
            <input
              type="date"
              value={workout.date}
              onChange={(e) => setWorkout({ ...workout, date: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>
              {t("log.field.titleOptional")}
            </label>
            <input
              type="text"
              placeholder={t("log.field.titlePlaceholder")}
              value={workout.title ?? ""}
              onChange={(e) => setWorkout({ ...workout, title: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ color: "var(--muted)" }}>
            {t("log.volume.provisional")}{" "}
            <span style={{ color: "var(--text)" }}>{formatLoadCompactFromKg(totalVolume, units)}</span>
          </div>

          <div style={{ position: "relative", display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={openSaveAsTemplateModal}
              disabled={(workout.exercises ?? []).length === 0}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.05)",
                color: (workout.exercises ?? []).length > 0 ? "var(--text)" : "var(--muted)",
                cursor: (workout.exercises ?? []).length > 0 ? "pointer" : "not-allowed",
                fontWeight: 700,
              }}
            >
              Save as template
            </button>
            <button
              onClick={saveWorkout}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,59,59,0.55)",
                background: "var(--redSoft)",
                color: "var(--red)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {t("log.saveWorkout")}
            </button>

            {savePRBadgeCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  padding: "6px 8px",
                  borderRadius: 999,
                  background: "rgba(12,12,12,0.92)",
                  border: "1px solid rgba(255,59,59,0.45)",
                  color: "var(--red)",
                  fontWeight: 900,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                }}
                aria-label={t("log.pr.badgeAria")}
              >
                <span>🔥</span>
                <span>{t("log.pr.badgeText")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add exercise */}
      <div
        className="forge-surface forgeCardInner"
        style={{
          marginTop: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ color: "var(--muted)" }}>{t("log.addExerciseLabel")}</label>

        <button
          onClick={() => setPickerOpen(true)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.06)",
            color: "var(--text)",
            cursor: "pointer",
          }}
        >
          {t("picker.title")}
        </button>
        {pickedExercise ? (
          <div style={{ color: "var(--muted)" }}>
            {t("log.selected")}:{" "}
            <span style={{ color: "var(--text)", fontWeight: 800 }}>{pickedExercise.name}</span>
          </div>
        ) : (
          <div style={{ color: "var(--muted)" }}>{t("log.noneSelected")}</div>
        )}

        <button
          onClick={() => {
            if (!pickedExercise) return;
            addExerciseBlock(pickedExercise);
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,59,59,0.55)",
            background: "var(--redSoft)",
            color: "var(--red)",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          + {t("log.add")}
        </button>
      </div>

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={EXERCISE_LIBRARY}
        placement="top"
        variant="inline"
        onPick={(ex) => {
          setPickedExercise(ex);
          setPickerOpen(false);
        }}
      />

      {/* Exercise blocks */}
      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {(workout.exercises ?? []).length === 0 ? (
          <div style={{ color: "var(--muted)", padding: 8 }}>
            {t("log.empty.noExercises.prefix")} <b>{t("picker.title")}</b> {t("log.empty.noExercises.middle")} <b>+ {t("log.add")}</b>.
          </div>
        ) : (
          workout.exercises.map((block) => (
            <div
              key={block.id}
              ref={block.id === pendingAddedBlockIdRef.current ? addedBlockRef : null}
              className="forge-surface forgeCardInner"
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{block.exercise.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    {(block.exercise.muscleGroup ?? "other").toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={() => removeExerciseBlock(block.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {t("log.remove")}
                </button>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {(block.sets ?? []).length === 0 ? (
                  <div style={{ color: "var(--muted)" }}>
                    {t("log.empty.noSets.prefix")} <b>+ {t("log.addSet")}</b> {t("log.empty.noSets.suffix")}
                  </div>
                ) : (
                  block.sets.map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 1fr 90px",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ color: "var(--muted)" }}>{t("log.set")} {idx + 1}</div>

                      <input
                        type="number"
                        value={setInputs[s.id]?.reps ?? (Number.isFinite(s.reps) && s.reps > 0 ? String(s.reps) : "")}
                        min={1}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSetInputs((prev) => ({ ...prev, [s.id]: { ...(prev[s.id] ?? {}), reps: v } }));
                          const n = v === "" ? 0 : Number(v);
                          updateSet(block.id, s.id, { reps: Number.isFinite(n) ? n : 0 });
                        }}
                        onBlur={() => {
                          const raw = setInputs[s.id]?.reps;
                          if (raw === undefined) return;
                          const v = raw.trim();
                          const n = v === "" ? 0 : Number(v);
                          const cleaned = Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : "";
                          setSetInputs((prev) => {
                            const next = { ...(prev[s.id] ?? {}), reps: cleaned };
                            return { ...prev, [s.id]: next };
                          });
                          updateSet(block.id, s.id, { reps: cleaned === "" ? 0 : Number(cleaned) });
                        }}style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--text)",
                        }}
                        aria-label={t("log.reps")}
                      />

                      <input
                        type="number"
                        value={setInputs[s.id]?.weight ?? (Number.isFinite(s.weightKg) ? formatWeightFromKg(s.weightKg, units, 1) : "")}
                        min={0}
                        step={0.5}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSetInputs((prev) => ({ ...prev, [s.id]: { ...(prev[s.id] ?? {}), weight: v } }));
                          const n = v === "" ? 0 : Number(v);
                          const kg = v === "" ? 0 : (parseWeightInputToKg(v, units) ?? 0);
                          updateSet(block.id, s.id, { weightKg: kg });
                        }}
                        onBlur={() => {
                          const raw = setInputs[s.id]?.weight;
                          if (raw === undefined) return;
                          const v = raw.trim();
                          const kg = v === "" ? 0 : (parseWeightInputToKg(v, units) ?? 0);
                          const cleaned = v === "" ? "" : formatWeightFromKg(kg, units, 1);
                          setSetInputs((prev) => {
                            const next = { ...(prev[s.id] ?? {}), weight: cleaned };
                            return { ...prev, [s.id]: next };
                          });
                          updateSet(block.id, s.id, { weightKg: cleaned === "" ? 0 : (parseWeightInputToKg(cleaned, units) ?? 0) });
                        }}style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--text)",
                        }}
                        aria-label={unitLabel(units).toUpperCase()}
                      />

                      <button
                        onClick={() => removeSet(block.id, s.id)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--muted)",
                          cursor: "pointer",
                        }}
                      >
                        {t("log.delete")}
                      </button>
                    </div>
                  ))
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button
                    onClick={() => addSet(block.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,59,59,0.55)",
                      background: "var(--redSoft)",
                      color: "var(--red)",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    + {t("log.addSet")}
                  </button>
                </div>

                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                  {t("log.exerciseVolume")}:{" "}
                  <span style={{ color: "var(--text)" }}>{formatLoadCompactFromKg((block.sets ?? []).reduce((sum, x) => sum + x.reps * x.weightKg, 0), units)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );

  const templatesSection = (
    <div className="forge-surface forgeCardInner" style={{ marginTop: 16, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div className="section-title">TEMPLATES</div>
        <button
          onClick={openNewTemplateModal}
          style={{
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--text)",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          New template
        </button>
      </div>

      {templates.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          No templates yet. Save a workout to create one.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => startWorkoutFromTemplate(tpl)}
              className="forgeInnerPlate"
              style={{
                minWidth: 170,
                textAlign: "left",
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 4 }}>{tpl.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{tpl.exerciseIds.length} exercises</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const recents = (
    <div>
      {recentSessions.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>{t("log.recents.empty")}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {recentSessions.map((s) => (
            <div
              key={s.id}
              className="forgeInnerPlate"
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>{s.title?.trim() ? s.title : t("log.defaultWorkoutTitle")}</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>{s.date}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {prSessionIds.has(s.id) && (
                  <div
                    title={t("log.recents.prTitle")}
                    style={{
                      color: "var(--red)",
                      fontWeight: 900,
                      padding: "6px 8px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,59,59,0.35)",
                      background: "rgba(255,59,59,0.10)",
                      lineHeight: 1,
                    }}
                    aria-label="PR"
                  >
                    🔥
                  </div>
                )}

                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  Volum: {Math.round(workoutVolume(s))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  
  // Locked coach (Logg)
  const logCoach = (() => {
    const blocksCount = (workout.exercises ?? []).length;
    const v = totalVolume;
    if (blocksCount === 0) return { title: t("log.coach.startSimple.title"), text: t("log.coach.startSimple.text") };
    if (v >= 15000) return { title: t("log.coach.highWorkload.title"), text: t("log.coach.highWorkload.text") };
    if (v >= 8000) return { title: t("log.coach.solid.title"), text: t("log.coach.solid.text") };
    return { title: t("log.coach.light.title"), text: t("log.coach.light.text") };
  })();

  const coachCard = (
    <CoachCard title="FORGE COACH" metaRight={logCoach.title}>
      {logCoach.text}
    </CoachCard>
  );

  const templateModal = templateModalOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setTemplateModalOpen(false);
          setTemplatePickerOpen(false);
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.68)",
        display: "grid",
        placeItems: "center",
        padding: 12,
      }}
    >
      <div
        className="forge-surface"
        style={{
          width: "min(760px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          padding: 12,
          background: "rgba(8,8,10,0.97)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div className="section-title">NEW TEMPLATE</div>
          <button
            onClick={() => {
              setTemplateModalOpen(false);
              setTemplatePickerOpen(false);
            }}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <input
          type="text"
          placeholder="Template name"
          value={templateNameInput}
          onChange={(e) => setTemplateNameInput(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text)",
          }}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setTemplatePickerOpen(true)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--text)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Add exercise
          </button>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            {templateExerciseIds.length} selected
          </div>
        </div>

        {templatePickerOpen ? (
          <ExercisePickerModal
            open={templatePickerOpen}
            onClose={() => setTemplatePickerOpen(false)}
            exercises={EXERCISE_LIBRARY}
            onPick={(ex) => {
              addExerciseToTemplate(ex);
              setTemplatePickerOpen(false);
            }}
          />
        ) : null}

        <div style={{ display: "grid", gap: 8 }}>
          {templateExerciseIds.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Add exercises to build your template.</div>
          ) : (
            templateExerciseIds.map((exId, idx) => (
              <div
                key={`${exId}-${idx}`}
                className="forgeInnerPlate"
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  {idx + 1}. {exerciseById.get(exId)?.name ?? exId}
                </div>
                <button
                  onClick={() => removeTemplateExerciseAt(idx)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={() => {
              setTemplateModalOpen(false);
              setTemplatePickerOpen(false);
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveTemplateFromModal}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,59,59,0.55)",
              background: "var(--redSoft)",
              color: "var(--red)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Save template
          </button>
        </div>
      </div>
    </div>
  ) : null;


return (
    <div className="forgePage forgePageStack">
      {coachCard}
      {sleepStripe}
      {builder}
      {templatesSection}
      {recents}
      {templateModal}
    </div>
  );
}



