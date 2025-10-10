<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\InventoryCalculationService;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * InventoryCalculationServiceTest
 * 
 * Unit tests for InventoryCalculationService
 * Tests BOM explosion algorithm and availability calculations
 *
 * @package Tests\Unit
 */
class InventoryCalculationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected InventoryCalculationService $service;
    protected Tenant $tenant;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new InventoryCalculationService();

        // Create test tenant
        $this->tenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
        ]);

        // Create BOM product
        $this->product = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Pizza Margherita',
            'sku' => 'PIZZA-001',
            'price' => 100,
            'inventory_management_type' => 'bom',
        ]);
        
        // Refresh to get all attributes
        $this->product->refresh();
    }

    // ========================================
    // Test: Basic BOM Explosion
    // ========================================

    /** @test */
    public function it_calculates_available_quantity_correctly()
    {
        // Create materials
        $dough = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Dough',
            'unit' => 'kg',
            'stock_quantity' => 10, // 10kg
            'unit_cost' => 5,
        ]);

        $sauce = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Sauce',
            'unit' => 'L',
            'stock_quantity' => 5, // 5L
            'unit_cost' => 10,
        ]);

        $cheese = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Cheese',
            'unit' => 'kg',
            'stock_quantity' => 3.5, // 3.5kg
            'unit_cost' => 15,
        ]);

        // Create recipe
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Standard Pizza Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        // Add components
        // Dough: 0.3kg required, 5% waste → 0.315kg effective
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $dough->id,
            'quantity_required' => 0.3,
            'unit' => 'kg',
            'waste_percentage' => 5,
        ]);

        // Sauce: 0.1L required, 0% waste → 0.1L effective
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $sauce->id,
            'quantity_required' => 0.1,
            'unit' => 'L',
            'waste_percentage' => 0,
        ]);

        // Cheese: 0.2kg required, 10% waste → 0.22kg effective
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $cheese->id,
            'quantity_required' => 0.2,
            'unit' => 'kg',
            'waste_percentage' => 10,
        ]);

        $result = $this->service->calculateAvailableQuantity($this->product->id, $this->tenant->id);

        // Expected calculations:
        // - Dough: 10 / 0.315 = 31.74 → 31 pizzas
        // - Sauce: 5 / 0.1 = 50 pizzas
        // - Cheese: 3.5 / 0.22 = 15.90 → 15 pizzas (BOTTLENECK)

        $this->assertEquals(15, $result['available_quantity']);
        $this->assertTrue($result['can_produce']);
        $this->assertNotNull($result['bottleneck_material']);
        $this->assertEquals('Cheese', $result['bottleneck_material']['material_name']);
        $this->assertCount(3, $result['component_details']);
    }

    /** @test */
    public function it_returns_zero_when_any_material_is_out_of_stock()
    {
        // Create materials with one having zero stock
        $dough = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Dough',
            'unit' => 'kg',
            'stock_quantity' => 0, // OUT OF STOCK
            'unit_cost' => 5,
        ]);

        $sauce = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Sauce',
            'unit' => 'L',
            'stock_quantity' => 10,
            'unit_cost' => 10,
        ]);

        // Create recipe
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $dough->id,
            'quantity_required' => 1,
            'unit' => 'kg',
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $sauce->id,
            'quantity_required' => 0.5,
            'unit' => 'L',
        ]);

        $result = $this->service->calculateAvailableQuantity($this->product->id, $this->tenant->id);

        $this->assertEquals(0, $result['available_quantity']);
        $this->assertFalse($result['can_produce']);
    }

    /** @test */
    public function it_includes_waste_percentage_in_calculations()
    {
        // Create material
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Material',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'unit_cost' => 10,
        ]);

        // Create recipe
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        // Component with 20% waste
        // 10kg required + 20% waste = 12kg effective
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 10,
            'unit' => 'kg',
            'waste_percentage' => 20,
        ]);

        $result = $this->service->calculateAvailableQuantity($this->product->id, $this->tenant->id);

        // 100kg / 12kg = 8.33 → 8 units
        $this->assertEquals(8, $result['available_quantity']);
        
        $component = $result['component_details'][0];
        $this->assertEquals(10, $component['required_quantity']);
        $this->assertEquals(20, $component['waste_percentage']);
        $this->assertEquals(12, $component['effective_quantity']); // 10 * 1.2
    }

    /** @test */
    public function it_identifies_correct_bottleneck_material()
    {
        // Create materials with different stocks
        $abundant = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Abundant Material',
            'unit' => 'kg',
            'stock_quantity' => 1000,
            'unit_cost' => 5,
        ]);

        $limited = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Limited Material',
            'unit' => 'kg',
            'stock_quantity' => 10,
            'unit_cost' => 10,
        ]);

        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $abundant->id,
            'quantity_required' => 1,
            'unit' => 'kg',
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $limited->id,
            'quantity_required' => 2,
            'unit' => 'kg',
        ]);

        $result = $this->service->calculateAvailableQuantity($this->product->id, $this->tenant->id);

        // Limited material: 10 / 2 = 5 units (bottleneck)
        // Abundant material: 1000 / 1 = 1000 units

        $this->assertEquals(5, $result['available_quantity']);
        $this->assertEquals('Limited Material', $result['bottleneck_material']['material_name']);
    }

    // ========================================
    // Test: Error Handling
    // ========================================

    /** @test */
    public function it_throws_exception_for_non_existent_product()
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Product not found');

        $fakeId = \Illuminate\Support\Str::uuid();
        $this->service->calculateAvailableQuantity($fakeId, $this->tenant->id);
    }

    /** @test */
    public function it_throws_exception_for_non_bom_product()
    {
        $simpleProduct = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Simple Product',
            'sku' => 'SIMPLE-001',
            'price' => 50,
            'inventory_management_type' => 'simple',
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('does not use BOM inventory management');

        $this->service->calculateAvailableQuantity($simpleProduct->id, $this->tenant->id);
    }

    /** @test */
    public function it_returns_zero_when_no_active_recipe_exists()
    {
        // No recipe created for product
        $result = $this->service->calculateAvailableQuantity($this->product->id, $this->tenant->id);

        $this->assertEquals(0, $result['available_quantity']);
        $this->assertFalse($result['can_produce']);
        $this->assertNull($result['recipe_id']);
        $this->assertStringContainsString('No active recipe', $result['message']);
    }

    // ========================================
    // Test: Bulk Calculations
    // ========================================

    /** @test */
    public function it_can_bulk_calculate_availability()
    {
        // Create second product
        $product2 = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Product 2',
            'sku' => 'PROD-002',
            'price' => 150,
            'inventory_management_type' => 'bom',
        ]);

        // Create material
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Shared Material',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'unit_cost' => 5,
        ]);

        // Create recipe for product 1
        $recipe1 = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 1',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe1->id,
            'material_id' => $material->id,
            'quantity_required' => 10,
            'unit' => 'kg',
        ]);

        // Create recipe for product 2
        $recipe2 = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $product2->id,
            'name' => 'Recipe 2',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe2->id,
            'material_id' => $material->id,
            'quantity_required' => 5,
            'unit' => 'kg',
        ]);

        $results = $this->service->bulkCalculateAvailability(
            [$this->product->id, $product2->id],
            $this->tenant->id
        );

        $this->assertCount(2, $results);
        $this->assertArrayHasKey($this->product->id, $results);
        $this->assertArrayHasKey($product2->id, $results);
        
        // Product 1: 100 / 10 = 10 units
        $this->assertEquals(10, $results[$this->product->id]['available_quantity']);
        
        // Product 2: 100 / 5 = 20 units
        $this->assertEquals(20, $results[$product2->id]['available_quantity']);
    }

    /** @test */
    public function it_handles_empty_array_in_bulk_calculate()
    {
        $results = $this->service->bulkCalculateAvailability([], $this->tenant->id);

        $this->assertEmpty($results);
    }

    // ========================================
    // Test: Production Feasibility
    // ========================================

    /** @test */
    public function it_checks_production_feasibility_correctly()
    {
        // Setup recipe that can produce 10 units
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Material',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'unit_cost' => 5,
        ]);

        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 10,
            'unit' => 'kg',
        ]);

        // Request 8 units (feasible)
        $result = $this->service->checkProductionFeasibility($this->product->id, $this->tenant->id, 8);

        $this->assertTrue($result['is_feasible']);
        $this->assertEquals(8, $result['requested_quantity']);
        $this->assertEquals(10, $result['available_quantity']);
        $this->assertEquals(0, $result['shortage']);
    }

    /** @test */
    public function it_identifies_production_shortage()
    {
        // Setup recipe that can only produce 5 units
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Material',
            'unit' => 'kg',
            'stock_quantity' => 50,
            'unit_cost' => 5,
        ]);

        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 10,
            'unit' => 'kg',
        ]);

        // Request 10 units (not feasible, can only make 5)
        $result = $this->service->checkProductionFeasibility($this->product->id, $this->tenant->id, 10);

        $this->assertFalse($result['is_feasible']);
        $this->assertEquals(10, $result['requested_quantity']);
        $this->assertEquals(5, $result['available_quantity']);
        $this->assertEquals(5, $result['shortage']);
    }

    // ========================================
    // Test: Material Requirements
    // ========================================

    /** @test */
    public function it_calculates_material_requirements_for_quantity()
    {
        $material1 = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Material A',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'unit_cost' => 10,
        ]);

        $material2 = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Material B',
            'unit' => 'L',
            'stock_quantity' => 50,
            'unit_cost' => 5,
        ]);

        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        // Material A: 2kg per unit
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material1->id,
            'quantity_required' => 2,
            'unit' => 'kg',
            'waste_percentage' => 0,
        ]);

        // Material B: 1L per unit
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material2->id,
            'quantity_required' => 1,
            'unit' => 'L',
            'waste_percentage' => 0,
        ]);

        // Calculate requirements for 10 units
        $result = $this->service->getMaterialRequirements($this->product->id, $this->tenant->id, 10);

        $this->assertEquals(10, $result['requested_quantity']);
        $this->assertCount(2, $result['requirements']);

        // Material A: 10 units * 2kg = 20kg needed, cost = 20 * $10 = $200
        $reqA = collect($result['requirements'])->firstWhere('material_name', 'Material A');
        $this->assertEquals(20, $reqA['total_required']);
        $this->assertEquals(200, $reqA['total_cost']);
        $this->assertTrue($reqA['sufficient']); // 100kg available

        // Material B: 10 units * 1L = 10L needed, cost = 10 * $5 = $50
        $reqB = collect($result['requirements'])->firstWhere('material_name', 'Material B');
        $this->assertEquals(10, $reqB['total_required']);
        $this->assertEquals(50, $reqB['total_cost']);

        // Total cost: $200 + $50 = $250
        $this->assertEquals(250, $result['total_cost']);
        $this->assertEquals(25, $result['cost_per_unit']); // $250 / 10
    }

    // ========================================
    // Test: Low Stock in Active Recipes
    // ========================================

    /** @test */
    public function it_identifies_low_stock_materials_in_active_recipes()
    {
        // Create low stock material
        $lowStockMaterial = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Critical Material',
            'unit' => 'kg',
            'stock_quantity' => 5,
            'reorder_level' => 20, // Low stock
            'unit_cost' => 10,
        ]);

        // Create normal stock material
        $normalMaterial = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Normal Material',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'reorder_level' => 10,
            'unit_cost' => 5,
        ]);

        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Active Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $lowStockMaterial->id,
            'quantity_required' => 1,
            'unit' => 'kg',
        ]);

        $critical = $this->service->getLowStockMaterialsInActiveRecipes($this->tenant->id);

        $this->assertCount(1, $critical);
        $this->assertEquals('Critical Material', $critical[0]['material_name']);
        $this->assertEquals('critical', $critical[0]['stock_status']);
        $this->assertNotEmpty($critical[0]['affected_products']);
    }

    // ========================================
    // Test: Production Cost Estimation
    // ========================================

    /** @test */
    public function it_estimates_production_cost()
    {
        $material = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Expensive Material',
            'unit' => 'kg',
            'stock_quantity' => 1000,
            'unit_cost' => 25,
        ]);

        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Costly Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 3,
            'unit' => 'kg',
            'waste_percentage' => 0,
        ]);

        $result = $this->service->estimateProductionCost($this->product->id, $this->tenant->id, 100);

        // 100 units * 3kg * $25 = $7,500
        $this->assertEquals(7500, $result['total_material_cost']);
        $this->assertEquals(75, $result['cost_per_unit']);
        $this->assertEquals(100, $result['quantity']);
    }

    // ========================================
    // Test: Tenant Isolation
    // ========================================

    /** @test */
    public function it_enforces_tenant_isolation_in_calculations()
    {
        $otherTenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Other Tenant',
            'slug' => 'other-tenant',
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Product not found or does not belong to this tenant');

        $this->service->calculateAvailableQuantity($this->product->id, $otherTenant->id);
    }
}
