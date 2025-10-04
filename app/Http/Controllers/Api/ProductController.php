<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Exports\ProductsExport;
use App\Imports\ProductsImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Maatwebsite\Excel\Facades\Excel;
use Src\Pms\Core\Application\Services\ProductService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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

    /**
     * Bulk delete products
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function bulkDelete(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('delete', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|uuid',
        ]);

        $ids = $request->input('ids');

        // Get products that belong to this tenant only
        $products = \Src\Pms\Infrastructure\Models\Product::where('tenant_id', $tenantId)
            ->whereIn('id', $ids)
            ->get();

        $deletedCount = 0;
        $errors = [];

        foreach ($products as $product) {
            try {
                $this->productService->deleteProduct($product->id);
                $deletedCount++;
            } catch (\Exception $e) {
                $errors[] = [
                    'id' => $product->id,
                    'message' => $e->getMessage()
                ];
            }
        }

        return response()->json([
            'success' => true,
            'deleted_count' => $deletedCount,
            'requested_count' => count($ids),
            'errors' => $errors,
        ]);
    }

    /**
     * Bulk update product status
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function bulkUpdateStatus(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|uuid',
            'status' => 'required|in:active,inactive,discontinued',
        ]);

        $ids = $request->input('ids');
        $status = $request->input('status');

        // Update only products that belong to this tenant
        $updatedCount = \Src\Pms\Infrastructure\Models\Product::where('tenant_id', $tenantId)
            ->whereIn('id', $ids)
            ->update(['status' => $status]);

        return response()->json([
            'success' => true,
            'updated_count' => $updatedCount,
            'requested_count' => count($ids),
            'status' => $status,
        ]);
    }

    /**
     * Bulk update product category
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function bulkUpdateCategory(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|uuid',
            'category_id' => 'required|uuid|exists:categories,id',
        ]);

        $ids = $request->input('ids');
        $categoryId = $request->input('category_id');

        // Verify category belongs to tenant
        $category = \Src\Pms\Infrastructure\Models\Category::where('id', $categoryId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$category) {
            return response()->json([
                'message' => 'Category not found or does not belong to this tenant',
            ], 404);
        }

        // Update only products that belong to this tenant
        $updatedCount = \Src\Pms\Infrastructure\Models\Product::where('tenant_id', $tenantId)
            ->whereIn('id', $ids)
            ->update(['category_id' => $categoryId]);

        return response()->json([
            'success' => true,
            'updated_count' => $updatedCount,
            'requested_count' => count($ids),
            'category_id' => $categoryId,
        ]);
    }

    /**
     * Bulk update product prices
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function bulkUpdatePrice(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|uuid',
            'type' => 'required|in:percentage,fixed',
            'operation' => 'required|in:increase,decrease,set',
            'value' => 'required|numeric|min:0',
        ]);

        $ids = $request->input('ids');
        $type = $request->input('type');
        $operation = $request->input('operation');
        $value = $request->input('value');

        // Get products that belong to this tenant only
        $products = \Src\Pms\Infrastructure\Models\Product::where('tenant_id', $tenantId)
            ->whereIn('id', $ids)
            ->get();

        $updatedCount = 0;

        foreach ($products as $product) {
            $newPrice = $product->price;

            if ($operation === 'set') {
                $newPrice = $value;
            } elseif ($type === 'percentage') {
                if ($operation === 'increase') {
                    $newPrice = $product->price * (1 + ($value / 100));
                } else {
                    $newPrice = $product->price * (1 - ($value / 100));
                }
            } else { // fixed
                if ($operation === 'increase') {
                    $newPrice = $product->price + $value;
                } else {
                    $newPrice = $product->price - $value;
                }
            }

            // Ensure price doesn't go below 0
            $newPrice = max(0, $newPrice);

            $product->update(['price' => $newPrice]);
            $updatedCount++;
        }

        return response()->json([
            'success' => true,
            'updated_count' => $updatedCount,
            'requested_count' => count($ids),
            'type' => $type,
            'operation' => $operation,
            'value' => $value,
        ]);
    }

    /**
     * Export products to Excel/CSV
     * 
     * @param Request $request
     * @param string $tenantId
     * @return BinaryFileResponse
     */
    public function export(Request $request, string $tenantId): BinaryFileResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $request->validate([
            'format' => 'nullable|in:xlsx,csv',
        ]);

        $format = $request->get('format', 'xlsx');
        $search = $request->get('search');
        $categoryId = $request->get('category_id');
        $stockFilter = $request->get('stock_filter');
        $minPrice = $request->get('min_price');
        $maxPrice = $request->get('max_price');

        $export = new ProductsExport(
            $tenantId,
            $search,
            $categoryId,
            $stockFilter,
            $minPrice,
            $maxPrice
        );

        $fileName = 'products_' . now()->format('Y-m-d_His') . '.' . $format;

        return Excel::download($export, $fileName);
    }

    /**
     * Download import template
     * 
     * @param Request $request
     * @param string $tenantId
     * @return BinaryFileResponse
     */
    public function downloadTemplate(Request $request, string $tenantId): BinaryFileResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        // Create a sample template with headers and example data
        $data = [
            ['SKU', 'Name', 'Description', 'Category', 'Price', 'Cost Price', 'Stock', 'Status'],
            ['SAMPLE-001', 'Sample Product', 'This is a sample product description', 'Electronics', '29.99', '15.00', '100', 'Active'],
            ['SAMPLE-002', 'Another Product', 'Example description', 'Clothing', '49.99', '25.00', '50', 'Active'],
        ];

        $fileName = 'product_import_template_' . now()->format('Y-m-d') . '.xlsx';

        return Excel::download(
            new class($data) implements \Maatwebsite\Excel\Concerns\FromArray {
                protected $data;

                public function __construct($data)
                {
                    $this->data = $data;
                }

                public function array(): array
                {
                    return $this->data;
                }
            },
            $fileName
        );
    }

    /**
     * Import products from Excel/CSV
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function import(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // Max 10MB
        ]);

        try {
            $import = new ProductsImport($tenantId);
            
            Excel::import($import, $request->file('file'));

            $errors = [];
            foreach ($import->errors() as $error) {
                $errors[] = [
                    'row' => $error->row(),
                    'attribute' => $error->attribute(),
                    'errors' => $error->errors(),
                    'values' => $error->values(),
                ];
            }

            return response()->json([
                'success' => true,
                'imported' => $import->getImportedCount(),
                'skipped' => $import->getSkippedCount(),
                'total_errors' => count($errors),
                'errors' => $errors,
                'message' => $import->getImportedCount() > 0 
                    ? "Successfully imported {$import->getImportedCount()} products" 
                    : 'No products were imported',
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = [];
            foreach ($e->failures() as $failure) {
                $failures[] = [
                    'row' => $failure->row(),
                    'attribute' => $failure->attribute(),
                    'errors' => $failure->errors(),
                    'values' => $failure->values(),
                ];
            }

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'failures' => $failures,
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}