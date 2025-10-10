<?php

namespace Tests\Unit;

use Tests\TestCase;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

/**
 * RecipeMaterial Model Unit Tests
 * 
 * Tests model methods, relationships, waste calculations, and component costing.
 * Part of BOM Engine Phase 1 - Day 5: Model Tests
 */
class RecipeMaterialModelTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Product $product;
    protected Recipe $recipe;
    protected Material $material;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => Str::uuid(),
            'name' => 'Test Tenant',
            'code' => 'TEST',
            'status' => 'active',
        ]);

        $this->product = Product::create([
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

        $this->recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        ]);

        $this->material = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'unit_cost' => 10.0,
            'stock_quantity' => 100.0,
        ]);
    }

    /** @test */
    public function it_uses_uuid_as_primary_key()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $this->assertIsString($recipeMaterial->id);
        $this->assertEquals(36, strlen($recipeMaterial->id));
    }

    /** @test */
    public function it_requires_tenant_id()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);
    }

    /** @test */
    public function it_has_tenant_relationship()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $this->assertInstanceOf(Tenant::class, $recipeMaterial->tenant);
        $this->assertEquals($this->tenant->id, $recipeMaterial->tenant->id);
    }

    /** @test */
    public function it_has_recipe_relationship()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $this->assertInstanceOf(Recipe::class, $recipeMaterial->recipe);
        $this->assertEquals($this->recipe->id, $recipeMaterial->recipe->id);
    }

    /** @test */
    public function it_has_material_relationship()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $this->assertInstanceOf(Material::class, $recipeMaterial->material);
        $this->assertEquals($this->material->id, $recipeMaterial->material->id);
    }

    /** @test */
    public function it_calculates_effective_quantity_without_waste()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 10.0,
            'waste_percentage' => 0.0,
        ]);

        $this->assertEquals(10.0, $recipeMaterial->effective_quantity);
    }

    /** @test */
    public function it_calculates_effective_quantity_with_waste()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 10.0,
            'waste_percentage' => 20.0, // 20% waste
        ]);

        // Effective = 10 * (1 + 0.20) = 12.0
        $this->assertEquals(12.0, $recipeMaterial->effective_quantity);
    }

    /** @test */
    public function it_calculates_total_cost_without_waste()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
            'waste_percentage' => 0.0,
        ]);

        // Cost = 5.0 * 10.0 (material unit cost) = 50.0
        $this->assertEquals(50.0, $recipeMaterial->total_cost);
    }

    /** @test */
    public function it_calculates_total_cost_with_waste()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
            'waste_percentage' => 10.0, // 10% waste
        ]);

        // Effective quantity = 5.0 * 1.1 = 5.5
        // Total cost = 5.5 * 10.0 = 55.0
        $this->assertEquals(55.0, $recipeMaterial->total_cost);
    }

    /** @test */
    public function it_checks_stock_sufficiency_for_single_batch()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 50.0, // Material has 100 in stock
        ]);

        $this->assertTrue($recipeMaterial->hasSufficientStock(1));
    }

    /** @test */
    public function it_checks_stock_sufficiency_for_multiple_batches()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 30.0,
        ]);

        // Material has 100 kg
        // 3 batches need 90 kg - sufficient
        $this->assertTrue($recipeMaterial->hasSufficientStock(3));

        // 4 batches need 120 kg - insufficient
        $this->assertFalse($recipeMaterial->hasSufficientStock(4));
    }

    /** @test */
    public function it_calculates_shortage_when_insufficient()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 60.0,
        ]);

        $shortage = $recipeMaterial->getShortageInfo(2);

        // Need 120, have 100, shortage = 20
        $this->assertEquals(120.0, $shortage['required']);
        $this->assertEquals(100.0, $shortage['available']);
        $this->assertEquals(20.0, $shortage['shortage']);
    }

    /** @test */
    public function it_returns_no_shortage_when_sufficient()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 30.0,
        ]);

        $shortage = $recipeMaterial->getShortageInfo(2);

        // Need 60, have 100, no shortage
        $this->assertEquals(60.0, $shortage['required']);
        $this->assertEquals(100.0, $shortage['available']);
        $this->assertEquals(0.0, $shortage['shortage']);
    }

    /** @test */
    public function it_calculates_max_batches_possible()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 25.0,
        ]);

        // Material has 100 kg, each batch needs 25 kg
        // Max batches = 100 / 25 = 4
        $maxBatches = (int) ($this->material->stock_quantity / $recipeMaterial->quantity_required);
        $this->assertEquals(4, $maxBatches);
    }

    /** @test */
    public function it_calculates_max_batches_with_waste()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 20.0,
            'waste_percentage' => 25.0, // 25% waste
        ]);

        // Effective per batch = 20 * 1.25 = 25 kg
        // Material has 100 kg
        // Max batches = 100 / 25 = 4
        $effectiveQuantity = $recipeMaterial->quantity_required * (1 + ($recipeMaterial->waste_percentage / 100));
        $maxBatches = (int) ($this->material->stock_quantity / $effectiveQuantity);
        $this->assertEquals(4, $maxBatches);
    }

    /** @test */
    public function it_prevents_duplicate_material_in_same_recipe()
    {
        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        // Try to add same material to same recipe again
        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 10.0,
        ]);
    }

    /** @test */
    public function it_allows_same_material_in_different_recipes()
    {
        $recipe2 = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Second Recipe',
            'yield_quantity' => 1.0,
        ]);

        $rm1 = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $rm2 = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe2->id,
            'material_id' => $this->material->id,
            'quantity_required' => 10.0,
        ]);

        $this->assertNotEquals($rm1->id, $rm2->id);
        $this->assertEquals($rm1->material_id, $rm2->material_id);
    }

    /** @test */
    public function it_cascades_delete_when_recipe_deleted()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $recipeMaterialId = $recipeMaterial->id;

        // Force delete recipe (hard delete to trigger cascade)
        $this->recipe->forceDelete();

        // RecipeMaterial should not exist anymore (due to cascade delete on recipe)
        $this->assertNull(RecipeMaterial::find($recipeMaterialId));
    }

    /** @test */
    public function it_scopes_to_tenant_correctly()
    {
        $otherTenant = Tenant::create([
            'id' => Str::uuid(),
            'name' => 'Other Tenant',
            'code' => 'OTHER',
            'status' => 'active',
        ]);

        $rm1 = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $otherProduct = Product::create([
            'id' => Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Product',
            'code' => 'PROD-002',
            'sku' => 'SKU-002',
            'price' => 100,
            'stock' => 10,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        $otherRecipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'product_id' => $otherProduct->id,
            'name' => 'Other Recipe',
            'yield_quantity' => 1.0,
        ]);

        $otherMaterial = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'sku' => 'MAT-002',
            'name' => 'Other Material',
            'unit' => 'kg',
            'unit_cost' => 10.0,
            'stock_quantity' => 100.0,
        ]);

        $rm2 = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'recipe_id' => $otherRecipe->id,
            'material_id' => $otherMaterial->id,
            'quantity_required' => 5.0,
        ]);

        $tenantRecipeMaterials = RecipeMaterial::forTenant($this->tenant->id)->get();
        $this->assertCount(1, $tenantRecipeMaterials);
        $this->assertEquals($rm1->id, $tenantRecipeMaterials->first()->id);
    }

    /** @test */
    public function it_casts_attributes_correctly()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.567,
            'waste_percentage' => 12.5,
        ]);

        $this->assertIsString($recipeMaterial->quantity_required);
        $this->assertIsString($recipeMaterial->waste_percentage);
        
        $this->assertEquals('5.567', $recipeMaterial->quantity_required);
        $this->assertEquals('12.50', $recipeMaterial->waste_percentage);
    }

    /** @test */
    public function it_formats_dates_correctly()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.0,
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $recipeMaterial->created_at);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $recipeMaterial->updated_at);
    }

    /** @test */
    public function it_provides_display_name_accessor()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 5.5,
            'waste_percentage' => 10.0,
        ]);

        $displayName = $recipeMaterial->display_name;
        
        // Should include material name, quantity, and unit
        $this->assertStringContainsString('Test Material', $displayName);
        $this->assertStringContainsString('5.5', $displayName);
        $this->assertStringContainsString('kg', $displayName);
    }

    /** @test */
    public function it_handles_zero_waste_percentage()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 10.0,
            'waste_percentage' => 0.0,
        ]);

        $this->assertEquals(10.0, $recipeMaterial->effective_quantity);
        $this->assertEquals(100.0, $recipeMaterial->total_cost);
    }

    /** @test */
    public function it_handles_null_waste_percentage()
    {
        $recipeMaterial = RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $this->recipe->id,
            'material_id' => $this->material->id,
            'quantity_required' => 10.0,
            // waste_percentage not set (null)
        ]);

        // Should treat null as 0
        $this->assertEquals(10.0, $recipeMaterial->effective_quantity);
    }
}