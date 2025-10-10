<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\Recipe>
 */
class RecipeFactory extends Factory
{
    protected $model = Recipe::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'product_id' => Product::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'yield_quantity' => fake()->randomFloat(3, 1, 100),
            'yield_unit' => fake()->randomElement(['pcs', 'kg', 'L', 'serving', 'batch']),
            'is_active' => false,
            'notes' => fake()->optional()->paragraph(),
        ];
    }

    /**
     * Indicate that the recipe is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => true,
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
     * For a specific product.
     */
    public function forProduct(string $productId): static
    {
        return $this->state(fn (array $attributes) => [
            'product_id' => $productId,
        ]);
    }
}