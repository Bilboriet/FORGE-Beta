# CSS Audit - FORGE V1

Date: 2026-02-14

## A) CSS files that can affect global styling

Scanned `.css` files in `src`:

- `src/index.css`
- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/styles/components.css`
- `src/App.css`

Global-impact files after consolidation target:

- `src/styles/tokens.css` (tokens only)
- `src/styles/base.css` (baseline only)
- `src/styles/components.css` (surface engine + component classes)
- `src/index.css` (import hub only)

## B) All CSS imports and @import chains

TS/TSX/JS/JSX imports:

- `src/main.tsx` line 3: `import './index.css'`

CSS `@import` statements:

- `src/index.css` line 1: `@import "./styles/tokens.css";`
- `src/index.css` line 2: `@import "./styles/base.css";`
- `src/index.css` line 3: `@import "./styles/components.css";`

Result: one global entry path (`main.tsx` -> `index.css` -> `tokens/base/components`).

## C) Duplicate/conflict checks

Checked for:

- multiple `:root` blocks
- body/html/root styling spread across files
- multiple `.forgeCard` definitions
- token declarations outside `tokens.css`

Findings:

- `:root`: single block in `src/styles/tokens.css` only.
- html/body/#root baseline: only in `src/styles/base.css`.
- `.forgeCard`: only in `src/styles/components.css`, implemented as alias with `.forge-surface` selectors.
- Token variables (`--*`): defined in `src/styles/tokens.css`; no token blocks found in `base.css` or `components.css`.

## D) Dead CSS files

- `src/App.css` is not imported anywhere.
- Action taken: removed `src/App.css` because it was unused and overlapped behavior now covered in `components.css` (`button { -webkit-tap-highlight-color: transparent; }`).

## E) Surface engine and migration status

- Canonical base class: `.forge-surface` in `src/styles/components.css`.
- Legacy alias: `.forgeCard` kept, mapped in the same selector groups and therefore non-divergent.
- Density variants present:
  - `.forge-surface--tight`
  - `.forge-surface--base`
  - `.forge-surface--roomy`
- Shared wrapper migration:
  - `src/components/WidgetFrame.tsx` uses `.forge-surface` + density variants.
- Dashboard comments updated to refer to `forge-surface` terminology.

## Verification checklist

- [x] Single global import entry (`src/main.tsx` -> `src/index.css`)
- [x] `src/index.css` only imports `tokens -> base -> components`
- [x] Tokens only in `src/styles/tokens.css`
- [x] `.forge-surface` is base class
- [x] `.forgeCard` alias exists in one place only
- [x] No other CSS imports from components/pages
- [x] Build run completed: `npm run build` passed (Vite production build)
