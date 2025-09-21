<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [Permission::class, $tenantId]);

        $permissions = Permission::all();
        
        return response()->json(
            PermissionResource::collection($permissions)
        );
    }
}