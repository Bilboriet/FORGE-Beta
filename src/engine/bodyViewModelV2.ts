import { exerciseMuscleMapV2 } from "../data/exerciseMuscleMapV2";
import { musclesV2, muscleGroupsV2, balanceBucketsV2 } from "../data/musclesV2";
import { aggregateMuscleStimulus, type SetLogV2 } from "./balanceEngineV2";
import { buildBestE1rmMap, type RawSet } from "./bestE1rmEngineV2";

export type BodyTimeWindow = "last7" | "last30" | "last180" | "all";
export type BodyMode = "stimulus" | "stabilizers";
export type BodyRegionKey = "chest" | "back" | "delts" | "arms" | "legs" | "core";

export type MuscleStat = {
  muscleId: string;
  label: string;
  value: number;
  rawValue: number;
  displayValue: number;
  percent: number;
  isAdvanced: boolean;
  hiddenByDefault: boolean;
};

export type RegionStats = {
  key: BodyRegionKey;
  label: string;
  total: number;
  totalRaw: number;
  muscles: MuscleStat[];
  top3: MuscleStat[];
};

export type BodyViewModel = {
  mode: BodyMode;
  window: BodyTimeWindow;
  hasData: boolean;
  ignoredSets: number;
  muscles: MuscleStat[];
  regions: Record<BodyRegionKey, RegionStats>;
};

type BuildInput = {
  sessions: any[];
  mode: BodyMode;
  window: BodyTimeWindow;
};

const REGIONS: Array<{ key: BodyRegionKey; label: string; regionId: string }> = [
  { key: "chest", label: "Chest", regionId: "region_chest" },
  { key: "back", label: "Back", regionId: "region_back" },
  { key: "delts", label: "Delts", regionId: "region_shoulders" },
  { key: "arms", label: "Arms", regionId: "region_arms" },
  { key: "legs", label: "Legs", regionId: "region_legs" },
  { key: "core", label: "Core", regionId: "region_core" },
];

const mappingByExerciseId = new Map(exerciseMuscleMapV2.map((m) => [m.exerciseId, m] as const));
const muscleById = new Map(musclesV2.map((m) => [m.id, m] as const));
const groupById = new Map(muscleGroupsV2.map((g) => [g.id, g] as const));
const bucketById = new Map(balanceBucketsV2.map((b) => [b.id, b] as const));

const REGION_BUCKETS: Record<BodyRegionKey, string[]> = {
  chest: ["bucket_chest_upper", "bucket_chest_sternal", "bucket_chest_stabilizers"],
  back: ["bucket_back_lats", "bucket_back_upper", "bucket_back_scapular"],
  delts: ["bucket_shoulders_front", "bucket_shoulders_side", "bucket_shoulders_rear", "bucket_shoulders_cuff"],
  arms: [
    "bucket_arms_biceps",
    "bucket_arms_triceps",
    "bucket_arms_forearm_flexors",
    "bucket_arms_forearm_extensors",
    "bucket_arms_rotation",
  ],
  legs: [
    "bucket_legs_quads",
    "bucket_legs_hamstrings",
    "bucket_legs_glutes",
    "bucket_legs_adductors",
    "bucket_legs_calves",
    "bucket_legs_abductors",
    "bucket_legs_tibialis",
  ],
  core: ["bucket_core_abs", "bucket_core_obliques", "bucket_core_erectors", "bucket_core_deep"],
};

// Adapter-level ownership override to avoid double counting between Back/Core without touching source data IDs.
const MUSCLE_BUCKET_OVERRIDE: Partial<Record<string, string>> = {
  m_erector_spinae: "bucket_core_erectors",
  m_multifidus: "bucket_core_erectors",
};

function daysForWindow(window: BodyTimeWindow): number | undefined {
  if (window === "last7") return 7;
  if (window === "last30") return 30;
  if (window === "last180") return 180;
  return undefined;
}

function inWindow(sessionDate: string | undefined, window: BodyTimeWindow): boolean {
  if (window === "all") return true;
  if (!sessionDate) return false;

  const d = new Date(sessionDate);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days <= (window === "last7" ? 7 : window === "last30" ? 30 : 180);
}

function toSetLogs(sessions: any[], window: BodyTimeWindow): { setLogs: SetLogV2[]; ignoredSets: number } {
  const rawSets: RawSet[] = [];
  let ignoredSets = 0;

  for (const session of Array.isArray(sessions) ? sessions : []) {
    const date = typeof session?.date === "string" ? session.date : undefined;
    if (!inWindow(date, window)) continue;

    const blocks = Array.isArray(session?.exercises) ? session.exercises : [];
    for (const block of blocks) {
      const exerciseId = String(block?.exercise?.id ?? "");
      const mapping = mappingByExerciseId.get(exerciseId);
      if (!mapping) {
        const sets = Array.isArray(block?.sets) ? block.sets : [];
        ignoredSets += sets.length;
        continue;
      }

      for (const set of Array.isArray(block?.sets) ? block.sets : []) {
        const load = Number(set?.weightKg);
        const reps = Number(set?.reps);
        if (!(load > 0) || !(reps > 0)) {
          ignoredSets += 1;
          continue;
        }
        rawSets.push({ exerciseId, load, reps, date });
      }
    }
  }

  const bestE1rmMap = buildBestE1rmMap({
    sets: rawSets,
    daysWindow: daysForWindow(window),
    repsCap: 12,
  });

  const setLogs: SetLogV2[] = [];
  for (const row of rawSets) {
    const bestE1rm = Number(bestE1rmMap[row.exerciseId] ?? 0);
    if (!(bestE1rm > 0)) {
      ignoredSets += 1;
      continue;
    }
    setLogs.push({
      exerciseId: row.exerciseId,
      load: row.load,
      reps: row.reps,
      bestE1rm,
    });
  }

  return { setLogs, ignoredSets };
}

function isAdvancedMuscle(muscleId: string): boolean {
  const m = muscleById.get(muscleId);
  if (!m) return false;
  const g = groupById.get(m.groupId);
  const b = bucketById.get(m.uiRollupTarget);
  return !!(g?.isAdvanced || b?.isAdvanced);
}

function includeByMode(muscleId: string, mode: BodyMode): boolean {
  const m = muscleById.get(muscleId);
  if (!m) return false;
  const stabilizer = m.tags.includes("stabilizer");
  return mode === "stabilizers" ? stabilizer : !stabilizer;
}

function resolvedBucketForMuscle(muscleId: string): string | null {
  const m = muscleById.get(muscleId);
  if (!m) return null;
  return MUSCLE_BUCKET_OVERRIDE[muscleId] ?? m.uiRollupTarget;
}

export function buildBodyViewModelV2({ sessions, mode, window }: BuildInput): BodyViewModel {
  const { setLogs, ignoredSets } = toSetLogs(sessions, window);
  const muscleTotals = aggregateMuscleStimulus(setLogs);

  const regions = REGIONS.reduce((acc, region) => {
    const ownedBuckets = new Set(REGION_BUCKETS[region.key] ?? []);
    const regionMuscles = musclesV2.filter((m) => {
      const bucketId = resolvedBucketForMuscle(m.id);
      if (!bucketId) return false;
      if (!ownedBuckets.has(bucketId)) return false;
      return includeByMode(m.id, mode);
    });
    const rawRows = regionMuscles.map((m) => {
      const rawValue = Number(muscleTotals[m.id] ?? 0);
      return {
        muscleId: m.id,
        label: m.displayName,
        rawValue,
        value: 0,
        isAdvanced: isAdvancedMuscle(m.id),
        hiddenByDefault: !!m.bodymap?.hiddenByDefault,
      };
    });

    const safeTotalRaw = rawRows.reduce((sum, row) => sum + (Number.isFinite(row.rawValue) ? row.rawValue : 0), 0);
    const totalRaw = safeTotalRaw > 0 ? safeTotalRaw : 0;

    let muscles: MuscleStat[];
    let top3: MuscleStat[];

    if (totalRaw <= 0) {
      muscles = rawRows
        .map((row) => ({
          ...row,
          value: 0,
          rawValue: 0,
          displayValue: 0,
          percent: 0,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      top3 = [];
    } else {
      muscles = rawRows
        .map((row) => {
          const raw = Number.isFinite(row.rawValue) ? row.rawValue : 0;
          const displayValue = raw / totalRaw;
          const safeDisplay = Number.isFinite(displayValue) ? displayValue : 0;
          return {
            ...row,
            value: safeDisplay,
            rawValue: raw,
            displayValue: safeDisplay,
            percent: Number.isFinite(safeDisplay * 100) ? safeDisplay * 100 : 0,
          } satisfies MuscleStat;
        })
        .sort((a, b) => {
          if (b.value !== a.value) return b.value - a.value;
          return a.label.localeCompare(b.label);
        });
      top3 = muscles.slice(0, 3);
    }

    acc[region.key] = {
      key: region.key,
      label: region.label,
      total: totalRaw,
      totalRaw,
      muscles,
      top3,
    };
    return acc;
  }, {} as Record<BodyRegionKey, RegionStats>);

  return {
    mode,
    window,
    hasData: Object.values(regions).some((r) => r.totalRaw > 0),
    ignoredSets,
    muscles: Object.values(regions).flatMap((region) => region.muscles),
    regions,
  };
}
