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
use Spatie\Permission\PermissionRegistrar;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        // Business profiles for 20 tenants with domain-appropriate categories and price ranges
        $businessProfiles = [
            [
                'name' => 'Warung Kopi',
                'categories' => ['Kopi', 'Teh', 'Makanan Ringan', 'Minuman Dingin', 'Kue'],
                'priceMin' => 1.5, 'priceMax' => 8.0,
            ],
            [
                'name' => 'Minimarket',
                'categories' => ['Makanan', 'Minuman', 'Kebutuhan Pokok', 'Produk Rumah Tangga', 'Rokok'],
                'priceMin' => 0.5, 'priceMax' => 50,
            ],
            [
                'name' => 'Apotek',
                'categories' => ['Obat Bebas', 'Vitamin', 'Produk Kecantikan', 'Alat Kesehatan', 'Produk Bayi'],
                'priceMin' => 2, 'priceMax' => 75,
            ],
            [
                'name' => 'Toko Elektronik',
                'categories' => ['Aksesoris', 'Audio', 'Gadget', 'Smart Home', 'Kabel & Charger'],
                'priceMin' => 5, 'priceMax' => 500,
            ],
            [
                'name' => 'Toko Roti',
                'categories' => ['Roti', 'Kue', 'Kue Kering', 'Pastry', 'Minuman'],
                'priceMin' => 1, 'priceMax' => 25,
            ],
            [
                'name' => 'Toko Buku',
                'categories' => ['Fiksi', 'Non-Fiksi', 'Komik', 'Alat Tulis', 'Majalah'],
                'priceMin' => 2, 'priceMax' => 80,
            ],
            [
                'name' => 'Restoran',
                'categories' => ['Appetizer', 'Main Course', 'Dessert', 'Minuman', 'Special'],
                'priceMin' => 3.5, 'priceMax' => 65,
            ],
            [
                'name' => 'Toko Fashion',
                'categories' => ['Pria', 'Wanita', 'Anak', 'Aksesoris', 'Sepatu'],
                'priceMin' => 5, 'priceMax' => 300,
            ],
            [
                'name' => 'Toko ATK',
                'categories' => ['Alat Tulis', 'Kertas', 'Perlengkapan Kantor', 'Kesenian', 'Sekolah'],
                'priceMin' => 0.5, 'priceMax' => 60,
            ],
            [
                'name' => 'Toko Bangunan',
                'categories' => ['Alat', 'Cat', 'Plumbing', 'Electrical', 'Kayu'],
                'priceMin' => 2, 'priceMax' => 400,
            ],
            [
                'name' => 'Warung Makan',
                'categories' => ['Nasi', 'Lauk', 'Sayur', 'Minuman', 'Cemilan'],
                'priceMin' => 1, 'priceMax' => 20,
            ],
            [
                'name' => 'Toko Kosmetik',
                'categories' => ['Makeup', 'Skincare', 'Hair Care', 'Body Care', 'Parfum'],
                'priceMin' => 3, 'priceMax' => 200,
            ],
            [
                'name' => 'Toko Mainan',
                'categories' => ['Mainan Edukasi', 'Boneka', 'Mobil-mobilan', 'Puzzle', 'Outdoor'],
                'priceMin' => 2, 'priceMax' => 150,
            ],
            [
                'name' => 'Toko Olahraga',
                'categories' => ['Sepatu', 'Pakaian', 'Aksesoris', 'Fitness', 'Outdoor'],
                'priceMin' => 10, 'priceMax' => 400,
            ],
            [
                'name' => 'Warung Sembako',
                'categories' => ['Beras', 'Minyak', 'Gula', 'Tepung', 'Telur'],
                'priceMin' => 1, 'priceMax' => 40,
            ],
            [
                'name' => 'Toko HP',
                'categories' => ['Smartphone', 'Aksesoris', 'Power Bank', 'Charger', 'Case'],
                'priceMin' => 5, 'priceMax' => 800,
            ],
            [
                'name' => 'Klinik Kecantikan',
                'categories' => ['Treatment', 'Produk', 'Konsultasi', 'Paket', 'Membership'],
                'priceMin' => 15, 'priceMax' => 500,
            ],
            [
                'name' => 'Toko Musik',
                'categories' => ['Instrumen', 'Aksesoris', 'CD/DVD', 'Equipment', 'Lesson'],
                'priceMin' => 5, 'priceMax' => 1000,
            ],
            [
                'name' => 'Warung Buah',
                'categories' => ['Buah Lokal', 'Buah Import', 'Sayuran', 'Jus', 'Salad'],
                'priceMin' => 1, 'priceMax' => 30,
            ],
            [
                'name' => 'Toko Komputer',
                'categories' => ['Laptop', 'PC', 'Aksesoris', 'Software', 'Service'],
                'priceMin' => 20, 'priceMax' => 2000,
            ],
        ];

        // Create 20 tenants with realistic datasets
        foreach ($businessProfiles as $index => $profile) {
            DB::transaction(function () use ($profile, $index) {
                $tenantName = sprintf('%s %02d', $profile['name'], $index + 1);
                $tenant = Tenant::firstOrCreate(
                    ['name' => $tenantName],
                    [
                        'id' => (string) Str::uuid(),
                        'address' => fake()->address(),
                        'phone' => fake()->phoneNumber(),
                    ]
                );

                // 2) Setup roles & permissions when Spatie tables are available
                $roles = [];
                if (Schema::hasTable('roles') && Schema::hasTable('permissions')) {
                    // Set tenant context for Spatie (roles/permissions are tenant-scoped)
                    app(PermissionRegistrar::class)->setPermissionsTeamId((string) $tenant->id);

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
                    'email' => 'admin@' . Str::slug($profile['name']) . ($index + 1) . '.local',
                ],
                [
                    'id' => (string) Str::uuid(),
                    'name' => $tenantName . ' Admin',
                    'username' => Str::slug($profile['name']) . ($index + 1) . '_admin',
                    'display_name' => 'Admin',
                    'password' => Hash::make('password'),
                ]
            );
            if (!empty($roles) && isset($roles['Super Admin'])) {
                $superAdmin->syncRoles([$roles['Super Admin']->name]);
            }

            // 4) Additional users with random roles (30-50 users per tenant)
            $moreUsers = collect();
            $userCount = random_int(30, 50);
            $rolePool = array_filter([
                $roles['Administrator']->name ?? null,
                $roles['Tenant Manager']->name ?? null,
                $roles['Buyer']->name ?? null,
                $roles['Manager']->name ?? null,
                $roles['Cashier']->name ?? null,
            ]);

            // Create managers (2-3 per tenant)
            for ($m = 0; $m < random_int(2, 3); $m++) {
                $name = fake()->name();
                $email = Str::slug($profile['name']) . ($index + 1) . '+manager' . ($m + 1) . '@demo.local';
                $user = User::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'email' => $email],
                    [
                        'id' => (string) Str::uuid(),
                        'name' => $name,
                        'username' => Str::slug($name) . '_mgr_' . random_int(100, 999),
                        'display_name' => 'Manager',
                        'password' => Hash::make('password'),
                    ]
                );
                if (!empty($roles) && isset($roles['Manager'])) {
                    $user->syncRoles([$roles['Manager']->name]);
                }
                $moreUsers->push($user);
            }

            // Create cashiers (8-12 per tenant)
            for ($c = 0; $c < random_int(8, 12); $c++) {
                $name = fake()->name();
                $email = Str::slug($profile['name']) . ($index + 1) . '+cashier' . ($c + 1) . '@demo.local';
                $user = User::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'email' => $email],
                    [
                        'id' => (string) Str::uuid(),
                        'name' => $name,
                        'username' => Str::slug($name) . '_csr_' . random_int(100, 999),
                        'display_name' => 'Cashier',
                        'password' => Hash::make('password'),
                    ]
                );
                if (!empty($roles) && isset($roles['Cashier'])) {
                    $user->syncRoles([$roles['Cashier']->name]);
                }
                $moreUsers->push($user);
            }

            // Create remaining users with random roles
            for ($i = $moreUsers->count(); $i < $userCount; $i++) {
                $name = fake()->name();
                $email = Str::slug($profile['name']) . ($index + 1) . '+user' . ($i + 1) . '@demo.local';
                $user = User::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'email' => $email],
                    [
                        'id' => (string) Str::uuid(),
                        'name' => $name,
                        'username' => Str::slug($name) . '_usr_' . random_int(100, 999),
                        'display_name' => $name,
                        'password' => Hash::make('password'),
                    ]
                );
                if (!empty($roles) && !empty($rolePool)) {
                    $user->syncRoles([fake()->randomElement($rolePool)]);
                }
                $moreUsers->push($user);
            }

            // 5) Categories (from business profile)
            $categories = collect();
            foreach ($profile['categories'] as $cat) {
                $categories->push(Category::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'name' => $cat,
                    'description' => fake()->sentence(),
                ]));
            }

            // 6) Products (20-38 per tenant)
            $products = collect();
            $productCount = random_int(20, 38);
            for ($i = 0; $i < $productCount; $i++) {
                $category = $categories->random();
                $price = fake()->randomFloat(2, $profile['priceMin'], $profile['priceMax']);
                $stock = fake()->numberBetween(10, 200);
                $sku = strtoupper(Str::random(3)) . '-' . str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT);

                // Product names based on business type
                $nameSeed = match ($profile['name']) {
                    'Warung Kopi' => fake()->randomElement(['Kopi Arabica', 'Kopi Robusta', 'Espresso', 'Cappuccino', 'Latte', 'Americano', 'Mochaccino']),
                    'Minimarket' => fake()->randomElement(['Beras Premium', 'Minyak Goreng', 'Gula Pasir', 'Tepung Terigu', 'Telur Ayam', 'Susu Kotak']),
                    'Apotek' => fake()->randomElement(['Vitamin C', 'Paracetamol', 'Antiseptik', 'Masker', 'Hand Sanitizer', 'Obat Batuk']),
                    'Toko Elektronik' => fake()->randomElement(['Charger HP', 'Kabel Data', 'Power Bank', 'Earbuds', 'Bluetooth Speaker', 'Case HP']),
                    'Toko Roti' => fake()->randomElement(['Roti Tawar', 'Croissant', 'Donat', 'Kue Tart', 'Pastry', 'Baguette']),
                    'Toko Buku' => fake()->randomElement(['Novel Romance', 'Buku Pelajaran', 'Komik', 'Notebook', 'Pensil', 'Penghapus']),
                    'Restoran' => fake()->randomElement(['Nasi Gudeg', 'Ayam Goreng', 'Bakso', 'Sate Ayam', 'Gado-gado', 'Es Teh']),
                    'Toko Fashion' => fake()->randomElement(['Kaos Polos', 'Celana Jeans', 'Kemeja', 'Dress', 'Sneakers', 'Tas Ransel']),
                    'Toko ATK' => fake()->randomElement(['Ballpoint', 'Kertas A4', 'Stapler', 'Map Plastik', 'Spidol', 'Penggaris']),
                    'Toko Bangunan' => fake()->randomElement(['Cat Tembok', 'Kuas', 'Semen', 'Pasir', 'Batu Bata', 'Paku']),
                    'Warung Makan' => fake()->randomElement(['Nasi Putih', 'Ayam Bakar', 'Ikan Goreng', 'Sayur Asem', 'Tempe', 'Tahu']),
                    'Toko Kosmetik' => fake()->randomElement(['Lipstik', 'Foundation', 'Bedak', 'Shampoo', 'Sabun', 'Lotion']),
                    'Toko Mainan' => fake()->randomElement(['Boneka', 'Mobil-mobilan', 'Puzzle', 'Mainan Edukasi', 'Balok', 'Krayon']),
                    'Toko Olahraga' => fake()->randomElement(['Sepatu Lari', 'Jersey', 'Bola', 'Raket', 'Matras Yoga', 'Dumbel']),
                    'Warung Sembako' => fake()->randomElement(['Beras', 'Minyak', 'Gula', 'Tepung', 'Telur', 'Garam']),
                    'Toko HP' => fake()->randomElement(['Smartphone', 'Aksesoris', 'Power Bank', 'Charger', 'Case', 'Screen Protector']),
                    'Klinik Kecantikan' => fake()->randomElement(['Facial Treatment', 'Cream', 'Serum', 'Masker', 'Sunscreen', 'Toner']),
                    'Toko Musik' => fake()->randomElement(['Gitar', 'Piano', 'Drum', 'CD Musik', 'Amplifier', 'Kabel Jack']),
                    'Warung Buah' => fake()->randomElement(['Apel', 'Jeruk', 'Pisang', 'Mangga', 'Salad', 'Jus Buah']),
                    'Toko Komputer' => fake()->randomElement(['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Printer', 'Software']),
                    default => fake()->words(2, true),
                };

                // Randomize published status: 70-80% published, else draft/archived
                $rand = fake()->numberBetween(1, 100);
                $status = $rand <= 75 ? 'published' : ($rand <= 90 ? 'draft' : 'archived');

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
                    'status' => $status,
                ]));
            }

            // 7) Customers (30-50 per tenant)
            $customers = collect();
            $customerCount = random_int(30, 50);
            for ($i = 0; $i < $customerCount; $i++) {
                $customers->push(Customer::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'name' => fake()->name(),
                    'email' => fake()->unique()->safeEmail(),
                    'phone' => fake()->phoneNumber(),
                    'address' => fake()->address(),
                ]));
            }

            // 8) Orders with items (only for 12 out of 20 tenants, min 8 orders per tenant)
            // Determine if this tenant should have orders (12 out of 20 tenants)
            $shouldHaveOrders = ($index % 20) < 12; // First 12 tenants will have orders

            if ($shouldHaveOrders) {
                $orderCount = random_int(8, 15); // Min 8 orders per tenant
                for ($i = 0; $i < $orderCount; $i++) {
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
}