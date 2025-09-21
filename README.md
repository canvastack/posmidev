# Canvastack POSMID - Laravel Backend

## Overview

Canvastack POSMID adalah sistem Point of Sale (P.O.S.) multi-tenant yang dibangun dengan arsitektur Hexagonal (Ports and Adapters) menggunakan Laravel 10. Sistem ini dirancang dengan pendekatan API-First dan mengikuti prinsip-prinsip clean architecture.

## Arsitektur

### Hexagonal Architecture (Ports and Adapters)

Proyek ini mengimplementasikan Hexagonal Architecture dengan struktur sebagai berikut:

```
src/Pms/
├── Core/                           # Domain Layer (Business Logic)
│   ├── Domain/
│   │   ├── Entities/              # Domain Entities
│   │   └── Repositories/          # Repository Interfaces (Ports)
│   └── Application/
│       └── Services/              # Application Services
└── Infrastructure/                 # Infrastructure Layer (Adapters)
    ├── Models/                    # Eloquent Models
    └── Repositories/              # Repository Implementations
```

### Prinsip Utama

1. **Domain Layer** (`src/Pms/Core`): Berisi business logic murni, tidak bergantung pada framework Laravel
2. **Infrastructure Layer** (`src/Pms/Infrastructure`): Implementasi konkret dari interfaces, menggunakan Eloquent ORM
3. **Application Layer** (`app/Http`): Controllers Laravel yang bertindak sebagai Input Adapters

## Fitur Utama

### 1. Multi-Tenancy
- Setiap tenant memiliki data yang terisolasi
- User hanya dapat mengakses data tenant mereka sendiri

### 2. Authentication & Authorization
- Stateless Bearer Token authentication menggunakan Laravel Sanctum
- Role-based permissions menggunakan Spatie Laravel Permission
- Roles: Admin, Manager, Cashier

### 3. Product Management
- CRUD operations untuk produk
- SKU unik per tenant
- Stock management
- Category support

### 4. Sales Management
- Point of Sale transactions
- Invoice generation
- Multiple payment methods (Cash, Card, QRIS)
- Stock reduction otomatis

### 5. API-First Design
- Mengikuti OpenAPI 3.0 specification
- Automatic request validation
- Consistent JSON responses

## Menu Aplikasi P.O.S.

Berdasarkan peta menu yang telah didefinisikan, sistem mendukung:

1. **Dashboard** - Overview bisnis harian
2. **Kasir (P.O.S. Screen)** - Transaksi penjualan
3. **Manajemen Penjualan** - Riwayat transaksi dan refund
4. **Manajemen Inventaris** - Produk, kategori, stok, supplier
5. **Manajemen Pelanggan (CRM)** - Data pelanggan dan riwayat
6. **Laporan** - Sales, profit/loss, stock, performance reports
7. **Pengaturan** - Profil toko, user management, roles, cabang

## Installation

1. Clone repository dan install dependencies:
```bash
composer install
```

2. Setup environment:
```bash
cp .env.example .env
php artisan key:generate

php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider" --tag="permission-migrations"
```

3. Configure database (PostgreSQL):
```env
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=posmid
DB_USERNAME=postgres
DB_PASSWORD=password
```

4. Configure Sanctum for stateless API:
```env
SANCTUM_STATEFUL_DOMAINS=
SESSION_DRIVER=array
```

5. Run migrations and seeders:
```bash
php artisan migrate
php artisan db:seed
```

## API Endpoints

### Authentication
- `POST /api/v1/register` - Register tenant dan user
- `POST /api/v1/login` - Login user
- `POST /api/v1/logout` - Logout user
- `GET /api/v1/user` - Get current user info

### Products
- `GET /api/v1/tenants/{tenantId}/products` - List products
- `POST /api/v1/tenants/{tenantId}/products` - Create product
- `GET /api/v1/tenants/{tenantId}/products/{productId}` - Get product
- `PUT /api/v1/tenants/{tenantId}/products/{productId}` - Update product
- `DELETE /api/v1/tenants/{tenantId}/products/{productId}` - Delete product

### Orders
- `POST /api/v1/tenants/{tenantId}/orders` - Create order/transaction

## Database Schema

### Core Tables
- `tenants` - Tenant information
- `users` - User accounts dengan tenant isolation
- `products` - Product catalog per tenant
- `categories` - Product categories
- `orders` - Sales transactions
- `order_items` - Transaction line items
- `customers` - Customer data
- `stock_adjustments` - Stock movement history

### Permission System
- `roles` - User roles (admin, manager, cashier)
- `permissions` - Granular permissions
- `role_has_permissions` - Role-permission mapping
- `model_has_roles` - User-role assignment

## Security Features

1. **Tenant Isolation**: Semua data terisolasi per tenant
2. **Role-based Access Control**: Granular permissions
3. **API Authentication**: Stateless Bearer tokens
4. **Request Validation**: Automatic OpenAPI validation
5. **Policy Authorization**: Laravel policies untuk resource access

## Development Guidelines

### Adding New Features

1. **Domain Entity**: Buat entity di `src/Pms/Core/Domain/Entities/`
2. **Repository Interface**: Define interface di `src/Pms/Core/Domain/Repositories/`
3. **Application Service**: Business logic di `src/Pms/Core/Application/Services/`
4. **Infrastructure**: Eloquent model dan repository implementation
5. **API Layer**: Controller, Request, Resource, Policy

### Testing

```bash
php artisan test
```

### Code Quality

- Follow PSR-12 coding standards
- Use type hints dan return types
- Implement proper error handling
- Write comprehensive tests

## Deployment

1. Set production environment variables
2. Run migrations: `php artisan migrate --force`
3. Seed permissions: `php artisan db:seed --class=PermissionSeeder --force`
4. Optimize for production:
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Contributing

1. Fork repository
2. Create feature branch
3. Follow coding standards
4. Write tests
5. Submit pull request

## License

This project is proprietary software developed by Canvastack.