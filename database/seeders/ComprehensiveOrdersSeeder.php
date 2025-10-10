<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Customer;
use Src\Pms\Infrastructure\Models\Order;
use Src\Pms\Infrastructure\Models\OrderItem;
use Src\Pms\Infrastructure\Models\User;

/**
 * Comprehensive Orders Seeder
 * 
 * Ensures all tenants have comprehensive order data (10-20 orders per tenant)
 * with various statuses (paid, pending, cancelled)
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All orders are tenant-scoped (tenant_id)
 * - All queries filter by tenant_id
 * - Order items reference products from same tenant
 */
class ComprehensiveOrdersSeeder extends Seeder
{
    private array $paymentMethods = ['cash', 'card', 'qris', 'transfer', 'e-wallet'];
    private array $orderStatuses = [
        'paid' => 70,      // 70% paid
        'pending' => 20,   // 20% pending
        'cancelled' => 10, // 10% cancelled
    ];

    public function run(): void
    {
        // Get all tenants (excluding HQ tenant)
        $hqTenantId = config('tenancy.hq_tenant_id');
        $tenants = Tenant::where('id', '!=', $hqTenantId)->get();

        $this->command->info("🚀 Starting Comprehensive Orders Seeding for {$tenants->count()} tenants...");

        foreach ($tenants as $tenant) {
            $this->command->info("📦 Seeding orders for tenant: {$tenant->name} ({$tenant->id})");
            
            DB::transaction(function () use ($tenant) {
                // Check if tenant already has enough orders
                $existingOrdersCount = Order::where('tenant_id', $tenant->id)->count();
                $targetCount = random_int(10, 20);

                if ($existingOrdersCount >= $targetCount) {
                    $this->command->info("  ℹ️ Tenant already has {$existingOrdersCount} orders, skipping");
                    return;
                }

                $ordersToCreate = $targetCount - $existingOrdersCount;
                $this->command->info("  📝 Creating {$ordersToCreate} additional orders...");

                // Get products, customers, and users for this tenant
                $products = Product::where('tenant_id', $tenant->id)
                    ->where('status', 'published')
                    ->get();

                $customers = Customer::where('tenant_id', $tenant->id)->get();
                $users = User::where('tenant_id', $tenant->id)->get();

                if ($products->isEmpty() || $customers->isEmpty() || $users->isEmpty()) {
                    $this->command->warn("  ⚠️ Insufficient data (products/customers/users) for tenant");
                    return;
                }

                // Create orders
                for ($i = 0; $i < $ordersToCreate; $i++) {
                    $this->createOrder($tenant, $products, $customers, $users);
                }

                $this->command->info("  ✅ Created {$ordersToCreate} orders");
            });

            $this->command->info("✨ Completed orders seeding for {$tenant->name}\n");
        }

        $this->command->info("🎉 Comprehensive Orders Seeding completed successfully!");
    }

    /**
     * Create a single order with items
     */
    private function createOrder(Tenant $tenant, $products, $customers, $users)
    {
        $customer = $customers->random();
        $user = $users->random();
        
        // Generate invoice number
        $datePrefix = now()->subDays(random_int(0, 90))->format('Ymd');
        $invoice = 'INV-' . $datePrefix . '-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);

        // Determine order status based on weighted distribution
        $status = $this->getWeightedRandomStatus();

        // Create order
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'customer_id' => $customer->id,
            'invoice_number' => $invoice,
            'total_amount' => 0,
            'payment_method' => fake()->randomElement($this->paymentMethods),
            'amount_paid' => 0,
            'change_amount' => 0,
            'status' => $status,
            'created_at' => now()->subDays(random_int(0, 90)),
            'updated_at' => now()->subDays(random_int(0, 60)),
        ]);

        // Add 1-8 items to order
        $itemsCount = random_int(1, 8);
        $orderTotal = 0;
        $selectedProducts = $products->random(min($itemsCount, $products->count()));

        foreach ($selectedProducts as $product) {
            $qty = random_int(1, 10);
            $price = (float) $product->price;
            
            // Apply random discount (0-30%) occasionally
            if (fake()->boolean(20)) { // 20% chance of discount
                $discountPercent = random_int(5, 30);
                $price = $price * (1 - ($discountPercent / 100));
            }

            $subtotal = round($price * $qty, 2);

            OrderItem::create([
                'id' => (string) Str::uuid(),
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $qty,
                'price' => $price,
                'subtotal' => $subtotal,
            ]);

            $orderTotal += $subtotal;

            // Decrease stock for paid orders only
            if ($status === 'paid') {
                $newStock = max(0, (int) $product->stock - $qty);
                $product->update(['stock' => $newStock]);
            }
        }

        // Update order totals
        if ($status === 'paid') {
            // For paid orders, calculate amount paid and change
            $amountPaid = $orderTotal + fake()->randomFloat(2, 0, 50); // May overpay
            $changeAmount = max(0, $amountPaid - $orderTotal);
        } elseif ($status === 'pending') {
            // For pending orders, may have partial payment
            $paymentPercent = fake()->randomElement([0, 50, 75]); // 0%, 50%, or 75% paid
            $amountPaid = round($orderTotal * ($paymentPercent / 100), 2);
            $changeAmount = 0;
        } else {
            // Cancelled orders have no payment
            $amountPaid = 0;
            $changeAmount = 0;
        }

        $order->update([
            'total_amount' => $orderTotal,
            'amount_paid' => $amountPaid,
            'change_amount' => $changeAmount,
        ]);
    }

    /**
     * Get weighted random status
     */
    private function getWeightedRandomStatus(): string
    {
        $rand = random_int(1, 100);
        $cumulative = 0;

        foreach ($this->orderStatuses as $status => $weight) {
            $cumulative += $weight;
            if ($rand <= $cumulative) {
                return $status;
            }
        }

        return 'paid'; // fallback
    }
}