# Structure Audit - FORGE V1

Date: 2026-02-14

## A) src folders

- src/assets
- src/components
- src/components/charts
- src/components/layout
- src/components/ui
- src/exercises
- src/hooks
- src/pages
- src/styles
- src/utils

## B) Duplicate basenames

Detected duplicates by filename:

1. `types.ts` (x2)
- `src/types.ts`
- `src/exercises/types.ts`

Assessment:
- Not a runtime duplicate of responsibility.
- `src/types.ts` is app-level shared types.
- `src/exercises/types.ts` is exercise-domain module types.

## C) Same-responsibility duplicates (name differs)

1. `ShortcutsBar.tsx` vs `QuickActionsBar.tsx`
- `src/components/layout/QuickActionsBar.tsx` contains the implementation.
- `src/components/layout/ShortcutsBar.tsx` is a thin compatibility re-export.
- Decision: KEEP both (no behavior change, backward-safe import surface).

2. Modal family
- Base shell: `src/components/ui/Modal.tsx`
- Feature wrappers: `src/components/ui/ExercisePickerModal.tsx`, `src/components/ui/MealLogModal.tsx`, `src/components/ui/SleepLogModal.tsx`
- Decision: KEEP (composition, not duplication).

## D) Decisions (KEEP / MOVE / MERGE / DELETE)

### KEEP

- `src/components/ui/*` as UI primitives.
- `src/components/layout/*` as layout/app shell components.
- `src/components/charts/*` as chart/visual components.
- `src/pages/*` page-only.
- `src/hooks/*` hook-only.
- `src/utils/*` util-only.
- `src/styles/*` untouched CSS pipeline.
- `src/constants.ts` single constants source.
- `src/types.ts` single app-level types source.

### MOVE

- None needed in current state (already matches target structure).

### MERGE

- None needed in current state.

### DELETE

- None needed in current state.

## E) Verification

1. Build
- Command: `npm run build`
- Result: PASS

2. Shared UI primitive basename uniqueness
- `WidgetFrame.tsx`: 1
- `WidgetBoard.tsx`: 1
- `Modal.tsx`: 1
- `BottomNav.tsx`: 1
- `ExercisePickerModal.tsx`: 1
- `MealLogModal.tsx`: 1
- `SleepLogModal.tsx`: 1
- `ConsistencyHeatmap.tsx`: 1
- `MiniLineChart.tsx`: 1
- `MiniPieChart.tsx`: 1

3. Circular dependency risk
- No runtime/build evidence of circular dependency issues after import resolution.
