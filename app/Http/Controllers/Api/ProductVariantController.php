<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductVariantRequest;
use App\Http\Requests\ProductVariantBulkRequest;
use App\Http\Resources\ProductVariantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductVariant;

class ProductVariantController extends Controller
{
    /**
     * Get all variants for a product
     */
    public function index(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $product = Product::forTenant($tenantId)->findOrFail($productId);

        $perPage = $request->get('per_page', 50);
        $search = $request->get('search');
        $isActive = $request->get('is_active');
        $sortBy = $request->get('sort_by', 'sort_order');
        $sortOrder = $request->get('sort_order', 'asc');

        $query = $product->variants()
            ->with(['product' => function($q) {
                $q->select('id', 'name', 'sku');
            }]);

        // Search filter
        if ($search) {
            $query->search($search);
        }

        // Active filter
        if ($isActive !== null) {
            $query->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN));
        }

        // Sorting
        $query->orderBy($sortBy, $sortOrder);

        $variants = $query->paginate($perPage);

        return response()->json([
            'data' => ProductVariantResource::collection($variants->items()),
            'current_page' => $variants->currentPage(),
            'last_page' => $variants->lastPage(),
            'per_page' => $variants->perPage(),
            'total' => $variants->total(),
        ]);
    }

    /**
     * Create a new variant
     */
    public function store(ProductVariantRequest $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $product = Product::forTenant($tenantId)->findOrFail($productId);

        try {
            DB::beginTransaction();

            $variant = ProductVariant::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $tenantId,
                'product_id' => $productId,
                'sku' => $request->sku,
                'name' => $request->name,
                'attributes' => $request->attributes ?? [],
                'price' => $request->price ?? $product->price,
                'cost_price' => $request->cost_price ?? $product->cost_price,
                'price_modifier' => $request->price_modifier ?? 0,
                'stock' => $request->stock ?? 0,
                'reserved_stock' => 0,
                'reorder_point' => $request->reorder_point,
                'reorder_quantity' => $request->reorder_quantity,
                'low_stock_alert_enabled' => $request->low_stock_alert_enabled ?? true,
                'image_path' => $request->image_path,
                'thumbnail_path' => $request->thumbnail_path,
                'barcode' => $request->barcode,
                'is_active' => $request->is_active ?? true,
                'is_default' => $request->is_default ?? false,
                'sort_order' => $request->sort_order ?? 0,
                'notes' => $request->notes,
                'metadata' => $request->metadata ?? [],
            ]);

            // If this variant is set as default, unset other defaults
            if ($variant->is_default) {
                ProductVariant::forTenant($tenantId)
                    ->forProduct($productId)
                    ->where('id', '!=', $variant->id)
                    ->update(['is_default' => false]);
            }

            DB::commit();

            return response()->json(new ProductVariantResource($variant), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), 'duplicate')) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => ['sku' => ['SKU already exists for this tenant']]
                ], 422);
            }

            return response()->json([
                'message' => 'Failed to create variant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific variant
     */
    public function show(Request $request, string $tenantId, string $productId, string $variantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $variant = ProductVariant::forTenant($tenantId)
            ->forProduct($productId)
            ->with(['product', 'analytics' => function($q) {
                $q->orderByDesc('period_date')->limit(30);
            }])
            ->findOrFail($variantId);

        return response()->json(new ProductVariantResource($variant));
    }

    /**
     * Update a variant
     */
    public function update(ProductVariantRequest $request, string $tenantId, string $productId, string $variantId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $variant = ProductVariant::forTenant($tenantId)
            ->forProduct($productId)
            ->findOrFail($variantId);

        try {
            DB::beginTransaction();

            $variant->update($request->validated());

            // If this variant is set as default, unset other defaults
            if ($request->is_default) {
                ProductVariant::forTenant($tenantId)
                    ->forProduct($productId)
                    ->where('id', '!=', $variant->id)
                    ->update(['is_default' => false]);
            }

            DB::commit();

            return response()->json(new ProductVariantResource($variant->fresh()));

        } catch (\Exception $e) {
            DB::rollBack();
            
            if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), 'duplicate')) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => ['sku' => ['SKU already exists for this tenant']]
                ], 422);
            }

            return response()->json([
                'message' => 'Failed to update variant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a variant (soft delete)
     */
    public function destroy(Request $request, string $tenantId, string $productId, string $variantId): JsonResponse
    {
        $this->authorize('delete', [Product::class, $tenantId]);

        $variant = ProductVariant::forTenant($tenantId)
            ->forProduct($productId)
            ->findOrFail($variantId);

        try {
            $variant->delete();

            return response()->json([
                'message' => 'Variant deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete variant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk create variants
     */
    public function bulkStore(ProductVariantBulkRequest $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $product = Product::forTenant($tenantId)->findOrFail($productId);

        try {
            DB::beginTransaction();

            $variants = [];
            $errors = [];

            foreach ($request->variants as $index => $variantData) {
                try {
                    // Check SKU uniqueness
                    if (ProductVariant::forTenant($tenantId)->where('sku', $variantData['sku'])->exists()) {
                        $errors[$index] = "SKU '{$variantData['sku']}' already exists";
                        continue;
                    }

                    $variant = ProductVariant::create([
                        'id' => \Illuminate\Support\Str::uuid(),
                        'tenant_id' => $tenantId,
                        'product_id' => $productId,
                        'sku' => $variantData['sku'],
                        'name' => $variantData['name'] ?? null,
                        'attributes' => $variantData['attributes'] ?? [],
                        'price' => $variantData['price'] ?? $product->price,
                        'cost_price' => $variantData['cost_price'] ?? $product->cost_price,
                        'price_modifier' => $variantData['price_modifier'] ?? 0,
                        'stock' => $variantData['stock'] ?? 0,
                        'reserved_stock' => 0,
                        'reorder_point' => $variantData['reorder_point'] ?? null,
                        'reorder_quantity' => $variantData['reorder_quantity'] ?? null,
                        'low_stock_alert_enabled' => $variantData['low_stock_alert_enabled'] ?? true,
                        'image_path' => $variantData['image_path'] ?? null,
                        'barcode' => $variantData['barcode'] ?? null,
                        'is_active' => $variantData['is_active'] ?? true,
                        'is_default' => $variantData['is_default'] ?? false,
                        'sort_order' => $variantData['sort_order'] ?? $index,
                        'notes' => $variantData['notes'] ?? null,
                        'metadata' => $variantData['metadata'] ?? [],
                    ]);

                    $variants[] = $variant;

                } catch (\Exception $e) {
                    $errors[$index] = $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk operation completed',
                'created' => count($variants),
                'failed' => count($errors),
                'data' => ProductVariantResource::collection($variants),
                'errors' => $errors,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Bulk operation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update variants
     */
    public function bulkUpdate(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $request->validate([
            'variants' => 'required|array',
            'variants.*.id' => 'required|uuid|exists:product_variants,id',
        ]);

        try {
            DB::beginTransaction();

            $updated = [];
            $errors = [];

            foreach ($request->variants as $index => $variantData) {
                try {
                    $variant = ProductVariant::forTenant($tenantId)
                        ->forProduct($productId)
                        ->findOrFail($variantData['id']);

                    $variant->update($variantData);
                    $updated[] = $variant;

                } catch (\Exception $e) {
                    $errors[$index] = $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk update completed',
                'updated' => count($updated),
                'failed' => count($errors),
                'data' => ProductVariantResource::collection($updated),
                'errors' => $errors,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Bulk update failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk delete variants
     */
    public function bulkDestroy(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('delete', [Product::class, $tenantId]);

        $request->validate([
            'variant_ids' => 'required|array',
            'variant_ids.*' => 'required|uuid|exists:product_variants,id',
        ]);

        try {
            DB::beginTransaction();

            $deleted = ProductVariant::forTenant($tenantId)
                ->forProduct($productId)
                ->whereIn('id', $request->variant_ids)
                ->delete();

            DB::commit();

            return response()->json([
                'message' => 'Bulk delete completed',
                'deleted' => $deleted,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Bulk delete failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update stock for a variant
     */
    public function updateStock(Request $request, string $tenantId, string $productId, string $variantId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $request->validate([
            'quantity' => 'required|integer|min:0',
            'reason' => 'nullable|string|max:255',
        ]);

        $variant = ProductVariant::forTenant($tenantId)
            ->forProduct($productId)
            ->findOrFail($variantId);

        $oldStock = $variant->stock;
        $variant->update(['stock' => $request->quantity]);

        // Log activity
        activity('product_variant')
            ->performedOn($variant)
            ->causedBy(auth()->user())
            ->withProperties([
                'old_stock' => $oldStock,
                'new_stock' => $request->quantity,
                'reason' => $request->reason,
            ])
            ->log('Stock updated');

        return response()->json(new ProductVariantResource($variant->fresh()));
    }

    /**
     * Reserve stock for a variant (for order processing)
     */
    public function reserveStock(Request $request, string $tenantId, string $productId, string $variantId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $variant = ProductVariant::forTenant($tenantId)
            ->forProduct($productId)
            ->findOrFail($variantId);

        if (!$variant->reserveStock($request->quantity)) {
            return response()->json([
                'message' => 'Insufficient stock available',
                'available' => $variant->available_stock,
                'requested' => $request->quantity,
            ], 422);
        }

        return response()->json([
            'message' => 'Stock reserved successfully',
            'reserved' => $request->quantity,
            'available' => $variant->available_stock,
        ]);
    }

    /**
     * Release reserved stock
     */
    public function releaseStock(Request $request, string $tenantId, string $productId, string $variantId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $variant = ProductVariant::forTenant($tenantId)
            ->forProduct($productId)
            ->findOrFail($variantId);

        $variant->releaseStock($request->quantity);

        return response()->json([
            'message' => 'Reserved stock released',
            'released' => $request->quantity,
            'available' => $variant->available_stock,
        ]);
    }
}