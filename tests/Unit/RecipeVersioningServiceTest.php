<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\RecipeVersioningService;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class RecipeVersioningServiceTest extends TestCase
{
    use RefreshDatabase;

    private RecipeVersioningService $service;
    private string $tenantId;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RecipeVersioningService();
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
        $this->user = User::factory()->create(['tenant_id' => $this->tenantId]);
    }

    /** @test */
    public function it_creates_recipe_snapshot()
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenantId]);
        $recipe = Recipe::factory()->create(['tenant_id' => $this->tenantId, 'product_id' => $product->id]);
        $material = Material::factory()->create(['tenant_id' => $this->tenantId]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
        ]);

        $snapshot = $this->service->createSnapshot($recipe->id, $this->tenantId, $this->user, 'Initial snapshot');

        $this->assertArrayHasKey('version_id', $snapshot);
        $this->assertArrayHasKey('recipe_data', $snapshot);
        $this->assertArrayHasKey('components', $snapshot);
        $this->assertEquals('Initial snapshot', $snapshot['change_notes']);
    }

    /** @test */
    public function it_compares_two_snapshots()
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenantId]);
        $recipe = Recipe::factory()->create(['tenant_id' => $this->tenantId, 'product_id' => $product->id]);
        
        $snapshot1 = $this->service->createSnapshot($recipe->id, $this->tenantId, $this->user);
        
        // Modify recipe
        $recipe->update(['name' => 'Updated Recipe Name']);
        
        $snapshot2 = $this->service->createSnapshot($recipe->id, $this->tenantId, $this->user);

        $comparison = $this->service->compareSnapshots($snapshot1, $snapshot2);

        $this->assertArrayHasKey('has_changes', $comparison);
        $this->assertArrayHasKey('cost_analysis', $comparison);
    }

    /** @test */
    public function it_clones_recipe_successfully()
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenantId]);
        $original = Recipe::factory()->create(['tenant_id' => $this->tenantId, 'product_id' => $product->id]);
        $material = Material::factory()->create(['tenant_id' => $this->tenantId]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $original->id,
            'material_id' => $material->id,
        ]);

        $cloned = $this->service->cloneRecipe($original->id, $this->tenantId, $this->user, 'Cloned Recipe');

        $this->assertNotEquals($original->id, $cloned->id);
        $this->assertEquals('Cloned Recipe', $cloned->name);
        $this->assertFalse($cloned->is_active);
        $this->assertEquals(1, $cloned->recipeMaterials()->count());
    }

    /** @test */
    public function it_analyzes_change_impact()
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenantId]);
        $recipe = Recipe::factory()->create(['tenant_id' => $this->tenantId, 'product_id' => $product->id]);
        $material = Material::factory()->create(['tenant_id' => $this->tenantId, 'unit_cost' => 10]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5,
        ]);

        $proposedChanges = [
            'components' => [
                [
                    'material_id' => $material->id,
                    'quantity_required' => 10, // Double the quantity
                ],
            ],
        ];

        $impact = $this->service->analyzeChangeImpact($recipe->id, $this->tenantId, $proposedChanges);

        $this->assertArrayHasKey('current_cost', $impact);
        $this->assertArrayHasKey('projected_cost', $impact);
        $this->assertArrayHasKey('percentage_change', $impact);
        $this->assertArrayHasKey('recommendation', $impact);
    }

    /** @test */
    public function it_enforces_tenant_isolation()
    {
        $tenant2 = Tenant::factory()->create();
        $product = Product::factory()->create(['tenant_id' => $tenant2->id]);
        $recipe = Recipe::factory()->create(['tenant_id' => $tenant2->id, 'product_id' => $product->id]);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        
        $this->service->createSnapshot($recipe->id, $this->tenantId, $this->user);
    }
}
