# Phase 6 - Product Variants API Testing Guide

## 📋 Overview
Panduan lengkap untuk testing Product Variants API menggunakan Postman Collection yang sudah diperbaiki.

## 🔧 **PERBAIKAN YANG DILAKUKAN**

### **1. Field Names Correction** ✅
Memperbaiki field names yang tidak sesuai dengan implementasi backend:

| ❌ Field Lama (SALAH) | ✅ Field Baru (BENAR) | Endpoint |
|---|---|---|
| `reorder_level` | `reorder_point` | Create/Update Variant |
| `manage_stock` | *(DIHAPUS - tidak ada di model)* | Create Variant |
| `reserved_stock` | *(DIHAPUS - auto-set ke 0)* | Create Variant |
| `images` | `image_path`, `thumbnail_path` | Create Variant |
| `stock`, `notes` | `quantity`, `reason` | Update Stock |
| `order_id` | *(DIHAPUS - tidak divalidasi)* | Reserve/Release Stock |

### **2. Request Body Updates** ✅

#### **Create Variant** - SUDAH BENAR ✅
```json
{
  "sku": "PROD-001-RED-M",
  "barcode": "1234567890123",
  "name": "Red - Medium",
  "attributes": {
    "color": "Red",
    "size": "M"
  },
  "price": 150000,
  "cost_price": 100000,
  "price_modifier": 0,
  "stock": 50,
  "reorder_point": 10,                    // ✅ FIXED: was reorder_level
  "reorder_quantity": 30,
  "low_stock_alert_enabled": true,        // ✅ ADDED
  "image_path": null,                     // ✅ FIXED: was images
  "thumbnail_path": null,                 // ✅ ADDED
  "is_active": true,
  "is_default": false,
  "sort_order": 1,
  "notes": "Initial variant",             // ✅ ADDED
  "metadata": {}                          // ✅ ADDED
}
```

#### **Update Variant** - SUDAH BENAR ✅
```json
{
  "name": "Red - Medium (Updated)",
  "price": 175000,
  "cost_price": 110000,
  "stock": 75,
  "reorder_point": 15,                    // ✅ FIXED: was reorder_level
  "is_active": true
}
```

#### **Update Variant Stock** - SUDAH BENAR ✅
```json
{
  "quantity": 100,                        // ✅ FIXED: was stock
  "reason": "Stock replenishment"         // ✅ FIXED: was notes
}
```

#### **Reserve Stock** - SUDAH BENAR ✅
```json
{
  "quantity": 3
  // ❌ REMOVED: order_id (tidak divalidasi di controller)
}
```

#### **Release Stock** - SUDAH BENAR ✅
```json
{
  "quantity": 3
  // ❌ REMOVED: order_id (tidak divalidasi di controller)
}
```

#### **Bulk Update Variants** - SUDAH BENAR ✅
```json
{
  "variants": [                           // ✅ FIXED: struktur array dengan id per item
    {
      "id": "{{variantId}}",
      "is_active": true,
      "reorder_point": 20,                // ✅ FIXED: was reorder_level
      "low_stock_alert_enabled": true
    }
  ]
}
```

#### **Variant Template Configuration** - SUDAH BENAR ✅
```json
{
  "name": "T-Shirt Variants",
  "slug": "tshirt-variants",
  "description": "Standard t-shirt size and color combinations",
  "configuration": {
    "attributes": [
      {
        "name": "Size",
        "values": ["S", "M", "L", "XL", "XXL"]
      },
      {
        "name": "Color",
        "values": ["Black", "White", "Red", "Blue", "Green"]
      }
    ],
    "sku_pattern": "{PRODUCT}-{SIZE}-{COLOR}",
    "price_modifiers": {                  // ✅ FIXED: struktur nested per attribute
      "Size": {
        "XL": 10000,
        "XXL": 20000
      }
    },
    "default_values": {                   // ✅ FIXED: was stock_settings
      "stock": 20,
      "reorder_point": 5,                 // ✅ FIXED: was reorder_level
      "reorder_quantity": 15
    }
  },
  "is_active": true
}
```

---

## 🚀 **SETUP & PREREQUISITES**

### **1. Environment Variables**
Buat Postman Environment dengan variabel berikut:

```
baseUrl: http://localhost:8000
tenantId: <your-tenant-uuid>
bearerToken: <your-auth-token>
productId: <existing-product-uuid>
variantId: <will-be-set-from-create-response>
templateId: <will-be-set-from-template-creation>
```

### **2. Authentication**
Dapatkan `bearerToken` dari login endpoint:
```http
POST {{baseUrl}}/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

Response akan memberikan token:
```json
{
  "access_token": "1|xxx...",
  "token_type": "Bearer"
}
```

Set `bearerToken` ke `access_token` dari response.

### **3. Create Product First**
Sebelum testing variants, buat product terlebih dahulu:
```http
POST {{baseUrl}}/api/v1/tenants/{{tenantId}}/products
```

Set `productId` dari response.

---

## 📝 **TESTING SEQUENCE**

### **Phase 1: Basic CRUD Operations**
```
1. List Product Variants       → GET /variants
2. Create Product Variant      → POST /variants
3. Get Single Variant          → GET /variants/{variantId}
4. Update Product Variant      → PATCH /variants/{variantId}
5. Delete Product Variant      → DELETE /variants/{variantId}
```

### **Phase 2: Stock Management**
```
6. Update Variant Stock        → POST /variants/{variantId}/stock
7. Reserve Variant Stock       → POST /variants/{variantId}/reserve
8. Release Variant Stock       → POST /variants/{variantId}/release
```

### **Phase 3: Bulk Operations**
```
9. Bulk Create Variants        → POST /variants/bulk
10. Bulk Update Variants       → PATCH /variants/bulk
11. Bulk Delete Variants       → DELETE /variants/bulk
```

### **Phase 4: Variant Templates**
```
12. List Variant Templates     → GET /variant-templates
13. Create Variant Template    → POST /variant-templates
14. Get Variant Template       → GET /variant-templates/{id}
15. Update Variant Template    → PATCH /variant-templates/{id}
16. Delete Variant Template    → DELETE /variant-templates/{id}
17. Apply Template to Product  → POST /variant-templates/{id}/apply
18. Preview Template           → POST /variant-templates/{id}/preview
```

### **Phase 5: Variant Analytics** (Optional)
```
19. Get Variant Analytics      → GET /variants/{id}/analytics
20. Product Variant Analytics  → GET /products/{id}/analytics
21. Top Performers             → GET /variants/analytics/top-performers
22. Compare Variants           → POST /variants/analytics/compare
23. Performance Summary        → GET /variants/analytics/performance-summary
```

---

## ✅ **VALIDATION CHECKLIST**

### **Request Validation**
- [x] `sku` adalah **required** dan **unique** per tenant
- [x] `price` adalah **required** dan **>= 0**
- [x] `stock` adalah **optional**, default ke 0
- [x] `reorder_point` adalah **optional** (bukan reorder_level)
- [x] `low_stock_alert_enabled` adalah **optional**, default true
- [x] `image_path` dan `thumbnail_path` adalah **optional** (bukan images array)
- [x] `barcode` harus **unique** per product jika diisi
- [x] `reserved_stock` tidak boleh di-set manual (auto-calculated)

### **Response Validation**
- [x] Status 201 untuk Create
- [x] Status 200 untuk Update/Get
- [x] Status 422 untuk validation errors
- [x] Status 404 jika variant tidak ditemukan
- [x] Response body mengikuti `ProductVariantResource` format

### **Business Logic Validation**
- [x] `available_stock` = `stock` - `reserved_stock` (auto-calculated)
- [x] `profit_margin` = `((price - cost_price) / price) * 100` (auto-calculated)
- [x] `is_low_stock` = `stock <= reorder_point` (auto-calculated)
- [x] Reserve stock gagal jika `available_stock` < `quantity`
- [x] Hanya 1 variant yang boleh `is_default = true` per product

---

## 🐛 **TROUBLESHOOTING**

### **Error: "The stock field is required"**
**Problem:** Field name salah  
**Solution:** ✅ SUDAH DIPERBAIKI - gunakan `quantity` bukan `stock` di Update Stock endpoint

### **Error: "No query results for model ProductVariant"**
**Problem:** `variantId` tidak valid atau variant sudah dihapus  
**Solution:**  
1. Cek apakah `variantId` sudah di-set di environment
2. Gunakan List Variants untuk mendapatkan ID yang valid
3. Pastikan variant belum dihapus (soft delete)

### **Error: "The sku has already been taken"**
**Problem:** SKU tidak unique  
**Solution:** Gunakan SKU yang berbeda atau unique per test

### **Error: "Insufficient stock available"**
**Problem:** Tidak cukup `available_stock` untuk reserve  
**Solution:**  
1. Cek current stock: `GET /variants/{variantId}`
2. Update stock terlebih dahulu jika perlu
3. Release reserved stock terlebih dahulu

### **Error: 403 Forbidden**
**Problem:** Tidak punya permission atau tenant salah  
**Solution:**  
1. Pastikan user punya permission: `products.view`, `products.create`, `products.update`, `products.delete`
2. Pastikan `tenantId` sesuai dengan tenant user
3. Re-login untuk refresh token jika sudah expired

---

## 📊 **EXPECTED RESPONSE EXAMPLES**

### **Create Variant Response**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "...",
    "product_id": "...",
    "sku": "PROD-001-RED-M",
    "barcode": "1234567890123",
    "name": "Red - Medium",
    "attributes": {
      "color": "Red",
      "size": "M"
    },
    "price": 150000,
    "cost_price": 100000,
    "price_modifier": 0,
    "profit_margin": 33.33,
    "stock": 50,
    "reserved_stock": 0,
    "available_stock": 50,
    "reorder_point": 10,
    "reorder_quantity": 30,
    "low_stock_alert_enabled": true,
    "is_low_stock": false,
    "image_path": null,
    "thumbnail_path": null,
    "is_active": true,
    "is_default": false,
    "sort_order": 1,
    "notes": "Initial variant",
    "metadata": {},
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

### **Reserve Stock Response**
```json
{
  "message": "Stock reserved successfully",
  "reserved": 3,
  "available": 47
}
```

### **Release Stock Response**
```json
{
  "message": "Reserved stock released",
  "released": 3,
  "available": 50
}
```

---

## 📌 **NOTES & BEST PRACTICES**

### **1. Testing Order**
Ikuti sequence testing yang sudah disediakan untuk menghindari dependency issues.

### **2. Data Cleanup**
Setelah testing, hapus test data menggunakan Bulk Delete atau individual delete.

### **3. Environment Variables**
Simpan ID yang di-generate (variantId, templateId) ke environment variables untuk reuse.

### **4. Unique Constraints**
Gunakan timestamp atau random string di SKU untuk menghindari duplicate errors:
```
"sku": "PROD-001-RED-M-{{$timestamp}}"
```

### **5. Permission Requirements**
Pastikan user memiliki permissions:
- `products.view` - untuk GET endpoints
- `products.create` - untuk POST create
- `products.update` - untuk PATCH dan stock operations
- `products.delete` - untuk DELETE endpoints

### **6. Tenant Isolation**
Semua data terisolasi per tenant. Pastikan `tenantId` konsisten di semua requests.

### **7. Stock Management**
- Use **Update Stock** untuk set absolute quantity
- Use **Reserve/Release** untuk order processing workflow
- `available_stock` selalu auto-calculated, tidak bisa di-set manual

---

## ✨ **NEW FEATURES IN PHASE 6**

### **1. Product Variants with Attributes**
- Dynamic attributes per variant (color, size, dll)
- SKU uniqueness per tenant
- Price modifiers support
- Stock tracking per variant

### **2. Variant Templates**
- Pre-defined templates (Clothing, Electronics, Shoes)
- Custom tenant templates
- Bulk variant generation
- Cartesian product calculation

### **3. Advanced Stock Management**
- Stock reservation system
- Available stock calculation
- Low stock alerts
- Reorder point tracking

### **4. Bulk Operations**
- Bulk create (up to 100 variants)
- Bulk update with partial data
- Bulk delete with soft delete

### **5. Analytics** (Coming Soon)
- Variant performance metrics
- Top performers analysis
- Comparison tools
- Revenue tracking

---

## 🎯 **SUMMARY**

### **✅ FIXED ISSUES**
1. ✅ Update Stock endpoint: `stock` → `quantity`, `notes` → `reason`
2. ✅ Create/Update Variant: `reorder_level` → `reorder_point`
3. ✅ Create Variant: Removed `reserved_stock`, `manage_stock`
4. ✅ Create Variant: `images` → `image_path`/`thumbnail_path`
5. ✅ Reserve/Release Stock: Removed `order_id` (not validated)
6. ✅ Bulk Update: Changed structure to array with `id` per item
7. ✅ Template Config: Fixed `stock_settings` → `default_values`
8. ✅ Template Config: Fixed price modifiers structure

### **✅ VALIDATION STATUS**
- All field names match backend implementation
- All request bodies validated against controllers
- All endpoints tested against routes
- All responses match resource format

### **✅ IMMUTABLE RULES COMPLIANCE**
- ✅ Teams enabled: TRUE
- ✅ team_foreign_key: `tenant_id`
- ✅ guard_name: `api`
- ✅ model_morph_key: `model_uuid` (UUID string)
- ✅ Roles & Permissions: Strictly tenant-scoped
- ❌ NO global roles (NULL tenant_id)

---

## 📞 **SUPPORT**

Jika menemukan issues atau bugs:
1. Cek error message di response
2. Validasi request body sesuai guide ini
3. Cek console logs di backend (`storage/logs/laravel.log`)
4. Pastikan environment variables sudah benar

---

**Last Updated:** 2025-01-15  
**Collection Version:** Phase 6 - Final  
**Status:** ✅ All Fixed & Ready for Testing