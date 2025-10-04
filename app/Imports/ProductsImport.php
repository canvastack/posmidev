<?php

namespace App\Imports;

use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Category;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Illuminate\Support\Str;

class ProductsImport implements 
    ToModel, 
    WithHeadingRow, 
    WithValidation, 
    WithBatchInserts, 
    WithChunkReading,
    SkipsOnError
{
    use SkipsErrors;

    protected string $tenantId;
    protected int $imported = 0;
    protected int $skipped = 0;

    public function __construct(string $tenantId)
    {
        $this->tenantId = $tenantId;
    }

    /**
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        // Skip if SKU already exists for this tenant
        if (Product::where('tenant_id', $this->tenantId)
            ->where('sku', $row['sku'])
            ->exists()) {
            $this->skipped++;
            return null;
        }

        // Find category by name if provided
        $categoryId = null;
        if (!empty($row['category'])) {
            $category = Category::where('tenant_id', $this->tenantId)
                ->where('name', $row['category'])
                ->first();
            
            if ($category) {
                $categoryId = $category->id;
            }
        }

        // Validate and set status
        $status = 'active';
        if (!empty($row['status'])) {
            $statusLower = strtolower($row['status']);
            if (in_array($statusLower, ['active', 'inactive', 'discontinued'])) {
                $status = $statusLower;
            }
        }

        $this->imported++;

        return new Product([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $this->tenantId,
            'sku' => $row['sku'],
            'name' => $row['name'],
            'description' => $row['description'] ?? null,
            'price' => (float) $row['price'],
            'cost_price' => isset($row['cost_price']) ? (float) $row['cost_price'] : null,
            'stock' => isset($row['stock']) ? (int) $row['stock'] : 0,
            'category_id' => $categoryId,
            'status' => $status,
        ]);
    }

    /**
     * @return array
     */
    public function rules(): array
    {
        return [
            'sku' => 'required|string|max:100',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'status' => 'nullable|in:Active,Inactive,Discontinued,active,inactive,discontinued',
        ];
    }

    /**
     * @return array
     */
    public function customValidationMessages()
    {
        return [
            'sku.required' => 'SKU is required',
            'name.required' => 'Product name is required',
            'price.required' => 'Price is required',
            'price.min' => 'Price must be greater than or equal to 0',
            'stock.min' => 'Stock cannot be negative',
        ];
    }

    /**
     * @return int
     */
    public function batchSize(): int
    {
        return 100;
    }

    /**
     * @return int
     */
    public function chunkSize(): int
    {
        return 100;
    }

    /**
     * @return int
     */
    public function getImportedCount(): int
    {
        return $this->imported;
    }

    /**
     * @return int
     */
    public function getSkippedCount(): int
    {
        return $this->skipped;
    }
}