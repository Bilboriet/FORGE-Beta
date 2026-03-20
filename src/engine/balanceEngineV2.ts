import { balanceBucketsV2, musclesV2, regionsV2 } from "../data/musclesV2";
import { exerciseMuscleMapV2 } from "../data/exerciseMuscleMapV2";
import { computeMuscleStimulusForSet } from "./stimulusEngineV2";

type SetLogV2 = {
  exerciseId: string;
  load: number;
  reps: number;
  bestE1rm: number;
};

type MuscleTotals = Record<string, number>;
type RegionTotals = Record<string, number>;
type BucketTotals = Record<string, number>;

type PercentMode = "withinRegion" | "wholeBody";
type BucketPercent = { bucketId: string; percent: number; value: number; regionId: string };

const exerciseMapById = new Map(exerciseMuscleMapV2.map((m) => [m.exerciseId, m] as const));
const muscleById = new Map(musclesV2.map((m) => [m.id, m] as const));
const bucketById = new Map(balanceBucketsV2.map((b) => [b.id, b] as const));

export function aggregateMuscleStimulus(sets: readonly SetLogV2[]): MuscleTotals {
  const totals: MuscleTotals = {};

  for (const set of sets) {
    const mapping = exerciseMapById.get(set.exerciseId);
    if (!mapping) continue;

    const perMuscle = computeMuscleStimulusForSet({
      exerciseId: set.exerciseId,
      load: set.load,
      reps: set.reps,
      mapping: mapping.muscles,
      bestE1rm: set.bestE1rm,
    });

    for (const item of perMuscle) {
      totals[item.muscleId] = (totals[item.muscleId] ?? 0) + item.stimulus;
    }
  }

  return totals;
}

export function rollupToRegions(muscleTotals: MuscleTotals): RegionTotals {
  const regionTotals: RegionTotals = Object.fromEntries(regionsV2.map((r) => [r.id, 0]));

  for (const [muscleId, value] of Object.entries(muscleTotals)) {
    const muscle = muscleById.get(muscleId);
    if (!muscle) continue;
    regionTotals[muscle.regionId] = (regionTotals[muscle.regionId] ?? 0) + value;
  }

  return regionTotals;
}

export function rollupToBuckets(muscleTotals: MuscleTotals): BucketTotals {
  const bucketTotals: BucketTotals = Object.fromEntries(balanceBucketsV2.map((b) => [b.id, 0]));

  for (const [muscleId, value] of Object.entries(muscleTotals)) {
    const muscle = muscleById.get(muscleId);
    if (!muscle) continue;
    bucketTotals[muscle.uiRollupTarget] = (bucketTotals[muscle.uiRollupTarget] ?? 0) + value;
  }

  return bucketTotals;
}

export function computeBucketPercents(
  bucketTotals: BucketTotals,
  regionTotals: RegionTotals,
  mode: PercentMode,
  includeAdvanced = false
): BucketPercent[] {
  const totalBody = Object.values(regionTotals).reduce((sum, x) => sum + x, 0);

  return balanceBucketsV2
    .filter((bucket) => (includeAdvanced ? true : !bucket.isAdvanced))
    .map((bucket) => {
      const value = bucketTotals[bucket.id] ?? 0;
      const regionId = bucket.regionId;
      const denominator = mode === "withinRegion" ? (regionTotals[regionId] ?? 0) : totalBody;
      const percent = denominator > 0 ? (value / denominator) * 100 : 0;

      return {
        bucketId: bucket.id,
        percent,
        value,
        regionId,
      };
    })
    .filter((row) => bucketById.has(row.bucketId));
}

export type { SetLogV2, MuscleTotals, RegionTotals, BucketTotals, PercentMode, BucketPercent };
