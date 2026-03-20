import type { WorkoutSession } from "../../../types";

export type TrainingSessionV2 = WorkoutSession;

export type CoachDiagnosisScenarioTypeV2 = "under" | "balanced" | "over" | "mixed";

export type CoachDiagnosisTimeWindowV2 = "session" | "weekly";

export type CoachDiagnosisRecommendationDirectionV2 = "increase" | "maintain" | "decrease";

export type CoachDiagnosisErrorTypeV2 =
  | "false_under"
  | "false_balanced"
  | "false_over"
  | "false_reduce"
  | "priority_misranking"
  | "over_aggressive_adjustment"
  | "under_aggressive_adjustment"
  | "direction_mismatch"
  | "weak_suggestions"
  | "weekly_session_mismatch";

export type CoachDiagnosisRootCauseV2 =
  | "target_too_low"
  | "target_too_high"
  | "range_too_narrow"
  | "range_too_wide"
  | "priority_scoring_issue"
  | "recommendation_threshold_issue"
  | "set_adjustment_scaling_issue"
  | "indirect_overestimation"
  | "indirect_underestimation"
  | "suggestion_ranking_issue"
  | "target_scaling_issue"
  | "insufficient_context_in_output";

export type CoachDiagnosisStimulusEntryV2 = {
  muscleId: string;
  totalStimulus: number;
  primaryStimulus?: number;
  secondaryStimulus?: number;
  notes?: string;
};

export type CoachDiagnosisTargetEntryV2 = {
  muscleId: string;
  targetMin: number;
  targetMax: number;
  notes?: string;
};

export type CoachDiagnosisStatusEntryV2 = {
  muscleId: string;
  actualStatus: "under" | "balanced" | "over";
  expectedStatus?: "under" | "balanced" | "over";
  notes?: string;
};

export type CoachDiagnosisPriorityEntryV2 = {
  muscleId: string;
  actualRank: number;
  expectedRank?: number;
  notes?: string;
};

export type CoachDiagnosisRecommendationEntryV2 = {
  muscleId: string;
  actualDirection: CoachDiagnosisRecommendationDirectionV2;
  expectedDirection?: CoachDiagnosisRecommendationDirectionV2;
  actualSetAdjustment?: number;
  expectedSetAdjustment?: number;
  notes?: string;
};

export type CoachDiagnosisSuggestionEntryV2 = {
  muscleId: string;
  actualExerciseIds: string[];
  expectedExerciseIds?: string[];
  notes?: string;
};

export type CoachDiagnosisAnalysisV2 = {
  errorTypes: CoachDiagnosisErrorTypeV2[];
  suspectedRootCauses: CoachDiagnosisRootCauseV2[];
  summary: string;
  notes?: string;
};

export type CoachDiagnosisCaseV2 = {
  id: string;
  scenario: {
    type: CoachDiagnosisScenarioTypeV2;
    timeWindow: CoachDiagnosisTimeWindowV2;
    description: string;
  };
  input: {
    sessions: TrainingSessionV2[];
    focusMuscleIds?: string[];
    notes?: string;
  };
  stimulus: {
    byMuscle: CoachDiagnosisStimulusEntryV2[];
    notes?: string;
  };
  targets: {
    byMuscle: CoachDiagnosisTargetEntryV2[];
    notes?: string;
  };
  output: {
    statuses: CoachDiagnosisStatusEntryV2[];
    priorities: CoachDiagnosisPriorityEntryV2[];
    recommendations: CoachDiagnosisRecommendationEntryV2[];
    suggestions?: CoachDiagnosisSuggestionEntryV2[];
    notes?: string;
  };
  analysis: CoachDiagnosisAnalysisV2;
};

export const serratusFalseReduceDiagnosisCaseV2: CoachDiagnosisCaseV2 = {
  id: "serratus_false_reduce_case_001",
  scenario: {
    type: "mixed",
    timeWindow: "weekly",
    description:
      "Compound-heavy push week with pressing-dominant exposure. Serratus anterior receives some indirect stimulus from compound pressing, but there is little to no meaningful direct serratus work.",
  },
  input: {
    sessions: [
      {
        id: "diagnosis_serratus_false_reduce_week_s1",
        date: "2026-03-10",
        title: "Push A",
        exercises: [
          {
            id: "diagnosis_serratus_false_reduce_week_s1_block_1",
            order: 0,
            exercise: {
              id: "flat_barbell_bench_press",
              name: "Flat Barbell Bench Press",
              muscleGroup: "chest",
            },
            sets: [
              { id: "diagnosis_s1_b1_set_1", kind: "work", reps: 8, weightKg: 90, rir: 2 },
              { id: "diagnosis_s1_b1_set_2", kind: "work", reps: 8, weightKg: 90, rir: 2 },
              { id: "diagnosis_s1_b1_set_3", kind: "work", reps: 7, weightKg: 90, rir: 1 },
            ],
          },
          {
            id: "diagnosis_serratus_false_reduce_week_s1_block_2",
            order: 1,
            exercise: {
              id: "incline_dumbbell_press",
              name: "Incline Dumbbell Press",
              muscleGroup: "chest",
            },
            sets: [
              { id: "diagnosis_s1_b2_set_1", kind: "work", reps: 10, weightKg: 34, rir: 2 },
              { id: "diagnosis_s1_b2_set_2", kind: "work", reps: 10, weightKg: 34, rir: 2 },
              { id: "diagnosis_s1_b2_set_3", kind: "work", reps: 9, weightKg: 34, rir: 1 },
            ],
          },
          {
            id: "diagnosis_serratus_false_reduce_week_s1_block_3",
            order: 2,
            exercise: {
              id: "machine_shoulder_press",
              name: "Machine Shoulder Press",
              muscleGroup: "shoulders",
            },
            sets: [
              { id: "diagnosis_s1_b3_set_1", kind: "work", reps: 10, weightKg: 55, rir: 2 },
              { id: "diagnosis_s1_b3_set_2", kind: "work", reps: 9, weightKg: 55, rir: 1 },
            ],
          },
          {
            id: "diagnosis_serratus_false_reduce_week_s1_block_4",
            order: 3,
            exercise: {
              id: "rope_triceps_pressdown",
              name: "Rope Triceps Pressdown",
              muscleGroup: "triceps",
            },
            sets: [
              { id: "diagnosis_s1_b4_set_1", kind: "work", reps: 12, weightKg: 35, rir: 2 },
              { id: "diagnosis_s1_b4_set_2", kind: "work", reps: 12, weightKg: 35, rir: 2 },
            ],
          },
        ],
      },
      {
        id: "diagnosis_serratus_false_reduce_week_s2",
        date: "2026-03-14",
        title: "Push B",
        exercises: [
          {
            id: "diagnosis_serratus_false_reduce_week_s2_block_1",
            order: 0,
            exercise: {
              id: "flat_machine_chest_press",
              name: "Flat Machine Chest Press",
              muscleGroup: "chest",
            },
            sets: [
              { id: "diagnosis_s2_b1_set_1", kind: "work", reps: 10, weightKg: 80, rir: 2 },
              { id: "diagnosis_s2_b1_set_2", kind: "work", reps: 10, weightKg: 80, rir: 2 },
              { id: "diagnosis_s2_b1_set_3", kind: "work", reps: 9, weightKg: 80, rir: 1 },
            ],
          },
          {
            id: "diagnosis_serratus_false_reduce_week_s2_block_2",
            order: 1,
            exercise: {
              id: "seated_dumbbell_shoulder_press",
              name: "Seated Dumbbell Shoulder Press",
              muscleGroup: "shoulders",
            },
            sets: [
              { id: "diagnosis_s2_b2_set_1", kind: "work", reps: 10, weightKg: 28, rir: 2 },
              { id: "diagnosis_s2_b2_set_2", kind: "work", reps: 9, weightKg: 28, rir: 1 },
            ],
          },
          {
            id: "diagnosis_serratus_false_reduce_week_s2_block_3",
            order: 2,
            exercise: {
              id: "pec_deck_fly",
              name: "Pec Deck Fly",
              muscleGroup: "chest",
            },
            sets: [
              { id: "diagnosis_s2_b3_set_1", kind: "work", reps: 13, weightKg: 55, rir: 2 },
              { id: "diagnosis_s2_b3_set_2", kind: "work", reps: 12, weightKg: 55, rir: 1 },
            ],
          },
        ],
      },
    ],
    focusMuscleIds: ["serratus_anterior", "mid_chest", "deltoid_anterior", "triceps_long_head"],
    notes:
      "Weekly push exposure is dominated by chest and front-delt compounds. There is no direct serratus-focused exercise such as serratus punch or scapular push-up.",
  },
  stimulus: {
    byMuscle: [
      {
        muscleId: "serratus_anterior",
        totalStimulus: 690,
        primaryStimulus: 0,
        secondaryStimulus: 690,
        notes: "Nearly all observed serratus exposure appears indirect via compound pressing mechanics rather than intentional serratus training.",
      },
      {
        muscleId: "mid_chest",
        totalStimulus: 2140,
        primaryStimulus: 1840,
        secondaryStimulus: 300,
        notes: "Chest is the main intended training outcome across the week.",
      },
      {
        muscleId: "deltoid_anterior",
        totalStimulus: 1560,
        primaryStimulus: 720,
        secondaryStimulus: 840,
        notes: "Front delt work comes from both direct overhead pressing and secondary pressing exposure.",
      },
      {
        muscleId: "triceps_long_head",
        totalStimulus: 1180,
        primaryStimulus: 420,
        secondaryStimulus: 760,
        notes: "Triceps are meaningfully involved, but serratus is still not a direct training focus.",
      },
    ],
    notes: "Stimulus facts are diagnosis-oriented and intended to show that serratus stimulus is mostly indirect relative to the actual training intent.",
  },
  targets: {
    byMuscle: [
      {
        muscleId: "serratus_anterior",
        targetMin: 425,
        targetMax: 575,
        notes: "Current baseline makes serratus easy to classify as over when compound pressing contributes enough indirect volume.",
      },
    ],
    notes: "Only the focus muscle target is included here because the diagnosis question is why serratus becomes actionable at all.",
  },
  output: {
    statuses: [
      {
        muscleId: "serratus_anterior",
        actualStatus: "over",
        expectedStatus: "balanced",
        notes: "Coach currently interprets serratus as over target despite minimal direct serratus-oriented work.",
      },
    ],
    priorities: [
      {
        muscleId: "serratus_anterior",
        actualRank: 1,
        expectedRank: undefined,
        notes: "Serratus surfaces as a top actionable item, which is the core diagnosis concern.",
      },
    ],
    recommendations: [
      {
        muscleId: "serratus_anterior",
        actualDirection: "decrease",
        expectedDirection: "maintain",
        actualSetAdjustment: -1,
        expectedSetAdjustment: 0,
        notes: "Coach recommends reducing serratus-related work even though the weekly pattern is almost entirely compound-driven indirect exposure.",
      },
    ],
    suggestions: [
      {
        muscleId: "serratus_anterior",
        actualExerciseIds: [],
        expectedExerciseIds: [],
        notes: "No exercise suggestion is the right outcome here because the problem is the reduce direction itself, not weak increase suggestions.",
      },
    ],
    notes: "This output records the current coach conclusion exactly as observed for diagnosis purposes.",
  },
  analysis: {
    errorTypes: ["false_reduce"],
    suspectedRootCauses: ["indirect_overestimation", "recommendation_threshold_issue"],
    summary:
      "Serratus anterior appears over-covered because indirect pressing stimulus is being treated as strong enough evidence for a weekly reduce recommendation. In this pattern, the coach conclusion is likely too confident and probably wrong.",
    notes:
      "This is a strong anchor case because it isolates a believable tuning failure: a small support muscle can look over target from compound carryover even when the user did not meaningfully train it directly.",
  },
};

export const bicepsFalseBalancedDiagnosisCaseV2: CoachDiagnosisCaseV2 = {
  id: "biceps_false_balanced_case_001",
  scenario: {
    type: "balanced",
    timeWindow: "weekly",
    description:
      "Pull-heavy week with rows and pulldowns creating meaningful secondary elbow-flexor exposure, but with little to no direct curl work.",
  },
  input: {
    sessions: [
      {
        id: "diagnosis_biceps_false_balanced_week_s1",
        date: "2026-03-11",
        title: "Pull A",
        exercises: [
          {
            id: "diagnosis_biceps_false_balanced_week_s1_block_1",
            order: 0,
            exercise: { id: "seated_cable_row", name: "Seated Cable Row", muscleGroup: "back" },
            sets: [
              { id: "diagnosis_biceps_fb_s1_b1_1", kind: "work", reps: 10, weightKg: 75, rir: 2 },
              { id: "diagnosis_biceps_fb_s1_b1_2", kind: "work", reps: 10, weightKg: 75, rir: 2 },
              { id: "diagnosis_biceps_fb_s1_b1_3", kind: "work", reps: 9, weightKg: 75, rir: 1 },
            ],
          },
          {
            id: "diagnosis_biceps_false_balanced_week_s1_block_2",
            order: 1,
            exercise: { id: "neutral_grip_lat_pulldown", name: "Neutral Grip Lat Pulldown", muscleGroup: "back" },
            sets: [
              { id: "diagnosis_biceps_fb_s1_b2_1", kind: "work", reps: 10, weightKg: 70, rir: 2 },
              { id: "diagnosis_biceps_fb_s1_b2_2", kind: "work", reps: 10, weightKg: 70, rir: 2 },
              { id: "diagnosis_biceps_fb_s1_b2_3", kind: "work", reps: 8, weightKg: 70, rir: 1 },
            ],
          },
        ],
      },
      {
        id: "diagnosis_biceps_false_balanced_week_s2",
        date: "2026-03-15",
        title: "Pull B",
        exercises: [
          {
            id: "diagnosis_biceps_false_balanced_week_s2_block_1",
            order: 0,
            exercise: { id: "chest_supported_row", name: "Chest Supported Row", muscleGroup: "back" },
            sets: [
              { id: "diagnosis_biceps_fb_s2_b1_1", kind: "work", reps: 12, weightKg: 42, rir: 2 },
              { id: "diagnosis_biceps_fb_s2_b1_2", kind: "work", reps: 12, weightKg: 42, rir: 2 },
              { id: "diagnosis_biceps_fb_s2_b1_3", kind: "work", reps: 11, weightKg: 42, rir: 1 },
            ],
          },
          {
            id: "diagnosis_biceps_false_balanced_week_s2_block_2",
            order: 1,
            exercise: { id: "wide_grip_lat_pulldown", name: "Wide Grip Lat Pulldown", muscleGroup: "back" },
            sets: [
              { id: "diagnosis_biceps_fb_s2_b2_1", kind: "work", reps: 11, weightKg: 65, rir: 2 },
              { id: "diagnosis_biceps_fb_s2_b2_2", kind: "work", reps: 10, weightKg: 65, rir: 1 },
            ],
          },
        ],
      },
    ],
    focusMuscleIds: ["biceps_long_head", "biceps_short_head", "mid_back", "upper_lats"],
    notes: "The week is back-focused. There is no direct curl slot, but the coach appears to treat biceps as sufficiently covered from pull carryover.",
  },
  stimulus: {
    byMuscle: [
      {
        muscleId: "biceps_long_head",
        totalStimulus: 980,
        primaryStimulus: 0,
        secondaryStimulus: 980,
        notes: "Biceps long head is covered only through secondary pulling exposure.",
      },
      {
        muscleId: "biceps_short_head",
        totalStimulus: 980,
        primaryStimulus: 0,
        secondaryStimulus: 980,
        notes: "Biceps short head similarly looks covered despite the absence of direct curl work.",
      },
    ],
    notes: "This case checks whether indirect back work is being interpreted as enough to fully cover biceps growth intent.",
  },
  targets: {
    byMuscle: [
      {
        muscleId: "biceps_long_head",
        targetMin: 1050,
        targetMax: 1350,
        notes: "Range assumes some direct biceps intent would normally be needed.",
      },
      {
        muscleId: "biceps_short_head",
        targetMin: 1050,
        targetMax: 1350,
        notes: "Same diagnosis framing as long head.",
      },
    ],
  },
  output: {
    statuses: [
      {
        muscleId: "biceps_long_head",
        actualStatus: "balanced",
        expectedStatus: "under",
        notes: "Coach currently treats long head as covered enough.",
      },
      {
        muscleId: "biceps_short_head",
        actualStatus: "balanced",
        expectedStatus: "under",
        notes: "Coach currently treats short head as covered enough.",
      },
    ],
    priorities: [],
    recommendations: [
      {
        muscleId: "biceps_long_head",
        actualDirection: "maintain",
        expectedDirection: "increase",
        actualSetAdjustment: 0,
        expectedSetAdjustment: 1,
        notes: "No increase recommendation appears even though direct biceps work is absent.",
      },
      {
        muscleId: "biceps_short_head",
        actualDirection: "maintain",
        expectedDirection: "increase",
        actualSetAdjustment: 0,
        expectedSetAdjustment: 1,
        notes: "Diagnosis intent is the same: false balanced from indirect carryover.",
      },
    ],
    notes: "The key issue is maintain/covered output for biceps without direct curl exposure.",
  },
  analysis: {
    errorTypes: ["false_balanced"],
    suspectedRootCauses: ["indirect_overestimation"],
    summary:
      "Biceps appear balanced because pulling carryover is likely being treated as strong enough to substitute for direct arm work.",
    notes:
      "This case helps diagnose whether secondary elbow-flexor stimulus is being credited too generously when direct hypertrophy intent is low or absent.",
  },
};

export const priorityMisrankingDiagnosisCaseV2: CoachDiagnosisCaseV2 = {
  id: "priority_misranking_case_001",
  scenario: {
    type: "under",
    timeWindow: "weekly",
    description:
      "Two under-target muscles are present, but the coach ranks a mild chest deficit ahead of a clearly larger lower-lat deficit.",
  },
  input: {
    sessions: [
      {
        id: "diagnosis_priority_misranking_week_s1",
        date: "2026-03-12",
        title: "Upper Mixed",
        exercises: [
          {
            id: "diagnosis_priority_misranking_week_s1_block_1",
            order: 0,
            exercise: { id: "incline_dumbbell_press", name: "Incline Dumbbell Press", muscleGroup: "chest" },
            sets: [
              { id: "diagnosis_priority_misranking_s1_b1_1", kind: "work", reps: 10, weightKg: 32, rir: 2 },
              { id: "diagnosis_priority_misranking_s1_b1_2", kind: "work", reps: 9, weightKg: 32, rir: 1 },
            ],
          },
          {
            id: "diagnosis_priority_misranking_week_s1_block_2",
            order: 1,
            exercise: { id: "seated_cable_row", name: "Seated Cable Row", muscleGroup: "back" },
            sets: [
              { id: "diagnosis_priority_misranking_s1_b2_1", kind: "work", reps: 10, weightKg: 62, rir: 2 },
              { id: "diagnosis_priority_misranking_s1_b2_2", kind: "work", reps: 10, weightKg: 62, rir: 2 },
            ],
          },
        ],
      },
    ],
    focusMuscleIds: ["upper_chest", "lower_lats"],
    notes: "Upper chest is only mildly under, while lower lats are materially more under-covered.",
  },
  stimulus: {
    byMuscle: [
      {
        muscleId: "upper_chest",
        totalStimulus: 1480,
        primaryStimulus: 1480,
        secondaryStimulus: 0,
        notes: "Upper chest is somewhat under target but still receives meaningful direct work.",
      },
      {
        muscleId: "lower_lats",
        totalStimulus: 620,
        primaryStimulus: 620,
        secondaryStimulus: 0,
        notes: "Lower-lat stimulus is clearly lagging relative to its target band.",
      },
    ],
  },
  targets: {
    byMuscle: [
      {
        muscleId: "upper_chest",
        targetMin: 1650,
        targetMax: 1950,
      },
      {
        muscleId: "lower_lats",
        targetMin: 1450,
        targetMax: 1800,
      },
    ],
  },
  output: {
    statuses: [
      {
        muscleId: "upper_chest",
        actualStatus: "under",
        expectedStatus: "under",
      },
      {
        muscleId: "lower_lats",
        actualStatus: "under",
        expectedStatus: "under",
      },
    ],
    priorities: [
      {
        muscleId: "upper_chest",
        actualRank: 1,
        expectedRank: 2,
        notes: "Chest is ranked too high relative to the larger lower-lat deficit.",
      },
      {
        muscleId: "lower_lats",
        actualRank: 2,
        expectedRank: 1,
        notes: "Lower lats should be the stronger priority in this case.",
      },
    ],
    recommendations: [
      {
        muscleId: "upper_chest",
        actualDirection: "increase",
        expectedDirection: "increase",
        actualSetAdjustment: 1,
        expectedSetAdjustment: 1,
      },
      {
        muscleId: "lower_lats",
        actualDirection: "increase",
        expectedDirection: "increase",
        actualSetAdjustment: 2,
        expectedSetAdjustment: 2,
      },
    ],
    notes: "The diagnosis problem is the ranking, not the direction.",
  },
  analysis: {
    errorTypes: ["priority_misranking"],
    suspectedRootCauses: ["priority_scoring_issue"],
    summary:
      "The coach appears to rank a milder chest deficit above a more severe lower-lat deficit, suggesting that priority scoring is not reflecting actual diagnosis severity cleanly.",
    notes:
      "This case is useful for isolating ranking logic separately from status and direction correctness.",
  },
};

export const mildOverreactionDecreaseDiagnosisCaseV2: CoachDiagnosisCaseV2 = {
  id: "mild_overreaction_decrease_case_001",
  scenario: {
    type: "over",
    timeWindow: "weekly",
    description:
      "A muscle sits only slightly above its target band, but the coach still reacts with a decrease recommendation that looks too aggressive for the size of the deviation.",
  },
  input: {
    sessions: [
      {
        id: "diagnosis_mild_overreaction_week_s1",
        date: "2026-03-13",
        title: "Shoulders",
        exercises: [
          {
            id: "diagnosis_mild_overreaction_week_s1_block_1",
            order: 0,
            exercise: {
              id: "machine_lateral_raise",
              name: "Machine Lateral Raise",
              muscleGroup: "shoulders",
            },
            sets: [
              { id: "diagnosis_mild_overreaction_s1_b1_1", kind: "work", reps: 14, weightKg: 45, rir: 2 },
              { id: "diagnosis_mild_overreaction_s1_b1_2", kind: "work", reps: 14, weightKg: 45, rir: 2 },
              { id: "diagnosis_mild_overreaction_s1_b1_3", kind: "work", reps: 13, weightKg: 45, rir: 1 },
            ],
          },
        ],
      },
    ],
    focusMuscleIds: ["deltoid_lateral"],
    notes: "Case targets small overage rather than a genuinely overcooked weekly shoulder block.",
  },
  stimulus: {
    byMuscle: [
      {
        muscleId: "deltoid_lateral",
        totalStimulus: 1465,
        primaryStimulus: 1465,
        secondaryStimulus: 0,
        notes: "Observed lateral-delt stimulus is only modestly above the target ceiling.",
      },
    ],
  },
  targets: {
    byMuscle: [
      {
        muscleId: "deltoid_lateral",
        targetMin: 1150,
        targetMax: 1400,
        notes: "The case is intentionally close to the high boundary.",
      },
    ],
  },
  output: {
    statuses: [
      {
        muscleId: "deltoid_lateral",
        actualStatus: "over",
        expectedStatus: "over",
        notes: "Status itself may be defensible; the issue is the response intensity.",
      },
    ],
    priorities: [
      {
        muscleId: "deltoid_lateral",
        actualRank: 1,
      },
    ],
    recommendations: [
      {
        muscleId: "deltoid_lateral",
        actualDirection: "decrease",
        expectedDirection: "maintain",
        actualSetAdjustment: -2,
        expectedSetAdjustment: 0,
        notes: "A small overage may not justify an actionable reduction here.",
      },
    ],
    notes: "This is an overreaction diagnosis case, not necessarily a status-classification case.",
  },
  analysis: {
    errorTypes: ["over_aggressive_adjustment"],
    suspectedRootCauses: ["recommendation_threshold_issue", "set_adjustment_scaling_issue"],
    summary:
      "The coach reacts too strongly to a mild over-target situation, converting a small excess into a meaningful decrease recommendation.",
    notes:
      "This case helps separate status detection from the aggressiveness of the downstream recommendation layer.",
  },
};

export const weeklySessionMismatchDiagnosisCaseV2: CoachDiagnosisCaseV2 = {
  id: "weekly_session_mismatch_case_001",
  scenario: {
    type: "mixed",
    timeWindow: "weekly",
    description:
      "One session creates a strongly actionable glute-max signal, but the broader weekly context is more moderate and should likely produce a calmer interpretation.",
  },
  input: {
    sessions: [
      {
        id: "diagnosis_weekly_session_mismatch_s1",
        date: "2026-03-09",
        title: "Lower A",
        exercises: [
          {
            id: "diagnosis_weekly_session_mismatch_s1_block_1",
            order: 0,
            exercise: { id: "barbell_hip_thrust", name: "Barbell Hip Thrust", muscleGroup: "glutes" },
            sets: [
              { id: "diagnosis_wsm_s1_b1_1", kind: "work", reps: 8, weightKg: 140, rir: 1 },
              { id: "diagnosis_wsm_s1_b1_2", kind: "work", reps: 8, weightKg: 140, rir: 1 },
              { id: "diagnosis_wsm_s1_b1_3", kind: "work", reps: 8, weightKg: 140, rir: 1 },
            ],
          },
        ],
      },
      {
        id: "diagnosis_weekly_session_mismatch_s2",
        date: "2026-03-12",
        title: "Upper",
        exercises: [
          {
            id: "diagnosis_weekly_session_mismatch_s2_block_1",
            order: 0,
            exercise: { id: "flat_barbell_bench_press", name: "Flat Barbell Bench Press", muscleGroup: "chest" },
            sets: [
              { id: "diagnosis_wsm_s2_b1_1", kind: "work", reps: 8, weightKg: 92, rir: 2 },
              { id: "diagnosis_wsm_s2_b1_2", kind: "work", reps: 8, weightKg: 92, rir: 2 },
            ],
          },
        ],
      },
      {
        id: "diagnosis_weekly_session_mismatch_s3",
        date: "2026-03-15",
        title: "Lower B",
        exercises: [
          {
            id: "diagnosis_weekly_session_mismatch_s3_block_1",
            order: 0,
            exercise: { id: "romanian_deadlift", name: "Romanian Deadlift", muscleGroup: "hamstrings" },
            sets: [
              { id: "diagnosis_wsm_s3_b1_1", kind: "work", reps: 8, weightKg: 110, rir: 2 },
              { id: "diagnosis_wsm_s3_b1_2", kind: "work", reps: 8, weightKg: 110, rir: 2 },
            ],
          },
        ],
      },
    ],
    focusMuscleIds: ["gluteus_maximus"],
    notes:
      "A single glute-heavy session looks sharp in isolation, but weekly context includes only one direct glute-max dominant day and one secondary hinge exposure.",
  },
  stimulus: {
    byMuscle: [
      {
        muscleId: "gluteus_maximus",
        totalStimulus: 1780,
        primaryStimulus: 1420,
        secondaryStimulus: 360,
        notes: "The weekly total is substantial, but not obviously extreme once spread across the week.",
      },
    ],
    notes: "This case is about mismatch between session-level sharpness and weekly-level interpretation calmness.",
  },
  targets: {
    byMuscle: [
      {
        muscleId: "gluteus_maximus",
        targetMin: 1600,
        targetMax: 2050,
        notes: "Weekly band is deliberately broad enough that weekly interpretation should be calmer than a single-session read.",
      },
    ],
  },
  output: {
    statuses: [
      {
        muscleId: "gluteus_maximus",
        actualStatus: "over",
        expectedStatus: "balanced",
        notes: "Weekly diagnosis should likely calm down relative to the standout single session.",
      },
    ],
    priorities: [
      {
        muscleId: "gluteus_maximus",
        actualRank: 1,
        expectedRank: undefined,
        notes: "Priority is driven by a single-session spike more than the weekly context should allow.",
      },
    ],
    recommendations: [
      {
        muscleId: "gluteus_maximus",
        actualDirection: "decrease",
        expectedDirection: "maintain",
        actualSetAdjustment: -1,
        expectedSetAdjustment: 0,
        notes: "The weekly recommendation appears too reactive given the broader weekly pattern.",
      },
    ],
    notes: "The mismatch here is between how a session reads and how the week should likely be interpreted.",
  },
  analysis: {
    errorTypes: ["weekly_session_mismatch"],
    suspectedRootCauses: ["insufficient_context_in_output", "target_scaling_issue"],
    summary:
      "A single standout session seems to dominate the weekly interpretation, producing a stronger weekly action signal than the broader weekly context justifies.",
    notes:
      "This case is a good early diagnosis check for whether weekly outputs feel meaningfully different from session spikes.",
  },
};

export const coachDiagnosisStarterPackV2: CoachDiagnosisCaseV2[] = [
  serratusFalseReduceDiagnosisCaseV2,
  bicepsFalseBalancedDiagnosisCaseV2,
  priorityMisrankingDiagnosisCaseV2,
  mildOverreactionDecreaseDiagnosisCaseV2,
  weeklySessionMismatchDiagnosisCaseV2,
];
