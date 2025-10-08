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
        $createdFrom = $request->get('created_from');
        $createdTo = $request->get('created_to');
        $updatedFrom = $request->get('updated_from');
        $updatedTo = $request->get('updated_to');
        $statuses = $request->get('statuses'); // Can be comma-separated string or array
        
        // Parse statuses if it's a comma-separated string
        if ($statuses && is_string($statuses)) {
            $statuses = array_filter(explode(',', $statuses));
        }
        
        $products = $this->productService->getProductsByTenantPaginated(
            $tenantId, 
            $perPage, 
            $search, 
            $categoryId,
            $sortBy,
            $sortOrder,
            $stockFilter,
            $minPrice,
            $maxPrice,
            $createdFrom,
            $createdTo,
            $updatedFrom,
            $updatedTo,
            $statuses
        );

        // Load Phase 9 relationships
        $products->getCollection()->load(['category', 'supplier', 'tags']);

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

            // Get Eloquent model for additional fields
            $productModel = \Src\Pms\Infrastructure\Models\Product::find($product->getId());
            
            if ($productModel) {
                $updateData = [];
                
                // Update status if provided
                if ($request->has('status')) {
                    $updateData['status'] = $request->status;
                }
                
                // Phase 9: Additional Business Features
                if ($request->has('supplier_id')) {
                    $updateData['supplier_id'] = $request->supplier_id;
                }
                if ($request->has('uom')) {
                    $updateData['uom'] = $request->uom;
                }
                if ($request->has('tax_rate')) {
                    $updateData['tax_rate'] = $request->tax_rate;
                }
                if ($request->has('tax_inclusive')) {
                    $updateData['tax_inclusive'] = $request->tax_inclusive;
                }
                
                if (!empty($updateData)) {
                    $productModel->update($updateData);
                }
                
                // Phase 9: Attach tags if provided
                if ($request->has('tag_ids') && is_array($request->tag_ids)) {
                    foreach ($request->tag_ids as $tagId) {
                        $productModel->tags()->attach($tagId, ['tenant_id' => $tenantId]);
                    }
                }
                
                // Reload with relationships
                $productModel->load(['category', 'supplier', 'tags']);
                
                return response()->json(new ProductResource($productModel), 201);
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

        // Load category relation and count variants, plus Phase 9 relationships
        $product->load(['category', 'supplier', 'tags']);
        $product->loadCount('variants');

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

        // Only call service if core product fields are being updated
        $hasCoreFields = $request->has('name') || $request->has('price') || 
                        $request->has('stock') || $request->has('description');
        
        if ($hasCoreFields) {
            // Use service for core product updates
            $updatedProduct = $this->productService->updateProduct(
                productId: $product->id,
                name: $request->name ?? $product->name,
                price: $request->price ?? $product->price,
                stock: $request->stock,
                description: $request->description
            );
            
            // Refresh product model after service update
            $product = $product->fresh();
        }

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
        if ($request->has('has_variants')) {
            $updateData['has_variants'] = $request->has_variants;
        }
        if ($request->has('manage_stock_by_variant')) {
            $updateData['manage_stock_by_variant'] = $request->manage_stock_by_variant;
        }
        
        // Phase 9: Additional Business Features
        if ($request->has('supplier_id')) {
            $updateData['supplier_id'] = $request->supplier_id;
        }
        if ($request->has('uom')) {
            $updateData['uom'] = $request->uom;
        }
        if ($request->has('tax_rate')) {
            $updateData['tax_rate'] = $request->tax_rate;
        }
        if ($request->has('tax_inclusive')) {
            $updateData['tax_inclusive'] = $request->tax_inclusive;
        }
        
        if (!empty($updateData)) {
            $product->update($updateData);
            $product = $product->fresh();
        }
        
        // Phase 9: Update tags if provided
        if ($request->has('tag_ids')) {
            // Sync tags with tenant_id in pivot
            $tagIds = $request->tag_ids ?? [];
            $syncData = [];
            foreach ($tagIds as $tagId) {
                $syncData[$tagId] = ['tenant_id' => $tenantId];
            }
            $product->tags()->sync($syncData);
        }
        
        // Load Phase 9 relationships
        $product->load(['category', 'supplier', 'tags']);

        return response()->json([
            'data' => (new ProductResource($product))->toArray($request)
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
            'file' => 'required|file|mimes:xlsx,xls,csv,txt,text/csv,text/plain|max:10240', // Max 10MB
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

    /**
     * Duplicate an existing product
     * Creates a copy with "(Copy)" appended to name and new SKU
     */
    public function duplicate(Request $request, string $tenantId, \Src\Pms\Infrastructure\Models\Product $product): JsonResponse
    {
        // Verify product belongs to tenant
        if ($product->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Product::class, $tenantId]);

        try {
            // Generate new SKU (add -COPY suffix and ensure uniqueness)
            $baseSku = $product->sku;
            $newSku = $baseSku . '-COPY';
            $counter = 1;
            
            while (\Src\Pms\Infrastructure\Models\Product::where('tenant_id', $tenantId)
                ->where('sku', $newSku)
                ->exists()) {
                $newSku = $baseSku . '-COPY' . $counter;
                $counter++;
            }

            // Create duplicate product
            $duplicate = $product->replicate();
            $duplicate->id = \Ramsey\Uuid\Uuid::uuid4()->toString();
            $duplicate->name = $product->name . ' (Copy)';
            $duplicate->sku = $newSku;
            $duplicate->status = 'draft'; // Set as draft by default
            $duplicate->created_at = now();
            $duplicate->updated_at = now();
            $duplicate->save();

            // Copy product images if any
            if ($product->images && $product->images->count() > 0) {
                foreach ($product->images as $image) {
                    $duplicateImage = $image->replicate();
                    $duplicateImage->id = \Ramsey\Uuid\Uuid::uuid4()->toString();
                    $duplicateImage->product_id = $duplicate->id;
                    $duplicateImage->created_at = now();
                    $duplicateImage->save();
                }
            }

            // Load relationships for response
            $duplicate->load('category', 'images');
            $duplicate->loadCount('variants');

            return response()->json([
                'success' => true,
                'message' => 'Product duplicated successfully',
                'data' => (new ProductResource($duplicate))->toArray($request)
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to duplicate product: ' . $e->getMessage(),
            ], 500);
        }
    }
}