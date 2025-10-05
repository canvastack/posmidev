<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\StockAdjustment;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Stock Adjustment API Feature Tests
 * 
 * Tests stock adjustment endpoints with audit trail
 * and permission enforcement.
 */
class StockAdjustmentApiTest extends TestCase
{
    use TenantTestTrait;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpTenantWithAdminUser();
        
        $this->product = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'code' => 'TEST-001',
            'sku' => 'SKU-TEST-001',
            'stock' => 50,
            'min_stock' => 10,
            'max_stock' => 100,
            'price' => 10000,
            'cost' => 5000,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        // Grant inventory.adjust permission
        $role = Role::where('tenant_id', $this->tenant->id)
            ->where('name', 'admin')
            ->first();
        
        if (!$role->hasPermissionTo('inventory.adjust', 'api')) {
            $role->givePermissionTo('inventory.adjust');
        }
        
        $this->user->assignRole($role);
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /** @test */
    public function it_returns_adjustment_reasons()
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-adjustments/reasons");

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'name',
                    'type',
                    'description',
                ],
            ]);

        $reasons = $response->json();
        $this->assertGreaterThan(0, count($reasons));
        
        // Check for specific reasons
        $reasonNames = collect($reasons)->pluck('name')->toArray();
        $this->assertContains('purchase', $reasonNames);
        $this->assertContains('return', $reasonNames);
        $this->assertContains('damaged', $reasonNames);
    }

    /** @test */
    public function it_adjusts_stock_with_purchase_reason()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                'adjustment_type' => 'addition',
                'quantity' => 20,
                'reason' => 'purchase',
                'notes' => 'New stock from supplier',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Stock adjusted successfully',
                'product' => [
                    'id' => $this->product->id,
                    'stock' => 70, // 50 + 20
                ],
            ]);

        $this->product->refresh();
        $this->assertEquals(70, $this->product->stock);

        // Check adjustment record
        $adjustment = StockAdjustment::where('product_id', $this->product->id)->first();
        $this->assertNotNull($adjustment);
        $this->assertEquals('addition', $adjustment->adjustment_type);
        $this->assertEquals(20, $adjustment->quantity);
        $this->assertEquals('purchase', $adjustment->reason);
        $this->assertEquals($this->user->id, $adjustment->adjusted_by);
    }

    /** @test */
    public function it_adjusts_stock_with_deduction_reason()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                'adjustment_type' => 'deduction',
                'quantity' => 10,
                'reason' => 'damaged',
                'notes' => 'Items damaged during storage',
            ]);

        $response->assertStatus(200);

        $this->product->refresh();
        $this->assertEquals(40, $this->product->stock); // 50 - 10
    }

    /** @test */
    public function it_prevents_negative_stock()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                'adjustment_type' => 'deduction',
                'quantity' => 100, // More than current stock (50)
                'reason' => 'damaged',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        $this->product->refresh();
        $this->assertEquals(50, $this->product->stock); // Unchanged
    }

    /** @test */
    public function it_requires_positive_quantity()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                'adjustment_type' => 'addition',
                'quantity' => 0,
                'reason' => 'purchase',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
    }

    /** @test */
    public function it_requires_valid_adjustment_type()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                'adjustment_type' => 'invalid_type',
                'quantity' => 10,
                'reason' => 'purchase',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['adjustment_type']);
    }

    /** @test */
    public function it_requires_inventory_adjust_permission()
    {
        // Create user without permission
        $userWithoutPermission = User::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Limited User',
            'email' => 'limited@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->actingAs($userWithoutPermission, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                'adjustment_type' => 'addition',
                'quantity' => 10,
                'reason' => 'purchase',
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function it_returns_stock_adjustment_history()
    {
        // Create some adjustments
        StockAdjustment::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'adjustment_type' => 'addition',
            'quantity' => 20,
            'reason' => 'purchase',
            'notes' => 'First adjustment',
            'adjusted_by' => $this->user->id,
            'old_stock' => 50,
            'new_stock' => 70,
        ]);

        StockAdjustment::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'adjustment_type' => 'deduction',
            'quantity' => 5,
            'reason' => 'damaged',
            'notes' => 'Second adjustment',
            'adjusted_by' => $this->user->id,
            'old_stock' => 70,
            'new_stock' => 65,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/history");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'adjustment_type',
                        'quantity',
                        'reason',
                        'notes',
                        'old_stock',
                        'new_stock',
                        'adjusted_at',
                        'adjusted_by_user' => [
                            'id',
                            'name',
                        ],
                    ],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    /** @test */
    public function it_enforces_tenant_isolation_on_adjustments()
    {
        $otherTenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Other Tenant',
            'code' => 'OTHER',
            'status' => 'active',
        ]);

        $otherProduct = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Product',
            'code' => 'OTHER-001',
            'sku' => 'SKU-OTHER-001',
            'stock' => 50,
            'price' => 10000,
            'cost' => 5000,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        // Try to adjust other tenant's product
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$otherTenant->id}/products/{$otherProduct->id}/stock/adjust", [
                'adjustment_type' => 'addition',
                'quantity' => 10,
                'reason' => 'purchase',
            ]);

        $this->assertTrue($response->status() === 403 || $response->status() === 404);

        // Product stock should be unchanged
        $otherProduct->refresh();
        $this->assertEquals(50, $otherProduct->stock);
    }

    /** @test */
    public function it_records_audit_trail_with_user_information()
    {
        $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                'adjustment_type' => 'addition',
                'quantity' => 15,
                'reason' => 'purchase',
                'notes' => 'Purchase order #123',
            ]);

        $adjustment = StockAdjustment::where('product_id', $this->product->id)->first();
        
        $this->assertNotNull($adjustment);
        $this->assertEquals($this->user->id, $adjustment->adjusted_by);
        $this->assertEquals(50, $adjustment->old_stock);
        $this->assertEquals(65, $adjustment->new_stock);
        $this->assertEquals('Purchase order #123', $adjustment->notes);
        $this->assertNotNull($adjustment->created_at);
    }

    /** @test */
    public function it_handles_concurrent_stock_adjustments()
    {
        // Simulate concurrent adjustments
        $responses = [];
        
        for ($i = 0; $i < 3; $i++) {
            $responses[] = $this->actingAs($this->user, 'api')
                ->postJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/stock/adjust", [
                    'adjustment_type' => 'addition',
                    'quantity' => 10,
                    'reason' => 'purchase',
                ]);
        }

        foreach ($responses as $response) {
            $response->assertStatus(200);
        }

        // Final stock should be 50 + (3 × 10) = 80
        $this->product->refresh();
        $this->assertEquals(80, $this->product->stock);

        // Should have 3 adjustment records
        $adjustments = StockAdjustment::where('product_id', $this->product->id)->get();
        $this->assertCount(3, $adjustments);
    }
}