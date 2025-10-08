<?php

namespace Src\Pms\Core\Services;

use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;
use Src\Pms\Infrastructure\Models\Product;

/**
 * Product Analytics Export Service
 * 
 * Handles exporting product analytics data to CSV and PDF formats.
 * Supports sales metrics, stock metrics, profit metrics, and variant performance.
 */
class ProductAnalyticsExportService
{
    protected ProductAnalyticsService $analyticsService;
    
    public function __construct(ProductAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }
    
    /**
     * Export analytics to CSV
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function exportToCsv(
        string $productId,
        string $tenantId,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ) {
        // Get analytics data
        $overview = $this->analyticsService->getOverview($productId, $tenantId, $periodStart, $periodEnd);
        
        // Get product info
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();
        
        // Prepare CSV data
        $csvData = $this->prepareCsvData($overview, $product, $periodStart, $periodEnd);
        
        // Generate filename
        $filename = $this->generateFilename($product->name, 'csv', $periodStart, $periodEnd);
        
        // Create CSV
        return $this->createCsvFile($csvData, $filename);
    }
    
    /**
     * Export analytics to PDF
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return \Illuminate\Http\Response
     */
    public function exportToPdf(
        string $productId,
        string $tenantId,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ) {
        // Get analytics data
        $overview = $this->analyticsService->getOverview($productId, $tenantId, $periodStart, $periodEnd);
        
        // Get product info
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();
        
        // Generate filename
        $filename = $this->generateFilename($product->name, 'pdf', $periodStart, $periodEnd);
        
        // Prepare view data
        $data = [
            'product' => $product,
            'overview' => $overview,
            'sales' => $overview['sales'] ?? [],
            'stock' => $overview['stock'] ?? [],
            'profit' => $overview['profit'] ?? [],
            'variants' => $overview['variants'] ?? [],
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'generated_at' => now()->format('Y-m-d H:i:s'),
        ];
        
        // Generate PDF
        $pdf = Pdf::loadView('pdf.product-analytics', $data);
        
        return $pdf->download($filename);
    }
    
    /**
     * Prepare CSV data structure
     * 
     * @param array $overview
     * @param Product $product
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    protected function prepareCsvData(
        array $overview,
        Product $product,
        ?string $periodStart,
        ?string $periodEnd
    ): array {
        $data = [];
        
        // Header
        $data[] = ['Product Analytics Report'];
        $data[] = ['Product', $product->name];
        $data[] = ['SKU', $product->sku];
        $data[] = ['Period', ($periodStart ?? 'All time') . ' to ' . ($periodEnd ?? 'Now')];
        $data[] = ['Generated', now()->format('Y-m-d H:i:s')];
        $data[] = []; // Empty row
        
        // Sales Metrics
        $sales = $overview['sales'] ?? [];
        $data[] = ['SALES METRICS'];
        $data[] = ['Metric', 'Value'];
        $data[] = ['Total Revenue', number_format($sales['total_revenue'] ?? 0, 2)];
        $data[] = ['Total Orders', $sales['total_orders'] ?? 0];
        $data[] = ['Total Quantity Sold', $sales['total_quantity_sold'] ?? 0];
        $data[] = ['Average Order Value', number_format($sales['average_order_value'] ?? 0, 2)];
        $data[] = []; // Empty row
        
        // Stock Metrics
        $stock = $overview['stock'] ?? [];
        $data[] = ['STOCK METRICS'];
        $data[] = ['Metric', 'Value'];
        $data[] = ['Current Stock', $stock['current_stock'] ?? 0];
        $data[] = ['Stock Value', number_format($stock['stock_value'] ?? 0, 2)];
        $data[] = ['Total Stock In', $stock['total_stock_in'] ?? 0];
        $data[] = ['Total Stock Out', $stock['total_stock_out'] ?? 0];
        $data[] = []; // Empty row
        
        // Profit Metrics
        $profit = $overview['profit'] ?? [];
        $data[] = ['PROFIT METRICS'];
        $data[] = ['Metric', 'Value'];
        $data[] = ['Total Revenue', number_format($profit['total_revenue'] ?? 0, 2)];
        $data[] = ['Total Cost', number_format($profit['total_cost'] ?? 0, 2)];
        $data[] = ['Gross Profit', number_format($profit['gross_profit'] ?? 0, 2)];
        $data[] = ['Profit Margin (%)', number_format($profit['profit_margin'] ?? 0, 2)];
        $data[] = []; // Empty row
        
        // Variant Performance
        $variants = $overview['variants'] ?? [];
        if (!empty($variants)) {
            $data[] = ['VARIANT PERFORMANCE'];
            $data[] = ['Variant', 'Revenue', 'Quantity Sold', 'Average Price', 'Stock'];
            foreach ($variants as $variant) {
                $data[] = [
                    $variant['variant_name'] ?? 'N/A',
                    number_format($variant['revenue'] ?? 0, 2),
                    $variant['quantity_sold'] ?? 0,
                    number_format($variant['average_price'] ?? 0, 2),
                    $variant['current_stock'] ?? 0,
                ];
            }
        }
        
        return $data;
    }
    
    /**
     * Create CSV file and return download response
     * 
     * @param array $data
     * @param string $filename
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    protected function createCsvFile(array $data, string $filename)
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];
        
        $callback = function() use ($data) {
            $file = fopen('php://output', 'w');
            foreach ($data as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
    
    /**
     * Generate export filename
     * 
     * @param string $productName
     * @param string $extension
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return string
     */
    protected function generateFilename(
        string $productName,
        string $extension,
        ?string $periodStart,
        ?string $periodEnd
    ): string {
        $sanitizedName = preg_replace('/[^A-Za-z0-9\-]/', '_', $productName);
        $timestamp = now()->format('Ymd_His');
        
        $period = '';
        if ($periodStart && $periodEnd) {
            $period = '_' . date('Ymd', strtotime($periodStart)) . '-' . date('Ymd', strtotime($periodEnd));
        }
        
        return "product_analytics_{$sanitizedName}{$period}_{$timestamp}.{$extension}";
    }
}