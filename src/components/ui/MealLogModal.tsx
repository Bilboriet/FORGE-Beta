// src/components/MealLogModal.tsx
import { useState } from "react";
import { Modal } from "./Modal";
import { useT } from "../../hooks/useT";

export type MealEntryV1 = {
  id: string;
  dateISO: string; // YYYY-MM-DD
  createdAt: string; // ISO
  name?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

function clamp0(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseNum(raw: string) {
  const n = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function MealLogModal({
  open,
  onClose,
  dateISO,
  onAddMeal,
}: {
  open: boolean;
  onClose: () => void;
  dateISO: string;
  onAddMeal: (entry: Omit<MealEntryV1, "id" | "createdAt">) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  function reset() {
    setName("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
  }

  function save() {
    onAddMeal({
      dateISO,
      name: name.trim() ? name.trim() : undefined,
      kcal: clamp0(parseNum(kcal)),
      protein: clamp0(parseNum(protein)),
      carbs: clamp0(parseNum(carbs)),
      fat: clamp0(parseNum(fat)),
      fiber: clamp0(parseNum(fiber)),
    });
    reset();
    onClose();
  }

  const footer = (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button
        onClick={() => {
          reset();
          onClose();
        }}
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
        Avbryt
      </button>
      <button
        onClick={save}
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
        Lagre måltid
      </button>
    </div>
  );

  function Field({
    label,
    unit,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    unit: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) {
    return (
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{label.toUpperCase()}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{unit}</div>
        </div>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(0,0,0,0.25)",
            color: "var(--text)",
            fontWeight: 900,
            fontSize: 16,
            outline: "none",
          }}
        />
      </div>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`${t("diet.meals.logMeal")} • ${dateISO}`} footer={footer}>
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("diet.mealModal.name").toUpperCase()}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{t("diet.mealModal.optional")}</div>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("diet.mealModal.namePlaceholder")}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(0,0,0,0.25)",
            color: "var(--text)",
            fontWeight: 900,
            fontSize: 16,
            outline: "none",
          }}
        />
        <div style={{ color: "var(--muted)", fontSize: 12 }}>{t("diet.mealModal.nameTip")}</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <Field label={t("diet.mealModal.kcal")} unit="kcal" value={kcal} onChange={setKcal} placeholder="0" />
        <Field label={t("macros.protein")} unit="g" value={protein} onChange={setProtein} placeholder="0" />
        <Field label={t("macros.carbs")} unit="g" value={carbs} onChange={setCarbs} placeholder="0" />
        <Field label={t("macros.fat")} unit="g" value={fat} onChange={setFat} placeholder="0" />
        <Field label={t("macros.fiber")} unit="g" value={fiber} onChange={setFiber} placeholder="0" />
      </div>

      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        {t("diet.mealModal.hint")}
      </div>
    </Modal>
  );
}

