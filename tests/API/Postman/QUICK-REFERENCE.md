# Phase 6 - Variants API Quick Reference Card

## 🚀 QUICK START

### 1. Import Collection
```
File: tests/API/Postman/Phase 6 - Variants API.postman_collection.json
```

### 2. Set Environment Variables
```
baseUrl: http://localhost:8000
tenantId: <your-tenant-uuid>
bearerToken: <from-login>
productId: <from-product-creation>
variantId: <auto-set>
templateId: <auto-set>
```

### 3. Login
```http
POST {{baseUrl}}/api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "password"
}
```

---

## 📋 FIELD NAME CHEAT SHEET

### ✅ CORRECT Field Names (Use These!)

| Field | Type | Required | Notes |
|---|---|---|---|
| `sku` | string | ✅ Yes | Unique per tenant |
| `name` | string | ❌ No | Variant display name |
| `attributes` | object | ❌ No | `{"color": "Red", "size": "M"}` |
| `price` | integer | ✅ Yes | In smallest currency unit |
| `cost_price` | integer | ❌ No | For profit calculation |
| `price_modifier` | integer | ❌ No | Price adjustment |
| `stock` | integer | ❌ No | Current inventory |
| `reorder_point` | integer | ❌ No | Low stock threshold |
| `reorder_quantity` | integer | ❌ No | Suggested reorder qty |
| `low_stock_alert_enabled` | boolean | ❌ No | Enable alerts |
| `image_path` | string | ❌ No | Main image URL |
| `thumbnail_path` | string | ❌ No | Thumbnail URL |
| `barcode` | string | ❌ No | Must be unique per product |
| `is_active` | boolean | ❌ No | Default: true |
| `is_default` | boolean | ❌ No | Default variant |
| `sort_order` | integer | ❌ No | Display order |
| `notes` | string | ❌ No | Internal notes |
| `metadata` | object | ❌ No | Custom data |

### ❌ WRONG Field Names (Don't Use!)

| ❌ Wrong | ✅ Correct | Reason |
|---|---|---|
| `reorder_level` | `reorder_point` | Field renamed in model |
| `manage_stock` | *(remove)* | Field doesn't exist |
| `reserved_stock` | *(remove)* | Auto-set to 0 |
| `images` | `image_path`, `thumbnail_path` | Changed to separate fields |
| `stock` *(in update stock)* | `quantity` | Different context |
| `notes` *(in update stock)* | `reason` | Different context |
| `order_id` *(in reserve/release)* | *(remove)* | Not validated |

---

## 🎯 ENDPOINT PATTERNS

### Create Variant
```http
POST /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants

{
  "sku": "PROD-001-RED-M",
  "name": "Red - Medium",
  "attributes": {"color": "Red", "size": "M"},
  "price": 150000,
  "reorder_point": 10
}
```

### Update Variant
```http
PATCH /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/{{variantId}}

{
  "price": 175000,
  "reorder_point": 15
}
```

### Update Stock
```http
POST /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/{{variantId}}/stock

{
  "quantity": 100,
  "reason": "Stock replenishment"
}
```

### Reserve Stock
```http
POST /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/{{variantId}}/reserve

{
  "quantity": 3
}
```

### Release Stock
```http
POST /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/{{variantId}}/release

{
  "quantity": 3
}
```

### Bulk Create
```http
POST /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/bulk

{
  "variants": [
    {
      "sku": "PROD-001-RED-S",
      "name": "Red - Small",
      "price": 140000,
      "stock": 30
    }
  ]
}
```

### Bulk Update
```http
PATCH /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/bulk

{
  "variants": [
    {
      "id": "{{variantId}}",
      "is_active": true,
      "reorder_point": 20
    }
  ]
}
```

### Create Template
```http
POST /api/v1/tenants/{{tenantId}}/variant-templates

{
  "name": "T-Shirt Variants",
  "configuration": {
    "attributes": [
      {"name": "Size", "values": ["S", "M", "L"]},
      {"name": "Color", "values": ["Red", "Blue"]}
    ],
    "sku_pattern": "{PRODUCT}-{SIZE}-{COLOR}",
    "price_modifiers": {
      "Size": {"L": 10000}
    },
    "default_values": {
      "stock": 20,
      "reorder_point": 5
    }
  }
}
```

### Apply Template
```http
POST /api/v1/tenants/{{tenantId}}/variant-templates/{{templateId}}/apply

{
  "product_id": "{{productId}}",
  "override_existing": false
}
```

---

## 💡 COMMON ERRORS & FIXES

### Error: "The stock field is required"
**Endpoint:** Update Stock  
**Fix:** Use `quantity` not `stock`
```json
{
  "quantity": 100,    // ✅ Correct
  "reason": "..."
}
```

### Error: "No query results for model"
**Cause:** Invalid variantId  
**Fix:** Use List Variants to get valid ID
```http
GET /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants
```

### Error: "The sku has already been taken"
**Cause:** Duplicate SKU  
**Fix:** Use unique SKU
```json
{
  "sku": "PROD-001-RED-M-{{$timestamp}}"
}
```

### Error: "Insufficient stock available"
**Cause:** Not enough available_stock  
**Fix:** Check current stock first
```http
GET /api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/{{variantId}}
```

### Error: 403 Forbidden
**Cause:** Missing permissions  
**Fix:** Ensure user has:
- `products.view`
- `products.create`
- `products.update`
- `products.delete`

---

## 📊 TESTING CHECKLIST

### Prerequisites
- [ ] Laravel server running (`php artisan serve`)
- [ ] Database migrated (`php artisan migrate:fresh --seed`)
- [ ] Caches cleared (`php artisan cache:clear`)
- [ ] Postman collection imported
- [ ] Environment variables set

### Basic CRUD
- [ ] Create variant
- [ ] List variants
- [ ] Get single variant
- [ ] Update variant
- [ ] Delete variant

### Stock Operations
- [ ] Update stock (absolute)
- [ ] Reserve stock
- [ ] Release stock
- [ ] Verify available_stock calculation

### Bulk Operations
- [ ] Bulk create (5 variants)
- [ ] Bulk update (2 variants)
- [ ] Bulk delete (3 variants)

### Templates
- [ ] Create template
- [ ] Apply template to product
- [ ] Preview template
- [ ] Verify generated variants

### Validation Tests
- [ ] Duplicate SKU rejection
- [ ] Required field validation
- [ ] Insufficient stock handling
- [ ] Permission enforcement

---

## 🎯 SUCCESS CRITERIA

### ✅ All Tests Pass When:
1. No "field required" errors
2. No "model not found" errors
3. Stock calculations correct
4. Permissions enforced
5. Tenant isolation maintained
6. Response formats consistent

---

## 📞 NEED HELP?

### Check These Files:
1. `PHASE-6-TESTING-GUIDE.md` - Comprehensive guide
2. `FIXES-APPLIED.md` - Detailed changelog
3. `storage/logs/laravel.log` - Backend errors

### Common Commands:
```bash
# Clear all caches
php artisan config:clear && php artisan cache:clear && php artisan permission:cache-reset

# Reset database
php artisan migrate:fresh --seed

# Check routes
php artisan route:list | grep variants

# View logs
tail -f storage/logs/laravel.log
```

---

**Quick Reference Version:** 1.0  
**Last Updated:** 2025-01-15  
**Status:** ✅ Production Ready