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
        $stock = fake()->numberBetween(0, 500);
        $reorderPoint = fake()->numberBetween(10, 50); // Random reorder point

        return [
            'id' => (string) Str::uuid(),
            'tenant_id' => Tenant::factory(),
            'category_id' => Category::factory(),
            'name' => fake()->words(3, true),
            'sku' => strtoupper(fake()->unique()->bothify('PRD-####??')),
            'description' => fake()->sentence(),
            'price' => $price,
            'cost_price' => $costPrice,
            'stock' => $stock,
            'reorder_point' => $reorderPoint,
            'reorder_quantity' => fake()->numberBetween(20, 100),
            'low_stock_alert_enabled' => fake()->boolean(80), // 80% enabled by default
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
            'reorder_point' => fake()->numberBetween(15, 30),
            'low_stock_alert_enabled' => true,
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
     * Indicate that the product will trigger low stock alert.
     * Stock is set below reorder point to trigger alert.
     */
    public function withLowStockAlert(): static
    {
        $reorderPoint = fake()->numberBetween(20, 50);
        return $this->state(fn (array $attributes) => [
            'stock' => fake()->numberBetween(1, $reorderPoint - 1),
            'reorder_point' => $reorderPoint,
            'reorder_quantity' => fake()->numberBetween(50, 100),
            'low_stock_alert_enabled' => true,
        ]);
    }

    /**
     * Indicate that the product will trigger critical alert.
     * Stock is set below half of reorder point.
     */
    public function withCriticalAlert(): static
    {
        $reorderPoint = fake()->numberBetween(20, 50);
        $criticalThreshold = intval($reorderPoint / 2);
        return $this->state(fn (array $attributes) => [
            'stock' => fake()->numberBetween(1, max(1, $criticalThreshold - 1)),
            'reorder_point' => $reorderPoint,
            'reorder_quantity' => fake()->numberBetween(50, 100),
            'low_stock_alert_enabled' => true,
        ]);
    }

    /**
     * Indicate that the product will trigger out of stock alert.
     */
    public function withOutOfStockAlert(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 0,
            'reorder_point' => fake()->numberBetween(20, 50),
            'reorder_quantity' => fake()->numberBetween(50, 100),
            'low_stock_alert_enabled' => true,
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