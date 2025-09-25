# Frontend Structure & Scaffolding (Aligned with Design Plan)

## Path Aliases
- **Alias**: `@` → `frontend/src`
- **Usage**: `import { ThemeToggle } from '@/components/ThemeToggle'`
- **Config**:
  - `frontend/vite.config.ts` → `resolve.alias['@'] = './src'`
  - `frontend/tsconfig.app.json` → `baseUrl` + `paths` mapping

## Scaffolding Created
- **Hooks**:
  - `src/hooks/useTheme.ts` – dark/light/system theme management
  - `src/hooks/useScrollTop.ts` – visibility hook for scroll-to-top button
- **Components**:
  - `src/components/ThemeToggle.tsx`
  - `src/components/ScrollToTopButton.tsx`
  - `src/components/Sidebar.tsx`
  - `src/components/MegaMenu.tsx`
- **Layouts**:
  - `src/layouts/FrontendShell.tsx` – glass header + slot for MegaMenu
  - `src/layouts/BackendShell.tsx` – sidebar + glass header

## Next Steps
1. Integrate `MegaMenu` into `FrontendShell` navigation and bind to categories API.
2. Enhance `Sidebar` with collapse state (localStorage) and route links.
3. Add `Breadcrumbs` and wire to router on backend shell.
4. Add data primitives (Table, Form, Modal/Drawer) per design plan.

## Design Alignment
- Glassmorphism classes and color tokens match the plan in `docs/pos-ui-design-plan.md`.
- Dark mode via `class` on root, persisted in `localStorage`.
- Components are headless-friendly and scalable for future variants.