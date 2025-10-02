<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ContentPageRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Infrastructure\Models\ContentPage;

class ContentPagesController extends Controller
{
    /**
     * GET /api/v1/tenants/{tenantId}/content/pages
     * List all content pages for a tenant (admin view - includes drafts)
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [ContentPage::class, $tenantId]);

        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');

        $query = ContentPage::where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('slug', 'ilike', "%{$search}%");
            });
        }

        $pages = $query->paginate($perPage);

        return response()->json([
            'data' => $pages->items(),
            'current_page' => $pages->currentPage(),
            'last_page' => $pages->lastPage(),
            'per_page' => $pages->perPage(),
            'total' => $pages->total(),
        ]);
    }

    /**
     * POST /api/v1/tenants/{tenantId}/content/pages
     * Create a new content page
     */
    public function store(ContentPageRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [ContentPage::class, $tenantId]);

        $data = $request->validated();
        $data['tenant_id'] = $tenantId;

        // Auto-set published_at if status is published and not provided
        if ($data['status'] === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $page = ContentPage::create($data);

        return response()->json([
            'message' => 'Content page created successfully',
            'data' => $page,
        ], 201);
    }

    /**
     * GET /api/v1/tenants/{tenantId}/content/pages/{contentPage}
     * Get a single content page (admin view)
     */
    public function show(Request $request, string $tenantId, string $contentPageId): JsonResponse
    {
        $this->authorize('view', [ContentPage::class, $tenantId]);

        $page = ContentPage::where('tenant_id', $tenantId)
            ->where('id', $contentPageId)
            ->firstOrFail();

        return response()->json([
            'data' => $page,
        ]);
    }

    /**
     * PUT /api/v1/tenants/{tenantId}/content/pages/{contentPage}
     * Update a content page
     */
    public function update(ContentPageRequest $request, string $tenantId, string $contentPageId): JsonResponse
    {
        $this->authorize('update', [ContentPage::class, $tenantId]);

        $page = ContentPage::where('tenant_id', $tenantId)
            ->where('id', $contentPageId)
            ->firstOrFail();

        $data = $request->validated();

        // Auto-set published_at if status changed to published
        if ($data['status'] === 'published' && $page->status !== 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $page->update($data);

        return response()->json([
            'message' => 'Content page updated successfully',
            'data' => $page->fresh(),
        ]);
    }

    /**
     * DELETE /api/v1/tenants/{tenantId}/content/pages/{contentPage}
     * Delete a content page
     */
    public function destroy(Request $request, string $tenantId, string $contentPageId): JsonResponse
    {
        $this->authorize('delete', [ContentPage::class, $tenantId]);

        $page = ContentPage::where('tenant_id', $tenantId)
            ->where('id', $contentPageId)
            ->firstOrFail();

        $page->delete();

        return response()->json([
            'message' => 'Content page deleted successfully',
        ]);
    }
}