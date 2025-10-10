<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\Material>
 */
class MaterialFactory extends Factory
{
    protected $model = Material::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->words(3, true),
            'sku' => strtoupper(fake()->unique()->bothify('MAT-###??')),
            'description' => fake()->optional()->sentence(),
            'category' => fake()->randomElement(['Raw Material', 'Packaging', 'Ingredient', 'Supply']),
            'unit' => fake()->randomElement(['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bottle', 'can', 'bag']),
            'stock_quantity' => fake()->randomFloat(3, 0, 1000),
            'reorder_level' => fake()->randomFloat(3, 10, 100),
            'unit_cost' => fake()->randomFloat(2, 1, 500),
            'supplier' => fake()->optional()->company(),
        ];
    }

    /**
     * Indicate that the material is low on stock.
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock_quantity' => fake()->randomFloat(3, 0, 15),
            'reorder_level' => 20.0,
        ]);
    }

    /**
     * Indicate that the material is out of stock.
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock_quantity' => 0,
            'reorder_level' => 20.0,
        ]);
    }

    /**
     * Indicate that the material has critical stock.
     */
    public function criticalStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock_quantity' => fake()->randomFloat(3, 1, 5),
            'reorder_level' => 20.0,
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
     * With specific category.
     */
    public function withCategory(string $category): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => $category,
        ]);
    }
}