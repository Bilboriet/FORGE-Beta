// src/components/WidgetBoard.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useT } from "../../hooks/useT";
import type { PageLayoutV1, WidgetLayoutState } from "../../types";
import { WidgetFrame } from "../ui/WidgetFrame";

export type WidgetDef = {
  id: string;
  title: string;
  subtitle?: string;

  render: () => ReactNode;
  renderMin?: () => ReactNode;
  useFrame?: boolean;

  defaultCollapsed?: boolean;
  defaultMinimized?: boolean;
  defaultHidden?: boolean;

  // layout affordances
  canWiden?: boolean; // used as a "detail/expanded" toggle in guided mode
};

export type WidgetPreset = {
  id: string;
  label: string;
  build: (defs: WidgetDef[]) => PageLayoutV1;
};

function buildDefaultLayout(defs: WidgetDef[]): PageLayoutV1 {
  return {
    version: 1,
    widgets: defs.map((d, i) => ({
      id: d.id,
      order: i,
      hidden: d.defaultHidden ?? false,
      collapsed: d.defaultCollapsed ?? false,
      minimized: d.defaultMinimized ?? false,
      wide: false,
    })),
  };
}

function normalizeLayout(defs: WidgetDef[], layoutInput: any): PageLayoutV1 {
  // Be robust to legacy / corrupted localStorage values.
  // Accept:
  //  - PageLayoutV1 { version, widgets: [...] }
  //  - WidgetLayoutState[] (legacy)
  //  - { widgets: { [id]: WidgetLayoutState } } (legacy)
  //  - null/undefined/other -> defaults
  let rawWidgets: any[] = [];

  if (Array.isArray(layoutInput)) {
    rawWidgets = layoutInput;
  } else if (layoutInput && typeof layoutInput === "object") {
    const maybeWidgets = (layoutInput as any).widgets;
    if (Array.isArray(maybeWidgets)) rawWidgets = maybeWidgets;
    else if (maybeWidgets && typeof maybeWidgets === "object")
      rawWidgets = Object.values(maybeWidgets);
    else rawWidgets = [];
  } else {
    rawWidgets = [];
  }

  const safeWidgets: WidgetLayoutState[] = rawWidgets
    .filter((w) => w && typeof w === "object" && typeof (w as any).id === "string")
    .map((w, i) => {
      const id = String((w as any).id);
      const order =
        typeof (w as any).order === "number" && Number.isFinite((w as any).order)
          ? (w as any).order
          : i;
      return {
        id,
        order,
        hidden: !!(w as any).hidden,
        collapsed: !!(w as any).collapsed,
        minimized: !!(w as any).minimized,
        wide: !!(w as any).wide,
      };
    });

  const byId = new Map<string, WidgetLayoutState>(safeWidgets.map((w) => [w.id, w]));

  const next: WidgetLayoutState[] = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const w = byId.get(d.id);
    next.push({
      id: d.id,
      order: w?.order ?? i,
      hidden: w?.hidden ?? d.defaultHidden ?? false,
      collapsed: w?.collapsed ?? d.defaultCollapsed ?? false,
      minimized: w?.minimized ?? d.defaultMinimized ?? false,
      wide: w?.wide ?? false,
    });
  }

  // Sort by order and reindex to keep it deterministic
  next.sort((a, b) => a.order - b.order);
  next.forEach((w, idx) => (w.order = idx));

  return { version: 1, widgets: next };
}

function SortableWidget({
  def,
  state,
  onPatch,
  enabled,
  dragFromWholeCard,
  isMobile,
}: {
  def: WidgetDef;
  state: WidgetLayoutState;
  onPatch: (id: string, patch: Partial<WidgetLayoutState>) => void;
  enabled: boolean;
  dragFromWholeCard: boolean;
  isMobile: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: def.id, disabled: !enabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: "100%",
        minWidth: 0,
        // Keep page scrolling natural on mobile. The long-press behavior is handled
        // by dnd-kit activationConstraint (delay), not by blocking touch actions.
        touchAction: "pan-y",
      }}
    >
      {def.useFrame === false ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            cursor: dragFromWholeCard && enabled ? "grab" : undefined,
          }}
          {...(dragFromWholeCard && enabled ? attributes : {})}
          {...(dragFromWholeCard && enabled ? listeners : {})}
        >
          {!dragFromWholeCard && enabled ? (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                aria-label="Drag widget"
                title="Drag widget"
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: "6px 8px",
                  cursor: "grab",
                }}
                {...attributes}
                {...listeners}
              >
                DRAG
              </button>
            </div>
          ) : null}
          {def.render()}
        </div>
      ) : (
        <WidgetFrame
          title={def.title}
          subtitle={def.subtitle}
          collapsed={!!state.collapsed}
          minimized={isMobile ? false : !!state.minimized}
          onToggleCollapsed={() => onPatch(def.id, { collapsed: !state.collapsed })}
          onToggleMinimized={
            isMobile ? () => {} : () => onPatch(def.id, { minimized: !state.minimized })
          }
          onHide={() => onPatch(def.id, { hidden: true })}
          canWiden={!!def.canWiden}
          wide={!!state.wide}
          onToggleWide={
            def.canWiden ? () => onPatch(def.id, { wide: !state.wide }) : undefined
          }
          // Only arm drag props when customize is enabled.
          dragHandleAttributes={!dragFromWholeCard && enabled ? attributes : undefined}
          dragHandleListeners={!dragFromWholeCard && enabled ? listeners : undefined}
          rootDragAttributes={dragFromWholeCard && enabled ? attributes : undefined}
          rootDragListeners={dragFromWholeCard && enabled ? listeners : undefined}
          isDragging={isDragging}
          minimizedView={isMobile ? undefined : def.renderMin?.()}
        >
          {def.render()}
        </WidgetFrame>
      )}
    </div>
  );
}

function StaticWidget({
  def,
  state,
  onPatch,
  isMobile,
}: {
  def: WidgetDef;
  state: WidgetLayoutState;
  onPatch: (id: string, patch: Partial<WidgetLayoutState>) => void;
  isMobile: boolean;
}) {
  return (
    <div style={{ width: "100%", minWidth: 0, touchAction: "pan-y" }}>
      {def.useFrame === false ? (
        def.render()
      ) : (
        <WidgetFrame
          title={def.title}
          subtitle={def.subtitle}
          collapsed={!!state.collapsed}
          minimized={isMobile ? false : !!state.minimized}
          onToggleCollapsed={() => onPatch(def.id, { collapsed: !state.collapsed })}
          onToggleMinimized={
            isMobile ? () => {} : () => onPatch(def.id, { minimized: !state.minimized })
          }
          onHide={() => onPatch(def.id, { hidden: true })}
          canWiden={!!def.canWiden}
          wide={!!state.wide}
          onToggleWide={
            def.canWiden ? () => onPatch(def.id, { wide: !state.wide }) : undefined
          }
          dragHandleAttributes={undefined}
          dragHandleListeners={undefined}
          rootDragAttributes={undefined}
          rootDragListeners={undefined}
          isDragging={false}
          minimizedView={isMobile ? undefined : def.renderMin?.()}
        >
          {def.render()}
        </WidgetFrame>
      )}
    </div>
  );
}

export function WidgetBoard({
  storageKey,
  defs,
  presets,
  presetLabel,
}: {
  storageKey: string;
  defs: WidgetDef[];
  presets?: WidgetPreset[];
  presetLabel?: string;
}) {
  const t = useT();
  const effectivePresetLabel = presetLabel ?? t("widgets.views");
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 640px)")?.matches ?? false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia?.("(max-width: 640px)");
    if (!m) return;
    const handler = () => setIsMobile(m.matches);
    handler();
    // support older safari
    if (typeof m.addEventListener === "function") m.addEventListener("change", handler);
    else (m as any).addListener?.(handler);
    return () => {
      if (typeof m.removeEventListener === "function") m.removeEventListener("change", handler);
      else (m as any).removeListener?.(handler);
    };
  }, []);
  const [layout, setLayout] = useLocalStorage<PageLayoutV1>(
    storageKey,
    buildDefaultLayout(defs)
  );

  const normalized = useMemo(() => normalizeLayout(defs, layout), [defs, layout]);

  const layoutWidgetCount = Array.isArray((layout as any)?.widgets)
    ? (layout as any).widgets.length
    : -1;

  // Keep storage layout normalized (prevents drift after adding/removing widgets)
  useEffect(() => {
    if (layoutWidgetCount !== normalized.widgets.length) setLayout(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutWidgetCount, normalized.widgets.length]);

  const byId = useMemo(() => {
    const m = new Map<string, WidgetLayoutState>();
    for (const w of normalized.widgets) m.set(w.id, w);
    return m;
  }, [normalized]);

  const orderedIds = useMemo(() => normalized.widgets.map((w) => w.id), [normalized]);
  const visibleIds = useMemo(
    () => normalized.widgets.filter((w) => !w.hidden).map((w) => w.id),
    [normalized]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile
        ? { delay: 700, tolerance: 8 } // hold-to-drag
        : { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 700, tolerance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const [showCustomize, setShowCustomize] = useState(false);

  // On mobile we hide the top bar for space, so we need a way to enter
  // customize mode (reorder/hide) via a floating action button.
  const toggleCustomize = () => setShowCustomize((v) => !v);

  function patch(id: string, patch: Partial<WidgetLayoutState>) {
    setLayout((prev) => {
      const next = normalizeLayout(defs, prev);
      const idx = next.widgets.findIndex((w) => w.id === id);
      if (idx === -1) return next;
      next.widgets[idx] = { ...next.widgets[idx], ...patch };
      return { ...next, widgets: [...next.widgets] };
    });
  }

  function setOrder(ids: string[]) {
    setLayout((prev) => {
      const next = normalizeLayout(defs, prev);
      const map = new Map(ids.map((id, i) => [id, i]));
      next.widgets.forEach((w) => {
        const n = map.get(w.id);
        if (typeof n === "number") w.order = n;
      });
      next.widgets.sort((a, b) => a.order - b.order);
      next.widgets.forEach((w, i) => (w.order = i));
      return { ...next, widgets: [...next.widgets] };
    });
  }

  function applyPreset(p: WidgetPreset) {
    setLayout(p.build(defs));
    setShowCustomize(false);
  }

  const hiddenDefs = defs.filter((d) => (byId.get(d.id)?.hidden ?? false) === true);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* top bar */}
      <div className="widgetboard-topbar" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {presets?.length ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{effectivePresetLabel}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className="forge-chip forge-chip--inactive"
                    style={{
                      minHeight: 30,
                    }}
                    title={p.label}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button
          onClick={toggleCustomize}
          className={`forge-chip ${showCustomize ? "forge-chip--active" : "forge-chip--inactive"}`}
          style={{
            minHeight: 30,
            whiteSpace: "nowrap",
          }}
          title={t("widgets.customize.hint")}
        >
          {showCustomize ? t("common.done") : t("common.customize")}
        </button>
      </div>

      {/* Mobile floating customize button (since the top bar is hidden on mobile) */}
      {isMobile ? (
        <button
          onClick={toggleCustomize}
          className={`forge-btn forge-btn--sm ${showCustomize ? "forge-btn--hot" : "forge-btn--metal"}`}
          style={{
            position: "fixed",
            right: 16,
            bottom: 84, // above bottom nav
            zIndex: 50,
            minHeight: 40,
            padding: "0 14px",
            borderRadius: 999,
          }}
          aria-label={showCustomize ? t("widgets.customize.doneAria") : t("widgets.customize.aria")}
          title={showCustomize ? t("common.done") : t("common.customize")}
        >
          {showCustomize ? t("common.done") : t("common.customize")}
        </button>
      ) : null}

      {/* hidden list (restore) */}
      {showCustomize && hiddenDefs.length ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            padding: 10,
            background: "rgba(0,0,0,0.20)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
            Hidden
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {hiddenDefs.map((d) => (
              <button
                key={d.id}
                onClick={() => patch(d.id, { hidden: false })}
                className="forge-chip forge-chip--inactive"
                style={{
                  minHeight: 30,
                }}
              >
                + {d.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/*
        Normal mode: do NOT mount DnD at all.
        This prevents sensors from swallowing taps/clicks inside widgets.
      */}
      {!showCustomize ? (
        <div style={{ display: "grid", gap: 12 }}>
          {visibleIds.map((id) => {
            const def = defs.find((d) => d.id === id);
            const state = byId.get(id);
            if (!def || !state) return null;
            return (
              <StaticWidget
                key={id}
                def={def}
                state={state}
                onPatch={patch}
                isMobile={isMobile}
              />
            );
          })}
        </div>
      ) : (
        // Customize mode: mount DnD and enable drag/reorder.
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => {
            const { active, over } = e;
            if (!over || active.id === over.id) return;
            const oldIndex = visibleIds.indexOf(String(active.id));
            const newIndex = visibleIds.indexOf(String(over.id));
            if (oldIndex === -1 || newIndex === -1) return;
            const visibleReordered = arrayMove(visibleIds, oldIndex, newIndex);
            const hiddenIds = orderedIds.filter((id) => !visibleReordered.includes(id));
            setOrder([...visibleReordered, ...hiddenIds]);
          }}
        >
          <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
            <div style={{ display: "grid", gap: 12 }}>
              {visibleIds.map((id) => {
                const def = defs.find((d) => d.id === id);
                const state = byId.get(id);
                if (!def || !state) return null;
                return (
                  <SortableWidget
                    key={id}
                    def={def}
                    state={state}
                    onPatch={patch}
                    enabled={true}
                    dragFromWholeCard={isMobile}
                    isMobile={isMobile}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

