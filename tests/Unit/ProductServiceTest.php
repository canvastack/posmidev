<?php

namespace Tests\Unit;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Application\Services\ProductService;
use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;
use Src\Pms\Infrastructure\Models\Tenant;
use Tests\TestCase;
use Mockery;

class ProductServiceTest extends TestCase
{
    use RefreshDatabase;

    private ProductService $productService;
    private $productRepository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);

        $this->productRepository = Mockery::mock(ProductRepositoryInterface::class);
        $this->productService = new ProductService($this->productRepository);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function test_can_create_product_successfully(): void
    {
        $tenantId = (string)\Ramsey\Uuid\Uuid::uuid4();

        $this->productRepository
            ->shouldReceive('findBySku')
            ->with('TEST-SKU-001', $tenantId)
            ->once()
            ->andReturn(null);

        $product = new \Src\Pms\Core\Domain\Entities\Product(
            id: 'test-product-id',
            tenantId: $tenantId,
            name: 'Test Product',
            sku: 'TEST-SKU-001',
            price: 100.00,
            stock: 50,
            description: 'Test description',
            costPrice: 80.00,
            createdAt: new \DateTime()
        );

        $this->productRepository
            ->shouldReceive('save')
            ->once()
            ->andReturnUsing(function ($savedProduct) {
                return $savedProduct;
            });

        $createdProduct = $this->productService->createProduct(
            tenantId: $tenantId,
            name: 'Test Product',
            sku: 'TEST-SKU-001',
            price: 100.00,
            stock: 50,
            description: 'Test description',
            costPrice: 80.00
        );

        $this->assertEquals('Test Product', $createdProduct->getName());
        $this->assertEquals('TEST-SKU-001', $createdProduct->getSku());
        $this->assertEquals(100.00, $createdProduct->getPrice());
        $this->assertEquals(50, $createdProduct->getStock());
    }

    /** @test */
    public function test_cannot_create_product_with_duplicate_sku(): void
    {
        $tenantId = (string)\Ramsey\Uuid\Uuid::uuid4();

        $existingProduct = new \Src\Pms\Core\Domain\Entities\Product(
            id: 'existing-product-id',
            tenantId: $tenantId,
            name: 'Existing Product',
            sku: 'DUPLICATE-SKU',
            price: 100.00,
            stock: 10
        );

        $this->productRepository
            ->shouldReceive('findBySku')
            ->with('DUPLICATE-SKU', $tenantId)
            ->once()
            ->andReturn($existingProduct);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('SKU already exists for this tenant');

        $this->productService->createProduct(
            tenantId: $tenantId,
            name: 'New Product',
            sku: 'DUPLICATE-SKU',
            price: 150.00,
            stock: 5
        );
    }

    /** @test */
    public function test_can_update_product_successfully(): void
    {
        $product = new \Src\Pms\Core\Domain\Entities\Product(
            id: 'test-product-id',
            tenantId: (string)\Ramsey\Uuid\Uuid::uuid4(),
            name: 'Original Name',
            sku: 'ORIGINAL-SKU',
            price: 100.00,
            stock: 10
        );

        $this->productRepository
            ->shouldReceive('findById')
            ->with('test-product-id')
            ->once()
            ->andReturn($product);

        $this->productRepository
            ->shouldReceive('save')
            ->once()
            ->andReturn(null);

        $updatedProduct = $this->productService->updateProduct(
            productId: 'test-product-id',
            name: 'Updated Name',
            price: 150.00,
            description: 'Updated description'
        );

        $this->assertEquals('Updated Name', $updatedProduct->getName());
        $this->assertEquals(150.00, $updatedProduct->getPrice());
        $this->assertEquals('Updated description', $updatedProduct->getDescription());
    }

    /** @test */
    public function test_cannot_update_nonexistent_product(): void
    {
        $this->productRepository
            ->shouldReceive('findById')
            ->with('nonexistent-id')
            ->once()
            ->andReturn(null);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Product not found');

        $this->productService->updateProduct(
            productId: 'nonexistent-id',
            name: 'Updated Name',
            price: 150.00
        );
    }

    /** @test */
    public function test_can_adjust_product_stock(): void
    {
        $product = new \Src\Pms\Core\Domain\Entities\Product(
            id: 'test-product-id',
            tenantId: (string)\Ramsey\Uuid\Uuid::uuid4(),
            name: 'Stock Test Product',
            sku: 'STOCK-TEST',
            price: 100.00,
            stock: 20
        );

        $this->productRepository
            ->shouldReceive('findById')
            ->with('test-product-id')
            ->once()
            ->andReturn($product);

        $this->productRepository
            ->shouldReceive('save')
            ->once()
            ->with($product);

        $updatedProduct = $this->productService->adjustStock(
            productId: 'test-product-id',
            quantity: -5,
            reason: 'Test stock reduction'
        );

        $this->assertEquals(15, $updatedProduct->getStock());
    }

    /** @test */
    public function test_can_get_low_stock_products(): void
    {
        $tenantId = (string)\Ramsey\Uuid\Uuid::uuid4();

        $lowStockProduct = new \Src\Pms\Core\Domain\Entities\Product(
            id: 'low-stock-id',
            tenantId: $tenantId,
            name: 'Low Stock Product',
            sku: 'LOW-001',
            price: 100.00,
            stock: 5
        );

        $normalStockProduct = new \Src\Pms\Core\Domain\Entities\Product(
            id: 'normal-stock-id',
            tenantId: $tenantId,
            name: 'Normal Stock Product',
            sku: 'NORMAL-001',
            price: 100.00,
            stock: 50
        );

        $this->productRepository
            ->shouldReceive('findLowStockProducts')
            ->with($tenantId, 10)
            ->once()
            ->andReturn([$lowStockProduct]);

        $lowStockProducts = $this->productService->getLowStockProducts($tenantId, 10);

        $this->assertCount(1, $lowStockProducts);
        $this->assertEquals('low-stock-id', $lowStockProducts[0]->getId());
        $this->assertEquals('Low Stock Product', $lowStockProducts[0]->getName());
    }
}