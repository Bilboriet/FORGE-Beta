import { useEffect, useState } from "react";
import { LS_KEYS } from "../constants";
import { useT } from "../hooks/useT";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallbackPage() {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!supabase) {
        setFailed(true);
        setErrorDetail("Supabase not configured");
        return;
      }

      try {
        const href = window.location.href;
        const hasCode = href.includes("code=");
        let handled = false;

        if (hasCode) {
          const res = await supabase.auth.exchangeCodeForSession(href);
          if (res.error) throw res.error;
          handled = true;
        } else {
          const authAny = supabase.auth as any;
          if (typeof authAny.getSessionFromUrl === "function") {
            const res = await authAny.getSessionFromUrl({ storeSession: true });
            if (res?.error) throw res.error;
            handled = true;
          }
        }

        if (!handled) {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) throw error ?? new Error("No session");
        }

        if (cancelled) return;

        history.replaceState({}, document.title, "/");
        localStorage.setItem(LS_KEYS.active_tab_v1, "innstillinger");

        setTimeout(() => {
          window.location.assign("/");
        }, 300);
      } catch (err) {
        if (!cancelled) {
          setFailed(true);
          const detail =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: unknown }).message ?? "unknown")
              : "unknown";
          setErrorDetail(detail);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        className="forge-surface forgeCardInner"
        style={{
          width: "min(560px, 100%)",
          display: "grid",
          gap: 10,
          boxShadow: failed
            ? "inset 0 0 0 1px rgba(255,59,59,0.22)"
            : "inset 0 0 0 1px rgba(255,59,59,0.12)",
        }}
      >
        <h2 style={{ margin: 0, color: "var(--text)", fontWeight: 950 }}>{t("settings.auth.signingIn")}</h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.35 }}>
          {failed ? t("settings.auth.failed") : t("settings.auth.secureConnection")}
        </p>
        {failed && errorDetail ? (
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.3, fontSize: 12 }}>
            {t("settings.auth.detail")}: {errorDetail}
          </p>
        ) : null}

        {failed ? (
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(LS_KEYS.active_tab_v1, "innstillinger");
              window.location.assign("/");
            }}
            style={{
              marginTop: 6,
              justifySelf: "start",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,59,59,0.45)",
              background: "rgba(255,59,59,0.1)",
              color: "rgb(255,201,201)",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            {t("settings.auth.backToSettings")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
