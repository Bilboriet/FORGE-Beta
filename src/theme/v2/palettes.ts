export type ThemeName = "baseNeutral" | "plasmaRed";

export type ThemePalette = {
  name: ThemeName;
  label: string;
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  accentHot: string;
  accentGlow: string;
  accentHotRgb: string;
  accentGlowRgb: string;
  strokeSubtle: string;
  cardShadow: string;
  focusRing: string;
};

export const baseNeutral: ThemePalette = {
  name: "baseNeutral",
  label: "Base Neutral",
  bg: "#0B0C0F",
  surface: "#15161A",
  surface2: "#1C1D22",
  text: "#EDEDED",
  muted: "rgba(237,237,237,0.72)",
  accentHot: "#D94B40",
  accentGlow: "#E48259",
  accentHotRgb: "217, 75, 64",
  accentGlowRgb: "228, 130, 89",
  strokeSubtle: "rgba(255,255,255,0.06)",
  cardShadow: "0 12px 28px rgba(0,0,0,0.52)",
  focusRing: "rgba(217,75,64,0.36)",
};

export const plasmaRed: ThemePalette = {
  name: "plasmaRed",
  label: "Plasma Red",
  bg: "#0B0B0D",
  surface: "#15161A",
  surface2: "#1C1D22",
  text: "#EDEDED",
  muted: "rgba(237,237,237,0.72)",
  accentHot: "#FF2A2A",
  accentGlow: "#FF6A3D",
  accentHotRgb: "255, 42, 42",
  accentGlowRgb: "255, 106, 61",
  strokeSubtle: "rgba(255,255,255,0.06)",
  cardShadow: "0 12px 28px rgba(0,0,0,0.55)",
  focusRing: "rgba(255,42,42,0.45)",
};

export const palettes: Record<ThemeName, ThemePalette> = {
  baseNeutral,
  plasmaRed,
};

export const DEFAULT_THEME: ThemeName = "baseNeutral";
