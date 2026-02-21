import { useEffect, useMemo, useState } from "react";
import { LS_KEYS } from "../constants";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useT } from "../hooks/useT";
import { backupToCloud, getCloudSummary, restoreFromCloud } from "../lib/cloudVault";
import { supabase } from "../lib/supabaseClient";

function fmtDateTime(iso: string | null, fallback: string) {
  if (!iso) return fallback;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return fallback;
  }
}

function toErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    return typeof msg === "string" && msg.trim() ? msg : "unknown";
  }
  return "unknown";
}

function isRateLimited(err: unknown) {
  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status?: unknown }).status
      : undefined;
  const message = toErrorMessage(err).toLowerCase();
  return status === 429 || message.includes("rate");
}

export default function AccountSection() {
  const t = useT();
  const { user, loading, error } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [vaultBusy, setVaultBusy] = useState<null | "backup" | "restore">(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : false
  );
  const [cloudCounts, setCloudCounts] = useState<{ sessionsCount: number; templatesCount: number } | null>(null);
  const [latestUpdatedAt, setLatestUpdatedAt] = useState<string | undefined>(undefined);

  const lastBackupAt =
    typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEYS.cloudLastBackupAt) : null;
  const lastRestoreAt =
    typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEYS.cloudLastRestoreAt) : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function refreshSummary() {
    if (!user?.id || !supabase || !isOnline) {
      setCloudCounts(null);
      setLatestUpdatedAt(undefined);
      return;
    }

    const summary = await getCloudSummary(user.id);
    if (!summary) {
      setStatus(t("settings.account.vaultError"));
      setCloudCounts(null);
      setLatestUpdatedAt(undefined);
      return;
    }
    setCloudCounts({
      sessionsCount: summary.sessionsCount,
      templatesCount: summary.templatesCount,
    });
    setLatestUpdatedAt(summary.latestUpdatedAt);
  }

  useEffect(() => {
    void refreshSummary();
  }, [user?.id, isOnline]);

  async function sendLink() {
    if (!email.includes("@")) {
      setStatus(t("settings.account.invalidEmail"));
      return;
    }

    if (!supabase) {
      setStatus(t("settings.account.notConfigured"));
      return;
    }

    setAuthBusy(true);
    setStatus("");
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (signInError) {
        const msg = toErrorMessage(signInError);
        if (isRateLimited(signInError)) {
          setStatus(`${t("settings.account.rateLimited")}: ${msg}`);
        } else {
          setStatus(`${t("settings.account.error")}: ${msg}`);
        }
      } else {
        setStatus(t("settings.account.sent"));
      }
    } catch (err) {
      if (isRateLimited(err)) {
        setStatus(`${t("settings.account.rateLimited")}: ${toErrorMessage(err)}`);
      } else {
        setStatus(`${t("settings.account.error")}: ${toErrorMessage(err)}`);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setAuthBusy(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      setStatus(signOutError ? t("settings.account.error") : "");
    } catch {
      setStatus(t("settings.account.error"));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleBackup() {
    if (!user?.id) return;
    if (!isOnline) {
      setStatus(t("settings.account.noNetwork"));
      return;
    }
    setVaultBusy("backup");
    setStatus(t("settings.account.backupInProgress"));
    const res = await backupToCloud(user.id);
    if (!res.ok) {
      setStatus(res.message || t("settings.account.vaultError"));
      setVaultBusy(null);
      return;
    }
    setStatus(t("settings.account.backupDone"));
    setVaultBusy(null);
    await refreshSummary();
  }

  async function handleRestore() {
    if (!user?.id) return;
    if (!isOnline) {
      setStatus(t("settings.account.noNetwork"));
      return;
    }
    const ok = window.confirm(t("settings.account.restoreConfirm"));
    if (!ok) return;

    setVaultBusy("restore");
    setStatus(t("settings.account.restoreInProgress"));
    const res = await restoreFromCloud(user.id);
    if (!res.ok) {
      setStatus(res.message || t("settings.account.vaultError"));
      setVaultBusy(null);
      return;
    }
    setStatus(t("settings.account.restoreDone"));
    setVaultBusy(null);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  const canRunVaultActions = !!user?.id && !!supabase && isOnline && vaultBusy === null;
  const linkedGlow: React.CSSProperties = user
    ? {
        boxShadow:
          "inset 0 0 0 1px rgba(255,59,59,0.18), 0 10px 28px rgba(255,59,59,0.08)",
      }
    : {};
  const cloudCountsText = useMemo(() => {
    if (!cloudCounts) return "-";
    return `${cloudCounts.sessionsCount} / ${cloudCounts.templatesCount}`;
  }, [cloudCounts]);

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
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.4 }}>{t("settings.account.vaultError")}</p>
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
            disabled={authBusy || !email.trim()}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,59,59,0.35)",
              background: "rgba(255,59,59,0.1)",
              color: "rgb(246,198,198)",
              cursor: authBusy || !email.trim() ? "not-allowed" : "pointer",
              fontWeight: 900,
              opacity: authBusy || !email.trim() ? 0.55 : 1,
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
            disabled={authBusy || vaultBusy !== null}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,59,59,0.65)",
              background: "rgba(255,59,59,0.12)",
              color: "rgb(255,201,201)",
              cursor: authBusy || vaultBusy !== null ? "not-allowed" : "pointer",
              fontWeight: 900,
              opacity: authBusy || vaultBusy !== null ? 0.55 : 1,
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
            {!isOnline ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {t("settings.account.noNetwork")}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
              <div style={{ color: "var(--muted)" }}>
                {t("settings.account.lastBackup")}: {fmtDateTime(lastBackupAt, "-")}
              </div>
              <div style={{ color: "var(--muted)" }}>
                {t("settings.account.lastRestore")}: {fmtDateTime(lastRestoreAt, "-")}
              </div>
              <div style={{ color: "var(--muted)" }}>
                {t("settings.account.cloudCounts")}: {cloudCountsText}
                {latestUpdatedAt ? ` (${fmtDateTime(latestUpdatedAt, "-")})` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleBackup()}
                disabled={!canRunVaultActions}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,59,59,0.35)",
                  background: "rgba(255,59,59,0.1)",
                  color: "rgb(246,198,198)",
                  cursor: canRunVaultActions ? "pointer" : "not-allowed",
                  fontWeight: 900,
                  opacity: canRunVaultActions ? 1 : 0.55,
                }}
              >
                {vaultBusy === "backup" ? t("settings.account.backupInProgress") : t("settings.account.backupNow")}
              </button>
              <button
                type="button"
                onClick={() => void handleRestore()}
                disabled={!canRunVaultActions}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,59,59,0.65)",
                  background: "rgba(255,59,59,0.12)",
                  color: "rgb(255,201,201)",
                  cursor: canRunVaultActions ? "pointer" : "not-allowed",
                  fontWeight: 900,
                  opacity: canRunVaultActions ? 1 : 0.55,
                }}
              >
                {vaultBusy === "restore" ? t("settings.account.restoreInProgress") : t("settings.account.restore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {status ? <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.35 }}>{status}</p> : null}
    </div>
  );
}
