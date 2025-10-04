<?php

namespace App\Exports;

use Src\Pms\Infrastructure\Models\Product;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected string $tenantId;
    protected ?string $search;
    protected ?string $categoryId;
    protected ?string $stockFilter;
    protected ?float $minPrice;
    protected ?float $maxPrice;

    public function __construct(
        string $tenantId,
        ?string $search = null,
        ?string $categoryId = null,
        ?string $stockFilter = null,
        ?float $minPrice = null,
        ?float $maxPrice = null
    ) {
        $this->tenantId = $tenantId;
        $this->search = $search;
        $this->categoryId = $categoryId;
        $this->stockFilter = $stockFilter;
        $this->minPrice = $minPrice;
        $this->maxPrice = $maxPrice;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        $query = Product::where('tenant_id', $this->tenantId)
            ->with('category');

        // Apply filters (same as index method)
        if ($this->search) {
            $query->where(function ($q) {
                $searchTerm = strtolower($this->search);
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(sku) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%{$searchTerm}%"]);
            });
        }

        if ($this->categoryId) {
            $query->where('category_id', $this->categoryId);
        }

        if ($this->stockFilter) {
            switch ($this->stockFilter) {
                case 'in_stock':
                    $query->where('stock', '>', 0);
                    break;
                case 'low_stock':
                    $query->where('stock', '>', 0)->where('stock', '<=', 10);
                    break;
                case 'out_of_stock':
                    $query->where('stock', '=', 0);
                    break;
            }
        }

        if ($this->minPrice !== null) {
            $query->where('price', '>=', $this->minPrice);
        }

        if ($this->maxPrice !== null) {
            $query->where('price', '<=', $this->maxPrice);
        }

        return $query->orderBy('name')->get();
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'SKU',
            'Name',
            'Description',
            'Category',
            'Price',
            'Cost Price',
            'Profit Margin (%)',
            'Stock',
            'Status',
            'Created At',
            'Updated At',
        ];
    }

    /**
     * @param Product $product
     * @return array
     */
    public function map($product): array
    {
        $profitMargin = 0;
        if ($product->price > 0 && $product->cost_price > 0) {
            $profitMargin = (($product->price - $product->cost_price) / $product->price) * 100;
        }

        return [
            $product->sku,
            $product->name,
            $product->description ?? '',
            $product->category?->name ?? 'Uncategorized',
            $product->price,
            $product->cost_price ?? 0,
            round($profitMargin, 2),
            $product->stock,
            ucfirst($product->status),
            $product->created_at?->format('Y-m-d H:i:s'),
            $product->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
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