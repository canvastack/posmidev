<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Src\Pms\Infrastructure\Models\StockAlert;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Material;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\StockAlert>
 */
class StockAlertFactory extends Factory
{
    protected $model = StockAlert::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'material_id' => Material::factory(),
            'alert_type' => fake()->randomElement(['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCKED', 'EXPIRING_SOON']),
            'severity' => fake()->randomElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            'status' => 'ACTIVE',
            'current_quantity' => fake()->randomFloat(2, 0, 100),
            'threshold_quantity' => fake()->randomFloat(2, 10, 50),
            'message' => fake()->sentence(),
            'acknowledged_at' => null,
            'acknowledged_by' => null,
            'resolved_at' => null,
            'resolved_by' => null,
        ];
    }

    /**
     * Low stock alert state.
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'alert_type' => 'LOW_STOCK',
            'severity' => 'MEDIUM',
            'current_quantity' => fake()->randomFloat(2, 1, 20),
            'threshold_quantity' => fake()->randomFloat(2, 20, 50),
        ]);
    }

    /**
     * Out of stock alert state.
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'alert_type' => 'OUT_OF_STOCK',
            'severity' => 'CRITICAL',
            'current_quantity' => 0,
            'threshold_quantity' => fake()->randomFloat(2, 10, 50),
        ]);
    }

    /**
     * Active alert state.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ACTIVE',
            'acknowledged_at' => null,
            'resolved_at' => null,
        ]);
    }

    /**
     * Acknowledged alert state.
     */
    public function acknowledged(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ACKNOWLEDGED',
            'acknowledged_at' => now()->subHours(1),
        ]);
    }

    /**
     * Resolved alert state.
     */
    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'RESOLVED',
            'acknowledged_at' => now()->subHours(2),
            'resolved_at' => now()->subHours(1),
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
     * For a specific material.
     */
    public function forMaterial(string $materialId): static
    {
        return $this->state(fn (array $attributes) => [
            'material_id' => $materialId,
        ]);
    }
}