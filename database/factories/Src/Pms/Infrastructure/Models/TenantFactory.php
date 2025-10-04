<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\Factory;
use Ramsey\Uuid\Uuid;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => Uuid::uuid4()->toString(),
            'name' => fake()->company(),
            'address' => fake()->address(),
            'phone' => fake()->phoneNumber(),
            'logo' => null,
            'status' => 'active',
            'settings' => [],
            'can_auto_activate_users' => false,
            'auto_activate_request_pending' => false,
            'auto_activate_requested_at' => null,
        ];
    }

    /**
     * Indicate that the tenant is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    /**
     * Indicate that the tenant can auto-activate users.
     */
    public function withAutoActivation(): static
    {
        return $this->state(fn (array $attributes) => [
            'can_auto_activate_users' => true,
        ]);
    }
}