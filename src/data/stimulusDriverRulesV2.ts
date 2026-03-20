/**
 * Forge Stimulus Engine V2 direct driver rules.
 *
 * This file defines direct driver hierarchy for exercises and families.
 * Primary/secondary/tertiary/stabilizer are engine-relative driver levels.
 *
 * This file does not handle redistribution of helper/neutral buckets.
 * Redistribution belongs in stimulusRedistributionRulesV2.ts.
 */

export type DriverLevelV2 = "primary" | "secondary" | "tertiary" | "stabilizer";

export type StimulusDriverOutputV2 = {
  analysisKey: string;
  level: DriverLevelV2;
};

export type StimulusDriverRuleV2 = {
  id: string;
  familyKey: string;
  exerciseIds: string[];
  outputs: StimulusDriverOutputV2[];
  confidence: "high" | "medium" | "low";
  evidenceBasis: Array<"literature_backed" | "anatomy_backed" | "heuristic">;
  sourceNotes: string;
  notes?: string;
};

export const stimulusDriverRulesV2: StimulusDriverRuleV2[] = [
  {
    id: "rule_family_incline_press_chest_delts_triceps",
    familyKey: "incline_press_family",
    exerciseIds: [
      "incline_barbell_press",
      "incline_dumbbell_press",
      "incline_machine_press",
      "plate_loaded_adjustable_incline_press",
    ],
    outputs: [
      { analysisKey: "upper_chest", level: "primary" },
      { analysisKey: "deltoid_anterior", level: "secondary" },
      { analysisKey: "triceps_neutral", level: "tertiary" },
    ],
    confidence: "high",
    evidenceBasis: ["literature_backed", "anatomy_backed"],
    sourceNotes:
      "Incline pressing shifts emphasis toward clavicular/upper chest. Anterior deltoid contribution is meaningful. Triceps contribution is present but lower in family hierarchy.",
  },
  {
    id: "rule_family_flat_press_chest_delts_triceps_serratus",
    familyKey: "flat_press_family",
    exerciseIds: [
      "flat_barbell_bench_press",
      "flat_dumbbell_bench_press",
      "flat_machine_chest_press",
      "prime_plate_loaded_chest_press",
      "atlantis_converging_chest_press",
      "hammer_strength_horizontal_bench_press",
    ],
    outputs: [
      { analysisKey: "mid_chest", level: "primary" },
      { analysisKey: "deltoid_anterior", level: "secondary" },
      { analysisKey: "triceps_neutral", level: "secondary" },
      { analysisKey: "serratus_anterior", level: "tertiary" },
    ],
    confidence: "high",
    evidenceBasis: ["literature_backed", "anatomy_backed"],
    sourceNotes:
      "Flat pressing is primarily mid-chest driven, with meaningful anterior deltoid and triceps contribution. Serratus contribution is present at a lower family-driver tier.",
  },
  {
    id: "rule_family_decline_press_dip_lower_chest_triceps",
    familyKey: "decline_press_dip_family",
    exerciseIds: [
      "decline_barbell_press",
      "decline_dumbbell_press",
      "decline_machine_press",
      "chest_dips",
      "weighted_chest_dips",
      "hammer_strength_decline_press",
    ],
    outputs: [
      { analysisKey: "lower_chest", level: "primary" },
      { analysisKey: "triceps_neutral", level: "secondary" },
      { analysisKey: "deltoid_anterior", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["literature_backed", "anatomy_backed"],
    sourceNotes:
      "Decline and chest-dip patterns emphasize lower chest more than flat or incline pressing. Triceps involvement remains meaningful.",
  },
  {
    id: "rule_family_chest_fly_upper_upper_chest",
    familyKey: "chest_fly_upper_family",
    exerciseIds: ["low_to_high_cable_fly", "incline_dumbbell_fly"],
    outputs: [
      { analysisKey: "upper_chest", level: "primary" },
      { analysisKey: "deltoid_anterior", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Upper-chest fly patterns bias clavicular chest contribution while keeping anterior deltoid involvement lower than the primary chest driver.",
  },
  {
    id: "rule_family_chest_fly_mid_mid_chest",
    familyKey: "chest_fly_mid_family",
    exerciseIds: ["flat_dumbbell_fly", "pec_deck_fly"],
    outputs: [{ analysisKey: "mid_chest", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Mid-range horizontal adduction fly patterns are treated as direct mid-chest drivers.",
  },
  {
    id: "rule_family_chest_fly_lower_lower_chest",
    familyKey: "chest_fly_lower_family",
    exerciseIds: ["high_to_low_cable_fly", "decline_dumbbell_fly"],
    outputs: [{ analysisKey: "lower_chest", level: "primary" }],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Downward cable or decline fly patterns are treated as lower-chest-biased fly drivers.",
  },
  {
    id: "rule_family_front_raise_deltoid_anterior",
    familyKey: "front_raise_family",
    exerciseIds: [
      "barbell_front_raise",
      "cable_front_raise",
      "standing_dumbbell_front_raise",
      "seated_dumbbell_front_raise",
      "single_arm_cable_front_raise",
      "machine_front_raise",
    ],
    outputs: [{ analysisKey: "deltoid_anterior", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Front raise patterns are direct anterior deltoid drivers.",
  },
  {
    id: "rule_family_vertical_press_front_side_delts_triceps",
    familyKey: "vertical_press_family",
    exerciseIds: [
      "standing_barbell_overhead_press",
      "seated_barbell_shoulder_press",
      "seated_dumbbell_shoulder_press",
      "machine_shoulder_press",
      "smith_machine_shoulder_press",
      "standing_plate_loaded_shoulder_press",
      "standing_iso_lateral_plate_loaded_shoulder_press",
      "arnold_press",
    ],
    outputs: [
      { analysisKey: "deltoid_anterior", level: "primary" },
      { analysisKey: "deltoid_lateral", level: "secondary" },
      { analysisKey: "triceps_neutral", level: "secondary" },
    ],
    confidence: "high",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Vertical pressing is primarily anterior-deltoid driven, with meaningful lateral-deltoid and triceps involvement.",
  },
  {
    id: "rule_family_lateral_raise_deltoid_lateral",
    familyKey: "lateral_raise_family",
    exerciseIds: [
      "cable_lateral_raise",
      "machine_lateral_raise",
      "seated_dumbbell_lateral_raise",
      "standing_dumbbell_lateral_raise",
      "single_arm_cable_lateral_raise",
      "lean_away_cable_lateral_raise",
      "standing_machine_lateral_raise",
      "standing_plate_loaded_lateral_raise",
    ],
    outputs: [{ analysisKey: "deltoid_lateral", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Lateral raise patterns are direct lateral-deltoid drivers.",
  },
  {
    id: "rule_family_rear_delt_fly_deltoid_posterior",
    familyKey: "rear_delt_fly_family",
    exerciseIds: [
      "cable_rear_delt_fly",
      "reverse_pec_deck",
      "machine_rear_delt_fly",
      "seated_cable_rear_delt_fly",
      "single_arm_cable_rear_delt_fly",
      "bent_over_dumbbell_rear_delt_raise",
      "seated_bent_over_dumbbell_rear_delt_raise",
    ],
    outputs: [{ analysisKey: "deltoid_posterior", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Rear-delt fly patterns are treated as direct posterior-deltoid drivers.",
  },
  {
    id: "rule_family_rear_delt_row_post_delts_mid_back",
    familyKey: "rear_delt_row_family",
    exerciseIds: [
      "chest_supported_rear_delt_row",
      "chest_supported_wide_rear_delt_row",
      "incline_bench_rear_delt_row",
      "machine_rear_delt_row",
      "single_arm_cable_rear_delt_row",
      "wide_elbow_seated_cable_rear_delt_row",
    ],
    outputs: [
      { analysisKey: "deltoid_posterior", level: "primary" },
      { analysisKey: "mid_back", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Rear-delt row patterns primarily drive posterior deltoid while retaining meaningful mid-back contribution.",
  },
  {
    id: "rule_family_biceps_long_head_primary",
    familyKey: "biceps_long_head_family",
    exerciseIds: [
      "bayesian_cable_curl",
      "behind_the_body_cable_curl",
      "incline_cable_curl",
      "incline_dumbbell_curl",
      "single_arm_bayesian_cable_curl",
      "close_grip_barbell_curl",
      "close_grip_ez_bar_curl",
    ],
    outputs: [{ analysisKey: "biceps_long_head", level: "primary" }],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Long-head-biased curl patterns are treated as primary biceps long head drivers.",
  },
  {
    id: "rule_family_biceps_short_head_primary",
    familyKey: "biceps_short_head_family",
    exerciseIds: [
      "preacher_curl",
      "single_arm_preacher_curl",
      "concentration_curl",
      "single_arm_concentration_curl",
      "spider_curl",
      "high_cable_curl",
      "wide_grip_barbell_curl",
      "wide_grip_ez_bar_curl",
    ],
    outputs: [{ analysisKey: "biceps_short_head", level: "primary" }],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Short-head-biased curl patterns are treated as primary biceps short head drivers.",
  },
  {
    id: "rule_family_biceps_neutral_balanced_bucket",
    familyKey: "biceps_neutral_family",
    exerciseIds: [
      "barbell_curl",
      "ez_bar_curl",
      "cable_curl",
      "standing_dumbbell_curl",
      "single_arm_dumbbell_curl",
      "single_arm_cable_curl",
      "alternating_dumbbell_curl",
      "cheat_curl",
      "machine_biceps_curl",
    ],
    outputs: [{ analysisKey: "biceps_neutral", level: "primary" }],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Neutral family acts as a balanced biceps bucket. Exact long/short split is handled in redistribution rules.",
  },
  {
    id: "rule_family_brachialis_primary_with_forearm_tertiary",
    familyKey: "brachialis_family",
    exerciseIds: [
      "rope_hammer_curl",
      "single_arm_hammer_curl",
      "cross_body_hammer_curl",
      "single_arm_cross_body_hammer_curl",
      "alternating_hammer_curl",
      "reverse_curl",
      "ez_bar_reverse_curl",
    ],
    outputs: [
      { analysisKey: "brachialis", level: "primary" },
      { analysisKey: "forearm_extensors", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Hammer and reverse curl patterns are treated as brachialis-dominant, with a smaller forearm extensor contribution in pronated or neutral-grip variants.",
  },
  {
    id: "rule_family_triceps_long_head_with_other_heads",
    familyKey: "triceps_long_head_family",
    exerciseIds: [
      "cable_overhead_triceps_extension",
      "standing_cable_overhead_triceps_extension",
      "ez_bar_overhead_triceps_extension",
      "overhead_dumbbell_triceps_extension",
      "seated_overhead_dumbbell_triceps_extension",
      "overhead_machine_triceps_extension",
      "single_arm_cable_overhead_triceps_extension",
      "single_arm_seated_cable_overhead_triceps_extension",
      "single_arm_overhead_dumbbell_triceps_extension",
      "incline_dumbbell_triceps_extension",
      "single_arm_incline_dumbbell_triceps_extension",
      "skull_crusher",
      "single_arm_skull_crusher",
      "tate_press",
      "single_arm_tate_press",
      "jm_press",
    ],
    outputs: [
      { analysisKey: "triceps_long_head", level: "primary" },
      { analysisKey: "triceps_lateral_head", level: "secondary" },
      { analysisKey: "triceps_medial_head", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["literature_backed", "anatomy_backed"],
    sourceNotes:
      "Long head emphasis is strongest in overhead and lengthened patterns. Exact head split is not treated as precise biological truth.",
  },
  {
    id: "rule_family_triceps_pressdown_lateral_medial_with_long_head_tertiary",
    familyKey: "triceps_pressdown_family",
    exerciseIds: [
      "cable_triceps_pressdown",
      "rope_triceps_pressdown",
      "straight_bar_triceps_pressdown",
      "v_bar_triceps_pressdown",
      "machine_triceps_pressdown",
      "seated_rope_triceps_pressdown",
      "seated_straight_bar_triceps_pressdown",
      "seated_v_bar_triceps_pressdown",
      "single_arm_cable_triceps_pressdown",
      "single_arm_machine_triceps_pressdown",
      "single_arm_rope_triceps_pressdown",
      "single_arm_seated_cable_triceps_pressdown",
      "single_arm_seated_rope_triceps_pressdown",
    ],
    outputs: [
      { analysisKey: "triceps_lateral_medial", level: "primary" },
      { analysisKey: "triceps_long_head", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Pressdown families are treated as primarily lateral/medial triceps buckets, with smaller long-head contribution.",
  },
  {
    id: "rule_family_triceps_reverse_grip_medial_bias",
    familyKey: "triceps_reverse_grip_family",
    exerciseIds: [
      "reverse_grip_triceps_pressdown",
      "seated_reverse_grip_triceps_pressdown",
      "single_arm_reverse_grip_triceps_pressdown",
      "single_arm_seated_reverse_grip_triceps_pressdown",
    ],
    outputs: [
      { analysisKey: "triceps_medial_head", level: "primary" },
      { analysisKey: "triceps_lateral_head", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Reverse-grip pressdown patterns are treated as medial-head-biased with meaningful lateral-head contribution.",
  },
  {
    id: "rule_family_triceps_neutral_compound_with_chest_delts",
    familyKey: "triceps_neutral_compound_family",
    exerciseIds: [
      "close_grip_bench_press",
      "smith_close_grip_bench_press",
      "machine_dip",
      "seated_dip_machine",
      "assisted_triceps_dip",
      "triceps_biased_dip",
      "weighted_triceps_dip",
    ],
    outputs: [
      { analysisKey: "triceps_neutral", level: "primary" },
      { analysisKey: "lower_chest", level: "secondary" },
      { analysisKey: "deltoid_anterior", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Neutral compound triceps patterns are treated as triceps-dominant with secondary lower-chest contribution and smaller anterior-deltoid involvement.",
  },
  {
    id: "rule_family_wide_vertical_pull_upper_lats_teres_biceps",
    familyKey: "wide_vertical_pull_family",
    exerciseIds: [
      "wide_grip_pull_up",
      "weighted_wide_grip_pull_up",
      "wide_grip_lat_pulldown",
      "machine_wide_lat_pulldown",
      "plate_loaded_wide_lat_pulldown",
      "single_arm_pronated_lat_pulldown",
    ],
    outputs: [
      { analysisKey: "upper_lats", level: "primary" },
      { analysisKey: "teres_major", level: "secondary" },
      { analysisKey: "biceps_neutral", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Wide-grip vertical pulling is treated as upper-lat dominant, with meaningful teres major contribution and smaller elbow-flexor involvement.",
  },
  {
    id: "rule_family_neutral_vertical_pull_split_lats_teres_biceps",
    familyKey: "neutral_vertical_pull_family",
    exerciseIds: [
      "pull_up",
      "chin_up",
      "neutral_grip_pull_up",
      "assisted_pull_up",
      "weighted_pull_up",
      "weighted_chin_up",
      "weighted_neutral_grip_pull_up",
      "neutral_grip_lat_pulldown",
      "medium_grip_lat_pulldown",
      "underhand_lat_pulldown",
      "single_arm_neutral_grip_lat_pulldown",
      "single_arm_underhand_lat_pulldown",
    ],
    outputs: [
      { analysisKey: "upper_lats", level: "primary" },
      { analysisKey: "lower_lats", level: "primary" },
      { analysisKey: "teres_major", level: "secondary" },
      { analysisKey: "biceps_neutral", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Neutral and underhand vertical pulling is treated as broad lat work spanning upper and lower lats, with secondary teres major and elbow-flexor contribution.",
  },
  {
    id: "rule_family_lat_row_lower_lats_teres_biceps_midback",
    familyKey: "lat_row_family",
    exerciseIds: [
      "low_cable_lat_row",
      "single_arm_cable_lat_row",
      "single_arm_dumbbell_row",
      "single_arm_machine_lat_row",
      "machine_low_row",
      "plate_loaded_low_row",
      "kneeling_single_arm_lat_pull",
      "single_arm_high_to_low_lat_pull",
    ],
    outputs: [
      { analysisKey: "lower_lats", level: "primary" },
      { analysisKey: "teres_major", level: "secondary" },
      { analysisKey: "biceps_neutral", level: "tertiary" },
      { analysisKey: "mid_back", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Lat-biased row and pull patterns are treated as lower-lat dominant, with secondary teres major and smaller biceps and mid-back contribution.",
  },
  {
    id: "rule_family_pullover_teres_major_with_upper_lats",
    familyKey: "pullover_family",
    exerciseIds: ["cable_pullover", "single_arm_cable_pullover", "straight_arm_pulldown"],
    outputs: [
      { analysisKey: "teres_major", level: "primary" },
      { analysisKey: "upper_lats", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Pullover-style shoulder extension is treated as teres-major dominant with secondary upper-lat contribution.",
  },
  {
    id: "rule_family_mid_back_row_midback_reardelts_biceps_traps",
    familyKey: "mid_back_row_family",
    exerciseIds: [
      "bent_over_barbell_row",
      "chest_supported_machine_row",
      "chest_supported_row",
      "hammer_strength_high_row",
      "incline_bench_dumbbell_row",
      "machine_high_row",
      "machine_mid_row",
      "pendlay_row",
      "plate_loaded_high_row",
      "seal_row",
      "seated_cable_row",
      "t_bar_row",
      "wide_grip_barbell_row",
      "wide_grip_seated_row",
      "wide_grip_t_bar_row",
    ],
    outputs: [
      { analysisKey: "mid_back", level: "primary" },
      { analysisKey: "deltoid_posterior", level: "secondary" },
      { analysisKey: "biceps_neutral", level: "tertiary" },
      { analysisKey: "middle_traps", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Mid-back row patterns are treated as primary mid-back drivers, with meaningful rear-delt contribution and smaller elbow-flexor and middle-trap involvement.",
  },
  {
    id: "rule_family_erector_extension_spine_glutes_hamstrings",
    familyKey: "erector_spinae_extension_family",
    exerciseIds: [
      "forty_five_degree_back_extension",
      "machine_back_extension",
      "reverse_hyperextension",
      "roman_chair_back_extension",
    ],
    outputs: [
      { analysisKey: "erector_spinae", level: "primary" },
      { analysisKey: "gluteus_maximus", level: "secondary" },
      { analysisKey: "medial_hamstring", level: "tertiary" },
      { analysisKey: "lateral_hamstring", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Spinal extension patterns are treated as erector-dominant with meaningful glute contribution and smaller hamstring involvement.",
  },
  {
    id: "rule_family_shrug_upper_traps",
    familyKey: "shrug_family",
    exerciseIds: [
      "barbell_shrug",
      "behind_the_back_barbell_shrug",
      "cable_shrug",
      "dumbbell_shrug",
      "machine_shrug",
      "smith_machine_shrug",
    ],
    outputs: [{ analysisKey: "upper_traps", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Shrug patterns are treated as direct upper-trapezius drivers.",
  },
  {
    id: "rule_family_middle_trap_with_rear_delt_secondary",
    familyKey: "middle_trap_family",
    exerciseIds: ["band_pull_apart", "cable_t_raise", "prone_t_raise"],
    outputs: [
      { analysisKey: "middle_traps", level: "primary" },
      { analysisKey: "deltoid_posterior", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Horizontal scapular retraction patterns are treated as middle-trap dominant with secondary posterior-deltoid involvement.",
  },
  {
    id: "rule_family_lower_trap_primary",
    familyKey: "lower_trap_family",
    exerciseIds: ["cable_y_raise", "lower_trap_raise", "prone_full_can", "prone_y_raise"],
    outputs: [{ analysisKey: "lower_traps", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Y-raise and lower-trap-biased scapular upward-rotation patterns are treated as direct lower-trap drivers.",
  },
  {
    id: "rule_family_external_rotation_cuff_with_rear_delt_tertiary",
    familyKey: "external_rotation_family",
    exerciseIds: [
      "band_external_rotation",
      "cable_external_rotation",
      "face_pull_external_rotation",
      "machine_external_rotation",
      "side_lying_external_rotation",
    ],
    outputs: [
      { analysisKey: "infraspinatus_teresminor", level: "primary" },
      { analysisKey: "deltoid_posterior", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "External-rotation patterns are treated as cuff-dominant, with smaller posterior-deltoid contribution in some setups.",
  },
  {
    id: "rule_family_serratus_primary",
    familyKey: "serratus_family",
    exerciseIds: [
      "cable_serratus_punch",
      "dumbbell_serratus_punch",
      "landmine_serratus_press",
      "scapular_push_up",
    ],
    outputs: [{ analysisKey: "serratus_anterior", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["literature_backed", "anatomy_backed"],
    sourceNotes:
      "Serratus-focused protraction and upward-rotation patterns are treated as direct serratus anterior drivers.",
  },
  {
    id: "rule_family_hip_thrust_bridge_glutes_hamstrings",
    familyKey: "hip_thrust_bridge_family",
    exerciseIds: [
      "barbell_hip_thrust",
      "smith_machine_hip_thrust",
      "machine_hip_thrust",
      "plate_loaded_hip_thrust",
      "glute_bridge",
      "barbell_glute_bridge",
      "single_leg_hip_thrust",
      "single_leg_glute_bridge",
      "frog_pump",
    ],
    outputs: [
      { analysisKey: "gluteus_maximus", level: "primary" },
      { analysisKey: "medial_hamstring", level: "tertiary" },
      { analysisKey: "lateral_hamstring", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Hip thrust and bridge patterns are treated as glute-max dominant with smaller hamstring contribution than hinge patterns. Frog pump remains in this family, though later refinement may weight it differently.",
  },
  {
    id: "rule_family_glute_kickback_glute_max_primary",
    familyKey: "glute_kickback_family",
    exerciseIds: [
      "cable_glute_kickback",
      "single_leg_cable_glute_kickback",
      "machine_glute_kickback",
      "quadruped_glute_kickback",
    ],
    outputs: [{ analysisKey: "gluteus_maximus", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Glute kickback patterns are treated as direct glute-max drivers.",
  },
  {
    id: "rule_family_glute_abduction_glute_medius_primary",
    familyKey: "glute_abduction_family",
    exerciseIds: [
      "machine_hip_abduction",
      "standing_cable_hip_abduction",
      "side_lying_hip_abduction",
      "banded_lateral_walk",
    ],
    outputs: [{ analysisKey: "gluteus_medius", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Hip abduction patterns are treated as direct gluteus medius drivers.",
  },
  {
    id: "rule_family_pull_through_glutes_hamstrings_erectors",
    familyKey: "pull_through_family",
    exerciseIds: ["cable_pull_through"],
    outputs: [
      { analysisKey: "gluteus_maximus", level: "primary" },
      { analysisKey: "medial_hamstring", level: "secondary" },
      { analysisKey: "lateral_hamstring", level: "secondary" },
      { analysisKey: "erector_spinae", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Cable pull-through is treated as glute-dominant hinge work with secondary hamstring and tertiary erector contribution.",
  },
  {
    id: "rule_family_hamstring_curl_medial_with_lateral_secondary",
    familyKey: "hamstring_curl_medial_family",
    exerciseIds: ["seated_leg_curl", "single_leg_seated_leg_curl"],
    outputs: [
      { analysisKey: "medial_hamstring", level: "primary" },
      { analysisKey: "lateral_hamstring", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Seated leg curl patterns are treated as medial-hamstring biased with meaningful lateral-hamstring contribution.",
  },
  {
    id: "rule_family_hamstring_curl_lateral_with_medial_secondary",
    familyKey: "hamstring_curl_lateral_family",
    exerciseIds: ["lying_leg_curl", "single_leg_lying_leg_curl", "nordic_curl"],
    outputs: [
      { analysisKey: "lateral_hamstring", level: "primary" },
      { analysisKey: "medial_hamstring", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Lying and Nordic curl patterns are treated as lateral-hamstring biased with meaningful medial-hamstring contribution.",
  },
  {
    id: "rule_family_hamstring_hinge_neutral_glutes_erectors_adductors",
    familyKey: "hamstring_hinge_family",
    exerciseIds: [
      "romanian_deadlift",
      "stiff_leg_deadlift",
      "good_morning",
      "single_leg_romanian_deadlift",
    ],
    outputs: [
      { analysisKey: "hamstrings_neutral", level: "primary" },
      { analysisKey: "gluteus_maximus", level: "primary" },
      { analysisKey: "erector_spinae", level: "secondary" },
      { analysisKey: "adductors", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Hinge-family hamstring work is treated as broad hamstring and glute work, with secondary erector contribution and tertiary adductor involvement.",
  },
  {
    id: "rule_family_quad_compound_neutral_glutes_adductors",
    familyKey: "quad_compound_family",
    exerciseIds: [
      "back_squat",
      "front_squat",
      "hack_squat",
      "pendulum_squat",
      "plate_loaded_leg_press",
      "sled_leg_press",
      "smith_machine_squat",
      "bulgarian_split_squat",
    ],
    outputs: [
      { analysisKey: "quads_neutral", level: "primary" },
      { analysisKey: "gluteus_maximus", level: "secondary" },
      { analysisKey: "adductors", level: "tertiary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Compound quad patterns are treated as quad-wide primary work. Quads_neutral will later redistribute to rectus femoris, vastus lateralis, and vastus medialis rather than being collapsed to one head here.",
  },
  {
    id: "rule_family_knee_extension_quad_wide_primary",
    familyKey: "knee_extension_family",
    exerciseIds: [
      "leg_extension",
      "single_leg_extension",
      "iso_lateral_leg_extension",
      "prime_plate_loaded_leg_extension",
    ],
    outputs: [
      { analysisKey: "rectus_femoris", level: "primary" },
      { analysisKey: "vastus_lateralis", level: "primary" },
      { analysisKey: "vastus_medialis", level: "primary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Knee extension work is kept quad-wide in V2 base rules rather than being falsely collapsed to rectus femoris only. Later weighting may bias rectus femoris more.",
  },
  {
    id: "rule_family_sissy_squat_quad_wide_primary",
    familyKey: "sissy_squat_family",
    exerciseIds: ["sissy_squat"],
    outputs: [
      { analysisKey: "rectus_femoris", level: "primary" },
      { analysisKey: "vastus_lateralis", level: "primary" },
      { analysisKey: "vastus_medialis", level: "primary" },
    ],
    confidence: "low",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Sissy squat may bias rectus femoris more strongly, but V2 base rules keep it quad-wide as a primary driver across rectus femoris, vastus lateralis, and vastus medialis.",
  },
  {
    id: "rule_family_adduction_adductors_primary",
    familyKey: "adduction_family",
    exerciseIds: [
      "machine_hip_adduction",
      "plate_loaded_hip_adduction",
      "single_leg_machine_hip_adduction",
      "standing_cable_hip_adduction",
      "single_leg_cable_hip_adduction",
      "side_lying_hip_adduction",
      "copenhagen_adduction",
      "supported_copenhagen_adduction",
      "ball_squeeze",
    ],
    outputs: [{ analysisKey: "adductors", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed", "literature_backed"],
    sourceNotes:
      "Direct hip-adduction patterns are treated as primary adductor drivers.",
  },
  {
    id: "rule_family_gastrocnemius_calf_with_soleus_secondary",
    familyKey: "gastrocnemius_calf_family",
    exerciseIds: [
      "standing_calf_raise",
      "single_leg_standing_calf_raise",
      "smith_machine_standing_calf_raise",
      "machine_standing_calf_raise",
      "leg_press_calf_raise",
      "donkey_calf_raise",
    ],
    outputs: [
      { analysisKey: "gastrocnemius", level: "primary" },
      { analysisKey: "soleus", level: "secondary" },
    ],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Straight-knee plantarflexion patterns are treated as gastrocnemius-dominant with secondary soleus contribution.",
  },
  {
    id: "rule_family_soleus_calf_with_gastrocnemius_secondary",
    familyKey: "soleus_calf_family",
    exerciseIds: [
      "seated_calf_raise",
      "single_leg_seated_calf_raise",
      "bent_knee_leg_press_calf_raise",
    ],
    outputs: [
      { analysisKey: "soleus", level: "primary" },
      { analysisKey: "gastrocnemius", level: "secondary" },
    ],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Bent-knee plantarflexion patterns are treated as soleus-dominant with secondary gastrocnemius contribution.",
  },
  {
    id: "rule_family_tibialis_dorsiflexion_primary",
    familyKey: "tibialis_dorsiflexion_family",
    exerciseIds: [
      "tibialis_raise",
      "single_leg_tibialis_raise",
      "seated_tibialis_raise",
      "band_tibialis_dorsiflexion",
    ],
    outputs: [{ analysisKey: "tibialis_anterior", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Ankle dorsiflexion patterns are treated as direct tibialis anterior drivers.",
  },
  {
    id: "rule_family_rectus_abdominis_with_hip_flexor_tertiary",
    familyKey: "rectus_abdominis_family",
    exerciseIds: [
      "cable_crunch",
      "decline_sit_up",
      "floor_crunch",
      "machine_crunch",
      "stability_ball_crunch",
      "weighted_crunch",
      "weighted_decline_sit_up",
    ],
    outputs: [
      { analysisKey: "rectus_abdominis", level: "primary" },
      { analysisKey: "hip_flexors", level: "stabilizer" },
    ],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Direct trunk-flexion patterns are treated as rectus-abdominis dominant, with only a small hip-flexor support contribution in some setups.",
  },
  {
    id: "rule_family_oblique_primary",
    familyKey: "oblique_family",
    exerciseIds: [
      "cable_oblique_crunch",
      "decline_oblique_crunch",
      "dumbbell_side_bend",
      "high_to_low_cable_woodchop",
      "low_to_high_cable_woodchop",
      "machine_torso_rotation",
      "russian_twist",
    ],
    outputs: [{ analysisKey: "obliques", level: "primary" }],
    confidence: "high",
    evidenceBasis: ["anatomy_backed"],
    sourceNotes:
      "Rotational and lateral-flexion trunk patterns are treated as direct oblique drivers.",
  },
  {
    id: "rule_family_hip_flexor_with_abs_secondary",
    familyKey: "hip_flexor_family",
    exerciseIds: [
      "captains_chair_knee_raise",
      "captains_chair_leg_raise",
      "hanging_knee_raise",
      "hanging_leg_raise",
      "lying_leg_raise",
      "parallel_bar_knee_raise",
      "parallel_bar_leg_raise",
      "reverse_crunch",
    ],
    outputs: [
      { analysisKey: "hip_flexors", level: "primary" },
      { analysisKey: "rectus_abdominis", level: "secondary" },
    ],
    confidence: "medium",
    evidenceBasis: ["anatomy_backed", "heuristic"],
    sourceNotes:
      "Hip-flexion dominant raise patterns are treated as primary hip-flexor work with secondary rectus-abdominis contribution. Reverse crunch remains in this family for now per current database logic.",
  },
];
