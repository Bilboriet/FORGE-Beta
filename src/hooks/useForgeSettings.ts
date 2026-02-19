import { useLocalStorage } from "./useLocalStorage";
import type { UnitSystem } from "../units";

export type ForgeSettingsV1 = {
  units: UnitSystem;
  language: "no" | "en" | "es";
  updatedAt?: string;
};

export const LS_SETTINGS = "forge:settings_v1";

export function useForgeSettings() {
  return useLocalStorage<ForgeSettingsV1>(LS_SETTINGS, {
    units: "kg",
    language: "no",
    updatedAt: new Date().toISOString(),
  });
}
