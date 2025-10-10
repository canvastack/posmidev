<?php

namespace Tests\Unit;

use Tests\TestCase;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

/**
 * InventoryTransaction Model Unit Tests
 * 
 * Tests model methods, relationships, immutability, and audit trail functionality.
 * Part of BOM Engine Phase 1 - Day 5: Model Tests
 */
class InventoryTransactionModelTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Material $material;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => Str::uuid(),
            'name' => 'Test Tenant',
            'code' => 'TEST',
            'status' => 'active',
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

        $this->user = User::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test User',
            'email' => 'test@inventory.com',
            'password' => bcrypt('password'),
        ]);
    }

    /** @test */
    public function it_uses_uuid_as_primary_key()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertIsString($transaction->id);
        $this->assertEquals(36, strlen($transaction->id));
    }

    /** @test */
    public function it_requires_tenant_id()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);

        InventoryTransaction::create([
            'id' => Str::uuid(),
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);
    }

    /** @test */
    public function it_has_tenant_relationship()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $transaction->tenant);
        $this->assertEquals($this->tenant->id, $transaction->tenant->id);
    }

    /** @test */
    public function it_has_material_relationship()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertInstanceOf(Material::class, $transaction->material);
        $this->assertEquals($this->material->id, $transaction->material->id);
    }

    /** @test */
    public function it_has_performed_by_user_relationship()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertInstanceOf(User::class, $transaction->user);
        $this->assertEquals($this->user->id, $transaction->user->id);
    }

    /** @test */
    public function it_has_polymorphic_reference_relationship()
    {
        $referenceId = Str::uuid();
        
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -10.0,
            'quantity_before' => 100.0,
            'quantity_after' => 90.0,
            'reason' => 'production',
            'reference_type' => 'order',
            'reference_id' => $referenceId,
            'user_id' => $this->user->id,
        ]);

        $this->assertEquals('order', $transaction->reference_type);
        $this->assertEquals($referenceId, $transaction->reference_id);
    }

    /** @test */
    public function it_is_immutable_no_updated_at()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        // Should have created_at but not updated_at
        $this->assertNotNull($transaction->created_at);
        $this->assertNull($transaction->updated_at);
    }

    /** @test */
    public function it_records_stock_snapshots()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertEquals(100.0, $transaction->quantity_before);
        $this->assertEquals(150.0, $transaction->quantity_after);
        $this->assertEquals(50.0, $transaction->quantity_change);
    }

    /** @test */
    public function it_calculates_stock_change_accessor()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -30.0,
            'quantity_before' => 100.0,
            'quantity_after' => 70.0,
            'reason' => 'production',
            'user_id' => $this->user->id,
        ]);

        // quantity_change should be -30
        $this->assertEquals(-30.0, $transaction->quantity_change);
    }

    /** @test */
    public function it_determines_if_increase()
    {
        $increase = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertTrue($increase->is_increase);

        $decrease = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -30.0,
            'quantity_before' => 100.0,
            'quantity_after' => 70.0,
            'reason' => 'production',
            'user_id' => $this->user->id,
        ]);

        $this->assertFalse($decrease->is_increase);
    }

    /** @test */
    public function it_determines_if_decrease()
    {
        $decrease = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -30.0,
            'quantity_before' => 100.0,
            'quantity_after' => 70.0,
            'reason' => 'production',
            'user_id' => $this->user->id,
        ]);

        $this->assertTrue($decrease->is_decrease);

        $increase = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertFalse($increase->is_decrease);
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

        $t1 = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
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

        $otherUser = User::create([
            'id' => Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other User',
            'email' => 'other@test.com',
            'password' => bcrypt('password'),
        ]);

        $t2 = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'material_id' => $otherMaterial->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $otherUser->id,
        ]);

        $tenantTransactions = InventoryTransaction::forTenant($this->tenant->id)->get();
        $this->assertCount(1, $tenantTransactions);
        $this->assertEquals($t1->id, $tenantTransactions->first()->id);
    }

    /** @test */
    public function it_scopes_by_transaction_type()
    {
        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -30.0,
            'quantity_before' => 150.0,
            'quantity_after' => 120.0,
            'reason' => 'production',
            'user_id' => $this->user->id,
        ]);

        $adjustments = InventoryTransaction::byType('adjustment')->get();
        $this->assertCount(1, $adjustments);
        $this->assertEquals('adjustment', $adjustments->first()->transaction_type);

        $deductions = InventoryTransaction::byType('deduction')->get();
        $this->assertCount(1, $deductions);
        $this->assertEquals('deduction', $deductions->first()->transaction_type);
    }

    /** @test */
    public function it_scopes_by_reason()
    {
        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -30.0,
            'quantity_before' => 150.0,
            'quantity_after' => 120.0,
            'reason' => 'production',
            'user_id' => $this->user->id,
        ]);

        $purchases = InventoryTransaction::byReason('purchase')->get();
        $this->assertCount(1, $purchases);
        $this->assertEquals('purchase', $purchases->first()->reason);
    }

    /** @test */
    public function it_scopes_by_material()
    {
        $material2 = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-002',
            'name' => 'Material 2',
            'unit' => 'L',
            'unit_cost' => 5.0,
            'stock_quantity' => 200.0,
        ]);

        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $material2->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 100.0,
            'quantity_before' => 200.0,
            'quantity_after' => 300.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $material1Transactions = InventoryTransaction::forMaterial($this->material->id)->get();
        $this->assertCount(1, $material1Transactions);
        $this->assertEquals($this->material->id, $material1Transactions->first()->material_id);
    }

    /** @test */
    public function it_scopes_by_date_range()
    {
        $oldTransaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);
        
        // Manually set created_at to older date
        $oldTransaction->created_at = now()->subDays(10);
        $oldTransaction->save();

        $newTransaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 30.0,
            'quantity_before' => 150.0,
            'quantity_after' => 180.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $recent = InventoryTransaction::inDateRange(now()->subDays(5), now())->get();
        $this->assertCount(1, $recent);
        $this->assertEquals($newTransaction->id, $recent->first()->id);
    }

    /** @test */
    public function it_provides_summary_statistics()
    {
        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'deduction',
            'quantity_change' => -30.0,
            'quantity_before' => 150.0,
            'quantity_after' => 120.0,
            'reason' => 'production',
            'user_id' => $this->user->id,
        ]);

        $summary = InventoryTransaction::getSummaryForMaterial($this->material->id, $this->tenant->id);

        $this->assertEquals(2, $summary['total_transactions']);
        $this->assertEquals(50.0, $summary['total_increase']);
        $this->assertEquals(30.0, $summary['total_decrease']);
        $this->assertEquals(20.0, $summary['net_change']);
    }

    /** @test */
    public function it_casts_attributes_correctly()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.567,
            'quantity_before' => 100.123,
            'quantity_after' => 150.690,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertIsString($transaction->quantity_change);
        $this->assertIsString($transaction->quantity_before);
        $this->assertIsString($transaction->quantity_after);
    }

    /** @test */
    public function it_formats_dates_correctly()
    {
        $transaction = InventoryTransaction::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'material_id' => $this->material->id,
            'transaction_type' => 'adjustment',
            'quantity_change' => 50.0,
            'quantity_before' => 100.0,
            'quantity_after' => 150.0,
            'reason' => 'purchase',
            'user_id' => $this->user->id,
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $transaction->created_at);
    }
}