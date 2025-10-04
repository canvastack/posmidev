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
        $product = $this->createTestProduct();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode",
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
        $product = $this->createTestProduct();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode?type=code128",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
    }

    /** @test */
    public function test_can_generate_ean13_barcode(): void
    {
        // Create product with 13-digit SKU for EAN13
        $product = $this->createTestProduct([
            'sku' => '1234567890123',
        ]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode?type=ean13",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
    }

    /** @test */
    public function test_can_generate_qr_code(): void
    {
        $product = $this->createTestProduct();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode?type=qr",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
    }

    /** @test */
    public function test_can_generate_barcode_in_svg_format(): void
    {
        $product = $this->createTestProduct();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode?format=svg",
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
        $product = $this->createTestProduct();

        $sizes = ['small', 'medium', 'large'];

        foreach ($sizes as $size) {
            $response = $this->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode?size={$size}",
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
        // Create another tenant with product
        $otherTenant = $this->createOtherTenant();
        $product = $this->createTestProduct(['tenant_id' => $otherTenant->id]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode",
            $this->authenticatedRequest()['headers']
        );

        $response->assertNotFound();
    }

    /** @test */
    public function test_cannot_generate_barcode_without_permission(): void
    {
        $product = $this->createTestProduct();
        
        // Create user without products.view permission
        $userWithoutPermission = $this->createUserWithoutPermissions();

        $response = $this->actingAs($userWithoutPermission, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode");

        $response->assertForbidden();
    }

    /** @test */
    public function test_can_generate_bulk_barcode_pdf(): void
    {
        $product1 = $this->createTestProduct();
        $product2 = $this->createTestProduct();
        $product3 = $this->createTestProduct();

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product1->id, $product2->id, $product3->id],
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
        $product = $this->createTestProduct();

        $layouts = ['4x6', '2x7', '1x10'];

        foreach ($layouts as $layout) {
            $response = $this->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
                [
                    'product_ids' => [$product->id],
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
        $product = $this->createTestProduct();

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product->id],
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
        $product = $this->createTestProduct();

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product->id],
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
        $product = $this->createTestProduct();

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product->id],
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
        $product = $this->createTestProduct();
        $userWithoutPermission = $this->createUserWithoutPermissions();

        $response = $this->actingAs($userWithoutPermission, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
                [
                    'product_ids' => [$product->id],
                    'barcode_type' => 'code128',
                    'layout' => '4x6',
                ]
            );

        $response->assertForbidden();
    }

    /** @test */
    public function test_bulk_barcode_filters_products_by_tenant(): void
    {
        $ownProduct = $this->createTestProduct();
        
        // Create another tenant with product
        $otherTenant = $this->createOtherTenant();
        $otherProduct = $this->createTestProduct(['tenant_id' => $otherTenant->id]);

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$ownProduct->id, $otherProduct->id],
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
        $product1 = $this->createTestProduct();
        $product2 = $this->createTestProduct();

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product1->id, $product2->id],
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
        $product = $this->createTestProduct();

        // Test single barcode endpoint
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product->id}/barcode"
        );
        $response->assertUnauthorized();

        // Test bulk barcode endpoint
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/barcode/bulk",
            [
                'product_ids' => [$product->id],
                'barcode_type' => 'code128',
                'layout' => '4x6',
            ]
        );
        $response->assertUnauthorized();
    }
}