<?php

namespace Src\Pms\Core\Application\Services;

use Src\Pms\Core\Domain\Repositories\OrderRepositoryInterface;
use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;

class DashboardService
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private ProductRepositoryInterface $productRepository
    ) {}

    public function getDashboardData(string $tenantId): array
    {
        $todaysSales = $this->orderRepository->getTodaysSales($tenantId);
        $lowStockProducts = $this->productRepository->findLowStockProducts($tenantId, 10);

        return [
            'today_revenue' => $todaysSales['total_revenue'] ?? 0,
            'today_transactions' => $todaysSales['total_transactions'] ?? 0,
            'low_stock_products' => count($lowStockProducts),
            'low_stock_alerts' => array_map(function($product) {
                return [
                    'id' => $product->getId(),
                    'name' => $product->getName(),
                    'stock' => $product->getStock(),
                    'sku' => $product->getSku()
                ];
            }, $lowStockProducts)
        ];
    }
}