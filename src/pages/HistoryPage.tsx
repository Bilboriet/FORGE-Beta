import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExerciseBlock, MuscleGroup, SetLog, WorkoutSession } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useForgeSettings } from "../hooks/useForgeSettings";
import { useT } from "../hooks/useT";
import { LS_KEYS } from "../constants";
import { estimate1RM, workoutVolume } from "../utils";
import { scoreExerciseName } from "../utils/exerciseSearch";
import { formatLoadCompactFromKg, formatWeightFromKg, parseWeightInputToKg, unitLabel } from "../units";

const E1RM_MAX_REPS = 12;

type RangeKey = "all" | "30" | "90" | "180";

type EditTarget = { blockId: string; setId: string };

function isoToDate(iso: string) {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function daysAgo(n: number) {
  const dt = new Date();
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - n);
  return dt;
}

function withinLastDays(dateISO: string, days: number) {
  const dt = isoToDate(dateISO);
  dt.setHours(0, 0, 0, 0);
  return dt >= daysAgo(days);
}

function fmtDate(iso: string) {
  // Keep ISO for V1 (consistent with LogPage). Later: locale.
  return iso;
}

function fmtPct(p: number) {
  if (!Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

function mgKey(g: MuscleGroup) {
  switch (g) {
    case "chest":
      return "mg.chest";
    case "back":
      return "mg.back";
    case "shoulders":
      return "mg.shoulders";
    case "biceps":
      return "mg.biceps";
    case "triceps":
      return "mg.triceps";
    case "quads":
      return "mg.quads";
    case "hamstrings":
      return "mg.hamstrings";
    case "glutes":
      return "mg.glutes";
    case "calves":
      return "mg.calves";
    case "abs":
      return "mg.abs";
    case "forearms":
      return "mg.forearms";
    case "other":
    default:
      return "mg.other";
  }
}

function sessionMuscleGroups(session: WorkoutSession): MuscleGroup[] {
  const set = new Set<MuscleGroup>();
  for (const b of session.exercises ?? []) {
    if (b.exercise?.muscleGroup) set.add(b.exercise.muscleGroup);
  }
  return [...set];
}

function sessionTopSet(session: WorkoutSession): { weightKg: number; reps: number } | null {
  let best: { weightKg: number; reps: number; e1rm: number } | null = null;

  for (const block of session.exercises ?? []) {
    for (const s of block.sets ?? []) {
      if ((s.kind ?? "work") !== "work") continue;
      const reps = Number(s.reps ?? 0);
      const weight = Number(s.weightKg ?? 0);
      if (reps <= 0 || weight <= 0) continue;
      if (reps > E1RM_MAX_REPS) continue;

      const e1 = estimate1RM(weight, reps) ?? 0;
      if (!best || e1 > best.e1rm) best = { weightKg: weight, reps, e1rm: e1 };
    }
  }

  return best ? { weightKg: best.weightKg, reps: best.reps } : null;
}

function bestE1RMInSession(session: WorkoutSession): number {
  let best = 0;
  for (const block of session.exercises ?? []) {
    for (const s of block.sets ?? []) {
      if ((s.kind ?? "work") !== "work") continue;
      const reps = Number(s.reps ?? 0);
      const weight = Number(s.weightKg ?? 0);
      if (reps <= 0 || weight <= 0) continue;
      if (reps > E1RM_MAX_REPS) continue;
      const e1 = estimate1RM(weight, reps) ?? 0;
      if (e1 > best) best = e1;
    }
  }
  return best;
}

function computeE1RMDeltaPct(current: WorkoutSession, prevSessions: WorkoutSession[]): number | null {
  // Compare the best e1RM of this session vs best historical best from older sessions
  const cur = bestE1RMInSession(current);
  if (cur <= 0) return null;

  let prevBest = 0;
  for (const s of prevSessions) {
    const b = bestE1RMInSession(s);
    if (b > prevBest) prevBest = b;
  }

  if (prevBest <= 0) return null;
  return ((cur - prevBest) / prevBest) * 100;
}

function countSets(session: WorkoutSession): number {
  let n = 0;
  for (const b of session.exercises ?? []) n += (b.sets ?? []).length;
  return n;
}

function SessionChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: active ? "1px solid rgba(255,59,59,0.35)" : "1px solid var(--border)",
        background: active ? "rgba(255,59,59,0.14)" : "rgba(255,255,255,0.04)",
        color: active ? "var(--red)" : "var(--text)",
        fontWeight: active ? 900 : 800,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "rgba(255,255,255,0.04)",
        color: "var(--text)",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="forgeInnerPlate"
      style={{
        padding: 10,
        display: "grid",
        gap: 4,
        minWidth: 0,
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
      <div style={{ color: "var(--text)", fontWeight: 900, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  units,
  e1rmDeltaPct,
  tr,
  onOpen,
  onEdit,
  onDelete,
}: {
  session: WorkoutSession;
  units: UnitSystem;
  e1rmDeltaPct: number | null;
  tr: (key: string) => string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const vol = workoutVolume(session);
  const exCount = session.exercises?.length ?? 0;
  const sets = countSets(session);
  const top = sessionTopSet(session);
  const groups = sessionMuscleGroups(session);

  const topLabel = top
    ? `${formatWeightFromKg(top.weightKg, units, 0)} ${unitLabel(units)} × ${top.reps}`
    : tr("history.value.none");

  const maxChips = 3;
  const shown = groups.slice(0, maxChips);
  const extra = Math.max(0, groups.length - shown.length);

  return (
    <div
      className="forge-surface forgeCardInner"
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      {/* Top */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{fmtDate(session.date)}</div>
          <div style={{ fontWeight: 900, fontSize: 16, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {session.title?.trim() ? session.title : tr("history.defaultWorkoutTitle")}
          </div>
        </div>

        <button
          onClick={onOpen}
          style={{
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontWeight: 800,
          }}
        >
          {tr("history.action.open")}
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <StatBox label={tr("history.stat.volume")} value={formatLoadCompactFromKg(vol, units)} />
        <StatBox label={tr("history.stat.topSet")} value={topLabel} />
        <StatBox label={tr("history.stat.exercises")} value={String(exCount)} />
      </div>

      {/* Meta */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: "var(--muted)", fontSize: 12 }}>
        <span>
          {tr("history.meta.e1rm")}: {e1rmDeltaPct == null ? tr("history.value.none") : fmtPct(e1rmDeltaPct)}
        </span>
        <span>
          {tr("history.meta.sets")}: {sets}
        </span>
      </div>

      {/* Muscle tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {shown.map((g) => (
          <Pill key={g}>{tr(mgKey(g))}</Pill>
        ))}
        {extra > 0 ? <Pill>{tr("history.meta.more").replace("{n}", String(extra))}</Pill> : null}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <button
          onClick={onEdit}
          style={{
            height: 32,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text)",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          {tr("history.action.edit")}
        </button>
        <button
          onClick={onDelete}
          style={{
            height: 32,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--red)",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          {tr("history.action.delete")}
        </button>
      </div>
    </div>
  );
}

function Overlay({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
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
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        alignItems: "start",
        justifyItems: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          width: "min(860px, 100%)",
          marginTop: 10,
          borderRadius: 18,
          border: "1px solid var(--border)",
          background: "rgba(12,12,14,0.98)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
          maxHeight: "calc(100vh - 24px)",
          overflow: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useLocalStorage<WorkoutSession[]>(LS_KEYS.sessions, []);
  const [settings] = useForgeSettings();
  const tr = useT();
  const units = settings?.units ?? "kg";
  const [range, setRange] = useState<RangeKey>("all");
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editingMeta, setEditingMeta] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const [editingSet, setEditingSet] = useState<EditTarget | null>(null);
  const [draftReps, setDraftReps] = useState<number>(0);
  const [draftWeightKg, setDraftWeightKg] = useState<number>(0);
  const [draftKind, setDraftKind] = useState<SetLog["kind"]>("work");
  const [draftRir, setDraftRir] = useState<string>("");
  const [draftSetNote, setDraftSetNote] = useState<string>("");

  const sortedAll = useMemo(() => {
    const arr = Array.isArray(sessions) ? sessions : [];
    return [...arr].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [sessions]);

  const filtered = useMemo(() => {
    let base = sortedAll;

    // Date filter (exact match on ISO date)
    const d = dateFilter.trim();
    if (d) {
      base = base.filter((s) => (s.date ?? "") === d);
    }

    if (range === "all") return base;
    const days = Number(range);
    return base.filter((s) => withinLastDays(s.date, days));
  }, [sortedAll, range, dateFilter]);

  const filteredBySearch = useMemo(() => {
    const q = exerciseQuery.trim();
    if (!q) return filtered;

    const hits = filtered
      .map((s) => {
        let best = 0;
        for (const b of s.exercises ?? []) {
          const name = b.exercise?.name ?? "";
          const sc = scoreExerciseName(name, q);
          if (sc > best) best = sc;
        }
        return { s, best };
      })
      .filter((x) => x.best > 0);

    hits.sort((a, b) => {
      if (b.best !== a.best) return b.best - a.best;
      return (b.s.date ?? "").localeCompare(a.s.date ?? "");
    });

    return hits.map((x) => x.s);
  }, [filtered, exerciseQuery]);


  const summary = useMemo(() => {
    const vol = filteredBySearch.reduce((sum, s) => sum + workoutVolume(s), 0);
    return { sessions: filteredBySearch.length, volume: vol };
  }, [filteredBySearch]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return sortedAll.find((s) => s.id === selectedId) ?? null;
  }, [sortedAll, selectedId]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setEditingMeta(false);
    setEditingSet(null);
    const s = sortedAll.find((x) => x.id === id);
    if (s) {
      setDraftDate(s.date ?? "");
      setDraftTitle(s.title ?? "");
      setDraftNote(s.note ?? "");
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setEditingMeta(false);
    setEditingSet(null);
  };

  const updateSessionMeta = () => {
    if (!selected) return;
    const next: WorkoutSession = {
      ...selected,
      date: draftDate || selected.date,
      title: draftTitle.trim() ? draftTitle.trim() : undefined,
      note: draftNote.trim() ? draftNote.trim() : undefined,
    };

    setSessions((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((s) => (s.id === selected.id ? next : s));
    });

    setEditingMeta(false);
  };

  const deleteSession = (id: string) => {
    const ok = window.confirm(tr("history.confirm.delete"));
    if (!ok) return;
    setSessions((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.filter((s) => s.id !== id);
    });
    if (selectedId === id) closeDetail();
  };

  const startEditSet = (blockId: string, set: SetLog) => {
    setEditingSet({ blockId, setId: set.id });
    setDraftReps(set.reps ?? 0);
    setDraftWeightKg(set.weightKg ?? 0);
    setDraftKind(set.kind ?? "work");
    setDraftRir(typeof set.rir === "number" ? String(set.rir) : "");
    setDraftSetNote(set.note ?? "");
  };

  const cancelEditSet = () => setEditingSet(null);

  const saveEditSet = () => {
    if (!selected || !editingSet) return;

    const nextRir = draftRir.trim() === "" ? undefined : Math.max(0, Math.min(10, Number(draftRir)));

    const nextSet: Partial<SetLog> = {
      reps: Math.max(0, Number(draftReps) || 0),
      weightKg: Math.max(0, Number(draftWeightKg) || 0),
      kind: draftKind,
      rir: typeof nextRir === "number" && Number.isFinite(nextRir) ? nextRir : undefined,
      note: draftSetNote.trim() ? draftSetNote.trim() : undefined,
    };

    const sessionId = selected.id;

    setSessions((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          exercises: (s.exercises ?? []).map((b) => {
            if (b.id !== editingSet.blockId) return b;
            return {
              ...b,
              sets: (b.sets ?? []).map((set) => (set.id === editingSet.setId ? { ...set, ...nextSet } : set)),
            };
          }),
        };
      });
    });

    setEditingSet(null);
  };

  const e1rmDeltas = useMemo(() => {
    // Precompute delta for each session vs older sessions (all-time)
    const chron = [...sortedAll].reverse(); // oldest -> newest
    const out = new Map<string, number | null>();
    const history: WorkoutSession[] = [];

    for (const sesh of chron) {
      const delta = computeE1RMDeltaPct(sesh, history);
      out.set(sesh.id, delta);
      history.push(sesh);
    }

    return out;
  }, [sortedAll]);

  useEffect(() => {
    const onTabChange = () => {
      setSelectedId(null);
      setEditingMeta(false);
      setEditingSet(null);
    };
    window.addEventListener("forge:tab-change", onTabChange as EventListener);
    return () => window.removeEventListener("forge:tab-change", onTabChange as EventListener);
  }, []);

  return (
    <div className="forgePage">
      {/* Range chips */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        <SessionChip active={range === "all"} label={tr("history.range.all")} onClick={() => setRange("all")} />
        <SessionChip active={range === "30"} label={tr("history.range.30d")} onClick={() => setRange("30")} />
        <SessionChip active={range === "90"} label={tr("history.range.90d")} onClick={() => setRange("90")} />
        <SessionChip active={range === "180"} label={tr("history.range.180d")} onClick={() => setRange("180")} />
      </div>

      {/* Exercise search */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 16, background: "rgba(255,255,255,0.03)", padding: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={exerciseQuery}
            onChange={(e) => setExerciseQuery(e.target.value)}
            placeholder={tr("history.search.placeholder")}
            style={{
              flex: 1,
              minWidth: 220,
              padding: "12px 12px",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label={tr("history.dateFilter.label")}
              style={{
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
                outline: "none",
                minWidth: 160,
              }}
            />

            {dateFilter ? (
              <button
                onClick={() => setDateFilter("")}
                title={tr("history.dateFilter.clear")}
                aria-label={tr("history.dateFilter.clear")}
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.02)",
                  color: "var(--text)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {tr("history.dateFilter.clearShort")}
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
          {tr("history.search.help")}
          {dateFilter ? (
            <span style={{ marginLeft: 8 }}>
              • {tr("history.dateFilter.active")} <span style={{ color: "var(--text)" }}>{dateFilter}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Summary strip */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 16,
          background: "rgba(255,255,255,0.03)",
          padding: "14px 14px",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "var(--text)", fontWeight: 900 }}>
          {tr("history.summary.title")
            .replace("{range}", range === "all" ? tr("history.summary.all") : `${range}d`)
            .replace("{n}", String(summary.sessions))}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {tr("history.summary.volume")}: {formatLoadCompactFromKg(summary.volume, units)}
        </div>
      </div>

      {/* Empty */}
      {filteredBySearch.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 14,
            background: "rgba(255,255,255,0.03)",
            color: "var(--muted)",
          }}
        >
          {tr("history.empty")}
        </div>
      ) : null}

      {/* List */}
      <div style={{ display: "grid", gap: 12 }}>
        {filteredBySearch.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            units={units}
            e1rmDeltaPct={e1rmDeltas.get(s.id) ?? null}
            tr={tr}
            onOpen={() => openDetail(s.id)}
            onEdit={() => {
              openDetail(s.id);
              setEditingMeta(true);
            }}
            onDelete={() => deleteSession(s.id)}
          />
        ))}
      </div>

      {/* Detail overlay */}
      <Overlay open={!!selected} onClose={closeDetail}>
        {selected ? (
          <div style={{ padding: 14, display: "grid", gap: 12 }}>
            {/* Top bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.6 }}>{tr("history.detail.session")}</div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{selected.title?.trim() ? selected.title : tr("history.defaultWorkoutTitle")}</div>
              </div>
              <button
                onClick={closeDetail}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                {tr("history.action.close")}
              </button>
            </div>

            {/* Meta card */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 14,
                background: "rgba(255,255,255,0.03)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDate(selected.date)}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {tr("history.stat.volume")}: {formatLoadCompactFromKg(workoutVolume(selected), units)}
                    {bestE1RMInSession(selected) > 0
                      ? ` • ${tr("history.detail.bestE1rm")}: ${formatWeightFromKg(bestE1RMInSession(selected), units, 0)} ${unitLabel(units)}`
                      : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      setEditingMeta((v) => !v);
                      setEditingSet(null);
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text)",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    {editingMeta ? tr("history.action.cancel") : tr("history.action.edit")}
                  </button>

                  <button
                    onClick={() => deleteSession(selected.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--red)",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    {tr("history.action.delete")}
                  </button>
                </div>
              </div>

              {selected.note ? (
                <div style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "pre-wrap" }}>{selected.note}</div>
              ) : null}

              {editingMeta ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{tr("history.field.date")}</div>
                    <input
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--text)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{tr("history.field.title")}</div>
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder={tr("history.field.titlePlaceholder")}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--text)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{tr("history.field.note")}</div>
                    <textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--text)",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={updateSessionMeta}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,59,59,0.35)",
                        background: "rgba(255,59,59,0.16)",
                        color: "var(--red)",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      {tr("history.action.save")}
                    </button>

                    <button
                      onClick={() => setEditingMeta(false)}
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
                      {tr("history.action.cancel")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Exercises */}
            <div style={{ display: "grid", gap: 12 }}>
              {(selected.exercises ?? []).map((b: ExerciseBlock) => (
                <div
                  key={b.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 14,
                    background: "rgba(255,255,255,0.03)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{b.exercise?.name ?? tr("history.value.exercise")}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{formatLoadCompactFromKg(b.sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightKg ?? 0), 0), units)}</div>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {(b.sets ?? []).map((set) => {
                      const isEditing = editingSet?.blockId === b.id && editingSet?.setId === set.id;
                      const row = (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 10,
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 14,
                            border: "1px solid var(--border)",
                            background: "rgba(255,255,255,0.04)",
                          }}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: "var(--text)", fontWeight: 850 }}>
                            <span>{formatWeightFromKg(set.weightKg ?? 0, units, 1)} {unitLabel(units)}</span>
                            <span style={{ color: "var(--muted)", fontWeight: 800 }}>×</span>
                            <span>
                              {tr("history.set.reps").replace("{n}", String(set.reps ?? 0))}
                            </span>
                            {typeof set.rir === "number" ? (
                              <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                                {tr("history.set.rir").replace("{n}", String(set.rir))}
                              </span>
                            ) : null}
                            {set.kind === "warmup" ? (
                              <span style={{ color: "var(--muted)", fontWeight: 800 }}>{tr("history.set.warmup")}</span>
                            ) : null}
                          </div>
                          <button
                            onClick={() => startEditSet(b.id, set)}
                            style={{
                              height: 32,
                              padding: "0 12px",
                              borderRadius: 12,
                              border: "1px solid var(--border)",
                              background: "rgba(255,255,255,0.04)",
                              color: "var(--text)",
                              cursor: "pointer",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tr("history.action.edit")}
                          </button>
                        </div>
                      );

                      if (!isEditing) return <div key={set.id}>{row}</div>;

                      return (
                        <div key={set.id} style={{ display: "grid", gap: 8 }}>
                          {row}

                          <div
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 16,
                              background: "rgba(255,255,255,0.03)",
                              padding: 12,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                                  {tr("history.editSet.weight")} ({unitLabel(units)})
                                </div>
                                <input
                                  inputMode="numeric"
                                  value={formatWeightFromKg(draftWeightKg, units, 1)}
                                  onChange={(e) => {
                                    const kg = parseWeightInputToKg(e.target.value, units);
                                    setDraftWeightKg(kg ?? 0);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 14,
                                    border: "1px solid var(--border)",
                                    background: "rgba(255,255,255,0.04)",
                                    color: "var(--text)",
                                    outline: "none",
                                  }}
                                />
                              </div>

                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ color: "var(--muted)", fontSize: 12 }}>{tr("history.editSet.reps")}</div>
                                <input
                                  inputMode="numeric"
                                  value={String(draftReps)}
                                  onChange={(e) => setDraftReps(Number(e.target.value) || 0)}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 14,
                                    border: "1px solid var(--border)",
                                    background: "rgba(255,255,255,0.04)",
                                    color: "var(--text)",
                                    outline: "none",
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ color: "var(--muted)", fontSize: 12 }}>{tr("history.editSet.kind")}</div>
                                <select
                                  value={draftKind}
                                  onChange={(e) => setDraftKind(e.target.value as SetLog["kind"])}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 14,
                                    border: "1px solid var(--border)",
                                    background: "rgba(255,255,255,0.04)",
                                    color: "var(--text)",
                                    outline: "none",
                                  }}
                                >
                                  <option value="work">{tr("history.editSet.kind.work")}</option>
                                  <option value="warmup">{tr("history.editSet.kind.warmup")}</option>
                                </select>
                              </div>

                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ color: "var(--muted)", fontSize: 12 }}>{tr("history.editSet.rir")}</div>
                                <input
                                  inputMode="numeric"
                                  value={draftRir}
                                  onChange={(e) => setDraftRir(e.target.value)}
                                  placeholder={tr("history.value.optional")}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 14,
                                    border: "1px solid var(--border)",
                                    background: "rgba(255,255,255,0.04)",
                                    color: "var(--text)",
                                    outline: "none",
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ color: "var(--muted)", fontSize: 12 }}>{tr("history.field.note")}</div>
                              <textarea
                                value={draftSetNote}
                                onChange={(e) => setDraftSetNote(e.target.value)}
                                rows={2}
                                placeholder={tr("history.value.optional")}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  borderRadius: 14,
                                  border: "1px solid var(--border)",
                                  background: "rgba(255,255,255,0.04)",
                                  color: "var(--text)",
                                  outline: "none",
                                  resize: "vertical",
                                }}
                              />
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={saveEditSet}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 14,
                                  border: "1px solid rgba(255,59,59,0.35)",
                                  background: "rgba(255,59,59,0.16)",
                                  color: "var(--red)",
                                  cursor: "pointer",
                                  fontWeight: 900,
                                }}
                              >
                                {tr("history.action.save")}
                              </button>
                              <button
                                onClick={cancelEditSet}
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
                                {tr("history.action.cancel")}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Overlay>
    </div>
  );
}
