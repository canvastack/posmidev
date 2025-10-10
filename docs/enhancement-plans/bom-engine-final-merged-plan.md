# POSMID 2.0 - BOM Engine: FINAL MERGED PLAN
## Best of Both Worlds - Phased Implementation Strategy

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Implementation Strategy:** Phased rollout (MVP → Advanced → Enterprise)

---

## 📋 EXECUTIVE SUMMARY

This document represents the **optimal merged plan** combining:
- **Original Plan's strengths:** Simplicity, clarity, actionability
- **Zencoder AI Plan's strengths:** Completeness, future-proofing, specification quality

### Strategic Approach: **3-Phase Rollout**

```
Phase 1 (MVP): Simple & Fast → Market Validation
Phase 2 (Advanced): Enterprise Features → Multi-Industry
Phase 3 (Enterprise): Full ERP-Grade → Competitive Moat
```

### Success Criteria

| Phase | Timeline | Goal | Success Metric |
|-------|----------|------|----------------|
| **Phase 1 (MVP)** | 4-6 weeks | Prove concept works | 3-5 pilot customers, >8/10 satisfaction |
| **Phase 2 (Advanced)** | 6-8 weeks | Multi-industry support | 20+ leads, 2.5x pricing achieved |
| **Phase 3 (Enterprise)** | 8-12 weeks | Market leadership | 100+ customers, <5% churn |

---

## 🎯 PHASE 1: MVP (WEEKS 1-6)

**Philosophy:** **"Ship fast, validate early"**

### Goals
1. ✅ Prove core BOM concept works
2. ✅ Get real user feedback ASAP
3. ✅ Generate initial revenue from pilot customers
4. ✅ Avoid over-engineering

---

### 1.1 Database Schema (Phase 1)

#### Table: `Materials`
**Purpose:** Simple raw material tracking

```sql
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    
    -- Measurement
    unit_of_measurement VARCHAR(50) NOT NULL,  -- gram, ml, pcs, kg, liter
    
    -- Stock
    current_stock DECIMAL(15, 4) DEFAULT 0,
    
    -- Reordering
    reorder_point DECIMAL(15, 4),
    
    -- Costing (Simple)
    cost_per_unit DECIMAL(15, 4),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_materials_tenant ON materials(tenant_id, is_active);
CREATE INDEX idx_materials_low_stock ON materials(tenant_id) 
    WHERE is_active = TRUE AND current_stock <= reorder_point;
```

---

#### Table: `recipes`
**Purpose:** Define product composition

```sql
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Link to Product
    product_id UUID NOT NULL,
    variant_id UUID,  -- Support for variant-level recipes (from Zencoder plan)
    
    -- Recipe Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Production
    yield_quantity DECIMAL(10, 2) DEFAULT 1.00,  -- How many units this produces
    
    -- Costing (Auto-calculated)
    total_material_cost DECIMAL(15, 4),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    
    UNIQUE (tenant_id, product_id, variant_id) WHERE is_active = TRUE
);

CREATE INDEX idx_recipes_product ON recipes(product_id, is_active);
CREATE INDEX idx_recipes_variant ON recipes(variant_id) WHERE variant_id IS NOT NULL;
```

---

#### Table: `recipe_materials`
**Purpose:** Components per recipe

```sql
CREATE TABLE recipe_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL,
    material_id UUID NOT NULL,
    
    -- Quantity
    quantity_required DECIMAL(15, 6) NOT NULL,
    
    -- Waste Factor (from Zencoder plan - important for accuracy!)
    waste_percentage DECIMAL(5, 2) DEFAULT 0,  -- e.g., 5.00 = 5%
    actual_quantity DECIMAL(15, 6) GENERATED ALWAYS AS 
        (quantity_required * (1 + waste_percentage/100)) STORED,
    
    -- Cost Snapshot (for historical accuracy)
    unit_cost_snapshot DECIMAL(15, 4),
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    
    UNIQUE (recipe_id, material_id)
);

CREATE INDEX idx_recipe_materials_recipe ON recipe_materials(recipe_id);
CREATE INDEX idx_recipe_materials_MATERIAL ON recipe_materials(material_id);
```

---

#### Table: `MATERIAL_transactions`
**Purpose:** Complete audit trail

```sql
CREATE TABLE MATERIAL_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    material_id UUID NOT NULL,
    
    -- Transaction Type
    transaction_type ENUM(
        'purchase',         -- Purchased from supplier
        'sale_deduction',   -- Used in sale (via recipe)
        'adjustment',       -- Manual adjustment
        'waste',            -- Wastage
        'return'            -- Return/refund
    ) NOT NULL,
    
    -- Quantity
    quantity DECIMAL(15, 6) NOT NULL,  -- Positive = in, Negative = out
    
    -- Stock Snapshot
    stock_before DECIMAL(15, 6) NOT NULL,
    stock_after DECIMAL(15, 6) NOT NULL,
    
    -- Costing
    unit_cost DECIMAL(15, 4),
    total_value DECIMAL(15, 4) GENERATED ALWAYS AS 
        (ABS(quantity) * COALESCE(unit_cost, 0)) STORED,
    
    -- References
    reference_type VARCHAR(50),  -- Order, Adjustment, etc.
    reference_id UUID,
    
    -- Actor & Reason
    user_id UUID,
    reason TEXT,
    notes TEXT,
    
    -- Timestamp
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_MATERIAL_transactions_MATERIAL ON MATERIAL_transactions(material_id, transaction_date DESC);
CREATE INDEX idx_MATERIAL_transactions_type ON MATERIAL_transactions(tenant_id, transaction_type, transaction_date DESC);
CREATE INDEX idx_MATERIAL_transactions_reference ON MATERIAL_transactions(reference_type, reference_id);
```

---

#### Product Table Modifications

```sql
-- Add to existing products table
ALTER TABLE products ADD COLUMN inventory_management_type ENUM(
    'none',      -- No inventory (services)
    'simple',    -- Direct stock (current behavior)
    'composite'  -- Recipe-based (new!)
) DEFAULT 'simple';

ALTER TABLE products ADD COLUMN active_recipe_id UUID;
ALTER TABLE products ADD CONSTRAINT fk_products_active_recipe 
    FOREIGN KEY (active_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;

-- Add to product_variants table
ALTER TABLE product_variants ADD COLUMN has_custom_recipe BOOLEAN DEFAULT FALSE;
ALTER TABLE product_variants ADD COLUMN active_recipe_id UUID;
ALTER TABLE product_variants ADD CONSTRAINT fk_variants_active_recipe 
    FOREIGN KEY (active_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_products_inventory_type ON products(tenant_id, inventory_management_type);
```

**Design Decision Notes:**
- ✅ Uses `inventory_management_type` (Zencoder) instead of `type` (clearer semantics)
- ✅ Supports variant-level recipes (Zencoder enhancement)
- ✅ Keeps schema simple (Original plan's philosophy)

---

### 1.2 Backend Services (Phase 1)

#### Service: `MATERIALService`

**Location:** `src/Pms/Core/Application/Services/Inventory/MATERIALService.php`

**Methods:**
```php
class MATERIALService
{
    // CRUD
    public function create(CreateMATERIALDTO $dto): Material;
    public function update(Material $material, UpdateMATERIALDTO $dto): Material;
    public function delete(Material $material): void;
    
    // Stock Management
    public function adjustStock(
        Material $material,
        string $adjustmentType,  // 'add', 'subtract', 'set'
        float $quantity,
        string $reason,
        ?string $referenceNumber = null
    ): MATERIALTransaction;
    
    // Helper
    public function isLowStock(Material $material): bool;
}
```

---

#### Service: `RecipeService`

**Location:** `src/Pms/Core/Application/Services/Inventory/RecipeService.php`

**Methods:**
```php
class RecipeService
{
    // CRUD
    public function create(CreateRecipeDTO $dto): Recipe;
    public function update(Recipe $recipe, UpdateRecipeDTO $dto): Recipe;
    public function delete(Recipe $recipe): void;
    
    // Components
    public function addComponent(Recipe $recipe, AddComponentDTO $dto): RecipeMaterial;
    public function updateComponent(RecipeMaterial $component, UpdateComponentDTO $dto): RecipeMaterial;
    public function removeComponent(RecipeMaterial $component): void;
    
    // Costing
    public function calculateTotalCost(Recipe $recipe): float;
    public function updateCostSnapshots(Recipe $recipe): void;
}
```

---

#### Service: `InventoryCalculationService`

**Location:** `src/Pms/Core/Application/Services/Inventory/InventoryCalculationService.php`

**Methods:**
```php
class InventoryCalculationService
{
    /**
     * Calculate maximum producible quantity
     * 
     * @return array{
     *   type: string,
     *   maximum_producible_quantity?: int,
     *   limiting_MATERIAL?: array,
     *   all_MATERIALs_availability?: array
     * }
     */
    public function calculateAvailableQuantity(
        Product $product,
        ?ProductVariant $variant = null
    ): array {
        // For simple products
        if ($product->inventory_management_type === 'simple') {
            return [
                'type' => 'simple',
                'current_stock' => $variant 
                    ? $variant->stock_quantity 
                    : $product->stock_quantity
            ];
        }
        
        // For composite products
        $recipe = $this->getActiveRecipe($product, $variant);
        
        if (!$recipe) {
            throw new NoRecipeFoundException();
        }
        
        $components = $recipe->materials()->with('material')->get();
        
        $maxProducible = PHP_INT_MAX;
        $limitingMATERIAL = null;
        $MATERIALDetails = [];
        
        foreach ($components as $component) {
            $material = $component->material;
            $requiredQty = $component->actual_quantity;  // Includes waste factor
            
            // Calculate max units from this material
            $maxFromThis = floor($material->current_stock / $requiredQty);
            
            $MATERIALDetails[] = [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'required_quantity' => $requiredQty,
                'available_stock' => $material->current_stock,
                'sufficient' => $material->current_stock >= $requiredQty,
                'max_producible' => $maxFromThis
            ];
            
            // Track bottleneck
            if ($maxFromThis < $maxProducible) {
                $maxProducible = $maxFromThis;
                $limitingMATERIAL = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'required_per_unit' => $requiredQty,
                    'available_stock' => $material->current_stock,
                    'max_units' => $maxFromThis
                ];
            }
        }
        
        return [
            'type' => 'composite',
            'maximum_producible_quantity' => max(0, $maxProducible),
            'limiting_MATERIAL' => $limitingMATERIAL,
            'all_MATERIALs_availability' => $MATERIALDetails
        ];
    }
    
    /**
     * Check if sufficient materials exist
     */
    public function checkSufficiency(Recipe $recipe, int $quantity): array
    {
        $components = $recipe->materials()->with('material')->get();
        $missing = [];
        
        foreach ($components as $component) {
            $required = $component->actual_quantity * $quantity;
            $available = $component->material->current_stock;
            
            if ($available < $required) {
                $missing[] = [
                    'material' => $component->material->name,
                    'required' => $required,
                    'available' => $available,
                    'shortage' => $required - $available
                ];
            }
        }
        
        return [
            'sufficient' => empty($missing),
            'missing_MATERIALs' => $missing
        ];
    }
}
```

---

#### Service: `InventoryDeductionService`

**Location:** `src/Pms/Core/Application/Services/Inventory/InventoryDeductionService.php`

**Methods:**
```php
class InventoryDeductionService
{
    /**
     * Process inventory deduction for an order
     */
    public function processOrderDeduction(Order $order): void
    {
        DB::transaction(function () use ($order) {
            foreach ($order->items as $orderItem) {
                $product = $orderItem->product;
                $variant = $orderItem->variant;
                
                if ($product->inventory_management_type === 'simple') {
                    // Existing logic: deduct product stock
                    $this->deductSimpleStock($product, $variant, $orderItem->quantity);
                } 
                elseif ($product->inventory_management_type === 'composite') {
                    // New logic: deduct recipe materials
                    $this->deductRecipeMaterials(
                        $product,
                        $variant,
                        $orderItem->quantity,
                        $order
                    );
                }
            }
        });
    }
    
    /**
     * Deduct materials for composite product
     */
    private function deductRecipeMaterials(
        Product $product,
        ?ProductVariant $variant,
        int $quantity,
        Order $order
    ): void {
        $recipe = $variant?->activeRecipe ?? $product->activeRecipe;
        
        if (!$recipe) {
            throw new NoRecipeFoundException();
        }
        
        // Check sufficiency first
        $check = $this->calculationService->checkSufficiency($recipe, $quantity);
        if (!$check['sufficient']) {
            throw new InsufficientStockException($check['missing_MATERIALs']);
        }
        
        // Deduct each material
        foreach ($recipe->materials as $component) {
            $material = $component->material;
            $totalRequired = $component->actual_quantity * $quantity;
            
            $oldStock = $material->current_stock;
            $material->current_stock -= $totalRequired;
            $material->save();
            
            // Log transaction
            MATERIALTransaction::create([
                'tenant_id' => $order->tenant_id,
                'material_id' => $material->id,
                'transaction_type' => 'sale_deduction',
                'quantity' => -$totalRequired,
                'stock_before' => $oldStock,
                'stock_after' => $material->current_stock,
                'unit_cost' => $material->cost_per_unit,
                'reference_type' => 'Order',
                'reference_id' => $order->id,
                'user_id' => auth()->id(),
                'reason' => "Sale: {$product->name} x{$quantity}",
            ]);
        }
    }
}
```

---

### 1.3 API Endpoints (Phase 1)

**Reference:** Use full OpenAPI spec from `bom-openapi-specification.yaml`

**Priority Endpoints for Phase 1:**

#### Materials
- ✅ `GET /tenants/{tenantId}/inventory/Materials` - List
- ✅ `POST /tenants/{tenantId}/inventory/Materials` - Create
- ✅ `GET /tenants/{tenantId}/inventory/materials/{id}` - Get one
- ✅ `PATCH /tenants/{tenantId}/inventory/materials/{id}` - Update
- ✅ `POST /tenants/{tenantId}/inventory/materials/{id}/adjust` - Adjust stock

#### Recipes
- ✅ `GET /tenants/{tenantId}/inventory/recipes` - List
- ✅ `POST /tenants/{tenantId}/inventory/recipes` - Create
- ✅ `GET /tenants/{tenantId}/inventory/recipes/{id}` - Get one
- ✅ `PUT /tenants/{tenantId}/inventory/recipes/{id}` - Update
- ✅ `DELETE /tenants/{tenantId}/inventory/recipes/{id}` - Delete

#### Products Integration
- ✅ `GET /tenants/{tenantId}/products/{id}/available-quantity` - Calculate stock
- ✅ Modify `POST /tenants/{tenantId}/orders` to trigger deduction

#### Transactions
- ✅ `GET /tenants/{tenantId}/inventory/transactions` - History

**Defer to Phase 2:**
- ⏳ Batches endpoints
- ⏳ Suppliers endpoints
- ⏳ Waste logs endpoints
- ⏳ Analytics endpoints (except one: Recipe Costing Simulator)

---

### 1.4 Frontend (Phase 1)

**Priority Features:**

#### 1. Material Management Page
- ✅ List materials (table with pagination)
- ✅ Add/Edit material (form)
- ✅ Adjust stock (modal)
- ✅ Low stock indicator (badge)

#### 2. Recipe Builder
- ✅ Recipe form (product selector, name, description)
- ✅ Component adder (material selector + quantity + waste%)
- ✅ Cost calculator (auto-calculate total material cost)
- ✅ Save/Update recipe

#### 3. POS Integration
- ✅ Real-time stock display
  - Simple products: Show `stock_quantity`
  - Composite products: Call `/available-quantity` API, show `maximum_producible_quantity`
- ✅ Out-of-stock overlay (grey out if quantity = 0)

#### 4. ONE WOW Feature: Recipe Costing Simulator
- ✅ Simple page: List materials with editable costs
- ✅ When cost changes → recalculate all affected products
- ✅ Show old margin vs new margin
- ✅ Suggest new price to maintain margin
- ✅ **Frontend-only** (no backend needed)

**Defer to Phase 2:**
- ⏳ Batch management UI
- ⏳ Expiry alerts dashboard
- ⏳ Menu engineering matrix
- ⏳ Waste logging UI
- ⏳ Purchase order management

---

### 1.5 Testing (Phase 1)

**Unit Tests:**
- ✅ `MATERIALService` methods
- ✅ `RecipeService` methods
- ✅ `InventoryCalculationService::calculateAvailableQuantity()`
- ✅ `InventoryDeductionService::deductRecipeMaterials()`

**Feature Tests:**
- ✅ Create material via API
- ✅ Create recipe with components
- ✅ Calculate available quantity (simple product)
- ✅ Calculate available quantity (composite product)
- ✅ Create order → verify material deduction
- ✅ Transaction log created correctly

**Integration Tests:**
- ✅ End-to-end flow:
  1. Create materials (Coffee, Sugar)
  2. Create product ("Iced Coffee")
  3. Create recipe (15g coffee + 10g sugar)
  4. Create order (2x Iced Coffee)
  5. Verify: Coffee reduced by 30g, Sugar by 20g
  6. Verify: Transactions logged

**Target Coverage:** >80%

---

### 1.6 Documentation (Phase 1)

**User Docs:**
- ✅ Quick Start: "Create your first recipe in 5 minutes"
- ✅ Video tutorial: Recipe builder walkthrough
- ✅ FAQ: Common questions

**Developer Docs:**
- ✅ API documentation (OpenAPI spec)
- ✅ Database schema diagram
- ✅ Service layer explanation

---

### 1.7 Success Criteria (Phase 1)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Feature Completeness** | 100% of Phase 1 scope | Checklist review |
| **Test Coverage** | >80% | PHPUnit report |
| **API Response Time** | <200ms (p95) | Load testing |
| **Bug-Free Deployment** | 0 P0/P1 bugs | QA testing |
| **Pilot Customer Sign-up** | 3-5 customers | Sales pipeline |
| **User Satisfaction** | >8/10 | Survey after 2 weeks |

---

## 🚀 PHASE 2: ADVANCED FEATURES (WEEKS 7-14)

**Philosophy:** **"Scale to multi-industry, add intelligence"**

### Goals
1. ✅ Support perishable items (FnB industry)
2. ✅ Add batch tracking with FEFO
3. ✅ Enable supplier integration
4. ✅ Implement remaining WOW features
5. ✅ Multi-level BOM support

---

### 2.1 Database Schema Additions (Phase 2)

#### Table: `inventory_batches`
**Purpose:** Track batches for perishable items

```sql
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    material_id UUID NOT NULL,
    
    -- Batch Info
    batch_number VARCHAR(100) NOT NULL,
    received_date DATE NOT NULL,
    expiry_date DATE,
    
    -- Quantity
    initial_quantity DECIMAL(15, 6) NOT NULL,
    current_quantity DECIMAL(15, 6) NOT NULL,
    
    -- Costing
    unit_cost DECIMAL(15, 4) NOT NULL,
    
    -- Supplier
    supplier_id UUID,
    
    -- Status
    status ENUM('active', 'expired', 'depleted', 'quarantined') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    
    UNIQUE (tenant_id, material_id, batch_number)
);

CREATE INDEX idx_batches_MATERIAL ON inventory_batches(material_id, status);
CREATE INDEX idx_batches_expiry ON inventory_batches(tenant_id, expiry_date) 
    WHERE expiry_date IS NOT NULL AND status = 'active';
```

---

#### Table: `suppliers`

```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    lead_time_days INTEGER DEFAULT 7,
    minimum_order_value DECIMAL(15, 4),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, code)
);
```

---

#### Table: `waste_logs`

```sql
CREATE TABLE waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    material_id UUID NOT NULL,
    
    quantity_wasted DECIMAL(15, 6) NOT NULL,
    reason VARCHAR(100),  -- spoilage, spillage, damaged, expired
    cost_impact DECIMAL(15, 4),
    
    logged_by UUID,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    FOREIGN KEY (logged_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_waste_logs_MATERIAL ON waste_logs(material_id, created_at DESC);
CREATE INDEX idx_waste_logs_tenant_date ON waste_logs(tenant_id, created_at DESC);
```

---

#### Modify `Materials` Table

```sql
-- Add columns for Phase 2 features
ALTER TABLE materials ADD COLUMN tracking_mode ENUM('standard', 'batch', 'perishable') DEFAULT 'standard';
ALTER TABLE materials ADD COLUMN default_shelf_life_days INTEGER;
ALTER TABLE materials ADD COLUMN primary_supplier_id UUID;
ALTER TABLE materials ADD CONSTRAINT fk_MATERIALs_supplier 
    FOREIGN KEY (primary_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Add reorder quantity (for predictive PO)
ALTER TABLE materials ADD COLUMN reorder_quantity DECIMAL(15, 4);
```

---

### 2.2 New Services (Phase 2)

#### Service: `BatchTrackingService`

```php
class BatchTrackingService
{
    /**
     * Deduct from batches using FEFO (First Expire First Out)
     */
    public function deductFromBatches(
        Material $material,
        float $quantity,
        Order $order
    ): void {
        // Get active batches, ordered by expiry date
        $batches = InventoryBatch::where('material_id', $material->id)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->orderBy('expiry_date', 'asc')  // FEFO
            ->get();
        
        $remaining = $quantity;
        
        foreach ($batches as $batch) {
            if ($remaining <= 0) break;
            
            $deductFromBatch = min($remaining, $batch->current_quantity);
            
            // Update batch
            $batch->current_quantity -= $deductFromBatch;
            if ($batch->current_quantity <= 0) {
                $batch->status = 'depleted';
            }
            $batch->save();
            
            // Log transaction
            MATERIALTransaction::create([
                'tenant_id' => $material->tenant_id,
                'material_id' => $material->id,
                'batch_id' => $batch->id,
                'transaction_type' => 'sale_deduction',
                'quantity' => -$deductFromBatch,
                'reference_type' => 'Order',
                'reference_id' => $order->id,
                'unit_cost' => $batch->unit_cost,
            ]);
            
            $remaining -= $deductFromBatch;
        }
        
        if ($remaining > 0) {
            throw new InsufficientStockException();
        }
    }
}
```

---

#### Job: `CheckExpiringBatchesJob`

```php
class CheckExpiringBatchesJob implements ShouldQueue
{
    public function handle()
    {
        $warningDays = 7;  // Configurable per tenant
        $warningDate = now()->addDays($warningDays);
        
        $expiringBatches = InventoryBatch::where('status', 'active')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', $warningDate)
            ->where('expiry_date', '>=', now())
            ->with(['material', 'tenant'])
            ->get();
        
        foreach ($expiringBatches as $batch) {
            $daysLeft = now()->diffInDays($batch->expiry_date);
            
            event(new BatchExpiryWarning($batch, $daysLeft));
        }
    }
}
```

---

#### Job: `ForecastStockJob` (Predictive PO)

```php
class ForecastStockJob implements ShouldQueue
{
    public function handle()
    {
        $tenants = Tenant::active()->get();
        
        foreach ($tenants as $tenant) {
            $materials = Material::where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->whereNotNull('reorder_point')
                ->get();
            
            foreach ($materials as $material) {
                $this->checkMATERIAL($material);
            }
        }
    }
    
    private function checkMATERIAL(Material $material): void
    {
        // Calculate daily consumption (last 30 days)
        $thirtyDaysAgo = now()->subDays(30);
        $totalUsed = MATERIALTransaction::where('material_id', $material->id)
            ->whereIn('transaction_type', ['sale_deduction'])
            ->where('transaction_date', '>=', $thirtyDaysAgo)
            ->sum('quantity');
        
        $dailyConsumption = abs($totalUsed) / 30;
        
        if ($dailyConsumption <= 0) return;
        
        $daysUntilStockout = $material->current_stock / $dailyConsumption;
        $leadTime = $material->primarySupplier?->lead_time_days ?? 7;
        $safetyMargin = 7;
        
        if (($daysUntilStockout - $leadTime) <= $safetyMargin) {
            // Create notification
            Notification::create([
                'tenant_id' => $material->tenant_id,
                'type' => 'low_stock_alert',
                'title' => "Low Stock Alert: {$material->name}",
                'message' => "Will run out in {$daysUntilStockout} days. Daily usage: {$dailyConsumption} {$material->unit_of_measurement}.",
                'data' => [
                    'material_id' => $material->id,
                    'days_until_stockout' => $daysUntilStockout,
                    'recommended_order_quantity' => $material->reorder_quantity,
                ],
            ]);
        }
    }
}
```

---

### 2.3 WOW Features Implementation (Phase 2)

#### Feature: Menu Engineering Matrix

**Endpoint:** `GET /tenants/{tenantId}/analytics/menu-engineering`

```php
class MenuEngineeringController
{
    public function getMatrix(string $tenantId)
    {
        $startDate = request('start_date', now()->subDays(30));
        $endDate = request('end_date', now());
        
        $products = Product::where('tenant_id', $tenantId)
            ->where('inventory_management_type', 'composite')
            ->with(['activeRecipe.materials.material'])
            ->get();
        
        $data = [];
        
        foreach ($products as $product) {
            // Get sales data
            $sales = OrderItem::whereHas('order', function ($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->where('product_id', $product->id)
            ->sum('quantity');
            
            // Calculate COGS
            $cogs = $product->activeRecipe?->total_material_cost ?? 0;
            
            $revenue = $sales * $product->selling_price;
            $profit = $revenue - ($sales * $cogs);
            $marginPct = $revenue > 0 ? ($profit / $revenue) * 100 : 0;
            
            $data[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'units_sold' => $sales,
                'revenue' => $revenue,
                'cogs' => $cogs,
                'margin_percentage' => round($marginPct, 2),
            ];
        }
        
        // Calculate median
        $medianSales = $this->median(array_column($data, 'units_sold'));
        $medianMargin = $this->median(array_column($data, 'margin_percentage'));
        
        // Assign quadrants
        foreach ($data as &$item) {
            $item['quadrant'] = $this->assignQuadrant(
                $item['units_sold'],
                $item['margin_percentage'],
                $medianSales,
                $medianMargin
            );
        }
        
        return response()->json([
            'data' => $data,
            'thresholds' => [
                'median_sales' => $medianSales,
                'median_margin' => $medianMargin,
            ],
        ]);
    }
    
    private function assignQuadrant($sales, $margin, $medianSales, $medianMargin): string
    {
        if ($sales >= $medianSales && $margin >= $medianMargin) return 'star';
        if ($sales >= $medianSales && $margin < $medianMargin) return 'plow_horse';
        if ($sales < $medianSales && $margin >= $medianMargin) return 'puzzle';
        return 'dog';
    }
}
```

**Frontend:** Scatter plot chart with Recharts

---

#### Feature: Waste Tracking

**Endpoint:** `POST /tenants/{tenantId}/inventory/waste-logs`

```php
class WasteLogController
{
    public function create(string $tenantId, Request $request)
    {
        $request->validate([
            'material_id' => 'required|uuid|exists:materials,id',
            'quantity' => 'required|numeric|min:0',
            'reason' => 'required|string|in:spoilage,spillage,damaged,expired,other',
            'notes' => 'nullable|string',
        ]);
        
        DB::transaction(function () use ($request, $tenantId) {
            $material = Material::findOrFail($request->material_id);
            
            // Create log
            $wasteLog = WasteLog::create([
                'tenant_id' => $tenantId,
                'material_id' => $material->id,
                'quantity_wasted' => $request->quantity,
                'reason' => $request->reason,
                'cost_impact' => $request->quantity * $material->cost_per_unit,
                'logged_by' => auth()->id(),
                'notes' => $request->notes,
            ]);
            
            // Deduct stock
            $oldStock = $material->current_stock;
            $material->current_stock -= $request->quantity;
            $material->save();
            
            // Create transaction
            MATERIALTransaction::create([
                'tenant_id' => $tenantId,
                'material_id' => $material->id,
                'transaction_type' => 'waste',
                'quantity' => -$request->quantity,
                'stock_before' => $oldStock,
                'stock_after' => $material->current_stock,
                'unit_cost' => $material->cost_per_unit,
                'reference_type' => 'WasteLog',
                'reference_id' => $wasteLog->id,
                'user_id' => auth()->id(),
                'reason' => $request->reason,
            ]);
            
            return response()->json(['success' => true, 'data' => $wasteLog]);
        });
    }
}
```

---

### 2.4 Success Criteria (Phase 2)

| Metric | Target |
|--------|--------|
| **Batch Tracking Accuracy** | 100% (no stock mismatch) |
| **FEFO Deduction** | Oldest batches depleted first |
| **Expiry Warnings** | Sent 7 days before expiry |
| **Predictive PO Accuracy** | >85% (actually runs out of stock when predicted) |
| **Menu Engineering Insights** | >10 actionable recommendations per tenant |
| **Waste Cost Visibility** | Tracked to the penny |
| **New Customer Sign-ups** | 20+ leads generated |
| **Pricing Uplift Achieved** | 2.5x (Rp 200k → Rp 500k) |

---

## 🏢 PHASE 3: ENTERPRISE FEATURES (WEEKS 15-26)

**Philosophy:** **"Become the ERP-grade market leader"**

### Goals
1. ✅ Multi-level BOM (nested recipes)
2. ✅ Multi-warehouse support
3. ✅ Advanced costing (FIFO accounting)
4. ✅ Production planning module
5. ✅ Quality control (quarantine)
6. ✅ Mobile app for inventory

**Defer detailed planning until Phase 2 is validated**

---

## 📊 OVERALL SUCCESS METRICS

### Technical KPIs

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| **Test Coverage** | >80% | >85% | >90% |
| **API Response Time (p95)** | <200ms | <150ms | <100ms |
| **Zero Data Loss** | 100% | 100% | 100% |
| **Uptime** | >99% | >99.5% | >99.9% |

### Business KPIs

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| **Pilot Customers** | 3-5 | 10-20 | 50-100 |
| **Monthly Pricing** | Rp 200k (existing) | Rp 500k | Rp 1M |
| **Feature Satisfaction** | >8/10 | >8.5/10 | >9/10 |
| **Churn Rate** | Baseline | -20% | -30% |
| **Market Positioning** | POS with BOM | Multi-Industry Platform | ERP Alternative |

---

## 🎯 IMMEDIATE NEXT STEPS

### Week 1: Preparation
1. ✅ **Approve this merged plan**
2. ✅ **Set up project tracking** (Jira/Linear)
3. ✅ **Recruit pilot customers** (3-5 friendly businesses)
4. ✅ **Create database migration files** (Phase 1 schema)
5. ✅ **Update OpenAPI spec** in `openapi.yaml`

### Week 2-3: Core Development
1. ✅ **Build models & relationships** (Material, Recipe, RecipeMaterial, MATERIALTransaction)
2. ✅ **Build services** (MATERIALService, RecipeService, InventoryCalculationService)
3. ✅ **Build API endpoints** (CRUD for materials, recipes)
4. ✅ **Write unit tests** (>80% coverage)

### Week 4-5: Frontend Development
1. ✅ **Build material management page**
2. ✅ **Build recipe builder UI**
3. ✅ **Integrate with POS** (real-time stock display)
4. ✅ **Build Recipe Costing Simulator**

### Week 6: Testing & Deployment
1. ✅ **Feature testing** (end-to-end flows)
2. ✅ **QA testing** (bug hunting)
3. ✅ **Deploy to staging**
4. ✅ **Deploy to production** (for pilot customers)
5. ✅ **User training** (video tutorials, documentation)

---

## 📚 APPENDICES

### Appendix A: Comparison with Original Plans

| Feature | Original Plan | Zencoder AI Plan | Merged Plan |
|---------|--------------|------------------|-------------|
| **Schema Simplicity** | ✅ Simple | ❌ Complex | ✅ Simple (Phase 1) → Complex (Phase 2) |
| **Multi-Industry** | ⚠️ Implied | ✅ Explicit | ✅ Phased approach |
| **Batch Tracking** | ❌ No | ✅ Yes | ✅ Phase 2 |
| **Waste Factor** | ❌ No | ✅ Yes | ✅ Phase 1 |
| **OpenAPI Spec** | ⚠️ Partial | ✅ Complete | ✅ Complete |
| **Event-Driven** | ❌ No | ✅ Yes | ⏳ Phase 2 |
| **Time to MVP** | ✅ Fast (4 weeks) | ❌ Slow (8 weeks) | ✅ Fast (6 weeks) |

### Appendix B: Architecture Diagrams

**To be created:**
- Database ERD (Phase 1)
- Service layer diagram
- API flow diagram
- Frontend component hierarchy

### Appendix C: OpenAPI Specification

**Location:** `docs/enhancement-plans/bom-openapi-specification.yaml`

Full specification is available in separate document.

---

## ✅ CONCLUSION

This merged plan combines the **best of both worlds**:

1. **✅ Simplicity** (Original plan) → Fast MVP, easy to understand
2. **✅ Completeness** (Zencoder plan) → Future-proof, enterprise-grade
3. **✅ Phased approach** → Validate early, scale gradually
4. **✅ Multi-industry** → F&B, Manufacturing, Crafts
5. **✅ WOW features** → Predictive PO, Menu Engineering, Waste Tracking, Simulator

**Recommended Action:** ✅ **APPROVE and PROCEED with Phase 1**

---

**Document Status:** ✅ READY FOR IMPLEMENTATION  
**Approval Required From:** Product Owner, Tech Lead, Stakeholders  
**Next Review Date:** End of Phase 1 (Week 6)  
**Contact:** Development Team Lead