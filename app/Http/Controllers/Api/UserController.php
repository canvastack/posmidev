<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Src\Pms\Infrastructure\Models\User;

class UserController extends Controller
{
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [User::class, $tenantId]);

        $users = User::query()
            ->where('tenant_id', $tenantId)
            ->get();

        return response()->json(UserResource::collection($users));
    }

    public function show(Request $request, string $tenantId, string $userId): JsonResponse
    {
        $user = User::findOrFail($userId);
        $this->authorize('view', [User::class, $tenantId]);

        if ($user->tenant_id !== $tenantId) {
            return response()->json(['message' => 'User not found'], 404);
        }

        return response()->json(new UserResource($user));
    }

    public function update(Request $request, string $tenantId, string $userId): JsonResponse
    {
        $this->authorize('update', [User::class, $tenantId]);
        $user = User::findOrFail($userId);
        if ($user->tenant_id !== $tenantId) {
            return response()->json(['message' => 'User not found'], 404);
        }
        $data = $request->validate([
            'name' => ['sometimes','string','max:255'],
            'display_name' => ['nullable','string','max:255'],
            'email' => ['sometimes','email','max:255'],
            'status' => ['nullable', Rule::in(['active','inactive','pending','banned'])],
        ]);
        $user->fill($data);
        $user->save();
        return response()->json(new UserResource($user));
    }

    public function destroy(Request $request, string $tenantId, string $userId): JsonResponse
    {
        $this->authorize('delete', [User::class, $tenantId]);
        $user = User::findOrFail($userId);
        if ($user->tenant_id !== $tenantId) {
            return response()->json(['message' => 'User not found'], 404);
        }
        $user->delete();
        return response()->json(['message' => 'Deleted']);
    }
}