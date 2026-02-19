// src/exercises/variants.ts
// Concrete selectable variants.

import type { EquipmentTag, ExerciseVariant } from "./types";
import { BASE_EXERCISES } from "./baseExercises";

function slug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function base(baseId: string) {
  const b = BASE_EXERCISES.find((x) => x.id === baseId);
  if (!b) throw new Error(`Unknown base exercise: ${baseId}`);
  return b;
}

function v(
  baseId: string,
  variantId: string,
  name: string,
  equipment: EquipmentTag | undefined,
  isCore: boolean,
  tags?: string[]
): ExerciseVariant {
  const b = base(baseId);
  return {
    id: variantId,
    baseId,
    name,
    muscleGroup: b.muscleGroup,
    category: b.category,
    equipment,
    isCore,
    tags,
  };
}

function expand(
  baseId: string,
  displayPrefix: string,
  items: Array<{ label: string; equipment?: EquipmentTag; core?: boolean; id?: string; tags?: string[] }>,
  defaultTags?: string[]
) {
  return items.map((it) => {
    const id = it.id ?? `${baseId}_${slug(it.label)}`;
    return v(baseId, id, `${displayPrefix} (${it.label})`, it.equipment, !!it.core, it.tags ?? defaultTags);
  });
}

const RAW_EXERCISE_VARIANTS: ExerciseVariant[] = [
  // Chest
  ...expand("bench_press", "Bench Press", [
    { label: "Barbell", equipment: "barbell", core: true, id: "bench_press" },
    { label: "Dumbbell", equipment: "dumbbell", core: true, id: "dumbbell_bench_press" },
    { label: "Machine", equipment: "machine", core: true, id: "machine_chest_press" },
    { label: "Smith", equipment: "smith", id: "smith_bench_press" },
  ], ["chest", "press"]),
  ...expand("incline_press", "Incline Press", [
    { label: "Barbell", equipment: "barbell", core: true, id: "incline_bench_press" },
    { label: "Dumbbell", equipment: "dumbbell", core: true, id: "incline_dumbbell_press" },
    { label: "Machine", equipment: "machine", id: "incline_machine_press" },
  ], ["chest", "press"]),
  ...expand("flat_fly", "Flat Fly", [
    { label: "Cable", equipment: "cable", core: true, id: "cable_fly" },
    { label: "Dumbbell", equipment: "dumbbell", id: "dumbbell_fly" },
    { label: "Pec Deck", equipment: "machine", core: true, id: "pec_deck" },
  ], ["chest", "fly"]),
  ...expand("chest_dips", "Chest Dips", [
    { label: "Bodyweight", equipment: "bodyweight", id: "chest_dips" },
    { label: "Assisted", equipment: "assisted", id: "assisted_chest_dips" },
    { label: "Weighted", equipment: "weighted", id: "weighted_chest_dips" },
  ], ["chest", "dips"]),
  ...expand("push_ups", "Push-ups", [
    { label: "Standard", equipment: "bodyweight", core: true, id: "push_up" },
    { label: "Weighted", equipment: "weighted", id: "weighted_push_up" },
  ], ["chest", "pushup"]),

  // Shoulders
  ...expand("overhead_press", "Overhead Press", [
    { label: "Barbell", equipment: "barbell", core: true, id: "overhead_press" },
    { label: "Dumbbell", equipment: "dumbbell", core: true, id: "dumbbell_shoulder_press" },
    { label: "Machine", equipment: "machine", core: true, id: "machine_shoulder_press" },
  ], ["shoulders", "press"]),
  ...expand("lateral_raise", "Lateral Raise", [
    { label: "Dumbbell", equipment: "dumbbell", core: true, id: "lateral_raise" },
    { label: "Cable", equipment: "cable", core: true, id: "cable_lateral_raise" },
    { label: "Machine", equipment: "machine", id: "machine_lateral_raise" },
  ], ["shoulders", "raise"]),
  ...expand("rear_delt_fly", "Rear Delt Fly", [
    { label: "Dumbbell", equipment: "dumbbell", core: true, id: "rear_delt_fly_dumbbell" },
    { label: "Cable", equipment: "cable", core: true, id: "rear_delt_fly_cable" },
    { label: "Single Arm Cable", equipment: "cable", id: "rear_delt_fly_single_arm_cable" },
    { label: "Cross-Body Cable", equipment: "cable", id: "rear_delt_fly_cross_body_cable", tags: ["dragover", "cross body", "cross cable", "rear delt cable"] },
    { label: "Machine", equipment: "machine", id: "rear_delt_fly_machine" },
    { label: "Reverse Pec Deck", equipment: "machine", id: "rear_delt_fly_reverse_pec_deck" },
  ], ["rear delt", "shoulders"]),
  ...expand("face_pull", "Face Pull", [
    { label: "Rope", equipment: "cable", core: true, id: "face_pull_rope", tags: ["rear delt", "upper back", "rope"] },
    { label: "Single Arm", equipment: "cable", id: "face_pull_single_arm" },
    { label: "High Pulley", equipment: "cable", id: "face_pull_high_pulley" },
  ], ["rear delt", "upper back"]),

  // Triceps
  ...expand("pushdown", "Pushdown", [
    { label: "Rope", equipment: "cable", core: true, id: "pushdown_rope" },
    { label: "Straight Bar", equipment: "cable", core: true, id: "pushdown_bar" },
    { label: "Reverse Grip", equipment: "cable", id: "reverse_grip_pushdown" },
  ], ["triceps"]),
  ...expand("overhead_extension", "Overhead Extension", [
    { label: "Rope", equipment: "cable", core: true, id: "overhead_triceps_extension" },
    { label: "Dumbbell", equipment: "dumbbell", id: "dumbbell_overhead_extension" },
    { label: "Machine", equipment: "machine", id: "machine_triceps_extension" },
  ], ["triceps"]),

  // Back
  ...expand("pull_ups", "Pull-up", [
    { label: "Standard", equipment: "bodyweight", core: true, id: "pull_up" },
    { label: "Chin-up", equipment: "bodyweight", core: true, id: "chin_up" },
    { label: "Neutral Grip", equipment: "bodyweight", id: "neutral_grip_pull_up" },
    { label: "Assisted", equipment: "assisted", id: "assisted_pull_up" },
    { label: "Weighted", equipment: "weighted", id: "weighted_pull_up" },
  ], ["back", "lats"]),
  ...expand("lat_pulldown", "Lat Pulldown", [
    { label: "Wide Grip", equipment: "cable", core: true, id: "lat_pulldown" },
    { label: "Close Grip", equipment: "cable", id: "close_grip_lat_pulldown" },
    { label: "Single Arm", equipment: "cable", id: "single_arm_lat_pulldown" },
    { label: "Machine", equipment: "machine", id: "machine_lat_pulldown" },
  ], ["back", "lats"]),
  ...expand("seated_row", "Seated Row", [
    { label: "Cable", equipment: "cable", core: true, id: "seated_cable_row" },
    { label: "Machine", equipment: "machine", id: "machine_seated_row" },
  ], ["back", "row"]),
  ...expand("bent_over_row", "Bent Over Row", [
    { label: "Barbell", equipment: "barbell", core: true, id: "barbell_row" },
    { label: "Dumbbell", equipment: "dumbbell", core: true, id: "dumbbell_row" },
    { label: "Landmine", equipment: "landmine", id: "landmine_row" },
  ], ["back", "row"]),
  ...expand("deadlift", "Deadlift", [
    { label: "Conventional", equipment: "barbell", core: true, id: "deadlift" },
    { label: "Sumo", equipment: "barbell", id: "sumo_deadlift" },
    { label: "Trap Bar", equipment: "trap_bar", id: "trap_bar_deadlift" },
    { label: "Rack Pull", equipment: "barbell", id: "rack_pull" },
  ], ["back", "hinge"]),
  ...expand("romanian_deadlift", "Romanian Deadlift", [
    { label: "Barbell", equipment: "barbell", core: true, id: "romanian_deadlift" },
    { label: "Dumbbell", equipment: "dumbbell", id: "dumbbell_rdl" },
    { label: "Single Leg", equipment: "dumbbell", id: "single_leg_rdl" },
  ], ["hamstrings", "hinge"]),

  // Arms
  ...expand("standing_curl", "Standing Curl", [
    { label: "Barbell", equipment: "barbell", core: true, id: "barbell_curl" },
    { label: "EZ-Bar", equipment: "ez_bar", core: true, id: "ez_bar_curl" },
    { label: "Dumbbell", equipment: "dumbbell", core: true, id: "dumbbell_curl" },
    { label: "Hammer", equipment: "dumbbell", core: true, id: "hammer_curl" },
    { label: "Cable", equipment: "cable", id: "cable_curl" },
  ], ["biceps"]),
  ...expand("preacher_curl", "Preacher Curl", [
    { label: "Machine", equipment: "machine", id: "preacher_curl" },
    { label: "EZ-Bar", equipment: "ez_bar", id: "ez_preacher_curl" },
  ], ["biceps"]),
  ...expand("bayesian_curl", "Bayesian Curl", [
    { label: "Single Arm", equipment: "cable", id: "bayesian_curl" },
    { label: "Dual Cable", equipment: "cable", id: "dual_cable_bayesian_curl" },
  ], ["biceps"]),

  // Legs
  ...expand("squat", "Squat", [
    { label: "Back", equipment: "barbell", core: true, id: "squat" },
    { label: "Front", equipment: "barbell", id: "front_squat" },
    { label: "Safety Bar", equipment: "barbell", id: "safety_bar_squat" },
    { label: "Goblet", equipment: "dumbbell", id: "goblet_squat" },
  ], ["quads"]),
  ...expand("leg_press", "Leg Press", [
    { label: "45 Degree", equipment: "machine", core: true, id: "leg_press" },
    { label: "Horizontal", equipment: "machine", id: "horizontal_leg_press" },
    { label: "Single Leg", equipment: "machine", id: "single_leg_leg_press" },
  ], ["quads"]),
  ...expand("hack_squat", "Hack Squat", [
    { label: "Machine", equipment: "machine", id: "hack_squat" },
    { label: "Plate-Loaded", equipment: "plate_loaded", id: "plate_loaded_hack_squat" },
  ], ["quads"]),
  ...expand("lunge_split_squat", "Split Squat", [
    { label: "Bulgarian", equipment: "dumbbell", core: true, id: "bulgarian_split_squat" },
    { label: "Reverse Lunge", equipment: "dumbbell", id: "reverse_lunge" },
    { label: "Walking Lunge", equipment: "dumbbell", id: "walking_lunge" },
  ], ["quads", "glutes"]),
  ...expand("leg_extension", "Leg Extension", [
    { label: "Machine", equipment: "machine", core: true, id: "leg_extension" },
    { label: "Single Leg", equipment: "machine", id: "single_leg_extension" },
  ], ["quads"]),
  ...expand("leg_curl", "Leg Curl", [
    { label: "Seated", equipment: "machine", core: true, id: "seated_leg_curl" },
    { label: "Lying", equipment: "machine", id: "lying_leg_curl" },
    { label: "Single Leg", equipment: "machine", id: "single_leg_leg_curl" },
  ], ["hamstrings"]),
  ...expand("hip_thrust", "Hip Thrust", [
    { label: "Barbell", equipment: "barbell", core: true, id: "hip_thrust" },
    { label: "Machine", equipment: "machine", id: "machine_hip_thrust" },
  ], ["glutes"]),
  ...expand("glute_kickback", "Glute Kickback", [
    { label: "Cable", equipment: "cable", id: "cable_kickback" },
    { label: "Machine", equipment: "machine", id: "machine_glute_kickback" },
  ], ["glutes"]),

  // Core and neck
  ...expand("crunch", "Crunch", [
    { label: "Bodyweight", equipment: "bodyweight", id: "crunch" },
    { label: "Cable", equipment: "cable", id: "cable_crunch" },
  ], ["core"]),
  ...expand("leg_raise", "Leg Raise", [
    { label: "Hanging", equipment: "bodyweight", id: "hanging_leg_raise" },
    { label: "Lying", equipment: "bodyweight", id: "lying_leg_raise" },
  ], ["core"]),
  ...expand("plank", "Plank", [
    { label: "Standard", equipment: "bodyweight", id: "plank" },
    { label: "Side", equipment: "bodyweight", id: "side_plank" },
    { label: "Weighted", equipment: "weighted", id: "weighted_plank" },
  ], ["core"]),
  ...expand("anti_rotation", "Anti-Rotation", [
    { label: "Pallof Press", equipment: "cable", id: "pallof_press" },
  ], ["core"]),
  ...expand("neck_flexion", "Neck Flexion", [
    { label: "Plate", equipment: "weighted", id: "plate_neck_flexion" },
    { label: "Band", equipment: "band", id: "band_neck_flexion" },
  ], ["neck"]),
];

function dedupeById(list: ExerciseVariant[]): ExerciseVariant[] {
  const seen = new Set<string>();
  const out: ExerciseVariant[] = [];
  for (const it of list) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function listDuplicateIds(list: ExerciseVariant[]): string[] {
  const seen = new Set<string>();
  const dupe = new Set<string>();
  for (const item of list) {
    if (seen.has(item.id)) dupe.add(item.id);
    seen.add(item.id);
  }
  return [...dupe].sort();
}

type BaseId = (typeof BASE_EXERCISES)[number]["id"];

const EQUIPMENT_LABELS: Record<EquipmentTag, string> = {
  assisted: "Assisted",
  band: "Band",
  barbell: "Barbell",
  bodyweight: "Bodyweight",
  cable: "Cable",
  converging: "Converging",
  dumbbell: "Dumbbell",
  ez_bar: "EZ-Bar",
  iso_lateral: "Iso-Lateral",
  landmine: "Landmine",
  machine: "Machine",
  other: "Other",
  plate_loaded: "Plate-Loaded",
  smith: "Smith",
  trap_bar: "Trap Bar",
  weighted: "Weighted",
};

const EQUIPMENT_RULES: Partial<Record<BaseId, EquipmentTag[]>> = {
  bench_press: ["barbell", "dumbbell", "machine", "smith"],
  incline_press: ["barbell", "dumbbell", "machine", "smith"],
  decline_press: ["barbell", "dumbbell", "machine"],
  flat_fly: ["dumbbell", "cable", "machine"],
  incline_fly: ["dumbbell", "cable"],
  decline_fly: ["dumbbell", "cable"],
  chest_dips: ["bodyweight", "assisted", "weighted"],
  push_ups: ["bodyweight", "weighted"],
  pullover: ["dumbbell", "cable", "machine"],
  overhead_press: ["barbell", "dumbbell", "machine", "smith"],
  landmine_press: ["landmine"],
  lateral_raise: ["dumbbell", "cable", "machine"],
  front_raise: ["barbell", "dumbbell", "cable"],
  rear_delt_fly: ["dumbbell", "cable", "machine"],
  face_pull: ["cable"],
  close_grip_press: ["barbell", "dumbbell"],
  pushdown: ["cable"],
  overhead_extension: ["cable", "dumbbell", "machine"],
  lying_extension: ["barbell", "ez_bar", "dumbbell", "cable"],
  kickback: ["dumbbell", "cable"],
  pull_ups: ["bodyweight", "assisted", "weighted"],
  lat_pulldown: ["cable", "machine"],
  straight_arm_pulldown: ["cable"],
  seated_row: ["cable", "machine"],
  chest_supported_row: ["machine", "dumbbell", "plate_loaded"],
  bent_over_row: ["barbell", "dumbbell", "landmine", "smith"],
  t_bar_row: ["plate_loaded"],
  deadlift: ["barbell", "trap_bar"],
  romanian_deadlift: ["barbell", "dumbbell", "smith"],
  back_extension: ["bodyweight", "weighted", "machine"],
  standing_curl: ["barbell", "ez_bar", "dumbbell", "cable"],
  seated_curl: ["dumbbell", "cable"],
  incline_curl: ["dumbbell", "cable"],
  preacher_curl: ["machine", "ez_bar", "barbell", "dumbbell"],
  concentration_curl: ["dumbbell", "cable"],
  bayesian_curl: ["cable"],
  wrist_curl: ["barbell", "dumbbell", "cable"],
  reverse_wrist_curl: ["barbell", "dumbbell", "cable"],
  grip_holds: ["bodyweight", "weighted", "dumbbell", "trap_bar"],
  carries: ["dumbbell", "trap_bar"],
  rotation: ["other"],
  squat: ["barbell", "dumbbell", "smith"],
  leg_press: ["machine"],
  hack_squat: ["machine", "plate_loaded"],
  lunge_split_squat: ["dumbbell", "smith"],
  leg_extension: ["machine"],
  pendulum_squat: ["plate_loaded"],
  belt_squat: ["machine"],
  stiff_leg_deadlift: ["barbell", "dumbbell"],
  good_morning: ["barbell"],
  leg_curl: ["machine"],
  nordic_curl: ["bodyweight", "assisted"],
  glute_ham_raise: ["machine", "assisted", "weighted"],
  hip_thrust: ["barbell", "machine", "smith"],
  glute_bridge: ["bodyweight", "barbell", "smith"],
  glute_kickback: ["cable", "machine"],
  hip_abduction: ["machine", "cable"],
  cable_pull_through: ["cable"],
  standing_calf_raise: ["machine", "bodyweight"],
  seated_calf_raise: ["machine"],
  leg_press_calf_raise: ["machine"],
  tibialis_raise: ["machine", "bodyweight", "band"],
  crunch: ["bodyweight", "cable", "machine"],
  leg_raise: ["bodyweight", "machine"],
  plank: ["bodyweight", "weighted"],
  core_rotation: ["weighted", "cable", "machine"],
  anti_rotation: ["cable"],
  neck_flexion: ["weighted", "band", "machine"],
  neck_extension: ["weighted", "band", "machine"],
  lateral_neck_flexion: ["weighted", "band", "machine"],
  neck_bridge: ["bodyweight"],
};

const MODIFIER_RULES: Partial<Record<BaseId, string[]>> = {
  bench_press: ["Paused", "Tempo", "Close Grip"],
  incline_press: ["Paused", "Tempo"],
  overhead_press: ["Paused", "Tempo", "Seated"],
  rear_delt_fly: ["Paused", "Tempo"],
  face_pull: ["Paused", "Tempo"],
  lat_pulldown: ["Wide Grip", "Close Grip", "Single Arm"],
  seated_row: ["Wide Grip", "Close Grip", "Single Arm"],
  deadlift: ["Paused", "Tempo"],
  romanian_deadlift: ["Paused", "Tempo"],
  squat: ["Paused", "Tempo"],
  leg_press: ["Single Leg", "Paused"],
  leg_extension: ["Single Leg", "Paused"],
  leg_curl: ["Single Leg", "Paused"],
  hip_thrust: ["Paused", "Tempo"],
  pushdown: ["Single Arm"],
  bayesian_curl: ["Paused", "Tempo"],
  plank: ["Single Arm"],
};

function generateAutoVariants(existing: Set<string>): ExerciseVariant[] {
  const out: ExerciseVariant[] = [];
  for (const b of BASE_EXERCISES) {
    const allowedEquipment = EQUIPMENT_RULES[b.id] ?? [];
    const allowedModifiers = MODIFIER_RULES[b.id] ?? [];

    for (const equipment of allowedEquipment) {
      const label = EQUIPMENT_LABELS[equipment];
      const id = `${b.id}_auto_${slug(label)}`;
      if (existing.has(id)) continue;
      existing.add(id);
      out.push(v(b.id, id, `${b.name} (${label})`, equipment, false));
    }

    for (const modifier of allowedModifiers) {
      const id = `${b.id}_auto_${slug(modifier)}`;
      if (existing.has(id)) continue;
      existing.add(id);
      out.push(v(b.id, id, `${modifier} ${b.name}`, undefined, false));
    }
  }
  return out;
}

function assertVerifiedLibrary(all: ExerciseVariant[], raw: ExerciseVariant[]) {
  if (!import.meta.env.DEV) return;

  const rawDupes = listDuplicateIds(raw);
  if (rawDupes.length > 0) {
    console.error(`[Forge] Duplicate RAW exercise ids: ${rawDupes.join(", ")}`);
  }

  const coreCounts = new Map<string, number>();
  for (const item of raw) {
    if (!item.isCore) continue;
    coreCounts.set(item.id, (coreCounts.get(item.id) ?? 0) + 1);
  }
  const duplicateCoreIds = [...coreCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id);
  if (duplicateCoreIds.length > 0) {
    console.error(`[Forge] Duplicate core exercise ids: ${duplicateCoreIds.join(", ")}`);
  }

  for (const variant of all) {
    if (!variant.id.startsWith(`${variant.baseId}_auto_`)) continue;

    const suffix = variant.id.slice(`${variant.baseId}_auto_`.length);
    const allowedEquipment = EQUIPMENT_RULES[variant.baseId] ?? [];
    const allowedModifiers = MODIFIER_RULES[variant.baseId] ?? [];
    const equipmentSlugs = new Set(allowedEquipment.map((eq) => slug(EQUIPMENT_LABELS[eq])));
    const modifierSlugs = new Set(allowedModifiers.map((m) => slug(m)));

    const valid =
      variant.equipment != null
        ? allowedEquipment.includes(variant.equipment) && equipmentSlugs.has(suffix)
        : modifierSlugs.has(suffix);

    if (!valid) {
      console.error(
        "[Forge] Invalid exercise variant:",
        variant.id,
        "base:",
        variant.baseId,
        "equipment:",
        variant.equipment
      );
    }
  }
}

const AUTO_EXERCISE_VARIANTS = generateAutoVariants(new Set(RAW_EXERCISE_VARIANTS.map((x) => x.id)));

export const EXERCISE_VARIANTS: ExerciseVariant[] = dedupeById([
  ...RAW_EXERCISE_VARIANTS,
  ...AUTO_EXERCISE_VARIANTS,
]);

assertVerifiedLibrary(EXERCISE_VARIANTS, RAW_EXERCISE_VARIANTS);
