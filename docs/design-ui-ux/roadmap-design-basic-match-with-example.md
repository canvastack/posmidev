# Roadmap: Basic Design Match with web/design-example

## 1) Scope & Goals
- **Goal**: Menyamakan UI/UX app di `frontend/` dengan referensi `web/design-example` tanpa mengubah core behavior (CRUD, Role/Permission, routing/API, guards, store, service layer).
- **In-Scope**: Theming, komponen UI, layout visual, utilities, dark mode, responsivitas, aksesibilitas, dan polish halaman.
- **Out-of-Scope**: Header (sudah match 100% — tidak disentuh), perubahan logic bisnis, perubahan API, atau perombakan arsitektur.

## 2) Constraints & Principles
- **Non-breaking reskin**: Hanya mengganti style dan struktur markup ringan di level UI; API komponen dan alur halaman tetap.
- **Tailwind 4.x**: Tetap gunakan Tailwind v4 di `frontend/`; adopsi token HSL via CSS variables agar kompatibel dengan desain referensi.
- **OpenAPI-first**: Tidak mengubah kontrak API atau flow data.
- **Accessibility-first**: Komponen yang diadopsi harus memperhatikan keyboard nav, ARIA, dan kontrast warna.

## 3) Integration Strategy (High-level)
1. **Theming foundation**: Adopsi CSS variables + semantic tokens (background/foreground/primary/secondary/radius/border/ring) dan utility classes (glass/gradient).
2. **Utilities & helpers**: Tambahkan `cn` (clsx + tailwind-merge), opsional `cva`, dan plugin animasi jika diperlukan.
3. **Sidebar overhaul**: Lengkapi implementasi Sidebar (60% ➜ 100%) agar identik dengan referensi.
4. **Reskin komponen UI**: Ganti style internal komponen (Button, Input, Card, Badge, Checkbox, Select, Modal, Tooltip, Toast, Table) agar konsisten dengan referensi, tanpa mengubah props publik.
5. **Layout polish**: Samakan jarak, grid, dan state visual di `BackendShell` (tanpa modifikasi Header) dan `FrontendShell`.
6. **Page-level polish**: Terapkan desain ke halaman: Dashboard, POS, Products, Orders, Customers, Users, Roles, Settings, dan halaman publik.
7. **Dark mode & Responsiveness**: Pastikan kedua mode dan semua breakpoint konsisten.
8. **QA & Accessibility**: Visual regression, keyboard nav, screen-reader labels, dan kontrast.

## 4) Phased Plan & Deliverables

### Phase 0 — Discovery & Inventory (0.5–1 hari)
- **Audit** mapping komponen `frontend/src/components/ui/*` ke padanan di `design-example/src/components/ui/*`.
- **Output**: Dokumen mapping (nama komponen, props kunci, gap style/behavior, status adopsi).

### Phase 1 — Theming Foundation (0.5 hari)
- Tambahkan CSS variables (HSL) + utilities (glass/gradient/scrollbar) ke `frontend/src/index.css`.
- Sinkronkan `tailwind.config.js` untuk semantic tokens (border, input, ring, background, foreground, primary, secondary, destructive, muted, accent, card) dan `borderRadius` dari `--radius`.
- **Output**: Theming aktif; tanpa memengaruhi logic.

### Phase 2 — Utilities & Helpers (0.5 hari)
- Tambah util `cn` di `frontend/src/lib/utils.ts` (clsx + tailwind-merge).
- Tambah `class-variance-authority` bila diperlukan untuk varian komponen.
- Opsional: plugin `tailwindcss-animate` (copy keyframes manual jika plugin tidak digunakan).
- **Output**: Pondasi helper siap dipakai di komponen.

### Phase 3 — Sidebar Overhaul (prioritas) (0.5–1 hari)
- Lengkapi Sidebar: collapsed/expanded state, width transition (16/64), active state, glass/gradient, border/hover states, ikon, dan aksesibilitas.
- Pastikan `BackendShell` menggeser konten sesuai `pl-16/pl-64` dan tinggi konten sinkron dengan header (tanpa mengubah Header).
- **Output**: Sidebar match ~100% dengan referensi.

### Phase 4 — Core UI Components Reskin (1–2 hari)
- Komponen target (urut prioritas):
  - **Button, Badge, Card, Input, Checkbox, Select**, Tooltip, Modal/Dialog, Toast/Toaster, Table.
- Strategi: Ganti class dan struktur minimal (opsional gunakan `cva`) agar tidak mengubah props publik dan pemakaian di halaman.
- **Output**: Komponen inti berpenampilan seragam dengan referensi.

### Phase 5 — Layout & Shell Polish (0.5 hari)
- BackendShell: konsistensi spacing, surface, konten min-height, grid layout di halaman admin.
- FrontendShell: terapkan gradient/typography/spacing agar seragam.
- **Output**: Shell tampak konsisten; tidak menyentuh Header.

### Phase 6 — Page-level Polish (1–2 hari, iteratif per halaman)
- Halaman: Dashboard, POS, Products, Orders, Customers, Users, Roles, Settings, dan public pages.
- Terapkan token, komponen reskinned, spacing, state (empty/loading/error), dan pattern navigasi.
- **Output**: Halaman terlihat dan terasa sama dengan referensi, tanpa mengubah flow data.

### Phase 7 — Dark Mode & Responsiveness (0.5 hari)
- Verifikasi varian dark: warna, border, surface, dan state aktif.
- Uji breakpoint (sm/md/lg/xl/2xl): Sidebar, tabel, form, kartu.
- **Output**: Konsistensi mode gelap dan responsivitas.

### Phase 8 — Accessibility & QA (0.5–1 hari)
- Keyboard nav, focus ring, ARIA label, kontrast (WCAG AA minimal).
- Visual regression snapshot pada halaman kunci.
- **Output**: Checklist aksesibilitas lulus; stabil untuk rilis.

### Phase 9 — Documentation & Handoff (0.5 hari)
- Update `docs/design-ui-ux/*` tentang token, prinsip varian, pattern layout, dan cara menambah komponen.
- **Output**: Dokumen pengembang untuk konsistensi ke depan.

## 5) Success Criteria (Acceptance)
- Header: tetap sama (tidak diubah), fungsional 100%.
- Sidebar: match visual/functionality ~100% dgn referensi.
- Semua komponen UI target: konsisten style, tanpa memutus props & pemakaian yang ada.
- Halaman utama (Dashboard, POS, Products, Orders, Customers, Users, Roles, Settings) tampak seragam.
- Dark mode dan responsivitas berfungsi.
- Tidak ada perubahan pada logic CRUD/Role/Permissions/Routing/API.

## 6) Risks & Mitigations
- **Incompatibility Tailwind v4**: Hindari plugin berat; copy util/animasi ke CSS bila perlu.
- **Refactor tak perlu**: Batasi perubahan ke layer style; jaga API komponen.
- **Aksesibilitas**: Review ARIA/focus ring saat reskin; gunakan testing checklist.

## 7) Estimated Timeline (kasar)
- Phase 0–2: 1.5–2 hari
- Phase 3 (Sidebar): 0.5–1 hari
- Phase 4 (Core UI): 1–2 hari
- Phase 5–7 (Shell, pages polish, dark/responsive): 2–3 hari
- Phase 8–9 (QA & Docs): 1–1.5 hari
- **Total**: ~6–10 hari, tergantung kompleksitas halaman & cakupan komponen yang dipoles.

## 8) Implementation Checklist (ringkas)
- [ ] Mapping komponen & gap analisis
- [ ] Tambah tokens & utilities CSS
- [ ] Update tailwind config (semantic tokens + radius)
- [ ] Tambah `cn` util (+ opsional `cva`)
- [ ] Sidebar overhaul (match 100%)
- [ ] Reskin Button/Badge/Card/Input/Checkbox/Select
- [ ] Reskin Tooltip/Modal/Toast/Table (sesuai kebutuhan)
- [ ] Shell & halaman polish (admin + public)
- [ ] Dark mode + responsive verification
- [ ] A11y & QA pass
- [ ] Update dokumentasi