<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Infrastructure\Models\Tenant;

class SettingsController extends Controller
{
    public function show(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Tenant::class, $tenantId]);

        // For Phase 0: store minimal settings in tenants table meta column (json) or return defaults
        $tenant = Tenant::query()->find($tenantId);
        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        $settings = [
            'payments' => [
                'default_method' => data_get($tenant, 'settings.payments.default_method', 'cash'),
            ],
        ];

        return response()->json($settings);
    }

    public function update(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('update', [Tenant::class, $tenantId]);

        $validated = $request->validate([
            'payments' => ['nullable', 'array'],
            'payments.default_method' => ['nullable', 'in:ewallet,card,cash'],
        ]);

        $tenant = Tenant::query()->find($tenantId);
        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        // Merge new settings into a json "settings" column (we'll add migration next if missing)
        $merged = array_replace_recursive((array) ($tenant->settings ?? []), $validated);
        $tenant->settings = $merged;
        $tenant->save();

        return response()->json($merged);
    }
}