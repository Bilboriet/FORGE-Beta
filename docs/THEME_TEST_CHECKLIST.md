# Theme Test Checklist (V2 Design Lab)

Use this checklist when testing `baseNeutral` and `plasmaRed` in the design branch.

## Pages
- Dashboard
- Log
- Analytics
- Diet
- Settings
- Auth screens (`/auth/callback` and related auth states)

## Components
- Global Header (texture readability, seam/glow restraint)
- BottomNav (active/inactive states and safe-area spacing)
- Buttons and chips (`forge-btn`, active/disabled/focus)
- Inputs/selects/textareas (default, focus, disabled)
- Cards/surfaces (`forge-surface` / `forgeCard`)
- Charts (line/bar labels, grid readability, highlights)
- Modals/sheets and overlays

## Contrast and States
- Body text vs. background is readable on all pages
- Muted text remains readable (not too dim)
- Disabled buttons/inputs are distinct but legible
- Error/success affordances remain clear
- Focus ring is visible on keyboard navigation

## Safe-Area and Layout
- iOS safe-area top: header spacing remains correct
- iOS safe-area bottom: bottom nav spacing remains correct
- No content overlap with fixed header or bottom nav

## Visual Direction Guardrails
- Avoid a neon/gamer look
- Keep a high-tech forge feel: restrained heat, industrial contrast, clear hierarchy
