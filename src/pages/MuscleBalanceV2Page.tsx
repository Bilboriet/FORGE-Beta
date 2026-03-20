import { useMemo, useState } from "react";
import { LS_KEYS } from "../constants";
import { exerciseDatabaseRefs } from "../data/exerciseDatabase";
import { exerciseMuscleMapV2 } from "../data/exerciseMuscleMapV2";
import { balanceBucketsV2, regionsV2 } from "../data/musclesV2";
import {
  aggregateMuscleStimulus,
  computeBucketPercents,
  rollupToBuckets,
  rollupToRegions,
  type PercentMode,
  type SetLogV2,
} from "../engine/balanceEngineV2";
import { buildBestE1rmMap, type RawSet } from "../engine/bestE1rmEngineV2";
import { useLocalStorage } from "../hooks/useLocalStorage";

export function MuscleBalanceV2Page({ onBack }: { onBack?: () => void }) {
  const [sessions] = useLocalStorage<any[]>(LS_KEYS.sessions, []);
  const [percentMode, setPercentMode] = useState<PercentMode>("withinRegion");
  const [includeAdvanced, setIncludeAdvanced] = useState(false);

  const compiled = useMemo(() => {
    const validExerciseIds = new Set(exerciseDatabaseRefs.map((x) => x.id));
    const mappedExerciseIds = new Set(exerciseMuscleMapV2.map((x) => x.exerciseId));
    let ignoredInvalid = 0;
    let ignoredUnmapped = 0;

    const rawSets: RawSet[] = [];

    for (const session of Array.isArray(sessions) ? sessions : []) {
      const date = typeof session?.date === "string" ? session.date : undefined;
      const exercises = Array.isArray(session?.exercises) ? session.exercises : [];

      for (const block of exercises) {
        const exerciseId = String(block?.exercise?.id ?? "");
        const isMapped = validExerciseIds.has(exerciseId) && mappedExerciseIds.has(exerciseId);
        const sets = Array.isArray(block?.sets) ? block.sets : [];

        for (const set of sets) {
          const load = Number(set?.weightKg);
          const reps = Number(set?.reps);

          if (!(load > 0) || !(reps > 0)) {
            ignoredInvalid += 1;
            continue;
          }

          if (!isMapped) {
            ignoredUnmapped += 1;
            continue;
          }

          rawSets.push({ exerciseId, load, reps, date });
        }
      }
    }

    const bestE1rmMap = buildBestE1rmMap({ sets: rawSets, daysWindow: 56, repsCap: 12 });
    let ignoredNoBest = 0;

    const setLogs: SetLogV2[] = rawSets
      .map((set) => {
        const bestE1rm = Number(bestE1rmMap[set.exerciseId] ?? 0);
        if (!(bestE1rm > 0)) {
          ignoredNoBest += 1;
          return null;
        }
        return {
          exerciseId: set.exerciseId,
          load: set.load,
          reps: set.reps,
          bestE1rm,
        } satisfies SetLogV2;
      })
      .filter((x): x is SetLogV2 => x !== null);

    return {
      setLogs,
      ignoredCount: ignoredInvalid + ignoredUnmapped + ignoredNoBest,
    };
  }, [sessions]);

  const muscleTotals = useMemo(() => aggregateMuscleStimulus(compiled.setLogs), [compiled.setLogs]);
  const regionTotals = useMemo(() => rollupToRegions(muscleTotals), [muscleTotals]);
  const bucketTotals = useMemo(() => rollupToBuckets(muscleTotals), [muscleTotals]);
  const bucketPercents = useMemo(
    () => computeBucketPercents(bucketTotals, regionTotals, percentMode, includeAdvanced),
    [bucketTotals, regionTotals, percentMode, includeAdvanced]
  );

  return (
    <div className="forgePage">
      <div className="forge-surface forgeCardInner" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 20 }}>Muscle Balance</div>
          {onBack ? (
            <button className="forge-btn forge-btn--metal" onClick={onBack}>
              Back
            </button>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className={
              percentMode === "withinRegion" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"
            }
            onClick={() => setPercentMode("withinRegion")}
          >
            Within Region
          </button>
          <button
            className={
              percentMode === "wholeBody" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"
            }
            onClick={() => setPercentMode("wholeBody")}
          >
            Whole Body
          </button>
          <button
            className={includeAdvanced ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
            onClick={() => setIncludeAdvanced((x) => !x)}
          >
            {includeAdvanced ? "Advanced ON" : "Advanced OFF"}
          </button>
        </div>

        {compiled.ignoredCount > 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Ignored {compiled.ignoredCount} sets</div>
        ) : null}
      </div>

      {compiled.setLogs.length === 0 ? (
        <div className="forge-surface forgeCardInner" style={{ color: "var(--muted)", fontSize: 13 }}>
          No V2-mapped chest/shoulder sets found yet. Log workouts using V2 exercise IDs to populate this view.
        </div>
      ) : null}

      {regionsV2.map((region) => {
        const rows = bucketPercents.filter((x) => x.regionId === region.id);
        if (!rows.length) return null;
        const regionPercentSum = rows.reduce((sum, x) => sum + x.percent, 0);
        return (
          <div key={region.id} className="forge-surface forgeCardInner" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div style={{ color: "var(--text)", fontWeight: 900 }}>{region.displayName}</div>
              {percentMode === "withinRegion" ? (
                <div style={{ color: "var(--muted)", fontSize: 12 }}>Sum {regionPercentSum.toFixed(1)}%</div>
              ) : null}
            </div>

            <div
              className="forgeInnerPlate"
              style={{ display: "flex", overflow: "hidden", minHeight: 16, borderRadius: 999, gap: 0 }}
            >
              {rows.map((row, idx) => (
                <div
                  key={row.bucketId}
                  style={{
                    width: `${Math.max(0, row.percent)}%`,
                    minWidth: row.percent > 0 ? 2 : 0,
                    borderLeft: idx === 0 ? "none" : "1px solid var(--strokeSubtle)",
                    background:
                      idx % 3 === 0
                        ? "rgba(var(--accentHot-rgb),0.32)"
                        : idx % 3 === 1
                        ? "rgba(var(--accentHot-rgb),0.24)"
                        : "rgba(var(--accentHot-rgb),0.18)",
                  }}
                />
              ))}
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              {rows.map((row) => {
                const bucket = balanceBucketsV2.find((b) => b.id === row.bucketId);
                return (
                  <div
                    key={row.bucketId}
                    className="forgeInnerPlate"
                    style={{
                      padding: "8px 10px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "var(--text)", fontWeight: 700 }}>{bucket?.displayName ?? row.bucketId}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.percent.toFixed(1)}%</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.value.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MuscleBalanceV2Page;
