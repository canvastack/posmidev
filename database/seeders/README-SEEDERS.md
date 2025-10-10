# Database Seeders Documentation

## 📚 Overview

Dokumentasi lengkap untuk seeder data POSMID, termasuk seeder khusus untuk BOM Engine Phase 1.

## 🎯 Seeder yang Tersedia

### 1. **SystemTenantSeeder**
- Membuat HQ Tenant (Canvastack)
- Membuat Super Admin user di HQ scope
- **Run**: `php artisan db:seed --class=SystemTenantSeeder`

### 2. **DummyDataSeeder**
- Membuat 20 tenant dengan business profile berbeda
- Setiap tenant mendapat:
  - 30-50 users dengan berbagai role
  - 5 categories sesuai business type
  - 20-38 products
  - 30-50 customers
  - 8-15 orders (12 dari 20 tenant)
  - 20 stock adjustments
- **Run**: `php artisan db:seed --class=DummyDataSeeder`

### 3. **SampleTenantsSeeder**
- Membuat 3 tenant sederhana (Tenant A, B, C)
- Untuk testing picker/dropdown options
- **Run**: `php artisan db:seed --class=SampleTenantsSeeder`

### 4. **PermissionSeeder**
- Membuat semua permissions yang diperlukan
- Memastikan semua tenant punya permission set lengkap
- **Run**: `php artisan db:seed --class=PermissionSeeder`

### 5. **BOMComprehensiveSeeder** ⭐ NEW
Seeder khusus untuk BOM Engine Phase 1. Untuk setiap tenant (kecuali HQ), membuat:

#### **Suppliers** (10-20 per tenant)
- Realistic supplier names (Food, Packaging, Chemicals, General)
- Contact person, email, phone, address
- Status: 75% active, 25% inactive
- Example: "Fresh Market A", "PackCo B", "ChemSupply C"

#### **Product Tags** (15-25 per tenant)
- Categories: Promo, Quality, Category, Attributes
- Tags: sale, discount, premium, best-seller, new-arrival, organic, eco-friendly, dll
- Random colors: blue, green, red, yellow, purple, pink, indigo, teal, orange, gray
- Automatically attached to products (3-5 tags per product)

#### **Materials** (20-30 per tenant)
- 5 Categories:
  - **Raw Materials**: Sugar, Salt, Flour, Rice, Wheat, Corn, Oil, Butter, Milk, Cream
  - **Packaging**: Box (Small/Medium/Large), Paper Bag, Plastic Bag, Bubble Wrap, Tape, Label, Sticker, Ribbon
  - **Ingredients**: Chocolate, Vanilla Extract, Baking Powder, Yeast, Cocoa Powder, Coffee Beans, Tea Leaves, Spices
  - **Chemicals**: Preservatives, Food Coloring (Red/Blue/Yellow), Flavoring Agent, Emulsifier, Stabilizer, Antioxidant
  - **Components**: Cap, Lid, Pump, Spray Nozzle, Handle, Strap, Button, Zipper, Buckle, Hook
- Realistic units: kg, g, liter, ml, pcs, box, roll, set, pair
- Stock quantity: 50%-300% dari reorder level (some low stock untuk testing alerts)
- Unit cost: varies by unit type (realistic pricing)
- Unique SKU: MAT-XXXXXX

#### **Recipes** (10-15 per tenant)
- Created for existing products yang belum punya recipe
- 1-2 recipes per product (active recipe + alternate recipe)
- Each recipe contains 3-7 materials
- Realistic quantity requirements based on material unit
- Waste percentage: 0-10% (realistic production waste)
- Yield quantity: 1-10 units
- Instructions and notes (optional)

#### **Stock Alerts** (5-10 per tenant)
- Auto-generated untuk low stock products
- Severity levels:
  - **out_of_stock**: stock = 0
  - **critical**: stock ≤ 50% reorder point
  - **low**: stock < reorder point
- Status: pending (majority), acknowledged, resolved
- 70% notified dengan notified_at timestamp

#### **Content Pages** (5-10 per tenant)
- Pages: About Us, Contact, Privacy Policy, Terms of Service, FAQ, Shipping Policy, Return Policy, Our Story, Careers, Blog
- Realistic content (3-8 paragraphs)
- Meta description for SEO
- 90% active, 10% inactive
- Published dates: last 6 months

**Run**: `php artisan db:seed --class=BOMComprehensiveSeeder`

### 6. **ComprehensiveOrdersSeeder** ⭐ NEW
Memastikan semua tenant punya data order yang lengkap:

#### **Orders** (10-20 per tenant)
- Various payment methods: cash, card, qris, transfer, e-wallet
- Status distribution:
  - 70% paid (complete orders)
  - 20% pending (partial payment or no payment)
  - 10% cancelled
- 1-8 items per order
- Random discounts (20% chance, 5-30% discount)
- Realistic timestamps (last 90 days)
- Stock deduction hanya untuk paid orders

**Run**: `php artisan db:seed --class=ComprehensiveOrdersSeeder`

### 7. **ContentPagesSeeder**
- Seed default content pages untuk tenant
- **Run**: `php artisan db:seed --class=ContentPagesSeeder`

### 8. **VariantTemplateSeeder**
- Seed system variant templates (Week 14)
- **Run**: `php artisan db:seed --class=VariantTemplateSeeder`

---

## 🚀 Cara Menjalankan Seeders

### Run All Seeders (Fresh Database)
```bash
# Reset database dan run semua seeders
php artisan migrate:fresh --seed

# Atau step by step:
php artisan migrate:fresh
php artisan db:seed
```

### Run Specific Seeder
```bash
# Run hanya BOM seeder
php artisan db:seed --class=BOMComprehensiveSeeder

# Run hanya Orders seeder
php artisan db:seed --class=ComprehensiveOrdersSeeder

# Run multiple seeders (manual)
php artisan db:seed --class=BOMComprehensiveSeeder
php artisan db:seed --class=ComprehensiveOrdersSeeder
```

### Run BOM Seeders Only (Recommended for Testing)
```bash
# Jika database sudah ada tenant dan products
php artisan db:seed --class=BOMComprehensiveSeeder
php artisan db:seed --class=ComprehensiveOrdersSeeder
```

### Full Reset with BOM Data (Complete Fresh Start)
```bash
# Complete fresh start dengan semua data termasuk BOM
php artisan migrate:fresh --seed

# Clear caches after seeding
php artisan config:clear
php artisan cache:clear
php artisan permission:cache-reset
```

---

## 📊 Expected Data Volume

Setelah menjalankan semua seeders dengan **20 tenants**, Anda akan mendapatkan:

### Per Tenant:
- ✅ **Users**: 30-50 users (various roles)
- ✅ **Categories**: 5 categories (business-specific)
- ✅ **Products**: 20-38 products
- ✅ **Customers**: 30-50 customers
- ✅ **Orders**: 10-20 orders (various statuses)
- ✅ **Suppliers**: 10-20 suppliers
- ✅ **Product Tags**: 15-25 tags
- ✅ **Materials**: 20-30 materials (BOM)
- ✅ **Recipes**: 10-15 recipes (BOM)
- ✅ **Recipe Materials**: 30-105 recipe materials (3-7 per recipe)
- ✅ **Stock Alerts**: 5-10 alerts
- ✅ **Content Pages**: 5-10 pages

### Total (20 Tenants):
- ✅ **Users**: ~800 users
- ✅ **Categories**: ~100 categories
- ✅ **Products**: ~580 products
- ✅ **Customers**: ~800 customers
- ✅ **Orders**: ~300 orders with ~900 order items
- ✅ **Suppliers**: ~300 suppliers
- ✅ **Product Tags**: ~400 tags with ~1,700 product-tag associations
- ✅ **Materials**: ~500 materials
- ✅ **Recipes**: ~250 recipes
- ✅ **Recipe Materials**: ~1,000 recipe materials
- ✅ **Stock Alerts**: ~150 alerts
- ✅ **Content Pages**: ~150 pages

---

## 🎯 Testing Specific Pages

### 1. Test Suppliers Page
```bash
# Ensure suppliers exist
php artisan db:seed --class=BOMComprehensiveSeeder

# Navigate to:
http://localhost:5173/admin/suppliers
```

### 2. Test Product Tags Page
```bash
# Ensure tags exist
php artisan db:seed --class=BOMComprehensiveSeeder

# Navigate to:
http://localhost:5173/admin/product-tags
```

### 3. Test Materials Page (BOM)
```bash
# Ensure materials exist
php artisan db:seed --class=BOMComprehensiveSeeder

# Navigate to:
http://localhost:5173/admin/materials
```

### 4. Test Recipes Page (BOM)
```bash
# Ensure recipes exist
php artisan db:seed --class=BOMComprehensiveSeeder

# Navigate to:
http://localhost:5173/admin/recipes
```

### 5. Test BOM Dashboard
```bash
# Ensure all BOM data exists
php artisan db:seed --class=BOMComprehensiveSeeder

# Navigate to:
http://localhost:5173/admin/bom-dashboard
```

### 6. Test Stock Alerts Page
```bash
# Ensure alerts exist
php artisan db:seed --class=BOMComprehensiveSeeder

# Navigate to:
http://localhost:5173/admin/stock-alerts
```

### 7. Test Orders Page
```bash
# Ensure orders exist
php artisan db:seed --class=ComprehensiveOrdersSeeder

# Navigate to:
http://localhost:5173/admin/orders
```

### 8. Test Analytics Dashboard
```bash
# Ensure complete data exists
php artisan migrate:fresh --seed

# Navigate to:
http://localhost:5173/admin/analytics
```

### 9. Test Content Pages
```bash
# Ensure content pages exist
php artisan db:seed --class=BOMComprehensiveSeeder

# Navigate to:
http://localhost:5173/admin/content-pages
```

---

## 🔧 Troubleshooting

### Issue: "Table not found"
```bash
# Run migrations first
php artisan migrate
```

### Issue: "Tenant not found"
```bash
# Seed tenants first
php artisan db:seed --class=SystemTenantSeeder
php artisan db:seed --class=DummyDataSeeder
```

### Issue: "No products found for recipes"
```bash
# Make sure products exist first
php artisan db:seed --class=DummyDataSeeder
# Then seed BOM data
php artisan db:seed --class=BOMComprehensiveSeeder
```

### Issue: "Duplicate entry"
```bash
# Seeders use firstOrCreate, so safe to run multiple times
# But if you want fresh data:
php artisan migrate:fresh --seed
```

### Issue: Permission Errors
```bash
# Clear permission caches
php artisan permission:cache-reset
php artisan config:clear
php artisan cache:clear
```

---

## 🎨 Customization

### Adjust Data Volume

Edit seeder files untuk mengubah jumlah data:

**BOMComprehensiveSeeder.php**:
```php
// Line ~145: Suppliers
$count = random_int(10, 20); // Change to: random_int(5, 10)

// Line ~174: Product Tags
$count = random_int(15, 25); // Change to: random_int(10, 15)

// Line ~193: Materials
$count = random_int(20, 30); // Change to: random_int(10, 15)

// Line ~252: Recipes
->limit(random_int(10, 15)) // Change to: ->limit(random_int(5, 8))
```

**ComprehensiveOrdersSeeder.php**:
```php
// Line ~38: Orders per tenant
$targetCount = random_int(10, 20); // Change to: random_int(5, 10)

// Line ~69: Items per order
$itemsCount = random_int(1, 8); // Change to: random_int(1, 5)
```

### Add New Material Categories

Edit `BOMComprehensiveSeeder.php`:
```php
private array $materialCategories = [
    'Raw Materials' => [...],
    'Packaging' => [...],
    // Add new category:
    'Electronics' => [
        'units' => ['pcs', 'set'],
        'items' => ['LED', 'Sensor', 'Circuit Board', 'Wire', 'Battery'],
    ],
];
```

---

## 📝 Notes

### Immutable Rules Compliance
Semua seeder mematuhi immutable rules POSMID:
- ✅ **Tenant Scoping**: Semua data di-scope ke `tenant_id`
- ✅ **UUID Primary Keys**: Semua model menggunakan UUID
- ✅ **Guard Name**: Permissions menggunakan `api` guard
- ✅ **No Global Roles**: Semua roles/permissions tenant-scoped
- ✅ **Team Context**: Spatie permissions di-set per tenant

### Performance Considerations
- Seeding 20 tenants dengan full data membutuhkan **3-5 menit**
- Menggunakan `DB::transaction()` untuk performance
- `firstOrCreate()` mencegah duplicate entries
- Safe untuk di-run multiple times

### Data Realism
- Nama bisnis, produk, dan material dibuat realistic sesuai business type
- Stock levels dan pricing menggunakan range realistic
- Order statuses dan payment methods mencerminkan real-world scenarios
- Timestamps di-random untuk simulate historical data

---

## 🎉 Quick Commands Cheat Sheet

```bash
# Full fresh start
php artisan migrate:fresh --seed

# Seed BOM data only
php artisan db:seed --class=BOMComprehensiveSeeder

# Seed Orders data only
php artisan db:seed --class=ComprehensiveOrdersSeeder

# Seed both BOM and Orders
php artisan db:seed --class=BOMComprehensiveSeeder
php artisan db:seed --class=ComprehensiveOrdersSeeder

# Clear caches after seeding
php artisan config:clear && php artisan cache:clear && php artisan permission:cache-reset

# Check seeded data
php artisan tinker
> Tenant::count()
> Material::count()
> Recipe::count()
> Order::count()
```

---

## 📞 Support

Jika ada issues atau pertanyaan, check:
1. Database migrations sudah run semua
2. `.env` database configuration sudah benar
3. Tenants sudah di-seed (SystemTenantSeeder + DummyDataSeeder)
4. Products sudah exist sebelum seed recipes
5. Permission caches sudah di-clear

Happy seeding! 🌱