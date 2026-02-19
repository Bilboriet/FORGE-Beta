import { useEffect, useMemo, useRef, useState } from "react";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

// Custom event name so different hook instances can sync in the same tab
const LS_SYNC_EVENT = "forge:localstorage";

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetState<T>] {
  // 1) Les fra localStorage én gang (første render)
  const [value, setValue] = useState<T>(() => {
    const stored = safeParseJSON<T>(localStorage.getItem(key));
    return stored ?? initialValue;
  });

  // Keep a stable stringified snapshot to avoid unnecessary loops
  const lastJsonRef = useRef<string>("");
  const valueJson = useMemo(() => {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }, [value]);

  // 2) Hver gang value endres, skriv til localStorage
  useEffect(() => {
    try {
      // Only write if actually changed (prevents ping-pong updates)
      if (lastJsonRef.current !== valueJson) {
        localStorage.setItem(key, valueJson);
        lastJsonRef.current = valueJson;
        // Notify other hook instances in the same tab
        window.dispatchEvent(new CustomEvent(LS_SYNC_EVENT, { detail: { key } }));
      }
    } catch {
      // Hvis browseren nekter (f.eks. full storage), så krasjer vi ikke
    }
  }, [key, valueJson]);

  // 3) Sync changes coming from other components (same tab) or other tabs
  useEffect(() => {
    const readLatest = () => {
      const raw = localStorage.getItem(key);
      const parsed = safeParseJSON<T>(raw);
      if (parsed == null) return;

      // Compare using JSON to avoid unnecessary state updates
      let nextJson = "";
      try {
        nextJson = JSON.stringify(parsed);
      } catch {
        return;
      }
      if (nextJson === lastJsonRef.current) return;

      lastJsonRef.current = nextJson;
      setValue(parsed);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      readLatest();
    };

    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (!ce.detail || ce.detail.key !== key) return;
      readLatest();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LS_SYNC_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LS_SYNC_EVENT, onCustom as EventListener);
    };
  }, [key]);

  return [value, setValue];
}
