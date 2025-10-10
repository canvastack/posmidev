<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Collection;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\User;

/**
 * MaterialExportImportService
 * 
 * Service for exporting and importing materials in various formats
 * Supports CSV, Excel-compatible formats, and bulk operations
 * 
 * @package Src\Pms\Core\Services
 */
class MaterialExportImportService
{
    /**
     * Export materials to CSV format
     *
     * @param string $tenantId
     * @param array $filters Optional filters ['category', 'status', 'search']
     * @return array ['headers' => array, 'rows' => array]
     */
    public function exportToCSV(string $tenantId, array $filters = []): array
    {
        $query = Material::forTenant($tenantId);

        // Apply filters
        if (!empty($filters['category'])) {
            $query->byCategory($filters['category']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%");
            });
        }

        if (isset($filters['low_stock']) && $filters['low_stock']) {
            $query->lowStock();
        }

        $materials = $query->orderBy('name')->get();

        $headers = [
            'SKU',
            'Name',
            'Description',
            'Category',
            'Unit',
            'Stock Quantity',
            'Reorder Level',
            'Unit Cost',
            'Supplier',
            'Status',
            'Created At',
        ];

        $rows = $materials->map(function ($material) {
            return [
                'sku' => $material->sku,
                'name' => $material->name,
                'description' => $material->description ?? '',
                'category' => $material->category ?? '',
                'unit' => $material->unit,
                'stock_quantity' => $material->stock_quantity,
                'reorder_level' => $material->reorder_level,
                'unit_cost' => $material->unit_cost,
                'supplier' => $material->supplier ?? '',
            ];
        })->toArray();

        return [
            'headers' => $headers,
            'rows' => $rows,
            'total' => count($rows),
            'exported_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Export materials with transaction history
     *
     * @param string $tenantId
     * @param array $materialIds Optional specific material IDs
     * @return array
     */
    public function exportWithTransactions(string $tenantId, array $materialIds = []): array
    {
        $query = Material::forTenant($tenantId)
            ->with(['transactions' => function ($q) {
                $q->orderBy('created_at', 'desc')->limit(10);
            }]);

        if (!empty($materialIds)) {
            $query->whereIn('id', $materialIds);
        }

        $materials = $query->get();

        return $materials->map(function ($material) {
            return [
                'material_id' => $material->id,
                'sku' => $material->sku,
                'name' => $material->name,
                'current_stock' => $material->stock_quantity,
                'unit' => $material->unit,
                'transactions' => $material->transactions->map(function ($txn) {
                    return [
                        'date' => $txn->created_at->format('Y-m-d H:i:s'),
                        'type' => $txn->transaction_type,
                        'quantity_change' => $txn->quantity_change,
                        'quantity_after' => $txn->quantity_after,
                        'reason' => $txn->reason,
                        'notes' => $txn->notes,
                    ];
                }),
            ];
        })->toArray();
    }

    /**
     * Import materials from CSV data
     *
     * @param string $tenantId
     * @param array $rows Array of CSV rows
     * @param User $user User performing the import
     * @param bool $updateExisting Whether to update existing materials
     * @return array ['created' => int, 'updated' => int, 'errors' => array]
     */
    public function importFromCSV(string $tenantId, array $rows, User $user, bool $updateExisting = false): array
    {
        $created = 0;
        $updated = 0;
        $errors = [];

        // Expected headers (flexible matching)
        $headerMap = [
            'sku' => ['sku', 'code', 'material_code'],
            'name' => ['name', 'material_name', 'product_name'],
            'description' => ['description', 'desc', 'notes'],
            'category' => ['category', 'cat', 'group'],
            'unit' => ['unit', 'uom', 'unit_of_measure'],
            'stock_quantity' => ['stock_quantity', 'stock', 'qty', 'quantity'],
            'reorder_level' => ['reorder_level', 'reorder_point', 'min_stock'],
            'unit_cost' => ['unit_cost', 'cost', 'price', 'unit_price'],
            'supplier' => ['supplier', 'vendor', 'supplier_name'],
        ];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // Account for header row

            try {
                // Normalize row data
                $data = $this->normalizeRowData($row, $headerMap);

                // Check if material exists by SKU first
                $existing = null;
                if (!empty($data['sku'])) {
                    $existing = Material::forTenant($tenantId)
                        ->where('sku', $data['sku'])
                        ->first();
                }

                // Validate required fields
                $validator = Validator::make($data, [
                    'sku' => [
                        'nullable',
                        'string',
                        'max:100',
                        $existing && $updateExisting
                            ? 'unique:materials,sku,' . $existing->id . ',id,tenant_id,' . $tenantId
                            : 'unique:materials,sku,NULL,id,tenant_id,' . $tenantId
                    ],
                    'name' => 'required|string|max:255',
                    'unit' => 'required|in:kg,g,L,ml,pcs,box,bottle,can,bag',
                    'stock_quantity' => 'required|numeric|min:0',
                    'reorder_level' => 'nullable|numeric|min:0',
                    'unit_cost' => 'nullable|numeric|min:0',
                ]);

                if ($validator->fails()) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'errors' => $validator->errors()->all(),
                        'data' => $data,
                    ];
                    continue;
                }

                $validatedData = $validator->validated();
                $validatedData['tenant_id'] = $tenantId;

                if ($existing && $updateExisting) {
                    // Update existing material
                    $existing->update($validatedData);
                    $updated++;
                } elseif (!$existing) {
                    // Create new material
                    Material::create($validatedData);
                    $created++;
                } else {
                    $errors[] = [
                        'row' => $rowNumber,
                        'errors' => ['Material with SKU already exists. Set updateExisting=true to update.'],
                        'data' => $data,
                    ];
                }
            } catch (\Exception $e) {
                $errors[] = [
                    'row' => $rowNumber,
                    'errors' => [$e->getMessage()],
                    'data' => $row,
                ];
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'failed' => count($errors),
            'errors' => $errors,
            'total_rows' => count($rows),
            'imported_by' => $user->name,
            'imported_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Validate import data before actual import
     *
     * @param string $tenantId
     * @param array $rows
     * @return array ['valid' => int, 'invalid' => int, 'errors' => array]
     */
    public function validateImportData(string $tenantId, array $rows): array
    {
        $valid = 0;
        $invalid = 0;
        $errors = [];

        $headerMap = [
            'sku' => ['sku', 'code', 'material_code'],
            'name' => ['name', 'material_name', 'product_name'],
            'unit' => ['unit', 'uom', 'unit_of_measure'],
            'stock_quantity' => ['stock_quantity', 'stock', 'qty', 'quantity'],
        ];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $data = $this->normalizeRowData($row, $headerMap);

            $validator = Validator::make($data, [
                'name' => 'required|string|max:255',
                'unit' => 'required|in:kg,g,L,ml,pcs,box,bottle,can,bag',
                'stock_quantity' => 'required|numeric|min:0',
            ]);

            if ($validator->fails()) {
                $invalid++;
                $errors[] = [
                    'row' => $rowNumber,
                    'errors' => $validator->errors()->all(),
                    'data' => $data,
                ];
            } else {
                $valid++;
            }
        }

        return [
            'valid' => $valid,
            'invalid' => $invalid,
            'total' => count($rows),
            'errors' => $errors,
            'can_proceed' => $invalid === 0,
        ];
    }

    /**
     * Generate import template CSV
     *
     * @return array
     */
    public function generateImportTemplate(): array
    {
        $headers = [
            'sku',
            'name',
            'description',
            'category',
            'unit',
            'stock_quantity',
            'reorder_level',
            'unit_cost',
            'supplier',
        ];

        $exampleRows = [
            [
                'FLOUR-001',
                'Premium Flour',
                'High quality wheat flour for baking',
                'Baking Ingredients',
                'kg',
                '100',
                '20',
                '5.50',
                'ABC Suppliers',
            ],
            [
                'CHEESE-002',
                'Mozzarella Cheese',
                'Fresh mozzarella for pizza',
                'Dairy',
                'kg',
                '50',
                '10',
                '12.00',
                'Dairy Co',
            ],
        ];

        return [
            'headers' => $headers,
            'example_rows' => $exampleRows,
            'instructions' => [
                'Fill in the data starting from row 2',
                'SKU is optional but recommended for tracking',
                'Name and Unit are required fields',
                'Unit must be one of: kg, g, L, ml, pcs, box, bottle, can, bag',
                'Stock quantity must be a non-negative number',
                'Costs and reorder levels are optional',
            ],
        ];
    }

    /**
     * Normalize row data based on header mapping
     *
     * @param array $row
     * @param array $headerMap
     * @return array
     */
    private function normalizeRowData(array $row, array $headerMap): array
    {
        $normalized = [];

        foreach ($headerMap as $field => $possibleKeys) {
            foreach ($possibleKeys as $key) {
                if (isset($row[$key])) {
                    $normalized[$field] = $row[$key];
                    break;
                }
            }
        }

        return $normalized;
    }

    /**
     * Export low stock materials report
     *
     * @param string $tenantId
     * @return array
     */
    public function exportLowStockReport(string $tenantId): array
    {
        $materials = Material::forTenant($tenantId)
            ->lowStock()
            ->orderBy('stock_quantity', 'asc')
            ->get();

        return [
            'report_type' => 'Low Stock Alert',
            'generated_at' => now()->toIso8601String(),
            'total_materials' => $materials->count(),
            'materials' => $materials->map(function ($material) {
                $shortfall = $material->reorder_level - $material->stock_quantity;
                return [
                    'sku' => $material->sku,
                    'name' => $material->name,
                    'category' => $material->category,
                    'current_stock' => $material->stock_quantity,
                    'reorder_level' => $material->reorder_level,
                    'shortfall' => $shortfall,
                    'unit' => $material->unit,
                    'unit_cost' => $material->unit_cost,
                    'reorder_cost' => $shortfall * $material->unit_cost,
                    'supplier' => $material->supplier,
                ];
            })->toArray(),
        ];
    }
}