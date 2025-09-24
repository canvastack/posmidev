<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Src\Pms\Infrastructure\Models\User;

class UserController extends Controller
{
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [User::class, $tenantId]);

        $query = User::query()->where('tenant_id', $tenantId);

        // Optional search by name or email
        if ($search = $request->query('q')) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $users = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json($users->through(fn($u) => new UserResource($u)));
    }

    public function store(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [User::class, $tenantId]);

        $data = $request->validate([
            'name' => ['required','string','max:255'],
            'email' => [
                'required','email','max:255',
                Rule::unique('users', 'email')->where(fn($q) => $q->where('tenant_id', $tenantId)),
            ],
            'password' => ['required','string','min:6'],
            'display_name' => ['nullable','string','max:255'],
            'status' => ['nullable', Rule::in(['active','inactive','pending','banned'])],
            'photo' => ['nullable','string'], // URL stored after upload
            'phone_number' => ['nullable','string','max:32'],
        ]);

        $user = new User();
        $user->id = (string) \Ramsey\Uuid\Uuid::uuid4();
        $user->tenant_id = $tenantId;
        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->password = $data['password']; // cast 'hashed' handles hashing
        $user->display_name = $data['display_name'] ?? null;
        $user->status = $data['status'] ?? 'pending';
        $user->photo = $data['photo'] ?? null;
        $user->phone_number = $data['phone_number'] ?? null;
        $user->save();

        return response()->json(new UserResource($user), 201);
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
            'email' => [
                'sometimes','email','max:255',
                Rule::unique('users', 'email')
                    ->where(fn($q) => $q->where('tenant_id', $tenantId))
                    ->ignore($userId, 'id'),
            ],
            'status' => ['nullable', Rule::in(['active','inactive','pending','banned'])],
            'photo' => ['nullable','string'],
            'phone_number' => ['nullable','string','max:32'],
            'password' => ['nullable','string','min:6'],
        ]);
        $user->fill(collect($data)->except('password')->toArray());
        if (!empty($data['password'])) {
            $user->password = $data['password']; // hashed cast
        }
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

    public function uploadPhoto(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [User::class, $tenantId]);

        $validated = $request->validate([
            'file' => ['required', File::image()->max(3 * 1024)], // max 3MB
        ]);

        $file = $validated['file'];
        $path = $file->storeAs(
            "public/tenants/{$tenantId}/user-photos",
            uniqid('user_') . '.' . $file->getClientOriginalExtension()
        );

        $url = Storage::url($path); // requires `php artisan storage:link`

        return response()->json([
            'url' => $url,
            'path' => $path,
        ], 201);
    }
}