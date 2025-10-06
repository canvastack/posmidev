<?php

namespace Tests\Feature;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;

/**
 * VariantBulkOperationsTest
 * 
 * Tests for bulk operations on Product Variants
 * - Bulk Create
 * - Bulk Update
 * - Bulk Delete
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * ✅ Teams enabled: TRUE
 * ✅ team_foreign_key: tenant_id
 * ✅ guard_name: api
 * ✅ model_morph_key: model_uuid
 * ✅ Tenant-scoped operations
 * ❌ NO global roles
 */
class VariantBulkOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected User $cashierUser;
    protected Tenant $tenant;
    protected Tenant $otherTenant;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Create tenants
        $this->tenant = Tenant::factory()->create();
        $this->otherTenant = Tenant::factory()->create();

        // Create permissions
        Permission::findOrCreate('products.view', 'api');
        Permission::findOrCreate('products.create', 'api');
        Permission::findOrCreate('products.update', 'api');
        Permission::findOrCreate('products.delete', 'api');

        // Set Spatie team context for main tenant
        app(PermissionRegistrar::class)->setPermissionsTeamId((string) $this->tenant->id);

        // Create roles with permissions for main tenant
        $adminRole = Role::create([
            'name' => 'Admin',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $adminRole->givePermissionTo(['products.view', 'products.create', 'products.update', 'products.delete']);

        $managerRole = Role::create([
            'name' => 'Manager',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $managerRole->givePermissionTo(['products.view', 'products.create', 'products.update']);

        $cashierRole = Role::create([
            'name' => 'Cashier',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $cashierRole->givePermissionTo(['products.view']);

        // Create users
        $this->adminUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->adminUser->assignRole($adminRole);

        $this->managerUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->managerUser->assignRole($managerRole);

        $this->cashierUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->cashierUser->assignRole($cashierRole);

        // Create product with variants enabled
        $this->product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'has_variants' => true,
        ]);

        // Reset permission cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @test */
    public function can_bulk_create_variants_successfully()
    {
        $variantsData = [
            [
                'sku' => 'PROD-001-S-RED',
                'name' => 'Small Red',
                'price' => 89.99,
                'cost_price' => 45.00,
                'stock' => 50,
                'attributes' => [
                    'size' => 'S',
                    'color' => 'Red',
                ],
                'is_active' => true,
            ],
            [
                'sku' => 'PROD-001-M-BLUE',
                'name' => 'Medium Blue',
                'price' => 99.99,
                'cost_price' => 50.00,
                'stock' => 75,
                'attributes' => [
                    'size' => 'M',
                    'color' => 'Blue',
                ],
                'is_active' => true,
            ],
            [
                'sku' => 'PROD-001-L-GREEN',
                'name' => 'Large Green',
                'price' => 109.99,
                'cost_price' => 55.00,
                'stock' => 100,
                'attributes' => [
                    'size' => 'L',
                    'color' => 'Green',
                ],
                'is_active' => true,
            ],
        ];

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['variants' => $variantsData]
            );

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'created',
                    'failed',
                    'variants' => [
                        '*' => ['id', 'sku', 'name', 'price'],
                    ],
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'created' => 3,
                    'failed' => 0,
                ],
            ]);

        // Verify all variants were created with correct tenant_id
        foreach ($variantsData as $variantData) {
            $this->assertDatabaseHas('product_variants', [
                'tenant_id' => $this->tenant->id,
                'product_id' => $this->product->id,
                'sku' => $variantData['sku'],
                'name' => $variantData['name'],
            ]);
        }
    }

    /** @test */
    public function bulk_create_handles_partial_failures()
    {
        // First, create a variant with a specific SKU
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'PROD-001-DUPLICATE',
        ]);

        $variantsData = [
            [
                'sku' => 'PROD-001-VALID-1',
                'name' => 'Valid Variant 1',
                'price' => 89.99,
                'cost_price' => 45.00,
                'stock' => 50,
            ],
            [
                'sku' => 'PROD-001-DUPLICATE', // This will fail (duplicate SKU)
                'name' => 'Duplicate Variant',
                'price' => 99.99,
                'cost_price' => 50.00,
                'stock' => 75,
            ],
            [
                'sku' => 'PROD-001-VALID-2',
                'name' => 'Valid Variant 2',
                'price' => 109.99,
                'cost_price' => 55.00,
                'stock' => 100,
            ],
        ];

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['variants' => $variantsData]
            );

        $response->assertStatus(201)
            ->assertJsonPath('data.created', 2)
            ->assertJsonPath('data.failed', 1);

        // Verify valid variants were created
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'PROD-001-VALID-1',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'PROD-001-VALID-2',
        ]);
    }

    /** @test */
    public function can_bulk_update_variants_successfully()
    {
        // Create variants to update
        $variant1 = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VARIANT-001',
            'price' => 50.00,
        ]);

        $variant2 = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VARIANT-002',
            'price' => 60.00,
        ]);

        $variant3 = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VARIANT-003',
            'price' => 70.00,
        ]);

        $updates = [
            [
                'id' => $variant1->id,
                'price' => 55.00,
                'stock' => 100,
            ],
            [
                'id' => $variant2->id,
                'price' => 65.00,
                'stock' => 150,
            ],
            [
                'id' => $variant3->id,
                'price' => 75.00,
                'is_active' => false,
            ],
        ];

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['updates' => $updates]
            );

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'updated' => 3,
                    'failed' => 0,
                ],
            ]);

        // Verify updates
        $this->assertDatabaseHas('product_variants', [
            'id' => $variant1->id,
            'price' => 55.00,
            'stock' => 100,
        ]);
        $this->assertDatabaseHas('product_variants', [
            'id' => $variant2->id,
            'price' => 65.00,
            'stock' => 150,
        ]);
        $this->assertDatabaseHas('product_variants', [
            'id' => $variant3->id,
            'price' => 75.00,
            'is_active' => false,
        ]);
    }

    /** @test */
    public function bulk_update_respects_tenant_isolation()
    {
        // Create variant in other tenant
        $otherProduct = Product::factory()->create([
            'tenant_id' => $this->otherTenant->id,
            'has_variants' => true,
        ]);

        $otherVariant = ProductVariant::factory()->create([
            'tenant_id' => $this->otherTenant->id,
            'product_id' => $otherProduct->id,
            'price' => 100.00,
        ]);

        // Try to update other tenant's variant
        $updates = [
            [
                'id' => $otherVariant->id,
                'price' => 200.00, // Should NOT be applied
            ],
        ];

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['updates' => $updates]
            );

        $response->assertStatus(200)
            ->assertJsonPath('data.updated', 0)
            ->assertJsonPath('data.failed', 1);

        // Verify other tenant's variant was NOT updated
        $this->assertDatabaseHas('product_variants', [
            'id' => $otherVariant->id,
            'price' => 100.00, // Original price unchanged
        ]);
    }

    /** @test */
    public function can_bulk_delete_variants_successfully()
    {
        // Create variants to delete
        $variant1 = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $variant2 = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $variant3 = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $variantIds = [$variant1->id, $variant2->id, $variant3->id];

        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['ids' => $variantIds]
            );

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'deleted' => 3,
                    'failed' => 0,
                ],
            ]);

        // Verify variants were soft deleted
        foreach ($variantIds as $id) {
            $this->assertSoftDeleted('product_variants', ['id' => $id]);
        }
    }

    /** @test */
    public function bulk_delete_respects_tenant_isolation()
    {
        // Create variant in current tenant
        $ownVariant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        // Create variant in other tenant
        $otherProduct = Product::factory()->create([
            'tenant_id' => $this->otherTenant->id,
            'has_variants' => true,
        ]);

        $otherVariant = ProductVariant::factory()->create([
            'tenant_id' => $this->otherTenant->id,
            'product_id' => $otherProduct->id,
        ]);

        // Try to delete both (should only delete own tenant's variant)
        $variantIds = [$ownVariant->id, $otherVariant->id];

        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['ids' => $variantIds]
            );

        $response->assertStatus(200)
            ->assertJsonPath('data.deleted', 1)
            ->assertJsonPath('data.failed', 1);

        // Verify only own variant was deleted
        $this->assertSoftDeleted('product_variants', ['id' => $ownVariant->id]);
        
        // Verify other tenant's variant was NOT deleted
        $this->assertDatabaseHas('product_variants', [
            'id' => $otherVariant->id,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function manager_can_bulk_create_and_update_but_not_delete()
    {
        // Test bulk create - SHOULD SUCCEED
        $createResponse = $this->actingAs($this->managerUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                [
                    'variants' => [
                        [
                            'sku' => 'MANAGER-TEST-001',
                            'name' => 'Manager Variant',
                            'price' => 50.00,
                            'cost_price' => 25.00,
                            'stock' => 10,
                        ],
                    ],
                ]
            );

        $createResponse->assertStatus(201);

        // Test bulk update - SHOULD SUCCEED
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'price' => 100.00,
        ]);

        $updateResponse = $this->actingAs($this->managerUser, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                [
                    'updates' => [
                        ['id' => $variant->id, 'price' => 150.00],
                    ],
                ]
            );

        $updateResponse->assertStatus(200);

        // Test bulk delete - SHOULD FAIL (403 Forbidden)
        $deleteResponse = $this->actingAs($this->managerUser, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['ids' => [$variant->id]]
            );

        $deleteResponse->assertStatus(403);
    }

    /** @test */
    public function cashier_cannot_perform_any_bulk_operations()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        // Test bulk create - SHOULD FAIL
        $createResponse = $this->actingAs($this->cashierUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                [
                    'variants' => [
                        [
                            'sku' => 'CASHIER-TEST-001',
                            'name' => 'Cashier Variant',
                            'price' => 50.00,
                            'cost_price' => 25.00,
                            'stock' => 10,
                        ],
                    ],
                ]
            );

        $createResponse->assertStatus(403);

        // Test bulk update - SHOULD FAIL
        $updateResponse = $this->actingAs($this->cashierUser, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                [
                    'updates' => [
                        ['id' => $variant->id, 'price' => 150.00],
                    ],
                ]
            );

        $updateResponse->assertStatus(403);

        // Test bulk delete - SHOULD FAIL
        $deleteResponse = $this->actingAs($this->cashierUser, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['ids' => [$variant->id]]
            );

        $deleteResponse->assertStatus(403);
    }

    /** @test */
    public function bulk_operations_validate_empty_arrays()
    {
        // Test bulk create with empty array
        $createResponse = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['variants' => []]
            );

        $createResponse->assertStatus(422);

        // Test bulk update with empty array
        $updateResponse = $this->actingAs($this->adminUser, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['updates' => []]
            );

        $updateResponse->assertStatus(422);

        // Test bulk delete with empty array
        $deleteResponse = $this->actingAs($this->adminUser, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                ['ids' => []]
            );

        $deleteResponse->assertStatus(422);
    }

    /** @test */
    public function bulk_create_validates_required_fields()
    {
        $invalidData = [
            'variants' => [
                [
                    // Missing required field: sku (price is optional, defaults to product price)
                    'name' => 'Test Variant',
                    'stock' => 10,
                ],
            ],
        ];

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/bulk",
                $invalidData
            );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['variants.0.sku']);
    }
}