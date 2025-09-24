## Project Generation Request: canvastack/posmid - A Decoupled, API-First P.O.S. Core

### Primary Objective:
Generate a new, clean Laravel 10 project that serves as the backend implementation for the canvastack/posmid P.O.S. system. The entire project MUST be built around the attached OpenAPI 3.0 specification file (openapi.yaml) and follow the principles of Hexagonal Architecture (Ports and Adapters).

### Core Architectural Mandates:

1. API-First Implementation:
    Use the provided openapi.yaml as the single source of truth.
    Integrate a tool (like laravel-openapi) to automatically validate all incoming API requests against the OpenAPI schema. Any request that does not match the schema should be rejected with a 4xx error automatically.

2. Hexagonal Architecture:
   - Create a distinct src/Pms/Core directory. This is the "core" of the application and MUST NOT contain any Laravel-specific code (use Illuminate...).
   - Inside the core, define Interfaces (Ports) for repositories (e.g., ProductRepositoryInterface, UserRepositoryInterface).
   - Inside the core, create Services that contain pure business logic and depend only on the repository interfaces.
   - Create an src/Pms/Infrastructure directory. This is the "adapter" layer.
   - Inside infrastructure, create Eloquent Repositories that implement the core interfaces (e.g., EloquentProductRepository implements ProductRepositoryInterface).
   - The standard Laravel app/Http/Controllers will act as the primary Input Adapters. They will receive HTTP requests, call the core services, and format HTTP responses.

3. Technology Stack:
   - Backend: Laravel 10
   - Database: PostgreSQL
   - Authentication: Pure stateless Bearer Token authentication via Laravel Sanctum. Configure it strictly for stateless mode (empty SANCTUM_STATEFUL_DOMAINS, guard set to ['api']).
   - Authorization: spatie/laravel-permission.

4. Initial Task:
   - Based on the openapi.yaml (which defines Tenancy, Auth, Products, and Roles), generate the following:
   - The complete directory structure for the Hexagonal Architecture.
   - The core interfaces and services.
   - The infrastructure layer with Eloquent repository implementations.
   - The Laravel Controllers, Policies, and API Resources.
   - All necessary database migrations based on the schemas in the OpenAPI file.
   - A README.md explaining this architecture.


Jadi peta minimalnya nanti untuk Menu Aplikasi P.O.S. "canvastack/posmid"
Mari kita bayangkan aplikasi ini sudah jadi. Saat user login, inilah menu-menu yang akan mereka lihat (tergantung rolenya):

### Dashboard
Tujuan:Memberikan gambaran cepat kondisi bisnis hari ini. 
Isi: Total Pendapatan Hari Ini. Jumlah Transaksi Hari Ini. Produk Terlaris Hari Ini. Notifikasi "Smart Assistant" (Stok menipis, Dead stock).

### Kasir (The P.O.S. Screen)
Tujuan: Halaman utama untuk melakukan transaksi penjualan.
Isi: Grid/daftar produk yang bisa dipilih. Keranjang belanja (cart). Tombol bayar, pilihan metode pembayaran (Tunai, Kartu, QRIS). Fungsi untuk cetak struk.
Manajemen Penjualan Tujuan: Mengelola semua transaksi yang sudah terjadi. Sub-Menu: Riwayat Transaksi: Daftar semua invoice/penjualan. Bisa difilter, dicari, dan dilihat detailnya. Ada fungsi cetak ulang struk. Manajemen Refund/Retur: Proses untuk mengembalikan barang dari pelanggan.
Manajemen Inventaris Tujuan: Mengelola semua hal yang berkaitan dengan barang. Sub-Menu: Daftar Produk: (Ini yang sudah kita definisikan) CRUD untuk produk. Kategori Produk: CRUD untuk mengelompokkan produk. Manajemen Stok (Stock Opname): Fitur untuk penyesuaian stok. Misalnya, +10 untuk barang masuk, -2 untuk barang rusak. Harus ada log/histori untuk setiap penyesuaian. Manajemen Supplier: (Fitur lanjutan) CRUD untuk data supplier.
Manajemen Pelanggan (CRM) Tujuan: Mengelola data pelanggan setia. Isi: CRUD untuk data pelanggan (nama, no. telp). Melihat riwayat belanja per pelanggan.
Laporan Tujuan: Memberikan insight bisnis dari data yang terkumpul. Isi: Laporan Penjualan (Harian, Mingguan, Bulanan). Laporan Laba-Rugi (membutuhkan HPP). Laporan Stok. Laporan Performa Produk.
Pengaturan (Settings) Tujuan: Mengkonfigurasi toko/tenant. Sub-Menu: Profil Toko: Nama, alamat, logo (untuk struk). Manajemen User: (Ini yang sudah kita definisikan) CRUD untuk user di dalam tenant. Manajemen Role & Izin: (Ini yang sudah kita definisikan) CRUD untuk peran. Manajemen Cabang/Outlet: (Fitur lanjutan) Jika satu bisnis punya banyak lokasi. Pengaturan Pajak & Struk.





## Objective:

Generate a complete, production-ready React frontend for the canvastack/posmid backend. The frontend must be a Single Page Application (SPA) built with React, TypeScript, dan Vite, and it must fully consume the API specified in the backend's openapi.yaml.

## Architectural & Structural Requirements:

1. Technology Stack:
   - Framework: React 18+ with TypeScript.
   - Build Tool: Vite.
   - Styling: Tailwind CSS for utility-first styling.
   - HTTP Client: Axios, with a pre-configured instance to handle Bearer Tokens and base URL from .env.
   - Routing: React Router DOM for all client-side navigation.
   - State Management: Zustand for simple and powerful global state management (e.g., user authentication, cart).
   - UI Components: Use a headless UI library like Headless UI or Radix UI for accessible, unstyled components (modals, dropdowns, etc.) that we can style with Tailwind.

2. Project Structure:

    Generate a clear, feature-based directory structure:

    src/
    ├── api/             # All Axios service files (productApi.ts, authApi.ts)
    ├── assets/          # Images, fonts, etc.
    ├── components/      # Reusable UI components (Button, Modal, Table, etc.)
    ├── contexts/        # (Optional, if needed) React contexts
    ├── hooks/           # Custom hooks (useAuth, useDebounce, etc.)
    ├── layouts/         # Main layout components (DashboardLayout, AuthLayout)
    ├── pages/           # Top-level page components for each route
    ├── stores/          # Zustand store definitions (authStore.ts, cartStore.ts)
    ├── types/           # TypeScript type definitions (e.g., from OpenAPI)
    └── utils/           # Utility functions

3. Authentication Flow:
   - Create an authStore (Zustand) to manage user state, token, and tenant information globally.
   - The token should be persisted in localStorage.
   - Implement a Protected Route component that checks for a valid token. If no token exists, it redirects the user to the /login page.
   - The Axios instance must automatically attach the Authorization: Bearer <token> header to every request if a token is present.

## Required Pages & Features (MVP):

Please generate the following pages, complete with necessary components and API integrations:

1. Auth Pages (using AuthLayout):
   - LoginPage.tsx: A form to log in. On success, it should store the token and user data in the Zustand store and redirect to the dashboard.
   - RegisterPage.tsx: A form to register a new tenant and user.

2. Dashboard & Core App Pages (using DashboardLayout):
   - DashboardLayout.tsx: A main layout with a persistent sidebar for navigation and a header showing the logged-in user's name and a logout button.
   - DashboardPage.tsx: The main landing page after login. Display summary cards for "Today's Sales," "Total Products," etc. (using data from DashboardService).

3. PosPage.tsx (Halaman Kasir):
   - A grid of products fetched from the API.
   - A "Cart" section on the side.
   - Clicking a product adds it to the cart.
   - A "Pay" button that opens a payment modal. The modal should process the transaction by calling the POST /orders endpoint.

4. ProductsPage.tsx (Manajemen Produk):
   - A table displaying all products for the tenant.
   - "Add Product" button that opens a modal form.
   - "Edit" and "Delete" buttons for each product in the table.

5. OrdersPage.tsx (Riwayat Transaksi):
   - A table listing all past orders/transactions.
   - Ability to click on an order to see its details in a modal.

6. UsersPage.tsx (Manajemen User):
   - A table listing all users within the current tenant.
   - "Invite User" button.
   - Ability to edit a user's role.

7. RolesPage.tsx (Manajemen Role):
   - A page to view and create roles.
   - A form to create a new role and assign permissions to it (fetch available permissions from the API).

## Final Instruction:
Generate this complete React project in a new frontend directory. Ensure all API calls correctly use the base URL from VITE_API_URL in the .env file and pass the tenantId (stored in the global state after login) in the URL where required. The UI should be clean, responsive, and functional.