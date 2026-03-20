import { useEffect, useMemo, useState } from "react";
import {
  exerciseDatabase,
  exerciseDatabaseMuscles,
  toExerciseRef,
  type ExerciseDatabaseMuscleKey,
} from "../../data/exerciseDatabase";
import { useExercisePreferences } from "../../hooks/useExercisePreferences";
import type { ExerciseRef } from "../../types";

type BrowseMode = "muscle" | "all";

type MainGroupId =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

type MuscleSubgroup = {
  id: string;
  label: string;
  muscles: readonly ExerciseDatabaseMuscleKey[];
};

type MainGroupConfig = {
  id: MainGroupId;
  label: string;
  muscles: readonly ExerciseDatabaseMuscleKey[];
  subgroups: readonly MuscleSubgroup[];
};

const MAIN_GROUPS: readonly MainGroupConfig[] = [
  {
    id: "chest",
    label: "Chest",
    muscles: ["upper_chest", "mid_chest", "lower_chest"],
    subgroups: [
      { id: "upper", label: "Upper", muscles: ["upper_chest"] },
      { id: "mid", label: "Mid", muscles: ["mid_chest"] },
      { id: "lower", label: "Lower", muscles: ["lower_chest"] },
    ],
  },
  {
    id: "back",
    label: "Back",
    muscles: [
      "upper_lats",
      "neutral_lats",
      "lower_lats",
      "upper_traps",
      "middle_traps",
      "lower_traps",
      "mid_back",
      "erector_spinae",
      "teres_major",
    ],
    subgroups: [
      { id: "upper-lats", label: "Upper Lats", muscles: ["upper_lats"] },
      { id: "mid-lower-lats", label: "Mid/Lower Lats", muscles: ["neutral_lats", "lower_lats"] },
      { id: "upper-back", label: "Upper Back", muscles: ["upper_traps", "middle_traps", "lower_traps", "teres_major"] },
      { id: "mid-back", label: "Mid Back", muscles: ["mid_back"] },
      { id: "lower-back", label: "Lower Back / Erectors", muscles: ["erector_spinae"] },
    ],
  },
  {
    id: "shoulders",
    label: "Shoulders",
    muscles: ["deltoid_anterior", "deltoid_lateral", "deltoid_posterior", "infraspinatus_teresminor"],
    subgroups: [
      { id: "front-delts", label: "Front Delts", muscles: ["deltoid_anterior"] },
      { id: "side-delts", label: "Side Delts", muscles: ["deltoid_lateral"] },
      { id: "rear-delts", label: "Rear Delts", muscles: ["deltoid_posterior", "infraspinatus_teresminor"] },
    ],
  },
  {
    id: "arms",
    label: "Arms",
    muscles: [
      "biceps_long_head",
      "biceps_short_head",
      "biceps_neutral",
      "brachialis",
      "triceps_long_head",
      "triceps_lateral_head",
      "triceps_medial_head",
      "triceps_neutral",
      "triceps_lateral_medial",
      "forearm_flexors",
      "forearm_extensors",
    ],
    subgroups: [
      { id: "biceps", label: "Biceps", muscles: ["biceps_long_head", "biceps_short_head", "biceps_neutral", "brachialis"] },
      {
        id: "triceps",
        label: "Triceps",
        muscles: [
          "triceps_long_head",
          "triceps_lateral_head",
          "triceps_medial_head",
          "triceps_neutral",
          "triceps_lateral_medial",
        ],
      },
      { id: "forearms", label: "Forearms", muscles: ["forearm_flexors", "forearm_extensors"] },
    ],
  },
  {
    id: "quads",
    label: "Quads",
    muscles: ["quads_neutral", "rectus_femoris", "vastus_lateralis", "vastus_medialis"],
    subgroups: [
      { id: "all-quads", label: "All Quads", muscles: ["quads_neutral"] },
      { id: "rectus-femoris", label: "Rectus Femoris", muscles: ["rectus_femoris"] },
      { id: "vastus-lateralis", label: "Vastus Lateralis", muscles: ["vastus_lateralis"] },
      { id: "vastus-medialis", label: "Vastus Medialis", muscles: ["vastus_medialis"] },
    ],
  },
  {
    id: "hamstrings",
    label: "Hamstrings",
    muscles: ["hamstrings_neutral", "lateral_hamstring", "medial_hamstring"],
    subgroups: [
      { id: "all-hamstrings", label: "All Hamstrings", muscles: ["hamstrings_neutral"] },
      { id: "lateral", label: "Lateral", muscles: ["lateral_hamstring"] },
      { id: "medial", label: "Medial", muscles: ["medial_hamstring"] },
    ],
  },
  {
    id: "glutes",
    label: "Glutes",
    muscles: ["gluteus_maximus", "gluteus_medius"],
    subgroups: [
      { id: "glute-max", label: "Glute Max", muscles: ["gluteus_maximus"] },
      { id: "glute-med", label: "Glute Med", muscles: ["gluteus_medius"] },
    ],
  },
  {
    id: "calves",
    label: "Calves",
    muscles: ["gastrocnemius", "soleus", "tibialis_anterior"],
    subgroups: [
      { id: "gastroc", label: "Gastrocnemius", muscles: ["gastrocnemius"] },
      { id: "soleus", label: "Soleus", muscles: ["soleus"] },
      { id: "tibialis", label: "Tibialis", muscles: ["tibialis_anterior"] },
    ],
  },
  {
    id: "core",
    label: "Core",
    muscles: ["rectus_abdominis", "obliques"],
    subgroups: [
      { id: "abs", label: "Abs", muscles: ["rectus_abdominis"] },
      { id: "obliques", label: "Obliques", muscles: ["obliques"] },
    ],
  },
];

export function ExercisePickerModal({
  open,
  onClose,
  onPick,
  title = "Exercise Database",
  placement = "center",
  variant = "modal",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseRef) => void;
  title?: string;
  placement?: "center" | "top";
  variant?: "modal" | "inline";
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<BrowseMode>("muscle");
  const [selectedMainGroup, setSelectedMainGroup] = useState<MainGroupId>("chest");
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const { favoriteIds, isFavorite, toggleFavorite, addRecent } = useExercisePreferences();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setMode("muscle");
    setSelectedMainGroup("chest");
    setSelectedSubgroup(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  const searchValue = query.trim().toLowerCase();
  const activeMainGroup = useMemo(
    () => MAIN_GROUPS.find((group) => group.id === selectedMainGroup) ?? MAIN_GROUPS[0],
    [selectedMainGroup],
  );
  const activeSubgroup = useMemo(
    () => activeMainGroup.subgroups.find((subgroup) => subgroup.id === selectedSubgroup) ?? null,
    [activeMainGroup, selectedSubgroup],
  );

  const filteredEntries = useMemo(() => {
    return exerciseDatabase.filter((entry) => {
      if (mode === "muscle") {
        const allowedMuscles = activeSubgroup?.muscles ?? activeMainGroup.muscles;
        if (!allowedMuscles.includes(entry.muscleGroup)) return false;
      }
      if (!searchValue) return true;
      return [entry.id, entry.name, entry.displayName, entry.muscleGroup, entry.movementTemplate]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [activeMainGroup.muscles, activeSubgroup, mode, searchValue]);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteEntries = useMemo(
    () => filteredEntries.filter((entry) => favoriteIdSet.has(entry.id)),
    [favoriteIdSet, filteredEntries],
  );
  const regularEntries = useMemo(
    () => filteredEntries.filter((entry) => !favoriteIdSet.has(entry.id)),
    [favoriteIdSet, filteredEntries],
  );

  if (!open) return null;

  const renderExerciseRow = (entry: (typeof exerciseDatabase)[number]) => {
    const ref = toExerciseRef(entry);
    const muscleLabel =
      exerciseDatabaseMuscles.find((item) => item.id === entry.muscleGroup)?.displayName ?? entry.muscleGroup;
    const favorite = isFavorite(entry.id);

    return (
      <div
        key={entry.id}
        className="forgeInnerPlate"
        style={{
          padding: 14,
          display: "grid",
          gap: 8,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
          <button
            type="button"
            onClick={() => {
              addRecent(entry.id);
              onPick(ref);
            }}
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "var(--text)",
              cursor: "pointer",
              padding: 0,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div style={{ fontWeight: 900 }}>{entry.displayName}</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              {muscleLabel} • {entry.movementTemplate}
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(entry.id)}
            aria-label={favorite ? "Remove favorite" : "Add favorite"}
            title={favorite ? "Remove from favorites" : "Add to favorites"}
            style={{
              border: "1px solid var(--border)",
              background: favorite
                ? "color-mix(in oklch, var(--surface) 86%, var(--plasma-log-plasma-core) 14%)"
                : "transparent",
              color: favorite ? "var(--plasma-log-plasma-core)" : "var(--muted)",
              borderRadius: 999,
              width: 34,
              height: 34,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: favorite
                ? "0 0 0 1px color-mix(in oklch, var(--plasma-log-plasma-core) 18%, transparent), 0 0 8px color-mix(in oklch, var(--plasma-log-plasma-core) 20%, transparent)"
                : "none",
              transition: "color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 140ms ease",
            }}
            onMouseDown={(event) => {
              event.currentTarget.style.transform = "scale(0.97)";
            }}
            onMouseUp={(event) => {
              event.currentTarget.style.transform = "scale(1)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "scale(1)";
            }}
            onMouseEnter={(event) => {
              if (!favorite) {
                event.currentTarget.style.color = "color-mix(in oklch, var(--muted) 55%, var(--text) 45%)";
                return;
              }
              event.currentTarget.style.color = "var(--plasma-log-plasma-hot)";
              event.currentTarget.style.boxShadow =
                "0 0 0 1px color-mix(in oklch, var(--plasma-log-plasma-core) 24%, transparent), 0 0 10px color-mix(in oklch, var(--plasma-log-plasma-core) 24%, transparent)";
            }}
            onMouseOut={(event) => {
              event.currentTarget.style.color = favorite ? "var(--plasma-log-plasma-core)" : "var(--muted)";
              event.currentTarget.style.boxShadow = favorite
                ? "0 0 0 1px color-mix(in oklch, var(--plasma-log-plasma-core) 18%, transparent), 0 0 8px color-mix(in oklch, var(--plasma-log-plasma-core) 20%, transparent)"
                : "none";
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>
              {favorite ? "★" : "☆"}
            </span>
          </button>
        </div>
      </div>
    );
  };

  const content = (
    <div
      style={{
        width: variant === "inline" ? "100%" : "min(760px, 100%)",
        maxHeight: variant === "inline" ? "min(70vh, 760px)" : "min(90vh, 860px)",
        overflow: "auto",
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        display: "grid",
        gap: 14,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text)", fontWeight: 900 }}>{title}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Body-aligned exercise source. No legacy exercise library is active.
          </div>
        </div>
        <button className="forge-btn forge-btn--metal" onClick={onClose}>
          Close
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Exercise Database..."
        className="forge-input"
      />

      <div
        className="forgeInnerPlate"
        style={{
          padding: "10px 12px",
          display: "grid",
          gap: 4,
          border: "1px solid var(--border)",
          background: "color-mix(in oklch, var(--surface2) 90%, var(--surface) 10%)",
        }}
      >
        <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 12 }}>Quick note</div>
        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45 }}>
          Search always works across the full real exercise database. Main groups and subgroups just help you narrow down
          faster before adding an exercise.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className={mode === "muscle" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
          onClick={() => setMode("muscle")}
        >
          By Muscle
        </button>
        <button
          className={mode === "all" ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
          onClick={() => setMode("all")}
        >
          All Exercises
        </button>
      </div>

      {mode === "muscle" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MAIN_GROUPS.map((group) => (
              <button
                key={group.id}
                className={selectedMainGroup === group.id ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
                onClick={() => {
                  setSelectedMainGroup(group.id);
                  setSelectedSubgroup(null);
                }}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={selectedSubgroup === null ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
              onClick={() => setSelectedSubgroup(null)}
            >
              All {activeMainGroup.label}
            </button>
            {activeMainGroup.subgroups.map((subgroup) => (
              <button
                key={subgroup.id}
                className={
                  selectedSubgroup === subgroup.id ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"
                }
                onClick={() => setSelectedSubgroup(subgroup.id)}
              >
                {subgroup.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        {mode === "muscle"
          ? `Showing ${activeSubgroup ? activeSubgroup.label : `all ${activeMainGroup.label.toLowerCase()}`} exercises${
              query.trim() ? ` matching "${query.trim()}"` : ""
            }.`
          : `Showing all exercises${query.trim() ? ` matching "${query.trim()}"` : ""}.`}
      </div>

      {filteredEntries.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {favoriteEntries.length > 0 ? (
            <section style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "var(--text)", fontWeight: 800, fontSize: 13 }}>Favorites</div>
              <div style={{ display: "grid", gap: 8 }}>{favoriteEntries.map(renderExerciseRow)}</div>
            </section>
          ) : null}

          {regularEntries.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>{regularEntries.map(renderExerciseRow)}</div>
          ) : favoriteEntries.length > 0 ? null : null}
        </div>
      ) : (
        <div className="forgeInnerPlate" style={{ padding: 16, display: "grid", gap: 6 }}>
          <div style={{ color: "var(--text)", fontWeight: 850 }}>No database entries available.</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Adjust search or filters, or add entries in `src/data/exerciseDatabase.ts`.
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "inline") {
    return (
      <div role="dialog" aria-modal="false" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        {content}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.60)",
        display: "grid",
        placeItems: placement === "top" ? "start center" : "center",
        padding: 16,
      }}
    >
      {content}
    </div>
  );
}
