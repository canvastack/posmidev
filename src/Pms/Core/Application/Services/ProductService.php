<?php

namespace Src\Pms\Core\Application\Services;

use Src\Pms\Core\Domain\Entities\Product;
use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;

class ProductService
{
    public function __construct(
        private ProductRepositoryInterface $productRepository
    ) {}

    public function createProduct(
        string $tenantId,
        string $name,
        string $sku,
        float $price,
        int $stock,
        ?string $categoryId = null,
        ?string $description = null,
        ?float $costPrice = null
    ): Product {
        // Check if SKU already exists for this tenant
        $existingProduct = $this->productRepository->findBySku($sku, $tenantId);
        if ($existingProduct) {
            throw new \InvalidArgumentException('SKU already exists for this tenant');
        }

        $product = new Product(
            id: \Ramsey\Uuid\Uuid::uuid4()->toString(),
            tenantId: $tenantId,
            name: $name,
            sku: $sku,
            price: $price,
            stock: $stock,
            categoryId: $categoryId,
            description: $description,
            costPrice: $costPrice,
            createdAt: new \DateTime()
        );

        $this->productRepository->save($product);
        return $product;
    }

    public function updateProduct(
        string $productId,
        string $name,
        float $price,
        ?int $stock = null,
        ?string $description = null
    ): Product {
        $product = $this->productRepository->findById($productId);
        if (!$product) {
            throw new \InvalidArgumentException('Product not found');
        }

        $product->updateDetails($name, $price, $description);

        if ($stock !== null) {
            $product->setStock($stock);
        }

        $this->productRepository->save($product);

        return $product;
    }

    public function adjustStock(string $productId, int $quantity, string $reason): Product
    {
        $product = $this->productRepository->findById($productId);
        if (!$product) {
            throw new \InvalidArgumentException('Product not found');
        }

        $product->adjustStock($quantity);
        $this->productRepository->save($product);
        
        return $product;
    }

    public function getProductsByTenant(string $tenantId): array
    {
        return $this->productRepository->findByTenant($tenantId);
    }

    public function getProduct(string $productId): ?Product
    {
        return $this->productRepository->findById($productId);
    }

    public function deleteProduct(string $productId): void
    {
        $this->productRepository->delete($productId);
    }

    public function getLowStockProducts(string $tenantId, int $threshold = 10): array
    {
        return $this->productRepository->findLowStockProducts($tenantId, $threshold);
    }
}