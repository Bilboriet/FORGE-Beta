import { useEffect, useState } from "react";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) return;
        setUser(data.session?.user ?? null);
        setError(Boolean(sessionError));
        if (import.meta.env.DEV) {
          console.info("[FORGE][AUTH][DEV] getSession on boot", {
            hasSession: Boolean(data.session),
            error: sessionError?.message ?? null,
          });
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError(true);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setError(false);
      if (import.meta.env.DEV) {
        console.info("[FORGE][AUTH][DEV] onAuthStateChange", {
          event,
          hasSession: Boolean(session),
        });
        if (event === "TOKEN_REFRESHED") {
          console.info("[FORGE][AUTH][DEV] token refresh fired");
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
