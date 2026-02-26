// src/components/SleepLogModal.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { LS_KEYS } from "../../constants";
import { Modal } from "./Modal";
import { useT } from "../../hooks/useT";

export type SleepEntryV1 = {
  dateISO: string; // YYYY-MM-DD
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm
  quality?: number; // 1–5
};

function isoToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function SleepLogModal({
  open,
  onClose,
  dateISO,
}: {
  open: boolean;
  onClose: () => void;
  dateISO?: string;
}) {
  const t = useT();
  const today = useMemo(() => isoToday(), []);
  const day = dateISO ?? today;

  const [sleep, setSleep] = useLocalStorage<SleepEntryV1[]>(LS_KEYS.sleep_v1, []);
  const existing = sleep.find((s) => s.dateISO === day);

  const [bedtime, setBedtime] = useState(existing?.bedtime ?? "");
  const [wakeTime, setWakeTime] = useState(existing?.wakeTime ?? "");
  const [quality, setQuality] = useState<string>(existing?.quality ? String(existing.quality) : "");

  useEffect(() => {
    if (!open) return;
    setBedtime(existing?.bedtime ?? "");
    setWakeTime(existing?.wakeTime ?? "");
    setQuality(existing?.quality ? String(existing.quality) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, day]);


  function upsert(entry: SleepEntryV1) {
    setSleep((prev) => {
      const idx = prev.findIndex((x) => x.dateISO === entry.dateISO);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entry;
        return copy;
      }
      return [...prev, entry];
    });
  }

  function onSave() {
    const q = quality.trim() === "" ? undefined : Math.min(5, Math.max(1, Number(quality)));
    upsert({
      dateISO: day,
      bedtime: bedtime.trim(),
      wakeTime: wakeTime.trim(),
      quality: Number.isFinite(q as number) ? q : undefined,
    });
    onClose();
  }

  const footer = (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button
        onClick={onClose}
        style={{
          border: "1px solid var(--border)",
          background: "var(--surface2)",
          color: "var(--text)",
          borderRadius: 14,
          padding: "10px 12px",
          fontWeight: 950,
          cursor: "pointer",
        }}
      >
        {t("common.cancel")}
      </button>
      <button
        onClick={onSave}
        style={{
          border: "1px solid rgba(var(--accentHot-rgb),0.35)",
          background: "rgba(var(--accentHot-rgb),0.14)",
          color: "var(--text)",
          borderRadius: 14,
          padding: "10px 12px",
          fontWeight: 950,
          cursor: "pointer",
        }}
      >
        {t("common.save")}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={`${t("sleep.popover.title")} • ${day}`} footer={footer}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("sleep.fields.bedtime").toUpperCase()}</div>
          <input
            type="time"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.25)",
              color: "var(--text)",
              fontWeight: 900,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("sleep.fields.wake").toUpperCase()}</div>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.25)",
              color: "var(--text)",
              fontWeight: 900,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("sleep.fields.quality").toUpperCase()}</div>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.25)",
              color: "var(--text)",
              fontWeight: 900,
              outline: "none",
            }}
          >
            <option value="">—</option>
            <option value="1">1 ({t("sleep.quality.bad")})</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5 ({t("sleep.quality.top")})</option>
          </select>
        </div>
      </div>

      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        {t("sleep.tip.overnight")}
      </div>
    </Modal>
  );
}

