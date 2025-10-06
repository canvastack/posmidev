<?php

namespace Database\Factories;

use Src\Pms\Infrastructure\Models\VariantTemplate;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Ramsey\Uuid\Uuid;

/**
 * Factory for VariantTemplate model
 * 
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\VariantTemplate>
 */
class VariantTemplateFactory extends Factory
{
    protected $model = VariantTemplate::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) Uuid::uuid4(),
            'tenant_id' => Tenant::factory(),
            'name' => $this->faker->words(2, true) . ' Template',
            'description' => $this->faker->sentence(),
            'category' => $this->faker->randomElement(['clothing', 'electronics', 'footwear', 'custom']),
            'attributes' => [
                'size' => ['S', 'M', 'L', 'XL'],
                'color' => ['Red', 'Blue', 'Green']
            ],
            'pricing_rules' => [
                'type' => 'attribute_based',
                'rules' => [
                    'size' => ['XL' => 10, 'XXL' => 20],
                    'color' => ['Red' => 5]
                ]
            ],
            'is_system_template' => false,
            'usage_count' => 0,
            'created_at' => now(),
            'updated_at' => now()
        ];
    }

    /**
     * System template
     */
    public function system(): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => null,
            'is_system_template' => true
        ]);
    }

    /**
     * Clothing template
     */
    public function clothing(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Clothing Template',
            'category' => 'clothing',
            'attributes' => [
                'size' => ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                'color' => ['Black', 'White', 'Red', 'Blue', 'Green']
            ]
        ]);
    }

    /**
     * Set specific tenant
     */
    public function forTenant(?string $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId,
            'is_system_template' => $tenantId === null
        ]);
    }
}