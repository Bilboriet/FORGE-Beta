import { DEFAULT_THEME, palettes, type ThemeName } from "./palettes";

const LS_THEME_V2 = "forge:theme_v2";

function resolveTheme(name: string | null | undefined): ThemeName {
  if (name === "plasmaRed" || name === "baseNeutral") return name;
  return DEFAULT_THEME;
}

function canUseDOM() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function applyThemeVars(name: ThemeName) {
  if (!canUseDOM()) return;
  const palette = palettes[name];
  const root = document.documentElement;
  root.style.setProperty("--bg", palette.bg);
  root.style.setProperty("--surface", palette.surface);
  root.style.setProperty("--surface2", palette.surface2);
  root.style.setProperty("--text", palette.text);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--mutedText", palette.muted);
  root.style.setProperty("--accentHot", palette.accentHot);
  root.style.setProperty("--accentGlow", palette.accentGlow);
  root.style.setProperty("--accentHot-rgb", palette.accentHotRgb);
  root.style.setProperty("--accentGlow-rgb", palette.accentGlowRgb);
  root.style.setProperty("--strokeSubtle", palette.strokeSubtle);
  root.style.setProperty("--cardShadow", palette.cardShadow);
  root.style.setProperty("--border", palette.strokeSubtle);
  root.style.setProperty("--shadow", palette.cardShadow);
  root.style.setProperty("--accent", palette.accentHot);
  root.style.setProperty("--accent2", palette.accentGlow);
  root.style.setProperty("--accent-rgb", palette.accentHotRgb);
  root.style.setProperty("--accent2-rgb", palette.accentGlowRgb);
  root.style.setProperty("--focusRing", palette.focusRing);
  root.style.setProperty("--forge-red", palette.accentHot);
  root.style.setProperty("--forge-red-top", palette.accentGlow);
  root.style.setProperty("--red", palette.accentHot);
  root.style.setProperty("--redHot", palette.accentHot);
  root.style.setProperty("--redSoft", `rgba(${palette.accentHotRgb}, 0.14)`);
}

export function getTheme(): ThemeName {
  if (!canUseDOM()) return DEFAULT_THEME;
  if (!import.meta.env.DEV) return DEFAULT_THEME;
  return resolveTheme(window.localStorage.getItem(LS_THEME_V2));
}

export function setTheme(name: ThemeName) {
  const next = resolveTheme(name);
  applyThemeVars(next);
  if (!canUseDOM()) return;
  if (import.meta.env.DEV) {
    window.localStorage.setItem(LS_THEME_V2, next);
  }
}

export function initTheme() {
  setTheme(getTheme());
}

export type { ThemeName };
