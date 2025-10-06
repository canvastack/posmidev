<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VariantTemplateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\VariantTemplate;
use Src\Pms\Infrastructure\Models\ProductVariant;

class VariantTemplateController extends Controller
{
    /**
     * Get all variant templates (system + tenant-specific)
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $perPage = $request->get('per_page', 50);
        $search = $request->get('search');
        $isActive = $request->get('is_active');
        $includeSystem = $request->get('include_system', true);

        $query = VariantTemplate::query();

        // Get tenant-specific templates
        $query->where(function ($q) use ($tenantId, $includeSystem) {
            $q->where('tenant_id', $tenantId);
            
            // Include system templates (tenant_id = NULL)
            if ($includeSystem) {
                $q->orWhereNull('tenant_id');
            }
        });

        // Search filter
        if ($search) {
            $driver = DB::connection()->getDriverName();
            $operator = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';
            
            $query->where(function ($q) use ($search, $operator) {
                $q->where('name', $operator, "%{$search}%")
                    ->orWhere('slug', $operator, "%{$search}%")
                    ->orWhere('description', $operator, "%{$search}%");
            });
        }

        // Active filter
        if ($isActive !== null) {
            $query->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN));
        }

        // Order by system templates first, then usage
        $query->orderBy('is_system', 'desc')
            ->orderBy('usage_count', 'desc')
            ->orderBy('created_at', 'desc');

        $templates = $query->paginate($perPage);

        return response()->json([
            'data' => VariantTemplateResource::collection($templates->items()),
            'current_page' => $templates->currentPage(),
            'last_page' => $templates->lastPage(),
            'per_page' => $templates->perPage(),
            'total' => $templates->total(),
        ]);
    }

    /**
     * Show a single variant template
     */
    public function show(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $template = VariantTemplate::where(function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
        })->findOrFail($id);

        return response()->json([
            'data' => new VariantTemplateResource($template),
        ]);
    }

    /**
     * Create a new variant template
     */
    public function store(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'configuration' => 'required|array',
            'configuration.attributes' => 'required|array|min:1',
            'configuration.sku_pattern' => 'nullable|string',
            'configuration.price_calculation' => 'nullable|in:base,base_plus_modifiers,custom',
            'configuration.stock_settings' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            $template = VariantTemplate::create([
                'id' => Str::uuid(),
                'tenant_id' => $tenantId,
                'name' => $validated['name'],
                'slug' => $validated['slug'] ?? Str::slug($validated['name']),
                'description' => $validated['description'] ?? null,
                'configuration' => $validated['configuration'],
                'is_system' => false,
                'is_active' => $validated['is_active'] ?? true,
                'usage_count' => 0,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Variant template created successfully',
                'data' => new VariantTemplateResource($template),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create variant template',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a variant template
     */
    public function update(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $template = VariantTemplate::where('tenant_id', $tenantId)->findOrFail($id);

        // Prevent updating system templates
        if ($template->is_system) {
            return response()->json([
                'message' => 'System templates cannot be modified',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'configuration' => 'sometimes|required|array',
            'configuration.attributes' => 'sometimes|required|array|min:1',
            'configuration.sku_pattern' => 'nullable|string',
            'configuration.price_calculation' => 'nullable|in:base,base_plus_modifiers,custom',
            'configuration.stock_settings' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            if (isset($validated['name']) && !isset($validated['slug'])) {
                $validated['slug'] = Str::slug($validated['name']);
            }

            $template->update($validated);

            DB::commit();

            return response()->json([
                'message' => 'Variant template updated successfully',
                'data' => new VariantTemplateResource($template->fresh()),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update variant template',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Apply template to a product (generate variants)
     */
    public function applyToProduct(Request $request, string $tenantId, string $templateId): JsonResponse
    {
        $this->authorize('update', [Product::class, $tenantId]);

        $template = VariantTemplate::where(function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
        })->findOrFail($templateId);

        $validated = $request->validate([
            'product_id' => 'required|uuid|exists:products,id',
            'override_existing' => 'nullable|boolean',
        ]);

        $product = Product::forTenant($tenantId)->findOrFail($validated['product_id']);

        try {
            DB::beginTransaction();

            // Check if product already has variants
            if ($product->variant_count > 0 && !($validated['override_existing'] ?? false)) {
                return response()->json([
                    'message' => 'Product already has variants. Set override_existing=true to replace them.',
                    'existing_variant_count' => $product->variant_count,
                ], 422);
            }

            // Delete existing variants if override is true
            if ($validated['override_existing'] ?? false) {
                $product->variants()->delete();
            }

            // Apply template and generate variants
            $variantsData = $template->applyToProduct($product);

            // Create variants
            $createdVariants = [];
            foreach ($variantsData as $variantData) {
                $variant = ProductVariant::create([
                    'id' => Str::uuid(),
                    'tenant_id' => $tenantId,
                    'product_id' => $product->id,
                    ...$variantData,
                ]);
                $createdVariants[] = $variant;
            }

            // Mark template as used
            $template->markAsUsed();

            DB::commit();

            return response()->json([
                'message' => 'Template applied successfully',
                'variants_created' => count($createdVariants),
                'data' => [
                    'template' => new VariantTemplateResource($template),
                    'product' => [
                        'id' => $product->id,
                        'name' => $product->name,
                        'variant_count' => $product->fresh()->variant_count,
                    ],
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to apply template',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Preview variants that would be generated from template
     */
    public function preview(Request $request, string $tenantId, string $templateId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $template = VariantTemplate::where(function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
        })->findOrFail($templateId);

        $validated = $request->validate([
            'product_id' => 'required|uuid|exists:products,id',
        ]);

        $product = Product::forTenant($tenantId)->findOrFail($validated['product_id']);

        try {
            // Generate preview data
            $variantsData = $template->applyToProduct($product);

            return response()->json([
                'template' => new VariantTemplateResource($template),
                'product' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'price' => $product->price,
                ],
                'preview' => [
                    'variant_count' => count($variantsData),
                    'total_combinations' => $template->calculateTotalCombinations(),
                    'variants' => $variantsData,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate preview',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a variant template
     */
    public function destroy(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('delete', [Product::class, $tenantId]);

        $template = VariantTemplate::where('tenant_id', $tenantId)->findOrFail($id);

        // Prevent deleting system templates
        if ($template->is_system) {
            return response()->json([
                'message' => 'System templates cannot be deleted',
            ], 403);
        }

        try {
            $template->delete();

            return response()->json([
                'message' => 'Variant template deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete variant template',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}