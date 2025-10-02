# Phase 0 — Component Audit & Mapping (Design Example → Frontend)

This document inventories the design-example components/layouts and maps them to the current frontend implementation. It also notes parity and the minimal, non-breaking actions required to reskin while preserving all APIs, routes, and logic.

## 1) Theming & Utilities Inventory

- **Design tokens (HSL CSS variables)**: `web/design-example/src/index.css` defines `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, and dark variants.
- **Frontend tokens (Tailwind v4 @theme + HSL bridge)**: `frontend/src/index.css` defines `--color-…` tokens mapped to the same HSL variables, enabling semantic classes like `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`, etc. Glass utilities (`glass-card`, gradients) are also present.
- **Tailwind config**:
  - Design example: `web/design-example/tailwind.config.ts` extends colors from HSL variables.
  - Frontend: `frontend/tailwind.config.js` retains historical scales (primary, accent, etc.) and custom radii/shadows/z-index. v4 works primarily from `@theme` in CSS; existing config can remain (non-breaking). No change required now.
- **Utilities**:
  - **cn helper**: `frontend/src/utils/cn.ts` present; matches design-example utility purpose.
  - **cva**: Used in the example; optional in frontend. We’ll avoid introducing unless needed to keep changes minimal.

## 2) Layouts Mapping

- **Header**
  - **Design**: `web/design-example/src/components/layout/Header.tsx`
  - **Frontend**: `frontend/src/layouts/AdminHeader.tsx`
  - **Parity**: 100% (unchanged per plan)
  - **Action**: None

- **Sidebar**
  - **Design**: `web/design-example/src/components/layout/Sidebar.tsx`
  - **Frontend**: `frontend/src/components/Sidebar.tsx`
  - **Parity**: ~60–70% (collapse/expand, glass surface, active state present; paths differ intentionally)
  - **Action**: Finish polishing spacing/hover/active styles, ensure icon sizing, borders/hover, and transitions match. Keep routes/labels as-is.

- **Backend Shell (content layout + paddings)**
  - **Design**: Sidebar fixed at `top-16`, content offset `pl-16`/`pl-64`
  - **Frontend**: `frontend/src/layouts/BackendShell.tsx`
  - **Parity**: ~90% (uses `content-surface`, toggled paddings, sticky header)
  - **Action**: Minor spacing/padding polish if needed after Sidebar parity.

## 3) Core UI Components Mapping

- **Button**
  - **Design**: `web/design-example/src/components/ui/button.tsx` (cva variants, semantic tokens)
  - **Frontend**: `frontend/src/components/ui/Button.tsx`
  - **Parity**: ~70%
  - **Action**: Ensure semantic classes only (bg-primary, text-primary-foreground, ring-ring, ring-offset-background). Confirm sizes and focus-visible rings match. Keep current prop API.

- **Input**
  - **Design**: `input.tsx` uses semantic tokens + mode-aware styling
  - **Frontend**: `frontend/src/components/ui/Input.tsx`
  - **Parity**: ~60%
  - **Action**: Replace hardcoded gray palette with `bg-background`, `text-foreground`, `border-border`, `focus:ring-ring`, `focus:border-primary` equivalents; error uses destructive tokens. Keep label/error props.

- **Card**
  - **Design**: `card.tsx` + `glass-card` utility
  - **Frontend**: `frontend/src/components/ui/Card.tsx`
  - **Parity**: ~80% (already uses `glass-card`)
  - **Action**: Verify borders/spacings use semantic tokens. Keep API.

- **Badge**
  - **Design**: `badge.tsx` semantic foreground/accents
  - **Frontend**: `frontend/src/components/ui/Badge.tsx`
  - **Parity**: ~70%
  - **Action**: Map variants to tokens (success/warning/danger/info → themed backgrounds/foregrounds). Keep API.

- **Checkbox**
  - **Design**: `checkbox.tsx` styled with tokens
  - **Frontend**: `frontend/src/components/ui/Checkbox.tsx`
  - **Parity**: ~70%
  - **Action**: Update focus ring to `ring-ring`, border to `border-border`, checked state to `bg-primary text-primary-foreground`. Keep API.

- **Select**
  - **Design**: `select.tsx`
  - **Frontend**: `frontend/src/components/ui/Select.tsx`
  - **Parity**: ~80% (already uses bg/background/border tokens)
  - **Action**: Confirm focus ring colors; align error color to destructive tokens.

- **Switch**
  - **Design**: `switch.tsx`
  - **Frontend**: `frontend/src/components/ui/Switch.tsx`
  - **Parity**: ~75%
  - **Action**: Ensure track/knob colors use tokens and focus ring uses `ring-ring`.

- **Tooltip**
  - **Design**: `tooltip.tsx`
  - **Frontend**: `frontend/src/components/ui/Tooltip.tsx`
  - **Parity**: ~70%
  - **Action**: Ensure background/foreground use semantic tokens; spacing/shadow polish.

- **Drawer / Sheet**
  - **Design**: `sheet.tsx` / `drawer.tsx`
  - **Frontend**: `frontend/src/components/ui/Drawer.tsx`
  - **Parity**: ~85% (HeadlessUI-based, uses `glass-card`)
  - **Action**: Visual polish only.

- **Dialog / Modal**
  - **Design**: `dialog.tsx`
  - **Frontend**: `frontend/src/components/ui/Modal.tsx`
  - **Parity**: ~85% (`glass-card`, focus/close affordances)
  - **Action**: Minor polish; keep API.

- **Table**
  - **Design**: `table.tsx` using semantic tokens
  - **Frontend**: `frontend/src/components/ui/Table.tsx`
  - **Parity**: ~60% (hardcoded grays)
  - **Action**: Replace `gray-*` with `muted/foreground/border` tokens; hover/background/focus states to tokens. Keep API.

- **Toast**
  - **Design**: `toast.tsx` + `toaster.tsx` + `use-toast.ts`
  - **Frontend**: `frontend/src/components/ui/Toast.tsx` (store-based)
  - **Parity**: ~70%
  - **Action**: Ensure surfaces/borders use semantic tokens; keep store API.

- **Other example-only components (not present in frontend)**
  - Accordion, Breadcrumb (example variant), Menubar, Pagination, Tabs, Avatar, etc. — Not required for reskin unless explicitly adopted. We’ll avoid adding unless a page needs them.

## 4) Pages Inventory (for later polish)

- Backend pages: Dashboard, POS, Products, Orders, Customers, Users, Roles, Settings.
- Public pages: Home, Products (public), Product detail, Company, Auth pages.
- Action: After core components and Sidebar parity, we’ll visually polish each page using semantic tokens and updated components. No business logic changes.

## 5) Accessibility & QA Hooks

- Ensure all reskinned components preserve keyboard navigation and `focus-visible` rings (`ring-ring` + `ring-offset-background`).
- Maintain ARIA roles/labels of existing components; only visual classes are adjusted.

## 6) Status & Next Steps

- Phase 0 status: **Complete** (inventory and mapping documented).
- Next: **Phase 1 — Theming foundation**
  - Confirm semantic utilities are fully usable across the app (they are defined in `frontend/src/index.css`).
  - Validate dark mode tokens on a few key screens.
  - No build-chain changes; Tailwind v4 stays. If we hit plugin gaps, we’ll add tiny CSS keyframes/utilities instead of new deps.

---
Generated on: {today}