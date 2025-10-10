<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;

/**
 * RecipeService
 * 
 * Service layer for Recipe management
 * Handles CRUD operations, activation logic, and component management
 * 
 * @package Src\Pms\Core\Services
 */
class RecipeService
{
    public function __construct()
    {
        // Register custom UUID validation rule
        Validator::extend('uuid', function ($attribute, $value, $parameters, $validator) {
            if (!$value) return false;
            return \Illuminate\Support\Str::isUuid($value);
        });
    }

    /**
     * Get all recipes for a tenant with filters and pagination
     *
     * @param string $tenantId
     * @param array $filters ['search', 'product_id', 'is_active']
     * @param int $perPage
     * @return array
     */
    public function getAllForTenant(string $tenantId, array $filters = [], int $perPage = 15): array
    {
        $query = Recipe::forTenant($tenantId)
            ->with(['product', 'recipeMaterials.material']);

        // Search filter (name, description)
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Product filter
        if (!empty($filters['product_id'])) {
            $query->forProduct($filters['product_id']);
        }

        // Active status filter
        if (isset($filters['is_active'])) {
            if ($filters['is_active'] === true || $filters['is_active'] === 'true' || $filters['is_active'] === '1') {
                $query->active();
            } else {
                $query->where('is_active', false);
            }
        }

        // Sort options
        $sortBy = $filters['sort_by'] ?? 'name';
        $sortOrder = $filters['sort_order'] ?? 'asc';
        $query->orderBy($sortBy, $sortOrder);

        $paginated = $query->paginate($perPage);

        return [
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
        ];
    }

    /**
     * Get recipe by ID with components
     *
     * @param string $id
     * @param string $tenantId
     * @return Recipe
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getById(string $id, string $tenantId): Recipe
    {
        return Recipe::forTenant($tenantId)
            ->with(['product', 'recipeMaterials.material', 'tenant'])
            ->findOrFail($id);
    }

    /**
     * Create new recipe with components
     * Creates recipe and all components atomically in a transaction
     *
     * @param string $tenantId
     * @param array $data
     * @return Recipe
     * @throws ValidationException
     */
    public function create(string $tenantId, array $data): Recipe
    {
        // Validate recipe data
        $validated = $this->validateRecipeData($data, $tenantId);

        return DB::transaction(function () use ($tenantId, $validated) {
            // Create recipe
            $recipe = Recipe::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $tenantId,
                'product_id' => $validated['product_id'] ?? null,
                'name' => $validated['name'] ?? '',
                'description' => $validated['description'] ?? null,
                'yield_quantity' => $validated['yield_quantity'] ?? 0,
                'yield_unit' => $validated['yield_unit'] ?? 'pcs',
                'is_active' => $validated['is_active'] ?? false,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Create components if provided
            if (!empty($validated['components'])) {
                foreach ($validated['components'] as $componentData) {
                    $this->createComponent($recipe->id, $tenantId, $componentData);
                }
            }

            // If marked as active, ensure only this one is active for the product
            if ($recipe->is_active) {
                $recipe->activate();
            }

            return $recipe->fresh(['product', 'recipeMaterials.material']);
        });
    }

    /**
     * Update recipe metadata (not components)
     * Use addComponent/updateComponent/removeComponent for component management
     *
     * @param string $id
     * @param string $tenantId
     * @param array $data
     * @return Recipe
     * @throws ValidationException
     */
    public function update(string $id, string $tenantId, array $data): Recipe
    {
        $recipe = $this->getById($id, $tenantId);

        // Validate data
        $validated = $this->validateRecipeData($data, $tenantId, $id);

        return DB::transaction(function () use ($recipe, $validated) {
            $recipe->update([
                'name' => $validated['name'] ?? $recipe->name,
                'description' => $validated['description'] ?? $recipe->description,
                'yield_quantity' => $validated['yield_quantity'] ?? $recipe->yield_quantity,
                'yield_unit' => $validated['yield_unit'] ?? $recipe->yield_unit,
                'notes' => $validated['notes'] ?? $recipe->notes,
            ]);

            return $recipe->fresh(['product', 'recipeMaterials.material']);
        });
    }

    /**
     * Soft delete recipe
     * Only if not active
     *
     * @param string $id
     * @param string $tenantId
     * @return bool
     * @throws \RuntimeException
     */
    public function delete(string $id, string $tenantId): bool
    {
        $recipe = $this->getById($id, $tenantId);

        if (!$recipe->canBeDeleted()) {
            throw new \RuntimeException(
                "Cannot delete recipe '{$recipe->name}'. " .
                "Active recipes cannot be deleted. Deactivate it first."
            );
        }

        return $recipe->delete();
    }

    /**
     * Activate a recipe
     * Deactivates other recipes for the same product
     *
     * @param string $id
     * @param string $tenantId
     * @return Recipe
     */
    public function activate(string $id, string $tenantId): Recipe
    {
        $recipe = $this->getById($id, $tenantId);

        $recipe->activate();

        return $recipe->fresh(['product', 'recipeMaterials.material']);
    }

    /**
     * Deactivate a recipe
     *
     * @param string $id
     * @param string $tenantId
     * @return Recipe
     */
    public function deactivate(string $id, string $tenantId): Recipe
    {
        $recipe = $this->getById($id, $tenantId);

        $recipe->deactivate();

        return $recipe->fresh(['product', 'recipeMaterials.material']);
    }

    /**
     * Add material component to recipe
     *
     * @param string $recipeId
     * @param string $tenantId
     * @param array $componentData
     * @return RecipeMaterial
     * @throws ValidationException
     */
    public function addComponent(string $recipeId, string $tenantId, array $componentData): RecipeMaterial
    {
        $recipe = $this->getById($recipeId, $tenantId);

        return $this->createComponent($recipeId, $tenantId, $componentData);
    }

    /**
     * Update recipe component
     *
     * @param string $componentId
     * @param string $tenantId
     * @param array $data
     * @return RecipeMaterial
     * @throws ValidationException
     */
    public function updateComponent(string $componentId, string $tenantId, array $data): RecipeMaterial
    {
        $component = RecipeMaterial::forTenant($tenantId)
            ->with(['recipe', 'material'])
            ->findOrFail($componentId);

        // FormRequest already validated the data, so we can use it directly
        return DB::transaction(function () use ($component, $data) {
            $component->update([
                'quantity_required' => $data['quantity_required'] ?? $component->quantity_required,
                'unit' => $data['unit'] ?? $component->unit,
                'waste_percentage' => $data['waste_percentage'] ?? $component->waste_percentage,
                'notes' => $data['notes'] ?? $component->notes,
            ]);

            return $component->fresh(['material']);
        });
    }

    /**
     * Remove material component from recipe
     *
     * @param string $componentId
     * @param string $tenantId
     * @return bool
     */
    public function removeComponent(string $componentId, string $tenantId): bool
    {
        $component = RecipeMaterial::forTenant($tenantId)
            ->findOrFail($componentId);

        return $component->delete();
    }

    /**
     * Get all recipes for a specific product
     *
     * @param string $productId
     * @param string $tenantId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getRecipesForProduct(string $productId, string $tenantId)
    {
        return Recipe::forTenant($tenantId)
            ->forProduct($productId)
            ->with(['recipeMaterials.material'])
            ->orderBy('is_active', 'desc')
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Get active recipe for a product
     *
     * @param string $productId
     * @param string $tenantId
     * @return Recipe|null
     */
    public function getActiveRecipeForProduct(string $productId, string $tenantId): ?Recipe
    {
        return Recipe::forTenant($tenantId)
            ->forProduct($productId)
            ->active()
            ->with(['recipeMaterials.material'])
            ->first();
    }

    /**
     * Calculate production cost for recipe
     *
     * @param string $id
     * @param string $tenantId
     * @return array
     */
    public function calculateCost(string $id, string $tenantId): array
    {
        $recipe = $this->getById($id, $tenantId);

        $totalCost = $recipe->calculateTotalCost();
        $costPerUnit = $recipe->cost_per_unit;

        return [
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'total_cost' => round($totalCost, 2),
            'cost_per_unit' => round($costPerUnit, 2),
            'yield_quantity' => $recipe->yield_quantity,
            'yield_unit' => $recipe->yield_unit,
        ];
    }

    /**
     * Get detailed cost breakdown for recipe including all components
     *
     * @param string $id
     * @param string $tenantId
     * @return array
     */
    public function getCostBreakdown(string $id, string $tenantId): array
    {
        $recipe = $this->getById($id, $tenantId);

        $components = $recipe->recipeMaterials()->with('material')->get();
        
        $componentBreakdown = $components->map(function ($component) {
            return [
                'component_id' => $component->id,
                'material_id' => $component->material_id,
                'material_name' => $component->material->name ?? 'Unknown',
                'material_unit' => $component->material->unit ?? '',
                'quantity_required' => (float) $component->quantity_required,
                'waste_percentage' => (float) $component->waste_percentage,
                'effective_quantity' => (float) $component->effective_quantity,
                'unit_cost' => (float) ($component->material->unit_cost ?? 0),
                'total_cost' => (float) $component->total_cost,
            ];
        })->toArray();

        $totalCost = $recipe->calculateTotalCost();
        $costPerUnit = $recipe->yield_quantity > 0 ? $totalCost / $recipe->yield_quantity : 0;

        return [
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'total_cost' => round($totalCost, 2),
            'cost_per_unit' => round($costPerUnit, 2),
            'yield_quantity' => (float) $recipe->yield_quantity,
            'yield_unit' => $recipe->yield_unit,
            'components' => $componentBreakdown,
        ];
    }

    /**
     * Internal: Create a component with validation
     *
     * @param string $recipeId
     * @param string $tenantId
     * @param array $componentData
     * @return RecipeMaterial
     * @throws ValidationException
     */
    protected function createComponent(string $recipeId, string $tenantId, array $componentData): RecipeMaterial
    {
        // Validate component data
        $validated = $this->validateComponentData($componentData, $tenantId, $recipeId);

        return DB::transaction(function () use ($recipeId, $tenantId, $validated) {
            // Check for duplicate material in recipe
            $exists = RecipeMaterial::where('recipe_id', $recipeId)
                ->where('material_id', $validated['material_id'])
                ->exists();

            if ($exists) {
                $validator = Validator::make([], []);
                $validator->errors()->add('material_id', 'Material is already added to this recipe. Update the existing component instead.');
                throw new ValidationException($validator);
            }

            return RecipeMaterial::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $tenantId,
                'recipe_id' => $recipeId,
                'material_id' => $validated['material_id'],
                'quantity_required' => $validated['quantity_required'],
                'unit' => $validated['unit'],
                'waste_percentage' => $validated['waste_percentage'] ?? 0,
                'notes' => $validated['notes'] ?? null,
            ]);
        });
    }

    /**
     * Validate recipe data
     *
     * @param array $data
     * @param string $tenantId
     * @param string|null $recipeId For update operations
     * @return array
     * @throws ValidationException
     */
    protected function validateRecipeData(array $data, string $tenantId, ?string $recipeId = null): array
    {
        // For updates, product_id is optional (we don't allow changing product)
        // For creates, product_id is required
        $productIdRule = $recipeId ? 'sometimes|required' : 'required';
        
        $rules = [
            'product_id' => [
                $productIdRule,
                'uuid',
                function ($attribute, $value, $fail) use ($tenantId) {
                    $exists = Product::where('id', $value)
                        ->where('tenant_id', $tenantId)
                        ->exists();

                    if (!$exists) {
                        $fail('The selected product does not exist in this tenant.');
                    }
                },
            ],
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'yield_quantity' => 'sometimes|required|numeric|min:0.001',
            'yield_unit' => 'sometimes|required|string|in:pcs,kg,L,serving,batch',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
            'components' => 'nullable|array|min:1',
            'components.*.material_id' => 'required_with:components|uuid',
            'components.*.quantity_required' => 'required_with:components|numeric|min:0.001',
            'components.*.unit' => 'required_with:components|string',
            'components.*.waste_percentage' => 'nullable|numeric|min:0|max:100',
            'components.*.notes' => 'nullable|string|max:500',
        ];

        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }

    /**
     * Validate component data
     *
     * @param array $data
     * @param string $tenantId
     * @param string|null $recipeId For checking duplicates
     * @return array
     * @throws ValidationException
     */
    protected function validateComponentData(array $data, string $tenantId, ?string $recipeId = null): array
    {
        $rules = [
            'material_id' => [
                'required',
                'uuid',
                function ($attribute, $value, $fail) use ($tenantId) {
                    if (!$value) return;

                    $exists = Material::forTenant($tenantId)
                        ->where('id', $value)
                        ->exists();

                    if (!$exists) {
                        $fail('The selected material does not exist in this tenant.');
                    }
                },
            ],
            'quantity_required' => 'required|numeric|min:0.001',
            'unit' => 'required|string|max:50',
            'waste_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:500',
        ];

        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }
}