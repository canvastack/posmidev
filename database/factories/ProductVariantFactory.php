<?php

namespace Database\Factories;

use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Ramsey\Uuid\Uuid;

/**
 * Factory for ProductVariant model
 * 
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = $this->faker->randomFloat(2, 50, 500);
        $costPrice = $price * 0.6; // 40% margin

        return [
            'id' => (string) Uuid::uuid4(),
            'tenant_id' => Tenant::factory(),
            'product_id' => Product::factory(),
            'sku' => 'VAR-' . strtoupper($this->faker->bothify('???-###')),
            'barcode' => $this->faker->ean13(),
            'name' => $this->faker->words(3, true),
            'attributes' => [
                'size' => $this->faker->randomElement(['S', 'M', 'L', 'XL', 'XXL']),
                'color' => $this->faker->safeColorName(),
            ],
            'price' => $price,
            'cost_price' => $costPrice,
            'price_modifier' => 0,
            'stock' => $this->faker->numberBetween(0, 200),
            'reserved_stock' => $this->faker->numberBetween(0, 20),
            'reorder_point' => $this->faker->numberBetween(5, 20),
            'reorder_quantity' => $this->faker->numberBetween(10, 50),
            'image_path' => $this->faker->optional()->filePath(),
            'thumbnail_path' => $this->faker->optional()->filePath(),
            'is_active' => true,
            'is_default' => false,
            'sort_order' => 0,
            'notes' => $this->faker->optional()->sentence(),
            'metadata' => null,
            'created_at' => now(),
            'updated_at' => now()
        ];
    }

    /**
     * Indicate that the variant is inactive
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false
        ]);
    }

    /**
     * Indicate that the variant has low stock
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => $this->faker->numberBetween(0, 5),
            'reserved_stock' => 0
        ]);
    }

    /**
     * Indicate that the variant is out of stock
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 0,
            'reserved_stock' => 0
        ]);
    }

    /**
     * Set custom attributes
     */
    public function withAttributes(array $attributes): static
    {
        return $this->state(fn (array $attrs) => [
            'attributes' => $attributes
        ]);
    }

    /**
     * Set specific tenant
     */
    public function forTenant(string $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId
        ]);
    }

    /**
     * Set specific product
     */
    public function forProduct(string $productId): static
    {
        return $this->state(fn (array $attributes) => [
            'product_id' => $productId
        ]);
    }
}