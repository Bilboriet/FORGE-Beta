# CSS Hygiene Audit - FORGE V1

Date: 2026-02-14

## Scope

Goal pipeline:

`src/main.tsx` -> `src/index.css` -> `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`

## A1) CSS files in `src/`

- `src/index.css`
- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/styles/components.css`

## A2) All CSS import locations

### TS/TSX/JS/JSX imports of `.css`

- `src/main.tsx:3` -> `import './index.css'`

No other TS/TSX/JS/JSX files import CSS.

### CSS `@import`

- `src/index.css:1` -> `@import "./styles/tokens.css";`
- `src/index.css:2` -> `@import "./styles/base.css";`
- `src/index.css:3` -> `@import "./styles/components.css";`

No `@import` found outside `src/index.css`.

## A3) Violations against hard rules

- Rule 1 (only `main.tsx` imports CSS): PASS
- Rule 2 (`index.css` only three ordered imports): PASS
- Rule 3 (tokens only in `tokens.css`, single `:root`): PASS
- Rule 4 (`base.css` has no `:root` or token declarations): PASS
- Rule 5 (`forge-surface` canonical, `forgeCard` single alias in one place): PASS

## B) Fixes applied

No pipeline fixes were required because the repository already satisfies the specified CSS hygiene rules.

Changes made:

- Added this audit file: `docs/css-hygiene-audit.md`

## C) Migration check (`forgeCard` vs `forge-surface`)

- `forgeCard` appears only in `src/styles/components.css` as alias selectors grouped with `.forge-surface`.
- Shared wrapper `src/components/WidgetFrame.tsx` uses `.forge-surface` and density modifiers.
- No component/page class usage requiring migration from `forgeCard` was found.

## D) Verification

Commands run:

1. TS/TSX/JS/JSX CSS-import audit excluding `src/main.tsx`:
   - `rg -n -F ".css'" src -g "*.ts" -g "*.tsx" -g "*.js" -g "*.jsx" -g "!main.tsx"`
   - `rg -n -F '.css"' src -g "*.ts" -g "*.tsx" -g "*.js" -g "*.jsx" -g "!main.tsx"`
   - Result: zero matches (exit code 1 from `rg` indicates no matches)

2. CSS `@import` audit:
   - `rg -n "@import" src -g "*.css"`
   - Result: only `src/index.css` lines 1-3

3. Build check:
   - `npm run build`
   - Result: PASS (Vite production build completed)
