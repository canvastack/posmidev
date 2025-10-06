# 🚀 Quick Reference Card - Product Variants API Testing

## 📌 Setup Checklist

```
☐ Import Postman collection
☐ Create environment: "POS Variants - Local"
☐ Set baseUrl: http://localhost:8000
☐ Login and get bearerToken
☐ Set tenantId from login response
☐ Create/select test product
☐ Set productId variable
☐ Activate environment
```

---

## 🔑 Required Variables

| Variable | Get From | Example |
|----------|----------|---------|
| `baseUrl` | Config | `http://localhost:8000` |
| `bearerToken` | Login response | `1\|abc123...` |
| `tenantId` | Login response | `00000000-0000-0000-0000-000000000001` |
| `productId` | Product creation | `00000000-0000-0000-0000-000000000002` |
| `variantId` | Variant creation | *(set after first variant created)* |
| `attributeId` | Attribute creation | *(set when testing attributes)* |
| `templateId` | Template creation | *(set when testing templates)* |

---

## ⚡ Fastest Test Path (30 minutes)

### Part 1: Basic CRUD (10 min)
```
1. Create Product Variant          → Save variantId
2. List Product Variants            → Verify in list
3. Get Single Variant               → Verify details
4. Update Product Variant           → Verify changes
5. Delete Product Variant           → Verify deleted
```

### Part 2: Stock Management (5 min)
```
6. Create Product Variant           → Fresh variant
7. Update Variant Stock (100)       → stock: 100
8. Reserve Variant Stock (10)       → reserved: 10, available: 90
9. Release Variant Stock (5)        → reserved: 5, available: 95
```

### Part 3: Bulk Operations (5 min)
```
10. Bulk Create Variants (5x)       → success_count: 5
11. Bulk Update Variants (3x)       → Verify updated
12. Bulk Delete Variants (2x)       → Verify deleted
```

### Part 4: Templates (7 min)
```
13. Create Variant Template         → Save templateId
14. Preview Template Application    → Check combinations
15. Apply Template to Product       → Creates 25 variants
16. List Product Variants           → Verify 25+ variants
```

### Part 5: Analytics (3 min)
```
17. Get Variant Analytics           → Check metrics
18. Get Top Performing Variants     → Check ranking
19. Get Performance Summary         → Check aggregates
```

**Total: ~30 minutes (19 core endpoints)**

---

## 📊 All 31 Endpoints by Category

### 1️⃣ Product Variants (9)
```
GET    /tenants/{tid}/products/{pid}/variants                       List
POST   /tenants/{tid}/products/{pid}/variants                       Create
GET    /tenants/{tid}/products/{pid}/variants/{vid}                 Get Single
PATCH  /tenants/{tid}/products/{pid}/variants/{vid}                 Update
DELETE /tenants/{tid}/products/{pid}/variants/{vid}                 Delete
POST   /tenants/{tid}/products/{pid}/variants/{vid}/stock           Update Stock
POST   /tenants/{tid}/products/{pid}/variants/{vid}/reserve         Reserve Stock
POST   /tenants/{tid}/products/{pid}/variants/{vid}/release         Release Stock
```

### 2️⃣ Bulk Operations (3)
```
POST   /tenants/{tid}/products/{pid}/variants/bulk                  Bulk Create
PATCH  /tenants/{tid}/products/{pid}/variants/bulk                  Bulk Update
DELETE /tenants/{tid}/products/{pid}/variants/bulk                  Bulk Delete
```

### 3️⃣ Variant Attributes (8)
```
GET    /tenants/{tid}/variant-attributes                            List
POST   /tenants/{tid}/variant-attributes                            Create
GET    /tenants/{tid}/variant-attributes/popular                    Popular
GET    /tenants/{tid}/variant-attributes/{id}                       Get Single
PATCH  /tenants/{tid}/variant-attributes/{id}                       Update
DELETE /tenants/{tid}/variant-attributes/{id}                       Delete
POST   /tenants/{tid}/variant-attributes/{id}/values                Add Value
DELETE /tenants/{tid}/variant-attributes/{id}/values                Remove Value
```

### 4️⃣ Variant Templates (6)
```
GET    /tenants/{tid}/variant-templates                             List
POST   /tenants/{tid}/variant-templates                             Create
GET    /tenants/{tid}/variant-templates/{id}                        Get Single
PATCH  /tenants/{tid}/variant-templates/{id}                        Update
DELETE /tenants/{tid}/variant-templates/{id}                        Delete
POST   /tenants/{tid}/variant-templates/{id}/preview                Preview
POST   /tenants/{tid}/variant-templates/{id}/apply                  Apply
```

### 5️⃣ Variant Analytics (5)
```
GET    /tenants/{tid}/variants/{vid}/analytics                      Variant Analytics
GET    /tenants/{tid}/products/{pid}/analytics                      Product Analytics
GET    /tenants/{tid}/variants/analytics/top-performers             Top Performers
POST   /tenants/{tid}/variants/analytics/compare                    Compare
GET    /tenants/{tid}/variants/analytics/performance-summary        Summary
```

---

## 🎯 Key Test Scenarios

### Scenario 1: E-commerce T-Shirt Setup
```
1. Create attribute: Size (S, M, L, XL, XXL)
2. Create attribute: Color (Black, White, Red, Blue, Green)
3. Create template: "T-Shirt Variants"
4. Apply template to product → Generates 25 variants
5. Verify all variants created with correct SKUs
```

### Scenario 2: Shoe Variants
```
1. Create attribute: Size (38, 39, 40, 41, 42, 43, 44, 45)
2. Create attribute: Width (Narrow, Regular, Wide)
3. Create attribute: Color (Black, Brown, Tan)
4. Create template: "Shoe Variants"
5. Apply → Generates 72 variants (8 × 3 × 3)
```

### Scenario 3: Stock Management Workflow
```
1. Create variant with stock: 50
2. Customer orders 3 → Reserve stock (3)
3. Payment confirmed → Reduce stock to 47
4. Customer orders 5 → Reserve stock (5)
5. Payment timeout → Release stock (5)
6. Check: stock: 47, reserved: 3, available: 44
```

### Scenario 4: Price Modifier Testing
```
1. Base product price: 150,000
2. Size XL modifier: +10,000
3. Size XXL modifier: +20,000
4. Create variant: Size XL → Expected price: 160,000
5. Create variant: Size XXL → Expected price: 170,000
```

---

## ✅ Validation Test Cases

### Test Invalid Data
```
□ Missing required fields (sku, name, price)
□ Negative price
□ Negative stock
□ Invalid UUID format
□ Duplicate SKU
□ Reserve more than available_stock
□ Release more than reserved_stock
□ Bulk create > 500 variants
□ Compare > 10 variants
□ Invalid enum values (display_type, period_type)
```

### Expected: 422 Unprocessable Entity with error details

---

## 🐛 Debug Checklist

### If 401 Unauthorized:
```
□ Token expired? → Login again
□ Token set correctly? → Check environment
□ Environment active? → Select from dropdown
□ Token format? → Must be: 1|abc123...
```

### If 403 Forbidden:
```
□ Correct tenantId? → Must match user's tenant
□ Has permissions? → Need products.* permissions
□ Accessing own tenant? → Check resource ownership
```

### If 404 Not Found:
```
□ Resource exists? → Check database
□ Correct UUID? → Verify variable value
□ Soft deleted? → Check deleted_at column
□ Wrong tenant? → Resource belongs to another tenant
```

### If 422 Validation Error:
```
□ Required fields? → Check request body
□ Data types? → String vs Integer vs Boolean
□ Length limits? → SKU max 255 chars
□ Unique constraints? → SKU must be unique
□ Business rules? → Cannot reserve unavailable stock
```

---

## 📈 Performance Expectations

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Create single variant | < 200ms | With validation |
| Bulk create 50 variants | < 2s | Database transaction |
| Bulk create 500 variants | < 10s | Max limit |
| List variants (50/page) | < 300ms | With pagination |
| Apply template (25 variants) | < 3s | Template + bulk create |
| Get analytics | < 500ms | Aggregate queries |
| Reserve/Release stock | < 150ms | Simple update |

### If Slower:
- Check database indexes
- Review query optimization
- Check server resources

---

## 🎨 Sample Request Bodies

### Create Variant (Minimal)
```json
{
  "sku": "PROD-001-RED-M",
  "name": "Red - Medium",
  "price": 150000,
  "stock": 50
}
```

### Create Variant (Full)
```json
{
  "sku": "PROD-001-RED-M",
  "barcode": "1234567890123",
  "name": "Red - Medium",
  "attributes": {"color": "Red", "size": "M"},
  "price": 150000,
  "cost_price": 100000,
  "stock": 50,
  "reorder_level": 10,
  "is_active": true,
  "is_default": false,
  "sort_order": 1
}
```

### Bulk Create (3 Variants)
```json
{
  "variants": [
    {"sku": "P-RED-S", "name": "Red S", "price": 140000, "stock": 30},
    {"sku": "P-RED-M", "name": "Red M", "price": 150000, "stock": 50},
    {"sku": "P-RED-L", "name": "Red L", "price": 160000, "stock": 40}
  ]
}
```

### Reserve Stock
```json
{
  "quantity": 5,
  "order_id": "00000000-0000-0000-0000-000000000001"
}
```

### Create Attribute
```json
{
  "name": "Size",
  "display_type": "button",
  "values": ["S", "M", "L", "XL"],
  "price_modifiers": {"XL": 10000}
}
```

### Create Template
```json
{
  "name": "T-Shirt Variants",
  "configuration": {
    "attributes": [
      {"name": "Size", "values": ["S", "M", "L", "XL"]},
      {"name": "Color", "values": ["Red", "Blue", "Green"]}
    ],
    "sku_pattern": "{parent_sku}-{size}-{color}",
    "price_calculation": "base_plus_modifiers"
  }
}
```

---

## 🏆 Success Criteria

### ✅ All Tests Pass When:

```
□ All 31 endpoints return expected status codes
□ All validation rules working correctly
□ All calculated fields accurate (profit_margin, available_stock)
□ Stock reservation/release logic correct
□ Bulk operations handle errors gracefully
□ Template application generates correct combinations
□ Analytics metrics calculated properly
□ Pagination working on all list endpoints
□ Sorting and filtering working
□ Authorization enforced on all endpoints
□ Tenant isolation working (no cross-tenant access)
□ Soft deletes working correctly
```

---

## 📞 Quick Commands

### Start Server
```bash
php artisan serve
```

### Clear Caches
```bash
php artisan config:clear
php artisan cache:clear
php artisan permission:cache-reset
```

### Check Logs
```bash
tail -f storage/logs/laravel.log
```

### Database
```bash
php artisan migrate:fresh --seed  # Fresh start
php artisan db:seed --class=ProductVariantSeeder  # Just variants
```

---

## 🎯 Testing Goals

**Primary Goal:** Verify all 31 endpoints are functional before writing PHPUnit tests

**Secondary Goals:**
- Identify edge cases
- Verify business logic
- Test performance
- Document issues
- Validate API design

**Time Budget:** 2-3 hours for comprehensive testing

---

**Ready to test? Start with the Fastest Test Path above!** 🚀

---

*Quick Reference v1.0 | Phase 6 - Product Variants*