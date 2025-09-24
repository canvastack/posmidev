# Pemahaman Menyeluruh Proyek

Dokumen ini merangkum hasil analisis menyeluruh terhadap repositori Canvastack POSMID, mencakup arsitektur, fitur, alur kerja, dependensi, skema data, API, keamanan, pengujian, gap/risiko, serta rekomendasi langkah lanjut. Tujuannya menjadi referensi singkat namun komprehensif bagi pengembangan selanjutnya.

---

## 1) Ringkasan Tingkat-Tinggi
- **Nama**: Canvastack POSMID — Backend Laravel untuk sistem POS multi-tenant.
- **Paradigma**: API-First sesuai OpenAPI 3.0, dengan **Hexagonal Architecture (Ports & Adapters)**.
- **Stack**:
  - **Backend**: Laravel 10, Sanctum (stateless), Spatie Permission.
  - **DB**: PostgreSQL, ID bertipe UUID.
  - **Frontend**: React + TypeScript + Vite + Tailwind + Axios + React Router + Zustand (folder `frontend`).
- **Fitur inti (target)**: Multi-tenancy, autentikasi/otorisasi, manajemen kategori & produk, POS (orders), stock adjustments, roles/permissions, dashboard ringkas.

---

## 2) Arsitektur & Struktur Proyek
Pendekatan **Hexagonal** memisahkan domain logic dari framework. Direktori utama:

- **Core (Domain/Application) — `src/Pms/Core`**
  - **Entities**: `Product`, `Category`, `Tenant`, `Order`, `StockAdjustment`.
  - **Repository Interfaces (Ports)**: `ProductRepositoryInterface`, `CategoryRepositoryInterface`, `OrderRepositoryInterface`, `StockAdjustmentRepositoryInterface`, `TenantRepositoryInterface`.
  - **Application Services**: `ProductService`, `OrderService`, `CategoryService`, `StockAdjustmentService`, `DashboardService`. Berisi bisnis murni (tanpa Laravel).

- **Infrastructure (Adapters) — `src/Pms/Infrastructure`**
  - **Models (Eloquent)**: `Product`, `Category`, `Order`, `OrderItem`, `StockAdjustment`, `Tenant`, `User`, `Customer`.
  - **Repositories (Implementasi)**: EloquentXxxRepository mengimplementasikan interface domain untuk akses DB via Eloquent.

- **Application Layer (Laravel) — `app`**
  - **Controllers**: `AuthController`, `ProductController`, `CategoryController`, `OrderController`, `DashboardController`, `RoleController`, `PermissionController`, `StockAdjustmentController`.
  - **Requests**: Validasi input (`ProductRequest`, `OrderRequest`, dsb.).
  - **Resources**: Normalisasi output (`ProductResource`, `CategoryResource`, dst.).
  - **Policies**: Kontrol akses per-entity mempertimbangkan `tenantId` dan role/permission.
  - **Middleware**: `ValidateOpenApiRequest` (validasi dasar path+method terhadap `openapi.yaml`).
  - **Providers**: `AppServiceProvider` — binding interface→implementasi repository + registrasi policies.

- **Konfigurasi & Lainnya**:
  - `routes/api.php` — definisi endpoint API v1.
  - `openapi.yaml` — kontrak API-First.
  - `docs/` — dokumentasi operasional & arsitektur.
  - `tests/` — unit & feature tests (Auth, Product, Domain Product).
  - `frontend/` — aplikasi FE (struktur siap, implementasi fitur berjalan).

---

## 3) API v1 & Middleware OpenAPI
- **Rute (ringkas) — `routes/api.php`**
  - Publik: `POST /register`, `POST /login`.
  - Protected (auth:sanctum): `POST /logout`, `GET /user`.
  - Prefix `tenants/{tenantId}`:
    - `GET /dashboard`
    - `apiResource /products`, `apiResource /categories`
    - `apiResource /roles`, `GET /permissions`
    - `POST /orders`, `POST /stock-adjustments`

- **OpenAPI**: `openapi.yaml` (servers: `http://localhost:9000/api/v1`).
- **Middleware `ValidateOpenApiRequest`**:
  - Memuat `openapi.yaml`, menormalkan segment UUID ke parameter (`{tenantId}`, `{productId}`), memverifikasi eksistensi path+method.
  - Catatan: Belum memvalidasi schema request/response (body, query, headers). Risiko mismatch kontrak.

---

## 4) Autentikasi & Otorisasi
- **Autentikasi**: Laravel Sanctum (mode stateless untuk API).
  - Guard `api` memakai Sanctum; gunakan `SESSION_DRIVER=array` dan kosongkan `SANCTUM_STATEFUL_DOMAINS` (lihat `.env.example`).
- **Otorisasi**: Spatie Permission.
  - Peran tipikal: `admin`, `manager`, `cashier`.
  - Seeder: `PermissionSeeder` tersedia dan digunakan di tests.
- **Policies**:
  - Terdaftar pada provider; mengontrol akses berbasis role/permission dan memastikan isolasi tenant (`tenantId` cocok).

---

## 5) Multi-Tenancy
- **Strategi**: Single database; isolasi via kolom `tenant_id` pada tabel utama.
- **Konsistensi Data**:
  - Unik per-tenant (mis. `products(tenant_id, sku)` unik) untuk mencegah benturan lintas tenant.
  - Foreign key berantai ke `tenant_id` untuk menjaga integritas.
- **Lapisan Aplikasi**:
  - Controller/Policy memverifikasi bahwa resource yang diakses sesuai dengan `tenantId` pada URL/token.
  - Pastikan query di repository selalu menyertakan filter `tenant_id`.

---

## 6) Skema Basis Data (Migrations)
- **Tersedia**:
  - `tenants`, `users` (FK ke tenants; unik email per tenant), `categories`, `products` (unik `(tenant_id, sku)`).
- **Belum ditemukan namun dirujuk**:
  - `orders`, `order_items`, `customers`, `stock_adjustments`, serta tabel-tabel Spatie Permission (perlu di-publish).

- **Usulan skema (ringkas)** — agar selaras domain dan OpenAPI:
  1) `customers`
     - id (uuid, pk), tenant_id (uuid, fk→tenants), name (string), email (string, nullable), phone (string, nullable), address (text, nullable), created_at, updated_at.
     - Index: (tenant_id, email) unik bila diperlukan.
  2) `orders`
     - id (uuid, pk), tenant_id (uuid, fk), customer_id (uuid, fk, nullable), status (enum/pv: draft|paid|cancelled|refunded), total_amount (decimal(14,2)), total_items (int), notes (text, nullable), created_at, updated_at.
     - Index: tenant_id, (tenant_id, status).
  3) `order_items`
     - id (uuid, pk), order_id (uuid, fk→orders on delete cascade), product_id (uuid, fk→products), quantity (int >=1), unit_price (decimal(14,2)), subtotal (decimal(14,2)), created_at, updated_at.
     - Index: order_id.
  4) `stock_adjustments`
     - id (uuid, pk), tenant_id (uuid, fk), product_id (uuid, fk), type (enum: increase|decrease|correction), quantity (int), reason (string/text), created_at, updated_at.
     - Index: (tenant_id, product_id, created_at).
  5) Spatie Permission
     - Publish bawaan: `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` (tambahkan kolom `tenant_id` jika role/permission dibatasi per-tenant).

- **Catatan UUID**: Pastikan model mengisi `id` via `boot()` + `Str::uuid()` atau mutator agar tidak bergantung pada input manual.

---

## 7) Domain: Entities & Services
- **Product (Entity)**
  - Atribut inti: id, tenantId, name, sku, price, stock, lowStockThreshold, dsb.
  - Metode domain: `adjustStock(int delta)`, `isLowStock(): bool` (diuji pada unit test).
- **Category, Tenant, Order, StockAdjustment**
  - Entities merepresentasikan aturan & invarian domain. Order mengagregasi `order_items` dan menjaga konsistensi total.
- **Services**
  - `ProductService`: CRUD & operasi stok (delegasi ke repo + validasi domain).
  - `OrderService`: membuat order, menghitung total, menyimpan item, sinkron stok (jika strategi sinkron langsung).
  - `StockAdjustmentService`: mencatat penyesuaian stok dan memanggil domain logic produk.
  - `DashboardService`: agregasi ringkas (total produk, penjualan, dsb.).

---

## 8) Infrastructure: Repositories & Models
- **Eloquent Models** memetakan tabel dan relasi (belongsTo/hasMany). Pastikan setiap query meninggalkan jejak `tenant_id` untuk keamanan data.
- **Repositories** menerapkan kontrak domain; menjadi titik konsistensi untuk scoping tenant, eager-loading relasi, dan aturan query (sorting, pagination, dsb.).

---

## 9) Application Layer: Controllers, Requests, Resources, Policies
- **Controllers** bertanggung jawab pada:
  - Otorisasi via Policy (role/permission + kepemilikan tenant).
  - Validasi input via Request.
  - Orkestrasi Service domain.
  - Return data via Resource untuk output yang stabil.
- **Requests** menerapkan aturan validasi sesuai OpenAPI (perlu diselaraskan lebih lanjut dengan schema).
- **Resources** mengontrol format respons (hindari bocor detail internal model/entity).
- **Policies** wajib memeriksa `tenant_id` sebelum memberi akses.

---

## 10) OpenAPI-First: Kekuatan & Batasan
- **Kekuatan**: Satu sumber kebenaran kontrak API; memudahkan FE, QA, dan dokumentasi.
- **Batasan saat ini**: Validasi terbatas pada path+method (belum schema). Ini berisiko respons/permintaan menyimpang dari kontrak.
- **Rekomendasi**: Pertimbangkan integrasi validator skema (mis. `league/openapi-psr7-validator`) atau middleware kustom untuk memvalidasi body, query, headers, dan bahkan response.

---

## 11) Testing
- **Feature Tests**
  - `AuthTest`: register (buat tenant+user, token), login (token+user).
  - `ProductTest`: daftar produk (via `Sanctum::actingAs`) — memeriksa respons awal kosong, dsb.
- **Unit Tests**
  - `ProductEntityTest`: validasi domain behavior `adjustStock()` dan `isLowStock()` termasuk exception jika stok negatif.
- **Rekomendasi perluasan**
  - Tambahkan test untuk: `orders` (pembuatan, perhitungan total), `stock_adjustments`, `roles/permissions`, CRUD `categories` penuh, serta pengujian policy (deny/allow) dan scoping tenant.

---

## 12) Frontend (folder `frontend`)
- **Teknologi**: React 19, TS, Vite, Tailwind 4, Axios, Zustand, React Router 7.
- **Script**: `dev`, `build`, `preview`, `start`.
- **Integrasi yang diharapkan**:
  - Konfigurasi `VITE_API_URL` sesuai base API.
  - Penyimpanan token Bearer di `localStorage` + interceptor Axios untuk Authorization header.
  - Protected routes, store `auth/tenant` dengan Zustand, penggunaan `tenantId` di URL.
  - Halaman: Login, Dashboard, POS, Products, Orders, Users, Roles (sebagaimana dirujuk di `.gitignores/PROMPTCHATHISTORY.md`).

---

## 13) Konfigurasi & Operasional
- **ENV penting**:
  - `APP_URL`, `APP_ENV`, `APP_DEBUG`.
  - `DB_*` koneksi PostgreSQL.
  - `SANCTUM_STATEFUL_DOMAINS` (kosong untuk stateless), `SESSION_DRIVER=array`.
  - CORS diizinkan untuk FE origin saat dev.
- **Command umum**:
  ```bash
  # Backend
  composer install
  php artisan key:generate
  php artisan migrate
  php artisan db:seed --class=PermissionSeeder
  php artisan serve --host=127.0.0.1 --port=9000

  # Testing
  php artisan test

  # Frontend
  cd frontend
  npm install
  npm run dev
  ```
- **Catatan URL**: `openapi.yaml` menggunakan `http://localhost:9000/api/v1`, sementara default Laravel sering `:8000`. Samakan agar tidak membingungkan (lihat rekomendasi).

---

## 14) Kekuatan Implementasi
- **Pemisahan concern** jelas (Domain vs Infrastructure vs Application layer).
- **Dependency Injection** rapi via Provider.
- **Multi-tenancy** konsisten (FK + constraint unik + cek di controller/policies).
- **API-First**: Spesifikasi dan middleware validasi dasar sudah tersedia.
- **Testing**: Sudah mencakup autentikasi dan domain inti `Product`.

---

## 15) Kesenjangan & Risiko Teknis
- **Validasi OpenAPI terbatas**: Belum mencakup validasi payload/query/headers/response → potensi mismatch kontrak.
- **Migrasi belum lengkap**: Tabel `orders`, `order_items`, `customers`, `stock_adjustments`, dan migrasi Spatie belum tersedia di repo → endpoint terkait belum siap end-to-end.
- **Server URL tidak konsisten**: `openapi.yaml` vs default Laravel server port → membingungkan untuk QA/FE.
- **Sanctum konfigurasi**: Pastikan benar-benar stateless (cek env dan config) agar token-based flow konsisten.
- **UUID default**: Pastikan pengisian id otomatis di model untuk mencegah rely pada input manual.
- **Mapping Domain↔Resource**: Perubahan domain harus diselaraskan dengan Resource agar kontrak API stabil.

---

## 16) Rekomendasi dan Rencana Aksi
1) **Lengkapi migrasi** (prioritas tinggi)
   - Tambahkan `orders`, `order_items`, `customers`, `stock_adjustments`.
   - Publish & jalankan migrasi Spatie Permission. Pertimbangkan `tenant_id` pada role/permission bila diperlukan multi-tenant isolation.
2) **Perkuat validasi OpenAPI** (tinggi)
   - Integrasi validator skema untuk request & response terhadap `openapi.yaml`.
3) **Selaraskan konfigurasi server** (tinggi)
   - Samakan `APP_URL`, `openapi.yaml` `servers.url`, dan FE `VITE_API_URL` (disarankan `http://localhost:9000`).
4) **Audit Policies & scoping tenant** (tinggi)
   - Pastikan semua controller/repo memfilter `tenant_id` dan policy menolak cross-tenant access.
5) **Perluas testing** (menengah)
   - Tambah Feature tests untuk orders/stock-adjustments/permissions dan CRUD lengkap categories/products, serta uji policy.
6) **Frontend plumbing** (menengah)
   - Axios instance + interceptor, ProtectedRoute, Zustand stores, dan halaman-halaman inti.
7) **Operasional** (menengah)
   - Tambah dokumentasi runbook (dev/prod), contoh `.env`, dan strategi deploy.

---

## 17) Checklist Implementasi
- [ ] Tambahkan migrasi `customers`, `orders`, `order_items`, `stock_adjustments`.
- [ ] Publish & migrate Spatie Permission (pertimbangkan tenant-scoped roles).
- [ ] Tambahkan pengisian UUID otomatis di semua model UUID.
- [ ] Integrasikan validator OpenAPI untuk payload & response.
- [ ] Samakan base URL di `APP_URL` – `openapi.yaml` – `VITE_API_URL`.
- [ ] Audit dan uji semua Policy untuk cross-tenant access.
- [ ] Tambah Feature tests: orders, stock adjustments, roles/permissions, categories CRUD.
- [ ] Siapkan Axios instance + interceptor, ProtectedRoute, dan store `auth/tenant` di FE.

---

## 18) Pertanyaan Terbuka untuk Klarifikasi
- Apakah roles/permissions bersifat global atau per-tenant? (Bila per-tenant, tambahkan `tenant_id` di tabel Spatie.)
- Apakah sinkronisasi stok dilakukan saat pembuatan order atau via job async (eventual consistency)?
- Apakah dibutuhkan audit log untuk perubahan stok (siapa, kapan, alasan)?
- Apakah ada SLA untuk validasi kontrak response (misal strict schema validation di seluruh endpoint)?

---

## 19) Catatan Operasional Tambahan
- Tidak ditemukan `d:\worksites\canvastack\posmidev\.zencoder\rules\repo.md`. Disarankan dibuat agar metadata proyek (aturan coding, kebijakan PR, konvensi, dsb.) terdokumentasi dan dapat dipakai otomatis oleh asisten.

---

## 20) Lampiran Singkat (Cuplikan Endpoint Kunci)
- Auth: `POST /register`, `POST /login`, `POST /logout`, `GET /user`.
- Tenants scope: `GET /tenants/{tenantId}/dashboard`.
- Catalog: `apiResource /tenants/{tenantId}/products`, `apiResource /tenants/{tenantId}/categories`.
- RBAC: `apiResource /tenants/{tenantId}/roles`, `GET /tenants/{tenantId}/permissions`.
- POS: `POST /tenants/{tenantId}/orders`, `POST /tenants/{tenantId}/stock-adjustments`.

