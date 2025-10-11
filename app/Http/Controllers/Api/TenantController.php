<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TenantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Intervention\Image\Facades\Image;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class TenantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = (int) $request->query('per_page', 20);

        // Visibility rules:
        // - Users from HQ tenant (except those with role "Super Admin" if restricted later via role management)
        //   can view all tenants when they have tenants.view
        // - Non-HQ users must only see their own tenant, regardless of permission
        $hqTenantId = (string) config('tenancy.hq_tenant_id');
        $query = Tenant::query()->withCount('customers');

        // Final visibility rule:
        // - Super Admin (within HQ tenant) always can view all tenants
        // - Users with 'tenants.view' can view all tenants
        // - Everyone else sees only their own tenant
        // Use explicit join to avoid ambiguous tenant_id between roles and model_has_roles
        $isHqSuperAdmin = \Spatie\Permission\Models\Role::query()
            ->join('model_has_roles as mhr', 'roles.id', '=', 'mhr.role_id')
            ->where('mhr.model_uuid', $user->getKey())
            ->where('mhr.model_type', $user->getMorphClass())
            ->where('mhr.tenant_id', $hqTenantId)
            ->where('roles.tenant_id', $hqTenantId)
            ->where('roles.guard_name', 'api')
            ->where('roles.name', 'Super Admin')
            ->exists();

        $canViewAll = $isHqSuperAdmin || $user->can('tenants.view');

        if (!$canViewAll) {
            $query->where('id', (string) $user->tenant_id);
        }

        $tenants = $query->latest()->paginate($perPage);
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
            'latitude' => ['nullable','numeric','between:-90,90'],
            'longitude' => ['nullable','numeric','between:-180,180'],
            'location_address' => ['nullable','string','max:500'],
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

        // Super Admin/Admin via explicit role checks; Manager Tenant allowed if same tenant and permitted
        $hqTenantId = (string) config('tenancy.hq_tenant_id');

        // Explicit check for HQ Super Admin (cross-tenant)
        $isHqSuperAdmin = \Spatie\Permission\Models\Role::query()
            ->join('model_has_roles as mhr', 'roles.id', '=', 'mhr.role_id')
            ->where('mhr.model_uuid', $acting->getKey())
            ->where('mhr.model_type', $acting->getMorphClass())
            ->where('mhr.tenant_id', $hqTenantId)
            ->where('roles.tenant_id', $hqTenantId)
            ->where('roles.guard_name', 'api')
            ->where('roles.name', 'Super Admin')
            ->exists();

        // Explicit check for Admin within the same target tenant
        $isTenantAdmin = false;
        if ((string) $acting->tenant_id === (string) $tenantId) {
            $isTenantAdmin = \Spatie\Permission\Models\Role::query()
                ->join('model_has_roles as mhr', 'roles.id', '=', 'mhr.role_id')
                ->where('mhr.model_uuid', $acting->getKey())
                ->where('mhr.model_type', $acting->getMorphClass())
                ->where('mhr.tenant_id', (string) $tenantId)
                ->where('roles.tenant_id', (string) $tenantId)
                ->where('roles.guard_name', 'api')
                ->where('roles.name', 'admin')
                ->exists();
        }

        if (!($isHqSuperAdmin || $isTenantAdmin || ($acting->tenant_id === $tenantId && $acting->can('users.update')))) {
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
        if ($data['status'] === 'active' && !$tenant->can_auto_activate_users && !($isHqSuperAdmin || $isTenantAdmin)) {
            return response()->json(['message' => 'Activation requires Super Admin/Admin approval'], 403);
        }

        $user->status = $data['status'];
        $user->save();

        return response()->json(['message' => 'Status updated']);
    }

    /**
     * Upload logo for tenant
     * 
     * POST /api/v1/tenants/{tenantId}/upload-logo
     * Permission: tenants.update (or HQ Super Admin)
     */
    public function uploadLogo(Request $request, string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $this->authorize('updateTenant', $tenant);

        $validated = $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // Max 5MB
        ]);

        try {
            $image = $request->file('logo');
            $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();

            // Save original image
            $path = "tenants/{$tenantId}/{$filename}";
            Storage::disk('public')->put($path, file_get_contents($image));
            $imageUrl = Storage::disk('public')->url($path);

            // Create thumbnail (300x300)
            $thumbnailFilename = Str::uuid() . '_thumb.' . $image->getClientOriginalExtension();
            $thumbnailPath = "tenants/{$tenantId}/{$thumbnailFilename}";
            
            $thumbnail = Image::make($image)->fit(300, 300, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            })->encode();
            
            Storage::disk('public')->put($thumbnailPath, (string) $thumbnail);
            $thumbnailUrl = Storage::disk('public')->url($thumbnailPath);

            // Delete old images if exist
            if ($tenant->logo_url) {
                $oldPath = str_replace('/storage/', '', parse_url($tenant->logo_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldPath);
            }
            if ($tenant->logo_thumb_url) {
                $oldThumbPath = str_replace('/storage/', '', parse_url($tenant->logo_thumb_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldThumbPath);
            }

            // Update tenant
            $tenant->update([
                'logo_url' => $imageUrl,
                'logo_thumb_url' => $thumbnailUrl,
            ]);

            return response()->json([
                'message' => 'Logo uploaded successfully.',
                'logo_url' => $imageUrl,
                'logo_thumb_url' => $thumbnailUrl,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload logo.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete tenant logo
     * 
     * DELETE /api/v1/tenants/{tenantId}/logo
     * Permission: tenants.update (or HQ Super Admin)
     */
    public function deleteLogo(string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $this->authorize('updateTenant', $tenant);

        try {
            // Delete images from storage
            if ($tenant->logo_url) {
                $oldPath = str_replace('/storage/', '', parse_url($tenant->logo_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldPath);
            }
            if ($tenant->logo_thumb_url) {
                $oldThumbPath = str_replace('/storage/', '', parse_url($tenant->logo_thumb_url, PHP_URL_PATH));
                Storage::disk('public')->delete($oldThumbPath);
            }

            // Update tenant
            $tenant->update([
                'logo_url' => null,
                'logo_thumb_url' => null,
            ]);

            return response()->json([
                'message' => 'Logo deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete logo.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}