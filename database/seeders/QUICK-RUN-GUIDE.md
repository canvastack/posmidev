# ⚡ Quick Run Guide - BOM Seeders

## 🎯 Pilih Skenario Anda

### 🆕 Skenario 1: Fresh Database (Recommended untuk Testing)
**Situation**: Database kosong atau ingin reset semua data

```bash
# Step 1: Reset database + seed everything
php artisan migrate:fresh --seed

# Step 2: Clear caches
php artisan config:clear
php artisan cache:clear
php artisan permission:cache-reset

# Step 3: Start servers
php artisan serve
# Di terminal baru:
cd frontend
npm run dev

# Step 4: Login dan test
# Browser: http://localhost:5173
# Email: admin@warung-kopi1.local
# Password: password
```

**Result**:
- ✅ 1 HQ Tenant + 20 Business Tenants + 3 Sample Tenants
- ✅ ~300 Suppliers
- ✅ ~400 Product Tags
- ✅ ~500 Materials
- ✅ ~250 Recipes
- ✅ ~150 Stock Alerts
- ✅ ~300 Orders
- ✅ ~150 Content Pages
- ✅ Plus all existing data (users, products, customers)

**Time**: 3-5 minutes

---

### ➕ Skenario 2: Add BOM Data Only (Database Already Exists)
**Situation**: Database sudah ada tenant dan products, hanya ingin tambah data BOM

```bash
# Step 1: Seed BOM data
php artisan db:seed --class=BOMComprehensiveSeeder

# Step 2: Seed Orders data (optional)
php artisan db:seed --class=ComprehensiveOrdersSeeder

# Step 3: Clear caches
php artisan config:clear
php artisan cache:clear

# Step 4: Refresh browser
# Data BOM sudah muncul di halaman Materials, Recipes, dll
```

**Result**:
- ✅ Adds BOM data to existing tenants
- ✅ Safe to run multiple times (no duplicates)
- ✅ Existing data tidak berubah

**Time**: 1-2 minutes

---

### 🧪 Skenario 3: Testing Specific Modules
**Situation**: Hanya ingin test modul tertentu

#### Test Materials & Recipes Only
```bash
php artisan db:seed --class=BOMComprehensiveSeeder
# Navigate: http://localhost:5173/admin/materials
# Navigate: http://localhost:5173/admin/recipes
```

#### Test Orders Only
```bash
php artisan db:seed --class=ComprehensiveOrdersSeeder
# Navigate: http://localhost:5173/admin/orders
```

#### Test Suppliers & Tags Only
```bash
php artisan db:seed --class=BOMComprehensiveSeeder
# Navigate: http://localhost:5173/admin/suppliers
# Navigate: http://localhost:5173/admin/product-tags
```

---

## 🚦 Pre-requisites Checklist

Before running seeders, make sure:

- [ ] Database is created and configured in `.env`
- [ ] Migrations are run: `php artisan migrate`
- [ ] Composer dependencies installed: `composer install`
- [ ] `.env` has correct database credentials
- [ ] PHP version >= 8.1
- [ ] PostgreSQL running (if using PostgreSQL)

---

## ✅ Verification Steps

### 1. Check in Tinker (Quick)
```bash
php artisan tinker
```

```php
// Check counts
Tenant::count()          // Expected: 21-24
Material::count()        // Expected: 400-600
Recipe::count()          // Expected: 200-300
Supplier::count()        // Expected: 200-400
Order::count()           // Expected: 200-400

// Check specific tenant
$tenant = Tenant::where('name', 'like', 'Warung Kopi%')->first();
Material::where('tenant_id', $tenant->id)->count();  // Expected: 20-30

exit
```

### 2. Check in Browser (Visual)

**Start servers first:**
```bash
# Terminal 1
php artisan serve

# Terminal 2
cd frontend
npm run dev
```

**Then open browser and test these pages:**

1. ✅ **Materials**: http://localhost:5173/admin/materials
   - Should show 20-30 materials per tenant
   - Categories, stock levels, costs visible

2. ✅ **Recipes**: http://localhost:5173/admin/recipes
   - Should show 10-15 recipes per tenant
   - Click detail to see materials (3-7 materials each)

3. ✅ **BOM Dashboard**: http://localhost:5173/admin/bom-dashboard
   - Should show alerts widget, charts, tables
   - Low stock materials highlighted

4. ✅ **Suppliers**: http://localhost:5173/admin/suppliers
   - Should show 10-20 suppliers
   - Contact details visible

5. ✅ **Product Tags**: http://localhost:5173/admin/product-tags
   - Should show 15-25 tags with colors
   - Usage count visible

6. ✅ **Orders**: http://localhost:5173/admin/orders
   - Should show 10-20 orders
   - Various statuses (paid, pending, cancelled)

7. ✅ **Stock Alerts**: http://localhost:5173/admin/stock-alerts
   - Should show 5-10 alerts
   - Severity colors (red, orange, yellow)

8. ✅ **Analytics**: http://localhost:5173/admin/analytics
   - Should show charts with data

9. ✅ **Content Pages**: http://localhost:5173/admin/content-pages
   - Should show 5-10 pages

---

## 🎯 Login Credentials

### HQ Tenant (Canvastack)
```
URL: http://localhost:5173
Email: admin@canvastack.local
Password: password
```

### Business Tenants
```
Pattern: admin@{business-slug}{number}.local
Password: password

Examples:
- admin@warung-kopi1.local
- admin@minimarket2.local
- admin@apotek3.local
- admin@toko-elektronik4.local
- admin@toko-roti5.local
```

**Get full tenant list:**
```bash
php artisan tinker
> Tenant::where('id', '!=', config('tenancy.hq_tenant_id'))
    ->get()
    ->map(fn($t) => [
        'name' => $t->name,
        'email' => 'admin@' . \Str::slug($t->name) . '.local'
    ])
```

---

## 🐛 Troubleshooting

### Problem: "Class 'Material' not found"
**Cause**: Model not imported in seeder

**Solution**: File sudah benar, run composer dump-autoload
```bash
composer dump-autoload
php artisan db:seed --class=BOMComprehensiveSeeder
```

---

### Problem: "Table 'materials' doesn't exist"
**Cause**: Migrations not run

**Solution**:
```bash
php artisan migrate
php artisan db:seed --class=BOMComprehensiveSeeder
```

---

### Problem: "No products found for recipes"
**Cause**: Products not seeded yet

**Solution**:
```bash
# Seed tenants and products first
php artisan db:seed --class=DummyDataSeeder
# Then seed BOM data
php artisan db:seed --class=BOMComprehensiveSeeder
```

---

### Problem: Duplicate entry errors
**Cause**: Trying to seed same data twice

**Solution**: Seeders are safe to re-run (use firstOrCreate)
```bash
# Just run again, should skip existing
php artisan db:seed --class=BOMComprehensiveSeeder

# Or if you want fresh data:
php artisan migrate:fresh --seed
```

---

### Problem: Permission denied errors in frontend
**Cause**: Cache issues or auth context

**Solution**:
```bash
# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan permission:cache-reset

# Restart backend server
php artisan serve

# Hard refresh frontend (Ctrl+Shift+R)
```

---

### Problem: Frontend shows empty data
**Cause**: Wrong tenant context or data not seeded

**Solution**:
```bash
# 1. Check if data exists
php artisan tinker
> Material::count()  // Should be > 0

# 2. Check tenant ID in browser console
# Open browser console (F12)
# Check: localStorage or API calls for tenant_id

# 3. Make sure logged in as user from correct tenant

# 4. Check API endpoint directly
curl http://localhost:8000/api/v1/tenants/{tenantId}/materials
```

---

### Problem: Seeder runs slow or timeout
**Cause**: Large data volume or slow database

**Solution**:
```bash
# 1. Reduce data volume in seeder files
# Edit BOMComprehensiveSeeder.php
# Change: random_int(20, 30) to random_int(10, 15)

# 2. Increase PHP timeout
# php.ini: max_execution_time = 300

# 3. Run seeders individually
php artisan db:seed --class=SystemTenantSeeder
php artisan db:seed --class=DummyDataSeeder
php artisan db:seed --class=BOMComprehensiveSeeder
php artisan db:seed --class=ComprehensiveOrdersSeeder
```

---

## 📊 Expected Data Volumes

### Per Tenant (20 Tenants)
| Data Type | Count | Description |
|-----------|-------|-------------|
| Suppliers | 10-20 | Various types: Food, Packaging, Chemicals, General |
| Product Tags | 15-25 | Promo, Quality, Category, Attributes tags |
| Materials | 20-30 | 5 categories: Raw Materials, Packaging, Ingredients, Chemicals, Components |
| Recipes | 10-15 | 1-2 recipes per product, 3-7 materials each |
| Recipe Materials | 30-105 | Materials used in recipes |
| Stock Alerts | 5-10 | Low stock, critical, out of stock alerts |
| Orders | 10-20 | Paid (70%), Pending (20%), Cancelled (10%) |
| Content Pages | 5-10 | About, Contact, FAQ, Privacy, Terms, etc |

### Total Across All Tenants
| Data Type | Total | Note |
|-----------|-------|------|
| Tenants | 21-24 | 1 HQ + 20 business + 3 sample |
| Suppliers | ~300 | 15 avg per tenant |
| Product Tags | ~400 | 20 avg per tenant |
| Materials | ~500 | 25 avg per tenant |
| Recipes | ~250 | 12 avg per tenant |
| Recipe Materials | ~1,000 | 4 avg per recipe |
| Stock Alerts | ~150 | 7 avg per tenant |
| Orders | ~300 | 15 avg per tenant |
| Order Items | ~900 | 3 avg per order |
| Content Pages | ~150 | 7 avg per tenant |

**Plus from DummyDataSeeder:**
- ~800 Users (30-50 per tenant)
- ~100 Categories (5 per tenant)
- ~580 Products (20-38 per tenant)
- ~800 Customers (30-50 per tenant)

**Total Database Records**: ~5,000-6,000 records

---

## 🎨 Customizing Data Volume

Want less data for faster seeding?

### Edit BOMComprehensiveSeeder.php

```php
// Line ~145: Reduce suppliers
$count = random_int(10, 20);  // Change to: random_int(5, 10)

// Line ~174: Reduce tags
$count = random_int(15, 25);  // Change to: random_int(8, 12)

// Line ~193: Reduce materials
$count = random_int(20, 30);  // Change to: random_int(10, 15)

// Line ~252: Reduce recipes
->limit(random_int(10, 15))   // Change to: ->limit(random_int(5, 8))
```

### Edit ComprehensiveOrdersSeeder.php

```php
// Line ~38: Reduce orders
$targetCount = random_int(10, 20);  // Change to: random_int(5, 10)

// Line ~69: Reduce items per order
$itemsCount = random_int(1, 8);     // Change to: random_int(1, 4)
```

After editing, run:
```bash
php artisan db:seed --class=BOMComprehensiveSeeder
```

---

## 🎯 Testing Checklist

After seeding, verify each page:

### Backend Server Running
- [ ] `php artisan serve` running on http://localhost:8000
- [ ] No errors in console

### Frontend Server Running
- [ ] `npm run dev` running on http://localhost:5173
- [ ] No errors in console

### Pages Working
- [ ] Login successful with credentials
- [ ] Dashboard loads
- [ ] Materials page shows data (20-30 items)
- [ ] Recipes page shows data (10-15 items)
- [ ] BOM Dashboard shows widgets and charts
- [ ] Suppliers page shows data (10-20 items)
- [ ] Product Tags page shows data (15-25 items)
- [ ] Orders page shows data (10-20 items)
- [ ] Stock Alerts page shows data (5-10 items)
- [ ] Analytics page shows charts
- [ ] Content Pages page shows data (5-10 items)

### Data Integrity
- [ ] All data is tenant-scoped (no cross-tenant data leak)
- [ ] Recipes show correct materials
- [ ] Orders show correct items
- [ ] Stock levels are realistic
- [ ] Low stock alerts match low stock materials
- [ ] Tags are attached to products

---

## 🚀 One-Liner Commands

### Full Fresh Start
```bash
php artisan migrate:fresh --seed && php artisan config:clear && php artisan cache:clear && php artisan permission:cache-reset
```

### BOM Data Only
```bash
php artisan db:seed --class=BOMComprehensiveSeeder && php artisan config:clear && php artisan cache:clear
```

### Full Seed + Servers Start
```bash
php artisan migrate:fresh --seed && php artisan config:clear && php artisan cache:clear && php artisan permission:cache-reset && php artisan serve
```

### Verify Data
```bash
php artisan tinker --execute="echo 'Tenants: ' . Tenant::count() . PHP_EOL; echo 'Materials: ' . Material::count() . PHP_EOL; echo 'Recipes: ' . Recipe::count() . PHP_EOL; echo 'Suppliers: ' . Supplier::count() . PHP_EOL; echo 'Orders: ' . Order::count() . PHP_EOL;"
```

---

## 📞 Need Help?

1. **Check Logs**:
   ```bash
   tail -f storage/logs/laravel.log
   ```

2. **Check Database**:
   ```bash
   php artisan tinker
   > DB::connection()->getPdo();  // Test connection
   ```

3. **Check Migrations**:
   ```bash
   php artisan migrate:status
   ```

4. **Re-run Specific Seeder**:
   ```bash
   php artisan db:seed --class=BOMComprehensiveSeeder --force
   ```

5. **Full Reset**:
   ```bash
   php artisan migrate:fresh
   php artisan db:seed
   php artisan config:clear
   php artisan cache:clear
   php artisan permission:cache-reset
   ```

---

**Happy Seeding! 🌱 Good luck testing! 🚀**

For detailed documentation, see:
- `README-SEEDERS.md` (English, technical)
- `PANDUAN-SEEDER.md` (Bahasa Indonesia, user-friendly)
- `SEEDER-SUMMARY.md` (Quick reference)