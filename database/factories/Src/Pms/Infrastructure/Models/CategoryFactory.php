<?php

namespace Database\Factories\Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Category;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\Src\Pms\Infrastructure\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Category::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'tenant_id' => Tenant::factory(),
            'name' => fake()->words(2, true),
            'description' => fake()->sentence(),
        ];
    }
}