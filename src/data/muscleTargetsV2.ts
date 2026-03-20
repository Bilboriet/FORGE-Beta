export type MuscleTargetV2 = {
  muscleId: string;
  targetStimulus: number;
};

export type MuscleTargetRangeV2 = MuscleTargetV2 & {
  min: number;
  max: number;
};

// Default V2 coach baseline.
// These are intentionally broad weekly stimulus anchors used to activate
// coach behavior before user-specific targeting exists.
export const DEFAULT_MUSCLE_TARGETS_V2: MuscleTargetV2[] = [
  { muscleId: "upper_chest", targetStimulus: 1800 },
  { muscleId: "mid_chest", targetStimulus: 2200 },
  { muscleId: "lower_chest", targetStimulus: 1600 },
  { muscleId: "deltoid_anterior", targetStimulus: 1400 },
  { muscleId: "deltoid_lateral", targetStimulus: 1600 },
  { muscleId: "deltoid_posterior", targetStimulus: 1400 },
  { muscleId: "biceps_long_head", targetStimulus: 1100 },
  { muscleId: "biceps_short_head", targetStimulus: 1100 },
  { muscleId: "biceps_neutral", targetStimulus: 1200 },
  { muscleId: "brachialis", targetStimulus: 1000 },
  { muscleId: "triceps_long_head", targetStimulus: 1200 },
  { muscleId: "triceps_lateral_head", targetStimulus: 1100 },
  { muscleId: "triceps_medial_head", targetStimulus: 1100 },
  { muscleId: "triceps_neutral", targetStimulus: 1400 },
  { muscleId: "triceps_lateral_medial", targetStimulus: 1200 },
  { muscleId: "upper_lats", targetStimulus: 2000 },
  { muscleId: "lower_lats", targetStimulus: 1800 },
  { muscleId: "neutral_lats", targetStimulus: 1800 },
  { muscleId: "teres_major", targetStimulus: 1200 },
  { muscleId: "mid_back", targetStimulus: 1800 },
  { muscleId: "upper_traps", targetStimulus: 1000 },
  { muscleId: "middle_traps", targetStimulus: 1100 },
  { muscleId: "lower_traps", targetStimulus: 1000 },
  { muscleId: "erector_spinae", targetStimulus: 1400 },
  { muscleId: "rectus_femoris", targetStimulus: 1600 },
  { muscleId: "vastus_lateralis", targetStimulus: 1900 },
  { muscleId: "vastus_medialis", targetStimulus: 1600 },
  { muscleId: "quads_neutral", targetStimulus: 2200 },
  { muscleId: "medial_hamstring", targetStimulus: 1400 },
  { muscleId: "lateral_hamstring", targetStimulus: 1400 },
  { muscleId: "hamstrings_neutral", targetStimulus: 1800 },
  { muscleId: "gluteus_maximus", targetStimulus: 2200 },
  { muscleId: "gluteus_medius", targetStimulus: 1000 },
  { muscleId: "adductors", targetStimulus: 1200 },
  { muscleId: "gastrocnemius", targetStimulus: 1200 },
  { muscleId: "soleus", targetStimulus: 1200 },
  { muscleId: "tibialis_anterior", targetStimulus: 700 },
  { muscleId: "rectus_abdominis", targetStimulus: 900 },
  { muscleId: "obliques", targetStimulus: 800 },
  { muscleId: "serratus_anterior", targetStimulus: 500 },
  { muscleId: "hip_flexors", targetStimulus: 600 },
  { muscleId: "forearm_flexors", targetStimulus: 700 },
  { muscleId: "forearm_extensors", targetStimulus: 600 },
  { muscleId: "infraspinatus_teresminor", targetStimulus: 500 },
] as const;

export function resolveMuscleTargetRangesV2(
  targets: readonly MuscleTargetV2[],
  options?: {
    multiplier?: number;
    lowerBoundRatio?: number;
    upperBoundRatio?: number;
  }
): MuscleTargetRangeV2[] {
  const multiplier = Math.max(0, options?.multiplier ?? 1);
  const lowerBoundRatio = Math.max(0, options?.lowerBoundRatio ?? 0.85);
  const upperBoundRatio = Math.max(lowerBoundRatio, options?.upperBoundRatio ?? 1.15);

  return targets
    .map((target) => {
      const scaledTargetStimulus = target.targetStimulus * multiplier;
      return {
        muscleId: target.muscleId,
        targetStimulus: scaledTargetStimulus,
        min: scaledTargetStimulus * lowerBoundRatio,
        max: scaledTargetStimulus * upperBoundRatio,
      };
    })
    .sort((a, b) => a.muscleId.localeCompare(b.muscleId));
}
