# ✅ Product Variants API - Testing Checklist

**Date:** _______________  
**Tester:** _______________  
**Environment:** _______________

---

## 🔧 Setup (Do First)

- [ ] Imported Postman collection
- [ ] Created environment with all variables
- [ ] Server running: `php artisan serve`
- [ ] Logged in and got bearerToken
- [ ] Set tenantId variable
- [ ] Created test product
- [ ] Set productId variable
- [ ] Environment activated

---

## 1️⃣ Product Variants (9 endpoints)

### Basic CRUD
- [ ] **Create Product Variant** (POST)
  - Status: ______ | Time: ______ ms
  - variantId saved: _______________
  - Notes: _______________________

- [ ] **List Product Variants** (GET)
  - Status: ______ | Time: ______ ms
  - Count: ______ variants
  - Notes: _______________________

- [ ] **Get Single Variant** (GET)
  - Status: ______ | Time: ______ ms
  - Calculated fields correct: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Update Product Variant** (PATCH)
  - Status: ______ | Time: ______ ms
  - Changes reflected: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Delete Product Variant** (DELETE)
  - Status: ______ | Time: ______ ms
  - Soft delete confirmed: [ ] Yes [ ] No
  - Notes: _______________________

### Stock Management
- [ ] **Update Variant Stock** (POST)
  - Status: ______ | Time: ______ ms
  - Stock set correctly: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Reserve Variant Stock** (POST)
  - Status: ______ | Time: ______ ms
  - reserved_stock incremented: [ ] Yes [ ] No
  - available_stock decremented: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Release Variant Stock** (POST)
  - Status: ______ | Time: ______ ms
  - reserved_stock decremented: [ ] Yes [ ] No
  - available_stock incremented: [ ] Yes [ ] No
  - Notes: _______________________

---

## 2️⃣ Bulk Operations (3 endpoints)

- [ ] **Bulk Create Variants** (POST)
  - Status: ______ | Time: ______ ms
  - success_count: ______ | error_count: ______
  - Variant IDs saved: _______________
  - Notes: _______________________

- [ ] **Bulk Update Variants** (PATCH)
  - Status: ______ | Time: ______ ms
  - All updated: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Bulk Delete Variants** (DELETE)
  - Status: ______ | Time: ______ ms
  - All deleted: [ ] Yes [ ] No
  - Notes: _______________________

---

## 3️⃣ Variant Attributes (8 endpoints)

- [ ] **List Variant Attributes** (GET)
  - Status: ______ | Time: ______ ms
  - Count: ______ attributes
  - Notes: _______________________

- [ ] **Create Variant Attribute** (POST)
  - Status: ______ | Time: ______ ms
  - attributeId saved: _______________
  - Notes: _______________________

- [ ] **Get Popular Variant Attributes** (GET)
  - Status: ______ | Time: ______ ms
  - Ordered by usage_count: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Get Variant Attribute** (GET)
  - Status: ______ | Time: ______ ms
  - Full details returned: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Update Variant Attribute** (PATCH)
  - Status: ______ | Time: ______ ms
  - Changes applied: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Delete Variant Attribute** (DELETE)
  - Status: ______ | Time: ______ ms
  - Deleted successfully: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Add Attribute Value** (POST)
  - Status: ______ | Time: ______ ms
  - Value added: [ ] Yes [ ] No
  - value_count increased: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Remove Attribute Value** (DELETE)
  - Status: ______ | Time: ______ ms
  - Value removed: [ ] Yes [ ] No
  - Notes: _______________________

---

## 4️⃣ Variant Templates (6 endpoints)

- [ ] **List Variant Templates** (GET)
  - Status: ______ | Time: ______ ms
  - System templates present: [ ] Yes [ ] No
  - Count: ______ templates
  - Notes: _______________________

- [ ] **Create Variant Template** (POST)
  - Status: ______ | Time: ______ ms
  - templateId saved: _______________
  - total_combinations calculated: ______
  - Notes: _______________________

- [ ] **Get Variant Template** (GET)
  - Status: ______ | Time: ______ ms
  - Configuration complete: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Update Variant Template** (PATCH)
  - Status: ______ | Time: ______ ms
  - Updates applied: [ ] Yes [ ] No
  - System template blocked: [ ] Yes [ ] No [ ] N/A
  - Notes: _______________________

- [ ] **Delete Variant Template** (DELETE)
  - Status: ______ | Time: ______ ms
  - Deleted successfully: [ ] Yes [ ] No
  - System template blocked: [ ] Yes [ ] No [ ] N/A
  - Notes: _______________________

- [ ] **Preview Template Application** (POST)
  - Status: ______ | Time: ______ ms
  - Combinations shown: ______
  - SKUs generated correctly: [ ] Yes [ ] No
  - No DB changes: [ ] Confirmed
  - Notes: _______________________

- [ ] **Apply Template to Product** (POST)
  - Status: ______ | Time: ______ ms
  - Variants created: ______
  - All variants present in list: [ ] Yes [ ] No
  - Notes: _______________________

---

## 5️⃣ Variant Analytics (5 endpoints)

- [ ] **Get Variant Analytics** (GET)
  - Status: ______ | Time: ______ ms
  - Metrics complete: [ ] Yes [ ] No
  - Data available: [ ] Yes [ ] No [ ] Empty (expected)
  - Notes: _______________________

- [ ] **Get Product Variant Analytics** (GET)
  - Status: ______ | Time: ______ ms
  - All variants included: [ ] Yes [ ] No
  - Notes: _______________________

- [ ] **Get Top Performing Variants** (GET)
  - Status: ______ | Time: ______ ms
  - Ranked correctly: [ ] Yes [ ] No
  - Tested metrics: [ ] revenue [ ] profit [ ] quantity [ ] conversion [ ] turnover
  - Notes: _______________________

- [ ] **Compare Variants** (POST)
  - Status: ______ | Time: ______ ms
  - Comparison matrix returned: [ ] Yes [ ] No
  - Variants compared: ______
  - Notes: _______________________

- [ ] **Get Performance Summary** (GET)
  - Status: ______ | Time: ______ ms
  - Aggregates calculated: [ ] Yes [ ] No
  - Notes: _______________________

---

## 🧪 Validation Tests

### Test Invalid Data
- [ ] Missing required fields → 422 Unprocessable Entity
- [ ] Duplicate SKU → 422
- [ ] Negative price → 422
- [ ] Negative stock → 422
- [ ] Invalid UUID format → 422 or 404
- [ ] Reserve > available_stock → 422
- [ ] Release > reserved_stock → 422
- [ ] Bulk create > 500 variants → 422
- [ ] Compare > 10 variants → 422
- [ ] Invalid enum values → 422

### Test Authorization
- [ ] No token → 401 Unauthorized
- [ ] Invalid token → 401
- [ ] Access another tenant's resource → 403 Forbidden
- [ ] Insufficient permissions → 403

### Test Business Logic
- [ ] profit_margin calculated correctly
- [ ] available_stock = stock - reserved_stock
- [ ] is_low_stock = (stock <= reorder_level)
- [ ] display_name auto-generated
- [ ] Template combinations = attribute1_values × attribute2_values × ...
- [ ] Price modifiers applied correctly
- [ ] Soft deletes (deleted_at set, not in lists)

---

## 📊 Performance Notes

| Endpoint | Expected | Actual | Pass/Fail |
|----------|----------|--------|-----------|
| Create variant | < 200ms | ______ | [ ] P [ ] F |
| List variants (50) | < 300ms | ______ | [ ] P [ ] F |
| Bulk create (50) | < 2s | ______ | [ ] P [ ] F |
| Apply template (25) | < 3s | ______ | [ ] P [ ] F |
| Analytics query | < 500ms | ______ | [ ] P [ ] F |

---

## 🐛 Issues Found

### Issue #1
- **Endpoint:** _______________________
- **Expected:** _______________________
- **Actual:** _______________________
- **Severity:** [ ] Critical [ ] Major [ ] Minor
- **Steps to reproduce:** _______________________
  _______________________

### Issue #2
- **Endpoint:** _______________________
- **Expected:** _______________________
- **Actual:** _______________________
- **Severity:** [ ] Critical [ ] Major [ ] Minor
- **Steps to reproduce:** _______________________
  _______________________

### Issue #3
- **Endpoint:** _______________________
- **Expected:** _______________________
- **Actual:** _______________________
- **Severity:** [ ] Critical [ ] Major [ ] Minor
- **Steps to reproduce:** _______________________
  _______________________

---

## 🎯 Final Assessment

### Overall Result
- [ ] **PASS** - All critical tests passed, ready for formal testing
- [ ] **PASS with minor issues** - Ready with documentation
- [ ] **FAIL** - Critical issues found, requires fixes

### Statistics
- **Total endpoints tested:** ______ / 31
- **Total tests passed:** ______
- **Total tests failed:** ______
- **Total issues found:** ______
  - Critical: ______
  - Major: ______
  - Minor: ______

### Time Spent
- Setup: ______ minutes
- Testing: ______ minutes
- Issue investigation: ______ minutes
- **Total:** ______ minutes

### Recommendations
- [ ] Proceed to PHPUnit testing
- [ ] Fix critical issues first
- [ ] Document edge cases
- [ ] Update API documentation
- [ ] Review with team

### Notes
_______________________
_______________________
_______________________
_______________________
_______________________

---

## ✍️ Sign-off

**Tester Signature:** _______________________  
**Date:** _______________________  
**Status:** [ ] Approved [ ] Approved with notes [ ] Requires revision

---

**Next Step:** Week 13 Day 5 - Write formal PHPUnit tests

---

*Testing Checklist v1.0 | Phase 6 - Product Variants*