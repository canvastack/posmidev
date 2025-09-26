# Roadmap End-to-End UI/UX POSMID (Scalable & Modern)

Di bawah ini urutan kerja yang jelas, terstruktur, dan selaras dengan dokumen `docs/pos-ui-design-plan.md`, lengkap dengan deliverables, acceptance criteria, dan strategi PR. Fokus: OpenAPI-first, multi-tenant, performa tinggi, aksesibilitas, dan UX POS yang cepat.

## Guiding Principles
- **OpenAPI-first**: setiap UI yang butuh API harus punya endpoint di `openapi.yaml` (commit yang sama).
- **Tenant-aware**: semua fetch ke `tenants/{tenantId}` + Bearer token guard `api`.
- **Komponen headless + variants**: reusable, a11y-first, mudah di-skin.
- **Incremental PRs**: PR kecil, mudah review, jalur rollback jelas.

## Prasyarat & Workstreams
- **Tidak pakai Figma**: dokumentasi komponen via MDX/Examples (bisa migrasi ke Storybook jika skala membesar).
- **Prioritas pembayaran**: e-wallet → card → cash, dikendalikan setting tenant `payments.default_method`.

---

## Phase 0 — Foundation & Wiring (0.5–1 minggu)
Tujuan: pondasi teknis siap untuk pengembangan UI.

- **Deliverables**:
  1. API client + interceptor Authorization + helper `withTenant(tenantId, path)`.
  2. Hook `useTenantId()` (dari route param atau fallback `user.tenant_id`).
  3. React Router setup + `App.tsx` contoh untuk `FrontendShell`/`BackendShell`.
  4. OpenAPI minimal updates:
     - Customers CRUD + search.
     - Tenant settings (payments.default_method).
  5. State dasar (Zustand) untuk auth/user/token dan UI prefs sederhana.
- **Acceptance**:
  - Semua request tenant-bound memakai `tenants/{tenantId}` + header Authorization otomatis.
  - Build berhasil; rute contoh tampil; OpenAPI tervalidasi; tanpa lint errors.
- **PRs**:
  - PR-0A: API client + hooks + router skeleton.
  - PR-0B: OpenAPI updates (Customers, Settings) + backend stubs jika perlu.

## Phase 1 — Design Tokens & Theme (0.5 minggu)
Tujuan: sistem tema konsisten dan mudah diskalakan.

- **Deliverables**:
  - Tailwind config: semantic tokens (primary, accent, info, success, warning, danger), radius scale, shadow/elevation (glass), spacing, z-index.
  - Dark mode class-based + `useTheme()` + `ThemeToggle`.
  - Glassmorphism utilities (card/header/mega-menu).
- **Acceptance**:
  - Theme toggle persisten, tidak flicker, color-contrast cukup (AA minimum).
  - Token dipakai minimal di 2–3 komponen contoh.
- **PRs**:
  - PR-1: Tailwind theme + ThemeToggle + utilitas glass.

## Phase 2 — Shells & Navigation (1 minggu)
Tujuan: struktur global UI siap pakai.

- **Deliverables**:
  - `FrontendShell` (header kaca, slot MegaMenu, footer).
  - `BackendShell` (sidebar collapsible + header kaca + slot breadcrumbs).
  - `Sidebar` dengan collapse state (localStorage) + routing map dasar.
  - `Breadcrumbs` otomatis dari path.
- **Acceptance**:
  - Sidebar collapse/expand halus, keyboard-toggle, tooltip saat collapsed.
  - Breadcrumbs sesuai path; shell responsif di ≥320px.
- **PRs**:
  - PR-2A: FrontendShell + MegaMenu slot + wiring awal.
  - PR-2B: BackendShell + Sidebar collapse + Breadcrumbs.

## Phase 3 — Data Primitives (1–1.5 minggu)
Tujuan: komponen dasar untuk data dan form.

- **Deliverables**:
  - Primitives: Button, IconButton, Input, Select/Combobox, Switch, Badge/Chip, Tooltip, Popover, Toast.
  - Overlays: Modal (focus trap), Drawer (sheet).
  - Forms: react-hook-form + zod; Field/Label/Message pattern; Currency/Barcode input.
  - Data: DataTable (TanStack Table) server-side pagination/sort/filter, column visibility, selection, CSV export.
  - States: EmptyState, ErrorState, LoadingSkeleton.
- **Acceptance**:
  - Tabel bekerja dengan dataset besar (uji 1k row) + virtualized bila perlu.
  - Form validasi zod + error inline.
  - Semua komponen punya contoh MDX/Examples singkat.
- **PRs**:
  - PR-3A: Primitives + Overlays.
  - PR-3B: Form pattern + inputs khusus.
  - PR-3C: DataTable + states.

## Phase 4 — MegaMenu & Frontend Customer (0.5–1 minggu)
Tujuan: Homepage customer dan navigasi katalog.

- **Deliverables**:
  - Integrasi `MegaMenu` ke categories endpoint (TanStack Query).
  - Homepage contoh (Hero gradient, Product highlights), CartDrawer placeholder.
- **Acceptance**:
  - MegaMenu menampilkan kategori dari API; loading/empty/error ditangani.
  - Responsif dan performa baik (lazy-load bagian berat).
- **PRs**:
  - PR-4: MegaMenu wired + homepage minimal.

## Phase 5 — POS Workspace (1–2 minggu)
Tujuan: alur kasir cepat dan keyboard-first.

- **Deliverables**:
  - Layout POS: `ProductGrid` (virtualized), `ProductTile` (dense), `CartPanel`, `KeypadPad`, `DiscountInput`, `PaymentMethodList`, `CustomerSelector`.
  - Interaksi: scan/entry cepat (Enter tambah), +/- qty, Del remove, hold/resume cart.
  - Payment modal: urutan default (e-wallet → card → cash) dari tenant settings; split payment; kalkulasi kembalian; placeholder printer.
- **Acceptance**:
  - Alur “scan → tambahkan → diskon → bayar → receipt” dapat selesai tanpa mouse.
  - Offline indicator & autosave draft (stub awal boleh lokal).
- **PRs**:
  - PR-5A: Grid & Cart basics.
  - PR-5B: Keypad/Discount/CustomerSelector.
  - PR-5C: Payment modal + default method via settings + fallback urutan.

## Phase 6 — Management Pages (2–3 minggu total, paralel per modul)
Tujuan: halaman manajemen data inti.

- **Deliverables per modul** (Products, Orders, Customers, Payments, Inventory, Categories):
  - Tabel listing (server-side), filter bar, create/edit via Drawer, state loading/empty/error.
  - Aksi massal (enable/disable/import CSV sesuai relevansi).
  - Categories: TreeView + drag-and-drop order.
- **Acceptance**:
  - Semua halaman CRUD utama berfungsi dengan permission-aware UI.
  - Rute dan fetch selalu `tenants/{tenantId}`; guard `api`.
- **PRs (batasi ukuran)**:
  - PR-6A: Products.
  - PR-6B: Orders.
  - PR-6C: Customers (tergantung OpenAPI Phase 0).
  - PR-6D: Payments.
  - PR-6E: Inventory.
  - PR-6F: Categories (TreeView + DnD).

## Phase 7 — Analytics Dashboard (0.5–1 minggu)
Tujuan: insight cepat dengan komponen ringan.

- **Deliverables**:
  - KPIStat (sales, AOV, conversions), ChartCard (line/bar/pie) via Recharts/Visx.
  - DateRangePicker + compare periods, export.
- **Acceptance**:
  - Dashboard render <150ms setelah data tersedia; prefetch bila perlu.
  - Responsif dan accessible.
- **PRs**:
  - PR-7: KPI + ChartCards + DateRangePicker.

## Phase 8 — Settings (0.5–1 minggu)
Tujuan: konfigurasi aplikasi tenant.

- **Deliverables**:
  - Settings sections: General, Appearance (ThemeToggle), Taxes, Payments, Printers, Integrations.
  - Payments: `payments.default_method` (ewallet|card|cash) → dibaca POS Payment modal.
- **Acceptance**:
  - Update settings mempengaruhi POS default method tanpa reload penuh.
  - Validasi kuat, error states jelas.
- **PRs**:
  - PR-8: Settings + API wiring (useTenantSettings/useUpdateTenantSettings).

## Phase 9 — A11y, i18n, Performance (1 minggu, ongoing polish)
Tujuan: kualitas produksi.

- **Deliverables**:
  - A11y: roles/labels, focus rings, skip links, modal/drawer focus trap, tabel header scope, contrast audit.
  - i18n: react-i18next (en/id), currency/timezone per tenant.
  - Performa: code splitting, memoization, query prefetch, image responsive, virtualized grid.
- **Acceptance**:
  - axe checks lolos untuk halaman kunci.
  - LCP/INP/CLS wajar; navigasi antar halaman instan (cached).
- **PRs**:
  - PR-9A: A11y pass.
  - PR-9B: i18n + formatting.
  - PR-9C: Perf tuning.

## Phase 10 — Testing & Docs (1 minggu, paralel sepanjang)
Tujuan: kepercayaan rilis dan dokumentasi.

- **Deliverables**:
  - Unit: kontrak komponen (props/events).
  - Integration: DataTable, Form submit, POS flow.
  - E2E: Playwright flow POS (scan → discount → payment → receipt) + beberapa halaman manajemen.
  - Docs: MDX/Examples untuk setiap komponen; panduan penggunaan pola (Table, Form, Overlay, FilterBar).
- **Acceptance**:
  - CI menjalankan unit+integration+E2E; a11y checks pada halaman kunci.
  - MDX/Examples tersedia dan up-to-date.
- **PRs**:
  - PR-10A: Unit + Integration tests.
  - PR-10B: E2E Playwright.
  - PR-10C: MDX/Examples.

## Phase 11 — Release & QA Gates (0.5 minggu)
Tujuan: siap rilis internal/preview.

- **Deliverables**:
  - Checklist QA: responsif, a11y, tenant scoping, permission gating, error handling, empty/loading states, POS flow keyboard-only.
  - Bugfix polish + changelog.
- **Acceptance**:
  - Semua acceptance criteria di design-plan terpenuhi.
  - Tidak ada blocker severity tinggi.
- **PRs**:
  - PR-11: QA fixes + release notes.

---

## Paralelisasi & Ketergantungan Penting
- **Dapat paralel**: Phase 1–2 dengan Phase 0 (setelah API client siap).
- **POS (Phase 5)** menunggu Data Primitives (Phase 3) untuk Drawer/Modal/DataTable.
- **Management Pages (Phase 6)** bisa dikerjakan modul per modul paralel.
- **Analytics (Phase 7)** bisa berjalan setelah Data Primitives siap.

## Definisi “Selesai” (DoD) per Modul
- **UI**: responsif dan dark mode OK.
- **Data**: fetch tenant-aware (path + Authorization).
- **State**: Loading/Empty/Error/Success terkelola.
- **A11y**: fokus, roles, labels lulus checks dasar.
- **Tests**: minimal unit atau integration lulus di CI.
- **Docs**: MDX/Examples tersedia.

## Ringkas Estimasi
- **Phase 0–2**: 2–3 minggu
- **Phase 3–5**: 3–4 minggu
- **Phase 6**: 2–3 minggu (paralel per modul)
- **Phase 7–9**: 2–3 minggu
- **Phase 10–11**: 1.5–2 minggu
- **Total**: 9–12 minggu (tergantung resource dan paralelisasi)

## Langkah Berikutnya (minggu ini)
1. Phase 0: API client + `withTenant` + `useTenantId` + OpenAPI (Customers/Settings).
2. Phase 1: Tailwind tokens + ThemeToggle + glass utilities.
3. Phase 2: FrontendShell + BackendShell + Sidebar collapse + Breadcrumbs.
4. Wire MegaMenu ke categories (Phase 4 awal) sebagai demo end-to-end.