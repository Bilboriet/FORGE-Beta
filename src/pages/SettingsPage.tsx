// src/pages/SettingsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useForgeSettings, LS_SETTINGS } from "../hooks/useForgeSettings";
import { useT } from "../hooks/useT";
import { LS_KEYS } from "../constants";
import { CollapsibleSection } from "../components/ui/CollapsibleSection";
import AccountSection from "../components/AccountSection";
import { ForgeButton } from "../components/ui/ForgeButton";
import { getTheme, setTheme, type ThemeName } from "../theme/v2";


const LS_ANALYTICS_EX = "forge:analytics_exercise_v1";
const LS_ANALYTICS_FATIGUE_SCOPE = "forge:analytics_fatigue_scope_v1";
const LS_FILTER_PRESETS = "exercise_filter_presets_v1";

type ForgeBackupV1 = {
  schema: "forge_backup_v1";
  createdAt: string;
  data: Record<string, unknown>;
};

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="forge-surface forgeCardInner"
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ color: "var(--text)", fontWeight: 950 }}>{title}</div>
        {subtitle ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );

}

function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  title,
}: {
  children: string;
  onClick: () => void;
  variant?: "ghost" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const styleClass =
    variant === "primary"
      ? "forge-btn--hot"
      : variant === "danger"
      ? "forge-btn--danger"
      : "forge-btn--metal";
  return (
    <ForgeButton
      onClick={onClick}
      disabled={!!disabled}
      title={title}
      className={styleClass}
    >
      {children}
    </ForgeButton>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{label.toUpperCase()}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="forge-select"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

}

export function SettingsPage() {
  const t = useT();
  const [settings, setSettings] = useForgeSettings();
  const [themeName, setThemeName] = useState<ThemeName>(() => getTheme());
  const appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || "beta";

  // pull some core data counts for a "status" card
  const [sessions] = useLocalStorage<any[]>(LS_KEYS.sessions, []);
  const [meals] = useLocalStorage<any[]>(LS_KEYS.meals_v1, []);
  const [sleep] = useLocalStorage<any[]>(LS_KEYS.sleep_v1, []);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<null | "export" | "import" | "reset">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : false
  );

  const stats = useMemo(() => {
    const s = Array.isArray(sessions) ? sessions.length : 0;
    const m = Array.isArray(meals) ? meals.length : 0;
    const sl = Array.isArray(sleep) ? sleep.length : 0;
    return { sessions: s, meals: m, sleep: sl };
  }, [sessions, meals, sleep]);

  function setUnits(units: "kg" | "lb") {
    setSettings((prev) => ({ ...prev, units, updatedAt: new Date().toISOString() }));
    setToast(units === "kg" ? t("settings.toast.units.kg") : t("settings.toast.units.lb"));
    setTimeout(() => setToast(null), 1400);
  }

  function setLanguage(language: "no" | "en" | "es") {
    setSettings((prev) => ({ ...prev, language, updatedAt: new Date().toISOString() }));
    setToast(t(`settings.toast.lang.${language}`));
    setTimeout(() => setToast(null), 1400);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function buildFeedbackText() {
    const timestamp = new Date().toISOString();
    const href = typeof window !== "undefined" ? window.location.href : "n/a";
    const online = typeof navigator !== "undefined" ? (navigator.onLine ? "online" : "offline") : "unknown";
    const language = settings?.language ?? (typeof navigator !== "undefined" ? navigator.language : "unknown");
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";

    return [
      "App: FORGE Beta",
      `Version: ${appVersion}`,
      `URL: ${href}`,
      `Online: ${online}`,
      `Language: ${language}`,
      `UserAgent: ${userAgent}`,
      `Timestamp: ${timestamp}`,
      "",
      "---",
      "Feedback:",
      "",
    ].join("\n");
  }

  async function copyFeedbackText() {
    const feedbackText = buildFeedbackText();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(feedbackText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = feedbackText;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setToast(t("settings.feedback.copied"));
    } catch {
      window.alert(feedbackText);
      setToast(t("settings.feedback.copied"));
    } finally {
      setTimeout(() => setToast(null), 1600);
    }
  }

  function sendFeedbackEmail() {
    const subject = encodeURIComponent(t("settings.feedback.subject"));
    const body = encodeURIComponent(buildFeedbackText());
    window.location.href = `mailto:Sebastian.Forge.app@gmail.com?subject=${subject}&body=${body}`;
  }

  function getAllForgeKeys(): string[] {
    const base = Object.values(LS_KEYS) as string[];
    const extras = [LS_SETTINGS, LS_ANALYTICS_EX, LS_ANALYTICS_FATIGUE_SCOPE, LS_FILTER_PRESETS];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of [...base, ...extras]) {
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }

  function safeParse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function downloadJSON(filename: string, json: string) {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportDataToFile() {
    setBusy("export");
    try {
      const keys = getAllForgeKeys();
      const data: Record<string, unknown> = {};
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw == null) continue;
        data[k] = safeParse(raw);
      }

      const backup: ForgeBackupV1 = {
        schema: "forge_backup_v1",
        createdAt: new Date().toISOString(),
        data,
      };

      const json = JSON.stringify(backup, null, 2);
      downloadJSON(`forge-backup-${backup.createdAt.slice(0, 10)}.json`, json);
      setToast(t("settings.backup.exported"));
      setTimeout(() => setToast(null), 1400);
    } catch {
      setToast(t("settings.backup.exportFailed"));
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(null);
    }
  }

  function openImportPicker() {
    if (busy) return;
    fileRef.current?.click();
  }

  function isForgeBackupV1(x: any): x is ForgeBackupV1 {
    return x && typeof x === "object" && x.schema === "forge_backup_v1" && typeof x.createdAt === "string" && x.data && typeof x.data === "object";
  }

  async function importBackupFile(file: File) {
    setBusy("import");
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);

      // Accept our new format, and also tolerate the old settings export format.
      let backup: ForgeBackupV1 | null = null;

      if (isForgeBackupV1(parsed)) {
        backup = parsed;
      } else if (parsed && typeof parsed === "object" && parsed.version === "forge_export_v1") {
        const data: Record<string, unknown> = {};
        data[LS_SETTINGS] = parsed.settings;
        data[LS_KEYS.sessions] = parsed.sessions;
        data[LS_KEYS.meals_v1] = parsed.meals;
        data[LS_KEYS.sleep_v1] = parsed.sleep;
        if (parsed.nutrition !== undefined) data[LS_KEYS.nutrition_v1] = parsed.nutrition;
        if (parsed.targets !== undefined) data[LS_KEYS.diet_targets_v1] = parsed.targets;
        backup = { schema: "forge_backup_v1", createdAt: new Date().toISOString(), data };
      }

      if (!backup) {
        setToast(t("settings.backup.invalid"));
        setTimeout(() => setToast(null), 1800);
        return;
      }

      const ok = window.confirm(t("settings.backup.importConfirm"));
      if (!ok) return;

      const keys = getAllForgeKeys();
      // Clear known Forge keys first
      for (const k of keys) localStorage.removeItem(k);
      // Write known keys back
      for (const k of keys) {
        if (!(k in backup.data)) continue;
        localStorage.setItem(k, JSON.stringify((backup.data as any)[k]));
      }

      setToast(t("settings.backup.importOk"));
      setTimeout(() => setToast(null), 1800);
    } catch {
      setToast(t("settings.backup.importFailed"));
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function resetAllData() {
    if (busy) return;
    const ok1 = window.confirm(t("settings.reset.confirm1"));
    if (!ok1) return;
    const ok2 = window.confirm(t("settings.reset.confirm2"));
    if (!ok2) return;

    setBusy("reset");
    try {
      const keys = getAllForgeKeys();
      for (const k of keys) localStorage.removeItem(k);
      setToast(t("settings.reset.done"));
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(null);
    }
  }

  const toastBlock = toast ? (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface2)",
        color: "var(--text)",
        fontWeight: 850,
      }}
    >
      {toast}
    </div>
  ) : null;

  const appPrefs = (
    <div style={{ display: "grid", gap: 14 }}>
      {toastBlock}

      <Card title={t("settings.section.general")} subtitle={t("settings.general.subtitle")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <SelectRow
            label={t("settings.units")}
            value={settings.units}
            onChange={(v) => setUnits(v === "lb" ? "lb" : "kg")}
            options={[
              { value: "kg", label: t("settings.units.option.kgDefault") },
              { value: "lb", label: t("settings.units.option.lb") },
            ]}
          />

          <SelectRow
            label={t("settings.language")}
            value={settings.language}
            onChange={(v) => setLanguage(v === "en" ? "en" : v === "es" ? "es" : "no")}
            options={[
              { value: "no", label: t("settings.language.option.no") },
              { value: "en", label: t("settings.language.option.en") },
              { value: "es", label: t("settings.language.option.es") },
            ]}
          />
        </div>

        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.35 }}>
          {t("settings.storage.note")} <span style={{ color: "var(--text)", fontWeight: 900 }}>{LS_SETTINGS}</span>.
          {t("settings.storage.note2")}
        </div>
      </Card>

      {import.meta.env.DEV ? (
        <Card title="ThemeLab (DEV)" subtitle="V2 palette switcher for design testing only">
          <SelectRow
            label="Palette"
            value={themeName}
            onChange={(v) => {
              const next = v === "plasmaRed" ? "plasmaRed" : "baseNeutral";
              setThemeName(next);
              setTheme(next);
            }}
            options={[
              { value: "baseNeutral", label: "Base Neutral" },
              { value: "plasmaRed", label: "Plasma Red" },
            ]}
          />
          <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.35 }}>
            Stored in <span style={{ color: "var(--text)", fontWeight: 900 }}>forge:theme_v2</span> while in dev mode.
          </div>
        </Card>
      ) : null}
    </div>
  );

  const statusBlock = (
    <Card title={t("settings.dataStatus.title")} subtitle={t("settings.dataStatus.subtitle")}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface2)" }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("settings.dataStatus.sessions").toUpperCase()}</div>
          <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 18 }}>{stats.sessions}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface2)" }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("settings.dataStatus.meals").toUpperCase()}</div>
          <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 18 }}>{stats.meals}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface2)" }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("settings.dataStatus.sleep").toUpperCase()}</div>
          <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 18 }}>{stats.sleep}</div>
        </div>
      </div>
    </Card>
  );

  const feedbackBlock = (
    <Card title={t("settings.feedback.title")} subtitle={t("settings.feedback.description")}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button onClick={sendFeedbackEmail} variant="primary">
          {t("settings.feedback.send")}
        </Button>
        <Button onClick={() => void copyFeedbackText()}>
          {t("settings.feedback.copy")}
        </Button>
      </div>

      <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.35 }}>
        {t("settings.feedback.privacy")}
      </div>
    </Card>
  );

  const appInfoBlock = (
    <Card title={t("settings.appInfo.title")}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
          {t("settings.appInfo.version").toUpperCase()}
        </div>
        <div style={{ color: "var(--text)", fontWeight: 900 }}>{appVersion}</div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
          {t("settings.appInfo.language").toUpperCase()}
        </div>
        <div style={{ color: "var(--text)", fontWeight: 900 }}>
          {settings?.language?.toUpperCase?.() ?? "NO"}
        </div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
          {t("settings.appInfo.status").toUpperCase()}
        </div>
        <div style={{ color: "var(--text)", fontWeight: 900 }}>
          {isOnline ? t("settings.appInfo.online") : t("settings.appInfo.offline")}
        </div>
      </div>
    </Card>
  );

  const dataToolsBlock = (
    <CollapsibleSection title={t("settings.section.data")} subtitle={t("settings.dataTools.subtitle")} defaultOpen={false}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={() => void exportDataToFile()} variant="primary" disabled={busy !== null}>
            {busy === "export" ? "…" : t("settings.export")}
          </Button>
          <Button onClick={openImportPicker} disabled={busy !== null} title={t("settings.dataTools.importTooltip")}>
            {busy === "import" ? "…" : t("settings.import")}
          </Button>
          <Button onClick={resetAllData} variant="danger" disabled={busy !== null}>
            {busy === "reset" ? "…" : t("settings.reset")}
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importBackupFile(f);
            }}
          />
        </div>

        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.35 }}>
          {t("settings.dataTools.note")}
        </div>
      </div>
    </CollapsibleSection>
  );

  
return (
    <div className="forgePage">
      {appPrefs}
      {statusBlock}
      <AccountSection />
      {feedbackBlock}
      {appInfoBlock}
      {dataToolsBlock}
    </div>
  );

}

export default SettingsPage;
