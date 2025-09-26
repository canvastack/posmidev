<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;

class SetPermissionsTeamFromTenant
{
    public function handle(Request $request, Closure $next)
    {
        $tenantId = $request->route('tenantId') ?? optional($request->user())->tenant_id;
        if ($tenantId) {
            app(PermissionRegistrar::class)->setPermissionsTeamId((string) $tenantId);
        }
        return $next($request);
    }
}