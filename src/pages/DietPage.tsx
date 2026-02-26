// src/pages/DietPage.tsx
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useT } from "../hooks/useT";
import { LS_KEYS } from "../constants";
import { CoachCard } from "../components/ui/CoachCard";
import { CollapsibleSection } from "../components/ui/CollapsibleSection";
import { PieCard } from "../components/charts/PieCard";
import type { PieSlice } from "../components/charts/MiniPieChart";
import { MealLogModal } from "../components/ui/MealLogModal";
import { WidgetBoard } from "../components/layout/WidgetBoard";
import { ForgeButton } from "../components/ui/ForgeButton";

/* ---------------------------------- types ---------------------------------- */

type NutritionV1 = {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  updatedAt?: string;
  source?: "meals" | "manual";
};

type DietTargetsV1 = {
  kcalTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  updatedAt?: string;
};

type MealEntryV1 = {
  id: string;
  dateISO: string; // YYYY-MM-DD
  createdAt: string; // ISO
  name?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type SleepEntryV1 = {
  dateISO: string; // YYYY-MM-DD
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm
  quality?: number; // 1–5
};

type Indicator = "up" | "down" | "flat" | "neutral";

function parseHHMM(dateISO: string, hhmm: string) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(hhmm ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return new Date(
    `${dateISO}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`
  );
}

function sleepDurationHours(entry: SleepEntryV1) {
  const bed = parseHHMM(entry.dateISO, entry.bedtime);
  const wake = parseHHMM(entry.dateISO, entry.wakeTime);
  if (!bed || !wake) return 0;

  let end = wake;
  // Hvis wake er "tidligere" enn bedtime, antar vi at det krysset midnatt.
  if (end.getTime() <= bed.getTime()) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }

  const ms = end.getTime() - bed.getTime();
  const h = ms / (1000 * 60 * 60);
  return Number.isFinite(h) && h > 0 ? h : 0;
}

/* -------------------------------- utilities -------------------------------- */

function indicatorColor(ind: Indicator) {
  if (ind === "up") return "var(--accentGlow)";
  if (ind === "down") return "var(--accentHot)";
  if (ind === "flat") return "var(--muted)";
  return "var(--muted)";
}

function indicatorSymbol(ind: Indicator) {
  if (ind === "up") return "↑";
  if (ind === "down") return "↓";
  if (ind === "flat") return "→";
  return "•";
}

function clamp0(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function displayMealName(name: string, t: (k: string, vars?: any) => string) {
  const n = (name || "").trim().toLowerCase();
  // legacy defaults from earlier builds
  if (n === "mat" || n === "food" || n === "comida") return t("diet.meal.food");
  return name;
}

function isoToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, deltaDays: number) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function gramsToKcal(n: { protein: number; carbs: number; fat: number; fiber: number }) {
  const p = Number.isFinite(n.protein) ? n.protein : 0;
  const c = Number.isFinite(n.carbs) ? n.carbs : 0;
  const f = Number.isFinite(n.fat) ? n.fat : 0;
  const fi = Number.isFinite(n.fiber) ? n.fiber : 0;
  return p * 4 + c * 4 + f * 9 + fi * 2;
}

/* --------------------------------- UI bits --------------------------------- */

function PillButton({
  children,
  onClick,
  disabled,
  title,
  variant = "ghost",
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "ghost" | "primary";
}) {
  return (
    <ForgeButton
      onClick={onClick}
      disabled={!!disabled}
      title={title}
      className={variant === "primary" ? "forge-btn--hot" : "forge-btn--metal"}
    >
      {children}
    </ForgeButton>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (next: number) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div
      className="forgeInnerPlate"
      style={{
        padding: 12,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>{unit}</div>
      </div>

      <input
        inputMode="decimal"
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          const next = raw.trim() === "" ? 0 : Number(raw);
          onChange(clamp0(next));
        }}
        placeholder={placeholder ?? "0"}
        className="forge-input"
      />

      {hint ? (
        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.3 }}>{hint}</div>
      ) : null}
    </div>
  );
}

function MetricRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="forgeInnerPlate"
      style={{
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "baseline",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </div>
        {sub ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{sub}</div> : null}
      </div>

      <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 16 }}>{value}</div>
    </div>
  );
}

function ScoreRow({
  title,
  value,
  sub,
  ind,
}: {
  title: string;
  value: string;
  sub: string;
  ind: Indicator;
}) {
  return (
    <div
      className="forgeInnerPlate"
      style={{
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "baseline",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
          {title.toUpperCase()}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>{sub}</div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 16 }}>{value}</div>
        <div style={{ color: indicatorColor(ind), fontWeight: 950, fontSize: 12 }}>
          {indicatorSymbol(ind)}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- page ----------------------------------- */

export function DietPage() {
  const t = useT();
  const today = useMemo(() => isoToday(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const isToday = selectedDate === today;

  const [mealModalOpen, setMealModalOpen] = useState(false);

  const [meals, setMeals] = useLocalStorage<MealEntryV1[]>(LS_KEYS.meals_v1, []);
  const [nutrition, setNutrition] = useLocalStorage<NutritionV1 | null>(LS_KEYS.nutrition_v1, null);
  const [targetsStored, setTargetsStored] = useLocalStorage<DietTargetsV1 | null>(
    LS_KEYS.diet_targets_v1,
    null
  );

  // Sleep (per date)
  const [sleep] = useLocalStorage<SleepEntryV1[]>(LS_KEYS.sleep_v1, []);

  /* ------------------------------- targets draft ------------------------------ */

  const [targetsDraft, setTargetsDraft] = useState<DietTargetsV1>(() => {
    const t0 =
      targetsStored ??
      ({
        kcalTarget: 2600,
        proteinTarget: 180,
        carbsTarget: 250,
        fatTarget: 80,
        fiberTarget: 30,
      } as DietTargetsV1);

    return {
      kcalTarget: clamp0(t0.kcalTarget),
      proteinTarget: clamp0(t0.proteinTarget),
      carbsTarget: clamp0(t0.carbsTarget),
      fatTarget: clamp0(t0.fatTarget),
      fiberTarget: clamp0(t0.fiberTarget),
      updatedAt: t0.updatedAt,
    };
  });

  useEffect(() => {
    if (!targetsStored) return;
    setTargetsDraft({
      kcalTarget: clamp0(targetsStored.kcalTarget),
      proteinTarget: clamp0(targetsStored.proteinTarget),
      carbsTarget: clamp0(targetsStored.carbsTarget),
      fatTarget: clamp0(targetsStored.fatTarget),
      fiberTarget: clamp0(targetsStored.fiberTarget),
      updatedAt: targetsStored.updatedAt,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    targetsStored?.kcalTarget,
    targetsStored?.proteinTarget,
    targetsStored?.carbsTarget,
    targetsStored?.fatTarget,
    targetsStored?.fiberTarget,
  ]);

  const goalsDirty = useMemo(() => {
    const ts = targetsStored ?? {
      kcalTarget: 0,
      proteinTarget: 0,
      carbsTarget: 0,
      fatTarget: 0,
      fiberTarget: 0,
    };

    return (
      clamp0(targetsDraft.kcalTarget) !== clamp0(ts.kcalTarget) ||
      clamp0(targetsDraft.proteinTarget) !== clamp0(ts.proteinTarget) ||
      clamp0(targetsDraft.carbsTarget) !== clamp0(ts.carbsTarget) ||
      clamp0(targetsDraft.fatTarget) !== clamp0(ts.fatTarget) ||
      clamp0(targetsDraft.fiberTarget) !== clamp0(ts.fiberTarget)
    );
  }, [targetsDraft, targetsStored]);

  function saveGoals() {
    setTargetsStored({
      kcalTarget: clamp0(targetsDraft.kcalTarget),
      proteinTarget: clamp0(targetsDraft.proteinTarget),
      carbsTarget: clamp0(targetsDraft.carbsTarget),
      fatTarget: clamp0(targetsDraft.fatTarget),
      fiberTarget: clamp0(targetsDraft.fiberTarget),
      updatedAt: new Date().toISOString(),
    });
  }

  function resetGoals() {
    setTargetsDraft({
      kcalTarget: 2600,
      proteinTarget: 180,
      carbsTarget: 250,
      fatTarget: 80,
      fiberTarget: 30,
    });
    setTargetsStored(null);
  }

  const effectiveTargets = targetsStored ?? targetsDraft;

  /* ------------------------------- meals per day ------------------------------ */

  const dayMeals = useMemo(() => {
    const safe = Array.isArray(meals) ? meals : [];
    return safe.filter((m) => m.dateISO === selectedDate);
  }, [meals, selectedDate]);

  const dayTotals = useMemo(() => {
    let kcalSum = 0;
    let p = 0;
    let c = 0;
    let f = 0;
    let fi = 0;

    for (const m of dayMeals) {
      kcalSum += clamp0(m.kcal);
      p += clamp0(m.protein);
      c += clamp0(m.carbs);
      f += clamp0(m.fat);
      fi += clamp0(m.fiber);
    }

    return { kcalSum, protein: p, carbs: c, fat: f, fiber: fi };
  }, [dayMeals]);

  // Keep nutrition_v1 in sync for TODAY (source: meals).
  // Important: also update when meals are deleted (including when dayMeals becomes empty).
  useEffect(() => {
    if (!isToday) return;

    setNutrition({
      protein: dayTotals.protein,
      carbs: dayTotals.carbs,
      fat: dayTotals.fat,
      fiber: dayTotals.fiber,
      source: "meals",
      updatedAt: new Date().toISOString(),
    });
  }, [isToday, dayTotals, setNutrition]);

  // Copy yesterday → selected date
  function copyFromYesterday() {
    const y = addDaysISO(selectedDate, -1);
    const safe = Array.isArray(meals) ? meals : [];
    const src = safe.filter((m) => m.dateISO === y);
    if (!src.length) return;

    const copies: MealEntryV1[] = src.map((m) => ({
      ...m,
      id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      dateISO: selectedDate,
      createdAt: new Date().toISOString(),
      name: m.name?.trim() ? `${displayMealName(m.name, t)} (kopi)` : undefined,
    }));

    setMeals((prev) => [...copies, ...(Array.isArray(prev) ? prev : [])]);
  }

  const hasYesterdayMeals = useMemo(() => {
    const y = addDaysISO(selectedDate, -1);
    const safe = Array.isArray(meals) ? meals : [];
    return safe.some((m) => m.dateISO === y);
  }, [meals, selectedDate]);

  function addMealFromModal(draft: {
    dateISO: string;
    name?: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }) {
    const entry = {
      id: crypto.randomUUID(),
      dateISO: draft.dateISO,
      createdAt: new Date().toISOString(),
      name: draft.name,
      kcal: clamp0(draft.kcal),
      protein: clamp0(draft.protein),
      carbs: clamp0(draft.carbs),
      fat: clamp0(draft.fat),
      fiber: clamp0(draft.fiber),
    } as MealEntryV1;

    setMeals((prev) => [entry, ...(Array.isArray(prev) ? prev : [])]);

    // Optional: keep nutrition_v1 aligned immediately if adding for today.
    if (draft.dateISO === today) {
      const forDay = [entry, ...(Array.isArray(meals) ? meals : [])].filter((m) => m.dateISO === draft.dateISO);
      const agg = forDay.reduce(
        (acc, m) => {
          acc.protein += clamp0(m.protein);
          acc.carbs += clamp0(m.carbs);
          acc.fat += clamp0(m.fat);
          acc.fiber += clamp0(m.fiber);
          return acc;
        },
        { protein: 0, carbs: 0, fat: 0, fiber: 0 }
      );

      setNutrition({
        protein: agg.protein,
        carbs: agg.carbs,
        fat: agg.fat,
        fiber: agg.fiber,
        updatedAt: new Date().toISOString(),
        source: "meals",
      });
    }
  }

  function deleteMeal(id: string) {
    setMeals((prev) => (Array.isArray(prev) ? prev.filter((m) => m.id !== id) : []));
  }

  /* --------------------------- snapshot vs targets --------------------------- */

  const kcalLeft = clamp0(targetsDraft.kcalTarget) - dayTotals.kcalSum;
  const pLeft = clamp0(targetsDraft.proteinTarget) - dayTotals.protein;
  const cLeft = clamp0(targetsDraft.carbsTarget) - dayTotals.carbs;
  const fLeft = clamp0(targetsDraft.fatTarget) - dayTotals.fat;
  const fiLeft = clamp0(targetsDraft.fiberTarget) - dayTotals.fiber;

  const kcalLine = useMemo(() => {
    const left = kcalLeft;
    const abs = Math.round(Math.abs(left));
    if (abs < 15) return t("diet.kcal.onTarget");
    if (left > 0) return `${abs} ${t("diet.kcal.left")}`;
    return `${abs} ${t("diet.kcal.over")}`;
  }, [kcalLeft, t]);

  /* --------------------------- 7-day insight cards --------------------------- */

  const diet7d = useMemo(() => {
    const safeMeals = Array.isArray(meals) ? meals : [];
    const tg = effectiveTargets;

    const hasTargets =
      !!tg &&
      Number.isFinite(tg.kcalTarget) &&
      Number.isFinite(tg.proteinTarget) &&
      tg.kcalTarget > 0 &&
      tg.proteinTarget > 0;

    const endISO = selectedDate;
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(endISO, -i));

    let sumP = 0;
    let sumK = 0;
    let hitP = 0;
    let hitK = 0;
    let loggedDays = 0;

    const kcalTol = 100;

    for (const dISO of days) {
      const ms = safeMeals.filter((m) => m.dateISO === dISO);

      let kcal = 0;
      let protein = 0;
      for (const m of ms) {
        kcal += Number.isFinite(m.kcal) ? m.kcal : 0;
        protein += Number.isFinite(m.protein) ? m.protein : 0;
      }

      const hasLog = ms.length > 0 && (kcal > 0 || protein > 0);
      if (hasLog) loggedDays++;

      sumK += kcal;
      sumP += protein;

      if (hasTargets) {
        if (protein >= tg.proteinTarget) hitP++;
        if (Math.abs(kcal - tg.kcalTarget) <= kcalTol) hitK++;
      }
    }

    const proteinAvg = sumP / 7;
    const kcalAvg = sumK / 7;

    const proteinInd: Indicator = !hasTargets ? "neutral" : hitP >= 5 ? "up" : hitP >= 3 ? "flat" : "down";
    const kcalInd: Indicator = !hasTargets ? "neutral" : hitK >= 5 ? "up" : hitK >= 3 ? "flat" : "down";
    const logInd: Indicator = loggedDays >= 5 ? "up" : loggedDays >= 3 ? "flat" : "down";

    return {
      hasTargets,
      loggedDays,
      proteinAvg,
      kcalAvg,
      hitP,
      hitK,
      proteinInd,
      kcalInd,
      logInd,
    };
  }, [meals, effectiveTargets, selectedDate]);

  /* ---------------------------- Macro pie (card) ---------------------------- */

  const macroSlices = useMemo<PieSlice[]>(() => {
    const p = Number.isFinite(dayTotals.protein) ? dayTotals.protein : 0;
    const c = Number.isFinite(dayTotals.carbs) ? dayTotals.carbs : 0;
    const f = Number.isFinite(dayTotals.fat) ? dayTotals.fat : 0;
    const fi = Number.isFinite(dayTotals.fiber) ? dayTotals.fiber : 0;

    return [
      { label: t("macros.protein"), value: p },
      { label: t("macros.carbs"), value: c },
      { label: t("macros.fat"), value: f },
      { label: t("macros.fiber"), value: fi },
    ].filter((x) => x.value > 0);
  }, [dayTotals, t]);

  const macroCenterLabel = useMemo(() => {
    const kcal = gramsToKcal({
      protein: dayTotals.protein,
      carbs: dayTotals.carbs,
      fat: dayTotals.fat,
      fiber: dayTotals.fiber,
    });
    return dayMeals.length ? `${Math.round(kcal)} kcal` : "—";
  }, [dayTotals, dayMeals.length]);

  /* ---------------------------------- sleep --------------------------------- */

  const sleep7d = useMemo(() => {
    const safe = Array.isArray(sleep) ? sleep : [];

    // 7-dagers vindu som slutter på selectedDate
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) days.push(addDaysISO(selectedDate, -i));

    const entries = days
      .map((d) => safe.find((s) => s.dateISO === d) ?? null)
      .filter((x): x is SleepEntryV1 => !!x);

    const hours = entries.map(sleepDurationHours).filter((h) => Number.isFinite(h) && h > 0);
    const avgHours = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;

    return { avgHours, count: hours.length };
  }, [sleep, selectedDate]);

  /* --------------------------------- sections -------------------------------- */

  const dietCoach = (() => {
    const hasT = targetsDraft.kcalTarget > 0 && targetsDraft.proteinTarget > 0;
    const kcal = dayTotals.kcalSum;
    const protein = dayTotals.protein;
    const proteinHit = hasT ? protein / Math.max(1, targetsDraft.proteinTarget) : 0;

    const sleepAvg = sleep7d.avgHours;
    const sleepLow = sleepAvg > 0 && sleepAvg < 6.5;

    const kcalLow = hasT ? kcal < targetsDraft.kcalTarget - 150 : false;
    const kcalHigh = hasT ? kcal > targetsDraft.kcalTarget + 150 : false;
    const proteinLow = hasT ? proteinHit < 0.8 : false;

    if (!hasT && sleepAvg <= 0) {
      return { title: t("diet.coach.needLog.title"), text: t("diet.coach.needLog.text") };
    }

    if (sleepLow && (proteinLow || kcalLow)) {
      return { title: t("diet.coach.lowRecoveryFuel"), text: t("diet.coach.lowRecoveryFuel.text") };
    }
    if (sleepLow) {
      return { title: t("diet.coach.sleepBelowAvg"), text: t("diet.coach.sleepBelowAvg.text") };
    }
    if (proteinLow) {
      return { title: t("diet.coach.proteinLow.title"), text: t("diet.coach.proteinLow.text") };
    }
    if (kcalLow) {
      return { title: t("diet.coach.underKcal"), text: t("diet.coach.underKcal.text") };
    }
    if (kcalHigh) {
      return { title: t("diet.coach.overKcal"), text: t("diet.coach.overKcal.text") };
    }
    return { title: t("diet.coach.steady"), text: t("diet.coach.steady.text") };
  })();

  const coachCard = (
    <CoachCard title="FORGE COACH" metaRight={dietCoach.title}>
      {dietCoach.text}
    </CoachCard>
  );

  const dateControls = (
    <div
      className="forge-surface forgeCardInner"
      style={{
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("diet.section.date")}</div>
        <div style={{ color: "var(--text)", fontWeight: 950 }}>
          {selectedDate}{" "}
          {!isToday ? (
            <span style={{ color: "var(--muted)", fontWeight: 800, fontSize: 12 }}>• {t("diet.day.history")}</span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <PillButton onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}>←</PillButton>

        <PillButton onClick={() => setSelectedDate(today)} variant={isToday ? "primary" : "ghost"}>
          {t("common.today")}
        </PillButton>

        <PillButton onClick={() => setSelectedDate(addDaysISO(selectedDate, +1))}>→</PillButton>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value || today)}
          className="forge-input"
        />
      </div>
    </div>
  );

  const actionBar = (
    <div
      className="forge-surface forgeCardInner"
      style={{
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("diet.section.actions")}</div>
        <div style={{ fontWeight: 950, color: "var(--text)" }}>
          {t("diet.quickLog")}
          {!isToday ? (
            <span style={{ color: "var(--muted)", fontWeight: 800, fontSize: 12 }}> {t("diet.quickLog.historyDayNote")}</span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <PillButton onClick={() => setMealModalOpen(true)} variant="primary">
          Log meal
        </PillButton>

        <PillButton
          onClick={copyFromYesterday}
          disabled={!hasYesterdayMeals}
          title={hasYesterdayMeals ? t("diet.copyYesterday.title") : t("diet.copyYesterday.none")}
        >
          {t("diet.copyYesterday.cta")}
        </PillButton>
      </div>
    </div>
  );

  const snapshotCard = (
    <div
      className="forge-surface forgeCardInner"
      style={{
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
            {isToday ? t("diet.day.today").toUpperCase() : t("diet.day.day").toUpperCase()}
          </div>
          <div style={{ fontWeight: 950, color: "var(--text)" }}>{kcalLine}</div>
        </div>

        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {t("diet.snapshot.intake")}:{" "}
          <span style={{ color: "var(--text)", fontWeight: 900 }}>{Math.round(dayTotals.kcalSum)} kcal</span>{" "}
          <span style={{ color: "var(--muted)" }}>•</span>{" "}
          {t("diet.snapshot.target")}:{" "}
          <span style={{ color: "var(--text)", fontWeight: 900 }}>{Math.round(targetsDraft.kcalTarget)} kcal</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <MetricRow
          label={t("macros.protein")}
          value={`${Math.round(pLeft)} ${t("common.gLeft")}`}
          sub={`${Math.round(dayTotals.protein)} / ${Math.round(targetsDraft.proteinTarget)} g`}
        />
        <MetricRow
          label={t("macros.carbs")}
          value={`${Math.round(cLeft)} ${t("common.gLeft")}`}
          sub={`${Math.round(dayTotals.carbs)} / ${Math.round(targetsDraft.carbsTarget)} g`}
        />
        <MetricRow
          label={t("macros.fat")}
          value={`${Math.round(fLeft)} ${t("common.gLeft")}`}
          sub={`${Math.round(dayTotals.fat)} / ${Math.round(targetsDraft.fatTarget)} g`}
        />
        <MetricRow
          label={t("macros.fiber")}
          value={`${Math.round(fiLeft)} ${t("common.gLeft")}`}
          sub={`${Math.round(dayTotals.fiber)} / ${Math.round(targetsDraft.fiberTarget)} g`}
        />
      </div>
    </div>
  );

  const mealsCard = (
    <div
      className="forge-surface forgeCardInner"
      style={{
        padding: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
            {isToday ? t("diet.day.today").toUpperCase() : t("diet.day.day").toUpperCase()}
          </div>
          <div style={{ fontWeight: 950, color: "var(--text)" }}>
            {dayMeals.length ? `${dayMeals.length} ${t("diet.meals.count")}` : t("diet.meals.empty")}
          </div>
        </div>

        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {t("diet.total")}:{" "}
          <span style={{ color: "var(--text)", fontWeight: 900 }}>{Math.round(dayTotals.kcalSum)} kcal</span>{" "}
          <span style={{ color: "var(--muted)" }}>•</span> P {Math.round(dayTotals.protein)} / C{" "}
          {Math.round(dayTotals.carbs)} / F {Math.round(dayTotals.fat)} / Fi {Math.round(dayTotals.fiber)} g
        </div>
      </div>

      {dayMeals.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {dayMeals.map((m) => (
            <div
              key={m.id}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--surface2)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 950, color: "var(--text)" }}>
                  {m.name?.trim() ? m.name : t("diet.meal.defaultName")}
                </div>

                <button
                  type="button"
                  onClick={() => deleteMeal(m.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontWeight: 850,
                  }}
                  title={t("diet.meal.deleteTitle")}
                >
                  {t("common.delete")}
                </button>
              </div>

              <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.35 }}>
                <span style={{ color: "var(--text)", fontWeight: 900 }}>{Math.round(m.kcal)} kcal</span>{" "}
                <span style={{ color: "var(--muted)" }}>•</span> P {Math.round(m.protein)}{" "}
                <span style={{ color: "var(--muted)" }}>•</span> C {Math.round(m.carbs)}{" "}
                <span style={{ color: "var(--muted)" }}>•</span> F {Math.round(m.fat)}{" "}
                <span style={{ color: "var(--muted)" }}>•</span> Fi {Math.round(m.fiber)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("diet.meals.addFirstHint")}</div>
      )}
    </div>
  );

  const scoreAndPieRow = (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        alignItems: "start",
      }}
    >
      <div
        className="forge-surface forgeCardInner"
        style={{
          padding: 14,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("common.insights")}</div>
            <div style={{ fontWeight: 950, color: "var(--text)" }}>{t("common.last7Days")}</div>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{t("diet.section.status")}</div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <ScoreRow
            title={t("macros.protein")}
            value={`${Math.round(diet7d.proteinAvg)} g/d`}
            sub={
              diet7d.hasTargets
                ? `${diet7d.hitP} / 7 ${t("diet.widgets.protein7d.daysOnTarget")}`
                : t("diet.widgets.needTargetsForScore")
            }
            ind={diet7d.proteinInd}
          />

          <ScoreRow
            title={t("diet.widgets.kcal7d.title")}
            value={`${Math.round(diet7d.kcalAvg)} kcal/d`}
            sub={
              diet7d.hasTargets
                ? t("diet.widgets.kcal7d.daysOnTarget", { n: diet7d.hitK })
                : t("diet.widgets.needTargetsForScore")
            }
            ind={diet7d.kcalInd}
          />

          <ScoreRow
            title={t("diet.widgets.logged7d.title")}
            value={`${diet7d.loggedDays} / 7`}
            sub={
              diet7d.loggedDays >= 5
                ? t("diet.widgets.rhythmGood")
                : diet7d.loggedDays >= 3
                  ? "Stabilt"
                  : t("diet.widgets.buildConsistency")
            }
            ind={diet7d.logInd}
          />
        </div>
      </div>

      <PieCard
        title={t("diet.widgets.macroSplit.title")}
        subtitle={isToday ? t("common.today") : t("diet.day.withDate", { date: selectedDate })}
        slices={macroSlices}
        centerLabel={macroCenterLabel}
        centerSubLabel={macroSlices.length ? t("diet.widgets.gramsShare") : t("common.noData")}
        footer={macroSlices.length ? t("diet.widgets.macroSplit.hasMeals") : t("diet.widgets.macroSplit.noMeals")}
      />
    </div>
  );

  const goalsSection = (
    <CollapsibleSection
      title={t("diet.goals.title")}
      subtitle={`${t("diet.goals.subtitleKcalGrams")} • ${goalsDirty ? t("common.unsaved") : t("common.saved")}`}
      defaultOpen={false}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <PillButton onClick={saveGoals} variant="primary" disabled={!goalsDirty}>
            Lagre mål
          </PillButton>
          <PillButton onClick={resetGoals}>{t("diet.goals.reset")}</PillButton>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <Field
            label={t("diet.targets.kcal")}
            unit="kcal"
            value={targetsDraft.kcalTarget}
            onChange={(v) => setTargetsDraft((tt) => ({ ...tt, kcalTarget: v }))}
          />
          <Field
            label={t("diet.targets.protein")}
            unit="g"
            value={targetsDraft.proteinTarget}
            onChange={(v) => setTargetsDraft((tt) => ({ ...tt, proteinTarget: v }))}
          />
          <Field
            label={t("diet.targets.carbs")}
            unit="g"
            value={targetsDraft.carbsTarget}
            onChange={(v) => setTargetsDraft((tt) => ({ ...tt, carbsTarget: v }))}
          />
          <Field
            label={t("diet.targets.fat")}
            unit="g"
            value={targetsDraft.fatTarget}
            onChange={(v) => setTargetsDraft((tt) => ({ ...tt, fatTarget: v }))}
          />
          <Field
            label={t("diet.targets.fiber")}
            unit="g"
            value={targetsDraft.fiberTarget}
            onChange={(v) => setTargetsDraft((tt) => ({ ...tt, fiberTarget: v }))}
          />
        </div>

        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {t("diet.goals.savedIn")}{" "}
          <span style={{ color: "var(--text)", fontWeight: 900 }}>forge:diet_targets_v1</span>.
        </div>
      </div>
    </CollapsibleSection>
  );

  const infoSection = (
    <CollapsibleSection
      title={t("diet.info.nutritionSource")}
      subtitle={`nutrition_v1: ${nutrition?.source ?? "—"}`}
      defaultOpen={false}
    >
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
          color: "var(--muted)",
          fontSize: 13,
          lineHeight: 1.35,
          display: "grid",
          gap: 8,
        }}
      >
        <div>
          <span style={{ color: "var(--text)", fontWeight: 900 }}>nutrition_v1</span> {t("diet.info.analyticsReads")}:
        </div>
        <div>
          P {Math.round(nutrition?.protein ?? 0)} • C {Math.round(nutrition?.carbs ?? 0)} • F{" "}
          {Math.round(nutrition?.fat ?? 0)} • Fi {Math.round(nutrition?.fiber ?? 0)}
        </div>
        <div>
          {t("diet.info.kcalFromMacrosEstimated")}:{" "}
          <span style={{ color: "var(--text)", fontWeight: 900 }}>
            {Math.round(
              gramsToKcal({
                protein: nutrition?.protein ?? 0,
                carbs: nutrition?.carbs ?? 0,
                fat: nutrition?.fat ?? 0,
                fiber: nutrition?.fiber ?? 0,
              })
            )}{" "}
            kcal
          </span>
        </div>
      </div>
    </CollapsibleSection>
  );

  const widgets = useMemo(
    () => [
      { id: "diet_coach", title: "FORGE COACH", useFrame: false, render: () => coachCard },
      { id: "diet_date_controls", title: "DATE", useFrame: false, render: () => dateControls },
      { id: "diet_actions", title: "ACTIONS", useFrame: false, render: () => actionBar },
      { id: "diet_snapshot", title: "SNAPSHOT", useFrame: false, render: () => snapshotCard },
      { id: "diet_meals", title: "MEALS", useFrame: false, render: () => mealsCard },
      { id: "diet_score_pie", title: "INSIGHTS", useFrame: false, render: () => scoreAndPieRow },
      { id: "diet_goals", title: "GOALS", useFrame: false, render: () => goalsSection },
      { id: "diet_info", title: "INFO", useFrame: false, render: () => infoSection },
    ],
    [coachCard, dateControls, actionBar, snapshotCard, mealsCard, scoreAndPieRow, goalsSection, infoSection]
  );

  return (
    <div className="forgePage forgePageStack">
      <div className="dashboard-section dashboard-widget-stack">
        <WidgetBoard storageKey={LS_KEYS.diet_layout_v1} defs={widgets} />
      </div>

      <MealLogModal
        open={mealModalOpen}
        onClose={() => setMealModalOpen(false)}
        dateISO={selectedDate}
        onAddMeal={addMealFromModal}
      />
    </div>
  );
}

export default DietPage;

