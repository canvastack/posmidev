<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Material;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\RecipeMaterial>
 */
class RecipeMaterialFactory extends Factory
{
    protected $model = RecipeMaterial::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'recipe_id' => Recipe::factory(),
            'material_id' => Material::factory(),
            'quantity_required' => fake()->randomFloat(3, 0.1, 50),
            'unit' => fake()->randomElement(['kg', 'g', 'L', 'ml', 'pcs', 'box']),
            'waste_percentage' => fake()->randomFloat(2, 0, 15),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    /**
     * Without waste.
     */
    public function withoutWaste(): static
    {
        return $this->state(fn (array $attributes) => [
            'waste_percentage' => 0,
        ]);
    }

    /**
     * With high waste.
     */
    public function highWaste(): static
    {
        return $this->state(fn (array $attributes) => [
            'waste_percentage' => fake()->randomFloat(2, 20, 40),
        ]);
    }

    /**
     * For a specific tenant.
     */
    public function forTenant(string $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId,
        ]);
    }

    /**
     * For a specific recipe.
     */
    public function forRecipe(string $recipeId): static
    {
        return $this->state(fn (array $attributes) => [
            'recipe_id' => $recipeId,
        ]);
    }

    /**
     * For a specific material.
     */
    public function forMaterial(string $materialId): static
    {
        return $this->state(fn (array $attributes) => [
            'material_id' => $materialId,
        ]);
    }
}