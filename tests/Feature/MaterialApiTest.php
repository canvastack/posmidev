<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;

class MaterialApiTest extends TestCase
{
    use TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function it_can_list_materials_for_tenant(): void
    {
        // Arrange
        Material::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'tenant_id',
                        'name',
                        'sku',
                        'unit',
                        'stock_quantity',
                        'reorder_level',
                        'unit_cost',
                    ]
                ],
                'meta',
            ])
            ->assertJsonPath('success', true);
    }

    /** @test */
    public function it_can_create_a_material(): void
    {
        // Arrange
        $materialData = [
            'name' => 'Test Flour',
            'sku' => 'FLOUR-001',
            'description' => 'Premium all-purpose flour',
            'category' => 'Dry Goods',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'reorder_level' => 20,
            'unit_cost' => 15000,
            'supplier' => 'ABC Supplies',
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials",
            $materialData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertCreated()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'name',
                    'sku',
                    'unit',
                ],
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Test Flour')
            ->assertJsonPath('data.sku', 'FLOUR-001');

        // Verify in database
        $this->assertDatabaseHas('materials', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Flour',
            'sku' => 'FLOUR-001',
        ]);
    }

    /** @test */
    public function it_validates_required_fields_when_creating_material(): void
    {
        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'unit', 'stock_quantity']);
    }

    /** @test */
    public function it_can_show_a_single_material(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Material',
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $material->id)
            ->assertJsonPath('data.name', 'Test Material');
    }

    /** @test */
    public function it_can_update_a_material(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Old Name',
        ]);

        $updateData = [
            'name' => 'Updated Name',
            'unit_cost' => 25000,
        ];

        // Act
        $response = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}",
            $updateData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Name');

        $this->assertDatabaseHas('materials', [
            'id' => $material->id,
            'name' => 'Updated Name',
        ]);
    }

    /** @test */
    public function it_can_delete_a_material(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        // Act
        $response = $this->deleteJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Material deleted successfully');

        $this->assertSoftDeleted('materials', [
            'id' => $material->id,
        ]);
    }

    /** @test */
    public function it_can_bulk_create_materials(): void
    {
        // Arrange
        $materialsData = [
            'materials' => [
                [
                    'name' => 'Flour',
                    'unit' => 'kg',
                    'stock_quantity' => 100,
                ],
                [
                    'name' => 'Sugar',
                    'unit' => 'kg',
                    'stock_quantity' => 50,
                ],
            ],
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/bulk",
            $materialsData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.success', 2)
            ->assertJsonPath('summary.failed', 0);

        $this->assertDatabaseHas('materials', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Flour',
        ]);

        $this->assertDatabaseHas('materials', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Sugar',
        ]);
    }

    /** @test */
    public function it_can_adjust_material_stock(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        $adjustmentData = [
            'type' => 'restock',
            'quantity' => 50,
            'reason' => 'purchase',
            'notes' => 'Purchased from supplier',
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
            $adjustmentData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Stock adjusted successfully');

        // Verify stock was updated
        $material->refresh();
        $this->assertEquals(150, $material->stock_quantity);

        // Verify transaction was recorded
        $this->assertDatabaseHas('inventory_transactions', [
            'material_id' => $material->id,
            'tenant_id' => $this->tenant->id,
            'transaction_type' => 'restock',
            'quantity_change' => 50,
            'reason' => 'purchase',
        ]);
    }

    /** @test */
    public function it_can_get_low_stock_materials(): void
    {
        // Arrange
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Stock Item',
            'stock_quantity' => 5,
            'reorder_level' => 10,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Normal Stock Item',
            'stock_quantity' => 100,
            'reorder_level' => 10,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/low-stock",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('count', 1)
            ->assertJsonPath('data.0.name', 'Low Stock Item');
    }

    /** @test */
    public function it_cannot_access_materials_from_another_tenant(): void
    {
        // Arrange
        $otherTenant = $this->createOtherTenant();
        $material = Material::factory()->create([
            'tenant_id' => $otherTenant->id,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/materials/{$material->id}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertForbidden();
    }

    /** @test */
    public function it_filters_materials_by_search_term(): void
    {
        // Arrange
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'All-Purpose Flour',
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'White Sugar',
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials?search=Flour",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true);

        $materials = $response->json('data');
        $this->assertCount(1, $materials);
        $this->assertEquals('All-Purpose Flour', $materials[0]['name']);
    }

    /** @test */
    public function it_filters_materials_by_category(): void
    {
        // Arrange
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Flour',
            'category' => 'Dry Goods',
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Milk',
            'category' => 'Dairy',
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials?category=Dry Goods",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true);

        $materials = $response->json('data');
        $this->assertCount(1, $materials);
        $this->assertEquals('Flour', $materials[0]['name']);
    }

    /** @test */
    public function it_ensures_sku_is_unique_per_tenant(): void
    {
        // Arrange
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'sku' => 'FLOUR-001',
        ]);

        $duplicateData = [
            'name' => 'Another Flour',
            'sku' => 'FLOUR-001',
            'unit' => 'kg',
            'stock_quantity' => 50,
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials",
            $duplicateData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['sku']);
    }
}