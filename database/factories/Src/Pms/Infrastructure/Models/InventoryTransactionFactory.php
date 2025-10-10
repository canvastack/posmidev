<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\InventoryTransaction>
 */
class InventoryTransactionFactory extends Factory
{
    protected $model = InventoryTransaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantityBefore = fake()->randomFloat(3, 10, 500);
        $quantityChange = fake()->randomFloat(3, -50, 50);
        $quantityAfter = max(0, $quantityBefore + $quantityChange);

        return [
            'tenant_id' => Tenant::factory(),
            'material_id' => Material::factory(),
            'transaction_type' => fake()->randomElement(['adjustment', 'deduction', 'restock']),
            'quantity_before' => $quantityBefore,
            'quantity_change' => $quantityChange,
            'quantity_after' => $quantityAfter,
            'reason' => fake()->randomElement(['purchase', 'waste', 'damage', 'count_adjustment', 'production', 'sale', 'other']),
            'notes' => fake()->optional()->sentence(),
            'user_id' => User::factory(),
            'reference_type' => null,
            'reference_id' => null,
        ];
    }

    /**
     * Adjustment transaction type.
     */
    public function adjustment(): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => 'adjustment',
            'reason' => 'count_adjustment',
        ]);
    }

    /**
     * Deduction transaction type.
     */
    public function deduction(): static
    {
        $before = fake()->randomFloat(3, 50, 500);
        $change = fake()->randomFloat(3, -50, -1);
        
        return $this->state(fn (array $attributes) => [
            'transaction_type' => 'deduction',
            'reason' => fake()->randomElement(['production', 'sale', 'waste']),
            'quantity_before' => $before,
            'quantity_change' => $change,
            'quantity_after' => $before + $change,
        ]);
    }

    /**
     * Restock transaction type.
     */
    public function restock(): static
    {
        $before = fake()->randomFloat(3, 0, 50);
        $change = fake()->randomFloat(3, 10, 200);
        
        return $this->state(fn (array $attributes) => [
            'transaction_type' => 'restock',
            'reason' => 'purchase',
            'quantity_before' => $before,
            'quantity_change' => $change,
            'quantity_after' => $before + $change,
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

    /**
     * By a specific user.
     */
    public function byUser(string $userId): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $userId,
        ]);
    }
}