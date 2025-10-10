<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Src\Pms\Core\Services\MaterialService;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Product;

/**
 * MaterialServiceTest
 * 
 * Unit tests for MaterialService
 * Tests CRUD operations, stock management, and business logic
 *
 * @package Tests\Unit
 */
class MaterialServiceTest extends TestCase
{
    use RefreshDatabase;

    protected MaterialService $service;
    protected Tenant $tenant;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new MaterialService();

        // Create test tenant
        $this->tenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
        ]);

        // Create test user
        $this->user = User::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);
    }

    // ========================================
    // Test: Create Material
    // ========================================

    /** @test */
    public function it_can_create_material_with_valid_data()
    {
        $data = [
            'name' => 'Flour',
            'sku' => 'FLOUR-001',
            'description' => 'All-purpose flour',
            'category' => 'Dry Goods',
            'unit' => 'kg',
            'stock_quantity' => 100.5,
            'reorder_level' => 20,
            'unit_cost' => 5.50,
            'supplier' => 'Supplier ABC',
        ];

        $material = $this->service->create($this->tenant->id, $data);

        $this->assertInstanceOf(Material::class, $material);
        $this->assertEquals('Flour', $material->name);
        $this->assertEquals('FLOUR-001', $material->sku);
        $this->assertEquals($this->tenant->id, $material->tenant_id);
        $this->assertDatabaseHas('materials', [
            'name' => 'Flour',
            'tenant_id' => $this->tenant->id,
        ]);
    }

    /** @test */
    public function it_enforces_required_fields_on_create()
    {
        $this->expectException(ValidationException::class);

        $data = [
            // Missing required 'name' and 'unit'
            'sku' => 'TEST-001',
        ];

        $this->service->create($this->tenant->id, $data);
    }

    /** @test */
    public function it_enforces_valid_unit_enum_on_create()
    {
        $this->expectException(ValidationException::class);

        $data = [
            'name' => 'Test Material',
            'unit' => 'invalid_unit', // Invalid
        ];

        $this->service->create($this->tenant->id, $data);
    }

    /** @test */
    public function it_enforces_unique_sku_per_tenant_on_create()
    {
        // Create first material
        $this->service->create($this->tenant->id, [
            'name' => 'Material 1',
            'sku' => 'UNIQUE-SKU',
            'unit' => 'kg',
        ]);

        // Try to create second with same SKU in same tenant
        $this->expectException(ValidationException::class);

        $this->service->create($this->tenant->id, [
            'name' => 'Material 2',
            'sku' => 'UNIQUE-SKU',
            'unit' => 'kg',
        ]);
    }

    /** @test */
    public function it_allows_same_sku_in_different_tenants()
    {
        $tenant2 = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Second Tenant',
            'slug' => 'second-tenant',
        ]);

        // Create material in first tenant
        $material1 = $this->service->create($this->tenant->id, [
            'name' => 'Material 1',
            'sku' => 'SHARED-SKU',
            'unit' => 'kg',
        ]);

        // Create material with same SKU in second tenant (should succeed)
        $material2 = $this->service->create($tenant2->id, [
            'name' => 'Material 2',
            'sku' => 'SHARED-SKU',
            'unit' => 'L',
        ]);

        $this->assertNotEquals($material1->id, $material2->id);
        $this->assertEquals('SHARED-SKU', $material1->sku);
        $this->assertEquals('SHARED-SKU', $material2->sku);
    }

    // ========================================
    // Test: Read Material
    // ========================================

    /** @test */
    public function it_can_get_material_by_id()
    {
        $created = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Sugar',
            'unit' => 'kg',
            'stock_quantity' => 50,
            'reorder_level' => 10,
            'unit_cost' => 2.5,
        ]);

        $material = $this->service->getById($created->id, $this->tenant->id);

        $this->assertInstanceOf(Material::class, $material);
        $this->assertEquals($created->id, $material->id);
        $this->assertEquals('Sugar', $material->name);
    }

    /** @test */
    public function it_throws_exception_when_material_not_found()
    {
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        $fakeId = \Illuminate\Support\Str::uuid();
        $this->service->getById($fakeId, $this->tenant->id);
    }

    /** @test */
    public function it_respects_tenant_isolation_on_get_by_id()
    {
        $tenant2 = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Other Tenant',
            'slug' => 'other-tenant',
        ]);

        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $tenant2->id,
            'name' => 'Other Tenant Material',
            'unit' => 'kg',
        ]);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        // Try to access from wrong tenant
        $this->service->getById($material->id, $this->tenant->id);
    }

    /** @test */
    public function it_can_get_all_materials_for_tenant_with_pagination()
    {
        // Create materials
        for ($i = 1; $i <= 25; $i++) {
            Material::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $this->tenant->id,
                'name' => "Material {$i}",
                'unit' => 'kg',
                'stock_quantity' => $i * 10,
                'reorder_level' => 5,
            ]);
        }

        $paginated = $this->service->getAllForTenant($this->tenant->id, [], 10);

        $this->assertEquals(10, $paginated->perPage());
        $this->assertEquals(25, $paginated->total());
        $this->assertEquals(3, $paginated->lastPage());
    }

    /** @test */
    public function it_can_filter_materials_by_search_term()
    {
        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Tomato Sauce',
            'sku' => 'TOM-001',
            'unit' => 'L',
        ]);

        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Olive Oil',
            'sku' => 'OIL-001',
            'unit' => 'L',
        ]);

        $results = $this->service->getAllForTenant($this->tenant->id, ['search' => 'Tomato'], 10);

        $this->assertEquals(1, $results->total());
        $this->assertEquals('Tomato Sauce', $results->first()->name);
    }

    /** @test */
    public function it_can_filter_materials_by_category()
    {
        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Material A',
            'category' => 'Beverages',
            'unit' => 'L',
        ]);

        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Material B',
            'category' => 'Dry Goods',
            'unit' => 'kg',
        ]);

        $results = $this->service->getAllForTenant($this->tenant->id, ['category' => 'Beverages'], 10);

        $this->assertEquals(1, $results->total());
        $this->assertEquals('Beverages', $results->first()->category);
    }

    /** @test */
    public function it_can_filter_materials_by_stock_status()
    {
        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Stock Material',
            'unit' => 'kg',
            'stock_quantity' => 5,
            'reorder_level' => 10,
        ]);

        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Normal Stock Material',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'reorder_level' => 10,
        ]);

        $results = $this->service->getAllForTenant($this->tenant->id, ['status' => 'low_stock'], 10);

        $this->assertEquals(1, $results->total());
        $this->assertEquals('Low Stock Material', $results->first()->name);
    }

    // ========================================
    // Test: Update Material
    // ========================================

    /** @test */
    public function it_can_update_material()
    {
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Original Name',
            'unit' => 'kg',
            'unit_cost' => 5.0,
        ]);

        $updated = $this->service->update($material->id, $this->tenant->id, [
            'name' => 'Updated Name',
            'unit_cost' => 7.5,
        ]);

        $this->assertEquals('Updated Name', $updated->name);
        $this->assertEquals(7.5, (float) $updated->unit_cost);
    }

    // ========================================
    // Test: Delete Material
    // ========================================

    /** @test */
    public function it_can_delete_material_not_in_active_recipes()
    {
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Deletable Material',
            'unit' => 'kg',
        ]);

        $result = $this->service->delete($material->id, $this->tenant->id);

        $this->assertTrue($result);
        $this->assertSoftDeleted('materials', ['id' => $material->id]);
    }

    /** @test */
    public function it_prevents_deletion_of_material_used_in_active_recipe()
    {
        // Create product
        $product = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'sku' => 'PROD-001',
            'price' => 100,
        ]);

        // Create material
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Used Material',
            'unit' => 'kg',
            'stock_quantity' => 100,
        ]);

        // Create active recipe
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'name' => 'Active Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        // Add material to recipe
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 1,
            'unit' => 'kg',
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Cannot delete material');

        $this->service->delete($material->id, $this->tenant->id);
    }

    // ========================================
    // Test: Stock Adjustment
    // ========================================

    /** @test */
    public function it_can_adjust_stock_and_create_transaction()
    {
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Stock Material',
            'unit' => 'kg',
            'stock_quantity' => 50,
        ]);

        $updated = $this->service->adjustStock(
            $material->id,
            $this->tenant->id,
            'restock',
            25,
            'purchase',
            'Purchase order #123',
            $this->user
        );

        $this->assertEquals(75, (float) $updated->stock_quantity);
        $this->assertCount(1, $updated->transactions);
    }

    /** @test */
    public function it_prevents_negative_stock_on_adjustment()
    {
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Stock Material',
            'unit' => 'kg',
            'stock_quantity' => 10,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Insufficient stock');

        $this->service->adjustStock(
            $material->id,
            $this->tenant->id,
            'deduction',
            20, // More than available
            'production',
            null,
            $this->user
        );
    }

    // ========================================
    // Test: Bulk Create
    // ========================================

    /** @test */
    public function it_can_bulk_create_materials()
    {
        $materials = [
            ['name' => 'Material 1', 'unit' => 'kg'],
            ['name' => 'Material 2', 'unit' => 'L'],
            ['name' => 'Material 3', 'unit' => 'pcs'],
        ];

        $result = $this->service->bulkCreate($this->tenant->id, $materials);

        $this->assertCount(3, $result['created']);
        $this->assertCount(0, $result['errors']);
    }

    /** @test */
    public function it_handles_partial_failures_in_bulk_create()
    {
        $materials = [
            ['name' => 'Valid Material', 'unit' => 'kg'],
            ['name' => 'Invalid', 'unit' => 'invalid_unit'], // Invalid
            ['name' => 'Another Valid', 'unit' => 'L'],
        ];

        $result = $this->service->bulkCreate($this->tenant->id, $materials);

        $this->assertCount(2, $result['created']);
        $this->assertCount(1, $result['errors']);
        $this->assertArrayHasKey(1, $result['errors']); // Index 1 failed
    }

    // ========================================
    // Test: Low Stock & Categories
    // ========================================

    /** @test */
    public function it_can_get_low_stock_materials()
    {
        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Stock',
            'unit' => 'kg',
            'stock_quantity' => 5,
            'reorder_level' => 10,
        ]);

        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Normal Stock',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'reorder_level' => 10,
        ]);

        $lowStock = $this->service->getLowStock($this->tenant->id);

        $this->assertCount(1, $lowStock);
        $this->assertEquals('Low Stock', $lowStock->first()->name);
    }

    /** @test */
    public function it_can_get_unique_categories()
    {
        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'M1',
            'category' => 'Beverages',
            'unit' => 'L',
        ]);

        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'M2',
            'category' => 'Beverages',
            'unit' => 'L',
        ]);

        Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'M3',
            'category' => 'Dry Goods',
            'unit' => 'kg',
        ]);

        $categories = $this->service->getCategories($this->tenant->id);

        $this->assertCount(2, $categories);
        $this->assertContains('Beverages', $categories);
        $this->assertContains('Dry Goods', $categories);
    }
}

