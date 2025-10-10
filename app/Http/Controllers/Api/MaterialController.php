<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BOM\MaterialCreateRequest;
use App\Http\Requests\BOM\MaterialUpdateRequest;
use App\Http\Requests\BOM\MaterialBulkCreateRequest;
use App\Http\Requests\BOM\AdjustStockRequest;
use App\Http\Requests\BOM\MaterialImportRequest;
use App\Http\Requests\BOM\MaterialExportRequest;
use Src\Pms\Core\Services\MaterialService;
use Src\Pms\Core\Services\MaterialExportImportService;
use Src\Pms\Infrastructure\Models\Material;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialController extends Controller
{
    public function __construct(
        private MaterialService $materialService,
        private MaterialExportImportService $exportImportService
    ) {}

    /**
     * Display a listing of materials for the tenant.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', Material::class);
        
        $filters = $request->only(['search', 'category', 'unit', 'low_stock', 'sort_by', 'sort_order']);
        $perPage = $request->input('per_page', 20);
        
        $paginator = $this->materialService->getAllForTenant($tenantId, $filters, $perPage);
        
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    /**
     * Store a newly created material in storage.
     * 
     * @param MaterialCreateRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function store(MaterialCreateRequest $request, string $tenantId): JsonResponse
    {
        $material = $this->materialService->create($tenantId, $request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Material created successfully',
            'data' => $material,
        ], 201);
    }

    /**
     * Display the specified material.
     * 
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function show(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('view', Material::class);
        
        $material = $this->materialService->getById($id, $tenantId);
        
        return response()->json([
            'success' => true,
            'data' => $material,
        ]);
    }

    /**
     * Update the specified material in storage.
     * 
     * @param MaterialUpdateRequest $request
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function update(MaterialUpdateRequest $request, string $tenantId, string $id): JsonResponse
    {
        $material = $this->materialService->update($id, $tenantId, $request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Material updated successfully',
            'data' => $material,
        ]);
    }

    /**
     * Remove the specified material from storage.
     * 
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('delete', Material::class);
        
        $this->materialService->delete($id, $tenantId);
        
        return response()->json([
            'success' => true,
            'message' => 'Material deleted successfully',
        ]);
    }

    /**
     * Bulk create materials.
     * 
     * @param MaterialBulkCreateRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function bulkStore(MaterialBulkCreateRequest $request, string $tenantId): JsonResponse
    {
        $result = $this->materialService->bulkCreate($tenantId, $request->input('materials'));
        
        return response()->json([
            'success' => true,
            'message' => 'Bulk material creation completed',
            'summary' => [
                'total' => count($request->input('materials')),
                'success' => count($result['created']),
                'failed' => count($result['errors']),
            ],
            'data' => [
                'created' => $result['created'],
                'errors' => $result['errors'],
            ],
        ], 201);
    }

    /**
     * Adjust material stock.
     * 
     * @param AdjustStockRequest $request
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function adjustStock(AdjustStockRequest $request, string $tenantId, string $id): JsonResponse
    {
        $transaction = $this->materialService->adjustStock(
            $id,
            $tenantId,
            $request->input('type'),
            $request->input('quantity'),
            $request->input('reason'),
            $request->input('notes'),
            $request->user()
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted successfully',
            'data' => $transaction,
        ]);
    }

    /**
     * Get materials with low stock.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function lowStock(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', Material::class);
        
        $materials = $this->materialService->getLowStock($tenantId);
        
        return response()->json([
            'success' => true,
            'data' => $materials,
            'count' => count($materials),
        ]);
    }

    /**
     * Export materials.
     * 
     * @param MaterialExportRequest $request
     * @param string $tenantId
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function export(MaterialExportRequest $request, string $tenantId)
    {
        $format = $request->input('format', 'xlsx');
        $filters = $request->only(['category', 'low_stock', 'search']);
        
        return $this->exportImportService->export($tenantId, $filters, $format);
    }

    /**
     * Import materials from file.
     * 
     * @param MaterialImportRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function import(MaterialImportRequest $request, string $tenantId): JsonResponse
    {
        $file = $request->file('file');
        $updateExisting = $request->input('update_existing', false);
        $skipErrors = $request->input('skip_errors', true);
        
        $result = $this->exportImportService->import($tenantId, $file, $updateExisting, $skipErrors);
        
        return response()->json([
            'success' => true,
            'message' => 'Import completed',
            'summary' => [
                'total' => $result['total'],
                'imported' => $result['imported'],
                'updated' => $result['updated'],
                'failed' => $result['failed'],
            ],
            'data' => [
                'materials' => $result['materials'],
                'errors' => $result['errors'],
            ],
        ]);
    }

    /**
     * Download import template.
     * 
     * @param string $tenantId
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function importTemplate(string $tenantId)
    {
        $this->authorize('viewAny', Material::class);
        
        return $this->exportImportService->downloadTemplate();
    }

    /**
     * Get low stock report.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function lowStockReport(Request $request, string $tenantId)
    {
        $this->authorize('viewAny', Material::class);
        
        $format = $request->input('format', 'xlsx');
        
        return $this->exportImportService->exportLowStockReport($tenantId, $format);
    }
}