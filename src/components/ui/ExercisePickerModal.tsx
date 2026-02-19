import { useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from "react";
import type { ExerciseRef, MuscleGroup } from "../../types";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useT } from "../../hooks/useT";
import { CORE_EXERCISE_IDS, EXERCISE_BY_ID } from "../../exerciseLibrary";
import type { EquipmentTag, MovementCategory } from "../../exercises";
import { searchExercises } from "../../utils/exerciseSearch";

const LS_FAVORITES = "exercise_favorites_v1";
const LS_RECENTS = "exercise_recents_v1";
const LS_FILTER_PRESETS = "exercise_filter_presets_v1";
const RECENTS_LIMIT = 8;

type FilterState = {
  cat: MovementCategory | "all";
  muscle: MuscleGroup | "all";
  equip: EquipmentTag | "all";
  coreOnly: boolean;
};

type FilterPreset = {
  id: string;
  name: string;
  filters: FilterState;
};

function sameFilters(a: FilterState, b: FilterState) {
  return a.cat === b.cat && a.muscle === b.muscle && a.equip === b.equip && a.coreOnly === b.coreOnly;
}

function uniqKeepOrder(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function VirtualList<T>({
  items,
  itemHeight,
  gap = 8,
  overscan = 6,
  maxRender = 1200,
  scrollRef,
  getItemKey,
  renderItem,
}: {
  items: T[];
  itemHeight: number;
  gap?: number;
  overscan?: number;
  maxRender?: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  getItemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(520);

  // attach scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // track viewport height
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight || 520));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef]);

  const stride = itemHeight + gap;
  const total = Math.min(items.length, maxRender);
  const totalHeight = total * stride;
  const start = clamp(Math.floor(scrollTop / stride) - overscan, 0, Math.max(0, total - 1));
  const end = clamp(Math.ceil((scrollTop + viewportH) / stride) + overscan, 0, total);
  const slice = items.slice(start, end);

  return (
    <div style={{ position: "relative", height: totalHeight }}>
      <div style={{ position: "absolute", inset: 0 }}>
        {slice.map((item, i) => {
          const idx = start + i;
          return (
            <div
              key={getItemKey(item, idx)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: idx * stride,
                height: itemHeight,
              }}
            >
              {renderItem(item, idx)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid " + (active ? "rgba(255,59,59,0.6)" : "var(--border)"),
        background: active ? "var(--redSoft)" : "rgba(255,255,255,0.03)",
        color: active ? "var(--red)" : "var(--text)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 8,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{count}</div>
    </div>
  );
}

function ExerciseRow({
  ex,
  isFavorite,
  onToggleFavorite,
  onPick,
}: {
  ex: ExerciseRef;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPick: () => void;
}) {
  const t = useT();
  const mg = (ex.muscleGroup ?? "other") as any;
  const muscleLabelKey = `picker.muscle.${String(mg)}`;
  const muscleLabel = t(muscleLabelKey) || String(mg);
  return (
    <button
      onClick={onPick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 12,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "rgba(255,255,255,0.04)",
        color: "var(--text)",
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 800 }}>{ex.name}</div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {muscleLabel.toUpperCase()} • {ex.id}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        title={isFavorite ? t("picker.favorite.removeTitle") : t("picker.favorite.addTitle")}
        aria-label={isFavorite ? t("picker.favorite.removeAria") : t("picker.favorite.addAria")}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: "1px solid " + (isFavorite ? "rgba(255,59,59,0.55)" : "var(--border)"),
          background: isFavorite ? "var(--redSoft)" : "rgba(255,255,255,0.04)",
          color: isFavorite ? "var(--red)" : "var(--muted)",
          cursor: "pointer",
          fontSize: 18,
          display: "grid",
          placeItems: "center",
        }}
      >
        {isFavorite ? "★" : "☆"}
      </button>
    </button>
  );
}

type ViewMode = "default" | "browse";

export function ExercisePickerModal({
  open,
  onClose,
  exercises,
  onPick,
  title = undefined,
  placement = "center",
  variant = "modal",
}: {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseRef[];
  onPick: (exercise: ExerciseRef) => void;
  title?: string;
  placement?: "center" | "top";
  variant?: "modal" | "inline";
}) {
  const t = useT();
  const resolvedTitle = title ?? t("picker.title");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // When the user enters the expanded "browse" view, we must ensure the picker
  // has enough vertical space (especially on mobile). If this component is
  // rendered "inline" inside a page section, the page beneath can steal height
  // and make the list appear to "disappear".
  //
  // Solution: force the expanded browse view to render as a full-screen modal
  // overlay, even if the parent uses the inline variant.
  const effectiveVariant: "modal" | "inline" = mode === "browse" ? "modal" : variant;

  const listRef = useRef<HTMLDivElement | null>(null);

  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>(LS_FAVORITES, []);
  const [recentIds, setRecentIds] = useLocalStorage<string[]>(LS_RECENTS, []);

  const [catFilter, setCatFilter] = useState<MovementCategory | "all">("all");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "all">("all");
  const [equipFilter, setEquipFilter] = useState<EquipmentTag | "all">("all");
  const [coreOnly, setCoreOnly] = useState(false);

  const [presets, setPresets] = useLocalStorage<FilterPreset[]>(LS_FILTER_PRESETS, []);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  function currentFilters(): FilterState {
    return { cat: catFilter, muscle: muscleFilter, equip: equipFilter, coreOnly };
  }

  function applyFilters(f: FilterState) {
    setCatFilter(f.cat);
    setMuscleFilter(f.muscle);
    setEquipFilter(f.equip);
    setCoreOnly(!!f.coreOnly);
  }

  function resetFiltersToCategory(cat: MovementCategory | "all") {
    setCatFilter(cat);
    setMuscleFilter("all");
    setEquipFilter("all");
    setCoreOnly(false);
  }

  function clearQueryAndScrollTop() {
    setQuery("");
    const el = listRef.current;
    if (el) el.scrollTop = 0;
  }

  function applyPreset(p: FilterPreset) {
    setMode("browse");
    applyFilters(p.filters);
    clearQueryAndScrollTop();
  }

  function savePreset() {
    const name = presetName.trim();
    if (!name) return;
    const filters = currentFilters();
    setPresets((prev) => {
      const existingIdx = prev.findIndex((x) => x.name.toLowerCase() === name.toLowerCase());
      const next = [...prev];
      const entry: FilterPreset = {
        id: existingIdx >= 0 ? prev[existingIdx].id : String(Date.now()),
        name,
        filters,
      };
      if (existingIdx >= 0) next[existingIdx] = entry;
      else next.unshift(entry);
      return next;
    });
    setIsSavingPreset(false);
    setPresetName("");
  }

  // Reset when opened
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setMode("default");
    setFiltersOpen(false);
    setCatFilter("all");
    setMuscleFilter("all");
    setEquipFilter("all");
    setCoreOnly(false);
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onTabChange = () => {
      setFiltersOpen(false);
      onClose();
    };
    window.addEventListener("forge:tab-change", onTabChange as EventListener);
    return () => window.removeEventListener("forge:tab-change", onTabChange as EventListener);
  }, [open, onClose]);

  const byId = useMemo(() => {
    const map = new Map<string, ExerciseRef>();
    for (const ex of exercises) map.set(ex.id, ex);
    return map;
  }, [exercises]);

  function toggleFavorite(exId: string) {
    setFavoriteIds((prev) => {
      const exists = prev.includes(exId);
      const next = exists ? prev.filter((id) => id !== exId) : [exId, ...prev];
      return uniqKeepOrder(next);
    });
  }

  function markRecent(exId: string) {
    setRecentIds((prev) => uniqKeepOrder([exId, ...prev]).slice(0, RECENTS_LIMIT));
  }

  function pickExercise(ex: ExerciseRef) {
    markRecent(ex.id);
    onPick(ex);
  }

  const filteredPool = useMemo(() => {
    const coreSet = new Set<string>(CORE_EXERCISE_IDS);
    return exercises.filter((ex) => {
      const meta = EXERCISE_BY_ID[ex.id];
      if (coreOnly && !coreSet.has(ex.id)) return false;
      if (catFilter !== "all" && meta?.category && meta.category !== catFilter) return false;
      if (muscleFilter !== "all" && ex.muscleGroup !== muscleFilter) return false;
      if (equipFilter !== "all") {
        const eq = meta?.equipment ?? "other";
        if (eq !== equipFilter) return false;
      }
      return true;
    });
  }, [exercises, catFilter, muscleFilter, equipFilter, coreOnly]);

  const searchHits = useMemo(() => {
    if (!query.trim()) return [] as ExerciseRef[];
    const pool = mode === "browse" ? filteredPool : exercises;
    return searchExercises(pool, query).map((h) => h.ex);
  }, [query, mode, filteredPool, exercises]);

  const favorites = useMemo(() => {
    const items = favoriteIds.map((id) => byId.get(id)).filter(Boolean) as ExerciseRef[];
    return items;
  }, [favoriteIds, byId]);

  const recents = useMemo(() => {
    const items = recentIds.map((id) => byId.get(id)).filter(Boolean) as ExerciseRef[];
    const favSet = new Set(favoriteIds);
    return items.filter((ex) => !favSet.has(ex.id));
  }, [recentIds, byId, favoriteIds]);

  const core = useMemo(() => {
    const skip = new Set<string>([...favoriteIds, ...recentIds]);
    const coreSet = new Set<string>(CORE_EXERCISE_IDS);
    return exercises.filter((ex) => coreSet.has(ex.id)).filter((ex) => !skip.has(ex.id));
  }, [exercises, favoriteIds, recentIds]);

  const browseAll = useMemo(() => {
    // In browse mode, show everything (filters applied) but avoid duplicates inside sections.
    const skip = new Set<string>([...favoriteIds, ...recentIds]);
    const coreSet = new Set<string>(CORE_EXERCISE_IDS);
    const pool = filteredPool.filter((ex) => !skip.has(ex.id));
    return pool.filter((ex) => !coreSet.has(ex.id));
  }, [filteredPool, favoriteIds, recentIds]);

  if (!open) return null;

  const Outer = (
    <div
      style={{
        width: effectiveVariant === "inline" ? "100%" : "min(820px, 100%)",
        // In modal mode we want as much room as possible for the list.
        // (The filters sheet is a separate overlay.)
        maxHeight: effectiveVariant === "inline" ? "min(70vh, 760px)" : "min(92vh, 860px)",
        minHeight: 0,
        marginTop: placement === "top" ? 12 : 0,
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "rgba(11,11,15,0.96)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        overflow: "hidden",
        display: "grid",
        // Default mode: Header + Search + List
        // Browse mode:  Header + Search + CompactBar + List
        gridTemplateRows: mode === "browse" ? "auto auto auto 1fr" : "auto auto 1fr",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ color: "var(--red)", fontWeight: 900, letterSpacing: 0.5 }}>{resolvedTitle}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {mode === "browse" ? "Browse all" : "Quick pick"} • {exercises.length} øvelser
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {mode === "browse" ? (
            <button
              onClick={() => {
                setFiltersOpen(false);
                setMode("default");
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              ← Tilbake
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("browse");
                setFiltersOpen(false);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,59,59,0.35)",
                background: "rgba(255,59,59,0.10)",
                color: "var(--red)",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Browse all + filters
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            {t("picker.closeEsc")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "browse" ? t("picker.searchPlaceholderBrowse") : t("picker.searchPlaceholderDefault")
          }
          style={{
            width: "100%",
            padding: "12px 12px",
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text)",
            outline: "none",
          }}
        />
        <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>{t("picker.searchHelp")}</div>
      </div>

      {/* Browse mode compact bar + advanced filters sheet */}
      {mode === "browse" && (
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gap: 10,
          }}
        >
          {/* Quick categories (horizontal scroll) */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("picker.quick")}</div>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                paddingBottom: 2,
              }}
            >
              {([
                ["Push", "push"],
                ["Pull", "pull"],
                ["Legs", "legs"],
                [t("picker.core"), "core"],
                ["Neck", "neck"],
              ] as Array<[string, MovementCategory]>).map(([label, cat]) => (
                <button
                  key={cat}
                  onClick={() => {
                    resetFiltersToCategory(cat);
                    clearQueryAndScrollTop();
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid " + (catFilter === cat ? "rgba(255,59,59,0.55)" : "var(--border)"),
                    background: catFilter === cat ? "rgba(255,59,59,0.12)" : "rgba(255,255,255,0.04)",
                    color: catFilter === cat ? "var(--red)" : "var(--text)",
                    cursor: "pointer",
                    fontWeight: 900,
                    letterSpacing: 0.2,
                    whiteSpace: "nowrap",
                    flex: "0 0 auto",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Compact active filters + button */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                paddingBottom: 2,
              }}
            >
              <Chip
                label={
                  catFilter === "all"
                    ? t("picker.filters.compact.categoryAll")
                    : t("picker.filters.compact.category", { v: String(catFilter).toUpperCase() })
                }
                active={catFilter !== "all"}
                onClick={() => {
                  setFiltersOpen(true);
                }}
              />
              <Chip
                label={
                  muscleFilter === "all"
                    ? t("picker.filters.compact.muscleAll")
                    : t("picker.filters.compact.muscle", { v: String(muscleFilter).toUpperCase() })
                }
                active={muscleFilter !== "all"}
                onClick={() => setFiltersOpen(true)}
              />
              <Chip
                label={
                  equipFilter === "all"
                    ? t("picker.filters.compact.equipmentAll")
                    : t("picker.filters.compact.equipment", { v: String(equipFilter).toUpperCase() })
                }
                active={equipFilter !== "all"}
                onClick={() => setFiltersOpen(true)}
              />
              <Chip
                label={coreOnly ? t("picker.coreOnly.on") : t("picker.coreOnly.off")}
                active={coreOnly}
                onClick={() => setFiltersOpen(true)}
              />
            </div>

            <button
              onClick={() => setFiltersOpen(true)}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,59,59,0.35)",
                background: "rgba(255,59,59,0.10)",
                color: "var(--red)",
                cursor: "pointer",
                fontWeight: 900,
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
            >
              {t("picker.filters.button")}
            </button>
          </div>

          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            {t("picker.filters.viewNow", { n: String(filteredPool.length) })}
          </div>
        </div>
      )}

      {/* Advanced filters bottom sheet */}
      {mode === "browse" && filtersOpen && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFiltersOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "end center",
            padding: 10,
          }}
        >
          <div
            style={{
              width: "min(820px, 100%)",
              maxHeight: "78vh",
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "rgba(11,11,15,0.98)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
            }}
          >
            {/* Sheet header */}
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, color: "var(--text)" }}>{t("picker.filters.title")}</div>
              <button
                onClick={() => setFiltersOpen(false)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                {t("common.done")}
              </button>
            </div>

            {/* Sheet body */}
            <div style={{ padding: 12, overflow: "auto" }}>
              {/* Presets */}
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("picker.filters.presets").toUpperCase()}</div>
                  {!isSavingPreset ? (
                    <button
                      onClick={() => {
                        setIsSavingPreset(true);
                        setPresetName("");
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,59,59,0.35)",
                        background: "rgba(255,59,59,0.10)",
                        color: "var(--red)",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {t("picker.filters.savePreset")}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSavingPreset(false);
                        setPresetName("");
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--text)",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                  )}
                </div>

                {presets.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {presets.slice(0, 12).map((p) => {
                      const active = sameFilters(p.filters, currentFilters());
                      return <Chip key={p.id} label={p.name} active={active} onClick={() => applyPreset(p)} />;
                    })}
                  </div>
                )}

                {isSavingPreset && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder={t("picker.filters.presetNamePlaceholder")}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--text)",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={savePreset}
                      disabled={!presetName.trim()}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,59,59,0.35)",
                        background: presetName.trim() ? "rgba(255,59,59,0.10)" : "rgba(255,255,255,0.04)",
                        color: presetName.trim() ? "var(--red)" : "var(--muted)",
                        cursor: presetName.trim() ? "pointer" : "not-allowed",
                        fontWeight: 900,
                      }}
                    >
                      {t("common.save")}
                    </button>
                  </div>
                )}
              </div>

              {/* Category */}
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("picker.filters.category").toUpperCase()}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {([
                    [t("picker.category.all"), "all"],
                    [t("picker.category.push"), "push"],
                    [t("picker.category.pull"), "pull"],
                    [t("picker.category.legs"), "legs"],
                    [t("picker.core"), "core"],
                    [t("picker.category.neck"), "neck"],
                  ] as Array<[string, MovementCategory | "all"]>).map(([label, v]) => (
                    <Chip
                      key={v}
                      label={label}
                      active={catFilter === v}
                      onClick={() => {
                        setCatFilter(v);
                        if (query.trim()) clearQueryAndScrollTop();
                      }}
                    />
                  ))}
                  <Chip
                    label={coreOnly ? t("picker.coreOnly.on") : t("picker.coreOnly.off")}
                    active={coreOnly}
                    onClick={() => setCoreOnly((x) => !x)}
                  />
                </div>
              </div>

              {/* Muscle */}
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("picker.filters.muscle").toUpperCase()}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {([
                    [t("picker.muscle.all"), "all"],
                    [t("picker.muscle.chest"), "chest"],
                    [t("picker.muscle.shoulders"), "shoulders"],
                    [t("picker.muscle.triceps"), "triceps"],
                    [t("picker.muscle.back"), "back"],
                    [t("picker.muscle.biceps"), "biceps"],
                    [t("picker.muscle.forearms"), "forearms"],
                    [t("picker.muscle.quads"), "quads"],
                    [t("picker.muscle.hamstrings"), "hamstrings"],
                    [t("picker.muscle.glutes"), "glutes"],
                    [t("picker.muscle.calves"), "calves"],
                    [t("picker.muscle.abs"), "abs"],
                    [t("picker.muscle.other"), "other"],
                  ] as Array<[string, MuscleGroup | "all"]>).map(([label, v]) => (
                    <Chip key={v} label={label} active={muscleFilter === v} onClick={() => setMuscleFilter(v)} />
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{t("picker.filters.equipment").toUpperCase()}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {([
                    [t("picker.equipment.all"), "all"],
                    [t("picker.equipment.barbell"), "barbell"],
                    [t("picker.equipment.dumbbell"), "dumbbell"],
                    [t("picker.equipment.machine"), "machine"],
                    [t("picker.equipment.cable"), "cable"],
                    [t("picker.equipment.smith"), "smith"],
                    [t("picker.equipment.plateLoaded"), "plate_loaded"],
                    [t("picker.equipment.isoLateral"), "iso_lateral"],
                    [t("picker.equipment.converging"), "converging"],
                    [t("picker.equipment.bodyweight"), "bodyweight"],
                    [t("picker.equipment.other"), "other"],
                  ] as Array<[string, EquipmentTag | "all"]>).map(([label, v]) => (
                    <Chip key={v} label={label} active={equipFilter === v} onClick={() => setEquipFilter(v)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet footer */}
            <div
              style={{
                padding: 12,
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  resetFiltersToCategory("all");
                  setCoreOnly(false);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                {t("picker.clear")}
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,59,59,0.35)",
                  background: "rgba(255,59,59,0.10)",
                  color: "var(--red)",
                  cursor: "pointer",
                  fontWeight: 950,
                }}
              >
                {t("picker.done")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div ref={listRef} style={{ overflow: "auto", padding: 12, minHeight: 0 }}>
        {/* Search results always on top */}
        {query.trim() && (
          <>
            <SectionHeader title={t("picker.searchResults")} count={searchHits.length} />
            {searchHits.length === 0 ? (
              <div style={{ color: "var(--muted)", padding: 10 }}>{t("picker.noHits")}</div>
            ) : (
              <VirtualList
                scrollRef={listRef}
                items={searchHits}
                itemHeight={84}
                maxRender={600}
                getItemKey={(ex) => ex.id}
                renderItem={(ex) => (
                  <ExerciseRow
                    key={ex.id}
                    ex={ex}
                    isFavorite={favoriteIds.includes(ex.id)}
                    onToggleFavorite={() => toggleFavorite(ex.id)}
                    onPick={() => pickExercise(ex)}
                  />
                )}
              />
            )}
            {searchHits.length > 600 && (
              <div style={{ color: "var(--muted)", fontSize: 12, padding: 10 }}>
                {t("picker.topHitsNote")}
              </div>
            )}
          </>
        )}

        {/* Default mode sections (only when not searching) */}
        {!query.trim() && mode === "default" && (
          <>
            {favorites.length > 0 && (
              <>
                <SectionHeader title={t("picker.favorites")} count={favorites.length} />
                <div style={{ display: "grid", gap: 8 }}>
                  {favorites.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      isFavorite={true}
                      onToggleFavorite={() => toggleFavorite(ex.id)}
                      onPick={() => pickExercise(ex)}
                    />
                  ))}
                </div>
              </>
            )}

            {recents.length > 0 && (
              <>
                <SectionHeader title={t("picker.recents")} count={recents.length} />
                <div style={{ display: "grid", gap: 8 }}>
                  {recents.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      isFavorite={favoriteIds.includes(ex.id)}
                      onToggleFavorite={() => toggleFavorite(ex.id)}
                      onPick={() => pickExercise(ex)}
                    />
                  ))}
                </div>
              </>
            )}

            {core.length > 0 && (
              <>
                <SectionHeader title={t("picker.core")} count={core.length} />
                <div style={{ display: "grid", gap: 8 }}>
                  {core.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      isFavorite={favoriteIds.includes(ex.id)}
                      onToggleFavorite={() => toggleFavorite(ex.id)}
                      onPick={() => pickExercise(ex)}
                    />
                  ))}
                </div>
              </>
            )}

            <div style={{ padding: 10, color: "var(--muted)", fontSize: 12 }}>
              {t("picker.hintBrowseAll.prefix")} <b>{t("picker.browse")}</b>.
            </div>
          </>
        )}

        {/* Browse mode list (only when not searching) */}
        {!query.trim() && mode === "browse" && (
          <>
            <SectionHeader title={t("picker.browseAll")} count={browseAll.length} />
            <VirtualList
              scrollRef={listRef}
              items={browseAll}
              itemHeight={84}
              maxRender={2000}
              getItemKey={(ex) => ex.id}
              renderItem={(ex) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  isFavorite={favoriteIds.includes(ex.id)}
                  onToggleFavorite={() => toggleFavorite(ex.id)}
                  onPick={() => pickExercise(ex)}
                />
              )}
            />
          </>
        )}
      </div>
    </div>
  );

  if (effectiveVariant === "inline") {
    return (
      <div role="dialog" aria-modal="false" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        {Outer}
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
      {Outer}
    </div>
  );
}

