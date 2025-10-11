<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Http\Resources\CustomerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Src\Pms\Core\Application\Services\CustomerService;
use Src\Pms\Infrastructure\Models\Customer;

class CustomerController extends Controller
{
    public function __construct(
        private CustomerService $customerService
    ) {}

    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [Customer::class, $tenantId]);

        $perPage = max(1, min(100, (int) $request->query('per_page', 10)));
        $page = max(1, (int) $request->query('page', 1));

        if ($search = $request->query('q')) {
            $paginator = $this->customerService->searchCustomersByNamePaginated($search, $tenantId, $perPage);
        } else {
            $paginator = $this->customerService->getCustomersByTenantPaginated($tenantId, $perPage);
        }

        return response()->json([
            'data' => CustomerResource::collection($paginator->items()),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    // Optional POST-based search to avoid exposing query params in URL (client uses AJAX)
    public function search(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [Customer::class, $tenantId]);

        $search = (string) $request->input('q', '');
        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));
        $page = max(1, (int) $request->input('page', 1));

        if ($search !== '') {
            $paginator = $this->customerService->searchCustomersByNamePaginated($search, $tenantId, $perPage);
        } else {
            $paginator = $this->customerService->getCustomersByTenantPaginated($tenantId, $perPage);
        }

        return response()->json([
            'data' => CustomerResource::collection($paginator->items()),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function store(CustomerRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [Customer::class, $tenantId]);

        try {
            $customer = $this->customerService->createCustomer(
                tenantId: $tenantId,
                name: (string) $request->input('name', ''),
                email: $request->input('email'),
                phone: $request->input('phone'),
                address: $request->input('address'),
                tags: $request->has('tags') ? (array) $request->input('tags') : []
            );

            return response()->json(new CustomerResource($customer), 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(Request $request, string $tenantId, string $id): JsonResponse
    {
        $customer = $this->customerService->getCustomer($id);

        if (!$customer || $customer->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $this->authorize('view', [Customer::class, $tenantId]);

        return response()->json(new CustomerResource($customer));
    }

    public function update(CustomerRequest $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('update', [Customer::class, $tenantId]);

        try {
            // Prepare data array with new location fields
            $data = [
                'name' => (string) $request->input('name', ''),
                'email' => $request->input('email'),
                'phone' => $request->input('phone'),
                'address' => $request->input('address'),
                'tags' => $request->has('tags') ? (array) $request->input('tags') : [],
            ];

            // Add location fields if provided
            if ($request->has('delivery_latitude')) {
                $request->validate([
                    'delivery_latitude' => ['nullable', 'numeric', 'min:-90', 'max:90'],
                ]);
                $data['delivery_latitude'] = $request->input('delivery_latitude');
            }
            if ($request->has('delivery_longitude')) {
                $request->validate([
                    'delivery_longitude' => ['nullable', 'numeric', 'min:-180', 'max:180'],
                ]);
                $data['delivery_longitude'] = $request->input('delivery_longitude');
            }
            if ($request->has('delivery_address')) {
                $request->validate([
                    'delivery_address' => ['nullable', 'string', 'max:500'],
                ]);
                $data['delivery_address'] = $request->input('delivery_address');
            }

            // Get customer model directly to update with new fields
            $customerModel = Customer::findOrFail($id);
            if ($customerModel->tenant_id !== $tenantId) {
                return response()->json(['message' => 'Customer not found'], 404);
            }

            // Update using model (includes new fields)
            $customerModel->update($data);

            return response()->json(new CustomerResource(
                $this->customerService->getCustomer($id)
            ));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('delete', [Customer::class, $tenantId]);

        try {
            $this->customerService->deleteCustomer($id);

            return response()->json(null, 204);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Upload photo for customer
     * 
     * POST /api/v1/tenants/{tenantId}/customers/{customerId}/upload-photo
     * Permission: customers.update (tenant-scoped)
     */
    public function uploadPhoto(Request $request, string $tenantId, string $customerId): JsonResponse
    {
        $customer = Customer::findOrFail($customerId);
        
        if ($customer->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        // Check permission to update customer
        $this->authorize('updateCustomer', $customer);

        $validated = $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // Max 5MB
        ]);

        try {
            $image = $request->file('photo');
            $filename = \Illuminate\Support\Str::uuid() . '.' . $image->getClientOriginalExtension();

            // Save original image
            $path = "customers/{$customerId}/{$filename}";
            Storage::disk('public')->put($path, file_get_contents($image));
            $imageUrl = Storage::disk('public')->url($path);

            // Create thumbnail (300x300)
            $thumbnailFilename = \Illuminate\Support\Str::uuid() . '_thumb.' . $image->getClientOriginalExtension();
            $thumbnailPath = "customers/{$customerId}/{$thumbnailFilename}";
            
            $thumbnail = \Intervention\Image\Facades\Image::make($image)->fit(300, 300, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            })->encode();
            
            Storage::disk('public')->put($thumbnailPath, (string) $thumbnail);
            $thumbnailUrl = Storage::disk('public')->url($thumbnailPath);

            // Delete old images if exist
            if ($customer->photo_url) {
                $oldPath = str_replace('/storage/', '', parse_url($customer->photo_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldPath);
            }
            if ($customer->photo_thumb_url) {
                $oldThumbPath = str_replace('/storage/', '', parse_url($customer->photo_thumb_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldThumbPath);
            }

            // Update customer
            $customer->update([
                'photo_url' => $imageUrl,
                'photo_thumb_url' => $thumbnailUrl,
            ]);

            return response()->json([
                'message' => 'Customer photo uploaded successfully.',
                'photo_url' => $imageUrl,
                'photo_thumb_url' => $thumbnailUrl,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload customer photo.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete customer photo
     * 
     * DELETE /api/v1/tenants/{tenantId}/customers/{customerId}/photo
     * Permission: customers.update (tenant-scoped)
     */
    public function deletePhoto(string $tenantId, string $customerId): JsonResponse
    {
        $customer = Customer::findOrFail($customerId);
        
        if ($customer->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        // Check permission to update customer
        $this->authorize('updateCustomer', $customer);

        try {
            // Delete images from storage
            if ($customer->photo_url) {
                $oldPath = str_replace('/storage/', '', parse_url($customer->photo_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldPath);
            }
            if ($customer->photo_thumb_url) {
                $oldThumbPath = str_replace('/storage/', '', parse_url($customer->photo_thumb_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldThumbPath);
            }

            // Update customer
            $customer->update([
                'photo_url' => null,
                'photo_thumb_url' => null,
            ]);

            return response()->json([
                'message' => 'Customer photo deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete customer photo.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}