<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Http\Resources\CustomerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Customer;

class CustomerController extends Controller
{
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [Customer::class, $tenantId]);

        $query = Customer::query()->where('tenant_id', $tenantId);

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 10)));
        $page = max(1, (int) $request->query('page', 1));

        $paginator = $query->orderBy('name')->paginate($perPage, ['*'], 'page', $page);

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

        $query = Customer::query()->where('tenant_id', $tenantId);

        $search = (string) $request->input('q', '');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));
        $page = max(1, (int) $request->input('page', 1));

        $paginator = $query->orderBy('name')->paginate($perPage, ['*'], 'page', $page);

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

        $customer = new Customer();
        $customer->id = (string) Str::uuid();
        $customer->tenant_id = $tenantId;
        $customer->name = (string) $request->input('name', '');
        $customer->email = $request->input('email');
        $customer->phone = $request->input('phone');
        $customer->address = $request->input('address');
        // Accept tags array when present (Phase 0 schema)
        if ($request->has('tags')) {
            $customer->tags = (array) $request->input('tags');
        }
        $customer->save();

        return response()->json(new CustomerResource($customer), 201);
    }

    public function show(Request $request, string $tenantId, string $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer || (string) $customer->tenant_id !== (string) $tenantId) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $this->authorize('view', [Customer::class, $tenantId]);

        return response()->json(new CustomerResource($customer));
    }

    public function update(CustomerRequest $request, string $tenantId, string $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer || (string) $customer->tenant_id !== (string) $tenantId) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $this->authorize('update', [Customer::class, $tenantId]);

        $customer->fill($request->only(['name', 'email', 'phone', 'address']));
        if ($request->has('tags')) {
            $customer->tags = (array) $request->input('tags');
        }
        $customer->save();

        return response()->json(new CustomerResource($customer));
    }

    public function destroy(Request $request, string $tenantId, string $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer || (string) $customer->tenant_id !== (string) $tenantId) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $this->authorize('delete', [Customer::class, $tenantId]);

        $customer->delete();

        return response()->json(null, 204);
    }
}