# Deprecated BOM Engine Documentation

**Archived Date:** 2025-01-10  
**Reason:** Superseded by newer, improved versions

---

## ⚠️ DO NOT USE THESE FILES FOR DEVELOPMENT

These files are kept for historical reference only.

---

## 📦 Archived Files

### 1. bom-openapi-specification.yaml
**Reason:** Superseded by `bom-engine-openapi-e2e.yaml`
- Old version (v1.0.0 → v2.0.0)
- Incomplete endpoint coverage (~20 vs 40+ endpoints)
- Uses outdated "ingredient" terminology (should be "materials")
- Missing advanced features (analytics, batch tracking, etc.)

**Replacement:** `../bom-engine-openapi-e2e.yaml` ✅

---

### 2. bom-engine-comprehensive-plan.md
**Reason:** Superseded by `bom-engine-final-merged-plan.md`
- Status: "Planning Phase" (not approved for implementation)
- Approach: Big-bang implementation (high risk)
- Too theoretical, not actionable
- Missing phased rollout strategy

**Replacement:** `../bom-engine-final-merged-plan.md` ✅

---

### 3. Backup Files (*.backup2)
**Reason:** Backup files from terminology update (ingredient → materials)
- `bom-engine-openapi-e2e.yaml.backup2`
- `bom-engine-e2e-implementation-roadmap.md.backup2`
- `bom-engine-final-merged-plan.md.backup2`

These contain outdated "ingredient" terminology before the global replacement to "materials".

**Purpose:** Historical reference / rollback capability (if needed)

---

## ✅ USE THESE ACTIVE FILES INSTEAD

| Purpose | Active File | Location |
|---------|-------------|----------|
| **Master Plan** | bom-engine-final-merged-plan.md | `../` |
| **Implementation Guide** | bom-engine-e2e-implementation-roadmap.md | `../` |
| **API Specification** | bom-engine-openapi-e2e.yaml | `../` |

---

## 📊 Key Improvements in Active Files

### Terminology
✅ Uses universal "materials" (not FnB-specific "ingredients")
- Works for F&B, Manufacturing, Construction, Retail, Electronics, etc.
- Professional and industry-agnostic

### Implementation Strategy
✅ 3-phase phased rollout:
- Phase 1 (MVP): 4-6 weeks - Fast validation
- Phase 2 (Advanced): 6-8 weeks - Multi-industry features
- Phase 3 (Enterprise): 8-12 weeks - Full ERP-grade

### API Completeness
✅ 40+ endpoints with:
- Complete CRUD operations
- Advanced analytics
- Batch tracking (FIFO/FEFO)
- Supplier & purchase order management
- Waste tracking
- Full audit trail

### Documentation Quality
✅ Production-ready:
- Clear success metrics
- Week-by-week task breakdown
- Complete OpenAPI 3.0.3 specification
- Examples and validation rules

---

## 🚨 IMPORTANT

**If you find yourself reading this folder:**
1. ❌ Stop! Don't use these files
2. ✅ Go back to parent directory
3. ✅ Use the 3 active files listed above

**For historical research only.** Not for implementation.

---

**Questions?** Check `FILE-ANALYSIS-AND-CLEANUP.md` in parent directory for detailed comparison.