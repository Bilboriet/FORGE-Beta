import type { LoggedStimulusSetV2 } from "./stimulusEngineV2";

export type StimulusValidationExpectationsV2 = {
  dominantAnalysisKeys: string[];
  expectedFamilyKeys?: string[];
  expectedDominantFamilies?: string[];
  helperBucketsShouldBeRedistributed?: string[];
  notes: string[];
};

export type StimulusValidationCaseV2 = {
  id: string;
  label: string;
  description: string;
  sets: LoggedStimulusSetV2[];
  expectations: StimulusValidationExpectationsV2;
};

function set(exerciseId: string, reps = 10, load = 40): LoggedStimulusSetV2 {
  return { exerciseId, reps, load };
}

export const stimulusValidationCasesV2: StimulusValidationCaseV2[] = [
  {
    id: "incline_press_only",
    label: "Incline Press Only",
    description: "Checks upper-chest pressing dominance with incline press patterns.",
    sets: [set("incline_barbell_press", 8, 80), set("incline_dumbbell_press", 10, 30)],
    expectations: {
      dominantAnalysisKeys: ["upper_chest", "deltoid_anterior"],
      notes: ["Upper chest should lead.", "Anterior deltoid should contribute meaningfully."],
    },
  },
  {
    id: "flat_press_only",
    label: "Flat Press Only",
    description: "Checks mid-chest pressing dominance with standard flat pressing.",
    sets: [set("flat_barbell_bench_press", 8, 90)],
    expectations: {
      dominantAnalysisKeys: ["mid_chest", "deltoid_anterior"],
      helperBucketsShouldBeRedistributed: ["triceps_neutral"],
      notes: ["Mid chest should lead.", "Triceps neutral is an input/helper bucket and should not survive as a final output line."],
    },
  },
  {
    id: "lower_chest_only",
    label: "Lower Chest Only",
    description: "Checks lower-chest emphasis from dips and decline pressing.",
    sets: [set("chest_dips", 12, 1), set("decline_barbell_press", 8, 80)],
    expectations: {
      dominantAnalysisKeys: ["lower_chest"],
      helperBucketsShouldBeRedistributed: ["triceps_neutral"],
      notes: ["Lower chest should dominate.", "Triceps neutral is an input/helper bucket and should redistribute into final triceps head outputs."],
    },
  },
  {
    id: "lateral_raise_only",
    label: "Lateral Raise Only",
    description: "Checks clean lateral-delt isolation.",
    sets: [set("cable_lateral_raise", 14, 12)],
    expectations: {
      dominantAnalysisKeys: ["deltoid_lateral"],
      notes: ["Lateral delt should clearly dominate."],
    },
  },
  {
    id: "vertical_press_only",
    label: "Vertical Press Only",
    description: "Checks front-delt dominant pressing with lateral-delt and triceps support.",
    sets: [set("standing_barbell_overhead_press", 6, 60)],
    expectations: {
      dominantAnalysisKeys: ["deltoid_anterior", "deltoid_lateral"],
      helperBucketsShouldBeRedistributed: ["triceps_neutral"],
      notes: ["Anterior delt should lead.", "Lateral delt should support.", "Triceps neutral is an input/helper bucket and should redistribute into final triceps head outputs."],
    },
  },
  {
    id: "long_head_bias",
    label: "Biceps Long Head Bias",
    description: "Checks long-head curl family dominance.",
    sets: [set("incline_dumbbell_curl", 10, 16), set("bayesian_cable_curl", 12, 14)],
    expectations: {
      dominantAnalysisKeys: ["biceps_long_head"],
      expectedFamilyKeys: ["family_biceps"],
      expectedDominantFamilies: ["family_biceps"],
      notes: ["Long head should lead the family outputs."],
    },
  },
  {
    id: "short_head_bias",
    label: "Biceps Short Head Bias",
    description: "Checks short-head curl family dominance.",
    sets: [set("preacher_curl", 10, 25), set("spider_curl", 12, 12)],
    expectations: {
      dominantAnalysisKeys: ["biceps_short_head"],
      expectedFamilyKeys: ["family_biceps"],
      expectedDominantFamilies: ["family_biceps"],
      notes: ["Short head should lead the family outputs."],
    },
  },
  {
    id: "neutral_biceps",
    label: "Neutral Biceps",
    description: "Checks redistribution of neutral curl work into long and short head outputs.",
    sets: [set("barbell_curl", 8, 40), set("ez_bar_curl", 10, 30)],
    expectations: {
      dominantAnalysisKeys: ["biceps_long_head", "biceps_short_head"],
      expectedFamilyKeys: ["family_biceps"],
      expectedDominantFamilies: ["family_biceps"],
      helperBucketsShouldBeRedistributed: ["biceps_neutral"],
      notes: ["Neutral biceps bucket should not survive in final totals.", "Long and short head should both receive redistributed stimulus."],
    },
  },
  {
    id: "brachialis_bias",
    label: "Brachialis Bias",
    description: "Checks hammer-curl family dominance.",
    sets: [set("rope_hammer_curl", 12, 22), set("single_arm_hammer_curl", 10, 14)],
    expectations: {
      dominantAnalysisKeys: ["brachialis"],
      expectedFamilyKeys: ["family_biceps"],
      expectedDominantFamilies: ["family_biceps"],
      notes: ["Brachialis should lead within the elbow-flexor family."],
    },
  },
  {
    id: "overhead_triceps",
    label: "Overhead Triceps",
    description: "Checks long-head triceps dominance from overhead extension work.",
    sets: [set("cable_overhead_triceps_extension", 12, 28)],
    expectations: {
      dominantAnalysisKeys: ["triceps_long_head"],
      expectedFamilyKeys: ["family_triceps"],
      expectedDominantFamilies: ["family_triceps"],
      notes: ["Long head should lead.", "Other heads may appear secondarily."],
    },
  },
  {
    id: "pressdown_triceps",
    label: "Pressdown Triceps",
    description: "Checks redistribution of pressdown helper bucket into lateral and medial heads.",
    sets: [set("cable_triceps_pressdown", 12, 35)],
    expectations: {
      dominantAnalysisKeys: ["triceps_lateral_head", "triceps_medial_head"],
      expectedFamilyKeys: ["family_triceps"],
      expectedDominantFamilies: ["family_triceps"],
      helperBucketsShouldBeRedistributed: ["triceps_lateral_medial"],
      notes: ["Lateral and medial heads should receive the visible output.", "Helper bucket should not survive final totals."],
    },
  },
  {
    id: "neutral_triceps_compound",
    label: "Neutral Triceps Compound",
    description: "Checks redistribution of neutral triceps compound work.",
    sets: [set("close_grip_bench_press", 8, 80)],
    expectations: {
      dominantAnalysisKeys: ["triceps_long_head", "triceps_lateral_head", "triceps_medial_head"],
      expectedFamilyKeys: ["family_triceps"],
      expectedDominantFamilies: ["family_triceps"],
      helperBucketsShouldBeRedistributed: ["triceps_neutral"],
      notes: ["Neutral compound triceps bucket should redistribute into the three heads."],
    },
  },
  {
    id: "wide_vertical_pull",
    label: "Wide Vertical Pull",
    description: "Checks upper-lat dominant wide-grip pulling.",
    sets: [set("wide_grip_pull_up", 8, 1), set("wide_grip_lat_pulldown", 10, 55)],
    expectations: {
      dominantAnalysisKeys: ["upper_lats", "teres_major"],
      notes: ["Upper lats should dominate.", "Teres major should assist."],
    },
  },
  {
    id: "neutral_vertical_pull",
    label: "Neutral Vertical Pull",
    description: "Checks broad upper/lower lat involvement from neutral pulling.",
    sets: [set("neutral_grip_pull_up", 8, 1), set("neutral_grip_lat_pulldown", 10, 55)],
    expectations: {
      dominantAnalysisKeys: ["upper_lats", "lower_lats"],
      notes: ["Upper and lower lats should both appear strongly."],
    },
  },
  {
    id: "lat_row_only",
    label: "Lat Row Only",
    description: "Checks lower-lat bias from lat-row patterns.",
    sets: [set("single_arm_cable_lat_row", 10, 28), set("low_cable_lat_row", 10, 45)],
    expectations: {
      dominantAnalysisKeys: ["lower_lats", "teres_major"],
      notes: ["Lower lats should dominate.", "Mid back should stay secondary or tertiary."],
    },
  },
  {
    id: "pullover_only",
    label: "Pullover Only",
    description: "Checks teres-major-led pullover family behavior.",
    sets: [set("cable_pullover", 12, 30), set("straight_arm_pulldown", 12, 35)],
    expectations: {
      dominantAnalysisKeys: ["teres_major", "upper_lats"],
      notes: ["Teres major should lead the family."],
    },
  },
  {
    id: "mid_back_row_only",
    label: "Mid Back Row Only",
    description: "Checks mid-back row family dominance.",
    sets: [set("seated_cable_row", 10, 55), set("t_bar_row", 8, 70)],
    expectations: {
      dominantAnalysisKeys: ["mid_back", "deltoid_posterior"],
      notes: ["Mid back should dominate.", "Rear delts can appear secondarily."],
    },
  },
  {
    id: "quad_compound_only",
    label: "Quad Compound Only",
    description: "Checks redistribution of quad compound work across RF/VL/VM.",
    sets: [set("hack_squat", 10, 120), set("sled_leg_press", 12, 180)],
    expectations: {
      dominantAnalysisKeys: ["rectus_femoris", "vastus_lateralis", "vastus_medialis"],
      expectedDominantFamilies: ["family_quads"],
      helperBucketsShouldBeRedistributed: ["quads_neutral"],
      notes: ["Compound quad bucket should not survive final totals.", "RF/VL/VM should all receive stimulus."],
    },
  },
  {
    id: "knee_extension_only",
    label: "Knee Extension Only",
    description: "Checks quad-head output from extension work.",
    sets: [set("leg_extension", 12, 45)],
    expectations: {
      dominantAnalysisKeys: ["rectus_femoris", "vastus_lateralis", "vastus_medialis"],
      notes: ["All three quad outputs should appear strongly."],
    },
  },
  {
    id: "glute_thrust_only",
    label: "Glute Thrust Only",
    description: "Checks glute-max dominant bridge/thrust family behavior.",
    sets: [set("barbell_hip_thrust", 10, 120)],
    expectations: {
      dominantAnalysisKeys: ["gluteus_maximus", "medial_hamstring", "lateral_hamstring"],
      notes: ["Glute max should lead.", "Hamstrings should support secondarily."],
    },
  },
  {
    id: "hamstring_hinge_only",
    label: "Hamstring Hinge Only",
    description: "Checks redistribution of hinge-family hamstring bucket plus glute contribution.",
    sets: [set("romanian_deadlift", 8, 100)],
    expectations: {
      dominantAnalysisKeys: ["medial_hamstring", "lateral_hamstring", "gluteus_maximus"],
      expectedDominantFamilies: ["family_hamstrings"],
      helperBucketsShouldBeRedistributed: ["hamstrings_neutral"],
      notes: ["Neutral hamstrings bucket should not survive final totals.", "Glute max should also be strong."],
    },
  },
  {
    id: "hamstring_curl_only",
    label: "Hamstring Curl Only",
    description: "Checks medial and lateral curl family behavior together.",
    sets: [set("seated_leg_curl", 12, 40), set("lying_leg_curl", 12, 40)],
    expectations: {
      dominantAnalysisKeys: ["medial_hamstring", "lateral_hamstring"],
      notes: ["Both hamstring subdivisions should appear."],
    },
  },
  {
    id: "adduction_only",
    label: "Adduction Only",
    description: "Checks direct adductor isolation.",
    sets: [set("machine_hip_adduction", 15, 50)],
    expectations: {
      dominantAnalysisKeys: ["adductors"],
      notes: ["Adductors should clearly dominate."],
    },
  },
  {
    id: "standing_calf_only",
    label: "Standing Calf Only",
    description: "Checks gastrocnemius-leading calf behavior.",
    sets: [set("standing_calf_raise", 15, 80)],
    expectations: {
      dominantAnalysisKeys: ["gastrocnemius", "soleus"],
      notes: ["Gastrocnemius should lead.", "Soleus should support secondarily."],
    },
  },
  {
    id: "seated_calf_only",
    label: "Seated Calf Only",
    description: "Checks soleus-leading calf behavior.",
    sets: [set("seated_calf_raise", 15, 70)],
    expectations: {
      dominantAnalysisKeys: ["soleus", "gastrocnemius"],
      notes: ["Soleus should lead.", "Gastrocnemius should support secondarily."],
    },
  },
  {
    id: "tibialis_only",
    label: "Tibialis Only",
    description: "Checks direct dorsiflexion output.",
    sets: [set("tibialis_raise", 20, 1)],
    expectations: {
      dominantAnalysisKeys: ["tibialis_anterior"],
      notes: ["Tibialis anterior should clearly dominate."],
    },
  },
  {
    id: "abs_only",
    label: "Abs Only",
    description: "Checks rectus-abdominis dominant flexion work.",
    sets: [set("cable_crunch", 15, 35)],
    expectations: {
      dominantAnalysisKeys: ["rectus_abdominis"],
      notes: ["Rectus abdominis should lead.", "Hip flexors may appear tertiary."],
    },
  },
  {
    id: "obliques_only",
    label: "Obliques Only",
    description: "Checks oblique-dominant trunk work.",
    sets: [set("russian_twist", 20, 10)],
    expectations: {
      dominantAnalysisKeys: ["obliques"],
      notes: ["Obliques should dominate."],
    },
  },
  {
    id: "hip_flexor_only",
    label: "Hip Flexor Only",
    description: "Checks hip-flexor dominant hanging leg raise behavior.",
    sets: [set("hanging_leg_raise", 12, 1)],
    expectations: {
      dominantAnalysisKeys: ["hip_flexors", "rectus_abdominis"],
      notes: ["Hip flexors should lead.", "Rectus abdominis should support secondarily."],
    },
  },
  {
    id: "push_day_mixed",
    label: "Push Day Mixed",
    description: "Mixed push-day case to check chest, delts, and triceps interplay.",
    sets: [
      set("incline_barbell_press", 8, 80),
      set("flat_dumbbell_bench_press", 10, 32),
      set("cable_lateral_raise", 14, 12),
      set("cable_overhead_triceps_extension", 12, 28),
    ],
    expectations: {
      dominantAnalysisKeys: ["upper_chest", "mid_chest", "deltoid_lateral", "triceps_long_head"],
      expectedFamilyKeys: ["family_triceps"],
      notes: ["Push outputs should dominate without large unrelated pull/lower outputs."],
    },
  },
  {
    id: "pull_day_mixed",
    label: "Pull Day Mixed",
    description: "Mixed pull-day case to check lat, mid-back, rear-delt, and biceps interplay.",
    sets: [
      set("wide_grip_lat_pulldown", 10, 55),
      set("seated_cable_row", 10, 55),
      set("reverse_pec_deck", 14, 35),
      set("barbell_curl", 10, 40),
    ],
    expectations: {
      dominantAnalysisKeys: ["upper_lats", "mid_back", "deltoid_posterior", "biceps_long_head", "biceps_short_head"],
      expectedFamilyKeys: ["family_biceps"],
      helperBucketsShouldBeRedistributed: ["biceps_neutral"],
      notes: ["Pulling outputs should dominate.", "Neutral biceps work should redistribute."],
    },
  },
  {
    id: "lower_day_mixed",
    label: "Lower Day Mixed",
    description: "Mixed lower-day case to check quads, glutes, hams, calves, and tibialis together.",
    sets: [
      set("hack_squat", 10, 120),
      set("barbell_hip_thrust", 10, 120),
      set("romanian_deadlift", 8, 100),
      set("seated_calf_raise", 15, 70),
      set("tibialis_raise", 20, 1),
    ],
    expectations: {
      dominantAnalysisKeys: [
        "rectus_femoris",
        "vastus_lateralis",
        "vastus_medialis",
        "gluteus_maximus",
        "medial_hamstring",
        "lateral_hamstring",
        "soleus",
        "tibialis_anterior",
      ],
      helperBucketsShouldBeRedistributed: ["quads_neutral", "hamstrings_neutral"],
      notes: ["Lower-body outputs should dominate broadly.", "Neutral helper buckets should not survive final totals."],
    },
  },
];
