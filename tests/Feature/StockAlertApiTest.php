<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\StockAlert;
use Src\Pms\Infrastructure\Models\Tenant;
use Spatie\Permission\Models\Role;

/**
 * Stock Alert API Feature Tests
 * 
 * Tests all stock alert endpoints with proper tenant scoping
 * and permission checks.
 */
class StockAlertApiTest extends TestCase
{
    use TenantTestTrait;

    protected Product $product;
    protected StockAlert $alert;

    protected function setUp(): void
    {
        parent::setUp();

        // Create tenant and user using trait
        $this->setUpTenantWithAdminUser();
        
        // Get category or create one
        $category = \Src\Pms\Infrastructure\Models\Category::where('tenant_id', $this->tenant->id)->first();
        if (!$category) {
            $category = \Src\Pms\Infrastructure\Models\Category::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $this->tenant->id,
                'name' => 'Test Category',
                'code' => 'TEST-CAT',
                'status' => 'active',
            ]);
        }

        // Create product with low stock (Phase 5 fields)
        $this->product = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $category->id,
            'name' => 'Test Product',
            'sku' => 'SKU-TEST-001',
            'stock' => 8, // 80% of reorder_point (low but not critical)
            'reorder_point' => 10,
            'reorder_quantity' => 20,
            'low_stock_alert_enabled' => true,
            'price' => 10000,
            'cost_price' => 5000,
            'status' => 'active',
        ]);

        // Create stock alert
        $this->alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'severity' => 'low',
            'current_stock' => 8,
            'reorder_point' => 10,
            'status' => 'pending',
            'notified' => false,
        ]);
    }

    /** @test */
    public function it_lists_stock_alerts_for_authenticated_user()
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'product_id',
                        'current_stock',
                        'reorder_point',
                        'severity',
                        'status',
                        'created_at',
                        'product' => [
                            'id',
                            'name',
                            'sku',
                            'current_stock',
                        ],
                    ],
                ],
                'pagination' => [
                    'current_page',
                    'total',
                    'per_page',
                ],
            ]);

        $this->assertCount(1, $response->json('data'));
    }

    /** @test */
    public function it_filters_alerts_by_status()
    {
        // Create acknowledged alert
        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'critical',
            'current_stock' => 2,
            'reorder_point' => 10,
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
            'acknowledged_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts?status=pending");

        $response->assertStatus(200);
        
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('pending', $response->json('data.0.status'));
    }

    /** @test */
    public function it_filters_alerts_by_severity()
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts?severity=low");

        $response->assertStatus(200);
        
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('low', $response->json('data.0.severity'));
    }

    /** @test */
    public function it_returns_alert_statistics()
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/stats");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_alerts',
                'by_status' => [
                    'pending',
                    'acknowledged',
                    'resolved',
                    'dismissed',
                ],
                'by_severity' => [
                    'low',
                    'critical',
                    'out_of_stock',
                ],
                'actionable_count',
            ]);

        $this->assertEquals(1, $response->json('total_alerts'));
        $this->assertEquals(1, $response->json('by_status.pending'));
        $this->assertEquals(1, $response->json('by_severity.low'));
    }

    /** @test */
    public function it_acknowledges_alert_with_notes()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/{$this->alert->id}/acknowledge", [
                'notes' => 'Checking with supplier',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Alert acknowledged successfully',
            ]);

        $this->alert->refresh();
        $this->assertEquals('acknowledged', $this->alert->status);
        $this->assertEquals('Checking with supplier', $this->alert->acknowledged_notes);
        $this->assertEquals($this->user->id, $this->alert->acknowledged_by);
        $this->assertNotNull($this->alert->acknowledged_at);
    }

    /** @test */
    public function it_requires_inventory_adjust_permission_to_resolve_alert()
    {
        // Remove inventory.adjust permission from user
        $this->user->revokePermissionTo('inventory.adjust');
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        
        // User without inventory.adjust permission
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/{$this->alert->id}/resolve", [
                'notes' => 'Stock replenished',
            ]);

        $response->assertStatus(403);

        // Grant permission
        $role = Role::where('tenant_id', $this->tenant->id)
            ->where('name', 'admin')
            ->first();
        
        if (!$role->hasPermissionTo('inventory.adjust', 'api')) {
            $role->givePermissionTo('inventory.adjust');
        }
        
        $this->user->assignRole($role);
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Now should work
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/{$this->alert->id}/resolve", [
                'notes' => 'Stock replenished',
            ]);

        $response->assertStatus(200);

        $this->alert->refresh();
        $this->assertEquals('resolved', $this->alert->status);
    }

    /** @test */
    public function it_dismisses_alert_with_notes()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/{$this->alert->id}/dismiss", [
                'notes' => 'Product being discontinued',
            ]);

        $response->assertStatus(200);

        $this->alert->refresh();
        $this->assertEquals('dismissed', $this->alert->status);
        $this->assertEquals('Product being discontinued', $this->alert->dismissed_notes);
        $this->assertEquals($this->user->id, $this->alert->dismissed_by);
        $this->assertNotNull($this->alert->dismissed_at);
    }

    /** @test */
    public function it_returns_low_stock_products_list()
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/low-stock-products");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'tenant_id',
                        'name',
                        'sku',
                        'stock',
                        'reorder_point',
                        'reorder_quantity',
                        'stock_status',
                        'stock_status_color',
                        'stock_percentage',
                        'recommended_order_quantity',
                        'category',
                        'price',
                        'needs_reorder',
                        'has_active_alert',
                        'updated_at',
                    ],
                ],
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
                'summary' => [
                    'total_low_stock_products',
                    'critical_products',
                    'out_of_stock_products',
                ],
            ]);

        $this->assertCount(1, $response->json('data'));
    }

    /** @test */
    public function it_enforces_tenant_isolation_on_alerts()
    {
        // Create another tenant and product
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
            'stock' => 5,
            'min_stock' => 10,
            'price' => 10000,
            'cost' => 5000,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        $otherAlert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'product_id' => $otherProduct->id,
            'alert_type' => 'low_stock',
            'severity' => 'critical',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        // Try to access other tenant's alert
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$otherTenant->id}/stock-alerts");

        // Should be forbidden (403) or empty (depending on middleware)
        // Current implementation returns 403 via SetPermissionsTeamFromTenant middleware
        $this->assertTrue(
            $response->status() === 403 || 
            (count($response->json('data', [])) === 0)
        );

        // Try to acknowledge other tenant's alert
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$otherTenant->id}/stock-alerts/{$otherAlert->id}/acknowledge");

        $this->assertTrue($response->status() === 403 || $response->status() === 404);
    }

    /** @test */
    public function it_prevents_duplicate_alert_acknowledgment()
    {
        // First acknowledgment
        $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/{$this->alert->id}/acknowledge", [
                'notes' => 'First acknowledgment',
            ]);

        // Second acknowledgment should fail (or do nothing)
        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts/{$this->alert->id}/acknowledge", [
                'notes' => 'Second acknowledgment',
            ]);

        // Should return error or success with no change
        $this->alert->refresh();
        $this->assertEquals('acknowledged', $this->alert->status);
        $this->assertEquals('First acknowledgment', $this->alert->acknowledged_notes);
    }

    /** @test */
    public function it_requires_authentication()
    {
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts");

        $response->assertStatus(401);
    }

    /** @test */
    public function it_paginates_alerts()
    {
        // Create 25 alerts
        for ($i = 0; $i < 24; $i++) {
            StockAlert::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $this->tenant->id,
                'product_id' => $this->product->id,
                'alert_type' => 'low_stock',
                'severity' => $i % 3 === 0 ? 'critical' : 'low',
                'current_stock' => $i,
                'reorder_point' => 10,
                'status' => 'pending',
            ]);
        }

        // First page
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts?per_page=20");

        $response->assertStatus(200);
        $this->assertCount(20, $response->json('data'));
        $this->assertEquals(25, $response->json('pagination.total'));

        // Second page
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts?per_page=20&page=2");

        $response->assertStatus(200);
        $this->assertCount(5, $response->json('data'));
    }

    /** @test */
    public function it_sorts_alerts_by_created_at()
    {
        // Create alerts with different timestamps
        $alert1 = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
            'created_at' => now()->subDays(2),
        ]);

        $alert2 = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'critical',
            'current_stock' => 2,
            'reorder_point' => 10,
            'status' => 'pending',
            'created_at' => now()->subDay(),
        ]);

        // Sort descending (newest first)
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/stock-alerts?sort_by=created_at&sort_order=desc");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        
        // Most recent should be first
        $this->assertEquals($alert2->id, $ids[0]);
    }
}