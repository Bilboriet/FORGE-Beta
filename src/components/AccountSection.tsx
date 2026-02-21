import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useT } from "../hooks/useT";

export default function AccountSection() {
  const t = useT();
  const { user, loading, error } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const linkedGlow: React.CSSProperties = user
    ? {
        boxShadow:
          "inset 0 0 0 1px rgba(255,59,59,0.18), 0 10px 28px rgba(255,59,59,0.08)",
      }
    : {};

  if (!supabase) {
    return (
      <div className="forge-surface forgeCardInner" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontWeight: 950, letterSpacing: 0.2 }}>{t("settings.account.title")}</h3>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.4 }}>{t("settings.account.notConfigured")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forge-surface forgeCardInner" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontWeight: 950, letterSpacing: 0.2 }}>{t("settings.account.title")}</h3>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.4 }}>{t("settings.account.error")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="forge-surface forgeCardInner" style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontWeight: 950, letterSpacing: 0.2 }}>{t("settings.account.title")}</h3>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.4 }}>{t("settings.account.loading")}</p>
      </div>
    );
  }

  async function sendLink() {
    if (!email.includes("@")) {
      setStatus(t("settings.account.invalidEmail"));
      return;
    }
    setStatus("");
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      setStatus(signInError ? t("settings.account.error") : t("settings.account.sent"));
    } catch {
      setStatus(t("settings.account.error"));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setStatus(t("settings.account.error"));
      else setStatus("");
    } catch {
      setStatus(t("settings.account.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="forge-surface forgeCardInner"
      style={{
        display: "grid",
        gap: 12,
        ...linkedGlow,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <h3 style={{ margin: 0, fontWeight: 950, letterSpacing: 0.2 }}>{t("settings.account.title")}</h3>
        {!user ? (
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.4 }}>{t("settings.account.subtitle")}</p>
        ) : null}
      </div>

      {!user && (
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
            {t("settings.account.emailLabel").toUpperCase()}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("settings.account.emailPlaceholder")}
            autoComplete="email"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.25)",
              color: "var(--text)",
              fontWeight: 700,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => void sendLink()}
            disabled={busy || !email.trim()}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,59,59,0.35)",
              background: "rgba(255,59,59,0.1)",
              color: "rgb(246,198,198)",
              cursor: busy || !email.trim() ? "not-allowed" : "pointer",
              fontWeight: 900,
              opacity: busy || !email.trim() ? 0.55 : 1,
            }}
          >
            {t("settings.account.sendLink")}
          </button>
          <small style={{ color: "var(--muted)", lineHeight: 1.3 }}>
            {t("settings.account.magicLinkHint")}
          </small>
        </div>
      )}

      {user && (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0, color: "var(--text)" }}>
            {t("settings.account.linkedAs")} {user.email}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,59,59,0.65)",
              background: "rgba(255,59,59,0.12)",
              color: "rgb(255,201,201)",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 900,
              opacity: busy ? 0.55 : 1,
            }}
          >
            {t("settings.account.signOut")}
          </button>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: 2,
              paddingTop: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <h4 style={{ margin: 0, color: "var(--text)", fontWeight: 900 }}>
              {t("settings.account.cloudVaultTitle")}
            </h4>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.35 }}>
              {t("settings.account.cloudVaultSubtitle")}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--muted)",
                  cursor: "not-allowed",
                  fontWeight: 900,
                  opacity: 0.6,
                }}
              >
                {t("settings.account.backupNow")}
              </button>
              <button
                type="button"
                disabled
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--muted)",
                  cursor: "not-allowed",
                  fontWeight: 900,
                  opacity: 0.6,
                }}
              >
                {t("settings.account.restore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {status ? <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.35 }}>{status}</p> : null}
    </div>
  );
}
