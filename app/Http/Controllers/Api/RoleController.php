<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RoleRequest;
use App\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [Role::class, $tenantId]);

        $roles = Role::with('permissions')->get();
        
        return response()->json(
            RoleResource::collection($roles)
        );
    }

    public function store(RoleRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [Role::class, $tenantId]);

        $role = Role::create([
            'name' => $request->name,
            'guard_name' => 'api'
        ]);

        if ($request->permissions) {
            $permissions = Permission::whereIn('name', $request->permissions)->get();
            $role->syncPermissions($permissions);
        }

        return response()->json(new RoleResource($role->load('permissions')), 201);
    }

    public function show(Request $request, string $tenantId, string $roleId): JsonResponse
    {
        $role = Role::with('permissions')->findOrFail($roleId);
        
        $this->authorize('view', [Role::class, $tenantId]);

        return response()->json(new RoleResource($role));
    }

    public function update(RoleRequest $request, string $tenantId, string $roleId): JsonResponse
    {
        $role = Role::findOrFail($roleId);
        
        $this->authorize('update', [Role::class, $tenantId]);

        $role->update(['name' => $request->name]);

        if ($request->permissions) {
            $permissions = Permission::whereIn('name', $request->permissions)->get();
            $role->syncPermissions($permissions);
        }

        return response()->json(new RoleResource($role->load('permissions')));
    }

    public function destroy(Request $request, string $tenantId, string $roleId): JsonResponse
    {
        $role = Role::findOrFail($roleId);
        
        $this->authorize('delete', [Role::class, $tenantId]);

        $role->delete();

        return response()->json(null, 204);
    }
}