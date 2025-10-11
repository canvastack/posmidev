<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;

class SetPermissionsTeamFromTenant
{
    public function handle(Request $request, Closure $next)
    {
        // Accept either 'tenantId' (existing routes) or 'tenant' (route-model-binding param)
        $tenantParam = $request->route('tenantId') ?? $request->route('tenant') ?? optional($request->user())->tenant_id;
        $tenantId = $tenantParam;
        if (is_object($tenantParam) && method_exists($tenantParam, 'getKey')) {
            $tenantId = $tenantParam->getKey();
        }

        if ($tenantId) {
            app(PermissionRegistrar::class)->setPermissionsTeamId((string) $tenantId);
            
            // CRITICAL: Refresh user permissions cache after setting team context
            // Without this, $user->can() will use permissions loaded BEFORE team context was set
            if ($user = $request->user()) {
                app(PermissionRegistrar::class)->forgetCachedPermissions();
                $user->load('roles', 'permissions');
            }
        }
        return $next($request);
    }
}