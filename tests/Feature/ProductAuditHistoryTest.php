<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Category;
use App\Models\ProductPriceHistory;
use App\Models\ProductStockHistory;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class ProductAuditHistoryTest extends TestCase
{
    use TenantTestTrait;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        // Use tenant test trait to set up tenant, user, and permissions
        $this->setUpTenantWithAdminUser();

        // Create category for tests
        $this->category = Category::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Category',
            'description' => 'Category for testing',
        ]);
    }

    /** @test */
    public function it_logs_product_creation_in_activity_log()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Test Product',
            'sku' => 'TEST-001',
            'description' => 'Initial description',
            'price' => 100.00,
            'cost_price' => 60.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Verify activity log entry was created
        $activity = Activity::where('subject_id', $product->id)
            ->where('subject_type', Product::class)
            ->where('event', 'created')
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals($this->user->id, $activity->causer_id);
        $this->assertEquals($this->tenant->id, $activity->tenant_id);
        $this->assertArrayHasKey('name', $activity->properties['attributes']);
        $this->assertEquals('Test Product', $activity->properties['attributes']['name']);
    }

    /** @test */
    public function it_tracks_price_changes_in_dedicated_table()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Price Test Product',
            'sku' => 'PRICE-001',
            'price' => 100.00,
            'cost_price' => 60.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Update price
        $product->update([
            'price' => 120.00,
            'cost_price' => 70.00,
        ]);

        // Verify price history was recorded
        $priceHistory = ProductPriceHistory::where('product_id', $product->id)->first();

        $this->assertNotNull($priceHistory);
        $this->assertEquals(100.00, $priceHistory->old_price);
        $this->assertEquals(120.00, $priceHistory->new_price);
        $this->assertEquals(60.00, $priceHistory->old_cost_price);
        $this->assertEquals(70.00, $priceHistory->new_cost_price);
        $this->assertEquals($this->user->id, $priceHistory->changed_by);
        $this->assertEquals($this->tenant->id, $priceHistory->tenant_id);
    }

    /** @test */
    public function it_tracks_stock_changes_in_dedicated_table()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Stock Test Product',
            'sku' => 'STOCK-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Update stock
        $product->update(['stock' => 75]);

        // Verify stock history was recorded
        $stockHistory = ProductStockHistory::where('product_id', $product->id)->first();

        $this->assertNotNull($stockHistory);
        $this->assertEquals(50, $stockHistory->old_stock);
        $this->assertEquals(75, $stockHistory->new_stock);
        $this->assertEquals($this->user->id, $stockHistory->changed_by);
        $this->assertEquals($this->tenant->id, $stockHistory->tenant_id);
    }

    /** @test */
    public function it_returns_complete_product_history_via_api()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'History Test Product',
            'sku' => 'HIST-001',
            'description' => 'Original description',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Make some changes
        $product->update(['name' => 'Updated Product Name']);
        $product->update(['description' => 'Updated description']);

        // Call API endpoint
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'event',
                        'description',
                        'properties',
                        'causer',
                        'created_at',
                    ]
                ],
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
                'meta' => [
                    'product_id',
                    'product_name',
                ]
            ]);

        // Should have 3 activity logs (created + 2 updates)
        $this->assertGreaterThanOrEqual(3, count($response->json('data')));
    }

    /** @test */
    public function it_returns_price_history_via_api()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Price API Test',
            'sku' => 'PRICE-API-001',
            'price' => 100.00,
            'cost_price' => 60.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Make price changes
        $product->update(['price' => 120.00]);
        $product->update(['price' => 150.00, 'cost_price' => 80.00]);

        // Call API endpoint
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history/price");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'old_price',
                        'new_price',
                        'price_change',
                        'price_change_percentage',
                        'changed_by',
                        'changed_at',
                    ]
                ],
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
                'meta' => [
                    'product_id',
                    'product_name',
                    'current_price',
                    'current_cost_price',
                ]
            ]);

        // Should have 2 price changes
        $this->assertCount(2, $response->json('data'));
    }

    /** @test */
    public function it_returns_stock_history_via_api()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Stock API Test',
            'sku' => 'STOCK-API-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Make stock changes
        $product->update(['stock' => 75]);
        $product->update(['stock' => 30]);

        // Call API endpoint
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history/stock");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'old_stock',
                        'new_stock',
                        'change_amount',
                        'change_direction',
                        'changed_by',
                        'changed_at',
                    ]
                ],
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
                'meta' => [
                    'product_id',
                    'product_name',
                    'current_stock',
                ]
            ]);

        // Should have 2 stock changes
        $this->assertCount(2, $response->json('data'));

        // Verify change directions (ordered DESC, so newest first)
        $firstChange = $response->json('data.0'); // Most recent: 75 -> 30
        $this->assertEquals('decrease', $firstChange['change_direction']);
        
        $secondChange = $response->json('data.1'); // Earlier: 50 -> 75
        $this->assertEquals('increase', $secondChange['change_direction']);
    }

    /** @test */
    public function it_enforces_tenant_isolation_for_history_endpoints()
    {
        $this->actingAs($this->user, 'api');

        // Create product in THIS tenant
        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Tenant Isolation Test',
            'sku' => 'ISOLATE-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Create another tenant
        $otherTenant = Tenant::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'name' => 'Other Tenant',
            'domain' => 'other.local',
            'status' => 'active',
        ]);

        // Try to access product history via OTHER tenant endpoint (should fail)
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson("/api/v1/tenants/{$otherTenant->id}/products/{$product->id}/history");

        $response->assertStatus(404);
    }

    /** @test */
    public function it_requires_authentication_for_history_endpoints()
    {
        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Auth Test Product',
            'sku' => 'AUTH-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Try without authentication
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history");
        $response->assertStatus(401);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history/price");
        $response->assertStatus(401);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history/stock");
        $response->assertStatus(401);
    }

    /** @test */
    public function it_requires_products_view_permission_for_history_endpoints()
    {
        // Create user WITHOUT products.view permission
        $unauthorizedUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Unauthorized User',
            'email' => 'unauthorized@test.local',
        ]);

        $role = Role::create([
            'name' => 'Limited Role',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);

        $unauthorizedUser->assignRole($role);
        $token = $unauthorizedUser->createToken('test-token')->plainTextToken;

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Permission Test Product',
            'sku' => 'PERM-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Try to access history endpoints (should be forbidden)
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history");

        $response->assertStatus(403);
    }

    /** @test */
    public function it_calculates_price_change_percentage_correctly()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Percentage Test',
            'sku' => 'PCT-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Increase by 20%
        $product->update(['price' => 120.00]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history/price");

        $response->assertStatus(200);

        $priceChange = $response->json('data.0');
        $this->assertEquals(20.00, $priceChange['price_change']);
        $this->assertEquals(20.0, $priceChange['price_change_percentage']);
    }

    /** @test */
    public function it_detects_stock_change_direction_correctly()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Direction Test',
            'sku' => 'DIR-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        // Increase stock
        $product->update(['stock' => 75]);

        // Decrease stock
        $product->update(['stock' => 30]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history/stock");

        $response->assertStatus(200);

        $stockChanges = $response->json('data');
        
        // Results are ordered DESC (newest first)
        // First item: 75 -> 30 (decrease)
        $this->assertEquals('decrease', $stockChanges[0]['change_direction']);
        $this->assertEquals(-45, $stockChanges[0]['change_amount']);

        // Second item: 50 -> 75 (increase)
        $this->assertEquals('increase', $stockChanges[1]['change_direction']);
        $this->assertEquals(25, $stockChanges[1]['change_amount']);
    }

    /** @test */
    public function it_includes_user_attribution_in_history()
    {
        $this->actingAs($this->user, 'api');

        $product = Product::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenant->id,
            'category_id' => $this->category->id,
            'name' => 'Attribution Test',
            'sku' => 'ATTR-001',
            'price' => 100.00,
            'stock' => 50,
            'status' => 'active',
        ]);

        $product->update(['price' => 120.00]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/history/price");

        $response->assertStatus(200);

        $priceChange = $response->json('data.0');
        $this->assertNotNull($priceChange['changed_by']);
        $this->assertEquals($this->user->id, $priceChange['changed_by']['id']);
        $this->assertEquals($this->user->name, $priceChange['changed_by']['name']);
        $this->assertEquals($this->user->email, $priceChange['changed_by']['email']);
    }
}