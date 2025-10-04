<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Src\Pms\Core\Application\Services\ProductService;

class ProductController extends Controller
{
    public function __construct(
        private ProductService $productService
    ) {}

    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');
        $categoryId = $request->get('category_id');
        $sortBy = $request->get('sort_by');
        $sortOrder = $request->get('sort_order', 'asc');
        $stockFilter = $request->get('stock_filter');
        $minPrice = $request->get('min_price');
        $maxPrice = $request->get('max_price');
        
        $products = $this->productService->getProductsByTenantPaginated(
            $tenantId, 
            $perPage, 
            $search, 
            $categoryId,
            $sortBy,
            $sortOrder,
            $stockFilter,
            $minPrice,
            $maxPrice
        );

        return response()->json([
            'data' => ProductResource::collection($products->items())->toArray($request),
            'current_page' => $products->currentPage(),
            'last_page' => $products->lastPage(),
            'per_page' => $products->perPage(),
            'total' => $products->total(),
        ]);
    }

    public function store(ProductRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        try {
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

            // Update status if provided (using Eloquent model directly)
            if ($request->has('status')) {
                $productModel = \Src\Pms\Infrastructure\Models\Product::find($product->getId());
                if ($productModel) {
                    $productModel->update(['status' => $request->status]);
                }
            }

            return response()->json(new ProductResource($product), 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'sku' => ['SKU already exists for this tenant']
                ]
            ], 422);
        }
    }

    public function show(Request $request, string $tenantId, \Src\Pms\Infrastructure\Models\Product $product): JsonResponse
    {
        // Product model sudah diinject dengan route model binding
        // Pastikan product belongs to correct tenant
        if ($product->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('view', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        return response()->json([
            'data' => (new ProductResource($product))->toArray($request)
        ]);
    }

    public function update(ProductRequest $request, string $tenantId, \Src\Pms\Infrastructure\Models\Product $product): JsonResponse
    {
        // Product model sudah diinject dengan route model binding
        // Pastikan product belongs to correct tenant
        if ($product->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $updatedProduct = $this->productService->updateProduct(
            productId: $product->id,
            name: $request->name,
            price: $request->price,
            stock: $request->stock,
            description: $request->description
        );

        // Update additional fields using Eloquent model directly
        $updateData = [];
        if ($request->has('category_id')) {
            $updateData['category_id'] = $request->category_id;
        }
        if ($request->has('cost_price')) {
            $updateData['cost_price'] = $request->cost_price;
        }
        if ($request->has('status')) {
            $updateData['status'] = $request->status;
        }
        
        if (!empty($updateData)) {
            $product->update($updateData);
        }

        return response()->json([
            'data' => (new ProductResource($product->fresh()))->toArray($request)
        ]);
    }

    public function destroy(Request $request, string $tenantId, \Src\Pms\Infrastructure\Models\Product $product): JsonResponse
    {
        // Product model sudah diinject dengan route model binding
        // Pastikan product belongs to correct tenant
        if ($product->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('delete', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $this->productService->deleteProduct($product->id);

        return response()->json(['message' => 'Product deleted successfully'], 200);
    }

    public function uploadImage(Request $request, string $tenantId, \Src\Pms\Infrastructure\Models\Product $product): JsonResponse
    {
        // Product model sudah diinject dengan route model binding
        // Pastikan product belongs to correct tenant
        if ($product->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        // Validate the uploaded file
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // 2MB max
        ]);

        try {
            $image = $request->file('image');

            // Generate unique filename
            $filename = time() . '_' . $product->id . '.' . $image->getClientOriginalExtension();

            // Store original image
            $imagePath = $image->storeAs('products', $filename, 'public');

            // Create thumbnail (200x200)
            $thumbnailFilename = 'thumb_' . $filename;
            $thumbnailPath = 'products/' . $thumbnailFilename;

            // Create thumbnail using Intervention Image
            $imageManager = new ImageManager(['driver' => 'gd']);
            $thumbnail = $imageManager->make($image->getRealPath());
            $thumbnail->fit(200, 200);
            $thumbnail->save(storage_path('app/public/' . $thumbnailPath));

            // Update product with image paths
            $product->update([
                'image_path' => $imagePath,
                'thumbnail_path' => $thumbnailPath,
            ]);

            return response()->json([
                'message' => 'Image uploaded successfully',
                'data' => [
                    'image_url' => asset('storage/' . $imagePath),
                    'thumbnail_url' => asset('storage/' . $thumbnailPath),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload image',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}