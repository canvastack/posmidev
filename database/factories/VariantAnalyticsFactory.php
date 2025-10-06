<?php

namespace Database\Factories;

use Src\Pms\Infrastructure\Models\VariantAnalytics;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Ramsey\Uuid\Uuid;

/**
 * Factory for VariantAnalytics model
 * 
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\VariantAnalytics>
 */
class VariantAnalyticsFactory extends Factory
{
    protected $model = VariantAnalytics::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $salesCount = $this->faker->numberBetween(0, 500);
        $revenue = $salesCount * $this->faker->randomFloat(2, 50, 200);

        return [
            'id' => (string) Uuid::uuid4(),
            'product_variant_id' => ProductVariant::factory(),
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'sales_count' => $salesCount,
            'revenue' => $revenue,
            'profit' => $revenue * 0.4,
            'views_count' => $this->faker->numberBetween(0, 1000),
            'conversion_rate' => $this->faker->randomFloat(2, 0, 100),
            'return_count' => $this->faker->numberBetween(0, 10),
            'stock_turnover' => $this->faker->randomFloat(2, 0, 50),
            'performance_score' => $this->faker->randomFloat(2, 0, 100),
            'rank_in_product' => $this->faker->numberBetween(1, 10),
            'created_at' => now(),
            'updated_at' => now()
        ];
    }

    /**
     * High performer
     */
    public function highPerformer(): static
    {
        return $this->state(fn (array $attributes) => [
            'sales_count' => $this->faker->numberBetween(100, 500),
            'performance_score' => $this->faker->randomFloat(2, 80, 100),
            'rank_in_product' => 1
        ]);
    }

    /**
     * Low performer
     */
    public function lowPerformer(): static
    {
        return $this->state(fn (array $attributes) => [
            'sales_count' => $this->faker->numberBetween(0, 10),
            'performance_score' => $this->faker->randomFloat(2, 0, 30),
            'rank_in_product' => 10
        ]);
    }

    /**
     * Set specific variant
     */
    public function forVariant(string $variantId): static
    {
        return $this->state(fn (array $attributes) => [
            'product_variant_id' => $variantId
        ]);
    }
}