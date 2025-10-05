<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;
use Pms\Infrastructure\Models\Tenant;

/**
 * Low Stock Notification
 * 
 * Phase 5 Sprint 3: Scheduled Jobs & Notifications
 * 
 * Sends notifications to users when products reach low stock levels.
 * Supports both database (in-app) and mail (email) channels.
 * 
 * CORE IMMUTABLE RULES ENFORCED:
 * - Tenant-scoped notifications
 * - Only notifies users within the same tenant
 * - All data is tenant-isolated
 * 
 * Channels:
 * - database: In-app notifications (always enabled)
 * - mail: Email notifications (optional, configurable via env)
 * 
 * @property Collection $products Collection of low stock Product models
 * @property Tenant $tenant The tenant context for these products
 */
class LowStockNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Collection of low stock products
     */
    protected Collection $products;

    /**
     * Tenant context
     */
    protected Tenant $tenant;

    /**
     * Create a new notification instance.
     */
    public function __construct(Collection $products, Tenant $tenant)
    {
        $this->products = $products;
        $this->tenant = $tenant;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];

        // Database notifications (in-app) - always enabled
        if (config('stock_alerts.notifications.database_enabled', true)) {
            $channels[] = 'database';
        }

        // Add mail channel if email notifications are enabled
        if (config('stock_alerts.notifications.mail_enabled', false)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $productCount = $this->products->count();
        $criticalCount = $this->products->filter(fn($p) => $p->isCriticalStock())->count();
        $outOfStockCount = $this->products->filter(fn($p) => $p->isOutOfStock())->count();

        $message = (new MailMessage)
            ->subject("⚠️ Low Stock Alert - {$productCount} Products Need Attention")
            ->greeting("Hello {$notifiable->name}!")
            ->line("This is an automated alert from **{$this->tenant->name}** inventory system.")
            ->line("**{$productCount} product(s)** are currently at or below their reorder points:");

        // Add severity breakdown
        if ($outOfStockCount > 0) {
            $message->line("🔴 **Out of Stock:** {$outOfStockCount} product(s)");
        }
        if ($criticalCount > 0) {
            $message->line("🟠 **Critical Stock:** {$criticalCount} product(s)");
        }
        $lowCount = $productCount - $criticalCount - $outOfStockCount;
        if ($lowCount > 0) {
            $message->line("🟡 **Low Stock:** {$lowCount} product(s)");
        }

        $message->line(''); // Empty line

        // List top products (configurable limit)
        $emailProductLimit = config('stock_alerts.notifications.email_product_limit', 10);
        $topProducts = $this->products->sortBy('stock')->take($emailProductLimit);
        $message->line('**Products requiring attention:**');
        
        foreach ($topProducts as $product) {
            $emoji = match(true) {
                $product->isOutOfStock() => '🔴',
                $product->isCriticalStock() => '🟠',
                default => '🟡'
            };
            
            $message->line("{$emoji} **{$product->name}** - Stock: {$product->stock} / Reorder Point: {$product->reorder_point}");
        }

        if ($productCount > $emailProductLimit) {
            $remaining = $productCount - $emailProductLimit;
            $message->line("... and {$remaining} more product(s)");
        }

        // Add action button
        $dashboardUrl = config('stock_alerts.frontend_url') . "/tenants/{$this->tenant->id}/inventory/alerts";
        
        $message->action('View All Alerts', $dashboardUrl)
            ->line('Please review and take appropriate action to replenish stock levels.')
            ->line('Thank you for using our inventory management system!');

        return $message;
    }

    /**
     * Get the database representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $productCount = $this->products->count();
        $criticalCount = $this->products->filter(fn($p) => $p->isCriticalStock())->count();
        $outOfStockCount = $this->products->filter(fn($p) => $p->isOutOfStock())->count();
        $lowCount = $productCount - $criticalCount - $outOfStockCount;

        // Build summary
        $summaryParts = [];
        if ($outOfStockCount > 0) {
            $summaryParts[] = "{$outOfStockCount} out of stock";
        }
        if ($criticalCount > 0) {
            $summaryParts[] = "{$criticalCount} critical";
        }
        if ($lowCount > 0) {
            $summaryParts[] = "{$lowCount} low";
        }
        $summary = implode(', ', $summaryParts);

        // Get top products for preview (configurable limit)
        $dbProductLimit = config('stock_alerts.notifications.database_product_limit', 5);
        $topProducts = $this->products->sortBy('stock')->take($dbProductLimit)->map(function ($product) {
            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'stock' => $product->stock,
                'reorder_point' => $product->reorder_point,
                'severity' => $product->getStockAlertSeverity(),
                'category' => $product->category ? $product->category->name : null,
            ];
        })->values()->toArray();

        return [
            'type' => 'low_stock_alert',
            'tenant_id' => $this->tenant->id,
            'tenant_name' => $this->tenant->name,
            'title' => "Low Stock Alert - {$productCount} Products",
            'message' => "{$productCount} product(s) are at or below reorder points: {$summary}",
            'summary' => [
                'total_products' => $productCount,
                'out_of_stock' => $outOfStockCount,
                'critical' => $criticalCount,
                'low' => $lowCount,
            ],
            'products' => $topProducts,
            'action_url' => "/tenants/{$this->tenant->id}/inventory/alerts",
            'action_text' => 'View All Alerts',
            'created_at' => now()->toISOString(),
        ];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return $this->toDatabase($notifiable);
    }

    /**
     * Determine which queues should be used for each notification channel.
     *
     * @return array<string, string>
     */
    public function viaQueues(): array
    {
        return [
            'mail' => 'notifications',
            'database' => 'default',
        ];
    }

    /**
     * Get the notification's priority for queues.
     */
    public function priority(): int
    {
        // Higher priority for notifications with critical/out of stock products
        $criticalCount = $this->products->filter(fn($p) => $p->isCriticalStock() || $p->isOutOfStock())->count();
        
        return $criticalCount > 0 ? 10 : 5;
    }
}