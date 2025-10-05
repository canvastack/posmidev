<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StockAdjustmentRequest;
use App\Http\Resources\StockAdjustmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Application\Services\StockAdjustmentService;

/**
 * StockAdjustmentController
 * 
 * 🔒 CORE IMMUTABLE RULES ENFORCED:
 * ✅ guard_name: 'api' - All auth uses API guard (Sanctum)
 * ✅ team_foreign_key: tenant_id - All queries scoped by tenant_id
 * ✅ Strictly tenant-scoped - No cross-tenant data access
 * ✅ Authorization via policies with tenantId parameter
 * 
 * Handles manual stock adjustments (Phase 5 enhancements)
 */
class StockAdjustmentController extends Controller
{
    public function __construct(
        private StockAdjustmentService $stockAdjustmentService
    ) {}

    /**
     * Create a new stock adjustment
     * 
     * @param StockAdjustmentRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function store(StockAdjustmentRequest $request, string $tenantId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization with tenantId
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\StockAdjustment::class, $tenantId]);

        try {
            $stockAdjustment = $this->stockAdjustmentService->createStockAdjustment(
                productId: $request->product_id,
                quantity: $request->quantity,
                reason: $request->reason,
                notes: $request->notes,
                userId: $request->user()->id
            );

            return response()->json(new StockAdjustmentResource($stockAdjustment), 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Get predefined stock adjustment reasons
     * 
     * Returns list of standard reasons for stock adjustments
     * for use in dropdown menus and consistent tracking
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function getAdjustmentReasons(Request $request, string $tenantId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization check
        // Note: Using 'products.view' permission as this is a read-only reference endpoint
        if (!$request->user()->can('products.view')) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to view adjustment reasons.',
            ], 403);
        }

        // Verify user belongs to the tenant
        if ($request->user()->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Unauthorized. You do not have access to this tenant.',
            ], 403);
        }

        // Predefined reasons aligned with ProductStockHistory table
        $reasons = [
            // Positive adjustments (additions)
            [
                'key' => 'restock',
                'label' => 'Restock / Purchase',
                'type' => 'addition',
                'description' => 'Adding new stock from supplier or reorder',
            ],
            [
                'key' => 'return',
                'label' => 'Customer Return',
                'type' => 'addition',
                'description' => 'Product returned by customer',
            ],
            [
                'key' => 'found',
                'label' => 'Stock Found',
                'type' => 'addition',
                'description' => 'Previously unaccounted stock discovered',
            ],
            [
                'key' => 'correction_add',
                'label' => 'Correction (Add)',
                'type' => 'addition',
                'description' => 'Manual correction to add missing stock',
            ],
            
            // Negative adjustments (deductions)
            [
                'key' => 'damage',
                'label' => 'Damage / Defect',
                'type' => 'deduction',
                'description' => 'Product damaged or defective',
            ],
            [
                'key' => 'loss',
                'label' => 'Loss / Theft',
                'type' => 'deduction',
                'description' => 'Stock lost or stolen',
            ],
            [
                'key' => 'expired',
                'label' => 'Expired / Obsolete',
                'type' => 'deduction',
                'description' => 'Product expired or no longer usable',
            ],
            [
                'key' => 'disposal',
                'label' => 'Disposal',
                'type' => 'deduction',
                'description' => 'Product disposed or discarded',
            ],
            [
                'key' => 'correction_remove',
                'label' => 'Correction (Remove)',
                'type' => 'deduction',
                'description' => 'Manual correction to remove excess stock',
            ],
            
            // Neutral adjustments
            [
                'key' => 'audit',
                'label' => 'Physical Audit',
                'type' => 'audit',
                'description' => 'Adjustment from physical stock count',
            ],
            [
                'key' => 'transfer',
                'label' => 'Transfer',
                'type' => 'transfer',
                'description' => 'Stock transferred to another location',
            ],
            [
                'key' => 'other',
                'label' => 'Other',
                'type' => 'other',
                'description' => 'Other reason (specify in notes)',
            ],
        ];

        return response()->json([
            'data' => $reasons,
            'meta' => [
                'total' => count($reasons),
                'types' => ['addition', 'deduction', 'audit', 'transfer', 'other'],
            ],
        ]);
    }
}