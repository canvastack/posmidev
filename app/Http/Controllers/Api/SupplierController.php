<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Src\Pms\Infrastructure\Models\Supplier;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class SupplierController extends Controller
{
    /**
     * Display a listing of suppliers
     * 
     * GET /api/v1/tenants/{tenantId}/suppliers
     * Permission: suppliers.view (or products.view)
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!Gate::allows('viewAny', [Supplier::class, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to view suppliers.',
            ], 403);
        }

        $query = Supplier::where('tenant_id', $tenantId);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('contact_person', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $suppliers = $query->withCount('products')->paginate($perPage);

        return response()->json($suppliers);
    }

    /**
     * Store a newly created supplier
     * 
     * POST /api/v1/tenants/{tenantId}/suppliers
     * Permission: suppliers.manage (or products.update)
     */
    public function store(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!Gate::allows('create', [Supplier::class, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to create suppliers.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        // Check for duplicate name within tenant
        $exists = Supplier::where('tenant_id', $tenantId)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A supplier with this name already exists.',
                'errors' => [
                    'name' => ['Supplier name must be unique within your organization.'],
                ],
            ], 422);
        }

        $supplier = Supplier::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            ...$validated,
        ]);

        $supplier->load('products');

        return response()->json($supplier, 201);
    }

    /**
     * Display the specified supplier
     * 
     * GET /api/v1/tenants/{tenantId}/suppliers/{supplierId}
     * Permission: suppliers.view (or products.view)
     */
    public function show(string $tenantId, string $supplierId): JsonResponse
    {
        $supplier = Supplier::where('tenant_id', $tenantId)
            ->where('id', $supplierId)
            ->firstOrFail();

        // Check permission
        if (!Gate::allows('view', [$supplier, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to view this supplier.',
            ], 403);
        }

        $supplier->load('products');

        return response()->json($supplier);
    }

    /**
     * Update the specified supplier
     * 
     * PATCH /api/v1/tenants/{tenantId}/suppliers/{supplierId}
     * Permission: suppliers.manage (or products.update)
     */
    public function update(Request $request, string $tenantId, string $supplierId): JsonResponse
    {
        $supplier = Supplier::where('tenant_id', $tenantId)
            ->where('id', $supplierId)
            ->firstOrFail();

        // Check permission
        if (!Gate::allows('update', [$supplier, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to update this supplier.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        // Check for duplicate name (excluding current supplier)
        if (isset($validated['name'])) {
            $exists = Supplier::where('tenant_id', $tenantId)
                ->where('name', $validated['name'])
                ->where('id', '!=', $supplierId)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'A supplier with this name already exists.',
                    'errors' => [
                        'name' => ['Supplier name must be unique within your organization.'],
                    ],
                ], 422);
            }
        }

        $supplier->update($validated);
        $supplier->load('products');

        return response()->json($supplier);
    }

    /**
     * Remove the specified supplier
     * 
     * DELETE /api/v1/tenants/{tenantId}/suppliers/{supplierId}
     * Permission: suppliers.manage (or products.delete)
     */
    public function destroy(string $tenantId, string $supplierId): JsonResponse
    {
        $supplier = Supplier::where('tenant_id', $tenantId)
            ->where('id', $supplierId)
            ->firstOrFail();

        // Check permission
        if (!Gate::allows('delete', [$supplier, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to delete this supplier.',
            ], 403);
        }

        // Check if supplier has products
        $productsCount = $supplier->products()->count();
        if ($productsCount > 0) {
            return response()->json([
                'message' => "Cannot delete supplier. It is associated with {$productsCount} product(s).",
                'products_count' => $productsCount,
            ], 422);
        }

        $supplier->delete();

        return response()->json([
            'message' => 'Supplier deleted successfully.',
        ]);
    }

    /**
     * Get products for a specific supplier
     * 
     * GET /api/v1/tenants/{tenantId}/suppliers/{supplierId}/products
     * Permission: suppliers.view + products.view
     */
    public function products(Request $request, string $tenantId, string $supplierId): JsonResponse
    {
        $supplier = Supplier::where('tenant_id', $tenantId)
            ->where('id', $supplierId)
            ->firstOrFail();

        // Check permission
        if (!Gate::allows('view', [$supplier, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $query = $supplier->products();

        // Pagination
        $perPage = $request->get('per_page', 15);
        $products = $query->with('category')->paginate($perPage);

        return response()->json($products);
    }
}