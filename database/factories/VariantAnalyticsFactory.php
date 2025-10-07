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
        $periodDate = $this->faker->dateTimeBetween('-30 days', 'now');
        $quantitySold = $this->faker->numberBetween(0, 500);
        $revenue = $quantitySold * $this->faker->randomFloat(2, 50, 200);
        $profit = $revenue * $this->faker->randomFloat(2, 0.2, 0.5);
        $stockStart = $this->faker->numberBetween(100, 1000);
        $stockEnd = max(0, $stockStart - $quantitySold);

        return [
            'id' => (string) Uuid::uuid4(),
            'product_variant_id' => ProductVariant::factory(),
            'period_date' => $periodDate,
            'period_start' => $periodDate,
            'period_end' => $periodDate,
            'period_type' => $this->faker->randomElement(['daily', 'weekly', 'monthly']),
            'total_orders' => $this->faker->numberBetween(0, 100),
            'quantity_sold' => $quantitySold,
            'revenue' => $revenue,
            'profit' => $profit,
            'stock_start' => $stockStart,
            'stock_end' => $stockEnd,
            'stock_added' => $this->faker->numberBetween(0, 100),
            'stock_removed' => $quantitySold,
            'days_out_of_stock' => $this->faker->numberBetween(0, 5),
            'conversion_rate' => $this->faker->randomFloat(2, 0, 100),
            'view_count' => $this->faker->numberBetween(0, 1000),
            'add_to_cart_count' => $this->faker->numberBetween(0, 500),
            'revenue_rank_percentile' => $this->faker->randomFloat(2, 0, 100),
            'quantity_rank_percentile' => $this->faker->randomFloat(2, 0, 100),
            'stock_turnover_rate' => $this->faker->randomFloat(4, 0, 10),
            'avg_daily_sales' => $this->faker->randomFloat(2, 0, 50),
            'predicted_sales_next_period' => $this->faker->numberBetween(0, 100),
            'predicted_stockout_date' => $this->faker->optional()->dateTimeBetween('now', '+30 days'),
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
            'quantity_sold' => $this->faker->numberBetween(100, 500),
            'revenue_rank_percentile' => $this->faker->randomFloat(2, 80, 100),
            'quantity_rank_percentile' => $this->faker->randomFloat(2, 80, 100),
            'conversion_rate' => $this->faker->randomFloat(2, 10, 25),
        ]);
    }

    /**
     * Low performer
     */
    public function lowPerformer(): static
    {
        return $this->state(fn (array $attributes) => [
            'quantity_sold' => $this->faker->numberBetween(0, 10),
            'revenue_rank_percentile' => $this->faker->randomFloat(2, 0, 30),
            'quantity_rank_percentile' => $this->faker->randomFloat(2, 0, 30),
            'conversion_rate' => $this->faker->randomFloat(2, 0, 2),
        ]);
    }
    
    /**
     * Daily period
     */
    public function daily(): static
    {
        $date = $this->faker->dateTimeBetween('-30 days', 'now');
        return $this->state(fn (array $attributes) => [
            'period_type' => 'daily',
            'period_date' => $date,
            'period_start' => $date,
            'period_end' => $date,
        ]);
    }

    /**
     * Weekly period
     */
    public function weekly(): static
    {
        $startDate = $this->faker->dateTimeBetween('-8 weeks', 'now');
        $endDate = (clone $startDate)->modify('+6 days');
        
        return $this->state(fn (array $attributes) => [
            'period_type' => 'weekly',
            'period_date' => $startDate,
            'period_start' => $startDate,
            'period_end' => $endDate,
        ]);
    }

    /**
     * Monthly period
     */
    public function monthly(): static
    {
        $startDate = $this->faker->dateTimeBetween('-6 months', 'now');
        $date = \Carbon\Carbon::parse($startDate);
        
        return $this->state(fn (array $attributes) => [
            'period_type' => 'monthly',
            'period_date' => $date->startOfMonth(),
            'period_start' => $date->copy()->startOfMonth(),
            'period_end' => $date->copy()->endOfMonth(),
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