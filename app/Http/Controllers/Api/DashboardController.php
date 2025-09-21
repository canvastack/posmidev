<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Application\Services\DashboardService;

class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}

    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        $dashboardData = $this->dashboardService->getDashboardData($tenantId);

        return response()->json($dashboardData);
    }
}