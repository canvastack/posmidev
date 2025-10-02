<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Src\Pms\Infrastructure\Models\Tenant;

class ContentManagementController extends Controller
{
    /**
     * GET /api/v1/tenants/{tenantId}/content/footer
     * Get footer content for editing (auth required)
     */
    public function getFooter(Request $request, string $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        // Check if user can manage content for this tenant
        $this->authorize('update', $tenant);
        
        $settings = $tenant->settings ?? [];
        $footer = $settings['footer'] ?? null;
        
        return response()->json([
            'tenantId' => (string) $tenant->id,
            'footer' => $footer,
            'hasCustomFooter' => !is_null($footer),
        ]);
    }
    
    /**
     * PUT /api/v1/tenants/{tenantId}/content/footer
     * Update footer content (auth required)
     */
    public function updateFooter(Request $request, string $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        // Check if user can manage content for this tenant
        $this->authorize('update', $tenant);
        
        $validated = $request->validate([
            'branding' => 'required|array',
            'branding.logo' => 'required|string|max:100',
            'branding.tagline' => 'required|string|max:255',
            'sections' => 'required|array',
            'sections.*.title' => 'required|string|max:100',
            'sections.*.links' => 'required|array',
            'sections.*.links.*.label' => 'required|string|max:100',
            'sections.*.links.*.url' => 'required|string|max:255',
            'copyright' => 'required|string|max:255',
        ]);
        
        $settings = $tenant->settings ?? [];
        $settings['footer'] = $validated;
        $tenant->settings = $settings;
        $tenant->save();
        
        return response()->json([
            'message' => 'Footer content updated successfully',
            'tenantId' => (string) $tenant->id,
            'footer' => $validated,
        ]);
    }
    
    /**
     * DELETE /api/v1/tenants/{tenantId}/content/footer
     * Reset footer to default (remove custom footer)
     */
    public function deleteFooter(Request $request, string $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        // Check if user can manage content for this tenant
        $this->authorize('update', $tenant);
        
        $settings = $tenant->settings ?? [];
        unset($settings['footer']);
        $tenant->settings = $settings;
        $tenant->save();
        
        return response()->json([
            'message' => 'Footer reset to default',
            'tenantId' => (string) $tenant->id,
        ]);
    }
}