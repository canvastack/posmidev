<?php

namespace Tests\Unit;

use Tests\TestCase;
use Src\Pms\Infrastructure\Models\StockAlert;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Stock Alert Model Unit Tests
 * 
 * Tests model methods, relationships, and business logic.
 */
class StockAlertModelTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Product $product;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Tenant',
            'code' => 'TEST',
            'status' => 'active',
        ]);

        $this->product = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'code' => 'TEST-001',
            'sku' => 'SKU-TEST-001',
            'stock' => 5,
            'min_stock' => 10,
            'price' => 10000,
            'cost' => 5000,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        $this->user = User::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);
    }

    /** @test */
    public function it_has_product_relationship()
    {
        $alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        $this->assertInstanceOf(Product::class, $alert->product);
        $this->assertEquals($this->product->id, $alert->product->id);
    }

    /** @test */
    public function it_has_tenant_relationship()
    {
        $alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        $this->assertInstanceOf(Tenant::class, $alert->tenant);
        $this->assertEquals($this->tenant->id, $alert->tenant->id);
    }

    /** @test */
    public function it_has_acknowledged_by_user_relationship()
    {
        $alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'acknowledged',
            'acknowledged_by' => $this->user->id,
            'acknowledged_at' => now(),
        ]);

        $this->assertInstanceOf(User::class, $alert->acknowledgedByUser);
        $this->assertEquals($this->user->id, $alert->acknowledgedByUser->id);
    }

    /** @test */
    public function it_has_resolved_by_user_relationship()
    {
        $alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'resolved',
            'resolved_by' => $this->user->id,
            'resolved_at' => now(),
        ]);

        $this->assertInstanceOf(User::class, $alert->resolvedByUser);
        $this->assertEquals($this->user->id, $alert->resolvedByUser->id);
    }

    /** @test */
    public function it_has_dismissed_by_user_relationship()
    {
        $alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'dismissed',
            'dismissed_by' => $this->user->id,
            'dismissed_at' => now(),
        ]);

        $this->assertInstanceOf(User::class, $alert->dismissedByUser);
        $this->assertEquals($this->user->id, $alert->dismissedByUser->id);
    }

    /** @test */
    public function it_calculates_severity_correctly()
    {
        // Out of stock
        $alert = new StockAlert([
            'current_stock' => 0,
            'reorder_point' => 10,
        ]);
        $this->assertEquals('out_of_stock', $alert->calculateSeverity());

        // Critical (< 50% of reorder point)
        $alert = new StockAlert([
            'current_stock' => 4,
            'reorder_point' => 10,
        ]);
        $this->assertEquals('critical', $alert->calculateSeverity());

        // Low (>= 50% of reorder point)
        $alert = new StockAlert([
            'current_stock' => 6,
            'reorder_point' => 10,
        ]);
        $this->assertEquals('low', $alert->calculateSeverity());
    }

    /** @test */
    public function it_checks_if_actionable()
    {
        $alert = new StockAlert(['status' => 'pending']);
        $this->assertTrue($alert->isActionable());

        $alert = new StockAlert(['status' => 'acknowledged']);
        $this->assertTrue($alert->isActionable());

        $alert = new StockAlert(['status' => 'resolved']);
        $this->assertFalse($alert->isActionable());

        $alert = new StockAlert(['status' => 'dismissed']);
        $this->assertFalse($alert->isActionable());
    }

    /** @test */
    public function it_checks_if_critical()
    {
        $alert = new StockAlert(['severity' => 'critical']);
        $this->assertTrue($alert->isCritical());

        $alert = new StockAlert(['severity' => 'out_of_stock']);
        $this->assertTrue($alert->isCritical());

        $alert = new StockAlert(['severity' => 'low']);
        $this->assertFalse($alert->isCritical());
    }

    /** @test */
    public function it_checks_if_resolved()
    {
        $alert = new StockAlert(['status' => 'resolved']);
        $this->assertTrue($alert->isResolved());

        $alert = new StockAlert(['status' => 'pending']);
        $this->assertFalse($alert->isResolved());
    }

    /** @test */
    public function it_scopes_to_pending_alerts()
    {
        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'resolved',
        ]);

        $pending = StockAlert::pending()->get();
        $this->assertCount(1, $pending);
        $this->assertEquals('pending', $pending->first()->status);
    }

    /** @test */
    public function it_scopes_to_acknowledged_alerts()
    {
        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
            'acknowledged_by' => $this->user->id,
        ]);

        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        $acknowledged = StockAlert::acknowledged()->get();
        $this->assertCount(1, $acknowledged);
        $this->assertEquals('acknowledged', $acknowledged->first()->status);
    }

    /** @test */
    public function it_scopes_to_critical_alerts()
    {
        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'critical',
            'current_stock' => 2,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        $critical = StockAlert::critical()->get();
        $this->assertCount(1, $critical);
        $this->assertEquals('critical', $critical->first()->severity);
    }

    /** @test */
    public function it_scopes_to_actionable_alerts()
    {
        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'resolved',
        ]);

        $actionable = StockAlert::actionable()->get();
        $this->assertCount(1, $actionable);
        $this->assertTrue($actionable->first()->isActionable());
    }

    /** @test */
    public function it_uses_uuid_as_primary_key()
    {
        $alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        $this->assertIsString($alert->id);
        $this->assertEquals(36, strlen($alert->id)); // UUID length
    }

    /** @test */
    public function it_requires_tenant_id()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);

        StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);
    }

    /** @test */
    public function it_formats_dates_correctly()
    {
        $alert = StockAlert::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'alert_type' => 'low_stock',
            'severity' => 'low',
            'current_stock' => 5,
            'reorder_point' => 10,
            'status' => 'pending',
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $alert->created_at);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $alert->updated_at);
    }
}