import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasWindow = typeof window !== "undefined";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function createSafeStorage(): StorageLike {
  const mem = new Map<string, string>();

  if (hasWindow) {
    const ls = window.localStorage;
    return {
      getItem: (k) => {
        try {
          return ls.getItem(k);
        } catch {
          return mem.get(k) ?? null;
        }
      },
      setItem: (k, v) => {
        try {
          ls.setItem(k, v);
        } catch {
          mem.set(k, v);
        }
      },
      removeItem: (k) => {
        try {
          ls.removeItem(k);
        } catch {
          mem.delete(k);
        }
      },
    };
  }

  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}

const authStorage = createSafeStorage();

if (import.meta.env.DEV && hasWindow) {
  const probeKey = "forge:dev:storage_probe";
  let ok = false;
  try {
    authStorage.setItem(probeKey, "ok");
    ok = authStorage.getItem(probeKey) === "ok";
    authStorage.removeItem(probeKey);
  } catch {
    ok = false;
  }
  console.info("[FORGE][AUTH][DEV] localStorage availability", { ok });
}

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: authStorage,
        },
      })
    : null;
