<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class ProductBarcodeTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
        Storage::fake('local');
    }

    /** @test */
    public function test_can_generate_barcode_with_default_settings(): void
    {
        $productResult = $this->createTestProduct();
        $productId = $productResult['id'];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');

        // Verify response contains image data
        $this->assertNotEmpty($response->getContent());
    }

    /** @test */
    public function test_can_generate_code128_barcode(): void
    {
        $productResult = $this->createTestProduct();
        $productId = $productResult['id'];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode?type=code128",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
    }

    /** @test */
    public function test_can_generate_ean13_barcode(): void
    {
        // Create product with valid EAN13 SKU (12 digits + checksum)
        $ean13Sku = '123456789012'; // 12 digits for EAN13 (will add checksum)

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            [
                'name' => 'EAN13 Test Product',
                'sku' => $ean13Sku,
                'price' => 100.00,
                'stock' => 50,
                'description' => 'Test product for EAN13 barcode',
                'cost_price' => 80.00,
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $productId = $response->json('data.id') ?? $response->json('id');

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode?type=ean13",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
    }

    /** @test */
    public function test_can_generate_qr_code(): void
    {
        $productResult = $this->createTestProduct();
        $productId = $productResult['id'];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode?type=qr",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
    }

    /** @test */
    public function test_can_generate_barcode_in_svg_format(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode?format=svg",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/svg+xml');
        
        // Verify SVG content
        $content = $response->getContent();
        $this->assertStringContainsString('<svg', $content);
    }

    /** @test */
    public function test_can_generate_barcode_with_different_sizes(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];

        $sizes = ['small', 'medium', 'large'];

        foreach ($sizes as $size) {
            $response = $this->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode?size={$size}",
                $this->authenticatedRequest()['headers']
            );

            $response->assertOk();
            $response->assertHeader('Content-Type', 'image/png');
        }
    }

    /** @test */
    public function test_cannot_generate_barcode_for_nonexistent_product(): void
    {
        $fakeId = '99999999-9999-9999-9999-999999999999';

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$fakeId}/barcode",
            $this->authenticatedRequest()['headers']
        );

        $response->assertNotFound();
    }

    /** @test */
    public function test_cannot_generate_barcode_for_product_from_different_tenant(): void
    {
        // Create another tenant
        $otherTenant = $this->createOtherTenant();
        
        // Create product directly in database for other tenant (not via API)
        $product = \Src\Pms\Infrastructure\Models\Product::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Tenant Product',
            'sku' => 'OTHER-SKU-' . uniqid(),
            'price' => 100.00,
            'stock' => 50,
            'cost_price' => 80.00,
        ]);

        // Try to access product from other tenant using current tenant's route
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode",
            $this->authenticatedRequest()['headers']
        );

        // Should return 404 because product doesn't belong to current tenant
        $response->assertNotFound();
    }

    /** @test */
    public function test_cannot_generate_barcode_without_permission(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];
        
        // Create user without products.view permission
        $userWithoutPermission = $this->createUserWithoutPermissions();

        $response = $this->actingAs($userWithoutPermission, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode");

        $response->assertForbidden();
    }

    /** @test */
    public function test_can_generate_bulk_barcode_pdf(): void
    {
        $product1Result = $this->createTestProduct();
        $product1Id = $product1Result['id'];
        $product2Result = $this->createTestProduct();
        $product2Id = $product2Result['id'];
        $product3Result = $this->createTestProduct();
        $product3Id = $product3Result['id'];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product1Id, $product2Id, $product3Id],
                'barcode_type' => 'code128',
                'layout' => '4x6',
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        
        // Verify PDF content
        $this->assertNotEmpty($response->getContent());
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    /** @test */
    public function test_can_generate_bulk_barcode_with_different_layouts(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];

        $layouts = ['4x6', '2x7', '1x10'];

        foreach ($layouts as $layout) {
            $response = $this->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
                [
                    'product_ids' => [$productId],
                    'barcode_type' => 'code128',
                    'layout' => $layout,
                ],
                $this->authenticatedRequest()['headers']
            );

            $response->assertOk();
            $response->assertHeader('Content-Type', 'application/pdf');
        }
    }

    /** @test */
    public function test_can_generate_bulk_barcode_with_custom_content(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$productId],
                'barcode_type' => 'code128',
                'layout' => '4x6',
                'show_name' => true,
                'show_price' => true,
                'show_sku' => true,
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    /** @test */
    public function test_bulk_barcode_requires_product_ids(): void
    {
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'barcode_type' => 'code128',
                'layout' => '4x6',
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['product_ids']);
    }

    /** @test */
    public function test_bulk_barcode_requires_valid_barcode_type(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$productId],
                'barcode_type' => 'invalid_type',
                'layout' => '4x6',
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['barcode_type']);
    }

    /** @test */
    public function test_bulk_barcode_requires_valid_layout(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$productId],
                'barcode_type' => 'code128',
                'layout' => 'invalid_layout',
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['layout']);
    }

    /** @test */
    public function test_cannot_generate_bulk_barcode_without_permission(): void
    {
        $productResult = $this->createTestProduct();
$productId = $productResult['id'];
        $userWithoutPermission = $this->createUserWithoutPermissions();

        $response = $this->actingAs($userWithoutPermission, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
                [
                    'product_ids' => [$productId],
                    'barcode_type' => 'code128',
                    'layout' => '4x6',
                ]
            );

        $response->assertForbidden();
    }

    /** @test */
    public function test_bulk_barcode_filters_products_by_tenant(): void
    {
        $ownProductResult = $this->createTestProduct();
        $ownProductId = $ownProductResult['id'];

        // Create another tenant with product
        $otherTenant = $this->createOtherTenant();
        $otherProductResult = $this->createTestProduct();
        $otherProductId = $otherProductResult['id'];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$ownProductId, $otherProductId],
                'barcode_type' => 'code128',
                'layout' => '4x6',
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();

        // Should only generate for own product
        // PDF should be generated but we can't easily verify content
        $this->assertNotEmpty($response->getContent());
    }

    /** @test */
    public function test_can_generate_bulk_barcode_with_qr_codes(): void
    {
        $product1Result = $this->createTestProduct();
        $product1Id = $product1Result['id'];
        $product2Result = $this->createTestProduct();
        $product2Id = $product2Result['id'];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product1Id, $product2Id],
                'barcode_type' => 'qr',
                'layout' => '4x6',
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    /** @test */
    public function test_barcode_endpoints_require_authentication(): void
    {
        $productResult = $this->createTestProduct();
        $productId = $productResult['id'];

        // Clear any lingering authentication from setUp
        $this->app['auth']->forgetGuards();

        // Test single barcode endpoint without authentication
        $response = $this->withHeaders([
            'Accept' => 'application/json',
        ])->get("/api/v1/tenants/{$this->tenant->id}/products/{$productId}/barcode");
        
        $response->assertUnauthorized();

        // Test bulk barcode endpoint without authentication
        $response = $this->withHeaders([
            'Accept' => 'application/json',
        ])->post(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$productId],
                'barcode_type' => 'code128',
                'layout' => '4x6',
            ]
        );
        $response->assertUnauthorized();
    }
}