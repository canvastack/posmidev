# POS Application Design Plan (React + Tailwind CSS)

## 1) Goals & Principles
- **Responsive-first**: Seamless across mobile, tablet, desktop, and wide screens.
- **Dark mode with smooth transitions**: Persisted preference; subtle motion, no flashing.
- **Elegant color system**: Slate blue and teal accents with tasteful gradients.
- **Reusable components**: Composable, accessible, and testable building blocks.
- **Glassmorphism surfaces**: For mega menu, headers, and shell elements.
- **App shells**:
  - **Frontend (Customer)**: Top navigation with mega menu (glassmorphism).
  - **Backend (Admin/POS)**: Collapsible sidebar + glass header.

## 2) Tech Foundations
- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + CSS variables for theme tokens
- **State**: Lightweight store (Zustand) + TanStack Query for server cache
- **Routing**: React Router
- **Icons**: Heroicons / Lucide
- **Charts**: Recharts or Visx (for Analytics)
- **Tables**: Headless table (TanStack Table) for virtualization and flexibility

## 3) Design System
### 3.1 Colors
- **Primary**: slate-blue (custom blend between slate and indigo)
- **Accent**: teal
- **Neutrals**: slate/stone/gray scale + white/black with opacities
- **Gradients**: slate→indigo, teal→emerald

Suggested Tailwind extension:
```ts
// tailwind.config.js (excerpt)
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#5458d6', 700: '#4447b4',
          800: '#34378f', 900: '#2b2f73'
        },
        accent: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          ...fontFamily.sans
        ]
      },
      boxShadow: {
        glass: '0 1px 2px 0 rgb(255 255 255 / 0.02), 0 4px 16px -4px rgb(0 0 0 / 0.25)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  }
}
```

### 3.2 Glassmorphism Recipes
- **Card glass**: `bg-white/10 dark:bg-slate-900/30 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-glass`
- **Header glass**: `bg-white/60 dark:bg-slate-900/40 backdrop-blur-md supports-[backdrop-filter]:bg-white/40`
- **Mega menu glass**: `bg-white/20 dark:bg-slate-900/50 backdrop-blur-lg ring-1 ring-white/15`

### 3.3 Typography & Spacing
- **Type**: Inter, 14–16 base, 1.25–1.5 leading; scale via Tailwind defaults
- **Radius**: `rounded-lg` default; `rounded-xl` for prominent cards
- **Gaps**: 2/4/6/8 for dense data UIs

### 3.4 Motion
- **Transitions**: `transition-colors transition-opacity duration-200`
- **Page transitions**: fade/slide subtle for modals/menus only

## 4) Theming & Dark Mode
### 4.1 Implementation
- Tailwind `darkMode: 'class'`, toggle root `<html class="dark">`.
- Persist with `localStorage` and respect `prefers-color-scheme`.

```ts
// src/hooks/useTheme.ts
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) || 'system'
  )

  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && systemDark)
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}
```

```tsx
// src/components/common/ThemeToggle.tsx
import { Theme, useTheme } from '@/hooks/useTheme'

const options: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 dark:bg-slate-900/30 px-1 py-1 backdrop-blur-md border border-white/10">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          className={`px-2 py-1 rounded-md transition-colors ${
            theme === o.value
              ? 'bg-primary-600 text-white'
              : 'hover:bg-white/20 dark:hover:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
```

## 5) App Shells
### 5.1 Frontend (Customer) with Mega Menu (Glass)
- **Header**: logo, search, ThemeToggle, cart icon, account menu.
- **Mega menu**: categories and featured collections, appears on hover/click with glass surface.
- **Footer**: links, support, language/currency.

```tsx
// src/layouts/FrontendShell.tsx
export function FrontendShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-colors">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md">
        {/* Nav + Mega Menu trigger */}
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-white/10 py-6 text-sm opacity-80">© POS</footer>
      {/* Scroll-to-top */}
    </div>
  )
}
```

### 5.2 Backend (Admin/POS) with Collapsible Sidebar + Glass Header
- **Sidebar**: collapsible, icons with tooltip, keyboard toggle `[`, `]`.
- **Header**: glass, breadcrumbs, quick actions, ThemeToggle.
- **Content**: responsive grids and data surfaces.

```tsx
// src/layouts/BackendShell.tsx
export function BackendShell({ children }: { children: React.ReactNode }) {
  // sidebar state stored in localStorage
  return (
    <div className="min-h-dvh grid grid-cols-[auto,1fr] grid-rows-[auto,1fr]">
      <aside className="row-span-2 bg-white/10 dark:bg-slate-900/30 backdrop-blur-md border-r border-white/10 w-64 data-[collapsed=true]:w-16 transition-[width]">
        {/* Nav items */}
      </aside>
      <header className="sticky top-0 z-30 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/10">
        {/* Breadcrumbs + Actions */}
      </header>
      <main className="p-4">{children}</main>
    </div>
  )
}
```

## 6) Navigation
- **Frontend**: Mega menu (categories, promos), search spotlight (Cmd/Ctrl+K), cart drawer.
- **Backend**: Sidebar sections: Dashboard, POS, Products, Orders, Customers, Payments, Inventory, Categories, Analytics, Settings.
- **Breadcrumbs** for backend content.

## 7) Reusable Components (Highlights)
- **Navigation**: `TopNav`, `MegaMenu`, `Sidebar`, `Breadcrumbs`, `TabNav`
- **Data**: `DataTable` (TanStack Table), `DataCard`, `KPIStat`, `ChartCard`
- **Forms**: `Form`, `Field`, `Select`, `ComboBox`, `DateRangePicker`, `Toggle`, `FileDropzone`
- **Overlays**: `Modal`, `Drawer`, `Popover`, `Tooltip`, `Toast`
- **Feedback**: `EmptyState`, `ErrorState`, `LoadingSkeleton`
- **POS Specific**: `ProductGrid`, `ProductTile`, `CartPanel`, `CartItem`, `KeypadPad`, `DiscountInput`, `PaymentMethodList`, `CustomerSelector`
- **Utilities**: `ThemeToggle`, `ScrollToTopButton`, `SearchInput`, `FilterBar`, `Pagination`

Component ethos:
- **A11y-first** (ARIA roles/labels, keyboard focus traps for modals)
- **Headless core + styled wrappers** for flexibility
- **Composable props**: `variant`, `size`, `state` (loading, disabled, selected)

## 8) Hooks & Utilities
- `useTheme()` as above
- `useScrollTop()` for scroll-to-top visibility
- `useLocalStorage<T>(key, initial)` persistence
- `useBreakpoint()` responsive logic
- `useQuery*` with TanStack Query for caching, pagination, infinite scroll

```ts
// src/hooks/useScrollTop.ts
import { useEffect, useState } from 'react'
export function useScrollTop(threshold = 300) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold)
    onScroll(); window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return visible
}
```

## 9) Page Blueprints
Each page specifies: layout, primary components, key interactions, empty/loading/error states.

### 9.1 Frontend Customer Interface
- Layout: `FrontendShell`, hero with gradient, product highlights, categories mega menu.
- Components: `TopNav`, `MegaMenu`, `ProductGrid` (featured), `Footer`, `CartDrawer`.
- Interactions: add-to-cart, search, filters.

### 9.2 Point of Sale (Kasir)
- Layout: `BackendShell` (focused workspace), 2-column on desktop: `ProductGrid` + `CartPanel`.
- Components: `SearchInput`, `CategoryTabs`, `ProductTile`, `CartPanel`, `KeypadPad`, `PaymentMethodList`, `DiscountInput`, `CustomerSelector`.
- Interactions: barcode/manual entry, quantity adjust, discount, payment modal, print/email receipt.
- States: offline/read-only mode indicator; hold/resume cart.

### 9.3 Products Management
- Components: `DataTable` (columns: name, sku, price, stock, status), `FilterBar`, `Drawer` for create/edit, `FileDropzone` for images.
- Interactions: bulk actions (enable/disable), import CSV, variant support.

### 9.4 Analytics Dashboard
- Components: `KPIStat` (sales, AOV, conversions), `ChartCard` (line/bar/pie), `DateRangePicker`.
- Interactions: compare periods, export.

### 9.5 Orders Management
- Components: `DataTable` (status chips), `OrderDetailsDrawer`, `Timeline` (fulfillment), `Tag` filters.
- Interactions: refund, reprint, resend invoice.

### 9.6 Customers Database
- Components: `DataTable`, `CustomerProfile`, `SegmentBuilder` (basic), `Notes`.
- Interactions: merge, assign tags, LTV display.

### 9.7 Payments Tracking
- Components: `DataTable`, `ReconciliationCard`, `PaymentDetailsDrawer`.
- Interactions: filter by method, settlement status.

### 9.8 Inventory Management
- Components: `DataTable`, `StockAdjustDrawer`, `WarehousePicker`, `LowStockAlert`.
- Interactions: bulk adjust, transfer, restock alerts.

### 9.9 Categories Management
- Components: `TreeView`, `CategoryForm`, `DragHandle` for re-ordering.
- Interactions: drag-and-drop hierarchy updates.

### 9.10 Settings
- Sections: General, Appearance (ThemeToggle), Taxes, Payments, Printers, Integrations.
- Components: `Form`, `Toggle`, `Select`, `KeyValueList`.

## 10) Patterns & Guidelines
- **Tables**: server-side pagination, sorting, column visibility, CSV export.
- **Forms**: zod/yup validation, inline errors, optimistic UI when suitable.
- **Drawers vs Modals**: Use drawer for edit/create, modal for confirm/wizard.
- **Empty states**: illustration, primary action, help link.
- **Error states**: retry + diagnostics.
- **Loading**: skeletons for tables/cards.
- **Accessibility**: focus rings `focus-visible:outline-primary-500`, skip links, tab order.

## 11) Routing Map (Proposed)
- `/` (Frontend customer)
- `/app` (Backend shell root)
  - `/app/pos`
  - `/app/products`
  - `/app/orders`
  - `/app/customers`
  - `/app/payments`
  - `/app/inventory`
  - `/app/categories`
  - `/app/analytics`
  - `/app/settings`

## 12) Performance
- **Virtualized tables/grids** for large datasets
- **Code-splitting** routes and heavy components
- **Memoized selectors**; avoid unnecessary rerenders via headless components
- **Prefetch** likely next queries with TanStack Query

## 13) Testing Strategy
- **Unit**: component contracts (props, events)
- **Integration**: POS flow (add to cart → discount → payment)
- **E2E**: Playwright flows for core pages
- **A11y**: axe checks for key screens

## 14) Implementation Roadmap (Phased)
1. Foundation (1–2 weeks)
   - Tailwind theme, dark mode, layout shells, core tokens, ThemeToggle, ScrollToTopButton
2. Navigation & Shells (1 week)
   - Frontend TopNav + MegaMenu (glass), Backend Sidebar (collapsible) + Header (glass)
3. Data Primitives (1–2 weeks)
   - DataTable, Form primitives, Modal/Drawer, Empty/Loading/Error states
4. POS Workspace (1–2 weeks)
   - ProductGrid, CartPanel, Keypad, Payment modal, CustomerSelector
5. Management Pages (2–3 weeks)
   - Products, Orders, Customers, Payments, Inventory, Categories
6. Analytics & Settings (1–2 weeks)
   - KPIStats, ChartCards, DateRangePicker, Settings sections
7. Polish & A11y (ongoing)
   - Motion tuning, keyboard coverage, responsive QA

## 15) Acceptance Criteria (Excerpt)
- Dark mode toggle persists and transitions without flash (no layout shift).
- All pages responsive ≥320px width, structured breakpoints.
- Mega menu and headers use glassmorphism with proper contrast.
- Reusable components documented with examples and props.
- POS flow completes with keyboard only.

## 18) API Feasibility & Gaps (Aligned to openapi.yaml)
- Products: Supported (list/create/get/update/delete under /tenants/{tenantId}/products).
- Categories: Supported (list/create under /tenants/{tenantId}/categories).
- Orders (Sales): Supported (list/create/get under /tenants/{tenantId}/orders).
- Roles & Permissions: Supported (roles, permissions endpoints per tenant).
- Users: Auth/current user endpoint in spec; tenant users list implemented server-side in routes/api.php (used by Users UI). Confirm shape aligns with User schema.
- Gaps to fulfill planned pages:
  - Customers: Not in spec – define endpoints for list/get/create/update and search.
  - Payments Tracking: Not in spec – add endpoints for payment records, reconciliation status.
  - Inventory: Not in spec – add stock endpoints (adjustments, transfers, warehouses if applicable).
  - Analytics: Not in spec – add aggregated metrics endpoints (sales over time, KPIs).
  - Settings: Define config endpoints (taxes, printers, integrations) as needed.

Action items:
1) Extend openapi.yaml for Customers, Payments, Inventory, Analytics, Settings; keep tenant scoping and guard.
2) Implement backend controllers/resources accordingly; reuse existing pagination and filtering patterns.
3) Frontend data hooks follow the spec using TanStack Query; reuse DataTable and Drawer patterns.

## 19) UI Library Choice: shadcn-ui vs Alternatives
- shadcn-ui (Radix + Tailwind component recipes):
  - Pros: Accessible primitives, consistent design tokens, great for forms, dialogs, tables with headless composition.
  - Cons: Requires copying components into repo (maintenance), opinionated class recipes.
- Alternatives:
  - Headless UI + Tailwind: lighter, minimal lock-in; compose your design system from scratch.
  - Radix UI + Tailwind (direct): low-level primitives + your own styles; maximum control.
  - Mantine/Tremor: fast dashboards, good charts, but more styled and less Tailwind-first.

Recommendation:
- Use Radix UI primitives + our Tailwind design tokens for maximal control and consistency with glassmorphism.
- Optionally import select shadcn-ui components (Dialog, Drawer, Toast, Select) as a starting point, then adapt styles to our tokens.
- Avoid full dependency on a single styled kit; keep components headless-friendly and reusable.

## 16) Sample Glass Card Component
```tsx
// src/components/ui/GlassCard.tsx
import { PropsWithChildren } from 'react'

export function GlassCard({ children }: PropsWithChildren) {
  return (
    <div className="rounded-xl bg-white/10 dark:bg-slate-900/30 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-glass">
      {children}
    </div>
  )
}
```

## 17) Scroll To Top Button
```tsx
// src/components/common/ScrollToTopButton.tsx
import { useScrollTop } from '@/hooks/useScrollTop'

export function ScrollToTopButton() {
  const visible = useScrollTop(300)
  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 p-3"
      aria-label="Scroll to top"
    >↑</button>
  )
}
```

---

This plan establishes the design system, component library, navigation shells, and page blueprints to deliver a polished, responsive, and maintainable POS UI using React + Tailwind CSS with glassmorphism accents and persistent dark mode.

## 18) API Alignment & Gaps (with current openapi.yaml and routes)
- **Auth & Tenants**: Already covered (register/login/logout/user, tenants resource).
- **Products**: CRUD present in routes and OpenAPI. UI can proceed.
- **Categories**: Routes support full CRUD via `Route::apiResource('categories', ...)`, but OpenAPI only documents GET list. • Action: extend OpenAPI with POST/PUT/DELETE for categories to match routes.
- **Orders**:
  - Routes expose: GET list, GET detail, POST create (via `OrderQueryController` + `OrderController`).
  - OpenAPI currently documents only POST create. • Action: add GET `/tenants/{tenantId}/orders` and GET `/tenants/{tenantId}/orders/{orderId}`.
- **Payments tracking**: No endpoints in routes/OpenAPI. • Proposal (non-breaking):
  - GET `/tenants/{tenantId}/payments` (filters: method, status, date range)
  - GET `/tenants/{tenantId}/orders/{orderId}/payments`
  - POST `/tenants/{tenantId}/orders/{orderId}/payments` to record payments
  - Or: embed `payment_records` in Order schema with dedicated endpoints later.
- **Customers database**:
  - Currently routes expose `users` under tenant, not a dedicated `customers` resource.
  - Two paths, pick one and document in OpenAPI:
    1) Reuse Users: treat customers as users with `role=customer` (preferred for now). Add filters to `/tenants/{tenantId}/users` for role/tag.
    2) New Resource: `/tenants/{tenantId}/customers` mapped to a Customer model/table (future).
- **Inventory management**:
  - OpenAPI has POST `/stock-adjustments`. Routes match.
  - UI also needs history and current stock views. • Proposal:
    - GET `/tenants/{tenantId}/stock-adjustments` (paginated, filterable)
    - Rely on Products list for stock levels; optionally add low-stock thresholds on Product.
- **Analytics dashboard**: GET `/tenants/{tenantId}/dashboard` present in routes and OpenAPI. OK.
- **Settings**: Not in OpenAPI. UI can handle Appearance locally; for tenant/system settings later:
  - GET/PUT `/tenants/{tenantId}/settings` (JSON blob with validated keys).

## 19) Frontend Readiness & Required Adjustments
- **Dependencies to add** (frontend/package.json):
  - `@tanstack/react-query` (server cache)
  - `@tanstack/react-table` (tables)
  - `recharts` (analytics)
  - `zod` (schema validation) and optionally `react-hook-form`
  - `framer-motion` (smooth transitions for menus/drawers)
- **Tailwind config** (frontend/tailwind.config.js):
  - Set `darkMode: 'class'`.
  - Add the design palette (primary/accent), `shadow-glass`, and `backdrop-blur` presets as specified.
- **Scaffolding** (frontend/src):
  - Hooks: `useTheme`, `useScrollTop`, `useLocalStorage`.
  - Layouts: `FrontendShell`, `BackendShell`.
  - Components: `ThemeToggle`, `ScrollToTopButton`, `Sidebar`, `MegaMenu`, `Breadcrumbs`, `DataTable` wrappers.
  - API: Axios base with bearer token interceptor; optional codegen types from OpenAPI.
- **Pages that can be implemented now with current API**:
  - POS (create order via POST orders; browse products/categories)
  - Products Management (CRUD)
  - Categories Management (CRUD; update OpenAPI docs to reflect existing routes)
  - Orders Management (list/detail via routes; add to OpenAPI)
  - Inventory Adjustments (create; add history endpoint later)
  - Analytics Dashboard (current endpoint OK)
- **Pages needing backend spec/extensions**:
  - Payments Tracking (new endpoints as above)
  - Customers Database (either reuse Users with role filter or add Customers resource)
  - Settings (tenant settings endpoints later; Appearance can be client-only now)

## 20) Minimal OpenAPI Updates (non-breaking, aligned to routes)
- Add:
  - GET `/tenants/{tenantId}/orders`
  - GET `/tenants/{tenantId}/orders/{orderId}`
  - POST/PUT/DELETE for `/tenants/{tenantId}/categories`
- Consider (for upcoming sprints):
  - GET `/tenants/{tenantId}/stock-adjustments`
  - Payments endpoints
  - Optional Users filter parameters to support Customers view

With these adjustments, the design can be implemented progressively while staying aligned with the current core system and an updated OpenAPI spec.

## 21) Scaffolding Status & Conventions
- Created hooks: `useTheme`, `useScrollTop`.
- Created components: `ThemeToggle`, `ScrollToTopButton`, `Sidebar`, `MegaMenu`.
- Created layouts: `FrontendShell`, `BackendShell`.
- Added path alias `@` → `src` in Vite and TSConfig to support clean imports.
- Next: wire `MegaMenu` to categories API; enhance `Sidebar` with collapse and routing; add `Breadcrumbs`.