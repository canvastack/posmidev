<?php

namespace App\Imports;

use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\VariantAttribute;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

/**
 * Import Product Variants from Excel/CSV
 * 
 * IMMUTABLE RULES COMPLIANT:
 * - Strict tenant isolation via tenant_id
 * - All operations scoped to tenant
 * - No cross-tenant data access
 * - Uses UUID for all IDs
 */
class VariantsImport implements 
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
    protected int $updated = 0;
    protected int $skipped = 0;
    protected bool $updateExisting;

    /**
     * Constructor
     * 
     * @param string $tenantId - Tenant UUID (REQUIRED for isolation)
     * @param bool $updateExisting - Update if SKU exists (default: false)
     */
    public function __construct(string $tenantId, bool $updateExisting = false)
    {
        $this->tenantId = $tenantId;
        $this->updateExisting = $updateExisting;
    }

    /**
     * Process each row and create/update variant
     * 
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        // IMMUTABLE RULE: Find product by SKU within tenant scope only
        $product = Product::where('tenant_id', $this->tenantId)
            ->where('sku', $row['product_sku'])
            ->first();

        if (!$product) {
            $this->skipped++;
            return null; // Skip if product not found
        }

        // Check if variant already exists for this tenant
        $existingVariant = ProductVariant::where('tenant_id', $this->tenantId)
            ->where('sku', $row['variant_sku'])
            ->first();

        if ($existingVariant) {
            if ($this->updateExisting) {
                // Update existing variant
                $this->updateVariant($existingVariant, $row);
                $this->updated++;
                return null; // Return null to avoid duplicate insert
            } else {
                $this->skipped++;
                return null; // Skip if already exists and not updating
            }
        }

        // Validate and set is_active status
        $isActive = true;
        if (!empty($row['status'])) {
            $statusLower = strtolower($row['status']);
            if ($statusLower === 'inactive' || $statusLower === 'discontinued') {
                $isActive = false;
            }
        }

        // Parse attributes from string (format: "Color: Red, Size: L")
        $attributes = [];
        if (!empty($row['attributes'])) {
            $attributes = $this->parseAttributesString($row['attributes']);
        }

        $this->imported++;

        // Create new variant
        $variant = new ProductVariant([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $this->tenantId, // IMMUTABLE RULE: Always set tenant_id
            'product_id' => $product->id,
            'sku' => $row['variant_sku'],
            'name' => $row['variant_name'] ?? null,
            'barcode' => $row['barcode'] ?? null,
            'price' => (float) $row['price'],
            'cost_price' => isset($row['cost_price']) ? (float) $row['cost_price'] : null,
            'stock' => isset($row['stock']) ? (int) $row['stock'] : 0,
            'reserved_stock' => isset($row['reserved_stock']) ? (int) $row['reserved_stock'] : 0,
            'weight' => isset($row['weight']) ? (float) $row['weight'] : null,
            'attributes' => $attributes, // Store as JSON
            'is_active' => $isActive,
        ]);

        return $variant;
    }

    /**
     * Update existing variant
     * 
     * @param ProductVariant $variant
     * @param array $row
     * @return void
     */
    protected function updateVariant(ProductVariant $variant, array $row): void
    {
        $updateData = [];

        // Update fields if provided
        if (isset($row['variant_name'])) {
            $updateData['name'] = $row['variant_name'];
        }
        if (isset($row['barcode'])) {
            $updateData['barcode'] = $row['barcode'];
        }
        if (isset($row['price'])) {
            $updateData['price'] = (float) $row['price'];
        }
        if (isset($row['cost_price'])) {
            $updateData['cost_price'] = (float) $row['cost_price'];
        }
        if (isset($row['stock'])) {
            $updateData['stock'] = (int) $row['stock'];
        }
        if (isset($row['reserved_stock'])) {
            $updateData['reserved_stock'] = (int) $row['reserved_stock'];
        }
        if (isset($row['weight'])) {
            $updateData['weight'] = (float) $row['weight'];
        }
        if (isset($row['status'])) {
            $statusLower = strtolower($row['status']);
            if ($statusLower === 'inactive' || $statusLower === 'discontinued') {
                $updateData['is_active'] = false;
            } else {
                $updateData['is_active'] = true;
            }
        }

        // Update attributes if provided (store as JSON)
        if (!empty($row['attributes'])) {
            $updateData['attributes'] = $this->parseAttributesString($row['attributes']);
        }

        if (!empty($updateData)) {
            $variant->update($updateData);
        }
    }

    /**
     * Parse attributes string to array (format: "Color: Red, Size: L")
     * Returns: ["color" => "Red", "size" => "L"]
     * 
     * @param string $attributesStr
     * @return array
     */
    protected function parseAttributesString(string $attributesStr): array
    {
        $attributes = [];
        $attributePairs = explode(',', $attributesStr);

        foreach ($attributePairs as $pair) {
            $parts = explode(':', trim($pair));
            if (count($parts) === 2) {
                $attributeName = strtolower(trim($parts[0]));
                $attributeValue = trim($parts[1]);
                $attributes[$attributeName] = $attributeValue;
            }
        }

        return $attributes;
    }

    /**
     * Validation rules
     * 
     * @return array
     */
    public function rules(): array
    {
        return [
            'product_sku' => 'required|string|max:100',
            'variant_sku' => 'required|string|max:100',
            'variant_name' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:100',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'reserved_stock' => 'nullable|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'attributes' => 'nullable|string',
            'status' => 'nullable|in:Active,Inactive,Discontinued,active,inactive,discontinued',
        ];
    }

    /**
     * Custom validation messages
     * 
     * @return array
     */
    public function customValidationMessages()
    {
        return [
            'product_sku.required' => 'Product SKU is required',
            'variant_sku.required' => 'Variant SKU is required',
            'price.required' => 'Price is required',
            'price.min' => 'Price must be greater than or equal to 0',
            'stock.min' => 'Stock cannot be negative',
            'reserved_stock.min' => 'Reserved stock cannot be negative',
            'weight.min' => 'Weight cannot be negative',
        ];
    }

    /**
     * Batch size for inserts
     * 
     * @return int
     */
    public function batchSize(): int
    {
        return 100;
    }

    /**
     * Chunk size for reading
     * 
     * @return int
     */
    public function chunkSize(): int
    {
        return 100;
    }

    /**
     * Get imported count
     * 
     * @return int
     */
    public function getImportedCount(): int
    {
        return $this->imported;
    }

    /**
     * Get updated count
     * 
     * @return int
     */
    public function getUpdatedCount(): int
    {
        return $this->updated;
    }

    /**
     * Get skipped count
     * 
     * @return int
     */
    public function getSkippedCount(): int
    {
        return $this->skipped;
    }
}