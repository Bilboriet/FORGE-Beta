// src/pages/DashboardPage.tsx
import { useCallback, useMemo, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useExercisePreferences } from "../hooks/useExercisePreferences";
import { useForgeSettings } from "../hooks/useForgeSettings";
import { useT } from "../hooks/useT";
import type { WorkoutSession } from "../types";
import { workoutVolume, sortByDateDesc } from "../utils";
import { LS_KEYS } from "../constants";
import { WidgetBoard } from "../components/layout/WidgetBoard";
import { ConsistencyHeatmap } from "../components/charts/ConsistencyHeatmap";
import { CoachCard } from "../components/ui/CoachCard";
import { exerciseDatabase } from "../data/exerciseDatabase";
import { DEFAULT_MUSCLE_TARGETS_V2, resolveMuscleTargetRangesV2 } from "../data/muscleTargetsV2";
import { buildHeatmapDays, computeCurrentStreak } from "../utils/consistency";
import { buildWeeklyCoachInsightSnapshotV2 } from "../features/coach/application/buildWeeklyCoachInsightSnapshotV2";
import { formatLoadCompactFromKg } from "../units";

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function daysAgo(n: number) {
  const dt = new Date();
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - n);
  return dt;
}

function withinLastDays(dateISO: string, days: number) {
  const dt = isoToDate(dateISO);
  dt.setHours(0, 0, 0, 0);
  return dt >= daysAgo(days);
}

function clamp(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function estimate1RM_Epley(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

function buildCoachExerciseCatalogFromDatabase() {
  const entries = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      muscleId: string;
      prescriptionWeight: number;
      redundancyGroup: string | null;
    }
  >();

  for (const entry of exerciseDatabase) {
    for (const muscleId of entry.primaryAnalysisTargets ?? []) {
      const key = `${entry.id}::${muscleId}`;
      const previous = entries.get(key);
      const next = {
        exerciseId: entry.id,
        exerciseName: entry.displayName,
        muscleId,
        prescriptionWeight: Math.max(previous?.prescriptionWeight ?? 0, 1),
        redundancyGroup: entry.movementTemplate ?? null,
      };
      entries.set(key, next);
    }

    for (const muscleId of entry.secondaryAnalysisTargets ?? []) {
      const key = `${entry.id}::${muscleId}`;
      const previous = entries.get(key);
      const next = {
        exerciseId: entry.id,
        exerciseName: entry.displayName,
        muscleId,
        prescriptionWeight: Math.max(previous?.prescriptionWeight ?? 0, 0.55),
        redundancyGroup: entry.movementTemplate ?? null,
      };
      entries.set(key, next);
    }
  }

  return Array.from(entries.values()).sort(
    (a, b) =>
      a.muscleId.localeCompare(b.muscleId) ||
      a.exerciseName.localeCompare(b.exerciseName) ||
      a.exerciseId.localeCompare(b.exerciseId)
  );
}

/**
 * IMPORTANT:
 * WidgetFrame/WidgetBoard already provides the main forge-surface plate.
 * Everything inside should be forgeInnerPlate (nested) to avoid double-card look.
 */
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="forgeInnerPlate" style={{ padding: 14, display: "grid", gap: 6 }}>
      <div className="kpiLabel">{label}</div>
      <div className="kpiValue" style={{ fontSize: 22 }}>
        {value}
      </div>
      {sub ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{sub}</div> : null}
    </div>
  );
}

function BarRow({
  label,
  value,
  pct,
  percentLabel,
}: {
  label: string;
  value: string;
  pct: number;
  percentLabel?: string;
}) {
  const p = Math.max(0, Math.min(1, pct));

  return (
    <div className="forgeInnerPlate" style={{ padding: 12, display: "grid", gap: 8, borderRadius: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900 }}>{label}</div>
        <div style={{ display: "grid", justifyItems: "end", gap: 2 }}>
          {percentLabel ? <div style={{ fontWeight: 950, fontSize: 14 }}>{percentLabel}</div> : null}
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{value}</div>
        </div>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${p * 100}%`,
            background: "linear-gradient(180deg, var(--accentGlow) 0%, var(--accentHot) 65%, var(--accentHot) 100%)",
            boxShadow: "0 0 8px rgba(var(--accentGlow-rgb), 0.26)",
            borderRadius: 999,
            transition: "width 280ms ease",
          }}
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [sessions] = useLocalStorage<WorkoutSession[]>(LS_KEYS.sessions, []);
  const [settings] = useForgeSettings();
  const { favoriteIds, recentIds } = useExercisePreferences();
  const t = useT();
  const units = settings?.units ?? "kg";

  const fmtLoad = useCallback(
    (kg: number) => formatLoadCompactFromKg(kg, units),
    [units]
  );

  const [heatmapRange, setHeatmapRange] = useState<30 | 90 | 180>(90);

  const sessionsDesc = useMemo(() => sortByDateDesc(sessions), [sessions]);
  const sessionsAsc = useMemo(() => [...sessionsDesc].reverse(), [sessionsDesc]);
  const weeklySessions = useMemo(
    () => sessionsAsc.filter((session) => withinLastDays(session.date, 7)),
    [sessionsAsc]
  );
  const coachExerciseCatalog = useMemo(() => buildCoachExerciseCatalogFromDatabase(), []);
  const coachTargets = useMemo(() => resolveMuscleTargetRangesV2(DEFAULT_MUSCLE_TARGETS_V2), []);
  const coachSnapshot = useMemo(
    () =>
      buildWeeklyCoachInsightSnapshotV2({
        sessions: weeklySessions,
        targets: coachTargets,
        exerciseCatalog: coachExerciseCatalog,
        favoriteExerciseIds: favoriteIds,
        recentlyUsedExerciseIds: recentIds,
        generatedAt: "dashboard",
      }),
    [coachExerciseCatalog, coachTargets, favoriteIds, recentIds, weeklySessions]
  );

  const stats = useMemo(() => {
    const total = sessionsAsc.length;
    const last7 = sessionsAsc.filter((s) => withinLastDays(s.date, 7));
    const last30 = sessionsAsc.filter((s) => withinLastDays(s.date, 30));

    const volAll = sessionsAsc.reduce((sum, s) => sum + workoutVolume(s), 0);
    const vol30 = last30.reduce((sum, s) => sum + workoutVolume(s), 0);

    const avgVolAll = total ? volAll / total : 0;
    const avgVol30 = last30.length ? vol30 / last30.length : 0;

    const lastWorkout = total ? sessionsAsc[sessionsAsc.length - 1] : null;

    let biggestWorkout:
      | { id: string; date: string; title: string; volume: number }
      | null = null;

    for (const s of sessionsAsc) {
      const v = workoutVolume(s);
      if (!biggestWorkout || v > biggestWorkout.volume) {
        biggestWorkout = {
          id: s.id,
          date: s.date,
          title: s.title?.trim() ? s.title : "",
          volume: v,
        };
      }
    }

    const volumeByExercise = new Map<string, { name: string; volume: number; sets: number }>();
    const volumeByMuscle = new Map<string, number>();
    const prTopWeight = new Map<string, number>();
    const prE1rm = new Map<string, number>();
    const prExVolume = new Map<string, number>();

    for (const s of sessionsAsc) {
      for (const b of s.exercises ?? []) {
        const exId = b.exercise.id;
        const exName = b.exercise.name;
        const mg = b.exercise.muscleGroup;

        let exVol = 0;
        let topW = 0;
        let topR = 0;

        for (const set of b.sets ?? []) {
          exVol += set.reps * set.weightKg;

          if (set.weightKg > topW) {
            topW = set.weightKg;
            topR = set.reps;
          } else if (set.weightKg === topW) {
            topR = Math.max(topR, set.reps);
          }
        }

        const e1rm = topW > 0 && topR > 0 ? estimate1RM_Epley(topW, topR) : 0;

        const prev = volumeByExercise.get(exId) ?? { name: exName, volume: 0, sets: 0 };
        volumeByExercise.set(exId, {
          name: exName,
          volume: prev.volume + exVol,
          sets: prev.sets + (b.sets?.length ?? 0),
        });

        volumeByMuscle.set(mg, (volumeByMuscle.get(mg) ?? 0) + exVol);

        prTopWeight.set(exId, Math.max(prTopWeight.get(exId) ?? 0, topW));
        prE1rm.set(exId, Math.max(prE1rm.get(exId) ?? 0, e1rm));
        prExVolume.set(exId, Math.max(prExVolume.get(exId) ?? 0, exVol));
      }
    }

    let mostTrained: { id: string; name: string; volume: number; sets: number } | null = null;
    for (const [id, v] of volumeByExercise.entries()) {
      if (!mostTrained || v.volume > mostTrained.volume) {
        mostTrained = { id, name: v.name, volume: v.volume, sets: v.sets };
      }
    }

    const muscleTotal = Array.from(volumeByMuscle.values()).reduce((a, b) => a + b, 0);
    const muscleRows = Array.from(volumeByMuscle.entries())
      .map(([mg, vol]) => ({ mg, vol, pct: muscleTotal ? vol / muscleTotal : 0 }))
      .sort((a, b) => b.vol - a.vol);

    // PR momentum: sessions in the last 30 days that tie top weight / e1RM / exercise volume.
    let prSessions30 = 0;
    const eps = 1e-6;

    for (const s of last30) {
      let hit = false;
      for (const b of s.exercises ?? []) {
        const exId = b.exercise.id;
        let exVol = 0;
        let topW = 0;
        let topR = 0;

        for (const set of b.sets ?? []) {
          exVol += set.reps * set.weightKg;
          if (set.weightKg > topW) {
            topW = set.weightKg;
            topR = set.reps;
          } else if (set.weightKg === topW) {
            topR = Math.max(topR, set.reps);
          }
        }

        const e1rm = topW > 0 && topR > 0 ? estimate1RM_Epley(topW, topR) : 0;
        if (
          (topW > 0 && topW === (prTopWeight.get(exId) ?? 0)) ||
          (e1rm > 0 && e1rm >= (prE1rm.get(exId) ?? 0) - eps) ||
          (exVol > 0 && exVol === (prExVolume.get(exId) ?? 0))
        ) {
          hit = true;
          break;
        }
      }
      if (hit) prSessions30 += 1;
    }

    const weekKey = (d: Date) => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
      const week1 = new Date(dt.getFullYear(), 0, 4);
      const weekNo =
        1 +
        Math.round(((dt.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${dt.getFullYear()}-W${weekNo}`;
    };

    // Week streak: only count a week if it has >= 3 sessions.
    const weekCounts = new Map<string, number>();
    const dayCountsInCurrentWeek = new Set<string>();

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentWeek = weekKey(now);

    for (const s of sessionsAsc) {
      const d = isoToDate(s.date);
      const wk = weekKey(d);
      weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
      if (wk === currentWeek) dayCountsInCurrentWeek.add(s.date);
    }

    let streak = 0;
    const cursor = new Date(now);
    for (;;) {
      const k = weekKey(cursor);
      const cnt = weekCounts.get(k) ?? 0;
      if (cnt < 3) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }

    const currentWeekCount = weekCounts.get(currentWeek) ?? 0;
    const activeDaysThisWeek = dayCountsInCurrentWeek.size;
    const restDaysThisWeek = Math.max(0, 7 - activeDaysThisWeek);

    return {
      total,
      sessions7: last7.length,
      sessions30: last30.length,
      volAll,
      vol30,
      avgVolAll,
      avgVol30,
      lastWorkout,
      biggestWorkout,
      mostTrained,
      muscleRows,
      prSessions30,
      weekStreak: streak,
      currentWeekCount,
      activeDaysThisWeek,
      restDaysThisWeek,
    };
  }, [sessionsAsc]);

  const hasSessions = sessions.length > 0;

  const heatmapDays = useMemo(() => buildHeatmapDays(sessionsAsc, heatmapRange), [sessionsAsc, heatmapRange]);
  const currentStreak = useMemo(() => computeCurrentStreak(heatmapDays), [heatmapDays]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgets: any[] = useMemo(() => {
    if (!hasSessions) {
      return [
        {
          id: "empty",
          title: t("dashboard.states.empty.title"),
          subtitle: t("dashboard.states.empty.body"),
          render: () => (
            <div style={{ display: "grid", gap: 10, color: "var(--muted)" }}>
              <div style={{ fontWeight: 900, color: "var(--text)" }}>{t("dashboard.states.empty.noSessionsTitle")}</div>
              <div>{t("dashboard.states.empty.noSessionsBody")}</div>
            </div>
          ),
          renderMin: () => <div style={{ color: "var(--muted)" }}>{t("dashboard.states.empty.noSessionsMin")}</div>,
        },
      ];
    }

    return [
      {
        id: "dashboard_heatmap",
        title: t("dashboard.widgets.consistency.title"),
        subtitle: t("dashboard.widgets.consistency.subtitle"),
        render: () => (
          <ConsistencyHeatmap
            days={heatmapDays}
            range={heatmapRange}
            onRangeChange={setHeatmapRange}
            showSessionDot
          />
        ),
        renderMin: () => (
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
            <div>{t("dashboard.widgets.consistency.streakLabel")}</div>
            <div style={{ color: "var(--text)", fontWeight: 900 }}>{t("common.days", { n: currentStreak })}</div>
          </div>
        ),
        canWiden: true,
      },
      {
        id: "coach_insights",
        title: "FORGE COACH",
        subtitle: "Snapshot-driven weekly insight",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <CoachCard
              title="Coach Insights"
              status={`${coachSnapshot.summary.actionableCount} actionable`}
              metaRight={`${Math.round(coachSnapshot.totalStimulus)}`}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  className="forgeInnerPlate"
                  style={{
                    padding: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 8,
                  }}
                >
                  <div>
                    <div className="kpiLabel">Under</div>
                    <div className="kpiValue" style={{ fontSize: 18 }}>{coachSnapshot.summary.underMuscles}</div>
                  </div>
                  <div>
                    <div className="kpiLabel">Balanced</div>
                    <div className="kpiValue" style={{ fontSize: 18 }}>{coachSnapshot.summary.balancedMuscles}</div>
                  </div>
                  <div>
                    <div className="kpiLabel">Over</div>
                    <div className="kpiValue" style={{ fontSize: 18 }}>{coachSnapshot.summary.overMuscles}</div>
                  </div>
                </div>

                {coachSnapshot.topPriorities.length > 0 ? (
                  coachSnapshot.topPriorities.slice(0, 3).map((priority) => (
                    <div
                      key={priority.muscleId}
                      className="forgeInnerPlate"
                      style={{ padding: 12, display: "grid", gap: 6, borderRadius: 14 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                        <div style={{ fontWeight: 900 }}>{priority.headline}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>
                          {priority.totalSuggestedSetChange > 0 ? "+" : ""}
                          {priority.totalSuggestedSetChange} sets
                        </div>
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>{priority.summary}</div>
                      {priority.exercises.length > 0 ? (
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>
                          {priority.exercises
                            .slice(0, 2)
                            .map((exercise) => `${exercise.exerciseName} (${exercise.displayText.toLowerCase()})`)
                            .join(" • ")}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="forgeInnerPlate" style={{ padding: 12, color: "var(--muted)", borderRadius: 14 }}>
                    No actionable priorities yet. Snapshot is active and ready for explicit muscle targets.
                  </div>
                )}
              </div>
            </CoachCard>
          </div>
        ),
        renderMin: () => (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ color: "var(--muted)" }}>Actionable</div>
              <div style={{ fontWeight: 900 }}>{coachSnapshot.summary.actionableCount}</div>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              {coachSnapshot.topPriorities[0]?.headline ?? "No active priority"}
            </div>
          </div>
        ),
      },
      {
        id: "kpis",
        title: t("dashboard.cards.weekSummary.title"),
        subtitle: t("dashboard.cards.weekSummary.subtitle"),
        render: () => (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <KpiCard label={t("dashboard.kpis.sessions7d.label")} value={String(stats.sessions7)} sub={t("dashboard.kpis.sessions7d.sub")} />
            <KpiCard label={t("dashboard.kpis.sessions30d.label")} value={String(stats.sessions30)} sub={t("dashboard.kpis.sessions30d.sub")} />
            <KpiCard label={t("dashboard.kpis.volume30d.label")} value={fmtLoad(stats.vol30)} sub={t("dashboard.kpis.volume30d.sub", { avg: fmtLoad(stats.avgVol30) })} />

            {/* Nested plate (NOT forge-surface) */}
            <div className="forgeInnerPlate" style={{ padding: 14, display: "grid", gap: 10 }}>
              <div className="kpiLabel">{t("dashboard.kpis.frequencyConsistency.title")}</div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div className="kpiValue" style={{ fontSize: 22 }}>
                  {t("common.weeks", { n: stats.weekStreak })}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{t("dashboard.kpis.weekProgress", { n: stats.currentWeekCount })}</div>
              </div>

              <div style={{ height: 10, borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface2)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(1, stats.currentWeekCount / 3)) * 100}%`,
                    background: "linear-gradient(180deg, var(--accentGlow) 0%, var(--accentHot) 65%, var(--accentHot) 100%)",
                    boxShadow: "0 0 8px rgba(var(--accentGlow-rgb), 0.26)",
                    borderRadius: 999,
                    transition: "width 280ms ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{t("dashboard.kpis.restDays.label")}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{t("dashboard.kpis.restDays.value", { n: stats.restDaysThisWeek })}</div>
              </div>

              <div style={{ height: 10, borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface2)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(1, stats.restDaysThisWeek / 7)) * 100}%`,
                    background: "linear-gradient(180deg, var(--accentGlow) 0%, var(--accentHot) 65%, var(--accentHot) 100%)",
                    boxShadow: "0 0 8px rgba(var(--accentGlow-rgb), 0.26)",
                    borderRadius: 999,
                    transition: "width 280ms ease",
                  }}
                />
              </div>
            </div>
          </div>
        ),
        renderMin: () => (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ color: "var(--muted)" }}>{t("dashboard.kpis.volume30d.short")}</div>
              <div style={{ fontWeight: 900 }}>{fmtLoad(stats.vol30)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ color: "var(--muted)" }}>{t("dashboard.widgets.consistency.streakLabel")}</div>
              <div style={{ fontWeight: 900 }}>{t("common.weeks", { n: stats.weekStreak })}</div>
            </div>
          </div>
        ),
      },
      {
        id: "last",
        title: t("dashboard.widgets.lastWorkout.title"),
        subtitle: t("dashboard.widgets.lastWorkout.subtitle"),
        render: () => (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>
              {stats.lastWorkout?.title?.trim() ? stats.lastWorkout.title : t("common.session")}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {stats.lastWorkout?.date} - {t("dashboard.widgets.lastWorkout.exercisesCount", { n: stats.lastWorkout?.exercises?.length ?? 0 })}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {t("dashboard.widgets.lastWorkout.volumeLabel")}: <span style={{ color: "var(--text)", fontWeight: 900 }}>{fmtLoad(stats.lastWorkout ? workoutVolume(stats.lastWorkout) : 0)}</span>
            </div>
          </div>
        ),
        renderMin: () => (
          <div style={{ color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
            <span>{stats.lastWorkout?.date}</span>
            <span style={{ color: "var(--text)", fontWeight: 900 }}>{fmtLoad(stats.lastWorkout ? workoutVolume(stats.lastWorkout) : 0)}</span>
          </div>
        ),
      },
      {
        id: "muscle",
        title: t("dashboard.widgets.muscleBalance.title"),
        subtitle: t("dashboard.widgets.muscleBalance.subtitle"),
        render: () => (
          <div style={{ display: "grid", gap: 10 }}>
            {stats.muscleRows.slice(0, 6).map((r) => (
              <BarRow key={r.mg} label={r.mg} value={fmtLoad(r.vol)} pct={clamp(r.pct)} percentLabel={`${Math.round(clamp(r.pct) * 100)}%`} />
            ))}
          </div>
        ),
        renderMin: () => {
          const top = stats.muscleRows[0];
          if (!top) return <div style={{ color: "var(--muted)" }}>{t("common.noData")}</div>;
          return (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "var(--muted)" }}>{t("dashboard.widgets.muscleBalance.mostVolume")}</div>
              <div style={{ fontWeight: 900 }}>{top.mg}</div>
            </div>
          );
        },
      },
      {
        id: "highlights",
        title: t("dashboard.widgets.highlights.title"),
        subtitle: t("dashboard.widgets.highlights.subtitle"),
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="forgeInnerPlate" style={{ padding: 12, display: "grid", gap: 6, borderRadius: 14 }}>
              <div className="kpiLabel">{t("dashboard.widgets.highlights.biggestWorkout")}</div>
              <div style={{ fontWeight: 950 }}>{stats.biggestWorkout?.title?.trim() ? stats.biggestWorkout.title : t("common.session")}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {stats.biggestWorkout?.date} - {fmtLoad(stats.biggestWorkout?.volume ?? 0)}
              </div>
            </div>

            <div className="forgeInnerPlate" style={{ padding: 12, display: "grid", gap: 6, borderRadius: 14 }}>
              <div className="kpiLabel">{t("dashboard.widgets.highlights.mostTrained")}</div>
              <div style={{ fontWeight: 950 }}>{stats.mostTrained?.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {t("dashboard.widgets.highlights.mostTrainedLine", {
                  volume: fmtLoad(stats.mostTrained?.volume ?? 0),
                  sets: stats.mostTrained?.sets ?? 0,
                })}
              </div>
            </div>

            <div className="forgeInnerPlate" style={{ padding: 12, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, borderRadius: 14 }}>
              <div>
                <div className="kpiLabel">{t("dashboard.widgets.highlights.prMomentum")}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("dashboard.widgets.highlights.prMomentumDesc")}</div>
              </div>
              <div style={{ fontWeight: 950, fontSize: 20, color: "var(--red)" }}>{stats.prSessions30}</div>
            </div>
          </div>
        ),
        renderMin: () => (
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
            <span>{t("dashboard.widgets.highlights.prMomentumShort")}</span>
            <span style={{ color: "var(--red)", fontWeight: 950 }}>{stats.prSessions30}</span>
          </div>
        ),
      },
    ];
  }, [coachSnapshot, hasSessions, stats, t, heatmapDays, heatmapRange, currentStreak, fmtLoad]);

  const presets = useMemo(() => {
    function buildDefault(defs: typeof widgets) {
      return {
        version: 1 as const,
        widgets: defs.map((d, i) => ({
          id: d.id,
          order: i,
          hidden: d.defaultHidden ?? false,
          collapsed: d.defaultCollapsed ?? false,
          minimized: d.defaultMinimized ?? false,
          wide: false,
        })),
      };
    }

    function buildMinimal() {
      const base = buildDefault(widgets);
      const keep = new Set(widgets.slice(0, 4).map((w) => w.id));
      const next = base.widgets.map((w) => ({ ...w, hidden: !keep.has(w.id) }));
      next.forEach((w, i) => (w.order = i));
      return { version: 1 as const, widgets: next };
    }

    return [
      { id: "default", label: t("common.default"), build: () => buildDefault(widgets) },
      { id: "minimal", label: t("common.minimal"), build: () => buildMinimal() },
    ];
  }, [widgets, t]);

  return (
    <div className="forgePage forgePageStack">
      <div className="dashboard-section dashboard-widget-stack">
        <WidgetBoard storageKey={LS_KEYS.dashboard_layout_v1} defs={widgets} presets={presets} />
      </div>
    </div>
  );
}

