// src/units.ts
// Canonical storage is KG in V1. UI can display kg or lb.

export type UnitSystem = "kg" | "lb";

const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  const v = Number(kg);
  if (!Number.isFinite(v)) return 0;
  return v / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  const v = Number(lb);
  if (!Number.isFinite(v)) return 0;
  return v * KG_PER_LB;
}

export function unitLabel(units: UnitSystem): string {
  return units === "lb" ? "lb" : "kg";
}

// Display helper: rounds nicely for UI.
export function formatWeightFromKg(weightKg: number, units: UnitSystem, decimals = 1): string {
  const base = units === "lb" ? kgToLb(weightKg) : weightKg;
  const v = Number(base);
  if (!Number.isFinite(v)) return "0";

  const p = Math.max(0, Math.min(3, Math.floor(decimals)));
  const rounded = Math.round(v * Math.pow(10, p)) / Math.pow(10, p);
  const s = rounded.toFixed(p);
  return p > 0 ? s.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1") : String(Math.round(rounded));
}

export function formatLoadCompactFromKg(valueKg: number, units: UnitSystem): string {
  const base = units === "lb" ? kgToLb(valueKg) : valueKg;
  const v = Number(base);
  if (!Number.isFinite(v)) return `—`;

  const u = unitLabel(units);
  if (v >= 100000) return `${Math.round(v / 1000)}k ${u}`;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k ${u}`;
  return `${Math.round(v)} ${u}`;
}

// Parses a user input string (possibly containing comma) into KG.
// Returns null if empty/invalid.
export function parseWeightInputToKg(raw: string, units: UnitSystem): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  return units === "lb" ? lbToKg(n) : n;
}
