<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class OrdersApiTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function test_can_list_orders_with_pagination(): void
    {
        // Create multiple orders
        $product = $this->createTestProduct();
        $this->createTestOrder($product['id'], 2);
        $this->createTestOrder($product['id'], 1);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $this->assertPaginationStructure($response->json());

        $data = $response->json();
        $this->assertCount(2, $data['data']);
        $this->assertEquals(2, $data['total']);
    }

    /** @test */
    public function test_can_create_order_with_valid_data(): void
    {
        $product = $this->createTestProduct();
        $customer = $this->createTestCustomer();

        $orderData = [
            'items' => [
                [
                    'product_id' => $product['id'],
                    'quantity' => 2
                ]
            ],
            'payment_method' => 'cash',
            'amount_paid' => 200.00,
            'customer_id' => $customer['id'],
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $orderData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals(200.00, $data['total_amount']);
        $this->assertEquals('cash', $data['payment_method']);
        $this->assertEquals(200.00, $data['amount_paid']);
        $this->assertEquals(0.00, $data['change_amount']);
        $this->assertCount(1, $data['items']);
        $this->assertEquals($product['id'], $data['items'][0]['product_id']);
        $this->assertEquals(2, $data['items'][0]['quantity']);
        $this->assertEquals($product['data']['price'], $data['items'][0]['price']);
    }

    /** @test */
    public function test_can_create_order_without_customer(): void
    {
        $product = $this->createTestProduct();

        $orderData = [
            'items' => [
                [
                    'product_id' => $product['id'],
                    'quantity' => 1
                ]
            ],
            'payment_method' => 'card',
            'amount_paid' => 100.00,
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $orderData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals(100.00, $data['total_amount']);
        $this->assertEquals('card', $data['payment_method']);
        $this->assertNull($data['customer_id'] ?? null);
    }

    /** @test */
    public function test_can_show_single_order(): void
    {
        $product = $this->createTestProduct();
        $order = $this->createTestOrder($product['id'], 3);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/orders/{$order['id']}",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($order['id'], $data['id']);
        $this->assertEquals(300.00, $data['total_amount']); // 3 * 100
        $this->assertCount(1, $data['items']);
        $this->assertEquals($product['id'], $data['items'][0]['product_id']);
        $this->assertEquals(3, $data['items'][0]['quantity']);
    }

    /** @test */
    public function test_cannot_create_order_with_insufficient_stock(): void
    {
        $product = $this->createTestProduct();

        // Update product stock to 2
        $updateResponse = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product['id']}",
            [
                'name' => $product['data']['name'],
                'sku' => $product['data']['sku'],
                'price' => $product['data']['price'],
                'description' => $product['data']['description'],
                'stock' => 2,
                'cost_price' => $product['data']['cost_price'],
            ],
            $this->authenticatedRequest()['headers']
        );

        $updateResponse->assertOk();

        // Debug: Verify stock was updated
        $verifyResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product['id']}",
            $this->authenticatedRequest()['headers']
        );

        $verifyResponse->assertOk();
        $updatedProduct = $verifyResponse->json('data') ?? $verifyResponse->json();
        \Illuminate\Support\Facades\Log::info('Stock update verification', [
            'product_id' => $product['id'],
            'original_stock' => $product['data']['stock'],
            'update_response_status' => $updateResponse->status(),
            'update_response_content' => $updateResponse->json(),
            'verify_response_status' => $verifyResponse->status(),
            'verify_response_content' => $updatedProduct,
            'expected_stock' => 2,
            'actual_stock' => $updatedProduct['stock'] ?? 'not_found'
        ]);

        // Try to order 5 items when only 2 are available
        $orderData = [
            'items' => [
                [
                    'product_id' => $product['id'],
                    'quantity' => 5
                ]
            ],
            'payment_method' => 'cash',
            'amount_paid' => 500.00,
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $orderData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(422);

        // Debug: Check actual response structure
        $responseData = $response->json();
        \Illuminate\Support\Facades\Log::info('Stock validation response', [
            'status' => $response->status(),
            'response_data' => $responseData,
            'has_errors' => isset($responseData['errors']),
            'has_message' => isset($responseData['message']),
            'all_keys' => array_keys($responseData ?? [])
        ]);

        // Check if response has either 'errors' or 'message' key
        $this->assertTrue(
            isset($responseData['errors']) || isset($responseData['message']),
            'Response should have either "errors" or "message" key for validation failure'
        );
    }

    /** @test */
    public function test_order_calculates_totals_correctly(): void
    {
        $product1 = $this->createTestProduct();
        $product2 = $this->createTestProduct();

        $orderData = [
            'items' => [
                [
                    'product_id' => $product1['id'],
                    'quantity' => 2
                ],
                [
                    'product_id' => $product2['id'],
                    'quantity' => 3
                ]
            ],
            'payment_method' => 'cash',
            'amount_paid' => 800.00,
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $orderData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        // Total should be (2 * 100) + (3 * 100) = 500
        $this->assertEquals(500.00, $data['total_amount']);
        $this->assertEquals(800.00, $data['amount_paid']);
        $this->assertEquals(300.00, $data['change_amount']);
    }

    /** @test */
    public function test_unauthorized_user_cannot_access_orders(): void
    {
        $unauthorizedUser = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Unauthorized User',
            'email' => 'unauthorder@test.com',
            'password' => bcrypt('password'),
        ]);

        $unauthorizedToken = $unauthorizedUser->createToken('unauth-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $unauthorizedToken,
            'Accept' => 'application/json',
        ];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $headers
        );

        $response->assertForbidden();
    }

    /** @test */
    public function test_validation_errors_for_invalid_order_data(): void
    {
        $invalidData = [
            'items' => [], // Empty items
            'payment_method' => 'invalid_method',
            'amount_paid' => -100, // Negative amount
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $invalidData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items', 'payment_method', 'amount_paid']);
    }

    /** @test */
    public function test_can_create_order_with_multiple_products(): void
    {
        $product1 = $this->createTestProduct();
        $product2 = $this->createTestProduct();
        $product3 = $this->createTestProduct();

        $orderData = [
            'items' => [
                ['product_id' => $product1['id'], 'quantity' => 1],
                ['product_id' => $product2['id'], 'quantity' => 2],
                ['product_id' => $product3['id'], 'quantity' => 3],
            ],
            'payment_method' => 'qris',
            'amount_paid' => 700.00,
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $orderData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals(600.00, $data['total_amount']); // 1*100 + 2*100 + 3*100
        $this->assertEquals('qris', $data['payment_method']);
        $this->assertCount(3, $data['items']);

        // Verify each item
        $this->assertEquals($product1['id'], $data['items'][0]['product_id']);
        $this->assertEquals(1, $data['items'][0]['quantity']);

        $this->assertEquals($product2['id'], $data['items'][1]['product_id']);
        $this->assertEquals(2, $data['items'][1]['quantity']);

        $this->assertEquals($product3['id'], $data['items'][2]['product_id']);
        $this->assertEquals(3, $data['items'][2]['quantity']);
    }
}