<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\VariantTemplate;

class VariantTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🎨 Seeding Variant Templates...');

        $templates = [
            $this->clothingTemplate(),
            $this->footwearTemplate(),
            $this->electronicsTemplate(),
            $this->foodBeverageTemplate(),
        ];

        foreach ($templates as $template) {
            try {
                $existing = VariantTemplate::where('slug', $template['slug'])->first();
                
                if ($existing) {
                    $this->command->warn("  ⚠️  Template '{$template['name']}' already exists, skipping...");
                    continue;
                }

                $created = VariantTemplate::create($template);
                
                if ($created) {
                    $this->command->info("  ✓ Created template: {$template['name']} ({$template['estimated_variant_count']} variants) [ID: {$created->id}]");
                } else {
                    $this->command->error("  ✗ Failed to create template: {$template['name']}");
                }
            } catch (\Exception $e) {
                $this->command->error("  ✗ Error creating template '{$template['name']}': " . $e->getMessage());
                $this->command->error("     " . $e->getFile() . ":" . $e->getLine());
            }
        }

        $this->command->info('✅ Variant Templates seeded successfully!');
    }

    /**
     * Clothing Template (60 variants)
     * Size (5) × Color (4) × Material (3) = 60 variants
     */
    private function clothingTemplate(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'tenant_id' => null, // System template
            'name' => 'Clothing',
            'slug' => 'clothing',
            'description' => 'Standard template for clothing items with size, color, and material variations',
            'category' => 'Fashion',
            'is_system' => true,
            'is_active' => true,
            'is_featured' => true,
            'icon' => '👕',
            'usage_count' => 0,
            'estimated_variant_count' => 60,
            'tags' => ['fashion', 'apparel', 'clothing'],
            'configuration' => [
                'attributes' => [
                    [
                        'name' => 'Size',
                        'display_name' => 'Size',
                        'type' => 'select',
                        'required' => true,
                        'values' => ['XS', 'S', 'M', 'L', 'XL'],
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'Color',
                        'display_name' => 'Color',
                        'type' => 'color',
                        'required' => true,
                        'values' => ['Black', 'White', 'Navy', 'Gray'],
                        'display_order' => 2,
                    ],
                    [
                        'name' => 'Material',
                        'display_name' => 'Material',
                        'type' => 'select',
                        'required' => true,
                        'values' => ['Cotton', 'Polyester', 'Cotton-Poly Blend'],
                        'display_order' => 3,
                    ],
                ],
                'sku_pattern' => '{PRODUCT}-{SIZE}-{COLOR}-{MATERIAL}',
                'price_modifiers' => [
                    'Size' => [
                        'XL' => 5000,
                    ],
                    'Material' => [
                        'Cotton' => 10000,
                        'Cotton-Poly Blend' => 5000,
                    ],
                ],
                'default_values' => [
                    'stock' => 10,
                    'reorder_point' => 5,
                    'reorder_quantity' => 20,
                ],
                'naming_pattern' => '{Color} {Material} - Size {Size}',
            ],
        ];
    }

    /**
     * Footwear Template (88 variants)
     * Size (11) × Color (4) × Width (2) = 88 variants
     */
    private function footwearTemplate(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'tenant_id' => null, // System template
            'name' => 'Footwear',
            'slug' => 'footwear',
            'description' => 'Comprehensive template for shoes and footwear with size, color, and width options',
            'category' => 'Fashion',
            'is_system' => true,
            'is_active' => true,
            'is_featured' => true,
            'icon' => '👟',
            'usage_count' => 0,
            'estimated_variant_count' => 88,
            'tags' => ['fashion', 'shoes', 'footwear'],
            'configuration' => [
                'attributes' => [
                    [
                        'name' => 'Size',
                        'display_name' => 'Shoe Size',
                        'type' => 'select',
                        'required' => true,
                        'values' => ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'Color',
                        'display_name' => 'Color',
                        'type' => 'color',
                        'required' => true,
                        'values' => ['Black', 'Brown', 'White', 'Navy'],
                        'display_order' => 2,
                    ],
                    [
                        'name' => 'Width',
                        'display_name' => 'Width',
                        'type' => 'select',
                        'required' => true,
                        'values' => ['Regular', 'Wide'],
                        'display_order' => 3,
                    ],
                ],
                'sku_pattern' => '{PRODUCT}-SZ{SIZE}-{COLOR}-{WIDTH}',
                'price_modifiers' => [
                    'Size' => [
                        '45' => 10000,
                        '46' => 15000,
                    ],
                    'Width' => [
                        'Wide' => 20000,
                    ],
                ],
                'default_values' => [
                    'stock' => 5,
                    'reorder_point' => 2,
                    'reorder_quantity' => 10,
                ],
                'naming_pattern' => '{Color} - Size {Size} ({Width})',
            ],
        ];
    }

    /**
     * Electronics Template (20 variants)
     * Storage (4) × Color (5) = 20 variants
     */
    private function electronicsTemplate(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'tenant_id' => null, // System template
            'name' => 'Electronics',
            'slug' => 'electronics',
            'description' => 'Template for electronic devices with storage capacity and color options',
            'category' => 'Electronics',
            'is_system' => true,
            'is_active' => true,
            'is_featured' => true,
            'icon' => '📱',
            'usage_count' => 0,
            'estimated_variant_count' => 20,
            'tags' => ['electronics', 'gadgets', 'devices'],
            'configuration' => [
                'attributes' => [
                    [
                        'name' => 'Storage',
                        'display_name' => 'Storage Capacity',
                        'type' => 'select',
                        'required' => true,
                        'values' => ['64GB', '128GB', '256GB', '512GB'],
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'Color',
                        'display_name' => 'Color',
                        'type' => 'color',
                        'required' => true,
                        'values' => ['Space Gray', 'Silver', 'Gold', 'Midnight', 'Starlight'],
                        'display_order' => 2,
                    ],
                ],
                'sku_pattern' => '{PRODUCT}-{STORAGE}-{COLOR}',
                'price_modifiers' => [
                    'Storage' => [
                        '128GB' => 500000,
                        '256GB' => 1000000,
                        '512GB' => 2000000,
                    ],
                ],
                'default_values' => [
                    'stock' => 3,
                    'reorder_point' => 1,
                    'reorder_quantity' => 5,
                ],
                'naming_pattern' => '{Storage} - {Color}',
            ],
        ];
    }

    /**
     * Food & Beverage Template (15 variants)
     * Size (3) × Flavor (5) = 15 variants
     */
    private function foodBeverageTemplate(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'tenant_id' => null, // System template
            'name' => 'Food & Beverage',
            'slug' => 'food-beverage',
            'description' => 'Template for food and beverage products with size and flavor variations',
            'category' => 'Food & Beverage',
            'is_system' => true,
            'is_active' => true,
            'is_featured' => true,
            'icon' => '🍹',
            'usage_count' => 0,
            'estimated_variant_count' => 15,
            'tags' => ['food', 'beverage', 'drinks'],
            'configuration' => [
                'attributes' => [
                    [
                        'name' => 'Size',
                        'display_name' => 'Size',
                        'type' => 'select',
                        'required' => true,
                        'values' => ['Small', 'Medium', 'Large'],
                        'display_order' => 1,
                    ],
                    [
                        'name' => 'Flavor',
                        'display_name' => 'Flavor',
                        'type' => 'select',
                        'required' => true,
                        'values' => ['Original', 'Chocolate', 'Vanilla', 'Strawberry', 'Caramel'],
                        'display_order' => 2,
                    ],
                ],
                'sku_pattern' => '{PRODUCT}-{SIZE}-{FLAVOR}',
                'price_modifiers' => [
                    'Size' => [
                        'Medium' => 3000,
                        'Large' => 6000,
                    ],
                    'Flavor' => [
                        'Caramel' => 2000,
                    ],
                ],
                'default_values' => [
                    'stock' => 20,
                    'reorder_point' => 10,
                    'reorder_quantity' => 50,
                ],
                'naming_pattern' => '{Flavor} - {Size}',
            ],
        ];
    }
}