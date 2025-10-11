<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\InventoryTransaction;

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
    public function it_can_list_material_transactions(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // Create transactions directly via factory for predictable results
        \Src\Pms\Infrastructure\Models\InventoryTransaction::factory()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'restock',
            'quantity_change' => 50,
            'reason' => 'purchase',
            'notes' => 'Restocking from supplier',
        ]);

        \Src\Pms\Infrastructure\Models\InventoryTransaction::factory()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -20,
            'reason' => 'production',
            'notes' => 'Used in production',
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/transactions",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'material' => [
                    'id',
                    'name',
                    'current_stock',
                ],
                'data' => [
                    '*' => [
                        'id',
                        'transaction_type',
                        'quantity_change',
                        'quantity_before',
                        'quantity_after',
                        'reason',
                        'notes',
                        'user_name',
                        'created_at',
                        'is_increase',
                        'is_decrease',
                        'direction',
                        'absolute_change',
                    ]
                ],
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ]
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('material.id', $material->id);

        $transactions = $response->json('data');
        $this->assertCount(2, $transactions);
    }

    /** @test */
    public function it_filters_transactions_by_type(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // Create different transaction types
        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
            ['type' => 'restock', 'quantity' => 50, 'reason' => 'purchase'],
            $this->authenticatedRequest()['headers']
        );

        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
            ['type' => 'deduction', 'quantity' => 20, 'reason' => 'production'],
            $this->authenticatedRequest()['headers']
        );

        // Act - Filter by restock type
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/transactions?transaction_type=restock",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        $transactions = $response->json('data');
        $this->assertCount(1, $transactions);
        $this->assertEquals('restock', $transactions[0]['transaction_type']);
    }

    /** @test */
    public function it_filters_transactions_by_reason(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // Create transactions with different reasons
        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
            ['type' => 'restock', 'quantity' => 50, 'reason' => 'purchase'],
            $this->authenticatedRequest()['headers']
        );

        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
            ['type' => 'restock', 'quantity' => 30, 'reason' => 'return'],
            $this->authenticatedRequest()['headers']
        );

        // Act - Filter by purchase reason
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/transactions?reason=purchase",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        $transactions = $response->json('data');
        $this->assertCount(1, $transactions);
        $this->assertEquals('purchase', $transactions[0]['reason']);
    }

    /** @test */
    public function it_filters_transactions_by_direction(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // Create transactions with different directions
        InventoryTransaction::factory()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_change' => 10,
            'transaction_type' => 'restock',
        ]);

        InventoryTransaction::factory()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_change' => -5,
            'transaction_type' => 'deduction',
        ]);

        // Act - Filter by increases only (direction=in)
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/transactions?direction=in",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        $transactions = $response->json('data');
        $this->assertCount(1, $transactions);
        $this->assertTrue($transactions[0]['is_increase']);
    }

    /** @test */
    public function it_filters_transactions_by_date_range(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // Create a transaction
        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
            ['type' => 'restock', 'quantity' => 50, 'reason' => 'purchase'],
            $this->authenticatedRequest()['headers']
        );

        $today = now()->format('Y-m-d');
        $tomorrow = now()->addDay()->format('Y-m-d');

        // Act - Filter by today's date
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/transactions?date_from={$today}&date_to={$tomorrow}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        $transactions = $response->json('data');
        $this->assertCount(1, $transactions);
    }

    /** @test */
    public function it_can_show_single_transaction_details(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // Create a transaction directly
        $transaction = \Src\Pms\Infrastructure\Models\InventoryTransaction::factory()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'user_id' => $this->user->id,
            'transaction_type' => 'restock',
            'quantity_change' => 50,
            'reason' => 'purchase',
            'notes' => 'Supplier ABC delivery',
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/inventory-transactions/{$transaction->id}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'transaction_type',
                    'quantity_change',
                    'quantity_before',
                    'quantity_after',
                    'reason',
                    'notes',
                    'created_at',
                    'is_increase',
                    'is_decrease',
                    'direction',
                    'absolute_change',
                    'user' => [
                        'id',
                        'name',
                        'email',
                    ],
                    'material' => [
                        'id',
                        'name',
                        'sku',
                        'unit',
                        'current_stock',
                    ],
                ]
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $transaction->id)
            ->assertJsonPath('data.transaction_type', 'restock')
            ->assertJsonPath('data.notes', 'Supplier ABC delivery')
            ->assertJsonPath('data.user.name', $this->user->name);
    }

    /** @test */
    public function it_cannot_access_transaction_from_another_tenant(): void
    {
        // Arrange
        $otherTenant = $this->createOtherTenant();
        $material = Material::factory()->create([
            'tenant_id' => $otherTenant->id,
            'stock_quantity' => 100,
        ]);

        // Create transaction for other tenant (using factory directly)
        $transaction = \Src\Pms\Infrastructure\Models\InventoryTransaction::factory()->create([
            'tenant_id' => $otherTenant->id,
            'material_id' => $material->id,
        ]);

        // Act - Try to access other tenant's transaction
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/inventory-transactions/{$transaction->id}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertForbidden();
    }

    /** @test */
    public function it_returns_404_for_nonexistent_transaction(): void
    {
        // Arrange
        $fakeTransactionId = (string)\Ramsey\Uuid\Uuid::uuid4();

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/inventory-transactions/{$fakeTransactionId}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertNotFound();
    }

    /** @test */
    public function it_paginates_material_transactions(): void
    {
        // Arrange
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // Create 25 transactions
        for ($i = 0; $i < 25; $i++) {
            \Src\Pms\Infrastructure\Models\InventoryTransaction::factory()->create([
                'tenant_id' => $this->tenant->id,
                'material_id' => $material->id,
            ]);
        }

        // Act - Request first page
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/transactions?per_page=10",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25);

        $this->assertCount(10, $response->json('data'));
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