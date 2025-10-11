<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Src\Pms\Infrastructure\Models\Material;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryTransactionController extends Controller
{
    /**
     * List inventory transactions for a material.
     * 
     * GET /tenants/{tenantId}/materials/{material}/transactions
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $materialId
     * @return JsonResponse
     */
    public function index(Request $request, string $tenantId, string $materialId): JsonResponse
    {
        // Authorization: materials.view permission
        $this->authorize('view', Material::class);
        
        // Verify material exists and belongs to tenant
        $material = Material::where('id', $materialId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();
        
        // Build query with filters
        $query = InventoryTransaction::forTenant($tenantId)
            ->forMaterial($materialId)
            ->with(['user:id,name', 'material:id,name,sku'])
            ->recent();
        
        // Optional filters
        if ($request->has('transaction_type')) {
            $query->byType($request->input('transaction_type'));
        }
        
        if ($request->has('reason')) {
            $query->byReason($request->input('reason'));
        }
        
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->inDateRange(
                $request->input('start_date'),
                $request->input('end_date')
            );
        }
        
        if ($request->input('direction') === 'in') {
            $query->increases();
        } elseif ($request->input('direction') === 'out') {
            $query->decreases();
        }
        
        // Pagination
        $perPage = $request->input('per_page', 20);
        $paginator = $query->paginate($perPage);
        
        // Transform data
        $data = $paginator->getCollection()->map(function ($transaction) {
            return $transaction->toDisplayArray();
        });
        
        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'material' => [
                'id' => $material->id,
                'name' => $material->name,
                'sku' => $material->sku,
                'current_stock' => $material->current_stock,
                'unit' => $material->unit,
            ],
        ]);
    }
    
    /**
     * Get a single inventory transaction by ID.
     * 
     * GET /tenants/{tenantId}/inventory-transactions/{transactionId}
     * 
     * @param string $tenantId
     * @param string $transactionId
     * @return JsonResponse
     */
    public function show(string $tenantId, string $transactionId): JsonResponse
    {
        // Authorization: materials.view permission
        $this->authorize('view', Material::class);
        
        // Find transaction with relationships
        $transaction = InventoryTransaction::forTenant($tenantId)
            ->with([
                'user:id,name,email',
                'material:id,name,sku,unit,current_stock',
                'reference',
            ])
            ->findOrFail($transactionId);
        
        // Transform data
        $data = $transaction->toDisplayArray();
        
        // Add additional details
        $data['user'] = $transaction->user ? [
            'id' => $transaction->user->id,
            'name' => $transaction->user->name,
            'email' => $transaction->user->email,
        ] : null;
        
        $data['material'] = [
            'id' => $transaction->material->id,
            'name' => $transaction->material->name,
            'sku' => $transaction->material->sku,
            'unit' => $transaction->material->unit,
            'current_stock' => $transaction->material->current_stock,
        ];
        
        if ($transaction->reference) {
            $data['reference'] = [
                'type' => $transaction->reference_type,
                'id' => $transaction->reference_id,
                'data' => $transaction->reference,
            ];
        }
        
        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}