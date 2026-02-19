// src/hooks/useT.ts
import { useMemo } from "react";
import { t, type Lang } from "../i18n";
import { useForgeSettings } from "./useForgeSettings";

export function useT() {
  const [settings] = useForgeSettings();
  const lang = (settings?.language ?? "no") as Lang;

  return useMemo(() => {
    return (key: string, vars?: Record<string, any>) => t(lang, key, vars);
  }, [lang]);
}
