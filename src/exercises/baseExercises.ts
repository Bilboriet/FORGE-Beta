// src/exercises/baseExercises.ts
// Base movement concepts (used for grouping and future analytics/AI).

import type { BaseExercise } from "./types";

export const BASE_EXERCISES: BaseExercise[] = [
  // PUSH - Chest
  { id: "bench_press", name: "Bench Press", muscleGroup: "chest", category: "push" },
  { id: "incline_press", name: "Incline Press", muscleGroup: "chest", category: "push" },
  { id: "decline_press", name: "Decline Press", muscleGroup: "chest", category: "push" },
  { id: "flat_fly", name: "Flat Fly", muscleGroup: "chest", category: "push" },
  { id: "incline_fly", name: "Incline Fly", muscleGroup: "chest", category: "push" },
  { id: "decline_fly", name: "Decline Fly", muscleGroup: "chest", category: "push" },
  { id: "chest_dips", name: "Chest Dips", muscleGroup: "chest", category: "push" },
  { id: "push_ups", name: "Push-ups", muscleGroup: "chest", category: "push" },
  { id: "pullover", name: "Pullover", muscleGroup: "chest", category: "push" },

  // PUSH - Shoulders
  { id: "overhead_press", name: "Overhead Press", muscleGroup: "shoulders", category: "push" },
  { id: "landmine_press", name: "Landmine Press", muscleGroup: "shoulders", category: "push" },
  { id: "lateral_raise", name: "Lateral Raise", muscleGroup: "shoulders", category: "push" },
  { id: "front_raise", name: "Front Raise", muscleGroup: "shoulders", category: "push" },

  // PUSH - Triceps
  { id: "close_grip_press", name: "Close-Grip Press", muscleGroup: "triceps", category: "push" },
  { id: "pushdown", name: "Pushdown", muscleGroup: "triceps", category: "push" },
  { id: "overhead_extension", name: "Overhead Extension", muscleGroup: "triceps", category: "push" },
  { id: "lying_extension", name: "Lying Extension", muscleGroup: "triceps", category: "push" },
  { id: "kickback", name: "Kickback", muscleGroup: "triceps", category: "push" },

  // PULL - Shoulders
  { id: "rear_delt_fly", name: "Rear Delt Fly", muscleGroup: "shoulders", category: "pull" },
  { id: "face_pull", name: "Face Pull", muscleGroup: "shoulders", category: "pull" },

  // PULL - Back
  { id: "pull_ups", name: "Pull-ups", muscleGroup: "back", category: "pull" },
  { id: "lat_pulldown", name: "Lat Pulldown", muscleGroup: "back", category: "pull" },
  { id: "straight_arm_pulldown", name: "Straight-Arm Pulldown", muscleGroup: "back", category: "pull" },
  { id: "seated_row", name: "Seated Row", muscleGroup: "back", category: "pull" },
  { id: "chest_supported_row", name: "Chest Supported Row", muscleGroup: "back", category: "pull" },
  { id: "bent_over_row", name: "Bent Over Row", muscleGroup: "back", category: "pull" },
  { id: "t_bar_row", name: "T-Bar Row", muscleGroup: "back", category: "pull" },
  { id: "deadlift", name: "Deadlift", muscleGroup: "back", category: "pull" },
  { id: "romanian_deadlift", name: "Romanian Deadlift", muscleGroup: "back", category: "pull" },
  { id: "back_extension", name: "Back Extension", muscleGroup: "back", category: "pull" },

  // PULL - Biceps
  { id: "standing_curl", name: "Standing Curl", muscleGroup: "biceps", category: "pull" },
  { id: "seated_curl", name: "Seated Curl", muscleGroup: "biceps", category: "pull" },
  { id: "incline_curl", name: "Incline Curl", muscleGroup: "biceps", category: "pull" },
  { id: "preacher_curl", name: "Preacher Curl", muscleGroup: "biceps", category: "pull" },
  { id: "concentration_curl", name: "Concentration Curl", muscleGroup: "biceps", category: "pull" },
  { id: "bayesian_curl", name: "Bayesian Curl", muscleGroup: "biceps", category: "pull" },

  // PULL - Forearms
  { id: "wrist_curl", name: "Wrist Curl", muscleGroup: "forearms", category: "pull" },
  { id: "reverse_wrist_curl", name: "Reverse Wrist Curl", muscleGroup: "forearms", category: "pull" },
  { id: "grip_holds", name: "Grip Holds", muscleGroup: "forearms", category: "pull" },
  { id: "carries", name: "Carries", muscleGroup: "forearms", category: "pull" },
  { id: "rotation", name: "Rotation", muscleGroup: "forearms", category: "pull" },

  // LEGS - Quads
  { id: "squat", name: "Squat", muscleGroup: "quads", category: "legs" },
  { id: "leg_press", name: "Leg Press", muscleGroup: "quads", category: "legs" },
  { id: "hack_squat", name: "Hack Squat", muscleGroup: "quads", category: "legs" },
  { id: "lunge_split_squat", name: "Lunge / Split Squat", muscleGroup: "quads", category: "legs" },
  { id: "leg_extension", name: "Leg Extension", muscleGroup: "quads", category: "legs" },
  { id: "pendulum_squat", name: "Pendulum Squat", muscleGroup: "quads", category: "legs" },
  { id: "belt_squat", name: "Belt Squat", muscleGroup: "quads", category: "legs" },

  // LEGS - Hamstrings
  { id: "stiff_leg_deadlift", name: "Stiff-Leg Deadlift", muscleGroup: "hamstrings", category: "legs" },
  { id: "good_morning", name: "Good Morning", muscleGroup: "hamstrings", category: "legs" },
  { id: "leg_curl", name: "Leg Curl", muscleGroup: "hamstrings", category: "legs" },
  { id: "nordic_curl", name: "Nordic Curl", muscleGroup: "hamstrings", category: "legs" },
  { id: "glute_ham_raise", name: "Glute Ham Raise", muscleGroup: "hamstrings", category: "legs" },

  // LEGS - Glutes
  { id: "hip_thrust", name: "Hip Thrust", muscleGroup: "glutes", category: "legs" },
  { id: "glute_bridge", name: "Glute Bridge", muscleGroup: "glutes", category: "legs" },
  { id: "glute_kickback", name: "Glute Kickback", muscleGroup: "glutes", category: "legs" },
  { id: "hip_abduction", name: "Hip Abduction", muscleGroup: "glutes", category: "legs" },
  { id: "cable_pull_through", name: "Cable Pull-through", muscleGroup: "glutes", category: "legs" },

  // LEGS - Calves
  { id: "standing_calf_raise", name: "Standing Calf Raise", muscleGroup: "calves", category: "legs" },
  { id: "seated_calf_raise", name: "Seated Calf Raise", muscleGroup: "calves", category: "legs" },
  { id: "leg_press_calf_raise", name: "Leg Press Calf Raise", muscleGroup: "calves", category: "legs" },
  { id: "tibialis_raise", name: "Tibialis Raise", muscleGroup: "calves", category: "legs" },

  // CORE
  { id: "crunch", name: "Crunch", muscleGroup: "abs", category: "core" },
  { id: "leg_raise", name: "Leg Raise", muscleGroup: "abs", category: "core" },
  { id: "plank", name: "Plank", muscleGroup: "abs", category: "core" },
  { id: "core_rotation", name: "Rotation", muscleGroup: "abs", category: "core" },
  { id: "anti_rotation", name: "Anti-Rotation", muscleGroup: "abs", category: "core" },

  // NECK
  { id: "neck_flexion", name: "Neck Flexion", muscleGroup: "other", category: "neck" },
  { id: "neck_extension", name: "Neck Extension", muscleGroup: "other", category: "neck" },
  { id: "lateral_neck_flexion", name: "Lateral Neck Flexion", muscleGroup: "other", category: "neck" },
  { id: "neck_bridge", name: "Neck Bridge", muscleGroup: "other", category: "neck" },
];
