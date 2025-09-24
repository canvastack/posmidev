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

        // Limit to API guard permissions; order for stable UI rendering
        $permissions = Permission::query()
            ->where('guard_name', 'api')
            ->orderBy('name')
            ->get();
        
        return response()->json(
            PermissionResource::collection($permissions)
        );
    }
}