type MuscleStimulus = {
  muscleId: string;
  stimulus: number;
};

type MappingEntry = {
  muscleId: string;
  role: "prime" | "secondary" | "stabilizer";
  weight?: number;
};

type ComputeParams = {
  exerciseId: string;
  load: number;
  reps: number;
  mapping: readonly MappingEntry[];
  bestE1rm: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function estimateE1RM(load: number, reps: number): number {
  return load * (1 + reps / 30);
}

export function computeRelativeIntensity(e1rm: number, bestE1rm: number): number {
  if (bestE1rm <= 0) return 0;
  const ri = e1rm / bestE1rm;
  return clamp(ri, 0, 1.2);
}

export function computeIntensityFactor(relativeIntensity: number): number {
  const factor = 0.65 + 0.35 * relativeIntensity;
  return clamp(factor, 0.65, 1.0);
}

export function computeConfidence(reps: number): number {
  if (reps <= 10) return 1.0;
  if (reps <= 15) return 0.8;
  if (reps <= 20) return 0.6;
  return 0.4;
}

export function computeMuscleStimulusForSet(params: ComputeParams): MuscleStimulus[] {
  const { load, reps, mapping, bestE1rm } = params;

  const e1rm = estimateE1RM(load, reps);
  const relativeIntensity = computeRelativeIntensity(e1rm, bestE1rm);
  const intensityFactor = computeIntensityFactor(relativeIntensity);
  const confidence = computeConfidence(reps);
  const baseSetValue = intensityFactor * confidence;

  return mapping.map((entry) => {
    const stimulus =
      entry.role === "stabilizer" ? baseSetValue * 0.2 : baseSetValue * (entry.weight ?? 0);

    return {
      muscleId: entry.muscleId,
      stimulus,
    };
  });
}

export type { MuscleStimulus, MappingEntry, ComputeParams };
