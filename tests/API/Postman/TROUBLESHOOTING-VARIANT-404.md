# Troubleshooting: Variant 404 Error

## Error Message
```
"No query results for model [Src\\Pms\\Infrastructure\\Models\\ProductVariant] cff743e3-21be-4e0c-bc73-57e9fe94080a"
```

## Root Cause
The controller uses **strict scoped queries** that require ALL three conditions to match:
```php
ProductVariant::forTenant($tenantId)
    ->forProduct($productId)
    ->findOrFail($variantId);
```

This means the variant must have:
1. ✅ `id` = `variantId`
2. ✅ `tenant_id` = `tenantId`
3. ✅ `product_id` = `productId`

If ANY of these don't match, you'll get a 404 error.

---

## Step-by-Step Troubleshooting

### Step 1: Verify Variant Exists in Database

Run this query in your database:

```sql
SELECT 
    id,
    tenant_id,
    product_id,
    sku,
    name,
    is_active,
    deleted_at
FROM product_variants 
WHERE id = 'cff743e3-21be-4e0c-bc73-57e9fe94080a';
```

**Expected Result:**
- If returns **0 rows**: Variant doesn't exist → Need to create it first
- If `deleted_at` is NOT NULL: Variant is soft-deleted → Need to restore or use different variant
- If exists: Continue to Step 2

---

### Step 2: Check Tenant ID Match

From the query result in Step 1, check the `tenant_id`:

```sql
-- Compare with your current tenant ID
SELECT 
    id,
    tenant_id,
    product_id
FROM product_variants 
WHERE id = 'cff743e3-21be-4e0c-bc73-57e9fe94080a'
  AND tenant_id = '<YOUR_TENANT_ID_FROM_POSTMAN>'; -- Replace with actual value
```

**If 0 rows returned:**
❌ The variant belongs to a DIFFERENT tenant!

**Solution:**
- Update `{{tenantId}}` in Postman environment to match the variant's tenant
- OR create a new variant in the correct tenant

---

### Step 3: Check Product ID Match

```sql
-- Check if variant belongs to the product you're trying to update
SELECT 
    v.id as variant_id,
    v.product_id as variant_product_id,
    p.id as product_id,
    p.name as product_name,
    v.sku as variant_sku
FROM product_variants v
JOIN products p ON v.product_id = p.id
WHERE v.id = 'cff743e3-21be-4e0c-bc73-57e9fe94080a'
  AND v.product_id = '<YOUR_PRODUCT_ID_FROM_POSTMAN>'; -- Replace with actual value
```

**If 0 rows returned:**
❌ The variant belongs to a DIFFERENT product!

**Solution:**
- Update `{{productId}}` in Postman to match the variant's actual product_id
- OR create a new variant for the correct product

---

### Step 4: List All Variants for Current Product

To see what variants ACTUALLY exist for your product:

```sql
SELECT 
    id as variant_id,
    sku,
    name,
    price,
    stock,
    is_active,
    created_at
FROM product_variants 
WHERE product_id = '<YOUR_PRODUCT_ID>'
  AND tenant_id = '<YOUR_TENANT_ID>'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**Use one of these variant IDs** in your Postman requests.

---

### Step 5: Verify Postman Environment Variables

In Postman, check your environment variables:

| Variable | Current Value | How to Verify |
|----------|--------------|---------------|
| `{{tenantId}}` | ? | Check from Login response or database |
| `{{productId}}` | ? | Should be set from "Create Product" response |
| `{{variantId}}` | `cff743e3...` | Should auto-set from "Create Variant" response |

**Common Issue:** `{{variantId}}` is manually set or outdated!

**Solution:**
1. ✅ Open "Create Product Variant" request
2. ✅ Go to "Tests" tab
3. ✅ Verify this script exists:
   ```javascript
   if (pm.response.code === 201) {
       const response = pm.response.json();
       pm.environment.set("variantId", response.data.id);
       console.log("✅ Variant ID saved:", response.data.id);
   }
   ```
4. ✅ Re-run "Create Product Variant" to auto-set correct ID
5. ✅ Then try Update Variant again

---

## Quick Fixes

### Fix 1: Fresh Start - Create New Variant

1. **Open Postman** → Phase 6 - Variants API
2. **Navigate to:** `Product Variants` → `Create Product Variant`
3. **Update request body** with unique SKU:
   ```json
   {
     "sku": "PROD-001-RED-M-{{$timestamp}}",
     "name": "Red - Medium",
     "price": 150000,
     "cost_price": 100000,
     "stock": 50,
     "reorder_point": 10,
     "reorder_quantity": 30,
     "low_stock_alert_enabled": true,
     "is_active": true,
     "attributes": {
       "color": "Red",
       "size": "M"
     }
   }
   ```
4. **Send Request** → Should get `201 Created`
5. **Check Console** → Should see: `✅ Variant ID saved: <new-uuid>`
6. **Now try Update** → Should work!

---

### Fix 2: Use Correct Variant ID from Create Response

When you create a variant, the response looks like:
```json
{
  "data": {
    "id": "abc12345-...",  ← THIS is the correct variantId
    "sku": "PROD-001-RED-M",
    "name": "Red - Medium",
    ...
  }
}
```

**Manual Fix:**
1. Copy the `id` from Create Variant response
2. In Postman, go to Environment (top right)
3. Set `variantId` = copied ID
4. Try Update again

---

### Fix 3: Verify Product Exists

Make sure the product exists first:

**Request:**
```
GET {{baseUrl}}/api/v1/tenants/{{tenantId}}/products/{{productId}}
Authorization: Bearer {{bearerToken}}
```

**Expected:** `200 OK` with product details

**If 404:** Your `{{productId}}` is wrong!
- Create a new product first
- Update `{{productId}}` in environment

---

## Laravel Artisan Commands for Verification

Run these in your terminal:

### Check if variant exists:
```bash
php artisan tinker

>>> \Src\Pms\Infrastructure\Models\ProductVariant::find('cff743e3-21be-4e0c-bc73-57e9fe94080a')
```

**If returns `null`:** Variant doesn't exist!

### List all variants for a tenant:
```bash
>>> \Src\Pms\Infrastructure\Models\ProductVariant::where('tenant_id', '<YOUR_TENANT_ID>')->get(['id', 'sku', 'product_id'])
```

### List all variants for a product:
```bash
>>> \Src\Pms\Infrastructure\Models\ProductVariant::where('product_id', '<YOUR_PRODUCT_ID>')->get(['id', 'sku'])
```

---

## Prevention Tips

### 1. Always Use Test Scripts to Auto-Set IDs

In **Create Product Variant** request → Tests tab:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("variantId", response.data.id);
    console.log("✅ Variant ID saved:", response.data.id);
}
```

### 2. Use Unique SKUs
```json
{
  "sku": "PROD-{{$timestamp}}"
}
```

### 3. Test Sequence
Always follow this order:
1. ✅ Login → Get token
2. ✅ Create Product → Get productId
3. ✅ Create Variant → Get variantId
4. ✅ Update Variant → Use variantId from step 3

### 4. Check Console Output
After each request, check Postman Console (View → Show Postman Console) for:
```
✅ Variant ID saved: abc12345-...
```

---

## Still Not Working?

### Enable Laravel Debug Mode

1. Open `.env` file
2. Set `APP_DEBUG=true`
3. Restart Laravel: `php artisan serve`
4. Try request again
5. Check full error trace in response

### Check Laravel Logs

```bash
tail -f storage/logs/laravel.log
```

Look for SQL query errors or permission issues.

### Contact Support

If still stuck, provide:
1. ✅ Full error response from Postman
2. ✅ Your environment variables (tenantId, productId, variantId)
3. ✅ SQL query result from Step 1-4 above
4. ✅ Laravel log output

---

## Summary Checklist

Before updating a variant, verify:

- [ ] Variant exists in database
- [ ] Variant's `tenant_id` matches `{{tenantId}}`
- [ ] Variant's `product_id` matches `{{productId}}`
- [ ] Variant is not soft-deleted (`deleted_at IS NULL`)
- [ ] `{{variantId}}` environment variable is correct
- [ ] Bearer token is valid
- [ ] Product exists
- [ ] User has `products.update` permission

**If ALL checked ✅ → Update should work!**

---

## Expected Update Request

```http
PATCH {{baseUrl}}/api/v1/tenants/{{tenantId}}/products/{{productId}}/variants/{{variantId}}
Authorization: Bearer {{bearerToken}}
Content-Type: application/json

{
  "sku": "PROD-001-RED-M-UPDATED",
  "name": "Red - Medium (Updated)",
  "price": 175000,
  "cost_price": 110000,
  "stock": 75,
  "reorder_point": 15,
  "is_active": true
}
```

**Expected Response:** `200 OK`
```json
{
  "data": {
    "id": "cff743e3-21be-4e0c-bc73-57e9fe94080a",
    "sku": "PROD-001-RED-M-UPDATED",
    "name": "Red - Medium (Updated)",
    ...
  }
}
```

---

**Good luck! 🚀**