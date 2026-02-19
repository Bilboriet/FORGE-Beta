import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useForgeSettings } from "../hooks/useForgeSettings";
import { useT } from "../hooks/useT";
import { LS_KEYS } from "../constants";
import type { ExerciseRef, WorkoutSession } from "../types";
import { EXERCISE_LIBRARY } from "../exerciseLibrary";
import { sortByDateDesc } from "../utils";
import { buildHeatmapDays, computeCurrentStreak } from "../utils/consistency";
import {
  computeE1RMSeriesForExercise,
  computeMuscleVolume,
  computePRList,
  computeVolumeTrendSeries,
  computeWeeklyVolumeSeries,
  getSessionsInRange,
  normalizeExerciseKey,
} from "../utils/analytics";
import { searchExercises } from "../utils/exerciseSearch";
import { ConsistencyHeatmap } from "../components/charts/ConsistencyHeatmap";
import { MiniLineChart } from "../components/charts/MiniLineChart";
import { CoachCard } from "../components/ui/CoachCard";
import { WidgetBoard } from "../components/layout/WidgetBoard";
import { formatLoadCompactFromKg, formatWeightFromKg, unitLabel } from "../units";

const LS_ANALYTICS_EX = "forge:analytics_exercise_v1";
const DEBUG_ANALYTICS = false;
const DEBUG_CHART = false;

type HeatRange = 30 | 90 | 180;
type ExerciseDataRow = {
  date: string;
  exerciseId: string;
  exerciseName: string;
  reps: number;
  weightKg: number;
  e1rm: number;
};
type ChartPoint = { value: number; date: string };

function sanitizeSeries(points: Array<{ value: unknown; date: string }>): ChartPoint[] {
  return (points ?? [])
    .map((p) => ({ ...p, value: Number(p.value) }))
    .filter((p) => Number.isFinite(p.value));
}

function computeDomain(values: number[]) {
  const finite = (values ?? []).filter((v) => Number.isFinite(v));
  if (!finite.length) return [0, 1] as const;

  const min = Math.min(...finite);
  const max = Math.max(...finite);

  let yMin = min;
  let yMax = max;

  if (min === max) {
    const pad = Math.max(5, min * 0.05);
    yMin = min - pad;
    yMax = max + pad;
  } else {
    const pad = (max - min) * 0.1;
    yMin = min - pad;
    yMax = max + pad;
  }

  return [yMin, yMax] as const;
}

function buildChartDebug(values: number[]) {
  const finite = (values ?? []).filter((v) => Number.isFinite(v));
  if (!finite.length) {
    return { points: 0, min: null as number | null, max: null as number | null, yMin: null as number | null, yMax: null as number | null };
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const [yMin, yMax] = computeDomain(finite);
  return { points: finite.length, min, max, yMin, yMax };
}

function normalizeKey(value: string) {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function collectExerciseRows(
  sessions: WorkoutSession[],
  selectedExerciseId: string | null,
  selectedExerciseName: string
): ExerciseDataRow[] {
  // Source-of-truth identity in logged data is ExerciseBlock.exercise.id.
  // Name matching is a fallback for older/mixed historical data.
  const selectedId = (selectedExerciseId ?? "").trim();
  const selectedNameKey = normalizeKey(selectedExerciseName);
  if (!selectedId && !selectedNameKey) return [];

  const rows: ExerciseDataRow[] = [];
  for (const session of sessions ?? []) {
    for (const block of session.exercises ?? []) {
      const blockId = (block.exercise?.id ?? "").trim();
      const blockName = block.exercise?.name ?? "";
      const blockNameKey = normalizeKey(blockName);
      const matchById = !!selectedId && blockId === selectedId;
      const matchByName = !!selectedNameKey && blockNameKey === selectedNameKey;
      if (!matchById && !matchByName) continue;

      for (const set of block.sets ?? []) {
        const reps = Number(set.reps) || 0;
        const weightKg = Number(set.weightKg) || 0;
        if (reps <= 0 || weightKg <= 0) continue;
        rows.push({
          date: session.date,
          exerciseId: blockId,
          exerciseName: blockName,
          reps,
          weightKg,
          e1rm: weightKg * (1 + reps / 30),
        });
      }
    }
  }
  return rows;
}

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="forge-surface" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.18)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="section-title">{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="forgeInnerPlate" style={{ padding: 12, display: "grid", gap: 4 }}>
      <div className="kpiLabel">{label}</div>
      <div style={{ fontWeight: 950, fontSize: 20 }}>{value}</div>
    </div>
  );
}

function BalanceBar({
  label,
  valueLabel,
  pct,
}: {
  label: string;
  valueLabel: string;
  pct: number;
}) {
  const width = `${Math.max(0, Math.min(100, pct * 100))}%`;
  return (
    <div className="forgeInnerPlate" style={{ padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{label}</div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{valueLabel}</div>
      </div>
      <div className="forgeMeterTrack">
        <div className="forgeMeterFill" style={{ width }} />
      </div>
    </div>
  );
}

function rangeLabel(range: HeatRange) {
  if (range === 30) return "30d";
  if (range === 90) return "90d";
  return "180d";
}

export default function AnalyticsPage() {
  const t = useT();
  const [sessions] = useLocalStorage<WorkoutSession[]>(LS_KEYS.sessions, []);
  const [settings] = useForgeSettings();
  const units = settings?.units ?? "kg";

  const [heatmapRange, setHeatmapRange] = useState<HeatRange>(90);
  const [showAllMuscles, setShowAllMuscles] = useState(false);

  const [selectedExerciseId, setSelectedExerciseId] = useLocalStorage<string | null>(
    LS_ANALYTICS_EX,
    null
  );
  const [selectedExerciseName, setSelectedExerciseName] = useState("");
  const [exerciseQuery, setExerciseQuery] = useState("");

  const sessionsDesc = useMemo(() => sortByDateDesc(sessions), [sessions]);
  const sessionsAsc = useMemo(() => [...sessionsDesc].reverse(), [sessionsDesc]);

  const selectedExercise = useMemo<ExerciseRef | null>(() => {
    if (!selectedExerciseId) return null;
    return EXERCISE_LIBRARY.find((x) => x.id === selectedExerciseId) ?? null;
  }, [selectedExerciseId]);

  useEffect(() => {
    if (selectedExerciseId && !selectedExercise) setSelectedExerciseId(null);
  }, [selectedExerciseId, selectedExercise, setSelectedExerciseId]);
  useEffect(() => {
    if (selectedExercise?.name && selectedExerciseName !== selectedExercise.name) {
      setSelectedExerciseName(selectedExercise.name);
    }
  }, [selectedExercise, selectedExerciseName]);

  const filteredExercises = useMemo(() => {
    const q = exerciseQuery.trim();
    if (!q) return EXERCISE_LIBRARY;
    return searchExercises(EXERCISE_LIBRARY, q).map((hit) => hit.ex);
  }, [exerciseQuery]);
  const exerciseOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: ExerciseRef[] = [];
    for (const ex of filteredExercises) {
      const key = ex.id?.trim() ? `id:${ex.id.trim()}` : `name:${normalizeKey(ex.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ex);
    }
    return out;
  }, [filteredExercises]);

  useEffect(() => {
    if (!DEBUG_ANALYTICS) return;
    console.log("[ANALYTICS][SESSIONS][SHAPE]", sessions.slice(0, 3).map((s) => ({
      date: s.date,
      exercises: s.exercises?.map((e) => ({
        name: e.exercise?.name,
        id: e.exercise?.id,
        sets: e.sets?.map((set) => ({ reps: set.reps, weightKg: set.weightKg })),
      })),
    })));
  }, [sessions]);
  useEffect(() => {
    if (!DEBUG_ANALYTICS) return;
    console.log("[ANALYTICS][OPTIONS]", {
      count: exerciseOptions.length,
      sample: exerciseOptions.slice(0, 5),
      hasIds: exerciseOptions.some((o) => !!o.id),
      uniqueNames: new Set(exerciseOptions.map((o) => o.name)).size,
      uniqueIds: new Set(exerciseOptions.map((o) => o.id)).size,
    });
  }, [exerciseOptions]);

  const heatmapDays = useMemo(
    () => buildHeatmapDays(sessionsAsc, heatmapRange),
    [sessionsAsc, heatmapRange]
  );
  const currentStreak = useMemo(() => computeCurrentStreak(heatmapDays), [heatmapDays]);

  const sessions7 = useMemo(() => getSessionsInRange(sessionsAsc, 7).length, [sessionsAsc]);
  const sessions30 = useMemo(() => getSessionsInRange(sessionsAsc, 30).length, [sessionsAsc]);

  const weeklyVolume = useMemo(() => computeWeeklyVolumeSeries(sessionsAsc, 16), [sessionsAsc]);
  const weeklyVolumeBars = useMemo(() => weeklyVolume.map((x) => x.totalVolume), [weeklyVolume]);
  const volumeTrend = useMemo(() => computeVolumeTrendSeries(weeklyVolume, 4), [weeklyVolume]);
  const weeklyVolumeDebug = useMemo(() => buildChartDebug(weeklyVolumeBars), [weeklyVolumeBars]);
  const volumeTrendDebug = useMemo(() => buildChartDebug(volumeTrend), [volumeTrend]);
  const hasWeeklyVolumePoints = weeklyVolumeBars.length > 0;
  const hasTrendPoints = volumeTrend.length >= 2;

  const exerciseRows = useMemo(() => {
    if (DEBUG_ANALYTICS) {
      console.log("[ANALYTICS][E1RM][INPUT]", {
        selectedExerciseId,
        selectedExerciseName,
        sessionsCount: sessions.length,
      });
    }
    const matched = collectExerciseRows(sessionsAsc, selectedExerciseId, selectedExerciseName);
    if (DEBUG_ANALYTICS) {
      console.log("[ANALYTICS][E1RM][FILTERED]", {
        matchedRows: matched.length,
        sample: matched.slice(0, 10),
      });
    }
    return matched;
  }, [sessions, sessionsAsc, selectedExerciseId, selectedExerciseName]);
  const e1rmSeries = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const row of exerciseRows) {
      const prev = byDate.get(row.date) ?? 0;
      if (row.e1rm > prev) byDate.set(row.date, row.e1rm);
    }
    const points = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekLabel, e1rm]) => ({ weekLabel, e1rm }))
      .slice(-16);
    if (DEBUG_ANALYTICS) {
      console.log("[ANALYTICS][E1RM][SERIES]", {
        points: points.length,
        sample: points.slice(0, 10),
      });
    }
    return points;
  }, [exerciseRows]);
  const e1rmRaw = useMemo(
    () => e1rmSeries.map((x) => ({ value: x.e1rm, date: x.weekLabel })),
    [e1rmSeries]
  );
  const e1rmFinite = useMemo(() => sanitizeSeries(e1rmRaw), [e1rmRaw]);
  const e1rmValues = useMemo(() => e1rmFinite.map((x) => x.value), [e1rmFinite]);
  const e1rmDebug = useMemo(() => buildChartDebug(e1rmValues), [e1rmValues]);
  useEffect(() => {
    if (!DEBUG_CHART) return;
    console.log("[CHART] raw points:", e1rmRaw.length, e1rmRaw.slice(0, 10));
    console.log("[CHART] finite points:", e1rmFinite.length, e1rmFinite.slice(0, 10));
    console.log("[CHART] min/max:", e1rmDebug.min, e1rmDebug.max);
    console.log("[CHART] domain:", e1rmDebug.yMin, e1rmDebug.yMax);
  }, [e1rmRaw, e1rmFinite, e1rmDebug]);

  const prList = useMemo(() => {
    if (!selectedExerciseId && !selectedExerciseName) return [];
    const byDate = new Map<string, ExerciseDataRow>();
    for (const row of exerciseRows) {
      const prev = byDate.get(row.date);
      const isBetter =
        !prev ||
        row.weightKg > prev.weightKg ||
        (row.weightKg === prev.weightKg && row.reps > prev.reps);
      if (isBetter) byDate.set(row.date, row);
    }
    const prRows = [...byDate.values()]
      .sort((a, b) => b.e1rm - a.e1rm)
      .slice(0, 8)
      .map((row) => ({
        exerciseId: row.exerciseId || selectedExerciseId || "selected_exercise",
        exerciseName: row.exerciseName || selectedExerciseName,
        weightKg: row.weightKg,
        reps: row.reps,
        e1rm: row.e1rm,
      }));
    if (DEBUG_ANALYTICS) {
      console.log("[ANALYTICS][PR]", {
        rows: prRows.length,
        sample: prRows.slice(0, 10),
      });
    }
    return prRows;
  }, [exerciseRows, selectedExerciseId, selectedExerciseName]);

  const muscleVolume = useMemo(
    () => computeMuscleVolume(sessionsAsc, EXERCISE_LIBRARY).filter((x) => x.totalVolume > 0),
    [sessionsAsc]
  );
  const muscleTotal = useMemo(
    () => muscleVolume.reduce((sum, x) => sum + x.totalVolume, 0),
    [muscleVolume]
  );
  const muscleBars = useMemo(() => muscleVolume.map((x) => x.totalVolume), [muscleVolume]);
  const visibleMuscles = useMemo(
    () => (showAllMuscles ? muscleVolume : muscleVolume.slice(0, 8)),
    [showAllMuscles, muscleVolume]
  );

  const hasSessions = sessionsAsc.length > 0;
  const coachStatus = hasSessions
    ? t("analytics.coach.status.ok")
    : t("analytics.coach.status.needData");
  const coachText = !hasSessions
    ? t("analytics.coach.empty")
    : sessions7 >= 3
      ? t("analytics.coach.activeHigh")
      : t("analytics.coach.activeLow");

  const coachCard = (
    <CoachCard
      title="FORGE COACH"
      status={coachStatus}
      metaRight={t("analytics.coach.streakHeatmap", {
        n: currentStreak,
        r: rangeLabel(heatmapRange),
      })}
    >
      {coachText}
    </CoachCard>
  );

  const consistencyCard = (
    <SectionCard
      title={t("analytics.section.consistency.title")}
      subtitle={t("analytics.section.consistency.subtitleShort")}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <ConsistencyHeatmap
          days={heatmapDays}
          range={heatmapRange}
          onRangeChange={setHeatmapRange}
          showSessionDot
        />
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <StatCard label={t("analytics.stats.sessions7d")} value={String(sessions7)} />
          <StatCard label={t("analytics.stats.sessions30d")} value={String(sessions30)} />
          <StatCard label={t("analytics.stats.streak")} value={`${currentStreak}`} />
        </div>
      </div>
    </SectionCard>
  );

  const volumeCard = (
    <SectionCard
      title={t("analytics.section.volume.title")}
      subtitle={t("analytics.section.volume.subtitle")}
    >
      {!hasSessions ? (
        <div style={{ color: "var(--muted)" }}>{t("analytics.section.volume.emptyNoSessions")}</div>
      ) : !hasWeeklyVolumePoints ? (
        <div style={{ color: "var(--muted)" }}>{t("analytics.section.volume.emptyInvalid")}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 6 }}>
              {t("analytics.section.volume.weeklyLabel")}
            </div>
            <MiniLineChart
              key={`global-weekly-${weeklyVolumeBars.length}`}
              points={weeklyVolumeBars}
              mode="bar"
              height={148}
              ariaLabel={t("analytics.aria.weeklyVolume")}
            />
            {DEBUG_CHART ? (
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>
                points: {weeklyVolumeDebug.points}, min: {weeklyVolumeDebug.min ?? "-"}, max:{" "}
                {weeklyVolumeDebug.max ?? "-"}, domain: {weeklyVolumeDebug.yMin ?? "-"}-
                {weeklyVolumeDebug.yMax ?? "-"}
              </div>
            ) : null}
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 6 }}>
              {t("analytics.section.volume.trendLabel")}
            </div>
            {hasTrendPoints ? (
              <MiniLineChart
                key={`global-trend-${volumeTrend.length}`}
                points={volumeTrend}
                secondaryPoints={weeklyVolumeBars}
                primaryLabel={t("analytics.section.volume.trendLabel")}
                secondaryLabel={t("analytics.section.volume.weeklyLabel")}
                mode="line"
                height={104}
                showGrid
                ariaLabel={t("analytics.aria.volumeTrend")}
              />
            ) : (
              <div
                className="forgeInnerPlate"
                style={{ minHeight: 104, display: "grid", placeItems: "center", color: "var(--muted)", padding: 12 }}
                >
                  {t("analytics.section.volume.trendMinWeeks")}
                </div>
              )}
            {DEBUG_CHART ? (
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>
                points: {volumeTrendDebug.points}, min: {volumeTrendDebug.min ?? "-"}, max:{" "}
                {volumeTrendDebug.max ?? "-"}, domain: {volumeTrendDebug.yMin ?? "-"}-
                {volumeTrendDebug.yMax ?? "-"}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </SectionCard>
  );

  const strengthCard = (
    <SectionCard
      title={t("analytics.section.strength.title")}
      subtitle={t("analytics.section.strength.subtitle")}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="kpiLabel">{t("analytics.section.strength.exerciseLabel")}</div>
          <input
            value={exerciseQuery}
            onChange={(e) => setExerciseQuery(e.target.value)}
            placeholder={t("analytics.section.strength.searchPlaceholder")}
            style={{
              width: "100%",
              borderRadius: 10,
              padding: "8px 10px",
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.26)",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 12,
              outline: "none",
            }}
          />
          <select
            value={selectedExerciseId ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              const next = exerciseOptions.find((ex) => ex.id === value) ?? null;
              setSelectedExerciseId(value);
              setSelectedExerciseName(next?.name ?? "");
              if (DEBUG_ANALYTICS) {
                console.log("[ANALYTICS][SELECT]", {
                  value,
                  selectedExerciseId: value,
                  selectedExerciseName: next?.name ?? "",
                });
              }
            }}
            style={{
              width: "100%",
              borderRadius: 10,
              padding: "8px 10px",
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.26)",
              color: "var(--text)",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            <option value="">{t("analytics.section.strength.selectPlaceholder")}</option>
            {exerciseOptions.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
          {!exerciseOptions.length ? (
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              {t("analytics.section.strength.searchNoHits")}
            </div>
          ) : null}
        </div>

        <div style={{ minHeight: 150, display: "grid", alignItems: "center" }}>
          {!selectedExercise ? (
            <div
              className="forgeInnerPlate"
              style={{ minHeight: 142, display: "grid", placeItems: "center", color: "var(--muted)", padding: 12 }}
            >
              {t("analytics.section.strength.selectExercise")}
            </div>
          ) : e1rmValues.length ? (
            <div className="forgeChartLayer" style={{ position: "relative", zIndex: 2 }}>
              <MiniLineChart
                key={`e1rm-${selectedExercise.id}-${e1rmValues.length}`}
                points={e1rmValues}
                mode="line"
                height={142}
                showGrid
                primaryLabel={t("analytics.charts.e1rm.title")}
                ariaLabel={t("analytics.aria.e1rmBest")}
              />
              {DEBUG_CHART ? (
                <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>
                  points: {e1rmDebug.points}, min: {e1rmDebug.min ?? "-"}, max: {e1rmDebug.max ?? "-"},
                  domain: {e1rmDebug.yMin ?? "-"}-{e1rmDebug.yMax ?? "-"}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className="forgeInnerPlate"
              style={{ minHeight: 142, display: "grid", placeItems: "center", color: "var(--muted)", padding: 12 }}
            >
              {t("analytics.charts.e1rm.empty")}
            </div>
          )}
        </div>

        <div className="forgeDivider" />

        <div className="forgeInnerPlate" style={{ padding: 12, display: "grid", gap: 8 }}>
          <div className="kpiLabel">{t("analytics.section.prList.title")}</div>
          {!selectedExercise ? (
            <div style={{ color: "var(--muted)" }}>{t("analytics.section.strength.selectExercise")}</div>
          ) : !prList.length ? (
            <div style={{ color: "var(--muted)" }}>{t("analytics.charts.e1rm.empty")}</div>
          ) : (
            prList.map((row) => (
              <div
                key={row.exerciseId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "baseline",
                }}
              >
                <div style={{ fontWeight: 800 }}>{row.exerciseName}</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {formatWeightFromKg(row.weightKg, units, 1)} {unitLabel(units)} x {row.reps} • {t("analytics.charts.e1rm.title")}{" "}
                  {formatWeightFromKg(row.e1rm, units, 1)} {unitLabel(units)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );

  const balanceCard = (
    <SectionCard
      title={t("analytics.section.balance.title")}
      subtitle={t("analytics.section.balance.subtitle")}
    >
      {!muscleVolume.length ? (
        <div style={{ color: "var(--muted)" }}>{t("analytics.section.balance.empty")}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <MiniLineChart
            points={muscleBars}
            mode="bar"
            height={122}
            barStyle="forgeMeter"
            ariaLabel={t("analytics.aria.muscleVolume")}
          />
          <div style={{ display: "grid", gap: 8 }}>
            {visibleMuscles.map((row) => (
              <BalanceBar
                key={row.muscle}
                label={row.muscle.toUpperCase()}
                valueLabel={`${formatLoadCompactFromKg(row.totalVolume, units)} • ${Math.round(
                  muscleTotal ? (row.totalVolume / muscleTotal) * 100 : 0
                )}%`}
                pct={muscleTotal ? row.totalVolume / muscleTotal : 0}
              />
            ))}
          </div>
          {muscleVolume.length > 8 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowAllMuscles((v) => !v)}
                style={{
                  borderRadius: 10,
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {showAllMuscles
                  ? t("analytics.section.balance.showLess")
                  : t("analytics.section.balance.showAll")}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );

  const widgets = useMemo(
    () => [
      { id: "analytics_coach", title: "FORGE COACH", useFrame: false, render: () => coachCard },
      {
        id: "analytics_consistency",
        title: t("analytics.section.consistency.title"),
        useFrame: false,
        render: () => consistencyCard,
      },
      {
        id: "analytics_volume",
        title: t("analytics.section.volume.title"),
        useFrame: false,
        render: () => volumeCard,
      },
      {
        id: "analytics_strength",
        title: t("analytics.section.strength.title"),
        useFrame: false,
        render: () => strengthCard,
      },
      {
        id: "analytics_balance",
        title: t("analytics.section.balance.title"),
        useFrame: false,
        render: () => balanceCard,
      },
    ],
    [coachCard, consistencyCard, volumeCard, strengthCard, balanceCard, t]
  );

  return (
    <div className="forgePage forgePageStack">
      <WidgetBoard storageKey={LS_KEYS.analytics_layout_v1} defs={widgets} />
    </div>
  );
}
