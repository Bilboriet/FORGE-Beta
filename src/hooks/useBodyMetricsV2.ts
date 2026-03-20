import { LS_KEYS } from "../constants";
import type { UserBodyMetricsV2 } from "../types";
import { useLocalStorage } from "./useLocalStorage";

function createDefaultBodyMetricsV2(): UserBodyMetricsV2 {
  return {
    bodyweightKg: null,
    heightCm: null,
    updatedAt: new Date().toISOString(),
    source: "manual",
  };
}

export function useBodyMetricsV2() {
  return useLocalStorage<UserBodyMetricsV2>(
    LS_KEYS.body_metrics_v2,
    createDefaultBodyMetricsV2()
  );
}
