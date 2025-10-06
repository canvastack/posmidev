<?php

namespace App\Exports;

use Src\Pms\Infrastructure\Models\ProductVariant;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Export Product Variants to Excel/CSV
 * 
 * IMMUTABLE RULES COMPLIANT:
 * - Strict tenant isolation via tenant_id
 * - All queries scoped to tenant
 * - No cross-tenant data leakage
 */
class VariantsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected string $tenantId;
    protected ?string $productId;
    protected ?string $search;
    protected ?string $status;

    /**
     * Constructor
     * 
     * @param string $tenantId - Tenant UUID (REQUIRED for isolation)
     * @param string|null $productId - Optional product filter
     * @param string|null $search - Optional search term
     * @param string|null $status - Optional status filter
     */
    public function __construct(
        string $tenantId,
        ?string $productId = null,
        ?string $search = null,
        ?string $status = null
    ) {
        $this->tenantId = $tenantId;
        $this->productId = $productId;
        $this->search = $search;
        $this->status = $status;
    }

    /**
     * Get collection of variants to export
     * 
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        // IMMUTABLE RULE: Always filter by tenant_id
        $query = ProductVariant::where('product_variants.tenant_id', $this->tenantId)
            ->with(['product:id,name,sku']);

        // Filter by product if specified
        if ($this->productId) {
            $query->where('product_id', $this->productId);
        }

        // Search across multiple fields
        if ($this->search) {
            $driver = \DB::connection()->getDriverName();
            $query->where(function ($q) use ($driver) {
                $searchTerm = strtolower($this->search);
                if ($driver === 'pgsql') {
                    $q->whereRaw('LOWER(sku) ILIKE ?', ["%{$searchTerm}%"])
                        ->orWhereRaw('LOWER(name) ILIKE ?', ["%{$searchTerm}%"])
                        ->orWhereRaw('LOWER(barcode) ILIKE ?', ["%{$searchTerm}%"]);
                } else {
                    $q->whereRaw('LOWER(sku) LIKE ?', ["%{$searchTerm}%"])
                        ->orWhereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                        ->orWhereRaw('LOWER(barcode) LIKE ?', ["%{$searchTerm}%"]);
                }
            });
        }

        // Filter by status (using is_active field)
        if ($this->status) {
            if ($this->status === 'active') {
                $query->where('is_active', true);
            } elseif ($this->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        return $query->orderBy('product_id')
            ->orderBy('name')
            ->get();
    }

    /**
     * Define Excel column headings
     * 
     * @return array
     */
    public function headings(): array
    {
        return [
            'Product Name',
            'Product SKU',
            'Variant Name',
            'Variant SKU',
            'Barcode',
            'Price',
            'Cost Price',
            'Profit Margin (%)',
            'Stock',
            'Reserved Stock',
            'Available Stock',
            'Weight (g)',
            'Attributes',
            'Status',
            'Created At',
            'Updated At',
        ];
    }

    /**
     * Map variant data to Excel row
     * 
     * @param ProductVariant $variant
     * @return array
     */
    public function map($variant): array
    {
        // Calculate profit margin
        $profitMargin = 0;
        if ($variant->price > 0 && $variant->cost_price > 0) {
            $profitMargin = (($variant->price - $variant->cost_price) / $variant->price) * 100;
        }

        // Format attributes as "Color: Red, Size: L"
        // Note: attributes is a JSON column, not a relationship
        $attributesStr = '';
        if ($variant->attributes && is_array($variant->attributes) && count($variant->attributes) > 0) {
            $attrs = [];
            foreach ($variant->attributes as $key => $value) {
                $attrs[] = ucfirst($key) . ": " . $value;
            }
            $attributesStr = implode(', ', $attrs);
        }

        // Calculate available stock
        $availableStock = $variant->stock - ($variant->reserved_stock ?? 0);

        return [
            $variant->product?->name ?? 'N/A',
            $variant->product?->sku ?? 'N/A',
            $variant->name ?? '',
            $variant->sku,
            $variant->barcode ?? '',
            $variant->price,
            $variant->cost_price ?? 0,
            round($profitMargin, 2),
            $variant->stock,
            $variant->reserved_stock ?? 0,
            $availableStock,
            $variant->weight ?? 0,
            $attributesStr,
            $variant->is_active ? 'Active' : 'Inactive',
            $variant->created_at?->format('Y-m-d H:i:s'),
            $variant->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Apply styles to worksheet
     * 
     * @param Worksheet $sheet
     * @return array
     */
    public function styles(Worksheet $sheet)
    {
        return [
            // Style the first row as bold text
            1 => ['font' => ['bold' => true]],
        ];
    }
}