<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TenantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class TenantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', [Tenant::class]);
        $tenants = Tenant::query()->latest()->paginate($request->query('per_page', 20));
        return response()->json($tenants->through(fn($t) => new TenantResource($t)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', [Tenant::class]);

        $data = $request->validate([
            'name' => ['required','string','max:255'],
            'address' => ['nullable','string'],
            'phone' => ['nullable','string','max:50'],
            'logo' => ['nullable','string'],
            'status' => ['nullable', Rule::in(['active','inactive','pending','banned'])],
        ]);

        $tenant = Tenant::create(array_merge($data, [
            'id' => (string) \Ramsey\Uuid\Uuid::uuid4(),
            'status' => $data['status'] ?? 'pending',
        ]));

        return response()->json(new TenantResource($tenant), 201);
    }

    public function show(string $tenantId): JsonResponse
    {
        $this->authorize('view', [Tenant::class]);
        $tenant = Tenant::findOrFail($tenantId);
        return response()->json(new TenantResource($tenant));
    }

    public function update(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('update', [Tenant::class]);
        $tenant = Tenant::findOrFail($tenantId);

        $data = $request->validate([
            'name' => ['sometimes','string','max:255'],
            'address' => ['nullable','string'],
            'phone' => ['nullable','string','max:50'],
            'logo' => ['nullable','string'],
            'status' => ['nullable', Rule::in(['active','inactive','pending','banned'])],
            'can_auto_activate_users' => ['nullable','boolean'],
        ]);

        $tenant->fill($data);
        $tenant->save();

        return response()->json(new TenantResource($tenant));
    }

    public function destroy(string $tenantId): JsonResponse
    {
        $this->authorize('delete', [Tenant::class]);
        $tenant = Tenant::findOrFail($tenantId);
        $tenant->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function setStatus(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('setStatus', [Tenant::class]);
        $tenant = Tenant::findOrFail($tenantId);
        $data = $request->validate([
            'status' => ['required', Rule::in(['active','inactive','pending','banned'])],
        ]);
        $tenant->status = $data['status'];
        $tenant->save();
        return response()->json(new TenantResource($tenant));
    }

    public function requestAutoActivation(string $tenantId): JsonResponse
    {
        // Manager Tenant can request
        $tenant = Tenant::findOrFail($tenantId);
        $user = request()->user();
        if ($user->tenant_id !== $tenantId || !$user->can('users.update')) {
            abort(403);
        }
        $tenant->auto_activate_request_pending = true;
        $tenant->auto_activate_requested_at = now();
        $tenant->save();
        return response()->json(['message' => 'Request submitted']);
    }

    public function approveAutoActivation(string $tenantId): JsonResponse
    {
        $this->authorize('manageAutoActivation', [Tenant::class]);
        $tenant = Tenant::findOrFail($tenantId);
        $tenant->can_auto_activate_users = true;
        $tenant->auto_activate_request_pending = false;
        $tenant->auto_activate_requested_at = null;
        $tenant->save();
        return response()->json(new TenantResource($tenant));
    }

    public function rejectAutoActivation(string $tenantId): JsonResponse
    {
        $this->authorize('manageAutoActivation', [Tenant::class]);
        $tenant = Tenant::findOrFail($tenantId);
        $tenant->can_auto_activate_users = false;
        $tenant->auto_activate_request_pending = false;
        $tenant->auto_activate_requested_at = null;
        $tenant->save();
        return response()->json(new TenantResource($tenant));
    }

    // Tenant-level user management
    public function setUserStatus(Request $request, string $tenantId, string $userId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $acting = $request->user();

        // Super Admin/Admin via policy; Manager Tenant allowed if same tenant and permitted
        if (!($acting->hasAnyRole(['Super Admin','admin']) || ($acting->tenant_id === $tenantId && $acting->can('users.update')))) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['active','inactive','pending','banned'])],
        ]);

        $user = User::findOrFail($userId);
        if ($user->tenant_id !== $tenantId) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Auto-activation rule: if tenant cannot auto-activate and trying to set active, require admin-level
        if ($data['status'] === 'active' && !$tenant->can_auto_activate_users && !$acting->hasAnyRole(['Super Admin','admin'])) {
            return response()->json(['message' => 'Activation requires Super Admin/Admin approval'], 403);
        }

        $user->status = $data['status'];
        $user->save();

        return response()->json(['message' => 'Status updated']);
    }
}