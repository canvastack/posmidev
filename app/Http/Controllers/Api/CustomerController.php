<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Http\Resources\CustomerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            $customer = $this->customerService->updateCustomer(
                customerId: $id,
                name: (string) $request->input('name', ''),
                email: $request->input('email'),
                phone: $request->input('phone'),
                address: $request->input('address'),
                tags: $request->has('tags') ? (array) $request->input('tags') : []
            );

            return response()->json(new CustomerResource($customer));
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
}