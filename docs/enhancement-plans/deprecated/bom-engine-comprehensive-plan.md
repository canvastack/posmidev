# POSMID 2.0 - Bill of Materials (BOM) Engine
## Comprehensive Architecture & Implementation Plan

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Planning Phase  
**Author:** Zencoder AI Analysis

---

## 📋 EXECUTIVE SUMMARY

This document outlines the comprehensive plan to evolve POSMID from a standard Point of Sale system into an **Intelligent Operations Platform** with enterprise-grade Bill of Materials (BOM) capabilities.

### Key Objectives

1. **Transform inventory paradigm** from simple stock tracking to recipe/BOM-based composition
2. **Support multi-industry use cases** (F&B, Manufacturing, Crafts, Services)
3. **Enable real-time stock calculation** based on component availability
4. **Provide predictive intelligence** for purchasing, profitability, and cost management
5. **Maintain architectural integrity** (Hexagonal Architecture, Multi-tenancy, OpenAPI-first)

### Expected Business Impact

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| **Target Market** | Small retailers | F&B chains, Manufacturers, Bakeries | 10x TAM expansion |
| **Monthly Pricing** | Rp 200k | Rp 500k - 1M | 2.5-5x revenue per tenant |
| **Feature Parity** | Basic POS | ERP-grade operations | Enterprise positioning |
| **Customer Retention** | Baseline | +40% (due to complexity/lock-in) | Higher LTV |
| **Competitive Moat** | Low | High (complex feature set) | Defensible position |

---

## 🏗️ PART 1: ARCHITECTURAL FOUNDATION

### 1.1 Design Philosophy

**Core Principle: "Flexible Inventory Abstraction"**

Rather than forcing all businesses into a single inventory model, we provide **abstraction layers** that adapt to business needs:

```
┌─────────────────────────────────────────────────────────┐
│              PRODUCT LAYER (Sellable Items)             │
│  What customers buy: Coffee, T-Shirt, Ring, Service    │
└─────────────────────────────────────────────────────────┘
                          ↓
            ┌─────────────┴─────────────┐
            │                           │
┌───────────▼──────────┐   ┌───────────▼──────────┐
│   SIMPLE INVENTORY   │   │  COMPOSITE INVENTORY │
│   (Direct Stock)     │   │   (Recipe/BOM Based) │
│                      │   │                      │
│  - Track stock       │   │  - Define recipe     │
│    directly          │   │  - Calculate stock   │
│  - Manual deduction  │   │    from components   │
│                      │   │  - Auto deduction    │
└──────────────────────┘   └──────────────────────┘
                                      ↓
                    ┌─────────────────────────────┐
                    │   COMPONENT LAYER           │
                    │   (Materials/Ingredients)   │
                    └─────────────────────────────┘
                                      ↓
              ┌───────────┬───────────┴───────────┬──────────┐
              │           │                       │          │
      ┌───────▼──────┐  ┌─▼────────────┐  ┌──────▼─────┐  ┌─▼──────────┐
      │ RAW MATERIAL │  │ INTERMEDIATE │  │  PACKAGING │  │ CONSUMABLE │
      │              │  │ GOODS (WIP)  │  │            │  │  (Indirect)│
      └──────────────┘  └──────────────┘  └────────────┘  └────────────┘
              ↓
      ┌───────────────────────┐
      │   TRACKING MODES      │
      ├───────────────────────┤
      │ • Perishable (FEFO)   │ ← F&B: milk, meat
      │ • Batch (FIFO)        │ ← Mfg: metal sheets
      │ • Standard (Simple)   │ ← General items
      │ • Serialized (Unit)   │ ← Electronics
      └───────────────────────┘
```

### 1.2 Multi-Industry Support Matrix

| Industry | Inventory Type | Tracking Mode | Expiry Tracking | Batch Tracking | Multi-level BOM |
|----------|---------------|---------------|-----------------|----------------|-----------------|
| **Food & Beverage** | Composite | Perishable | ✅ Required | ✅ FEFO | ✅ 2-3 levels |
| **Manufacturing** | Composite | Batch/Standard | ❌ Optional | ✅ FIFO | ✅ 3-5 levels |
| **Bakery** | Composite | Perishable | ✅ Required | ✅ FEFO | ✅ 2 levels |
| **Crafts/Handmade** | Composite | Standard | ❌ No | ✅ Optional | ✅ 2 levels |
| **Retail (Resale)** | Simple | Standard | ⚠️ Some items | ❌ No | ❌ No |
| **Services** | None | N/A | ❌ No | ❌ No | ❌ No |

---

## 🗄️ PART 2: DATABASE ARCHITECTURE

### 2.1 Schema Design Principles

1. **Universal abstraction** via `inventory_items` table
2. **Flexible tracking** through `tracking_mode` enum
3. **Tenant isolation** enforced on all tables
4. **Audit trail** via `inventory_transactions`
5. **Cost accuracy** with multiple cost tracking (FIFO, weighted average, last purchase)
6. **Performance** through strategic indexing

### 2.2 Core Tables

#### Table: `inventory_items`
**Purpose:** Universal abstraction for all inventory components (raw materials, WIP, packaging, consumables)

```sql
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Classification
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    
    -- Type System
    inventory_type ENUM(
        'raw_material',      -- Base materials (coffee beans, fabric, metal)
        'work_in_progress',  -- Intermediate goods (brewed coffee base, cut fabric)
        'finished_goods',    -- Links to products table
        'packaging',         -- Bottles, boxes, bags
        'consumable'         -- Indirect materials (cleaning supplies)
    ) NOT NULL DEFAULT 'raw_material',
    
    tracking_mode ENUM(
        'perishable',   -- Has expiry, requires FEFO (First Expire First Out)
        'batch',        -- Batch tracking with FIFO
        'standard',     -- Simple quantity tracking
        'serialized'    -- Unit-level tracking (future: for electronics)
    ) DEFAULT 'standard',
    
    -- Measurement
    unit_of_measurement VARCHAR(50) NOT NULL,  -- gram, ml, pcs, meter, sheet, kg
    unit_precision INTEGER DEFAULT 2,          -- Decimal places (2 = 0.01 precision)
    
    -- Stock Management
    current_stock DECIMAL(15, 6) DEFAULT 0,
    reserved_stock DECIMAL(15, 6) DEFAULT 0,   -- For pre-orders, production orders
    available_stock DECIMAL(15, 6) GENERATED ALWAYS AS 
        (current_stock - reserved_stock) STORED,
    
    minimum_stock DECIMAL(15, 6),              -- Safety stock level
    reorder_point DECIMAL(15, 6),              -- Trigger reorder when stock hits this
    reorder_quantity DECIMAL(15, 6),           -- Default quantity to order
    maximum_stock DECIMAL(15, 6),              -- Max storage capacity
    
    -- Costing (Multi-method support)
    cost_per_unit DECIMAL(15, 4),              -- Current cost (for valuation)
    last_purchase_price DECIMAL(15, 4),        -- Most recent purchase
    average_cost DECIMAL(15, 4),               -- Weighted moving average
    costing_method ENUM('fifo', 'average', 'last_purchase') DEFAULT 'average',
    
    -- Perishable-specific
    default_shelf_life_days INTEGER,           -- NULL if not perishable
    storage_conditions TEXT,                   -- "Refrigerate 2-8°C", "Keep dry"
    storage_location VARCHAR(255),             -- Warehouse location
    
    -- Supplier Info
    primary_supplier_id UUID,                  -- FK to suppliers table
    supplier_sku VARCHAR(100),                 -- Supplier's SKU for this item
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,                      -- Soft delete
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (primary_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_inventory_items_tenant ON inventory_items(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_items_type ON inventory_items(tenant_id, inventory_type) WHERE is_active = TRUE;
CREATE INDEX idx_inventory_items_sku ON inventory_items(tenant_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_inventory_items_reorder ON inventory_items(tenant_id) 
    WHERE is_active = TRUE AND current_stock <= reorder_point;
CREATE INDEX idx_inventory_items_supplier ON inventory_items(primary_supplier_id);
```

#### Table: `inventory_batches`
**Purpose:** Track batches for perishable and batch-tracked items

```sql
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    
    -- Batch Identification
    batch_number VARCHAR(100) NOT NULL,        -- Internal or supplier batch code
    lot_number VARCHAR(100),                   -- Manufacturing lot number
    
    -- Dates
    received_date DATE NOT NULL,
    manufactured_date DATE,
    expiry_date DATE,                          -- NULL for non-perishable
    
    -- Quantity
    initial_quantity DECIMAL(15, 6) NOT NULL,
    current_quantity DECIMAL(15, 6) NOT NULL,
    reserved_quantity DECIMAL(15, 6) DEFAULT 0,
    
    -- Costing (Batch-specific)
    unit_cost DECIMAL(15, 4) NOT NULL,
    total_value DECIMAL(15, 4) GENERATED ALWAYS AS 
        (current_quantity * unit_cost) STORED,
    
    -- Traceability
    supplier_id UUID,
    purchase_order_id UUID,                    -- FK to purchase_orders
    receiving_reference VARCHAR(100),          -- GRN (Goods Receipt Note) number
    
    -- Quality Control
    quality_status ENUM('approved', 'quarantined', 'rejected') DEFAULT 'approved',
    inspection_date DATE,
    inspection_notes TEXT,
    
    -- Status
    status ENUM('active', 'expired', 'depleted', 'quarantined') DEFAULT 'active',
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    
    UNIQUE (tenant_id, inventory_item_id, batch_number)
);

CREATE INDEX idx_batches_item ON inventory_batches(inventory_item_id, status);
CREATE INDEX idx_batches_expiry ON inventory_batches(tenant_id, expiry_date) 
    WHERE expiry_date IS NOT NULL AND status = 'active';
CREATE INDEX idx_batches_active ON inventory_batches(inventory_item_id) 
    WHERE status = 'active' AND current_quantity > 0;
```

#### Table: `recipes`
**Purpose:** Define how products are composed from components (Bill of Materials)

```sql
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Link to Product
    product_id UUID NOT NULL,                  -- FK to products
    variant_id UUID,                           -- FK to product_variants (NULL = base product)
    
    -- Recipe Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,                 -- Recipe versioning for historical tracking
    is_active BOOLEAN DEFAULT TRUE,            -- Only one active version per product/variant
    
    -- Production Metrics
    yield_quantity DECIMAL(10, 2) DEFAULT 1.00,  -- How many units this recipe produces
    production_time_minutes INTEGER,           -- Estimated production time
    batch_size DECIMAL(10, 2),                 -- Optimal batch size (for efficiency)
    
    -- Costing (Auto-calculated)
    total_material_cost DECIMAL(15, 4),        -- Sum of component costs
    labor_cost_per_unit DECIMAL(15, 4),        -- Direct labor
    overhead_cost_per_unit DECIMAL(15, 4),     -- Allocated overhead
    total_cost_per_unit DECIMAL(15, 4) GENERATED ALWAYS AS 
        (COALESCE(total_material_cost, 0) + COALESCE(labor_cost_per_unit, 0) + COALESCE(overhead_cost_per_unit, 0)) STORED,
    
    -- Multi-level BOM support
    recipe_type ENUM('standard', 'multi_level') DEFAULT 'standard',
    parent_recipe_id UUID,                     -- For nested recipes
    
    -- Metadata
    notes TEXT,
    instructions TEXT,                         -- Production instructions
    created_by UUID,
    approved_by UUID,                          -- Quality approval
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
    
    UNIQUE (tenant_id, product_id, variant_id, version) WHERE is_active = TRUE
);

CREATE INDEX idx_recipes_product ON recipes(product_id, is_active);
CREATE INDEX idx_recipes_variant ON recipes(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_recipes_tenant_active ON recipes(tenant_id, is_active);
```

#### Table: `recipe_components`
**Purpose:** Define components (ingredients/materials) required for each recipe

```sql
CREATE TABLE recipe_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    
    -- Quantity Requirements
    quantity_required DECIMAL(15, 6) NOT NULL,
    
    -- Waste/Yield Factor
    waste_percentage DECIMAL(5, 2) DEFAULT 0,  -- 5.5% waste = 5.50
    actual_quantity DECIMAL(15, 6) GENERATED ALWAYS AS 
        (quantity_required * (1 + waste_percentage/100)) STORED,
    
    -- Substitution Support
    is_optional BOOLEAN DEFAULT FALSE,         -- Can skip if not available
    can_substitute BOOLEAN DEFAULT FALSE,      -- Allow alternatives
    substitute_group_id UUID,                  -- Group for interchangeable items
    
    -- Costing (Snapshot at recipe creation)
    unit_cost_snapshot DECIMAL(15, 4),         -- Cost when recipe was created
    total_cost DECIMAL(15, 4) GENERATED ALWAYS AS 
        (actual_quantity * COALESCE(unit_cost_snapshot, 0)) STORED,
    
    -- Production Details
    processing_stage INTEGER DEFAULT 1,        -- Order of addition (1, 2, 3...)
    processing_notes TEXT,                     -- "Add slowly", "Mix for 2 min"
    
    -- Display Order
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT,
    
    UNIQUE (recipe_id, inventory_item_id)
);

CREATE INDEX idx_recipe_components_recipe ON recipe_components(recipe_id);
CREATE INDEX idx_recipe_components_item ON recipe_components(inventory_item_id);
```

#### Table: `inventory_transactions`
**Purpose:** Complete audit trail of all inventory movements

```sql
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    batch_id UUID,                             -- NULL for non-batch items
    
    -- Transaction Classification
    transaction_type ENUM(
        'purchase',           -- Purchased from supplier
        'sale_deduction',     -- Sold to customer (via order)
        'production_input',   -- Used in production (recipe deduction)
        'production_output',  -- Produced from recipe
        'adjustment',         -- Manual adjustment (count correction)
        'waste',              -- Wastage/spoilage
        'return_customer',    -- Customer return
        'return_supplier',    -- Return to supplier
        'transfer_in',        -- Transfer from another location
        'transfer_out',       -- Transfer to another location
        'consumption',        -- Consumable usage (indirect)
        'sample',             -- Sample/testing
        'damaged'             -- Damaged/broken
    ) NOT NULL,
    
    -- Quantity & Direction
    quantity DECIMAL(15, 6) NOT NULL,          -- Positive = in, Negative = out
    
    -- Stock Snapshot
    stock_before DECIMAL(15, 6) NOT NULL,
    stock_after DECIMAL(15, 6) NOT NULL,
    
    -- Costing
    unit_cost DECIMAL(15, 4),
    total_value DECIMAL(15, 4) GENERATED ALWAYS AS 
        (ABS(quantity) * COALESCE(unit_cost, 0)) STORED,
    
    -- References
    reference_type VARCHAR(50),                -- Order, PurchaseOrder, ProductionBatch, etc
    reference_id UUID,
    reference_number VARCHAR(100),             -- Human-readable reference
    
    -- Actor & Reason
    user_id UUID,                              -- Who performed the transaction
    reason TEXT,
    notes TEXT,
    
    -- Location (Multi-warehouse support)
    from_location_id UUID,                     -- Source warehouse/location
    to_location_id UUID,                       -- Destination
    
    -- Approval (for high-value transactions)
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    approved_at TIMESTAMP,
    
    -- Timestamps
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_item ON inventory_transactions(inventory_item_id, transaction_date DESC);
CREATE INDEX idx_transactions_date ON inventory_transactions(tenant_id, transaction_date DESC);
CREATE INDEX idx_transactions_reference ON inventory_transactions(reference_type, reference_id);
CREATE INDEX idx_transactions_type ON inventory_transactions(tenant_id, transaction_type, transaction_date DESC);
CREATE INDEX idx_transactions_batch ON inventory_transactions(batch_id) WHERE batch_id IS NOT NULL;
```

#### Table: `suppliers` (Supporting Table)
**Purpose:** Manage supplier information for predictive purchasing

```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),                          -- Internal supplier code
    
    -- Contact
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Business Terms
    payment_terms VARCHAR(100),                -- "Net 30", "COD"
    lead_time_days INTEGER DEFAULT 7,          -- Default lead time
    minimum_order_value DECIMAL(15, 4),
    currency VARCHAR(3) DEFAULT 'IDR',
    
    -- Performance Tracking
    reliability_rating DECIMAL(3, 2),          -- 0.00 to 5.00
    total_orders INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id, is_active);
```

### 2.3 Product Table Modifications

```sql
-- Add to existing products table
ALTER TABLE products ADD COLUMN inventory_management_type ENUM(
    'none',        -- No inventory (services, digital products)
    'simple',      -- Direct stock tracking (current behavior)
    'composite'    -- Recipe/BOM-based (new feature)
) DEFAULT 'simple';

ALTER TABLE products ADD COLUMN active_recipe_id UUID;
ALTER TABLE products ADD CONSTRAINT fk_products_active_recipe 
    FOREIGN KEY (active_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;

-- Add to product_variants table
ALTER TABLE product_variants ADD COLUMN has_custom_recipe BOOLEAN DEFAULT FALSE;
ALTER TABLE product_variants ADD COLUMN active_recipe_id UUID;
ALTER TABLE product_variants ADD CONSTRAINT fk_variants_active_recipe 
    FOREIGN KEY (active_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;
```

---

## 💼 PART 3: BUSINESS LOGIC & SERVICES

### 3.1 Core Service: InventoryCalculationService

**Location:** `src/Pms/Core/Application/Services/Inventory/InventoryCalculationService.php`

**Responsibilities:**
- Calculate maximum producible quantity for composite products
- Determine limiting components (bottlenecks)
- Support multi-level BOM explosion
- Handle FIFO/FEFO logic for batch-tracked items

**Key Methods:**

```php
namespace Pms\Core\Application\Services\Inventory;

class InventoryCalculationService
{
    /**
     * Calculate maximum producible quantity for a product
     * 
     * @param Product $product
     * @param ProductVariant|null $variant
     * @return array{
     *   type: string,
     *   maximum_producible_quantity?: int,
     *   limiting_component?: array,
     *   all_components_availability?: array
     * }
     */
    public function calculateAvailableQuantity(
        Product $product, 
        ?ProductVariant $variant = null
    ): array;
    
    /**
     * Explode multi-level BOM to flat component list
     * 
     * @param Recipe $recipe
     * @param float $quantity
     * @return array<array{id: string, name: string, quantity: float, unit: string}>
     */
    public function explodeBOM(Recipe $recipe, float $quantity = 1): array;
    
    /**
     * Check if sufficient inventory exists for production
     * 
     * @param Recipe $recipe
     * @param int $quantity
     * @return array{sufficient: bool, missing_components: array}
     */
    public function checkSufficiency(Recipe $recipe, int $quantity): array;
    
    /**
     * Calculate total cost of a recipe based on current component costs
     * 
     * @param Recipe $recipe
     * @return array{material_cost: float, total_cost: float, components: array}
     */
    public function calculateRecipeCost(Recipe $recipe): array;
}
```

### 3.2 Core Service: InventoryDeductionService

**Location:** `src/Pms/Core/Application/Services/Inventory/InventoryDeductionService.php`

**Responsibilities:**
- Deduct inventory when orders are created
- Handle FIFO/FEFO logic for batch items
- Create transaction logs
- Trigger low stock alerts

**Key Methods:**

```php
namespace Pms\Core\Application\Services\Inventory;

class InventoryDeductionService
{
    /**
     * Process inventory deduction for an order
     * 
     * @param Order $order
     * @return void
     * @throws InsufficientStockException
     */
    public function processOrderDeduction(Order $order): void;
    
    /**
     * Deduct components for a composite product
     * 
     * @param Product $product
     * @param ProductVariant|null $variant
     * @param int $quantity
     * @param Order $order
     * @return void
     */
    public function deductRecipeComponents(
        Product $product,
        ?ProductVariant $variant,
        int $quantity,
        Order $order
    ): void;
    
    /**
     * Deduct from batches using FIFO/FEFO
     * 
     * @param InventoryItem $item
     * @param float $quantity
     * @param Order $order
     * @return void
     */
    public function deductFromBatches(
        InventoryItem $item,
        float $quantity,
        Order $order
    ): void;
}
```

### 3.3 Event-Driven Architecture

**Events:**

```php
// App\Events\Inventory\StockLevelChanged
class StockLevelChanged
{
    public InventoryItem $inventoryItem;
    public float $oldStock;
    public float $newStock;
    public InventoryTransaction $transaction;
}

// App\Events\Inventory\LowStockDetected
class LowStockDetected
{
    public InventoryItem $inventoryItem;
    public float $currentStock;
    public float $reorderPoint;
    public ?float $daysUntilStockout;
}

// App\Events\Inventory\BatchExpiryWarning
class BatchExpiryWarning
{
    public InventoryBatch $batch;
    public int $daysUntilExpiry;
}

// App\Events\Inventory\RecipeUpdated
class RecipeUpdated
{
    public Recipe $recipe;
    public ?Recipe $previousVersion;
}
```

**Listeners:**

```php
// App\Listeners\Inventory\CheckReorderPoint
class CheckReorderPoint
{
    public function handle(StockLevelChanged $event)
    {
        if ($event->inventoryItem->current_stock <= $event->inventoryItem->reorder_point) {
            event(new LowStockDetected($event->inventoryItem, ...));
            
            // Auto-create purchase order draft
            $this->purchaseOrderService->createDraftFromReorder($event->inventoryItem);
        }
    }
}

// App\Listeners\Inventory\SendExpiryNotifications
class SendExpiryNotifications
{
    public function handle(BatchExpiryWarning $event)
    {
        $this->notificationService->send(
            $event->batch->tenant->managers,
            new BatchExpiringNotification($event->batch)
        );
    }
}

// App\Listeners\Inventory\InvalidateProductStockCache
class InvalidateProductStockCache
{
    public function handle(StockLevelChanged $event)
    {
        // Clear cache for all products using this component
        $affectedProducts = $this->getProductsUsingComponent($event->inventoryItem);
        foreach ($affectedProducts as $product) {
            Cache::tags(['product-stock', "product-{$product->id}"])->flush();
        }
    }
}
```

---

## 🎯 PART 4: WOW FEATURES (VALUE DIFFERENTIATORS)

### 4.1 Predictive Purchase Orders

**Feature Goal:** AI-powered stock forecasting with automatic PO generation

**Algorithm:**

```
1. Daily Consumption Rate = (Total usage last 30 days) / 30
2. Days Until Stockout = Current Stock / Daily Consumption Rate
3. Order Point = (Days Until Stockout - Supplier Lead Time) <= Safety Margin
4. If Order Point triggered:
   a. Calculate optimal order quantity (EOQ or reorder_quantity)
   b. Create draft Purchase Order
   c. Send notification to procurement manager
```

**Implementation:**

```php
// App\Jobs\Inventory\ForecastStockJob (Scheduled Daily)
class ForecastStockJob implements ShouldQueue
{
    public function handle()
    {
        $tenants = Tenant::active()->get();
        
        foreach ($tenants as $tenant) {
            $this->processTenant($tenant);
        }
    }
    
    private function processTenant(Tenant $tenant)
    {
        // Get all active inventory items
        $items = InventoryItem::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereNotNull('reorder_point')
            ->get();
        
        foreach ($items as $item) {
            // Calculate consumption
            $consumption = $this->calculateDailyConsumption($item);
            
            if ($consumption <= 0) continue;
            
            // Predict stockout
            $daysUntilStockout = $item->available_stock / $consumption;
            
            // Get supplier lead time
            $leadTime = $item->primarySupplier?->lead_time_days ?? 7;
            
            // Safety margin from tenant settings
            $safetyMargin = $tenant->settings['inventory_safety_margin_days'] ?? 7;
            
            // Trigger condition
            if (($daysUntilStockout - $leadTime) <= $safetyMargin) {
                $this->createPredictivePurchaseOrder($item, $consumption, $daysUntilStockout);
            }
        }
    }
    
    private function calculateDailyConsumption(InventoryItem $item): float
    {
        // Get transactions from last 30 days
        $thirtyDaysAgo = now()->subDays(30);
        
        $totalUsed = InventoryTransaction::where('inventory_item_id', $item->id)
            ->whereIn('transaction_type', ['sale_deduction', 'production_input'])
            ->where('transaction_date', '>=', $thirtyDaysAgo)
            ->sum('quantity');
        
        return abs($totalUsed) / 30;
    }
    
    private function createPredictivePurchaseOrder(
        InventoryItem $item, 
        float $dailyConsumption,
        float $daysUntilStockout
    ): void {
        // Calculate optimal order quantity
        $leadTime = $item->primarySupplier?->lead_time_days ?? 7;
        $safetyMargin = 7;
        
        // Order enough to cover: (lead time + safety margin) worth of consumption
        $recommendedQuantity = ceil($dailyConsumption * ($leadTime + $safetyMargin * 2));
        
        // Use reorder_quantity if set, otherwise use calculated
        $orderQuantity = $item->reorder_quantity ?? $recommendedQuantity;
        
        // Create draft PO
        PurchaseOrder::create([
            'tenant_id' => $item->tenant_id,
            'supplier_id' => $item->primary_supplier_id,
            'status' => 'draft',
            'type' => 'predictive',
            'items' => [
                [
                    'inventory_item_id' => $item->id,
                    'quantity' => $orderQuantity,
                    'unit_price' => $item->last_purchase_price,
                ]
            ],
            'notes' => "Auto-generated: Stock will run out in {$daysUntilStockout} days. Daily consumption: {$dailyConsumption} {$item->unit_of_measurement}.",
            'predicted_stockout_date' => now()->addDays($daysUntilStockout),
        ]);
        
        // Send notification
        event(new PredictivePurchaseOrderCreated($item, $orderQuantity));
    }
}
```

### 4.2 Menu Engineering Matrix (BCG Matrix)

**Feature Goal:** Visual profitability analysis using Boston Consulting Group matrix

**Quadrants:**
- **Stars:** High sales + High margin → Promote aggressively
- **Plow Horses:** High sales + Low margin → Optimize costs or increase price
- **Puzzles:** Low sales + High margin → Increase marketing
- **Dogs:** Low sales + Low margin → Consider removing

**Implementation:**

```php
// API Endpoint: GET /api/v1/tenants/{tenantId}/analytics/menu-engineering
class MenuEngineeringController
{
    public function getMatrix(string $tenantId)
    {
        $startDate = request('start_date', now()->subDays(30));
        $endDate = request('end_date', now());
        
        $products = Product::where('tenant_id', $tenantId)
            ->where('inventory_management_type', 'composite')
            ->with(['activeRecipe.components.inventoryItem'])
            ->get();
        
        $data = [];
        
        foreach ($products as $product) {
            // Calculate sales metrics
            $sales = $this->getProductSales($product, $startDate, $endDate);
            
            // Calculate COGS
            $cogs = $this->calculateCOGS($product);
            
            // Calculate metrics
            $revenue = $sales['total_quantity'] * $product->selling_price;
            $grossProfit = $revenue - ($sales['total_quantity'] * $cogs);
            $marginPercentage = $revenue > 0 ? ($grossProfit / $revenue) * 100 : 0;
            
            $data[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'units_sold' => $sales['total_quantity'],
                'revenue' => $revenue,
                'cogs' => $cogs,
                'gross_profit' => $grossProfit,
                'margin_percentage' => round($marginPercentage, 2),
                'quadrant' => $this->determineQuadrant($sales['total_quantity'], $marginPercentage),
            ];
        }
        
        // Calculate median for quadrant division
        $medianSales = $this->median(array_column($data, 'units_sold'));
        $medianMargin = $this->median(array_column($data, 'margin_percentage'));
        
        return response()->json([
            'data' => $data,
            'thresholds' => [
                'median_sales' => $medianSales,
                'median_margin' => $medianMargin,
            ],
            'recommendations' => $this->generateRecommendations($data),
        ]);
    }
    
    private function determineQuadrant(int $unitsSold, float $marginPercentage): string
    {
        $medianSales = 100; // From calculation
        $medianMargin = 30; // From calculation
        
        if ($unitsSold >= $medianSales && $marginPercentage >= $medianMargin) {
            return 'star'; // High sales, High margin
        } elseif ($unitsSold >= $medianSales && $marginPercentage < $medianMargin) {
            return 'plow_horse'; // High sales, Low margin
        } elseif ($unitsSold < $medianSales && $marginPercentage >= $medianMargin) {
            return 'puzzle'; // Low sales, High margin
        } else {
            return 'dog'; // Low sales, Low margin
        }
    }
    
    private function generateRecommendations(array $data): array
    {
        $recommendations = [];
        
        foreach ($data as $item) {
            $suggestion = match($item['quadrant']) {
                'star' => 'Promote heavily! High sales and high profit. Consider increasing production capacity.',
                'plow_horse' => 'Popular but low margin. Try to reduce costs or increase price slightly.',
                'puzzle' => 'High margin but low sales. Increase marketing or offer as "Special of the Day".',
                'dog' => 'Low sales and low profit. Consider removing from menu or complete recipe redesign.',
            };
            
            $recommendations[] = [
                'product_name' => $item['product_name'],
                'quadrant' => $item['quadrant'],
                'suggestion' => $suggestion,
            ];
        }
        
        return $recommendations;
    }
}
```

### 4.3 Waste Tracking & COGS Intelligence

**Feature Goal:** Capture hidden costs from waste/spoilage

**Flow:**
1. Staff logs waste via mobile/POS: "500ml milk spilled"
2. System deducts inventory
3. Creates accounting journal entry: Debit "Waste Expense", Credit "Inventory"
4. Updates COGS in P&L report
5. Sends alert if waste exceeds threshold

**Implementation:**

```php
// POST /api/v1/tenants/{tenantId}/inventory/waste-logs
class WasteLogController
{
    public function create(string $tenantId, WasteLogRequest $request)
    {
        DB::transaction(function () use ($request) {
            $item = InventoryItem::findOrFail($request->inventory_item_id);
            
            // Create waste log
            $wasteLog = WasteLog::create([
                'tenant_id' => $request->tenant_id,
                'inventory_item_id' => $item->id,
                'quantity_wasted' => $request->quantity,
                'reason' => $request->reason,
                'cost_impact' => $request->quantity * $item->cost_per_unit,
                'logged_by' => auth()->id(),
            ]);
            
            // Deduct inventory
            $oldStock = $item->current_stock;
            $item->current_stock -= $request->quantity;
            $item->save();
            
            // Create transaction log
            InventoryTransaction::create([
                'tenant_id' => $request->tenant_id,
                'inventory_item_id' => $item->id,
                'transaction_type' => 'waste',
                'quantity' => -$request->quantity,
                'stock_before' => $oldStock,
                'stock_after' => $item->current_stock,
                'unit_cost' => $item->cost_per_unit,
                'reference_type' => 'WasteLog',
                'reference_id' => $wasteLog->id,
                'user_id' => auth()->id(),
                'reason' => $request->reason,
            ]);
            
            // Create accounting entry (if accounting module exists)
            if (class_exists(JournalEntry::class)) {
                JournalEntry::create([
                    'tenant_id' => $request->tenant_id,
                    'date' => now(),
                    'description' => "Waste: {$item->name}",
                    'entries' => [
                        ['account' => 'Waste Expense', 'debit' => $wasteLog->cost_impact],
                        ['account' => 'Inventory', 'credit' => $wasteLog->cost_impact],
                    ],
                ]);
            }
            
            // Alert if waste is excessive
            $this->checkWasteThreshold($item, $request->quantity);
            
            return response()->json(['success' => true, 'waste_log' => $wasteLog]);
        });
    }
    
    private function checkWasteThreshold(InventoryItem $item, float $quantity): void
    {
        $monthlyWaste = WasteLog::where('inventory_item_id', $item->id)
            ->where('created_at', '>=', now()->subMonth())
            ->sum('quantity_wasted');
        
        $threshold = $item->reorder_quantity * 0.05; // 5% of reorder quantity
        
        if ($monthlyWaste >= $threshold) {
            event(new ExcessiveWasteDetected($item, $monthlyWaste));
        }
    }
}
```

### 4.4 Recipe Costing Simulator

**Feature Goal:** "What-if" analysis for price changes

**UI Flow:**
1. User opens simulator page
2. Sees list of all inventory items with current costs
3. Changes cost of "Coffee Beans" from Rp 120k to Rp 150k
4. System instantly shows impact on all products using coffee
5. Suggests new selling prices to maintain margins

**Implementation (Frontend-heavy):**

```typescript
// Frontend: RecipeCostingSimulator.tsx
function RecipeCostingSimulator() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [simulatedCosts, setSimulatedCosts] = useState<Record<string, number>>({});
  
  // Calculate impact when cost changes
  const handleCostChange = (itemId: string, newCost: number) => {
    setSimulatedCosts(prev => ({ ...prev, [itemId]: newCost }));
    
    // Find all affected products
    const affectedProducts = findProductsUsingItem(itemId);
    
    // Recalculate COGS for each product
    const impacts = affectedProducts.map(product => {
      const recipe = recipes.find(r => r.product_id === product.id);
      const oldCOGS = calculateCOGS(recipe, inventoryItems);
      const newCOGS = calculateCOGS(recipe, inventoryItems, simulatedCosts);
      
      const oldMargin = ((product.selling_price - oldCOGS) / product.selling_price) * 100;
      const newMargin = ((product.selling_price - newCOGS) / product.selling_price) * 100;
      
      // Calculate recommended new price to maintain old margin
      const recommendedPrice = newCOGS / (1 - oldMargin / 100);
      
      return {
        product,
        oldCOGS,
        newCOGS,
        oldMargin,
        newMargin,
        marginDrop: oldMargin - newMargin,
        recommendedPrice: Math.ceil(recommendedPrice / 1000) * 1000, // Round to nearest 1000
      };
    });
    
    return impacts;
  };
  
  return (
    <div className="simulator-container">
      <div className="input-section">
        <h2>Adjust Ingredient Costs</h2>
        {inventoryItems.map(item => (
          <div key={item.id} className="cost-input">
            <span>{item.name}</span>
            <Input
              type="number"
              value={simulatedCosts[item.id] ?? item.cost_per_unit}
              onChange={(e) => handleCostChange(item.id, parseFloat(e.target.value))}
            />
            <span>{item.unit_of_measurement}</span>
          </div>
        ))}
      </div>
      
      <div className="results-section">
        <h2>Impact Analysis</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Old Margin</TableHead>
              <TableHead>New Margin</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Recommended Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {impacts.map(impact => (
              <TableRow key={impact.product.id}>
                <TableCell>{impact.product.name}</TableCell>
                <TableCell>Rp {formatNumber(impact.product.selling_price)}</TableCell>
                <TableCell>{impact.oldMargin.toFixed(1)}%</TableCell>
                <TableCell className={impact.newMargin < impact.oldMargin ? 'text-red-500' : ''}>
                  {impact.newMargin.toFixed(1)}%
                </TableCell>
                <TableCell>
                  {impact.marginDrop > 5 ? (
                    <Badge variant="destructive">-{impact.marginDrop.toFixed(1)}%</Badge>
                  ) : (
                    <Badge variant="warning">-{impact.marginDrop.toFixed(1)}%</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-bold text-primary">
                    Rp {formatNumber(impact.recommendedPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    (+{(((impact.recommendedPrice - impact.product.selling_price) / impact.product.selling_price) * 100).toFixed(1)}%)
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

---

## 🚦 PART 5: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Sprint 1-2) - 2 Weeks
**Goal:** Core database and basic CRUD

**Deliverables:**
- ✅ All migrations created and tested
- ✅ Eloquent models with relationships
- ✅ Basic CRUD for `inventory_items`
- ✅ Basic CRUD for `recipes` and `recipe_components`
- ✅ OpenAPI spec updated
- ✅ Permission setup (inventory.view, inventory.create, etc.)

**Success Criteria:**
- User can create inventory items
- User can create recipes
- Unit tests pass

---

### Phase 2: Core BOM Engine (Sprint 3-4) - 2 Weeks
**Goal:** Stock calculation and auto-deduction

**Deliverables:**
- ✅ `InventoryCalculationService` implemented
- ✅ `InventoryDeductionService` implemented
- ✅ API endpoint: `GET /products/{id}/available-quantity`
- ✅ Modified order creation to deduct recipe components
- ✅ Transaction logging
- ✅ Frontend: Recipe builder UI
- ✅ Frontend: Real-time stock display in POS

**Success Criteria:**
- System correctly calculates max producible quantity
- Order creation correctly deducts recipe components
- Transaction logs are accurate
- POS shows correct available quantity

---

### Phase 3: Advanced Tracking (Sprint 5-6) - 2 Weeks
**Goal:** Batch tracking and expiry management

**Deliverables:**
- ✅ Batch management CRUD
- ✅ FIFO/FEFO deduction logic
- ✅ Expiry date warnings (scheduled job)
- ✅ Multi-level BOM explosion
- ✅ Frontend: Batch management UI
- ✅ Frontend: Expiry alert dashboard

**Success Criteria:**
- Perishable items correctly tracked by batch
- FEFO deduction works as expected
- Expiry warnings sent 7 days before expiry

---

### Phase 4: WOW Features - Predictive (Sprint 7) - 1 Week
**Goal:** Predictive purchasing

**Deliverables:**
- ✅ `suppliers` table and CRUD
- ✅ `purchase_orders` table and CRUD
- ✅ `ForecastStockJob` scheduled job
- ✅ Frontend: Supplier management
- ✅ Frontend: Purchase order management
- ✅ Frontend: Predictive alerts dashboard

**Success Criteria:**
- System correctly predicts stockouts
- Draft POs are created automatically
- Notifications sent to managers

---

### Phase 5: WOW Features - Analytics (Sprint 8) - 1 Week
**Goal:** Menu engineering and waste tracking

**Deliverables:**
- ✅ Menu engineering endpoint and logic
- ✅ Waste tracking CRUD
- ✅ Frontend: Menu engineering matrix (chart)
- ✅ Frontend: Waste logging UI
- ✅ Frontend: Waste reports

**Success Criteria:**
- BCG matrix displays correctly
- Recommendations are accurate
- Waste logs update inventory correctly

---

### Phase 6: Polish & Simulator (Sprint 9) - 1 Week
**Goal:** Recipe costing simulator and optimizations

**Deliverables:**
- ✅ Frontend: Recipe costing simulator
- ✅ Performance optimizations (caching, indexing)
- ✅ Bulk operations (import/export recipes)
- ✅ Mobile-responsive inventory management
- ✅ Documentation updates

**Success Criteria:**
- Simulator provides instant feedback
- System performs well under load
- Documentation is complete

---

### Phase 7: Testing & QA (Sprint 10) - 1 Week
**Goal:** Comprehensive testing

**Deliverables:**
- ✅ Unit tests for all services
- ✅ Feature tests for all endpoints
- ✅ Integration tests for order flow
- ✅ Performance tests
- ✅ User acceptance testing

**Success Criteria:**
- 90%+ test coverage
- All critical paths tested
- No P0/P1 bugs

---

## 📊 PART 6: SUCCESS METRICS

### Technical Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **API Response Time** | <200ms | `/products/{id}/available-quantity` avg response |
| **Stock Calculation Accuracy** | 100% | Audit: calculated vs manual count |
| **Transaction Logging** | 100% | All stock movements logged |
| **Test Coverage** | >90% | PHPUnit coverage report |
| **Zero Data Loss** | 100% | Transaction integrity checks |

### Business Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| **Pilot Customer Adoption** | 5 customers | Month 1-2 |
| **Feature Satisfaction Score** | >8/10 | Survey after 30 days |
| **Pricing Uplift** | 2.5x | Rp 200k → Rp 500k |
| **Churn Reduction** | -30% | Due to complexity/lock-in |
| **New Market Penetration** | 20+ F&B leads | Month 3-6 |

---

## ⚠️ PART 7: RISKS & MITIGATION

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Performance degradation** | Medium | High | Implement caching, optimize queries, add indexes |
| **Data consistency issues** | Low | Critical | Use DB transactions, add constraints, extensive testing |
| **Complex UI/UX** | High | Medium | User testing, iterative design, comprehensive onboarding |
| **Migration complexity** | Medium | High | Extensive testing, rollback plan, phased rollout |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Market rejection** | Low | High | Pilot with 3-5 friendly customers, iterate based on feedback |
| **Feature complexity** | Medium | Medium | Comprehensive documentation, video tutorials, in-app guidance |
| **Competitive response** | Medium | Medium | Move fast, build moat with advanced features |
| **Support burden** | High | Medium | Self-service documentation, automated diagnostics, training |

---

## 🎓 PART 8: TRAINING & DOCUMENTATION

### User Documentation

1. **Quick Start Guide:** "Setting up your first recipe in 5 minutes"
2. **Video Tutorials:**
   - Creating inventory items
   - Building recipes
   - Understanding stock calculations
   - Using the menu engineering matrix
3. **Use Case Walkthroughs:**
   - Coffee shop: Managing beans, milk, syrups
   - Bakery: Multi-level BOM for cakes
   - Craft business: Material tracking
4. **FAQ & Troubleshooting**

### Developer Documentation

1. **API Documentation:** Complete OpenAPI spec
2. **Architecture Diagrams:** Database ERD, service layer diagram
3. **Code Examples:** Recipe creation, stock calculation
4. **Testing Guide:** How to write tests for inventory features

---

## 🏁 CONCLUSION

This BOM Engine represents a **strategic transformation** of POSMID from a basic POS to an **Intelligent Operations Platform**. The comprehensive design balances:

- ✅ **Technical feasibility** (builds on existing architecture)
- ✅ **Market differentiation** (ERP-grade features at POS pricing)
- ✅ **Multi-industry flexibility** (F&B, manufacturing, crafts)
- ✅ **Scalability** (performance, multi-tenant)
- ✅ **Business viability** (2.5-5x pricing uplift, defensible moat)

**Recommended Next Steps:**

1. ✅ **Approve architecture** (this document)
2. ⏳ **Review merged plan** (combining this with original ideas)
3. ⏳ **Prioritize Phase 1** (foundation work)
4. ⏳ **Recruit pilot customers** (3-5 friendly businesses)
5. ⏳ **Begin Sprint 1** (database migrations)

---

**Document Status:** ✅ READY FOR REVIEW  
**Next Review Date:** After comparison with original plan  
**Approval Required From:** Product Owner, Tech Lead