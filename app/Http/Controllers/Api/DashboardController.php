<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Src\Pms\Core\Application\Services\DashboardService;

class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}

    public function index(Request $request, string $tenantId): JsonResponse
    {
        // Lightweight instrumentation to help diagnose connection resets
        Log::info('Dashboard#index start', [
            'tenantId' => $tenantId,
            'userId' => optional($request->user())->id,
        ]);

        try {
            $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

            $dashboardData = $this->dashboardService->getDashboardData($tenantId);

            Log::info('Dashboard#index success', [
                'tenantId' => $tenantId,
            ]);

            return response()->json($dashboardData);
        } catch (AuthorizationException $e) {
            Log::warning('Dashboard#index unauthorized', [
                'tenantId' => $tenantId,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Forbidden',
                'error' => $e->getMessage(),
            ], 403);
        } catch (\Throwable $e) {
            // Ensure errors surface both in logs and as JSON so FE won't see a reset
            Log::error('Dashboard#index error', [
                'tenantId' => $tenantId,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to load dashboard',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}