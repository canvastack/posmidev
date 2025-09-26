<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Category;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Customer;
use Src\Pms\Infrastructure\Models\Order;
use Src\Pms\Infrastructure\Models\OrderItem;
use Src\Pms\Infrastructure\Models\StockAdjustment;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class MultiTenantDemoSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure base roles exist (idempotent)
        $guard = 'api';
        $roleAdmin   = Role::findOrCreate('admin', $guard);
        $roleManager = Role::findOrCreate('manager', $guard);
        $roleCashier = Role::findOrCreate('cashier', $guard);

        // Business profiles with domain-appropriate categories and price ranges
        $businessProfiles = [
            [
                'name' => 'Cafe',
                'categories' => ['Coffee', 'Tea', 'Pastry', 'Cold Drinks', 'Snacks'],
                'priceMin' => 1.5, 'priceMax' => 6.5,
            ],
            [
                'name' => 'Grocery',
                'categories' => ['Produce', 'Dairy', 'Bakery', 'Meat & Seafood', 'Frozen', 'Pantry'],
                'priceMin' => 0.5, 'priceMax' => 30,
            ],
            [
                'name' => 'Pharmacy',
                'categories' => ['OTC Medicine', 'Vitamins', 'Personal Care', 'Baby Care', 'Medical Supplies'],
                'priceMin' => 2, 'priceMax' => 50,
            ],
            [
                'name' => 'Electronics',
                'categories' => ['Accessories', 'Audio', 'Gadgets', 'Smart Home', 'Cables & Chargers'],
                'priceMin' => 5, 'priceMax' => 300,
            ],
            [
                'name' => 'Bakery',
                'categories' => ['Bread', 'Cakes', 'Cookies', 'Pastries', 'Beverages'],
                'priceMin' => 1, 'priceMax' => 20,
            ],
            [
                'name' => 'Bookstore',
                'categories' => ['Fiction', 'Non-fiction', 'Comics', 'Stationery', 'Magazines'],
                'priceMin' => 2, 'priceMax' => 60,
            ],
            [
                'name' => 'Restaurant',
                'categories' => ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Specials'],
                'priceMin' => 2.5, 'priceMax' => 50,
            ],
            [
                'name' => 'Fashion Retail',
                'categories' => ['Men', 'Women', 'Kids', 'Accessories', 'Footwear'],
                'priceMin' => 5, 'priceMax' => 200,
            ],
            [
                'name' => 'Stationery',
                'categories' => ['Writing', 'Paper', 'Office Supplies', 'Art & Craft', 'School'],
                'priceMin' => 0.5, 'priceMax' => 40,
            ],
            [
                'name' => 'Hardware',
                'categories' => ['Tools', 'Home Improvement', 'Plumbing', 'Electrical', 'Paint'],
                'priceMin' => 2, 'priceMax' => 250,
            ],
        ];

        // Create 10 tenants with realistic datasets
        foreach ($businessProfiles as $index => $profile) {
            DB::transaction(function () use ($profile, $index, $guard, $roleAdmin, $roleManager, $roleCashier) {
                $tenantName = sprintf('%s Demo #%d', $profile['name'], $index + 1);
                $tenant = Tenant::firstOrCreate(
                    ['name' => $tenantName],
                    [
                        'id' => (string) Str::uuid(),
                        'address' => fake()->address(),
                        'phone' => fake()->phoneNumber(),
                    ]
                );

                // Team context for Spatie (roles/permissions are tenant-scoped)
                app(PermissionRegistrar::class)->setPermissionsTeamId((string) $tenant->id);

                // Unique email prefix per tenant to ensure global uniqueness across runs
                $tenantEmailPrefix = Str::slug($profile['name']) . ($index + 1);

                // 1) Users (15–20) with varied roles
                $userCount = random_int(15, 20);
                $users = collect();

                // Ensure at least 1 admin, 2 managers, rest cashiers
                $admin = User::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'email' => sprintf('admin+%s@demo.local', Str::slug($profile['name']) . ($index + 1))],
                    [
                        'id' => (string) Str::uuid(),
                        'name' => $tenantName . ' Admin',
                        'username' => Str::slug($profile['name']) . ($index + 1) . '_admin',
                        'display_name' => 'Admin',
                        'password' => Hash::make('password'),
                    ]
                );
                $admin->syncRoles([$roleAdmin->name]);
                $users->push($admin);

                for ($m = 0; $m < 2; $m++) {
                    $managerEmail = sprintf('%s+manager%02d@demo.local', $tenantEmailPrefix, $m + 1);
                    $manager = User::firstOrCreate(
                        ['tenant_id' => $tenant->id, 'email' => $managerEmail],
                        [
                            'id' => (string) Str::uuid(),
                            'name' => fake()->name(),
                            'username' => Str::slug(fake()->lastName()) . '_mgr_' . random_int(100,999),
                            'display_name' => 'Manager',
                            'password' => Hash::make('password'),
                        ]
                    );
                    $manager->syncRoles([$roleManager->name]);
                    $users->push($manager);
                }

                for ($i = $users->count(); $i < $userCount; $i++) {
                    $seq = $i - 2 + 1; // start from 1 after two managers
                    $cashierEmail = sprintf('%s+cashier%03d@demo.local', $tenantEmailPrefix, $seq);
                    $cashier = User::firstOrCreate(
                        ['tenant_id' => $tenant->id, 'email' => $cashierEmail],
                        [
                            'id' => (string) Str::uuid(),
                            'name' => fake()->name(),
                            'username' => Str::slug(fake()->firstName()) . '_csr_' . random_int(100,999),
                            'display_name' => 'Cashier',
                            'password' => Hash::make('password'),
                        ]
                    );
                    $cashier->syncRoles([$roleCashier->name]);
                    $users->push($cashier);
                }

                // 2) Categories (from profile)
                $categories = collect();
                foreach ($profile['categories'] as $cat) {
                    $categories->push(Category::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenant->id,
                        'name' => $cat,
                        'description' => fake()->sentence(),
                    ]));
                }

                // 3) Products (40–60 per tenant)
                $products = collect();
                $productCount = random_int(40, 60);
                for ($p = 0; $p < $productCount; $p++) {
                    $category = $categories->random();
                    $price = fake()->randomFloat(2, $profile['priceMin'], $profile['priceMax']);
                    $stock = fake()->numberBetween(20, 300);
                    $sku = strtoupper(Str::random(3)) . '-' . str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT);
                    $nameSeed = match ($profile['name']) {
                        'Cafe' => fake()->randomElement(['Latte', 'Americano', 'Cappuccino', 'Mocha', 'Espresso', 'Matcha']),
                        'Grocery' => fake()->randomElement(['Rice', 'Milk', 'Eggs', 'Cooking Oil', 'Sugar', 'Flour']),
                        'Pharmacy' => fake()->randomElement(['Vitamin C', 'Paracetamol', 'Bandage', 'Hand Sanitizer', 'Cough Syrup']),
                        'Electronics' => fake()->randomElement(['Earbuds', 'Bluetooth Speaker', 'Power Bank', 'Charger', 'HDMI Cable']),
                        'Bakery' => fake()->randomElement(['Sourdough', 'Croissant', 'Donut', 'Muffin', 'Baguette']),
                        'Bookstore' => fake()->randomElement(['Novel', 'Notebook', 'Pen Set', 'Manga', 'Journal']),
                        'Restaurant' => fake()->randomElement(['Fried Rice', 'Chicken Curry', 'Pasta', 'Burger', 'Steak']),
                        'Fashion Retail' => fake()->randomElement(['T-Shirt', 'Jeans', 'Sneakers', 'Jacket', 'Dress']),
                        'Stationery' => fake()->randomElement(['Ballpoint', 'Highlighter', 'A4 Paper', 'Stapler', 'Marker']),
                        'Hardware' => fake()->randomElement(['Hammer', 'Screwdriver', 'Wrench', 'Paint Brush', 'Drill Bits']),
                        default => fake()->words(2, true),
                    };

                    $products->push(Product::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenant->id,
                        'category_id' => $category->id,
                        'name' => $nameSeed . ' ' . strtoupper(Str::random(2)),
                        'sku' => $sku,
                        'description' => fake()->sentence(),
                        'price' => $price,
                        'cost_price' => max(0.1, round($price * fake()->randomFloat(2, 0.4, 0.85), 2)),
                        'stock' => $stock,
                    ]));
                }

                // 4) Customers (40–60)
                $customers = collect();
                $customerCount = random_int(40, 60);
                for ($c = 0; $c < $customerCount; $c++) {
                    $customers->push(Customer::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenant->id,
                        'name' => fake()->name(),
                        'email' => fake()->unique()->safeEmail(),
                        'phone' => fake()->phoneNumber(),
                        'address' => fake()->address(),
                    ]));
                }

                // Helper for invoice format with tenant short code
                $tenantCode = strtoupper(substr(Str::slug($profile['name']), 0, 3));

                // 5) Orders (25–40 per tenant) with items and stock decrements
                $orderCount = random_int(25, 40);
                for ($o = 0; $o < $orderCount; $o++) {
                    $customer = $customers->random();
                    $user = $users->filter(fn ($u) => $u->hasRole($roleCashier->name) || $u->hasRole($roleManager->name))->random();

                    $invoice = sprintf('INV-%s-%s-%06d', $tenantCode, now()->format('Ymd'), random_int(1, 999999));
                    $order = Order::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenant->id,
                        'user_id' => $user->id,
                        'customer_id' => $customer->id,
                        'invoice_number' => $invoice,
                        'total_amount' => 0,
                        'payment_method' => fake()->randomElement(['cash','card','qris']),
                        'amount_paid' => 0,
                        'change_amount' => 0,
                        'status' => 'paid',
                    ]);

                    $itemsCount = random_int(1, 6);
                    $orderTotal = 0;
                    for ($j = 0; $j < $itemsCount; $j++) {
                        $product = $products->random();
                        $qty = random_int(1, 5);
                        $price = (float) $product->price;
                        $subtotal = $price * $qty;

                        OrderItem::create([
                            'id' => (string) Str::uuid(),
                            'order_id' => $order->id,
                            'product_id' => $product->id,
                            'product_name' => $product->name,
                            'quantity' => $qty,
                            'price' => $price,
                            'subtotal' => $subtotal,
                        ]);

                        // decrement stock (not below zero)
                        $newStock = max(0, (int) $product->stock - $qty);
                        $product->update(['stock' => $newStock]);

                        $orderTotal += $subtotal;
                    }

                    $amountPaid = $orderTotal; // assume exact payment
                    $order->update([
                        'total_amount' => $orderTotal,
                        'amount_paid' => $amountPaid,
                        'change_amount' => max(0, $amountPaid - $orderTotal),
                    ]);
                }

                // 6) Stock adjustments (15–30 per tenant)
                $adjustCount = random_int(15, 30);
                for ($k = 0; $k < $adjustCount; $k++) {
                    $product = $products->random();
                    $qty = fake()->randomElement([-10,-5,-3,3,5,10]);
                    $newStock = max(0, (int) $product->stock + $qty);
                    $product->update(['stock' => $newStock]);

                    StockAdjustment::create([
                        'id' => (string) Str::uuid(),
                        'product_id' => $product->id,
                        'user_id' => $admin->id, // created above
                        'quantity' => $qty,
                        'reason' => $qty >= 0 ? 'increase' : 'decrease',
                        'notes' => fake()->sentence(),
                    ]);
                }
            });
        }
    }
}