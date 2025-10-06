<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VariantAttributeResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\VariantAttribute;

class VariantAttributeController extends Controller
{
    /**
     * Get all variant attributes for a tenant
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $perPage = $request->get('per_page', 50);
        $search = $request->get('search');
        $isActive = $request->get('is_active');
        $displayType = $request->get('display_type');

        $query = VariantAttribute::forTenant($tenantId);

        // Search filter
        if ($search) {
            $driver = DB::connection()->getDriverName();
            $operator = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';
            
            $query->where(function ($q) use ($search, $operator) {
                $q->where('name', $operator, "%{$search}%")
                    ->orWhere('slug', $operator, "%{$search}%");
            });
        }

        // Active filter
        if ($isActive !== null) {
            $query->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN));
        }

        // Display type filter
        if ($displayType) {
            $query->where('display_type', $displayType);
        }

        // Order by usage and sort order
        $query->orderBy('usage_count', 'desc')
            ->orderBy('sort_order', 'asc');

        $attributes = $query->paginate($perPage);

        return response()->json([
            'data' => VariantAttributeResource::collection($attributes->items()),
            'current_page' => $attributes->currentPage(),
            'last_page' => $attributes->lastPage(),
            'per_page' => $attributes->perPage(),
            'total' => $attributes->total(),
        ]);
    }

    /**
     * Get popular variant attributes
     */
    public function popular(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $limit = $request->get('limit', 10);

        $attributes = VariantAttribute::getPopular($tenantId, $limit);

        return response()->json([
            'data' => VariantAttributeResource::collection($attributes),
        ]);
    }

    /**
     * Show a single variant attribute
     */
    public function show(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $attribute = VariantAttribute::forTenant($tenantId)->findOrFail($id);

        return response()->json([
            'data' => new VariantAttributeResource($attribute),
        ]);
    }

    /**
     * Create a new variant attribute
     */
    public function store(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:variant_attributes,slug,NULL,id,tenant_id,' . $tenantId,
            'description' => 'nullable|string|max:500',
            'display_type' => 'required|in:select,radio,button,swatch,color_swatch',
            'values' => 'required|array|min:1',
            'values.*' => 'required|string|max:255',
            'price_modifiers' => 'nullable|array',
            'price_modifiers.*' => 'nullable|numeric',
            'visual_settings' => 'nullable|array',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            $attribute = VariantAttribute::create([
                'id' => Str::uuid(),
                'tenant_id' => $tenantId,
                'name' => $validated['name'],
                'slug' => $validated['slug'] ?? Str::slug($validated['name']),
                'description' => $validated['description'] ?? null,
                'display_type' => $validated['display_type'],
                'values' => $validated['values'],
                'price_modifiers' => $validated['price_modifiers'] ?? [],
                'visual_settings' => $validated['visual_settings'] ?? [],
                'sort_order' => $validated['sort_order'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
                'usage_count' => 0,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Variant attribute created successfully',
                'data' => new VariantAttributeResource($attribute),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create variant attribute',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a variant attribute
     */
    public function update(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $attribute = VariantAttribute::forTenant($tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:variant_attributes,slug,' . $id . ',id,tenant_id,' . $tenantId,
            'description' => 'nullable|string|max:500',
            'display_type' => 'sometimes|required|in:select,radio,button,swatch,color_swatch',
            'values' => 'sometimes|required|array|min:1',
            'values.*' => 'required|string|max:255',
            'price_modifiers' => 'nullable|array',
            'price_modifiers.*' => 'nullable|numeric',
            'visual_settings' => 'nullable|array',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            if (isset($validated['name']) && !isset($validated['slug'])) {
                $validated['slug'] = Str::slug($validated['name']);
            }

            $attribute->update($validated);

            DB::commit();

            return response()->json([
                'message' => 'Variant attribute updated successfully',
                'data' => new VariantAttributeResource($attribute->fresh()),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update variant attribute',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add a value to an attribute
     */
    public function addValue(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $attribute = VariantAttribute::forTenant($tenantId)->findOrFail($id);

        $validated = $request->validate([
            'value' => 'required|string|max:255',
            'price_modifier' => 'nullable|numeric',
        ]);

        try {
            $attribute->addValue(
                $validated['value'],
                $validated['price_modifier'] ?? null
            );

            return response()->json([
                'message' => 'Value added successfully',
                'data' => new VariantAttributeResource($attribute->fresh()),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to add value',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove a value from an attribute
     */
    public function removeValue(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $attribute = VariantAttribute::forTenant($tenantId)->findOrFail($id);

        $validated = $request->validate([
            'value' => 'required|string',
        ]);

        try {
            $attribute->removeValue($validated['value']);

            return response()->json([
                'message' => 'Value removed successfully',
                'data' => new VariantAttributeResource($attribute->fresh()),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to remove value',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a variant attribute
     */
    public function destroy(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('delete', [Product::class, $tenantId]);

        $attribute = VariantAttribute::forTenant($tenantId)->findOrFail($id);

        // Check if attribute is in use
        if ($attribute->usage_count > 0) {
            return response()->json([
                'message' => 'Cannot delete attribute that is in use',
                'usage_count' => $attribute->usage_count,
            ], 422);
        }

        try {
            $attribute->delete();

            return response()->json([
                'message' => 'Variant attribute deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete variant attribute',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}