<?php

namespace Database\Factories;

use Src\Pms\Infrastructure\Models\VariantAttribute;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Ramsey\Uuid\Uuid;

/**
 * Factory for VariantAttribute model
 * 
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\VariantAttribute>
 */
class VariantAttributeFactory extends Factory
{
    protected $model = VariantAttribute::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->randomElement(['size', 'color', 'material', 'style']);
        
        $values = match($name) {
            'size' => ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
            'color' => ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow'],
            'material' => ['Cotton', 'Polyester', 'Leather', 'Silk', 'Wool'],
            'style' => ['Classic', 'Modern', 'Vintage', 'Casual', 'Formal'],
            default => ['Option 1', 'Option 2', 'Option 3']
        };

        return [
            'id' => (string) Uuid::uuid4(),
            'tenant_id' => Tenant::factory(),
            'name' => ucfirst($name), // Use proper capitalized name
            'slug' => strtolower($name),
            'description' => $this->faker->optional()->sentence(),
            'values' => $values,
            'display_type' => $this->faker->randomElement(['select', 'swatch', 'button', 'radio']),
            'sort_order' => $this->faker->numberBetween(0, 100),
            'is_active' => true,
            'usage_count' => 0,
            'created_at' => now(),
            'updated_at' => now()
        ];
    }

    /**
     * Size attribute
     */
    public function size(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Size',
            'slug' => 'size',
            'display_type' => 'select',
            'values' => ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        ]);
    }

    /**
     * Color attribute
     */
    public function color(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Color',
            'slug' => 'color',
            'display_type' => 'swatch',
            'values' => ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Orange', 'Purple'],
            'visual_settings' => [
                'Red' => '#FF0000',
                'Blue' => '#0000FF',
                'Green' => '#00FF00',
                'Black' => '#000000',
                'White' => '#FFFFFF',
                'Yellow' => '#FFFF00',
                'Orange' => '#FFA500',
                'Purple' => '#800080'
            ]
        ]);
    }

    /**
     * Material attribute
     */
    public function material(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Material',
            'slug' => 'material',
            'display_type' => 'select',
            'values' => ['Cotton', 'Polyester', 'Leather', 'Silk', 'Wool', 'Denim']
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
     * Set custom values
     */
    public function withValues(array $values): static
    {
        return $this->state(fn (array $attributes) => [
            'values' => $values
        ]);
    }
}