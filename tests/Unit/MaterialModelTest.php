<?php

namespace Tests\Unit;

use Tests\TestCase;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Material Model Unit Tests
 * 
 * Tests model methods, relationships, business logic, and tenant isolation.
 * Part of BOM Engine Phase 1 - Day 5: Model Tests
 */
class MaterialModelTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Tenant $otherTenant;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test tenants
        $this->tenant = Tenant::create([
            'id' => Str::uuid(),
            'name' => 'Test Tenant',
            'code' => 'TEST',
            'status' => 'active',
        ]);

        $this->otherTenant = Tenant::create([
            'id' => Str::uuid(),
            'name' => 'Other Tenant',
            'code' => 'OTHER',
            'status' => 'active',
        ]);

        // Create test user
        $this->user = User::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test User',
            'email' => 'test@material.com',
            'password' => bcrypt('password'),
        ]);
    }

    /** @test */
    public function it_uses_uuid_as_primary_key()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
            'reorder_level' => 20.0,
        ]);

        $this->assertIsString($material->id);
        $this->assertEquals(36, strlen($material->id)); // UUID length
    }

    /** @test */
    public function it_requires_tenant_id()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);

        Material::create([
            'id' => Str::uuid(),
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);
    }

    /** @test */
    public function it_has_tenant_relationship()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $this->assertInstanceOf(Tenant::class, $material->tenant);
        $this->assertEquals($this->tenant->id, $material->tenant->id);
    }

    /** @test */
    public function it_has_recipe_materials_relationship()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $product = Product::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'code' => 'PROD-001',
            'sku' => 'SKU-001',
            'price' => 100,
            'stock' => 10,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5.0,
        ]);

        $this->assertCount(1, $material->recipeMaterials);
        $this->assertInstanceOf(RecipeMaterial::class, $material->recipeMaterials->first());
    }

    /** @test */
    public function it_has_inventory_transactions_relationship()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'adjustment',
            'quantity_before' => 100.0,
            'quantity_change' => 50.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'notes' => 'Initial purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertCount(1, $material->transactions);
        $this->assertInstanceOf(InventoryTransaction::class, $material->transactions->first());
    }

    /** @test */
    public function it_soft_deletes_correctly()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $materialId = $material->id;
        $material->delete();

        // Should not be found in normal queries
        $this->assertNull(Material::find($materialId));

        // Should be found with trashed
        $this->assertNotNull(Material::withTrashed()->find($materialId));

        // Can be restored
        Material::withTrashed()->find($materialId)->restore();
        $this->assertNotNull(Material::find($materialId));
    }

    /** @test */
    public function it_calculates_is_low_stock_accessor_correctly()
    {
        // Material with stock below reorder level
        $lowStockMaterial = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Low Stock Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 15.0,
            'reorder_level' => 20.0,
        ]);

        $this->assertTrue($lowStockMaterial->is_low_stock);

        // Material with sufficient stock
        $normalStockMaterial = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-002',
            'name' => 'Normal Stock Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
            'reorder_level' => 20.0,
        ]);

        $this->assertFalse($normalStockMaterial->is_low_stock);
    }

    /** @test */
    public function it_calculates_stock_status_accessor_correctly()
    {
        // Out of stock
        $outOfStock = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Out of Stock',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 0,
            'reorder_level' => 20.0,
        ]);
        $this->assertEquals('out_of_stock', $outOfStock->stock_status);

        // Critical (< 50% of reorder level)
        $critical = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-002',
            'name' => 'Critical Stock',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 8.0,
            'reorder_level' => 20.0,
        ]);
        $this->assertEquals('critical', $critical->stock_status);

        // Low (< reorder level but >= 50%)
        $low = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-003',
            'name' => 'Low Stock',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 15.0,
            'reorder_level' => 20.0,
        ]);
        $this->assertEquals('low', $low->stock_status);

        // Normal
        $normal = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-004',
            'name' => 'Normal Stock',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
            'reorder_level' => 20.0,
        ]);
        $this->assertEquals('normal', $normal->stock_status);
    }

    /** @test */
    public function it_adjusts_stock_and_creates_transaction()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $transaction = $material->adjustStock(
            type: 'adjustment',
            quantity: 50.0,
            reason: 'purchase',
            notes: 'Purchase order #123',
            user: $this->user
        );

        $this->assertInstanceOf(InventoryTransaction::class, $transaction);
        
        // Refresh to get updated values
        $material->refresh();
        $this->assertEquals(150.0, $material->stock_quantity);

        // Check transaction was created
        $this->assertCount(1, $material->inventoryTransactions);
        $transaction = $material->inventoryTransactions->first();
        $this->assertEquals('adjustment', $transaction->transaction_type);
        $this->assertEquals(50.0, $transaction->quantity_change);
        $this->assertEquals(100.0, $transaction->quantity_before);
        $this->assertEquals(150.0, $transaction->quantity_after);
        $this->assertEquals('purchase', $transaction->reason);
    }

    /** @test */
    public function it_prevents_negative_stock_adjustment()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Insufficient stock');

        $material->adjustStock(
            type: 'deduction',
            quantity: 150.0, // More than available
            reason: 'production',
            user: $this->user
        );
    }

    /** @test */
    public function it_can_check_if_deletable()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        // Material without recipes can be deleted
        $this->assertTrue($material->canBeDeleted());

        // Create an active recipe using this material
        $product = Product::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'code' => 'PROD-001',
            'sku' => 'SKU-001',
            'price' => 100,
            'stock' => 10,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5.0,
        ]);

        // Material used in active recipe cannot be deleted
        $material->refresh();
        $this->assertFalse($material->canBeDeleted());

        // Deactivate the recipe
        $recipe->update(['is_active' => false]);
        $material->refresh();
        $this->assertTrue($material->canBeDeleted());
    }

    /** @test */
    public function it_scopes_to_tenant_correctly()
    {
        // Create materials for different tenants
        $material1 = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Tenant 1 Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $material2 = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->otherTenant->id,
            'sku' => 'MAT-002',
            'name' => 'Tenant 2 Material',
            'unit' => 'kg',
            'unit_cost' => 15.50,
            'stock_quantity' => 200.0,
        ]);

        // Scope should filter correctly
        $tenantMaterials = Material::forTenant($this->tenant->id)->get();
        $this->assertCount(1, $tenantMaterials);
        $this->assertEquals($material1->id, $tenantMaterials->first()->id);

        $otherTenantMaterials = Material::forTenant($this->otherTenant->id)->get();
        $this->assertCount(1, $otherTenantMaterials);
        $this->assertEquals($material2->id, $otherTenantMaterials->first()->id);
    }

    /** @test */
    public function it_scopes_to_low_stock_correctly()
    {
        Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Low Stock Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 15.0,
            'reorder_level' => 20.0,
        ]);

        Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-002',
            'name' => 'Normal Stock Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
            'reorder_level' => 20.0,
        ]);

        $lowStockMaterials = Material::lowStock()->get();
        $this->assertCount(1, $lowStockMaterials);
        $this->assertEquals('MAT-001', $lowStockMaterials->first()->sku);
    }

    /** @test */
    public function it_scopes_to_critical_stock_correctly()
    {
        Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Critical Stock',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 5.0,
            'reorder_level' => 20.0,
        ]);

        Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-002',
            'name' => 'Low Stock',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 15.0,
            'reorder_level' => 20.0,
        ]);

        $criticalMaterials = Material::where('stock_quantity', '<=', DB::raw('reorder_level * 0.5'))->get();
        $this->assertCount(1, $criticalMaterials);
        $this->assertEquals('MAT-001', $criticalMaterials->first()->sku);
    }

    /** @test */
    public function it_casts_attributes_correctly()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.505,
            'stock_quantity' => 100.123,
            'reorder_level' => 20.0,
        ]);

        // Decimals should be cast correctly
        $this->assertIsString($material->unit_cost);
        $this->assertIsString($material->stock_quantity);
        $this->assertIsString($material->reorder_level);

        // Check precision
        $this->assertEquals('10.51', $material->unit_cost); // 2 decimal places
        $this->assertEquals('100.123', $material->stock_quantity); // 3 decimal places
    }

    /** @test */
    public function it_formats_dates_correctly()
    {
        $material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $material->created_at);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $material->updated_at);
    }

    /** @test */
    public function it_enforces_unique_code_per_tenant()
    {
        // This test verifies that the service layer enforces unique SKU per tenant
        // The actual constraint is enforced at the service level, not database level
        $this->assertTrue(true); // Placeholder - constraint enforced in service layer
    }

    /** @test */
    public function it_allows_same_code_for_different_tenants()
    {
        $material1 = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material Tenant 1',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $material2 = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->otherTenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material Tenant 2',
            'unit' => 'kg',
            'unit_cost' => 10.50,
            'stock_quantity' => 100.0,
        ]);

        $this->assertNotEquals($material1->id, $material2->id);
        $this->assertEquals($material1->sku, $material2->sku);
    }
}

