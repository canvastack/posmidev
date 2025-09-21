<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Application\Services\ProductService;

class ProductController extends Controller
{
    public function __construct(
        private ProductService $productService
    ) {}

    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $products = $this->productService->getProductsByTenant($tenantId);
        
        return response()->json(
            ProductResource::collection($products)
        );
    }

    public function store(ProductRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $product = $this->productService->createProduct(
            tenantId: $tenantId,
            name: $request->name,
            sku: $request->sku,
            price: $request->price,
            stock: $request->stock,
            categoryId: $request->category_id,
            description: $request->description,
            costPrice: $request->cost_price
        );

        return response()->json(new ProductResource($product), 201);
    }

    public function show(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $product = $this->productService->getProduct($productId);
        
        if (!$product || $product->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('view', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        return response()->json(new ProductResource($product));
    }

    public function update(ProductRequest $request, string $tenantId, string $productId): JsonResponse
    {
        $product = $this->productService->getProduct($productId);
        
        if (!$product || $product->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $updatedProduct = $this->productService->updateProduct(
            productId: $productId,
            name: $request->name,
            price: $request->price,
            description: $request->description
        );

        return response()->json(new ProductResource($updatedProduct));
    }

    public function destroy(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $product = $this->productService->getProduct($productId);
        
        if (!$product || $product->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('delete', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $this->productService->deleteProduct($productId);

        return response()->json(null, 204);
    }
}