<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Category;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = fake()->randomFloat(2, 10, 1000);
        $costPrice = $price * 0.6; // Cost is 60% of selling price

        return [
            'id' => (string) Str::uuid(),
            'tenant_id' => Tenant::factory(),
            'category_id' => Category::factory(),
            'name' => fake()->words(3, true),
            'sku' => strtoupper(fake()->unique()->bothify('PRD-####??')),
            'description' => fake()->sentence(),
            'price' => $price,
            'cost_price' => $costPrice,
            'stock' => fake()->numberBetween(0, 500),
            'status' => fake()->randomElement(['active', 'inactive', 'discontinued']),
        ];
    }

    /**
     * Indicate that the product is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    /**
     * Indicate that the product is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    /**
     * Indicate that the product is discontinued.
     */
    public function discontinued(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'discontinued',
        ]);
    }

    /**
     * Indicate that the product is out of stock.
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 0,
        ]);
    }

    /**
     * Indicate that the product has low stock.
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => fake()->numberBetween(1, 10),
        ]);
    }

    /**
     * Indicate that the product is in stock.
     */
    public function inStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => fake()->numberBetween(50, 500),
        ]);
    }

    /**
     * Set a specific price for the product.
     */
    public function withPrice(float $price): static
    {
        return $this->state(fn (array $attributes) => [
            'price' => $price,
            'cost_price' => $price * 0.6,
        ]);
    }
}