<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Pagination\LengthAwarePaginator;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\User;

/**
 * MaterialService
 * 
 * Service layer for Material management
 * Handles CRUD operations, stock adjustments, and business logic
 * 
 * @package Src\Pms\Core\Services
 */
class MaterialService
{
    /**
     * Get all materials for a tenant with filters and pagination
     *
     * @param string $tenantId
     * @param array $filters ['search', 'category', 'unit', 'status']
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getAllForTenant(string $tenantId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Material::forTenant($tenantId);

        // Search filter (name, sku, supplier)
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('supplier', 'like', "%{$search}%");
            });
        }

        // Category filter
        if (!empty($filters['category'])) {
            $query->byCategory($filters['category']);
        }

        // Unit filter
        if (!empty($filters['unit'])) {
            $query->byUnit($filters['unit']);
        }

        // Stock status filter
        if (!empty($filters['status'])) {
            switch ($filters['status']) {
                case 'low_stock':
                    $query->lowStock();
                    break;
                case 'out_of_stock':
                    $query->where('stock_quantity', '<=', 0);
                    break;
                case 'normal':
                    $query->where('stock_quantity', '>', DB::raw('reorder_level'));
                    break;
            }
        }

        // Sort options
        $sortBy = $filters['sort_by'] ?? 'name';
        $sortOrder = $filters['sort_order'] ?? 'asc';
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate($perPage);
    }

    /**
     * Get material by ID with relations
     *
     * @param string $id
     * @param string $tenantId
     * @param array $with Relations to eager load
     * @return Material
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getById(string $id, string $tenantId, array $with = []): Material
    {
        $query = Material::forTenant($tenantId);

        if (!empty($with)) {
            $query->with($with);
        }

        return $query->findOrFail($id);
    }

    /**
     * Create a new material
     *
     * @param string $tenantId
     * @param array $data
     * @return Material
     * @throws ValidationException
     */
    public function create(string $tenantId, array $data): Material
    {
        // Validate data
        $validated = $this->validateMaterialData($data, $tenantId);

        return DB::transaction(function () use ($tenantId, $validated) {
            $material = Material::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $tenantId,
                'name' => $validated['name'],
                'sku' => $validated['sku'] ?? null,
                'description' => $validated['description'] ?? null,
                'category' => $validated['category'] ?? null,
                'unit' => $validated['unit'],
                'stock_quantity' => $validated['stock_quantity'] ?? 0,
                'reorder_level' => $validated['reorder_level'] ?? 0,
                'unit_cost' => $validated['unit_cost'] ?? 0,
                'supplier' => $validated['supplier'] ?? null,
            ]);

            return $material;
        });
    }

    /**
     * Update existing material
     *
     * @param string $id
     * @param string $tenantId
     * @param array $data
     * @return Material
     * @throws ValidationException
     */
    public function update(string $id, string $tenantId, array $data): Material
    {
        $material = $this->getById($id, $tenantId);

        // Validate data (excluding stock_quantity which should use adjustStock)
        $validated = $this->validateMaterialData($data, $tenantId, $id);

        return DB::transaction(function () use ($material, $validated) {
            $material->update([
                'name' => $validated['name'] ?? $material->name,
                'sku' => $validated['sku'] ?? $material->sku,
                'description' => $validated['description'] ?? $material->description,
                'category' => $validated['category'] ?? $material->category,
                'unit' => $validated['unit'] ?? $material->unit,
                'reorder_level' => $validated['reorder_level'] ?? $material->reorder_level,
                'unit_cost' => $validated['unit_cost'] ?? $material->unit_cost,
                'supplier' => $validated['supplier'] ?? $material->supplier,
            ]);

            return $material->fresh();
        });
    }

    /**
     * Soft delete material
     * Only if not used in active recipes
     *
     * @param string $id
     * @param string $tenantId
     * @return bool
     * @throws \RuntimeException
     */
    public function delete(string $id, string $tenantId): bool
    {
        $material = $this->getById($id, $tenantId, ['recipeMaterials.recipe']);

        if (!$material->canBeDeleted()) {
            $activeRecipes = $material->getActiveRecipesUsingMaterial();
            $recipeNames = $activeRecipes->pluck('name')->join(', ');
            
            throw new \RuntimeException(
                "Cannot delete material '{$material->name}'. " .
                "It is used in active recipe(s): {$recipeNames}"
            );
        }

        return $material->delete();
    }

    /**
     * Adjust stock quantity with transaction logging
     *
     * @param string $id
     * @param string $tenantId
     * @param string $type adjustment|deduction|restock
     * @param float $quantity
     * @param string $reason purchase|waste|damage|count_adjustment|production|sale|other
     * @param string|null $notes
     * @param User|null $user
     * @return Material
     * @throws \RuntimeException
     */
    public function adjustStock(
        string $id,
        string $tenantId,
        string $type,
        float $quantity,
        string $reason,
        ?string $notes = null,
        ?User $user = null
    ): Material {
        $material = $this->getById($id, $tenantId);

        // Validate type
        $validTypes = ['adjustment', 'deduction', 'restock'];
        if (!in_array($type, $validTypes)) {
            throw new \InvalidArgumentException("Invalid transaction type. Must be one of: " . implode(', ', $validTypes));
        }

        // Validate reason
        $validReasons = ['purchase', 'waste', 'damage', 'count_adjustment', 'production', 'sale', 'other'];
        if (!in_array($reason, $validReasons)) {
            throw new \InvalidArgumentException("Invalid reason. Must be one of: " . implode(', ', $validReasons));
        }

        // Adjust stock (will create transaction automatically)
        $material->adjustStock($type, $quantity, $reason, $notes, $user);

        return $material->fresh();
    }

    /**
     * Bulk create materials
     * Returns array with created materials and errors
     *
     * @param string $tenantId
     * @param array $materials Array of material data
     * @return array ['created' => Material[], 'errors' => array]
     */
    public function bulkCreate(string $tenantId, array $materials): array
    {
        $created = [];
        $errors = [];

        foreach ($materials as $index => $materialData) {
            try {
                $material = $this->create($tenantId, $materialData);
                $created[] = $material;
            } catch (\Exception $e) {
                $errors[$index] = [
                    'data' => $materialData,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'created' => $created,
            'errors' => $errors,
        ];
    }

    /**
     * Get materials below reorder level
     *
     * @param string $tenantId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getLowStock(string $tenantId)
    {
        return Material::forTenant($tenantId)
            ->lowStock()
            ->with(['recipeMaterials.recipe'])
            ->orderBy('stock_quantity', 'asc')
            ->get();
    }

    /**
     * Get materials that are out of stock
     *
     * @param string $tenantId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getOutOfStock(string $tenantId)
    {
        return Material::forTenant($tenantId)
            ->where('stock_quantity', '<=', 0)
            ->with(['recipeMaterials.recipe'])
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Get materials by category
     *
     * @param string $tenantId
     * @param string $category
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getByCategory(string $tenantId, string $category)
    {
        return Material::forTenant($tenantId)
            ->byCategory($category)
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Get all unique categories for tenant
     *
     * @param string $tenantId
     * @return array
     */
    public function getCategories(string $tenantId): array
    {
        return Material::forTenant($tenantId)
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->toArray();
    }

    /**
     * Validate material data
     *
     * @param array $data
     * @param string $tenantId
     * @param string|null $materialId For update operations
     * @return array
     * @throws ValidationException
     */
    protected function validateMaterialData(array $data, string $tenantId, ?string $materialId = null): array
    {
        $rules = [
            'name' => 'required|string|max:255',
            'sku' => [
                'nullable',
                'string',
                'max:100',
                // Unique per tenant, excluding soft deleted
                function ($attribute, $value, $fail) use ($tenantId, $materialId) {
                    if (!$value) return;
                    
                    $query = Material::forTenant($tenantId)
                        ->where('sku', $value);
                    
                    if ($materialId) {
                        $query->where('id', '!=', $materialId);
                    }
                    
                    if ($query->exists()) {
                        $fail("The SKU '{$value}' is already used by another material in this tenant.");
                    }
                },
            ],
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|string|max:100',
            'unit' => 'sometimes|required|string|in:kg,g,L,ml,pcs,box,bottle,can,bag',
            'stock_quantity' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
        ];

        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }
}