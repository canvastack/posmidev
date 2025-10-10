<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\User;
use Carbon\Carbon;

/**
 * RecipeVersioningService
 * 
 * Service for managing recipe versions and history
 * Tracks recipe changes, comparisons, and rollback capabilities
 * 
 * @package Src\Pms\Core\Services
 */
class RecipeVersioningService
{
    /**
     * Create a snapshot of current recipe state
     *
     * @param string $recipeId
     * @param string $tenantId
     * @param User $user
     * @param string|null $changeNotes
     * @return array Snapshot data
     */
    public function createSnapshot(string $recipeId, string $tenantId, User $user, ?string $changeNotes = null): array
    {
        $recipe = Recipe::forTenant($tenantId)
            ->with(['recipeMaterials.material', 'product'])
            ->findOrFail($recipeId);

        $snapshot = [
            'version_id' => \Illuminate\Support\Str::uuid()->toString(),
            'recipe_id' => $recipe->id,
            'tenant_id' => $tenantId,
            'snapshot_at' => now()->toIso8601String(),
            'created_by_user_id' => $user->id,
            'created_by_name' => $user->name,
            'change_notes' => $changeNotes,
            'recipe_data' => [
                'name' => $recipe->name,
                'description' => $recipe->description,
                'yield_quantity' => $recipe->yield_quantity,
                'yield_unit' => $recipe->yield_unit,
                'is_active' => $recipe->is_active,
                'notes' => $recipe->notes,
                'product_id' => $recipe->product_id,
                'product_name' => $recipe->product->name ?? null,
            ],
            'components' => $recipe->recipeMaterials->map(function ($component) {
                return [
                    'material_id' => $component->material_id,
                    'material_name' => $component->material->name,
                    'material_sku' => $component->material->sku,
                    'quantity_required' => $component->quantity_required,
                    'unit' => $component->unit,
                    'waste_percentage' => $component->waste_percentage,
                    'notes' => $component->notes,
                    'unit_cost' => $component->material->unit_cost,
                    'total_cost' => round($component->effective_quantity * $component->material->unit_cost, 2),
                ];
            })->toArray(),
            'total_cost' => $recipe->calculateTotalCost(),
        ];

        // In production, this would be stored in a separate recipe_versions table
        // For now, we return the snapshot data structure
        return $snapshot;
    }

    /**
     * Compare two recipe snapshots or states
     *
     * @param array $snapshot1 First snapshot
     * @param array $snapshot2 Second snapshot
     * @return array Comparison result
     */
    public function compareSnapshots(array $snapshot1, array $snapshot2): array
    {
        $changes = [];

        // Compare recipe metadata
        $metadataFields = ['name', 'description', 'yield_quantity', 'yield_unit', 'is_active', 'notes'];
        foreach ($metadataFields as $field) {
            if ($snapshot1['recipe_data'][$field] !== $snapshot2['recipe_data'][$field]) {
                $changes['metadata'][] = [
                    'field' => $field,
                    'old_value' => $snapshot1['recipe_data'][$field],
                    'new_value' => $snapshot2['recipe_data'][$field],
                ];
            }
        }

        // Compare components
        $components1 = collect($snapshot1['components'])->keyBy('material_id');
        $components2 = collect($snapshot2['components'])->keyBy('material_id');

        $allMaterialIds = $components1->keys()->merge($components2->keys())->unique();

        foreach ($allMaterialIds as $materialId) {
            $comp1 = $components1->get($materialId);
            $comp2 = $components2->get($materialId);

            if (!$comp1) {
                $changes['components']['added'][] = $comp2;
            } elseif (!$comp2) {
                $changes['components']['removed'][] = $comp1;
            } else {
                $componentChanges = [];
                
                if ($comp1['quantity_required'] != $comp2['quantity_required']) {
                    $componentChanges['quantity_required'] = [
                        'old' => $comp1['quantity_required'],
                        'new' => $comp2['quantity_required'],
                    ];
                }
                
                if ($comp1['waste_percentage'] != $comp2['waste_percentage']) {
                    $componentChanges['waste_percentage'] = [
                        'old' => $comp1['waste_percentage'],
                        'new' => $comp2['waste_percentage'],
                    ];
                }
                
                if (!empty($componentChanges)) {
                    $changes['components']['modified'][] = [
                        'material_id' => $materialId,
                        'material_name' => $comp2['material_name'],
                        'changes' => $componentChanges,
                    ];
                }
            }
        }

        // Cost comparison
        $costDifference = $snapshot2['total_cost'] - $snapshot1['total_cost'];
        $costPercentageChange = $snapshot1['total_cost'] > 0 
            ? round((($costDifference / $snapshot1['total_cost']) * 100), 2)
            : 0;

        return [
            'comparison_date' => now()->toIso8601String(),
            'snapshot1' => [
                'version_id' => $snapshot1['version_id'],
                'date' => $snapshot1['snapshot_at'],
                'created_by' => $snapshot1['created_by_name'],
            ],
            'snapshot2' => [
                'version_id' => $snapshot2['version_id'],
                'date' => $snapshot2['snapshot_at'],
                'created_by' => $snapshot2['created_by_name'],
            ],
            'has_changes' => !empty($changes),
            'changes' => $changes,
            'cost_analysis' => [
                'old_cost' => $snapshot1['total_cost'],
                'new_cost' => $snapshot2['total_cost'],
                'difference' => round($costDifference, 2),
                'percentage_change' => $costPercentageChange,
            ],
        ];
    }

    /**
     * Get recipe change history summary
     *
     * @param string $recipeId
     * @param string $tenantId
     * @param int $limit
     * @return array
     */
    public function getChangeHistory(string $recipeId, string $tenantId, int $limit = 10): array
    {
        $recipe = Recipe::forTenant($tenantId)->findOrFail($recipeId);

        // Get recipe modifications from updated_at timestamps
        // In production, this would query a recipe_versions table
        
        return [
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'current_version' => [
                'updated_at' => $recipe->updated_at->toIso8601String(),
                'is_active' => $recipe->is_active,
                'component_count' => $recipe->recipeMaterials()->count(),
                'total_cost' => $recipe->calculateTotalCost(),
            ],
            'created_at' => $recipe->created_at->toIso8601String(),
            'last_modified' => $recipe->updated_at->toIso8601String(),
            'history_note' => 'Full versioning requires recipe_versions table implementation',
        ];
    }

    /**
     * Clone recipe to create a new version
     *
     * @param string $recipeId
     * @param string $tenantId
     * @param User $user
     * @param string|null $newName
     * @param array $modifications Optional modifications to apply
     * @return Recipe
     */
    public function cloneRecipe(string $recipeId, string $tenantId, User $user, ?string $newName = null, array $modifications = []): Recipe
    {
        $original = Recipe::forTenant($tenantId)
            ->with('recipeMaterials')
            ->findOrFail($recipeId);

        return DB::transaction(function () use ($original, $newName, $modifications, $tenantId) {
            // Create new recipe
            $newRecipe = Recipe::create([
                'tenant_id' => $tenantId,
                'product_id' => $original->product_id,
                'name' => $newName ?? ($original->name . ' (Copy)'),
                'description' => $original->description . ' [Cloned from v' . now()->timestamp . ']',
                'yield_quantity' => $modifications['yield_quantity'] ?? $original->yield_quantity,
                'yield_unit' => $modifications['yield_unit'] ?? $original->yield_unit,
                'is_active' => false, // Cloned recipes start as inactive
                'notes' => $modifications['notes'] ?? $original->notes,
            ]);

            // Clone components
            foreach ($original->recipeMaterials as $component) {
                RecipeMaterial::create([
                    'tenant_id' => $tenantId,
                    'recipe_id' => $newRecipe->id,
                    'material_id' => $component->material_id,
                    'quantity_required' => $component->quantity_required,
                    'unit' => $component->unit,
                    'waste_percentage' => $component->waste_percentage,
                    'notes' => $component->notes,
                ]);
            }

            return $newRecipe->fresh(['recipeMaterials.material', 'product']);
        });
    }

    /**
     * Calculate impact of recipe changes on cost
     *
     * @param string $recipeId
     * @param string $tenantId
     * @param array $proposedChanges
     * @return array
     */
    public function analyzeChangeImpact(string $recipeId, string $tenantId, array $proposedChanges): array
    {
        $recipe = Recipe::forTenant($tenantId)
            ->with(['recipeMaterials.material'])
            ->findOrFail($recipeId);

        $currentCost = $recipe->calculateTotalCost();
        $currentComponents = $recipe->recipeMaterials->keyBy('material_id');

        $projectedCost = 0;
        $impactDetails = [];

        // Calculate projected cost with changes
        foreach ($proposedChanges['components'] ?? [] as $change) {
            $materialId = $change['material_id'];
            $existing = $currentComponents->get($materialId);

            if ($existing) {
                $newQuantity = $change['quantity_required'] ?? $existing->quantity_required;
                $newWaste = $change['waste_percentage'] ?? $existing->waste_percentage;
                $effectiveQty = $newQuantity * (1 + $newWaste / 100);
                $componentCost = $effectiveQty * $existing->material->unit_cost;

                $impactDetails[] = [
                    'material_name' => $existing->material->name,
                    'action' => 'modified',
                    'old_quantity' => $existing->quantity_required,
                    'new_quantity' => $newQuantity,
                    'old_waste' => $existing->waste_percentage,
                    'new_waste' => $newWaste,
                    'cost_change' => round($componentCost - $existing->total_cost, 2),
                ];

                $projectedCost += $componentCost;
            }
        }

        // Add unchanged components
        foreach ($currentComponents as $materialId => $component) {
            $hasChange = collect($proposedChanges['components'] ?? [])->firstWhere('material_id', $materialId);
            if (!$hasChange) {
                $projectedCost += $component->total_cost;
            }
        }

        $costDifference = $projectedCost - $currentCost;
        $percentageChange = $currentCost > 0 ? round((($costDifference / $currentCost) * 100), 2) : 0;

        return [
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'current_cost' => round($currentCost, 2),
            'projected_cost' => round($projectedCost, 2),
            'cost_difference' => round($costDifference, 2),
            'percentage_change' => $percentageChange,
            'impact_level' => $this->determineImpactLevel($percentageChange),
            'component_changes' => $impactDetails,
            'recommendation' => $this->generateRecommendation($percentageChange, $costDifference),
        ];
    }

    /**
     * Determine impact level based on percentage change
     *
     * @param float $percentageChange
     * @return string
     */
    private function determineImpactLevel(float $percentageChange): string
    {
        $abs = abs($percentageChange);
        
        if ($abs > 20) return 'High';
        if ($abs > 10) return 'Moderate';
        if ($abs > 5) return 'Low';
        return 'Minimal';
    }

    /**
     * Generate recommendation based on cost impact
     *
     * @param float $percentageChange
     * @param float $costDifference
     * @return string
     */
    private function generateRecommendation(float $percentageChange, float $costDifference): string
    {
        if ($percentageChange > 20) {
            return 'Significant cost increase. Consider reviewing material quantities or sourcing alternatives.';
        }
        
        if ($percentageChange < -20) {
            return 'Significant cost reduction achieved! Consider updating product pricing.';
        }
        
        if ($percentageChange > 10) {
            return 'Moderate cost increase. Monitor impact on profit margins.';
        }
        
        if ($percentageChange < -10) {
            return 'Moderate cost savings. Good opportunity for competitive pricing.';
        }
        
        return 'Minimal cost impact. Changes can be implemented safely.';
    }

    /**
     * Get recipe comparison by date range
     *
     * @param string $recipeId
     * @param string $tenantId
     * @param Carbon $fromDate
     * @param Carbon $toDate
     * @return array
     */
    public function getRecipeEvolution(string $recipeId, string $tenantId, Carbon $fromDate, Carbon $toDate): array
    {
        $recipe = Recipe::forTenant($tenantId)->findOrFail($recipeId);

        // In production, query recipe_versions table within date range
        // For now, return current state with metadata

        return [
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'evolution_period' => [
                'from' => $fromDate->toIso8601String(),
                'to' => $toDate->toIso8601String(),
            ],
            'current_state' => [
                'component_count' => $recipe->recipeMaterials()->count(),
                'total_cost' => $recipe->calculateTotalCost(),
                'is_active' => $recipe->is_active,
                'last_updated' => $recipe->updated_at->toIso8601String(),
            ],
            'note' => 'Full evolution tracking requires recipe_versions table',
        ];
    }
}