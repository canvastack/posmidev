# 🌱 Panduan Seeder Data POSMID - BOM Phase 1

## 🎯 Ringkasan

Panduan lengkap untuk menjalankan seeder data dummy pada sistem POSMID, khususnya untuk modul BOM (Bill of Materials) Phase 1.

---

## 📦 Data yang Akan Dibuat

Setelah menjalankan seeder lengkap, setiap tenant akan memiliki:

| Module | Jumlah Data | Deskripsi |
|--------|------------|-----------|
| **Suppliers** | 10-20 | Supplier dengan contact person, email, phone, address |
| **Product Tags** | 15-25 | Tags untuk kategorisasi produk (promo, quality, organic, dll) |
| **Materials** | 20-30 | Raw materials untuk BOM dengan stock, reorder level, cost |
| **Recipes** | 10-15 | Resep produksi dengan 3-7 materials per recipe |
| **Stock Alerts** | 5-10 | Alert untuk produk yang low stock atau out of stock |
| **Orders** | 10-20 | Orders dengan status: paid (70%), pending (20%), cancelled (10%) |
| **Content Pages** | 5-10 | Halaman konten: About, Contact, FAQ, Privacy Policy, dll |

---

## 🚀 Cara Menjalankan Seeder

### Option 1: Fresh Start - Full Reset Database ⚠️

**PERINGATAN**: Ini akan menghapus SEMUA data di database!

```bash
# Reset database + seed semua data
php artisan migrate:fresh --seed

# Clear caches setelah seeding
php artisan config:clear
php artisan cache:clear
php artisan permission:cache-reset
```

Setelah selesai, Anda akan punya:
- ✅ 1 HQ Tenant (Canvastack)
- ✅ 20 Business Tenants dengan data lengkap
- ✅ 3 Sample Tenants (Tenant A, B, C)
- ✅ Semua data BOM, Orders, Tags, Suppliers, dll

**Waktu estimasi**: 3-5 menit

---

### Option 2: Seed BOM Data Saja (Database Sudah Ada) ✅ RECOMMENDED

Jika database Anda sudah ada tenant dan produk, tapi hanya ingin menambahkan data BOM:

```bash
# Seed BOM data (Suppliers, Tags, Materials, Recipes, Alerts, Pages)
php artisan db:seed --class=BOMComprehensiveSeeder

# Seed Orders data (ensure all tenants have 10-20 orders)
php artisan db:seed --class=ComprehensiveOrdersSeeder

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan permission:cache-reset
```

**Waktu estimasi**: 1-2 menit

**Safe to run multiple times**: Seeder menggunakan `firstOrCreate()` jadi aman dijalankan berulang kali.

---

### Option 3: Seed Modul Tertentu Saja

Jika hanya ingin seed modul tertentu:

```bash
# Suppliers + Tags + Materials + Recipes + Alerts + Pages
php artisan db:seed --class=BOMComprehensiveSeeder

# Orders only
php artisan db:seed --class=ComprehensiveOrdersSeeder

# System Tenant only (HQ)
php artisan db:seed --class=SystemTenantSeeder

# Business Tenants only
php artisan db:seed --class=DummyDataSeeder

# Permissions only
php artisan db:seed --class=PermissionSeeder
```

---

## 🧪 Testing Data yang Di-Seed

### 1. Check di Tinker

```bash
php artisan tinker
```

```php
// Check tenants
Tenant::count()
// Expected: 21-24 (1 HQ + 20 business + 3 sample)

// Check materials (BOM)
Material::count()
// Expected: 400-600 (20-30 per tenant)

// Check recipes (BOM)
Recipe::count()
// Expected: 200-300 (10-15 per tenant)

// Check suppliers
Supplier::count()
// Expected: 200-400 (10-20 per tenant)

// Check product tags
ProductTag::count()
// Expected: 300-500 (15-25 per tenant)

// Check orders
Order::count()
// Expected: 200-400 (10-20 per tenant)

// Check stock alerts
StockAlert::count()
// Expected: 100-200 (5-10 per tenant)

// Check for specific tenant
$tenant = Tenant::where('name', 'like', 'Warung Kopi%')->first();
Material::where('tenant_id', $tenant->id)->count();
Recipe::where('tenant_id', $tenant->id)->count();
```

---

### 2. Check di Frontend

Jalankan backend dan frontend:

```bash
# Terminal 1 - Backend
php artisan serve

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Kemudian buka browser dan test halaman-halaman berikut:

#### **1. Suppliers**
```
http://localhost:5173/admin/suppliers
```
**Expected**: 
- List of 10-20 suppliers per tenant
- Supplier names, contact, email, phone, address
- Status: active/inactive

#### **2. Product Tags**
```
http://localhost:5173/admin/product-tags
```
**Expected**:
- List of 15-25 tags per tenant
- Tag names dengan colors
- Usage count (berapa produk yang pakai tag ini)

#### **3. Materials (BOM)**
```
http://localhost:5173/admin/materials
```
**Expected**:
- List of 20-30 materials
- Categories: Raw Materials, Packaging, Ingredients, Chemicals, Components
- SKU, stock quantity, reorder level, unit cost
- Low stock indicators (red/orange/yellow)

#### **4. Recipes (BOM)**
```
http://localhost:5173/admin/recipes
```
**Expected**:
- List of 10-15 recipes
- Recipe names (product names)
- Active/inactive status
- Yield quantity dan unit
- Klik detail untuk lihat materials (3-7 materials per recipe)

#### **5. BOM Dashboard**
```
http://localhost:5173/admin/bom-dashboard
```
**Expected**:
- Widget: Active Alerts (5-10 alerts)
- Widget: Low Stock Materials (materials below reorder level)
- Widget: Recipe Status (active/inactive recipes count)
- Chart: Material Stock Levels
- Chart: Cost Breakdown by Category
- Table: Recent Material Transactions

#### **6. Stock Alerts**
```
http://localhost:5173/admin/stock-alerts
```
**Expected**:
- List of 5-10 alerts per tenant
- Severity: low (yellow), critical (orange), out_of_stock (red)
- Status: pending, acknowledged, resolved
- Product name, current stock, reorder point

#### **7. Orders**
```
http://localhost:5173/admin/orders
```
**Expected**:
- List of 10-20 orders
- Invoice numbers
- Status: paid (70%), pending (20%), cancelled (10%)
- Total amounts
- Payment methods: cash, card, qris, transfer, e-wallet

#### **8. Analytics Dashboard**
```
http://localhost:5173/admin/analytics
```
**Expected**:
- Sales charts dengan data dari orders
- Top products
- Revenue trends
- Customer analytics

#### **9. Content Pages**
```
http://localhost:5173/admin/content-pages
```
**Expected**:
- List of 5-10 pages
- Pages: About Us, Contact, FAQ, Privacy Policy, Terms, dll
- Status: published/draft

---

## 📊 Detail Data yang Di-Seed

### Materials (20-30 per tenant)

**Categories:**
1. **Raw Materials**
   - Items: Sugar, Salt, Flour, Rice, Wheat, Corn, Oil, Butter, Milk, Cream
   - Units: kg, g, liter, ml

2. **Packaging**
   - Items: Box (Small/Medium/Large), Paper Bag, Plastic Bag, Bubble Wrap, Tape, Label, Sticker, Ribbon
   - Units: pcs, box, roll

3. **Ingredients**
   - Items: Chocolate, Vanilla Extract, Baking Powder, Yeast, Cocoa Powder, Coffee Beans, Tea Leaves, Spices
   - Units: kg, g, liter, ml, pcs

4. **Chemicals**
   - Items: Preservatives, Food Coloring (Red/Blue/Yellow), Flavoring Agent, Emulsifier, Stabilizer, Antioxidant
   - Units: liter, ml, kg, g

5. **Components**
   - Items: Cap, Lid, Pump, Spray Nozzle, Handle, Strap, Button, Zipper, Buckle, Hook
   - Units: pcs, set, pair

**Stock Levels:**
- Random stock between 50% - 300% dari reorder level
- Some materials intentionally low stock untuk testing alerts
- Realistic unit costs berdasarkan unit type

**Example Material:**
```json
{
  "sku": "MAT-ABC123",
  "name": "Sugar",
  "category": "Raw Materials",
  "unit": "kg",
  "stock_quantity": 75.500,
  "reorder_level": 50.000,
  "unit_cost": 12.50
}
```

---

### Recipes (10-15 per tenant)

**Structure:**
- Terhubung ke product yang sudah ada
- 1-2 recipes per product (1 active, 1 alternate/inactive)
- Each recipe contains 3-7 materials
- Quantity required realistic based on material unit
- Waste percentage: 0-10% (production waste)

**Example Recipe:**
```json
{
  "name": "Roti Tawar",
  "product_id": "uuid-product",
  "yield_quantity": 5.000,
  "yield_unit": "pcs",
  "is_active": true,
  "materials": [
    {
      "material": "Flour",
      "quantity_required": 2.500,
      "unit": "kg",
      "waste_percentage": 5.00
    },
    {
      "material": "Sugar",
      "quantity_required": 0.500,
      "unit": "kg",
      "waste_percentage": 2.00
    },
    ...
  ]
}
```

---

### Suppliers (10-20 per tenant)

**Types:**
1. **Food**: Fresh Market, Organic Farm, Bulk Foods, Premium Grocers, Wholesale Foods
2. **Packaging**: PackCo, BoxMaster, WrapIt, Packaging Solutions, EcoPack
3. **Chemicals**: ChemSupply, Industrial Chemicals, SafeChem, PureChem, QualityChem
4. **General**: Universal Supplies, Total Solutions, Mega Supplier, Prime Vendors, Supply Hub

**Example Supplier:**
```json
{
  "name": "Fresh Market A",
  "contact_person": "John Doe",
  "email": "fresh-market-a@supplier.example.com",
  "phone": "+62-xxx-xxxx-xxxx",
  "address": "Jl. xxx, Jakarta",
  "status": "active"
}
```

---

### Product Tags (15-25 per tenant)

**Categories:**
1. **Promo**: sale, discount, promo, clearance, special-offer, limited-time, flash-sale, bundle
2. **Quality**: premium, best-seller, top-rated, featured, exclusive, limited-edition, handmade, artisan
3. **Category**: new-arrival, seasonal, trending, popular, recommended, staff-pick, bestseller
4. **Attributes**: organic, eco-friendly, sustainable, vegan, gluten-free, sugar-free, halal, kosher

**Colors**: blue, green, red, yellow, purple, pink, indigo, teal, orange, gray

**Auto-attached to products**: 3-5 tags per product randomly

---

### Orders (10-20 per tenant)

**Status Distribution:**
- 70% **Paid**: Complete orders, stock deducted, payment complete
- 20% **Pending**: Partial or no payment, stock not deducted
- 10% **Cancelled**: No payment, stock not deducted

**Payment Methods:**
- cash, card, qris, transfer, e-wallet

**Order Details:**
- 1-8 items per order
- Random discounts (20% chance, 5-30% discount)
- Realistic timestamps (last 90 days)

---

### Stock Alerts (5-10 per tenant)

**Auto-generated for low stock products:**

**Severity Levels:**
- **out_of_stock**: stock = 0 (RED)
- **critical**: stock ≤ 50% reorder point (ORANGE)
- **low**: stock < reorder point (YELLOW)

**Status:**
- **pending**: Baru detected, belum di-acknowledge
- **acknowledged**: Sudah di-acknowledge oleh user
- **resolved**: Stock sudah di-replenish

**70% notified** dengan timestamp kapan notifikasi dikirim

---

## 🔧 Troubleshooting

### Problem: "Table 'materials' doesn't exist"

**Solution:**
```bash
# Run migrations first
php artisan migrate
```

---

### Problem: "No products found for recipes"

**Solution:**
```bash
# Make sure products exist first
php artisan db:seed --class=DummyDataSeeder

# Then seed BOM data
php artisan db:seed --class=BOMComprehensiveSeeder
```

---

### Problem: Duplicate entries atau errors

**Solution:**
```bash
# Fresh start - reset database
php artisan migrate:fresh --seed
```

---

### Problem: Permission errors di frontend

**Solution:**
```bash
# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan permission:cache-reset

# Restart server
php artisan serve
```

---

### Problem: Frontend tidak menampilkan data

**Solution:**
```bash
# Check tenant ID di frontend (via browser console)
# Make sure you're logged in as user from correct tenant

# Check API endpoint works:
curl http://localhost:8000/api/v1/tenants/{tenantId}/materials

# Check database directly:
php artisan tinker
Material::where('tenant_id', 'your-tenant-uuid')->count()
```

---

## 🎨 Customize Data Volume

Jika ingin mengubah jumlah data yang di-seed, edit file seeder:

**File**: `database/seeders/BOMComprehensiveSeeder.php`

```php
// Line ~145: Ubah jumlah suppliers
$count = random_int(10, 20); // Change to: random_int(5, 10)

// Line ~174: Ubah jumlah product tags
$count = random_int(15, 25); // Change to: random_int(8, 15)

// Line ~193: Ubah jumlah materials
$count = random_int(20, 30); // Change to: random_int(10, 20)

// Line ~252: Ubah jumlah recipes
->limit(random_int(10, 15)) // Change to: ->limit(random_int(5, 10))
```

**File**: `database/seeders/ComprehensiveOrdersSeeder.php`

```php
// Line ~38: Ubah jumlah orders per tenant
$targetCount = random_int(10, 20); // Change to: random_int(5, 10)
```

---

## ✅ Checklist Setelah Seeding

- [ ] Database migrations sudah run
- [ ] Semua seeders berhasil run tanpa error
- [ ] Permission caches sudah di-clear
- [ ] Backend server running (`php artisan serve`)
- [ ] Frontend server running (`npm run dev`)
- [ ] Login dengan credentials yang benar
- [ ] Test semua halaman:
  - [ ] Suppliers page menampilkan data
  - [ ] Product Tags page menampilkan data
  - [ ] Materials page menampilkan data
  - [ ] Recipes page menampilkan data
  - [ ] BOM Dashboard menampilkan widgets dan charts
  - [ ] Stock Alerts page menampilkan alerts
  - [ ] Orders page menampilkan orders
  - [ ] Analytics dashboard menampilkan charts
  - [ ] Content Pages menampilkan pages

---

## 🎉 Quick Commands

```bash
# Full reset + seed everything
php artisan migrate:fresh --seed && php artisan config:clear && php artisan cache:clear && php artisan permission:cache-reset

# Seed BOM data only
php artisan db:seed --class=BOMComprehensiveSeeder && php artisan config:clear && php artisan cache:clear

# Seed Orders data only
php artisan db:seed --class=ComprehensiveOrdersSeeder

# Check data counts
php artisan tinker
> Tenant::count()
> Material::count()
> Recipe::count()
> Supplier::count()
> Order::count()
> exit
```

---

## 📞 Login Credentials

Setelah seeding, gunakan credentials berikut untuk login:

### **HQ Tenant (Canvastack)**
```
Email: admin@canvastack.local
Password: password
```

### **Business Tenants**
Pattern email: `admin@{business-slug}{number}.local`

Examples:
```
Email: admin@warung-kopi1.local
Password: password

Email: admin@minimarket2.local
Password: password

Email: admin@apotek3.local
Password: password
```

**List semua tenants**:
```bash
php artisan tinker
> Tenant::all()->pluck('name', 'id')
```

---

## 📚 Dokumentasi Lainnya

- **README-SEEDERS.md**: English version + technical details
- **Seeder Files**:
  - `BOMComprehensiveSeeder.php`: Main BOM seeder
  - `ComprehensiveOrdersSeeder.php`: Orders seeder
  - `DatabaseSeeder.php`: Master seeder orchestrator

---

Selamat testing! 🚀🌱

Jika ada pertanyaan atau issues, pastikan:
1. ✅ Migrations sudah run
2. ✅ Database config di `.env` sudah benar
3. ✅ Tenants sudah di-seed
4. ✅ Caches sudah di-clear
5. ✅ Servers (backend + frontend) running