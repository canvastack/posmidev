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

// Spatie
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // 1) Ensure a demo tenant exists
            $tenant = Tenant::firstOrCreate(
                ['name' => 'Demo Tenant'],
                [
                    'id' => (string) Str::uuid(),
                    'address' => 'Jl. Demo No. 1',
                    'phone' => '+62-812-0000-0000',
                ]
            );

            // 2) Setup roles & permissions when Spatie tables are available
            $roles = [];
            if (Schema::hasTable('roles') && Schema::hasTable('permissions')) {
                // Ensure permissions exist (fallback if PermissionSeeder not run)
                $permissionNames = [
                    'products.view','products.create','products.update','products.delete',
                    'orders.view','orders.create','orders.update','orders.delete',
                    'categories.view','categories.create','categories.update','categories.delete',
                    'customers.view','customers.create','customers.update','customers.delete',
                    'users.view','users.create','users.update','users.delete',
                    'roles.view','roles.create','roles.update','roles.delete',
                    'reports.view','reports.export',
                    'settings.view','settings.update',
                ];
                foreach ($permissionNames as $p) {
                    Permission::findOrCreate($p, 'api');
                }

                $rolesToCreate = [
                    'Super Admin', 'Administrator', 'Tenant Manager', 'Buyer',
                    'Admin', 'Manager', 'Cashier',
                ];
                foreach ($rolesToCreate as $r) {
                    $roles[$r] = Role::findOrCreate($r, 'api');
                }

                // Assign permission sets
                $roles['Super Admin']->givePermissionTo(Permission::where('guard_name', 'api')->get());

                $roles['Administrator']->givePermissionTo([
                    'products.view','products.create','products.update','products.delete',
                    'orders.view','orders.create','orders.update','orders.delete',
                    'categories.view','categories.create','categories.update','categories.delete',
                    'customers.view','customers.create','customers.update','customers.delete',
                    'users.view','users.create','users.update',
                    'roles.view','roles.create','roles.update',
                    'reports.view','reports.export','settings.view','settings.update',
                ]);

                $roles['Tenant Manager']->givePermissionTo([
                    'products.view','products.create','products.update',
                    'orders.view','orders.create',
                    'categories.view','categories.create','categories.update',
                    'customers.view','customers.create','customers.update',
                    'reports.view',
                ]);

                $roles['Buyer']->givePermissionTo([
                    'products.view', 'orders.create', 'orders.view',
                ]);

                if (isset($roles['Manager'])) {
                    $roles['Manager']->givePermissionTo([
                        'products.view','products.create','products.update',
                        'orders.view','orders.create','orders.update',
                        'customers.view','customers.create','customers.update',
                        'categories.view','categories.create','categories.update',
                        'reports.view',
                    ]);
                }
                if (isset($roles['Cashier'])) {
                    $roles['Cashier']->givePermissionTo([
                        'products.view','orders.view','orders.create','customers.view','customers.create',
                    ]);
                }
                if (isset($roles['Admin'])) {
                    $roles['Admin']->givePermissionTo(Permission::where('guard_name', 'api')->get());
                }
            }

            // 3) Create Super Admin user (static credentials)
            $superAdmin = User::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'email' => 'admin@demo.local',
                ],
                [
                    'id' => (string) Str::uuid(),
                    'name' => 'Demo Tenant Admin',
                    'username' => 'demo_admin',
                    'display_name' => 'Demo Admin',
                    'password' => Hash::make('password'),
                ]
            );
            if (!empty($roles) && isset($roles['Super Admin'])) {
                $superAdmin->syncRoles([$roles['Super Admin']->name]);
            }

            // 4) Additional users with random roles
            $moreUsers = collect();
            $rolePool = array_filter([
                $roles['Administrator']->name ?? null,
                $roles['Tenant Manager']->name ?? null,
                $roles['Buyer']->name ?? null,
                $roles['Manager']->name ?? null,
                $roles['Cashier']->name ?? null,
            ]);
            for ($i = 0; $i < 10; $i++) {
                $name = fake()->name();
                $email = fake()->unique()->safeEmail();
                $user = User::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'name' => $name,
                    'email' => $email,
                    'username' => Str::slug($name) . random_int(100, 999),
                    'display_name' => $name,
                    'password' => Hash::make('password'),
                ]);
                if (!empty($roles) && !empty($rolePool)) {
                    $user->syncRoles([fake()->randomElement($rolePool)]);
                }
                $moreUsers->push($user);
            }

            // 5) Categories
            $categories = collect();
            foreach (['Beverages','Snacks','Groceries','Personal Care','Household','Stationery','Electronics','Bakery'] as $cat) {
                $categories->push(Category::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'name' => $cat,
                    'description' => fake()->sentence(),
                ]));
            }

            // 6) Products (50)
            $products = collect();
            for ($i = 0; $i < 50; $i++) {
                $category = $categories->random();
                $price = fake()->randomFloat(2, 1, 300);
                $stock = fake()->numberBetween(0, 200);
                $sku = strtoupper(Str::random(3)) . '-' . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
                // Randomize published status: 60-70% published, else draft/archived
                $rand = fake()->numberBetween(1, 100);
                $status = $rand <= 65 ? 'published' : ($rand <= 85 ? 'draft' : 'archived');

                $products->push(Product::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'category_id' => $category->id,
                    'name' => fake()->words(2, true),
                    'sku' => $sku,
                    'description' => fake()->sentence(),
                    'price' => $price,
                    'cost_price' => max(0.1, $price * fake()->randomFloat(2, 0.4, 0.9)),
                    'stock' => $stock,
                    'status' => $status,
                ]));
            }

            // 7) Customers (20)
            $customers = collect();
            for ($i = 0; $i < 20; $i++) {
                $customers->push(Customer::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'name' => fake()->name(),
                    'email' => fake()->safeEmail(),
                    'phone' => fake()->phoneNumber(),
                    'address' => fake()->address(),
                ]));
            }

            // 8) Orders with items (15)
            for ($i = 0; $i < 15; $i++) {
                $customer = $customers->random();
                $user = $moreUsers->random();
                $invoice = 'INV-' . now()->format('Ymd') . '-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
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

                $itemsCount = random_int(1, 5);
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

            // 9) Stock adjustments (random 20)
            for ($k = 0; $k < 20; $k++) {
                $product = $products->random();
                $qty = fake()->randomElement([-10,-5,-3,3,5,10]);
                $newStock = max(0, (int) $product->stock + $qty);
                $product->update(['stock' => $newStock]);

                StockAdjustment::create([
                    'id' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'user_id' => $superAdmin->id,
                    'quantity' => $qty,
                    'reason' => $qty >= 0 ? 'increase' : 'decrease',
                    'notes' => fake()->sentence(),
                ]);
            }
        });
    }
}