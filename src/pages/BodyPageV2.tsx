import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import BodyBackBase from "../assets/body/body_base_back.png";
import BodyBackZones from "../assets/body/body_back_zones.svg?raw";
import BodyFrontZones from "../assets/body/body_front_zones_new.svg?raw";
import { LS_KEYS } from "../constants";
import { exerciseDatabase, exerciseDatabaseById, exerciseDatabaseMuscles, type ExerciseDatabaseMuscleKey } from "../data/exerciseDatabase";
import { computeStimulusEngineV2 } from "../data/stimulusEngineV2";
import { exerciseMuscleMapV2 } from "../data/exerciseMuscleMapV2";
import { DEFAULT_MUSCLE_TARGETS_V2, resolveMuscleTargetRangesV2 } from "../data/muscleTargetsV2";
import { musclesV2 } from "../data/musclesV2";
import { buildBestE1rmMap, type RawSet } from "../engine/bestE1rmEngineV2";
import { buildBodyViewModelV2, type BodyTimeWindow } from "../engine/bodyViewModelV2";
import { computeMuscleStimulusForSet } from "../engine/stimulusEngineV2";
import { buildWeeklyCoachInsightSnapshotV2 } from "../features/coach/application/buildWeeklyCoachInsightSnapshotV2";
import { useExercisePreferences } from "../hooks/useExercisePreferences";
import { useLocalStorage } from "../hooks/useLocalStorage";

const LS_BODY_WINDOW = "bodyV2_window";

type CanonicalMuscleId = (typeof musclesV2)[number]["id"];
type ZoneExerciseMap = (typeof exerciseMuscleMapV2)[number];
type ZoneMuscleWeights = Record<string, number>;
type ZoneDefinition = {
  svgZoneIds: readonly string[];
  zoneKey: string;
  analysisKey: ExerciseDatabaseMuscleKey;
  displayName: string;
  familyKey: string;
  canonicalPolicy?: "mapped" | "analysis_only" | "broad_rollup";
  canonicalMuscleIds: readonly CanonicalMuscleId[];
  primaryAnalysis?: ZoneMuscleWeights;
  secondaryAnalysis?: ZoneMuscleWeights;
  preferredExerciseIds?: string[];
  legacyExerciseMapIds?: string[];
  preferredBiasTags?: string[];
};

type ZoneFamilyDefinition = {
  familyId: string;
  engineFamilyKey: string;
  svgZoneIds: readonly string[];
  zoneKeys: readonly string[];
  displayName: string;
  familyKey: string;
  canonicalPolicy?: "mapped" | "grouped_family" | "broad_rollup";
  exerciseBucketKeys: readonly ExerciseDatabaseMuscleKey[];
  finalOutputAnalysisKeys: readonly ExerciseDatabaseMuscleKey[];
  canonicalMuscleIds: readonly CanonicalMuscleId[];
  preferredExerciseIds?: readonly string[];
  legacyExerciseMapIds?: readonly string[];
  inputBucketOutputWeights?: Partial<Record<ExerciseDatabaseMuscleKey, Partial<Record<ExerciseDatabaseMuscleKey, number>>>>;
};

const ACTIVE_BODY_ZONES = {
  upper_chest: {
    svgZoneIds: ["upper_chest_L", "upper_chest_R"],
    zoneKey: "upper_chest",
    analysisKey: "upper_chest",
    displayName: "Upper Chest",
    familyKey: "chest",
    canonicalMuscleIds: ["m_pec_major_clav"],
    primaryAnalysis: { m_pec_major_clav: 1, m_pec_major_sternal: 0.2 },
    secondaryAnalysis: { m_deltoid_ant: 0.6 },
    preferredBiasTags: ["upperChestEmphasis"],
    preferredExerciseIds: ["incline_barbell_press", "incline_dumbbell_press", "incline_machine_press"],
    legacyExerciseMapIds: ["ex_barbell_incline_bench_press", "ex_dumbbell_incline_bench_press", "ex_machine_incline_press"],
  },
  mid_lower_chest: {
    svgZoneIds: ["mid_lower_chest_L", "mid_lower_chest_R"],
    zoneKey: "mid_lower_chest",
    analysisKey: "mid_chest",
    displayName: "Mid / Lower Chest",
    familyKey: "chest",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_pec_major_sternal"],
    primaryAnalysis: { m_pec_major_sternal: 1, m_pec_major_clav: 0.1 },
    secondaryAnalysis: { m_deltoid_ant: 0.45 },
    preferredBiasTags: ["lowerChestEmphasis"],
    preferredExerciseIds: ["chest_dips", "decline_barbell_press", "decline_dumbbell_press"],
    legacyExerciseMapIds: ["ex_dip_chest", "ex_barbell_decline_bench_press", "ex_dumbbell_decline_bench_press"],
  },
  deltoid_anterior: {
    svgZoneIds: ["deltoid_anterior_L", "deltoid_anterior_R"],
    zoneKey: "deltoid_anterior",
    analysisKey: "deltoid_anterior",
    displayName: "Anterior Deltoid",
    familyKey: "shoulders",
    canonicalMuscleIds: ["m_deltoid_ant"],
    primaryAnalysis: { m_deltoid_ant: 1 },
    secondaryAnalysis: { m_pec_major_clav: 0.2 },
    preferredExerciseIds: ["barbell_front_raise", "standing_dumbbell_front_raise", "standing_barbell_overhead_press"],
    legacyExerciseMapIds: ["ex_plate_front_raise", "ex_dumbbell_front_raise", "ex_barbell_overhead_press"],
  },
  deltoid_lateral: {
    svgZoneIds: ["deltoid_lateral_L", "deltoid_lateral_R"],
    zoneKey: "deltoid_lateral",
    analysisKey: "deltoid_lateral",
    displayName: "Lateral Deltoid",
    familyKey: "shoulders",
    canonicalMuscleIds: ["m_deltoid_lat"],
    primaryAnalysis: { m_deltoid_lat: 1 },
    secondaryAnalysis: { m_deltoid_ant: 0.18 },
    preferredExerciseIds: ["standing_dumbbell_lateral_raise", "cable_lateral_raise", "machine_lateral_raise"],
    legacyExerciseMapIds: ["ex_dumbbell_lateral_raise", "ex_cable_lateral_raise", "ex_machine_lateral_raise"],
  },
  vastus_lateralis: {
    svgZoneIds: ["vastus_lateralis_L", "vastus_lateralis_R"],
    zoneKey: "vastus_lateralis",
    analysisKey: "vastus_lateralis",
    displayName: "Vastus Lateralis",
    familyKey: "quadriceps",
    // musclesV2 currently exposes a single quadriceps rollup, so this mapping is
    // intentionally broad rather than pretending to be head-specific canonically.
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_quadriceps"],
    primaryAnalysis: { m_quadriceps: 1 },
    secondaryAnalysis: { m_glute_max: 0.18 },
    preferredExerciseIds: ["hack_squat", "pendulum_squat", "sled_leg_press"],
    legacyExerciseMapIds: ["ex_hack_squat", "ex_pendulum_squat", "ex_sled_leg_press"],
  },
  rectus_femoris: {
    svgZoneIds: ["rectus_femoris_L", "rectus_femoris_R"],
    zoneKey: "rectus_femoris",
    analysisKey: "rectus_femoris",
    displayName: "Rectus Femoris",
    familyKey: "quadriceps",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_quadriceps"],
    primaryAnalysis: { m_quadriceps: 1 },
    preferredExerciseIds: ["front_squat", "leg_extension"],
    legacyExerciseMapIds: ["ex_front_squat", "ex_leg_extension", "ex_step_up"],
  },
  vastus_medialis: {
    svgZoneIds: ["vastus_medialis_L", "vastus_medialis_R"],
    zoneKey: "vastus_medialis",
    analysisKey: "vastus_medialis",
    displayName: "Vastus Medialis",
    familyKey: "quadriceps",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_quadriceps"],
    primaryAnalysis: { m_quadriceps: 1 },
    secondaryAnalysis: { m_adductors: 0.24 },
    preferredExerciseIds: ["leg_extension", "bulgarian_split_squat"],
    legacyExerciseMapIds: ["ex_leg_extension", "ex_bulgarian_split_squat", "ex_step_up"],
  },
  tibialis_anterior: {
    svgZoneIds: ["tibialis_anterior_L", "tibialis_anterior_R"],
    zoneKey: "tibialis_anterior",
    analysisKey: "tibialis_anterior",
    displayName: "Tibialis Anterior",
    familyKey: "lower_legs",
    canonicalMuscleIds: ["m_tibialis_anterior"],
    primaryAnalysis: { m_tibialis_anterior: 1 },
    preferredExerciseIds: ["tibialis_raise"],
    legacyExerciseMapIds: ["ex_tibialis_raise"],
  },
  triceps_long_head: {
    svgZoneIds: ["triceps_long_head_L", "triceps_long_head_R"],
    zoneKey: "triceps_long_head",
    analysisKey: "triceps_long_head",
    displayName: "Triceps Long Head",
    familyKey: "triceps",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_triceps_brachii"],
    primaryAnalysis: { m_triceps_brachii: 1 },
    secondaryAnalysis: { m_forearm_flexors: 0.35 },
    preferredExerciseIds: ["cable_overhead_triceps_extension", "skull_crusher"],
    legacyExerciseMapIds: ["ex_overhead_triceps_extension", "ex_lying_triceps_extension"],
  },
  triceps_lateral_medial: {
    svgZoneIds: ["triceps_lateral_medial_L", "triceps_lateral_medial_R"],
    zoneKey: "triceps_lateral_medial",
    analysisKey: "triceps_lateral_medial",
    displayName: "Triceps Lateral/Medial",
    familyKey: "triceps",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_triceps_brachii"],
    primaryAnalysis: { m_triceps_brachii: 1 },
    secondaryAnalysis: { m_forearm_extensors: 0.35 },
    preferredExerciseIds: ["cable_triceps_pressdown", "close_grip_bench_press"],
    legacyExerciseMapIds: ["ex_triceps_pushdown", "ex_close_grip_press", "ex_triceps_kickback"],
  },
  upper_lats: {
    svgZoneIds: ["upper_lats_L", "upper_lats_R"],
    zoneKey: "upper_lats",
    analysisKey: "upper_lats",
    displayName: "Upper Lats",
    familyKey: "lats",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_latissimus_dorsi", "m_teres_major"],
    primaryAnalysis: { m_latissimus_dorsi: 1, m_teres_major: 0.3, m_trap_lower: 0.15 },
    secondaryAnalysis: { m_rhomboids: 0.25 },
    preferredBiasTags: ["latBias", "scapDepressionBias"],
    preferredExerciseIds: [
      "pull_up",
      "chin_up",
      "wide_grip_lat_pulldown",
      "neutral_grip_lat_pulldown",
      "single_arm_pronated_lat_pulldown",
      "machine_high_row",
    ],
    legacyExerciseMapIds: [
      "ex_pull_up",
      "ex_chin_up",
      "ex_lat_pulldown",
      "ex_close_grip_pulldown",
      "ex_single_arm_lat_pulldown",
      "ex_high_row_machine",
    ],
  },
  lower_lats: {
    svgZoneIds: ["lower_lats_L", "lower_lats_R"],
    zoneKey: "lower_lats",
    analysisKey: "lower_lats",
    displayName: "Lower Lats",
    familyKey: "lats",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_latissimus_dorsi", "m_teres_major"],
    primaryAnalysis: { m_latissimus_dorsi: 1, m_teres_major: 0.2, m_trap_lower: 0.1 },
    secondaryAnalysis: { m_erector_spinae: 0.2 },
    preferredBiasTags: ["latBias"],
    preferredExerciseIds: ["straight_arm_pulldown", "single_arm_cable_lat_row", "plate_loaded_low_row"],
    legacyExerciseMapIds: ["ex_straight_arm_pulldown", "ex_cable_pullover_high_to_low", "ex_low_row_machine"],
  },
  biceps: {
    svgZoneIds: ["biceps_L", "biceps_R"],
    zoneKey: "biceps",
    analysisKey: "biceps_neutral",
    displayName: "Biceps",
    familyKey: "biceps",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_biceps_brachii", "m_brachialis"],
  },
  forearm_flexors: {
    svgZoneIds: ["forearm_flexors_L", "forearm_flexors_R"],
    zoneKey: "forearm_flexors",
    analysisKey: "forearm_flexors",
    displayName: "Forearm Flexors",
    familyKey: "forearms",
    canonicalMuscleIds: ["m_forearm_flexors"],
  },
  rectus_abdominis: {
    svgZoneIds: ["rectus_abdominis"],
    zoneKey: "rectus_abdominis",
    analysisKey: "rectus_abdominis",
    displayName: "Rectus Abdominis",
    familyKey: "abs",
    canonicalMuscleIds: ["m_rectus_abdominis"],
  },
  obliques: {
    svgZoneIds: ["obliques_L", "obliques_R"],
    zoneKey: "obliques",
    analysisKey: "obliques",
    displayName: "Obliques",
    familyKey: "abs",
    canonicalMuscleIds: ["m_obliques"],
  },
  serratus_anterior: {
    svgZoneIds: ["serratus_anterior_L", "serratus_anterior_R"],
    zoneKey: "serratus_anterior",
    analysisKey: "serratus_anterior",
    displayName: "Serratus Anterior",
    familyKey: "chest",
    canonicalMuscleIds: ["m_serratus_anterior"],
  },
  hip_flexors: {
    svgZoneIds: ["hip_flexors_L", "hip_flexors_R"],
    zoneKey: "hip_flexors",
    analysisKey: "hip_flexors",
    displayName: "Hip Flexors",
    familyKey: "hips",
    // Intentional analysis-only zone for now:
    // Forge has a valid exercise-analysis hip_flexors bucket, but no canonical
    // musclesV2 hip-flexor entry and no exerciseMuscleMapV2 canonical mapping yet.
    canonicalPolicy: "analysis_only",
    canonicalMuscleIds: [],
  },
  adductors: {
    svgZoneIds: ["adductors_L", "adductors_R"],
    zoneKey: "adductors",
    analysisKey: "adductors",
    displayName: "Adductors",
    familyKey: "legs",
    canonicalMuscleIds: ["m_adductors"],
  },
  upper_traps: {
    svgZoneIds: ["upper_traps"],
    zoneKey: "upper_traps",
    analysisKey: "upper_traps",
    displayName: "Upper Traps",
    familyKey: "back",
    canonicalMuscleIds: ["m_trap_upper"],
  },
  mid_lower_traps: {
    svgZoneIds: ["mid_lower_traps"],
    zoneKey: "mid_lower_traps",
    analysisKey: "middle_traps",
    displayName: "Mid / Lower Traps",
    familyKey: "back",
    canonicalPolicy: "broad_rollup",
    canonicalMuscleIds: ["m_trap_middle", "m_trap_lower"],
  },
  posterior_deltoid: {
    svgZoneIds: ["posterior_deltoid_L", "posterior_deltoid_R"],
    zoneKey: "posterior_deltoid",
    analysisKey: "deltoid_posterior",
    displayName: "Posterior Deltoid",
    familyKey: "shoulders",
    canonicalMuscleIds: ["m_deltoid_post"],
  },
  infraspinatus_teresminor: {
    svgZoneIds: ["infraspinatus_teresminor_L", "infraspinatus_teresminor_R"],
    zoneKey: "infraspinatus_teresminor",
    analysisKey: "infraspinatus_teresminor",
    displayName: "Infraspinatus / Teres Minor",
    familyKey: "shoulders",
    canonicalMuscleIds: ["m_cuff_infraspinatus", "m_cuff_teres_minor"],
  },
  teres_major: {
    svgZoneIds: ["teres_major_L", "teres_major_R"],
    zoneKey: "teres_major",
    analysisKey: "teres_major",
    displayName: "Teres Major",
    familyKey: "back",
    canonicalMuscleIds: ["m_teres_major"],
  },
  erector_spinae: {
    svgZoneIds: ["erector_spinae"],
    zoneKey: "erector_spinae",
    analysisKey: "erector_spinae",
    displayName: "Erector Spinae",
    familyKey: "back",
    canonicalMuscleIds: ["m_erector_spinae"],
  },
  forearm_extensors: {
    svgZoneIds: ["forearm_extensors_L", "forearm_extensors_R"],
    zoneKey: "forearm_extensors",
    analysisKey: "forearm_extensors",
    displayName: "Forearm Extensors",
    familyKey: "forearms",
    canonicalMuscleIds: ["m_forearm_extensors"],
  },
  gluteus_medius: {
    svgZoneIds: ["gluteus_medius_L", "gluteus_medius_R"],
    zoneKey: "gluteus_medius",
    analysisKey: "gluteus_medius",
    displayName: "Gluteus Medius",
    familyKey: "glutes",
    canonicalMuscleIds: ["m_glute_med_min"],
  },
  gluteus_maximus: {
    svgZoneIds: ["gluteus_maximus_L", "gluteus_maximus_R"],
    zoneKey: "gluteus_maximus",
    analysisKey: "gluteus_maximus",
    displayName: "Gluteus Maximus",
    familyKey: "glutes",
    canonicalMuscleIds: ["m_glute_max"],
  },
  lateral_hamstring: {
    svgZoneIds: ["lateral_hamstring_L", "lateral_hamstring_R"],
    zoneKey: "lateral_hamstring",
    analysisKey: "lateral_hamstring",
    displayName: "Lateral Hamstring",
    familyKey: "hamstrings",
    canonicalMuscleIds: ["m_hamstrings_knee"],
  },
  medial_hamstring: {
    svgZoneIds: ["medial_hamstring_L", "medial_hamstring_R"],
    zoneKey: "medial_hamstring",
    analysisKey: "medial_hamstring",
    displayName: "Medial Hamstring",
    familyKey: "hamstrings",
    canonicalMuscleIds: ["m_hamstrings_hip"],
  },
  gastrocnemius: {
    svgZoneIds: ["gastrocnemius_L", "gastrocnemius_R"],
    zoneKey: "gastrocnemius",
    analysisKey: "gastrocnemius",
    displayName: "Gastrocnemius",
    familyKey: "calves",
    canonicalMuscleIds: ["m_gastrocnemius"],
  },
  soleus: {
    svgZoneIds: ["soleus_L", "soleus_R"],
    zoneKey: "soleus",
    analysisKey: "soleus",
    displayName: "Soleus",
    familyKey: "calves",
    canonicalMuscleIds: ["m_soleus"],
  },
  mid_back: {
    svgZoneIds: ["mid_back"],
    zoneKey: "mid_back",
    analysisKey: "mid_back",
    displayName: "Mid Back",
    familyKey: "back",
    canonicalMuscleIds: ["m_rhomboids"],
  },
} satisfies Record<string, ZoneDefinition>;

const ZONE_DEFINITIONS = Object.values(ACTIVE_BODY_ZONES);
const ZONE_DEFINITION_BY_KEY = new Map(ZONE_DEFINITIONS.map((zone) => [zone.zoneKey, zone] as const));
const ZONE_DEFINITION_BY_SVG_ID = new Map(
  ZONE_DEFINITIONS.flatMap((zone) => zone.svgZoneIds.map((svgZoneId) => [svgZoneId, zone] as const))
);

const ZONE_FAMILY_DEFINITIONS = [
  {
    familyId: "family_biceps",
    engineFamilyKey: "family_biceps",
    svgZoneIds: ["biceps_L", "biceps_R"],
    zoneKeys: ["biceps"],
    displayName: "Biceps",
    familyKey: "biceps",
    canonicalPolicy: "grouped_family",
    exerciseBucketKeys: ["biceps_long_head", "biceps_short_head", "biceps_neutral", "brachialis"],
    finalOutputAnalysisKeys: ["biceps_long_head", "biceps_short_head", "brachialis"],
    canonicalMuscleIds: ["m_biceps_brachii", "m_brachialis"],
    inputBucketOutputWeights: {
      biceps_long_head: { biceps_long_head: 1 },
      biceps_short_head: { biceps_short_head: 1 },
      biceps_neutral: { biceps_long_head: 0.5, biceps_short_head: 0.5 },
      brachialis: { brachialis: 1 },
    },
  },
  {
    familyId: "family_triceps",
    engineFamilyKey: "family_triceps",
    svgZoneIds: ["triceps_long_head_L", "triceps_long_head_R", "triceps_lateral_medial_L", "triceps_lateral_medial_R"],
    zoneKeys: ["triceps_long_head", "triceps_lateral_medial"],
    displayName: "Triceps",
    familyKey: "triceps",
    canonicalPolicy: "broad_rollup",
    exerciseBucketKeys: [
      "triceps_long_head",
      "triceps_lateral_head",
      "triceps_medial_head",
      "triceps_neutral",
      "triceps_lateral_medial",
    ],
    finalOutputAnalysisKeys: ["triceps_long_head", "triceps_lateral_head", "triceps_medial_head"],
    canonicalMuscleIds: ["m_triceps_brachii"],
    preferredExerciseIds: ["cable_overhead_triceps_extension", "skull_crusher", "cable_triceps_pressdown", "close_grip_bench_press"],
    legacyExerciseMapIds: ["ex_overhead_triceps_extension", "ex_lying_triceps_extension", "ex_triceps_pushdown", "ex_close_grip_press", "ex_triceps_kickback"],
    inputBucketOutputWeights: {
      triceps_long_head: { triceps_long_head: 1 },
      triceps_lateral_head: { triceps_lateral_head: 1 },
      triceps_medial_head: { triceps_medial_head: 1 },
      triceps_neutral: { triceps_long_head: 0.34, triceps_lateral_head: 0.33, triceps_medial_head: 0.33 },
      triceps_lateral_medial: { triceps_lateral_head: 0.5, triceps_medial_head: 0.5 },
    },
  },
  {
    familyId: "family_mid_lower_chest",
    engineFamilyKey: "family_mid_lower_chest",
    svgZoneIds: ["mid_lower_chest_L", "mid_lower_chest_R"],
    zoneKeys: ["mid_lower_chest"],
    displayName: "Mid / Lower Chest",
    familyKey: "chest",
    canonicalPolicy: "grouped_family",
    exerciseBucketKeys: ["mid_chest", "lower_chest"],
    finalOutputAnalysisKeys: ["mid_chest", "lower_chest"],
    canonicalMuscleIds: ["m_pec_major_sternal"],
    preferredExerciseIds: ["chest_dips", "decline_barbell_press", "decline_dumbbell_press"],
    legacyExerciseMapIds: ["ex_dip_chest", "ex_barbell_decline_bench_press", "ex_dumbbell_decline_bench_press"],
    inputBucketOutputWeights: {
      mid_chest: { mid_chest: 1 },
      lower_chest: { lower_chest: 1 },
    },
  },
  {
    familyId: "family_mid_lower_traps",
    engineFamilyKey: "family_mid_lower_traps",
    svgZoneIds: ["mid_lower_traps"],
    zoneKeys: ["mid_lower_traps"],
    displayName: "Mid / Lower Traps",
    familyKey: "back",
    canonicalPolicy: "grouped_family",
    exerciseBucketKeys: ["middle_traps", "lower_traps"],
    finalOutputAnalysisKeys: ["middle_traps", "lower_traps"],
    canonicalMuscleIds: ["m_trap_middle", "m_trap_lower"],
    inputBucketOutputWeights: {
      middle_traps: { middle_traps: 1 },
      lower_traps: { lower_traps: 1 },
    },
  },
] satisfies readonly ZoneFamilyDefinition[];

const ZONE_FAMILY_BY_ZONE_KEY = new Map(
  ZONE_FAMILY_DEFINITIONS.flatMap((family) => family.zoneKeys.map((zoneKey) => [zoneKey, family] as const))
);

function isWindow(v: unknown): v is BodyTimeWindow {
  return v === "last7" || v === "last30" || v === "last180" || v === "all";
}

function inWindow(sessionDate: string | undefined, window: BodyTimeWindow): boolean {
  if (window === "all") return true;
  if (!sessionDate) return false;
  const d = new Date(sessionDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return days <= (window === "last7" ? 7 : window === "last30" ? 30 : 180);
}

function daysForWindow(window: BodyTimeWindow): number {
  if (window === "last7") return 7;
  if (window === "last30") return 30;
  if (window === "last180") return 180;
  return 36500;
}

function activationWeightForEntry(entry: { role: "prime" | "secondary" | "stabilizer"; weight?: number }): number {
  if (typeof entry.weight === "number") return entry.weight;
  if (entry.role === "prime") return 0.6;
  if (entry.role === "secondary") return 0.3;
  return 0.15;
}

function getMirroredZoneBase(zoneId: string): string {
  return zoneId.replace(/_(L|R)$/, "");
}

function isLatZoneKey(zoneKey: string | null | undefined): zoneKey is "upper_lats" | "lower_lats" {
  return zoneKey === "upper_lats" || zoneKey === "lower_lats";
}

function shouldUseMobileSheet() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 900px), (pointer: coarse), (hover: none)").matches;
}

function getZoneAnchorPosition(
  stageElement: HTMLDivElement,
  element: Element,
  preferDomRectOnly = false
): { x: number; y: number } | null {
  const stageRect = stageElement.getBoundingClientRect();

  // Mobile WebKit can throw on some SVG path geometry calls even when the same
  // zones work on desktop. Fall back to DOM rect math instead of crashing.
  if (!preferDomRectOnly) {
    try {
      if (element instanceof SVGGraphicsElement) {
        const box = element.getBBox();
        const screenMatrix = element.getScreenCTM();
        const svgRoot = element.ownerSVGElement;
        if (screenMatrix && svgRoot) {
          const p = svgRoot.createSVGPoint();
          p.x = box.x + box.width / 2;
          p.y = box.y + box.height / 2;
          const screenPoint = p.matrixTransform(screenMatrix);
          return { x: screenPoint.x - stageRect.left, y: screenPoint.y - stageRect.top };
        }
      }
    } catch {
      // Use bounding rect fallback below.
    }
  }

  if (element instanceof HTMLElement || element instanceof SVGElement) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return {
        x: rect.left - stageRect.left + rect.width / 2,
        y: rect.top - stageRect.top + rect.height / 2,
      };
    }
  }

  return null;
}

function getSafeModuleFallbackPosition(stageElement: HTMLDivElement) {
  const stageRect = stageElement.getBoundingClientRect();
  return {
    left: Math.max(12, Math.min(stageRect.width - 160, stageRect.width * 0.56)),
    top: Math.max(24, Math.min(stageRect.height - 120, stageRect.height * 0.18)),
  };
}

function sumWeightedMuscles(values: Array<{ muscleId: string; stimulus: number }>, weights: ZoneMuscleWeights): number {
  return values.reduce((sum, row) => sum + row.stimulus * (weights[row.muscleId] ?? 0), 0);
}

function getZoneExerciseRelevance(spec: ZoneDefinition, mapping: ZoneExerciseMap): number {
  if (!spec.primaryAnalysis) return 0;

  let score = 0;

  for (const muscle of mapping.muscles) {
    const weight = spec.primaryAnalysis[muscle.muscleId];
    if (weight) {
      score += activationWeightForEntry(muscle) * weight;
    }
  }

  for (const tag of spec.preferredBiasTags ?? []) {
    if (mapping.biasTags?.includes(tag)) {
      score += 0.45;
    }
  }

  if (spec.preferredExerciseIds?.includes(mapping.exerciseId)) {
    score += 0.8;
  }

  if (spec.legacyExerciseMapIds?.includes(mapping.exerciseId)) {
    score += 0.8;
  }

  return score;
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
      entries.set(key, {
        exerciseId: entry.id,
        exerciseName: entry.displayName,
        muscleId,
        prescriptionWeight: Math.max(previous?.prescriptionWeight ?? 0, 1),
        redundancyGroup: entry.movementTemplate ?? null,
      });
    }

    for (const muscleId of entry.secondaryAnalysisTargets ?? []) {
      const key = `${entry.id}::${muscleId}`;
      const previous = entries.get(key);
      entries.set(key, {
        exerciseId: entry.id,
        exerciseName: entry.displayName,
        muscleId,
        prescriptionWeight: Math.max(previous?.prescriptionWeight ?? 0, 0.55),
        redundancyGroup: entry.movementTemplate ?? null,
      });
    }
  }

  return Array.from(entries.values()).sort(
    (a, b) =>
      a.muscleId.localeCompare(b.muscleId) ||
      a.exerciseName.localeCompare(b.exerciseName) ||
      a.exerciseId.localeCompare(b.exerciseId)
  );
}

function getWindowTargetMultiplier(window: BodyTimeWindow, sessions: readonly { date?: string }[]): number {
  if (window === "last7") return 1;
  if (window === "last30") return 4;
  if (window === "last180") return 26;

  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const session of sessions) {
    const value = typeof session.date === "string" ? new Date(session.date) : null;
    if (!value || Number.isNaN(value.getTime())) continue;
    if (!earliest || value < earliest) earliest = value;
    if (!latest || value > latest) latest = value;
  }

  if (!earliest || !latest) {
    return 1;
  }

  const diffDays = Math.max(1, Math.ceil((latest.getTime() - earliest.getTime()) / 86400000) + 1);
  return Math.max(1, Math.ceil(diffDays / 7));
}

export function BodyPageV2() {
  const [sessions] = useLocalStorage<any[]>(LS_KEYS.sessions, []);
  const [storedWindow, setStoredWindow] = useLocalStorage<BodyTimeWindow | string>(LS_BODY_WINDOW, "last30");
  const { favoriteIds, recentIds } = useExercisePreferences();

  const [moduleOpen, setModuleOpen] = useState(false);
  const [moduleAnchor, setModuleAnchor] = useState<{ x: number; y: number } | null>(null);
  const [modulePos, setModulePos] = useState<{ left: number; top: number }>({ left: 12, top: 12 });
  const [moduleSize, setModuleSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [view, setView] = useState<"front" | "back">("front");
  const [isMobileSheet, setIsMobileSheet] = useState(() => shouldUseMobileSheet());
  const [selectedAnalysisKey, setSelectedAnalysisKey] = useState<ExerciseDatabaseMuscleKey | null>(null);
  const [selectedZonePairBase, setSelectedZonePairBase] = useState<string | null>(null);
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const moduleRef = useRef<HTMLDivElement | null>(null);
  const zonesOverlayRef = useRef<HTMLDivElement | null>(null);
  const logPrefix = "[Forge BodyPage]";

  const windowKey = isWindow(storedWindow) ? storedWindow : "last30";
  const isMobileLatZone = isMobileSheet && isLatZoneKey(selectedZoneKey);
  const selectedZoneDefinition = useMemo(
    () => (selectedZoneKey ? ZONE_DEFINITION_BY_KEY.get(selectedZoneKey) ?? null : null),
    [selectedZoneKey]
  );
  const selectedZoneFamily = useMemo(
    () => (selectedZoneKey ? ZONE_FAMILY_BY_ZONE_KEY.get(selectedZoneKey) ?? null : null),
    [selectedZoneKey]
  );
  const selectedCanonicalMuscleId =
    selectedZoneFamily?.canonicalMuscleIds[0] ??
    (selectedZoneDefinition?.canonicalPolicy === "analysis_only" ? null : selectedZoneDefinition?.canonicalMuscleIds[0] ?? null);
  const stimulusViewModel = useMemo(
    () => buildBodyViewModelV2({ sessions, mode: "stimulus", window: windowKey }),
    [sessions, windowKey]
  );
  const stabilizersViewModel = useMemo(
    () => buildBodyViewModelV2({ sessions, mode: "stabilizers", window: windowKey }),
    [sessions, windowKey]
  );
  const stimulusStats = useMemo(() => {
    if (!selectedCanonicalMuscleId) return null;
    return stimulusViewModel.muscles.find((m) => m.muscleId === selectedCanonicalMuscleId) ?? null;
  }, [selectedCanonicalMuscleId, stimulusViewModel]);
  const stabilizerStats = useMemo(() => {
    if (!selectedCanonicalMuscleId) return null;
    return stabilizersViewModel.muscles.find((m) => m.muscleId === selectedCanonicalMuscleId) ?? null;
  }, [selectedCanonicalMuscleId, stabilizersViewModel]);
  const connector = useMemo(() => {
    if (isMobileSheet || !moduleOpen || !moduleAnchor || moduleSize.width <= 0 || moduleSize.height <= 0) return null;

    const minX = modulePos.left + 8;
    const maxX = modulePos.left + moduleSize.width - 8;
    const minY = modulePos.top + 8;
    const maxY = modulePos.top + moduleSize.height - 8;

    const targetX = Math.min(Math.max(moduleAnchor.x, minX), maxX);
    const targetY = Math.min(Math.max(moduleAnchor.y, minY), maxY);
    const dx = targetX - moduleAnchor.x;
    const dy = targetY - moduleAnchor.y;
    const dist = Math.hypot(dx, dy);
    if (!(dist > 6)) return null;

    const ux = dx / dist;
    const uy = dy / dist;
    const insetStart = 2;
    const insetEnd = Math.min(12, dist * 0.22);

    return {
      x1: moduleAnchor.x + ux * insetStart,
      y1: moduleAnchor.y + uy * insetStart,
      x2: targetX - ux * insetEnd,
      y2: targetY - uy * insetEnd,
      dotX: moduleAnchor.x,
      dotY: moduleAnchor.y,
    };
  }, [isMobileSheet, moduleAnchor, moduleOpen, modulePos.left, modulePos.top, moduleSize.height, moduleSize.width]);
  const exerciseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of exerciseDatabaseById.values()) {
      map.set(entry.id, entry.displayName);
    }
    for (const session of Array.isArray(sessions) ? sessions : []) {
      for (const block of Array.isArray(session?.exercises) ? session.exercises : []) {
        const id = String(block?.exercise?.id ?? "");
        const name = String(block?.exercise?.name ?? "");
        if (!id || !name || map.has(id)) continue;
        map.set(id, name);
      }
    }
    return map;
  }, [sessions]);
  const analysisLabelByKey = useMemo(
    () => new Map(exerciseDatabaseMuscles.map((muscle) => [muscle.id, muscle.displayName] as const)),
    []
  );
  const coachExerciseCatalog = useMemo(() => buildCoachExerciseCatalogFromDatabase(), []);
  const windowSessions = useMemo(
    () =>
      (Array.isArray(sessions) ? sessions : []).filter((session) =>
        inWindow(typeof session?.date === "string" ? session.date : undefined, windowKey)
      ),
    [sessions, windowKey]
  );
  const coachTargets = useMemo(
    () =>
      resolveMuscleTargetRangesV2(DEFAULT_MUSCLE_TARGETS_V2, {
        multiplier: getWindowTargetMultiplier(windowKey, windowSessions),
      }),
    [windowKey, windowSessions]
  );
  const coachSnapshot = useMemo(
    () =>
      buildWeeklyCoachInsightSnapshotV2({
        sessions: windowSessions,
        targets: coachTargets,
        exerciseCatalog: coachExerciseCatalog,
        favoriteExerciseIds: favoriteIds,
        recentlyUsedExerciseIds: recentIds,
        generatedAt: `body:${windowKey}`,
      }),
    [coachExerciseCatalog, coachTargets, favoriteIds, recentIds, windowKey, windowSessions]
  );
  const coachHeatmapByMuscleId = useMemo(
    () => new Map(coachSnapshot.heatmap.map((entry) => [entry.muscleId, entry] as const)),
    [coachSnapshot.heatmap]
  );
  const coachMuscleById = useMemo(
    () => new Map(coachSnapshot.muscles.map((entry) => [entry.muscleId, entry] as const)),
    [coachSnapshot.muscles]
  );
  const mappingByExerciseId = useMemo(
    () => new Map(exerciseMuscleMapV2.map((m) => [m.exerciseId, m] as const)),
    []
  );
  const databaseExerciseMappings = useMemo(
    () => exerciseMuscleMapV2.filter((mapping) => exerciseDatabaseById.has(mapping.exerciseId)),
    []
  );
  const analyticZoneDefinitions = useMemo(
    () => ZONE_DEFINITIONS.filter((zone): zone is ZoneDefinition & { primaryAnalysis: ZoneMuscleWeights } => !!zone.primaryAnalysis),
    []
  );
  const muscleLabel =
    selectedZoneFamily?.displayName ??
    selectedZoneDefinition?.displayName ??
    stimulusStats?.label ??
    stabilizerStats?.label ??
    selectedAnalysisKey ??
    selectedCanonicalMuscleId ??
    "-";
  const windowDatabaseSetRows = useMemo(() => {
    const rows: Array<{ exerciseId: string; reps: number; load: number }> = [];
    for (const session of Array.isArray(sessions) ? sessions : []) {
      const date = typeof session?.date === "string" ? session.date : undefined;
      if (!inWindow(date, windowKey)) continue;
      for (const block of Array.isArray(session?.exercises) ? session.exercises : []) {
        const exerciseId = String(block?.exercise?.id ?? "");
        if (!exerciseDatabaseById.has(exerciseId)) continue;
        for (const set of Array.isArray(block?.sets) ? block.sets : []) {
          const reps = Number(set?.reps);
          const load = Number(set?.weightKg);
          if (!(reps > 0)) continue;
          rows.push({ exerciseId, reps, load: Number.isFinite(load) ? load : 0 });
        }
      }
    }
    return rows;
  }, [sessions, windowKey]);
  const stimulusResultV2 = useMemo(
    () =>
      computeStimulusEngineV2({
        sets: windowDatabaseSetRows,
      }),
    [windowDatabaseSetRows]
  );
  const totalAnalysisStimulusV2 = useMemo(
    () => Object.values(stimulusResultV2.analysisTotals).reduce((sum, value) => sum + value, 0),
    [stimulusResultV2.analysisTotals]
  );
  const selectedAnalysisStatsV2 = useMemo(() => {
    if (!selectedAnalysisKey || selectedZoneFamily) return null;

    const rawValue = Number(stimulusResultV2.analysisTotals[selectedAnalysisKey] ?? 0);
    return {
      label: analysisLabelByKey.get(selectedAnalysisKey) ?? selectedAnalysisKey,
      rawValue,
      percent: totalAnalysisStimulusV2 > 0 ? (rawValue / totalAnalysisStimulusV2) * 100 : 0,
    };
  }, [analysisLabelByKey, selectedAnalysisKey, selectedZoneFamily, stimulusResultV2.analysisTotals, totalAnalysisStimulusV2]);
  const windowSetRows = useMemo(() => {
    const rows: RawSet[] = [];
    for (const session of Array.isArray(sessions) ? sessions : []) {
      const date = typeof session?.date === "string" ? session.date : undefined;
      if (!inWindow(date, windowKey)) continue;
      for (const block of Array.isArray(session?.exercises) ? session.exercises : []) {
        const exerciseId = String(block?.exercise?.id ?? "");
        if (!mappingByExerciseId.has(exerciseId)) continue;
        for (const set of Array.isArray(block?.sets) ? block.sets : []) {
          const reps = Number(set?.reps);
          const load = Number(set?.weightKg);
          if (!(reps > 0) || !(load > 0)) continue;
          rows.push({ exerciseId, load, reps, date });
        }
      }
    }
    return rows;
  }, [mappingByExerciseId, sessions, windowKey]);
  const bestE1rmMap = useMemo(
    () =>
      buildBestE1rmMap({
        sets: windowSetRows,
        daysWindow: daysForWindow(windowKey),
        repsCap: 12,
      }),
    [windowKey, windowSetRows]
  );
  const zoneStatsByKey = useMemo(() => {
    const zoneTotals = new Map<string, { rawValue: number; secondaryValue: number }>();

    for (const zone of ZONE_DEFINITIONS) {
      const zoneFamily = ZONE_FAMILY_BY_ZONE_KEY.get(zone.zoneKey) ?? null;
      const rawValue = zoneFamily
        ? zoneFamily.finalOutputAnalysisKeys.reduce(
            (maxValue, analysisKey) => Math.max(maxValue, Number(stimulusResultV2.analysisTotals[analysisKey] ?? 0)),
            0
          )
        : Number(stimulusResultV2.analysisTotals[zone.analysisKey] ?? 0);

      zoneTotals.set(zone.zoneKey, {
        rawValue,
        secondaryValue: 0,
      });
    }

    const familyTotals = new Map<string, number>();
    for (const zone of ZONE_DEFINITIONS) {
      familyTotals.set(zone.familyKey, (familyTotals.get(zone.familyKey) ?? 0) + (zoneTotals.get(zone.zoneKey)?.rawValue ?? 0));
    }

    const maxZoneRawValue = Math.max(0, ...Array.from(zoneTotals.values()).map((totals) => totals.rawValue));

    return new Map(
      ZONE_DEFINITIONS.map((zone) => {
        const zoneFamily = ZONE_FAMILY_BY_ZONE_KEY.get(zone.zoneKey) ?? null;
        const totals = zoneTotals.get(zone.zoneKey) ?? { rawValue: 0, secondaryValue: 0 };
        const familyTotal = familyTotals.get(zone.familyKey) ?? 0;
        return [
          zone.zoneKey,
          {
            rawValue: totals.rawValue,
            percent: familyTotal > 0 ? (totals.rawValue / familyTotal) * 100 : 0,
            secondaryValue: totals.secondaryValue,
            intensity:
              zoneFamily
                ? Math.max(
                    ...zoneFamily.finalOutputAnalysisKeys.map(
                      (analysisKey) => coachHeatmapByMuscleId.get(analysisKey)?.intensity ?? 0
                    ),
                    0
                  )
                : coachHeatmapByMuscleId.get(zone.analysisKey)?.intensity ??
                  (maxZoneRawValue > 0 ? totals.rawValue / maxZoneRawValue : 0),
            status:
              zoneFamily
                ? zoneFamily.finalOutputAnalysisKeys.reduce<"under" | "balanced" | "over">(
                    (current, analysisKey) => {
                      const nextStatus = coachHeatmapByMuscleId.get(analysisKey)?.status ?? "balanced";
                      if (nextStatus === "over") return "over";
                      if (nextStatus === "under" && current === "balanced") return "under";
                      return current;
                    },
                    "balanced"
                  )
                : coachHeatmapByMuscleId.get(zone.analysisKey)?.status ?? "balanced",
          },
        ] as const;
      })
    );
  }, [coachHeatmapByMuscleId, stimulusResultV2.analysisTotals]);
  useEffect(() => {
    const overlayElement = zonesOverlayRef.current;
    if (!overlayElement) return;

    // V2 base heatmap: drive visible zone fill and glow from analysisTotals-derived zone intensity.
    // Single-muscle zones use their direct analysis key. Merged zones use the max of their
    // final anatomical outputs so helper buckets never become visible heat targets.
    for (const zone of ZONE_DEFINITIONS) {
      const stats = zoneStatsByKey.get(zone.zoneKey);
      const intensity = Math.max(0, Math.min(1, Number(stats?.intensity ?? 0)));
      const isSelected = moduleOpen && selectedZonePairBase === zone.zoneKey;
      const baseFillAlpha = intensity > 0 ? 0.08 + intensity * 0.33 : 0;
      const fillAlpha = isSelected
        ? Math.min(baseFillAlpha + 0.08, 0.56)
        : baseFillAlpha;
      const heatGlowFilter =
        intensity > 0
          ? stats?.status === "under"
            ? `drop-shadow(0 0 ${Math.max(2.8, 3.6 + intensity * 4.4).toFixed(2)}px rgba(255, 184, 56, ${(0.32 + intensity * 0.44).toFixed(3)})) drop-shadow(0 0 ${Math.max(6, 8 + intensity * 12).toFixed(2)}px rgba(255, 156, 36, ${(0.16 + intensity * 0.24).toFixed(3)}))`
            : stats?.status === "over"
              ? `drop-shadow(0 0 ${Math.max(2.8, 3.6 + intensity * 4.4).toFixed(2)}px rgba(255, 72, 72, ${(0.36 + intensity * 0.48).toFixed(3)})) drop-shadow(0 0 ${Math.max(6, 8 + intensity * 12).toFixed(2)}px rgba(255, 44, 84, ${(0.20 + intensity * 0.28).toFixed(3)}))`
              : `drop-shadow(0 0 ${Math.max(2.4, 3 + intensity * 4).toFixed(2)}px rgba(255, 124, 124, ${(0.28 + intensity * 0.36).toFixed(3)})) drop-shadow(0 0 ${Math.max(5.2, 6.8 + intensity * 10.4).toFixed(2)}px rgba(255, 92, 112, ${(0.16 + intensity * 0.20).toFixed(3)}))`
          : "";
      const selectedGlowFilter = isSelected
        ? `drop-shadow(0 0 11.25px rgba(255, 138, 156, 0.85)) drop-shadow(0 0 26.25px rgba(255, 96, 128, 0.75)) drop-shadow(0 0 45px rgba(255, 72, 112, 0.45))`
        : "";
      const combinedGlowFilter = [heatGlowFilter, selectedGlowFilter].filter(Boolean).join(" ");

      for (const svgZoneId of zone.svgZoneIds) {
        const zoneElement = overlayElement.querySelector<SVGElement>(`#${svgZoneId}`);
        if (!zoneElement) continue;

        const paintTargets = zoneElement.matches("path")
          ? [zoneElement]
          : Array.from(zoneElement.querySelectorAll<SVGElement>("path"));
        const targets = paintTargets.length > 0 ? paintTargets : [zoneElement];

        for (const target of targets) {
          if (fillAlpha > 0) {
            const fillColor =
              stats?.status === "under"
                ? `rgba(255, 176, 32, ${fillAlpha.toFixed(3)})`
                : stats?.status === "over"
                  ? `rgba(255, 46, 46, ${fillAlpha.toFixed(3)})`
                  : `rgba(255, 120, 120, ${Math.max(0.06, fillAlpha * 0.78).toFixed(3)})`;
            target.style.setProperty("fill", fillColor);
            if (combinedGlowFilter) {
              target.style.setProperty("filter", combinedGlowFilter);
            } else {
              target.style.removeProperty("filter");
            }
          } else {
            target.style.removeProperty("fill");
            if (selectedGlowFilter) {
              target.style.setProperty("filter", selectedGlowFilter);
            } else {
              target.style.removeProperty("filter");
            }
          }

          if (isSelected) {
            target.style.setProperty("stroke", "rgba(255, 88, 108, 0.72)");
            target.style.setProperty("stroke-width", "1.38");
            target.style.setProperty("stroke-linejoin", "round");
          } else {
            target.style.removeProperty("stroke");
            target.style.removeProperty("stroke-width");
            target.style.removeProperty("stroke-linejoin");
          }
        }
      }
    }
  }, [moduleOpen, selectedZonePairBase, view, zoneStatsByKey]);
  const highActivation = useMemo(() => {
    if (isMobileLatZone) {
      console.warn(`${logPrefix} render fallback used: mobile lat high activation bypass`, { selectedZoneKey });
      return [];
    }

    if (selectedZoneDefinition?.primaryAnalysis) {
      try {
        return databaseExerciseMappings
          .map((m) => ({
            exerciseId: m.exerciseId,
            label: exerciseNameById.get(m.exerciseId) ?? m.exerciseId,
            activation: getZoneExerciseRelevance(selectedZoneDefinition, m),
          }))
          .filter((row) => row.activation > 0)
          .sort((a, b) => b.activation - a.activation || a.label.localeCompare(b.label))
          .slice(0, 3);
      } catch (error) {
        console.error(`${logPrefix} caught mobile lat error: highActivation selected zone`, {
          selectedZoneKey,
          selectedAnalysisKey,
          selectedCanonicalMuscleId,
          error,
        });
        return [];
      }
    }
    if (!selectedCanonicalMuscleId) return [];
    try {
      const rows = exerciseMuscleMapV2
        .map((m) => {
          const entry = m.muscles.find((x) => x.muscleId === selectedCanonicalMuscleId);
          if (!entry) return null;
          const activation = activationWeightForEntry(entry);
          const maxActivation = Math.max(...m.muscles.map((item) => activationWeightForEntry(item)));
          if (activation + 1e-6 < maxActivation) return null;
          return {
            exerciseId: m.exerciseId,
            label: exerciseNameById.get(m.exerciseId) ?? m.exerciseId,
            activation,
          };
        })
        .filter((x): x is { exerciseId: string; label: string; activation: number } => !!x)
        .sort((a, b) => b.activation - a.activation || a.label.localeCompare(b.label))
        .slice(0, 3);
      return rows;
    } catch (error) {
      console.error(`${logPrefix} caught mobile lat error: highActivation selected muscle`, {
        selectedZoneKey,
        selectedAnalysisKey,
        selectedCanonicalMuscleId,
        error,
      });
      return [];
    }
  }, [
    databaseExerciseMappings,
    exerciseNameById,
    isMobileLatZone,
    logPrefix,
    selectedAnalysisKey,
    selectedCanonicalMuscleId,
    selectedZoneDefinition,
    selectedZoneKey,
  ]);
  const yourTop = useMemo(() => {
    if (isMobileLatZone) {
      console.warn(`${logPrefix} render fallback used: mobile lat your top bypass`, { selectedZoneKey });
      return [];
    }

    if (selectedZoneDefinition?.primaryAnalysis) {
      try {
        const totals = new Map<string, number>();

        for (const row of windowSetRows) {
          const mapping = mappingByExerciseId.get(row.exerciseId);
          if (!mapping) continue;
          const relevance = getZoneExerciseRelevance(selectedZoneDefinition, mapping);
          if (!(relevance > 0)) continue;
          const bestE1rm = Number(bestE1rmMap[row.exerciseId] ?? 0);
          if (!(bestE1rm > 0)) continue;

          const perMuscle = computeMuscleStimulusForSet({
            exerciseId: row.exerciseId,
            load: row.load,
            reps: row.reps,
            mapping: mapping.muscles,
            bestE1rm,
          });

          const contribution = sumWeightedMuscles(perMuscle, selectedZoneDefinition.primaryAnalysis) * relevance;
          if (!(contribution > 0)) continue;
          totals.set(row.exerciseId, (totals.get(row.exerciseId) ?? 0) + contribution);
        }

        return Array.from(totals.entries())
          .map(([exerciseId, stimulus]) => ({
            exerciseId,
            label: exerciseNameById.get(exerciseId) ?? exerciseId,
            stimulus,
          }))
          .sort((a, b) => b.stimulus - a.stimulus || a.label.localeCompare(b.label))
          .slice(0, 3);
      } catch (error) {
        console.error(`${logPrefix} caught mobile lat error: yourTop selected zone`, {
          selectedZoneKey,
          selectedAnalysisKey,
          selectedCanonicalMuscleId,
          error,
        });
        return [];
      }
    }
    if (!selectedCanonicalMuscleId) return [];
    try {
      const setRows: RawSet[] = [];
      const totals = new Map<string, number>();
      for (const session of Array.isArray(sessions) ? sessions : []) {
        const date = typeof session?.date === "string" ? session.date : undefined;
        if (!inWindow(date, windowKey)) continue;
        for (const block of Array.isArray(session?.exercises) ? session.exercises : []) {
          const exerciseId = String(block?.exercise?.id ?? "");
          const mapping = mappingByExerciseId.get(exerciseId);
          if (!mapping) continue;
          for (const set of Array.isArray(block?.sets) ? block.sets : []) {
            const reps = Number(set?.reps);
            const load = Number(set?.weightKg);
            if (!(reps > 0) || !(load > 0)) continue;
            setRows.push({ exerciseId, load, reps, date });
          }
        }
      }

      const bestE1rmMap = buildBestE1rmMap({
        sets: setRows,
        daysWindow: daysForWindow(windowKey),
        repsCap: 12,
      });

      for (const row of setRows) {
        const mapping = mappingByExerciseId.get(row.exerciseId);
        if (!mapping) continue;
        const bestE1rm = Number(bestE1rmMap[row.exerciseId] ?? 0);
        if (!(bestE1rm > 0)) continue;
        const perMuscle = computeMuscleStimulusForSet({
          exerciseId: row.exerciseId,
          load: row.load,
          reps: row.reps,
          mapping: mapping.muscles,
          bestE1rm,
        });
        const contribution = perMuscle.find((m) => m.muscleId === selectedCanonicalMuscleId)?.stimulus ?? 0;
        if (!(contribution > 0)) continue;
        totals.set(row.exerciseId, (totals.get(row.exerciseId) ?? 0) + contribution);
      }

      return Array.from(totals.entries())
        .map(([exerciseId, stimulus]) => ({
          exerciseId,
          label: exerciseNameById.get(exerciseId) ?? exerciseId,
          stimulus,
        }))
        .sort((a, b) => b.stimulus - a.stimulus || a.label.localeCompare(b.label))
        .slice(0, 3);
    } catch (error) {
      console.error(`${logPrefix} caught mobile lat error: yourTop selected muscle`, {
        selectedZoneKey,
        selectedAnalysisKey,
        selectedCanonicalMuscleId,
        error,
      });
      return [];
    }
  }, [
    bestE1rmMap,
    exerciseNameById,
    isMobileLatZone,
    logPrefix,
    mappingByExerciseId,
    selectedAnalysisKey,
    selectedCanonicalMuscleId,
    selectedZoneDefinition,
    selectedZoneKey,
    sessions,
    windowKey,
    windowSetRows,
  ]);
  const selectedFamilyDistribution = useMemo(() => {
    if (!selectedZoneFamily) return null;

    const familyOutput = stimulusResultV2.familyOutputs.find(
      (output) => output.familyKey === selectedZoneFamily.engineFamilyKey
    );
    const rows = (familyOutput?.rows ?? [])
      .map((row) => ({
        analysisKey: row.analysisKey as ExerciseDatabaseMuscleKey,
        label: analysisLabelByKey.get(row.analysisKey as ExerciseDatabaseMuscleKey) ?? row.analysisKey,
        stimulus: row.value,
      }))
      .filter((row) => row.stimulus > 0)
      .sort((a, b) => b.stimulus - a.stimulus || a.label.localeCompare(b.label));

    const totalStimulus = rows.reduce((sum, row) => sum + row.stimulus, 0);
    const distributionRows = rows.map((row) => ({
      ...row,
      percent: totalStimulus > 0 ? (row.stimulus / totalStimulus) * 100 : 0,
    }));

    return {
      totalStimulus,
      rows: distributionRows,
    };
  }, [analysisLabelByKey, selectedZoneFamily, stimulusResultV2.familyOutputs]);
  const selectedFamilyBalanceRows = useMemo(() => {
    if (!selectedFamilyDistribution) return [];

    return selectedFamilyDistribution.rows.map((row) => ({
      analysisKey: row.analysisKey,
      label: row.label,
      sharePercent: row.percent,
      normalizedShare:
        selectedFamilyDistribution.totalStimulus > 0 ? row.stimulus / selectedFamilyDistribution.totalStimulus : 0,
    }));
  }, [selectedFamilyDistribution]);

  const yourTopRows = useMemo(
    () =>
      yourTop.length > 0
        ? yourTop
        : [{ label: "-", stimulus: 0, exerciseId: "none" }],
    [yourTop]
  );

  const highActivationRows = useMemo(
    () =>
      highActivation.length > 0
        ? highActivation
        : [{ label: "-", activation: 0, exerciseId: "none" }],
    [highActivation]
  );
  const selectedCoachMuscle = useMemo(() => {
    if (selectedAnalysisKey) {
      return coachMuscleById.get(selectedAnalysisKey) ?? null;
    }

    if (selectedZoneDefinition) {
      return coachMuscleById.get(selectedZoneDefinition.analysisKey) ?? null;
    }

    return null;
  }, [coachMuscleById, selectedAnalysisKey, selectedZoneDefinition]);
  const selectedZoneStats = selectedZoneDefinition ? zoneStatsByKey.get(selectedZoneDefinition.zoneKey) ?? null : null;
  const moduleInlineStyle = {
    position: "absolute" as const,
    left: `${modulePos.left}px`,
    top: `${modulePos.top}px`,
  };

  const onStageClick = useCallback(() => {
    setModuleOpen(false);
  }, []);

  const onZoneOverlayClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    let zoneId: string | null = null;
    let zoneDefinition: ZoneDefinition | null = null;

    try {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const elementWithId = target.closest("[id]");
      zoneId = elementWithId?.id ?? null;
      console.warn(`${logPrefix} tap raw zone:`, zoneId);
      if (!zoneId) return;

      zoneDefinition = ZONE_DEFINITION_BY_SVG_ID.get(zoneId) ?? null;
      const zoneKey = zoneDefinition?.zoneKey ?? getMirroredZoneBase(zoneId);
      console.warn(`${logPrefix} normalized zone:`, zoneKey);
      if (!zoneDefinition) {
        console.warn(`${logPrefix} render fallback used: unresolved zone definition`, { zoneId, zoneKey });
        return;
      }

      const mobileSafePath = isMobileSheet && isLatZoneKey(zoneDefinition.zoneKey);
      console.warn(`${logPrefix} mobile safe path:`, {
        zoneKey: zoneDefinition.zoneKey,
        analysisKey: zoneDefinition.analysisKey,
        mobileSafePath,
        isMobileSheet,
      });

      e.stopPropagation();
      if (stageRef.current) {
        const anchorPosition = getZoneAnchorPosition(stageRef.current, elementWithId, mobileSafePath);
        if (anchorPosition) {
          setModuleAnchor(anchorPosition);
          console.warn(`${logPrefix} anchor resolved:`, {
            zoneKey: zoneDefinition.zoneKey,
            anchorPosition,
            mobileSafePath,
          });
        } else {
          setModuleAnchor(null);
          const fallbackPos = getSafeModuleFallbackPosition(stageRef.current);
          setModulePos(fallbackPos);
          console.warn(`${logPrefix} module open fallback:`, {
            zoneKey: zoneDefinition.zoneKey,
            fallbackPos,
            reason: "anchor-missing",
          });
        }
      }

      const zoneFamily = ZONE_FAMILY_BY_ZONE_KEY.get(zoneDefinition.zoneKey) ?? null;
      console.warn(`${logPrefix} selected muscle resolved:`, {
        zoneKey: zoneDefinition.zoneKey,
        analysisKey: zoneFamily ? null : zoneDefinition.analysisKey,
        familyId: zoneFamily?.familyId ?? null,
        canonicalPolicy: zoneFamily?.canonicalPolicy ?? zoneDefinition.canonicalPolicy ?? "mapped",
        canonicalMuscleIds: zoneFamily?.canonicalMuscleIds ?? zoneDefinition.canonicalMuscleIds,
      });

      setSelectedAnalysisKey(zoneFamily ? null : zoneDefinition.analysisKey);
      setSelectedZoneKey(zoneDefinition.zoneKey);
      setSelectedZonePairBase(zoneDefinition.zoneKey);
      setModuleOpen(true);
      console.warn(`${logPrefix} module open attempted:`, {
        zoneKey: zoneDefinition.zoneKey,
        analysisKey: zoneFamily ? null : zoneDefinition.analysisKey,
        familyId: zoneFamily?.familyId ?? null,
        canonicalMuscleId: (zoneFamily?.canonicalMuscleIds[0] ?? zoneDefinition.canonicalMuscleIds[0]) ?? null,
      });
    } catch (error) {
      console.error(`${logPrefix} caught mobile lat error:`, {
        step: "onZoneOverlayClick",
        zoneId,
        zoneKey: zoneDefinition?.zoneKey ?? null,
        analysisKey: zoneDefinition ? (ZONE_FAMILY_BY_ZONE_KEY.get(zoneDefinition.zoneKey) ? null : zoneDefinition.analysisKey) : null,
        familyId: zoneDefinition ? (ZONE_FAMILY_BY_ZONE_KEY.get(zoneDefinition.zoneKey)?.familyId ?? null) : null,
        canonicalPolicy: zoneDefinition
          ? (ZONE_FAMILY_BY_ZONE_KEY.get(zoneDefinition.zoneKey)?.canonicalPolicy ?? zoneDefinition.canonicalPolicy ?? "mapped")
          : "mapped",
        canonicalMuscleIds: zoneDefinition
          ? (ZONE_FAMILY_BY_ZONE_KEY.get(zoneDefinition.zoneKey)?.canonicalMuscleIds ?? zoneDefinition.canonicalMuscleIds)
          : [],
        isMobileSheet,
        error,
      });

      if (isMobileSheet && zoneId) {
        try {
          const fallbackZoneDefinition = ZONE_DEFINITION_BY_SVG_ID.get(zoneId) ?? null;
          if (fallbackZoneDefinition && isLatZoneKey(fallbackZoneDefinition.zoneKey)) {
            const fallbackZoneFamily = ZONE_FAMILY_BY_ZONE_KEY.get(fallbackZoneDefinition.zoneKey) ?? null;
            setModuleAnchor(null);
            setSelectedAnalysisKey(fallbackZoneFamily ? null : fallbackZoneDefinition.analysisKey);
            setSelectedZoneKey(fallbackZoneDefinition.zoneKey);
            setSelectedZonePairBase(fallbackZoneDefinition.zoneKey);
            setModuleOpen(true);
            console.warn(`${logPrefix} module open fallback:`, {
              fallbackZoneKey: fallbackZoneDefinition.zoneKey,
              fallbackAnalysisKey: fallbackZoneFamily ? null : fallbackZoneDefinition.analysisKey,
              fallbackFamilyId: fallbackZoneFamily?.familyId ?? null,
              fallbackCanonicalMuscleId:
                (fallbackZoneFamily?.canonicalMuscleIds[0] ?? fallbackZoneDefinition.canonicalMuscleIds[0]) ??
                "m_latissimus_dorsi",
            });
          }
        } catch (fallbackError) {
          console.error(`${logPrefix} caught mobile lat error: fallback open failed`, {
            zoneId,
            error: fallbackError,
          });
        }
      }
    }
  }, [isMobileSheet, logPrefix]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(max-width: 900px), (pointer: coarse), (hover: none)");
    const syncMobileSheet = () => setIsMobileSheet(shouldUseMobileSheet());
    syncMobileSheet();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMobileSheet);
      return () => mediaQuery.removeEventListener("change", syncMobileSheet);
    }
    mediaQuery.addListener(syncMobileSheet);
    return () => mediaQuery.removeListener(syncMobileSheet);
  }, []);

  useEffect(() => {
    if (!selectedZoneKey) return;
    console.warn(`${logPrefix} selected zone state:`, {
      selectedZoneKey,
      selectedFamilyId: selectedZoneFamily?.familyId ?? null,
      selectedAnalysisKey,
      canonicalPolicy: selectedZoneFamily?.canonicalPolicy ?? selectedZoneDefinition?.canonicalPolicy ?? "mapped",
      selectedCanonicalMuscleId,
      moduleOpen,
      isMobileSheet,
    });
  }, [isMobileSheet, logPrefix, moduleOpen, selectedAnalysisKey, selectedCanonicalMuscleId, selectedZoneFamily, selectedZoneKey]);

  useEffect(() => {
    if (!isMobileLatZone) return;
    try {
      console.warn(`${logPrefix} selected muscle resolved:`, {
        selectedZoneKey,
        selectedFamilyId: selectedZoneFamily?.familyId ?? null,
        selectedAnalysisKey,
        canonicalPolicy: selectedZoneFamily?.canonicalPolicy ?? selectedZoneDefinition?.canonicalPolicy ?? "mapped",
        selectedCanonicalMuscleId,
        hasStimulusStats: !!stimulusStats,
        hasStabilizerStats: !!stabilizerStats,
      });
    } catch (error) {
      console.error(`${logPrefix} caught mobile lat error: post-selection effect`, {
        selectedZoneKey,
        selectedFamilyId: selectedZoneFamily?.familyId ?? null,
        selectedAnalysisKey,
        canonicalPolicy: selectedZoneFamily?.canonicalPolicy ?? selectedZoneDefinition?.canonicalPolicy ?? "mapped",
        selectedCanonicalMuscleId,
        error,
      });
    }
  }, [isMobileLatZone, logPrefix, selectedAnalysisKey, selectedCanonicalMuscleId, selectedZoneFamily, selectedZoneKey, stabilizerStats, stimulusStats]);

  useEffect(() => {
    if (!moduleOpen || !moduleRef.current) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (moduleRef.current?.contains(target)) return;
      setModuleOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moduleOpen]);

  useLayoutEffect(() => {
    if (isMobileSheet || !moduleOpen || !moduleAnchor || !stageRef.current || !moduleRef.current) return;

    try {
      const stageRect = stageRef.current.getBoundingClientRect();
      const moduleRect = moduleRef.current.getBoundingClientRect();
      const pad = 12;

      let left = moduleAnchor.x + 12;
      let top = moduleAnchor.y - moduleRect.height - 10;
      if (top < pad) {
        top = moduleAnchor.y + 10;
      }

      const maxLeft = Math.max(pad, stageRect.width - moduleRect.width - pad);
      const maxTop = Math.max(pad, stageRect.height - moduleRect.height - pad);

      left = Math.min(Math.max(left, pad), maxLeft);
      top = Math.min(Math.max(top, pad), maxTop);

      setModulePos((prev) =>
        Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5 ? prev : { left, top }
      );
      setModuleSize((prev) =>
        Math.abs(prev.width - moduleRect.width) < 0.5 && Math.abs(prev.height - moduleRect.height) < 0.5
          ? prev
          : { width: moduleRect.width, height: moduleRect.height }
      );
    } catch (error) {
      console.error(`${logPrefix} caught mobile lat error: layout effect`, {
        selectedZoneKey,
        selectedFamilyId: selectedZoneFamily?.familyId ?? null,
        selectedAnalysisKey,
        selectedCanonicalMuscleId,
        error,
      });
      setModuleAnchor(null);
    }
  }, [isMobileSheet, logPrefix, moduleOpen, moduleAnchor, selectedAnalysisKey, selectedCanonicalMuscleId, selectedZoneFamily, selectedZoneKey, windowKey]);

  return (
    <div className="forgePage bodyV2Page">
      <section className="bodyV2Workspace">
        <div className="bodyV2TopRow">
          <button className="bodyV2Pill" data-active={windowKey === "last7"} onClick={() => setStoredWindow("last7")}>
            7d
          </button>
          <button className="bodyV2Pill" data-active={windowKey === "last30"} onClick={() => setStoredWindow("last30")}>
            30d
          </button>
          <button
            className="bodyV2Pill"
            data-active={windowKey === "last180"}
            onClick={() => setStoredWindow("last180")}
          >
            180d
          </button>
          <button className="bodyV2Pill" data-active={windowKey === "all"} onClick={() => setStoredWindow("all")}>
            All
          </button>
        </div>

        <div
          className="forgeInnerPlate"
          style={{
            padding: 12,
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            borderRadius: 16,
          }}
        >
          <div>
            <div className="kpiLabel">Coach snapshot</div>
            <div style={{ fontWeight: 900 }}>
              {coachSnapshot.summary.actionableCount > 0
                ? `${coachSnapshot.summary.actionableCount} actionable`
                : "No active priorities"}
            </div>
          </div>
          <div>
            <div className="kpiLabel">Window stimulus</div>
            <div style={{ fontWeight: 900 }}>{Math.round(coachSnapshot.totalStimulus)}</div>
          </div>
          <div>
            <div className="kpiLabel">Top priority</div>
            <div style={{ fontWeight: 900 }}>{coachSnapshot.topPriorities[0]?.headline ?? "Snapshot only"}</div>
          </div>
        </div>

        <div className="bodyV2Stage" ref={stageRef} onClick={onStageClick}>
          <div className="bodyV2Aura" />
          <div className="bodyV2ViewToggle" role="group" aria-label="Body view">
            <button
              className="bodyV2ViewToggleBtn"
              data-active={view === "front"}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setView("front");
              }}
            >
              Front
            </button>
            <button
              className="bodyV2ViewToggleBtn"
              data-active={view === "back"}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setView("back");
              }}
            >
              Back
            </button>
          </div>
          <div className="bodyV2StageInner">
            <div className="bodyV2Canvas">
              <div className="bodyV2BodyContainer" data-view={view}>
                <img
                  className="bodyV2BodyImg bodyV2BodyImage"
                  src={view === "back" ? BodyBackBase : "/body/body_front.png"}
                  alt={view === "back" ? "Body back" : "Body front"}
                />
                <div
                  ref={zonesOverlayRef}
                  className="bodyV2ZonesOverlay"
                  data-view={view}
                  data-selected-muscle={moduleOpen ? selectedAnalysisKey ?? "" : ""}
                  data-selected-zone-pair={moduleOpen ? selectedZonePairBase ?? "" : ""}
                  onClick={onZoneOverlayClick}
                  dangerouslySetInnerHTML={{ __html: view === "back" ? BodyBackZones : BodyFrontZones }}
                />
              </div>
            </div>
          </div>

          {moduleOpen && (selectedZoneDefinition || selectedZoneFamily) ? (
            <>
              {connector ? (
                <svg className="bodyV2ModuleConnector" aria-hidden>
                  <line
                    className="bodyV2ModuleConnectorLine"
                    x1={connector.x1}
                    y1={connector.y1}
                    x2={connector.x2}
                    y2={connector.y2}
                  />
                  <circle className="bodyV2ModuleConnectorDot" cx={connector.dotX} cy={connector.dotY} r="1.7" />
                </svg>
              ) : null}
              <div
                ref={moduleRef}
                className="bodyV2MuscleModule"
                style={moduleInlineStyle}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bodyV2MuscleModuleTitle">{muscleLabel}</div>
                <div className="bodyV2MuscleModuleStats">
                  <div className="bodyV2MuscleModuleStatRow bodyV2MuscleModuleStatRow--primary">
                    <span className="bodyV2MuscleModuleKey">Stimulus</span>
                    <span className="bodyV2MuscleModuleVal">
                      {selectedFamilyDistribution
                        ? selectedFamilyDistribution.totalStimulus.toFixed(1)
                        : selectedAnalysisStatsV2
                        ? selectedAnalysisStatsV2.rawValue.toFixed(1)
                        : selectedZoneStats
                        ? selectedZoneStats.rawValue.toFixed(1)
                        : stimulusStats
                          ? stimulusStats.rawValue.toFixed(1)
                          : "-"}
                    </span>
                  </div>
                  <div className="bodyV2MuscleModuleStatRow bodyV2MuscleModuleStatRow--primary">
                    <span className="bodyV2MuscleModuleKey">Volume</span>
                    <span className="bodyV2MuscleModuleVal">
                      {selectedFamilyDistribution
                        ? "100.0%"
                        : selectedAnalysisStatsV2
                        ? `${selectedAnalysisStatsV2.percent.toFixed(1)}%`
                        : selectedZoneStats
                        ? `${selectedZoneStats.percent.toFixed(1)}%`
                        : stimulusStats
                          ? `${stimulusStats.percent.toFixed(1)}%`
                          : "-"}
                    </span>
                  </div>
                  <div className="bodyV2MuscleModuleStatRow">
                    <span className="bodyV2MuscleModuleKey">Secondary involvement</span>
                    <span className="bodyV2MuscleModuleVal bodyV2MuscleModuleVal--subtle">
                      {selectedAnalysisStatsV2
                        ? (selectedZoneStats
                            ? `${selectedZoneStats.secondaryValue.toFixed(1)} activation`
                            : "No data yet")
                        : selectedZoneStats
                        ? `${selectedZoneStats.secondaryValue.toFixed(1)} activation`
                        : stabilizerStats
                          ? `${stabilizerStats.rawValue.toFixed(1)} activation`
                          : "No data yet"}
                    </span>
                  </div>
                  {selectedCoachMuscle ? (
                    <>
                      <div className="bodyV2MuscleModuleStatRow">
                        <span className="bodyV2MuscleModuleKey">Coach status</span>
                        <span className="bodyV2MuscleModuleVal bodyV2MuscleModuleVal--subtle">
                          {selectedCoachMuscle.status}
                        </span>
                      </div>
                      <div className="bodyV2MuscleModuleStatRow">
                        <span className="bodyV2MuscleModuleKey">Ratio / severity</span>
                        <span className="bodyV2MuscleModuleVal bodyV2MuscleModuleVal--subtle">
                          {selectedCoachMuscle.ratio.toFixed(2)} / {selectedCoachMuscle.severity.toFixed(2)}
                        </span>
                      </div>
                      <div className="bodyV2MuscleModuleStatRow">
                        <span className="bodyV2MuscleModuleKey">Target vs actual</span>
                        <span className="bodyV2MuscleModuleVal bodyV2MuscleModuleVal--subtle">
                          {selectedCoachMuscle.targetMin != null && selectedCoachMuscle.targetMax != null
                            ? `${selectedCoachMuscle.targetMin.toFixed(1)}-${selectedCoachMuscle.targetMax.toFixed(1)} / ${selectedCoachMuscle.actualStimulus.toFixed(1)}`
                            : `${selectedCoachMuscle.actualStimulus.toFixed(1)} actual`}
                        </span>
                      </div>
                      <div className="bodyV2MuscleModuleStatRow">
                        <span className="bodyV2MuscleModuleKey">Recommended sets</span>
                        <span className="bodyV2MuscleModuleVal bodyV2MuscleModuleVal--subtle">
                          {selectedCoachMuscle.recommendedSetChange > 0
                            ? `+${selectedCoachMuscle.recommendedSetChange}`
                            : String(selectedCoachMuscle.recommendedSetChange)}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              {selectedFamilyDistribution ? (
                <div className="bodyV2MuscleModuleList">
                  <div className="bodyV2MuscleModuleListLabel">Balance</div>
                  {selectedFamilyBalanceRows.length > 0 ? (
                    selectedFamilyBalanceRows.map((row) => (
                      <div key={`balance-${row.analysisKey}`} className="bodyV2MuscleModuleListItem">
                        <span className="bodyV2MuscleModuleListName">{row.label}</span>
                        <span className="bodyV2MuscleModuleListValue">
                          {`${(row.normalizedShare * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="bodyV2MuscleModuleListItem">
                      <span className="bodyV2MuscleModuleListName">No family stimulus yet</span>
                      <span className="bodyV2MuscleModuleListValue">0.0%</span>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="bodyV2MuscleModuleList">
                <div className="bodyV2MuscleModuleListLabel">Your Top</div>
                {yourTopRows.map((row) => (
                  <div key={`top-${row.exerciseId}`} className="bodyV2MuscleModuleListItem">
                    <span className="bodyV2MuscleModuleListName">{row.label}</span>
                  </div>
                ))}
              </div>
              <div className="bodyV2MuscleModuleList">
                <div className="bodyV2MuscleModuleListLabel">High Activation</div>
                {highActivationRows.map((row) => (
                  <div key={`high-${row.exerciseId}`} className="bodyV2MuscleModuleListItem">
                    <span className="bodyV2MuscleModuleListName">{row.label}</span>
                  </div>
                ))}
              </div>
              {selectedCoachMuscle?.topExerciseSuggestions.length ? (
                <div className="bodyV2MuscleModuleList">
                  <div className="bodyV2MuscleModuleListLabel">Coach Suggestions</div>
                  {selectedCoachMuscle.topExerciseSuggestions.slice(0, 3).map((row) => (
                    <div key={`coach-${row.exerciseId}`} className="bodyV2MuscleModuleListItem">
                      <span className="bodyV2MuscleModuleListName">{row.exerciseName}</span>
                      <span className="bodyV2MuscleModuleListValue">{row.displayText}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default BodyPageV2;
