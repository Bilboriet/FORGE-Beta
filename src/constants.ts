// src/constants.ts
export const LS_KEYS = {
  sessions: "forge_sessions_v1",
  body_metrics_v2: "forge:body_metrics_v2",
  exercisePrefs: "forge:exercisePrefs",
  nutrition_v1: "forge:nutrition_v1",
  diet_targets_v1: "forge:diet_targets_v1",
  meals_v1: "forge:meals_v1",
  sleep_v1: "forge:sleep_v1",
  templates: "forge_templates_v1",
  cloudLastBackupAt: "forge:cloud_last_backup_at_v1",
  cloudLastRestoreAt: "forge:cloud_last_restore_at_v1",

  // UI state
  active_tab_v1: "forge:active_tab_v1",
  log_draft_v1: "forge:log_draft_v1",

  // Layouts (V1 – personal dashboard per page)
  dashboard_layout_v1: "forge:dashboard_layout_v1",
  log_layout_v1: "forge:log_layout_v1",
  history_layout_v1: "forge:history_layout_v1",
  analytics_layout_v1: "forge:analytics_layout_v1",
  diet_layout_v1: "forge:diet_layout_v1",
  settings_layout_v1: "forge:settings_layout_v1",
} as const;

export const LIMITS = {
  recents: 8,
} as const;
