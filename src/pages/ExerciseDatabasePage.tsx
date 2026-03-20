import { useEffect, useMemo, useState } from "react";
import {
  exerciseDatabase,
  type ExerciseDatabaseEntry,
  type ExerciseDatabaseMuscleKey,
} from "../data/exerciseDatabase";

type BrowseMode = "muscle" | "all";

type BrowserMuscleItem = {
  id: string;
  label: string;
  targetKey: ExerciseDatabaseMuscleKey;
};

type BrowserSubgroup = {
  id: string;
  label: string;
  items: BrowserMuscleItem[];
};

type BrowserGroup = {
  id: string;
  label: string;
  items: Array<BrowserMuscleItem | BrowserSubgroup>;
};

type ExerciseDatabasePageProps = {
  onBack?: () => void;
  initialTargetKey?: ExerciseDatabaseMuscleKey | null;
  initialExerciseId?: string | null;
};

type InitialBrowseState = {
  groupId: string | null;
  subgroupId: string | null;
  muscleId: string | null;
};

function isBrowserSubgroup(item: BrowserMuscleItem | BrowserSubgroup): item is BrowserSubgroup {
  return "items" in item;
}

function getGroupMuscleItems(group: BrowserGroup) {
  return group.items.flatMap((item) => (isBrowserSubgroup(item) ? item.items : [item]));
}

function resolveInitialBrowseState(targetKey: ExerciseDatabaseMuscleKey | null | undefined): InitialBrowseState {
  if (!targetKey) {
    return {
      groupId: null,
      subgroupId: null,
      muscleId: null,
    };
  }

  for (const group of BROWSE_GROUPS) {
    for (const item of group.items) {
      if (isBrowserSubgroup(item)) {
        const subgroupMatch = item.items.find((subgroupItem) => subgroupItem.targetKey === targetKey);
        if (subgroupMatch) {
          return {
            groupId: group.id,
            subgroupId: item.id,
            muscleId: subgroupMatch.id,
          };
        }
        continue;
      }

      if (item.targetKey === targetKey) {
        return {
          groupId: group.id,
          subgroupId: null,
          muscleId: item.id,
        };
      }
    }
  }

  return {
    groupId: null,
    subgroupId: null,
    muscleId: null,
  };
}

const BROWSE_GROUPS: BrowserGroup[] = [
  {
    id: "chest",
    label: "Chest",
    items: [
      { id: "upper_chest", label: "Upper Chest", targetKey: "upper_chest" },
      { id: "mid_chest", label: "Mid Chest", targetKey: "mid_chest" },
      { id: "lower_chest", label: "Lower Chest", targetKey: "lower_chest" },
    ],
  },
  {
    id: "shoulders",
    label: "Shoulders",
    items: [
      { id: "deltoid_anterior", label: "Front Delts", targetKey: "deltoid_anterior" },
      { id: "deltoid_lateral", label: "Side Delts", targetKey: "deltoid_lateral" },
      { id: "deltoid_posterior", label: "Rear Delts", targetKey: "deltoid_posterior" },
      { id: "serratus_anterior", label: "Serratus Anterior", targetKey: "serratus_anterior" },
    ],
  },
  {
    id: "back",
    label: "Back",
    items: [
      { id: "upper_traps", label: "Upper Traps", targetKey: "upper_traps" },
      { id: "middle_traps", label: "Middle Traps", targetKey: "middle_traps" },
      { id: "lower_traps", label: "Lower Traps", targetKey: "lower_traps" },
      { id: "mid_back", label: "Mid back", targetKey: "mid_back" },
      { id: "infraspinatus_teresminor", label: "Infraspinatus / Teres Minor", targetKey: "infraspinatus_teresminor" },
      { id: "teres_major", label: "Teres Major", targetKey: "teres_major" },
      {
        id: "lats",
        label: "Lats",
        items: [
          { id: "upper_lats", label: "Upper Lats", targetKey: "upper_lats" },
          { id: "neutral_lats", label: "Neutral Lats", targetKey: "neutral_lats" },
          { id: "lower_lats", label: "Lower Lats", targetKey: "lower_lats" },
        ],
      },
      { id: "erector_spinae", label: "Erector Spinae", targetKey: "erector_spinae" },
    ],
  },
  {
    id: "arms",
    label: "Arms",
    items: [
      {
        id: "biceps",
        label: "Biceps",
        items: [
          { id: "biceps_long_head", label: "Long Head", targetKey: "biceps_long_head" },
          { id: "biceps_short_head", label: "Short Head", targetKey: "biceps_short_head" },
          { id: "biceps_neutral", label: "Neutral", targetKey: "biceps_neutral" },
          { id: "brachialis", label: "Brachialis", targetKey: "brachialis" },
        ],
      },
      {
        id: "triceps",
        label: "Triceps",
        items: [
          { id: "triceps_long_head", label: "Long Head", targetKey: "triceps_long_head" },
          { id: "triceps_lateral_head", label: "Lateral Head", targetKey: "triceps_lateral_head" },
          { id: "triceps_medial_head", label: "Medial Head", targetKey: "triceps_medial_head" },
          { id: "triceps_neutral", label: "Neutral", targetKey: "triceps_neutral" },
        ],
      },
      {
        id: "forearms",
        label: "Forearms",
        items: [
          { id: "forearm_flexors", label: "Flexors", targetKey: "forearm_flexors" },
          { id: "forearm_extensors", label: "Extensors", targetKey: "forearm_extensors" },
        ],
      },
    ],
  },
  {
    id: "core",
    label: "Core",
    items: [
      { id: "rectus_abdominis", label: "Rectus Abdominis", targetKey: "rectus_abdominis" },
      { id: "obliques", label: "Obliques", targetKey: "obliques" },
      { id: "hip_flexors", label: "Hip Flexors", targetKey: "hip_flexors" },
    ],
  },
  {
    id: "glutes",
    label: "Glutes",
    items: [
      { id: "gluteus_maximus", label: "Gluteus Maximus", targetKey: "gluteus_maximus" },
      { id: "gluteus_medius", label: "Gluteus Medius", targetKey: "gluteus_medius" },
    ],
  },
  {
    id: "quads",
    label: "Quads",
    items: [
      { id: "quads_neutral", label: "Neutral", targetKey: "quads_neutral" },
      { id: "vastus_lateralis", label: "Vastus Lateralis", targetKey: "vastus_lateralis" },
      { id: "rectus_femoris", label: "Rectus Femoris", targetKey: "rectus_femoris" },
      { id: "vastus_medialis", label: "Vastus Medialis", targetKey: "vastus_medialis" },
    ],
  },
  {
    id: "hamstrings",
    label: "Hamstrings",
    items: [
      { id: "hamstrings_neutral", label: "Neutral", targetKey: "hamstrings_neutral" },
      { id: "lateral_hamstring", label: "Lateral Hamstring", targetKey: "lateral_hamstring" },
      { id: "medial_hamstring", label: "Medial Hamstring", targetKey: "medial_hamstring" },
    ],
  },
  {
    id: "calves",
    label: "Calves",
    items: [
      { id: "gastrocnemius", label: "Gastrocnemius", targetKey: "gastrocnemius" },
      { id: "soleus", label: "Soleus", targetKey: "soleus" },
      { id: "tibialis_anterior", label: "Tibialis Anterior", targetKey: "tibialis_anterior" },
    ],
  },
  {
    id: "adductors_group",
    label: "Adductors",
    items: [{ id: "adductors", label: "Adductors", targetKey: "adductors" }],
  },
];

function entryMatchesQuery(entry: ExerciseDatabaseEntry, query: string) {
  if (!query) return true;
  return [
    entry.id,
    entry.name,
    entry.displayName,
    entry.muscleGroup,
    entry.movementTemplate,
    ...(entry.biasTags ?? []),
    ...(entry.equipment ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function buildEntriesByMuscle(query: string) {
  return new Map(
    BROWSE_GROUPS.flatMap((group) =>
      getGroupMuscleItems(group).map((item) => [
        item.id,
        exerciseDatabase.filter((entry) => entry.muscleGroup === item.targetKey && entryMatchesQuery(entry, query)),
      ] as const)
    )
  );
}

function renderExerciseEntries(entries: ExerciseDatabaseEntry[], targetKey: ExerciseDatabaseMuscleKey) {
  if (entries.length > 0) {
    return entries.map((entry) => (
      <article
        key={entry.id}
        className="forgeInnerPlate"
        style={{
          padding: 14,
          display: "grid",
          gap: 6,
          background: "rgba(0,0,0,0.14)",
        }}
      >
        <div style={{ color: "var(--text)", fontWeight: 900 }}>{entry.displayName}</div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {entry.id} - {entry.movementTemplate}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          Primary: {entry.primaryAnalysisTargets.join(", ")}
        </div>
        {entry.secondaryAnalysisTargets?.length ? (
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Secondary: {entry.secondaryAnalysisTargets.join(", ")}
          </div>
        ) : null}
      </article>
    ));
  }

  return (
    <div className="forgeInnerPlate" style={{ padding: 14, display: "grid", gap: 6 }}>
      <div style={{ color: "var(--text)", fontWeight: 850 }}>No entries added yet for this muscle.</div>
      <div style={{ color: "var(--muted)", fontSize: 13 }}>
        Add future entries in `src/data/exerciseDatabase.ts` using this exact target key: {targetKey}
      </div>
    </div>
  );
}

function renderMuscleCard(
  groupId: string,
  item: BrowserMuscleItem,
  isOpen: boolean,
  count: number,
  entries: ExerciseDatabaseEntry[],
  onToggle: (groupId: string, muscleId: string) => void
) {
  return (
    <div
      key={item.id}
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: isOpen ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(groupId, item.id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          color: "var(--text)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontWeight: isOpen ? 900 : 800 }}>{item.label}</span>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>{count}</span>
      </button>

      {isOpen ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "0 14px 14px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ color: "var(--muted)", fontSize: 12, paddingTop: 10 }}>
            Exact target key: <span style={{ color: "var(--text)", fontWeight: 800 }}>{item.targetKey}</span>
          </div>
          {renderExerciseEntries(entries, item.targetKey)}
        </div>
      ) : null}
    </div>
  );
}

export function ExerciseDatabasePage({ onBack, initialTargetKey = null, initialExerciseId = null }: ExerciseDatabasePageProps) {
  const resolvedInitialTargetKey = useMemo<ExerciseDatabaseMuscleKey | null>(() => {
    if (initialTargetKey) return initialTargetKey;
    if (!initialExerciseId) return null;

    const matchedEntry = exerciseDatabase.find((entry) => entry.id === initialExerciseId);
    return matchedEntry?.muscleGroup ?? null;
  }, [initialExerciseId, initialTargetKey]);

  const initialBrowseState = useMemo(
    () => resolveInitialBrowseState(resolvedInitialTargetKey),
    [resolvedInitialTargetKey]
  );

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<BrowseMode>("muscle");
  const [openGroupId, setOpenGroupId] = useState<string | null>(initialBrowseState.groupId);
  const [openSubgroupByGroup, setOpenSubgroupByGroup] = useState<Record<string, string | null>>(
    initialBrowseState.groupId && initialBrowseState.subgroupId
      ? { [initialBrowseState.groupId]: initialBrowseState.subgroupId }
      : {}
  );
  const [openMuscleByGroup, setOpenMuscleByGroup] = useState<Record<string, string | null>>(
    initialBrowseState.groupId && initialBrowseState.muscleId
      ? { [initialBrowseState.groupId]: initialBrowseState.muscleId }
      : {}
  );

  useEffect(() => {
    setOpenGroupId(initialBrowseState.groupId);
    setOpenSubgroupByGroup(
      initialBrowseState.groupId && initialBrowseState.subgroupId
        ? { [initialBrowseState.groupId]: initialBrowseState.subgroupId }
        : {}
    );
    setOpenMuscleByGroup(
      initialBrowseState.groupId && initialBrowseState.muscleId
        ? { [initialBrowseState.groupId]: initialBrowseState.muscleId }
        : {}
    );
  }, [initialBrowseState]);

  const searchValue = query.trim().toLowerCase();

  const entriesByMuscle = useMemo(() => buildEntriesByMuscle(searchValue), [searchValue]);

  const groupedCounts = useMemo(
    () =>
      new Map(
        BROWSE_GROUPS.flatMap((group) =>
          getGroupMuscleItems(group).map((item) => [item.id, entriesByMuscle.get(item.id)?.length ?? 0] as const)
        )
      ),
    [entriesByMuscle]
  );

  const filteredAllEntries = useMemo(
    () => exerciseDatabase.filter((entry) => entryMatchesQuery(entry, searchValue)),
    [searchValue]
  );

  function toggleGroup(groupId: string) {
    setOpenGroupId((current) => (current === groupId ? null : groupId));
  }

  function toggleMuscle(groupId: string, muscleId: string) {
    setOpenGroupId(groupId);
    setOpenMuscleByGroup((current) => ({
      ...current,
      [groupId]: current[groupId] === muscleId ? null : muscleId,
    }));
  }

  function toggleSubgroup(groupId: string, subgroupId: string) {
    setOpenGroupId(groupId);
    setOpenSubgroupByGroup((current) => ({
      ...current,
      [groupId]: current[groupId] === subgroupId ? null : subgroupId,
    }));
  }

  return (
    <div className="forgePage forgePageStack">
      <section className="forge-surface forgeCardInner" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: "var(--text)", fontWeight: 950, fontSize: 24 }}>Exercise Database</div>
            <div style={{ color: "var(--muted)", fontSize: 13, maxWidth: 720 }}>
              Body = what to improve. Database = what to do about it. This foundation is body-aligned and ready for manual FORGE-standard entries.
            </div>
          </div>
          {onBack ? (
            <button className="forge-btn forge-btn--metal" onClick={onBack}>
              Back
            </button>
          ) : null}
        </div>

        <div
          className="forgeInnerPlate"
          style={{
            padding: 14,
            display: "grid",
            gap: 8,
            background: "linear-gradient(135deg, rgba(var(--accentHot-rgb),0.08), rgba(255,255,255,0.02))",
          }}
        >
          <div style={{ color: "var(--text)", fontWeight: 900 }}>FORGE Database Foundation</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            No guessed exercise list is active. Add entries manually in the database model when each muscle or zone is ready.
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Active entries: {exerciseDatabase.length} - Targets supported from day one: {BROWSE_GROUPS.flatMap((group) => getGroupMuscleItems(group)).length}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Exercise Database..."
            className="forge-input"
          />

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
        </div>
      </section>

      {mode === "muscle" ? (
        <section className="forge-surface forgeCardInner" style={{ display: "grid", gap: 14 }}>
          <div style={{ color: "var(--text)", fontWeight: 900 }}>Browse By Muscle</div>
          <div style={{ display: "grid", gap: 10 }}>
            {BROWSE_GROUPS.map((group) => {
              const isGroupOpen = openGroupId === group.id;
              return (
                <div
                  key={group.id}
                  className="forgeInnerPlate"
                  style={{
                    padding: 12,
                    display: "grid",
                    gap: 10,
                    background: isGroupOpen
                      ? "linear-gradient(180deg, rgba(var(--accentHot-rgb),0.08), rgba(255,255,255,0.02))"
                      : "var(--surface2)",
                    transition: "background 180ms ease, border-color 180ms ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      background: "transparent",
                      border: "none",
                      color: "var(--text)",
                      padding: 2,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontWeight: 900, fontSize: 16 }}>{group.label}</span>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>{isGroupOpen ? "Hide" : "Show"}</span>
                  </button>

                  {isGroupOpen ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {group.items.map((item) => {
                        if (isBrowserSubgroup(item)) {
                          const subgroupCount = item.items.reduce((total, subgroupItem) => total + (groupedCounts.get(subgroupItem.id) ?? 0), 0);
                          const isSubgroupOpen = openSubgroupByGroup[group.id] === item.id;
                          return (
                            <div
                              key={item.id}
                              style={{
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,0.08)",
                                background: "rgba(255,255,255,0.02)",
                                padding: 10,
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  padding: 0,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSubgroup(group.id, item.id)}
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    padding: "2px 4px",
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--text)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                >
                                  <span style={{ color: "var(--text)", fontWeight: 900 }}>{item.label}</span>
                                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                                    {subgroupCount} {isSubgroupOpen ? "Hide" : "Show"}
                                  </span>
                                </button>
                              </div>

                              {isSubgroupOpen ? (
                                <div style={{ display: "grid", gap: 8 }}>
                                  {item.items.map((subgroupItem) =>
                                    renderMuscleCard(
                                      group.id,
                                      subgroupItem,
                                      openMuscleByGroup[group.id] === subgroupItem.id,
                                      groupedCounts.get(subgroupItem.id) ?? 0,
                                      entriesByMuscle.get(subgroupItem.id) ?? [],
                                      toggleMuscle
                                    )
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        }

                        return renderMuscleCard(
                          group.id,
                          item,
                          openMuscleByGroup[group.id] === item.id,
                          groupedCounts.get(item.id) ?? 0,
                          entriesByMuscle.get(item.id) ?? [],
                          toggleMuscle
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="forge-surface forgeCardInner" style={{ display: "grid", gap: 14 }}>
          <div style={{ color: "var(--text)", fontWeight: 900 }}>All Exercises</div>
          {filteredAllEntries.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {filteredAllEntries.map((entry) => (
                <article key={entry.id} className="forgeInnerPlate" style={{ padding: 14, display: "grid", gap: 6 }}>
                  <div style={{ color: "var(--text)", fontWeight: 900 }}>{entry.displayName}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {entry.muscleGroup} - {entry.movementTemplate}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="forgeInnerPlate" style={{ padding: 16, display: "grid", gap: 6 }}>
              <div style={{ color: "var(--text)", fontWeight: 850 }}>Exercise Database is currently empty.</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                The foundation is live, but no guessed legacy exercise list remains active.
              </div>
            </div>
          )}
        </section>
      )}

      <section className="forge-surface forgeCardInner" style={{ display: "grid", gap: 10 }}>
        <div style={{ color: "var(--text)", fontWeight: 900 }}>Entry Model</div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Future entries should be added in `src/data/exerciseDatabase.ts` and should include:
        </div>
        <div className="forgeInnerPlate" style={{ padding: 14, color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
          id - name - displayName - muscleGroup - primaryAnalysisTargets - secondaryAnalysisTargets - movementTemplate - biasTags - equipment - machineSetupVariants - notes
        </div>
      </section>
    </div>
  );
}

export default ExerciseDatabasePage;
