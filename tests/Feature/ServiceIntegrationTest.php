<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Application\Services\ProductService;
use Src\Pms\Core\Application\Services\OrderService;
use Src\Pms\Core\Application\Services\CategoryService;
use Src\Pms\Core\Domain\Entities\Product;
use Src\Pms\Core\Domain\Entities\Order;
use Src\Pms\Core\Domain\Entities\Category;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class ServiceIntegrationTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function test_product_service_integration_with_repository(): void
    {
        $productService = app(ProductService::class);

        // Test creating product through service
        $product = $productService->createProduct(
            tenantId: $this->tenant->id,
            name: 'Service Test Product',
            sku: 'SERVICE-TEST-001',
            price: 75.50,
            stock: 25,
            description: 'Product created through service layer',
            costPrice: 60.00
        );

        $this->assertInstanceOf(Product::class, $product);
        $this->assertEquals('Service Test Product', $product->getName());
        $this->assertEquals('SERVICE-TEST-001', $product->getSku());
        $this->assertEquals(75.50, $product->getPrice());
        $this->assertEquals(25, $product->getStock());
        $this->assertEquals($this->tenant->id, $product->getTenantId());

        // Test retrieving product
        $retrievedProduct = $productService->getProduct($product->getId());
        $this->assertNotNull($retrievedProduct);
        $this->assertEquals($product->getName(), $retrievedProduct->getName());

        // Test updating product
        $updatedProduct = $productService->updateProduct(
            productId: $product->getId(),
            name: 'Updated Service Product',
            price: 85.00,
            description: 'Updated description'
        );

        $this->assertEquals('Updated Service Product', $updatedProduct->getName());
        $this->assertEquals(85.00, $updatedProduct->getPrice());
        $this->assertEquals('Updated description', $updatedProduct->getDescription());
        // Original values should remain
        $this->assertEquals('SERVICE-TEST-001', $updatedProduct->getSku());
        $this->assertEquals(25, $updatedProduct->getStock());

        // Test stock adjustment
        $stockAdjustedProduct = $productService->adjustStock(
            productId: $product->getId(),
            quantity: -5,
            reason: 'Test stock reduction'
        );

        $this->assertEquals(20, $stockAdjustedProduct->getStock());

        // Test low stock detection
        $lowStockProducts = $productService->getLowStockProducts($this->tenant->id, 25);
        $this->assertCount(1, $lowStockProducts);
        $this->assertEquals($product->getId(), $lowStockProducts[0]->getId());
    }

    /** @test */
    public function test_category_service_integration(): void
    {
        $categoryService = app(CategoryService::class);

        // Test creating category through service
        $category = $categoryService->createCategory(
            tenantId: $this->tenant->id,
            name: 'Service Test Category',
            description: 'Category created through service layer'
        );

        $this->assertInstanceOf(Category::class, $category);
        $this->assertEquals('Service Test Category', $category->getName());
        $this->assertEquals('Category created through service layer', $category->getDescription());
        $this->assertEquals($this->tenant->id, $category->getTenantId());

        // Test retrieving categories by tenant
        $categories = $categoryService->getCategoriesByTenant($this->tenant->id);
        $this->assertCount(1, $categories);
        $this->assertEquals($category->getId(), $categories[0]->getId());
    }

    /** @test */
    public function test_order_service_business_logic(): void
    {
        $orderService = app(OrderService::class);
        $productService = app(ProductService::class);

        // Create test product with known stock
        $product = $productService->createProduct(
            tenantId: $this->tenant->id,
            name: 'Order Test Product',
            sku: 'ORDER-TEST-001',
            price: 50.00,
            stock: 10
        );

        // Test order creation with stock validation
        $order = $orderService->createOrder(
            tenantId: $this->tenant->id,
            items: [
                ['product_id' => $product->getId(), 'quantity' => 3, 'price' => 50.00]
            ],
            paymentMethod: 'cash',
            amountPaid: 150.00
        );

        $this->assertInstanceOf(Order::class, $order);
        $this->assertEquals(150.00, $order->getTotalAmount());
        $this->assertEquals('cash', $order->getPaymentMethod());
        $this->assertEquals(150.00, $order->getAmountPaid());
        $this->assertEquals(0.00, $order->getChange());

        // Verify stock was reduced
        $updatedProduct = $productService->getProduct($product->getId());
        $this->assertEquals(7, $updatedProduct->getStock()); // 10 - 3
    }

    /** @test */
    public function test_business_rule_enforcement_in_services(): void
    {
        $productService = app(ProductService::class);

        // Create initial product
        $product = $productService->createProduct(
            tenantId: $this->tenant->id,
            name: 'Business Rule Product',
            sku: 'BUSINESS-001',
            price: 100.00,
            stock: 5
        );

        // Test business rule: cannot create product with duplicate SKU
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('SKU already exists for this tenant');

        $productService->createProduct(
            tenantId: $this->tenant->id,
            name: 'Duplicate SKU Product',
            sku: 'BUSINESS-001', // Same SKU
            price: 150.00,
            stock: 3
        );
    }

    /** @test */
    public function test_domain_entity_business_methods(): void
    {
        $productService = app(ProductService::class);

        // Create product with low stock threshold
        $product = $productService->createProduct(
            tenantId: $this->tenant->id,
            name: 'Low Stock Product',
            sku: 'LOW-STOCK-001',
            price: 200.00,
            stock: 5
        );

        // Test low stock detection
        $this->assertTrue($product->isLowStock(10)); // 5 <= 10
        $this->assertFalse($product->isLowStock(3)); // 5 > 3

        // Test stock adjustment business rule
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Stock cannot be negative');

        $product->adjustStock(-10); // Would make stock negative
    }

    /** @test */
    public function test_transaction_manager_integration(): void
    {
        $productService = app(ProductService::class);
        $transactionManager = app(\Src\Pms\Core\Domain\Contracts\TransactionManagerInterface::class);

        // Test transaction rollback on error
        $exceptionThrown = false;

        try {
            $transactionManager->run(function () use ($productService) {
                // Create first product successfully
                $product1 = $productService->createProduct(
                    tenantId: $this->tenant->id,
                    name: 'Transaction Product 1',
                    sku: 'TXN-001',
                    price: 100.00,
                    stock: 10
                );

                // Create second product with duplicate SKU to trigger exception
                $productService->createProduct(
                    tenantId: $this->tenant->id,
                    name: 'Transaction Product 2',
                    sku: 'TXN-001', // Duplicate SKU
                    price: 150.00,
                    stock: 5
                );

                return [$product1];
            });
        } catch (\InvalidArgumentException $e) {
            $exceptionThrown = true;
            $this->assertStringContainsString('SKU already exists', $e->getMessage());
        }

        $this->assertTrue($exceptionThrown, 'Exception should be thrown for duplicate SKU');

        // Verify no products were created due to transaction rollback
        $allProducts = $productService->getProductsByTenant($this->tenant->id);
        $this->assertCount(0, $allProducts);
    }

    /** @test */
    public function test_cross_service_interaction(): void
    {
        $productService = app(ProductService::class);
        $categoryService = app(CategoryService::class);
        $orderService = app(OrderService::class);

        // Create category first
        $category = $categoryService->createCategory(
            tenantId: $this->tenant->id,
            name: 'Cross Service Category',
            description: 'Category for cross-service testing'
        );

        // Create product in that category
        $product = $productService->createProduct(
            tenantId: $this->tenant->id,
            name: 'Cross Service Product',
            sku: 'CROSS-001',
            price: 300.00,
            stock: 15,
            categoryId: $category->getId()
        );

        $this->assertEquals($category->getId(), $product->getCategoryId());

        // Create order for the product
        $order = $orderService->createOrder(
            tenantId: $this->tenant->id,
            items: [
                ['product_id' => $product->getId(), 'quantity' => 2, 'price' => 300.00]
            ],
            paymentMethod: 'card',
            amountPaid: 600.00
        );

        $this->assertEquals(600.00, $order->getTotalAmount());

        // Verify stock was reduced
        $updatedProduct = $productService->getProduct($product->getId());
        $this->assertEquals(13, $updatedProduct->getStock()); // 15 - 2
    }
}