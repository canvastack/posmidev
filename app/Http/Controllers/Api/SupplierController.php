<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Src\Pms\Infrastructure\Models\Supplier;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;

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
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'location_address' => 'nullable|string|max:500',
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
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'location_address' => 'nullable|string|max:500',
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

    /**
     * Upload image for supplier
     * 
     * POST /api/v1/tenants/{tenantId}/suppliers/{supplierId}/upload-image
     * Permission: suppliers.manage (or products.update)
     */
    public function uploadImage(Request $request, string $tenantId, string $supplierId): JsonResponse
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
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // Max 5MB
        ]);

        try {
            $image = $request->file('image');
            $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();

            // Save original image
            $path = "suppliers/{$tenantId}/{$filename}";
            Storage::disk('public')->put($path, file_get_contents($image));
            $imageUrl = Storage::disk('public')->url($path);

            // Create thumbnail (300x300)
            $thumbnailFilename = Str::uuid() . '_thumb.' . $image->getClientOriginalExtension();
            $thumbnailPath = "suppliers/{$tenantId}/{$thumbnailFilename}";
            
            $thumbnail = Image::make($image)->fit(300, 300, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            })->encode();
            
            Storage::disk('public')->put($thumbnailPath, (string) $thumbnail);
            $thumbnailUrl = Storage::disk('public')->url($thumbnailPath);

            // Delete old images if exist
            if ($supplier->image_url) {
                $oldPath = str_replace('/storage/', '', parse_url($supplier->image_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldPath);
            }
            if ($supplier->image_thumb_url) {
                $oldThumbPath = str_replace('/storage/', '', parse_url($supplier->image_thumb_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldThumbPath);
            }

            // Update supplier
            $supplier->update([
                'image_url' => $imageUrl,
                'image_thumb_url' => $thumbnailUrl,
            ]);

            return response()->json([
                'message' => 'Image uploaded successfully.',
                'image_url' => $imageUrl,
                'image_thumb_url' => $thumbnailUrl,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload image.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete supplier image
     * 
     * DELETE /api/v1/tenants/{tenantId}/suppliers/{supplierId}/image
     * Permission: suppliers.manage (or products.update)
     */
    public function deleteImage(string $tenantId, string $supplierId): JsonResponse
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

        try {
            // Delete images from storage
            if ($supplier->image_url) {
                $oldPath = str_replace('/storage/', '', parse_url($supplier->image_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldPath);
            }
            if ($supplier->image_thumb_url) {
                $oldThumbPath = str_replace('/storage/', '', parse_url($supplier->image_thumb_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldThumbPath);
            }

            // Update supplier
            $supplier->update([
                'image_url' => null,
                'image_thumb_url' => null,
            ]);

            return response()->json([
                'message' => 'Image deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete image.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}