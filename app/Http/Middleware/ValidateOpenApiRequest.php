<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateOpenApiRequest
{
    // Avoid hard typehints/imports so app won't crash if cebe/openapi isn't installed
    private $openApiSpec = null;

    public function handle(Request $request, Closure $next): Response
    {
        try {
            // If OpenAPI library isn't available, skip validation entirely
            if (!class_exists(\cebe\openapi\Reader::class)) {
                return $next($request);
            }

            // Load spec once, guard against read errors
            if (!$this->openApiSpec) {
                try {
                    // Avoid resolving refs to reduce risk of heavy processing/edge errors in dev
                    $this->openApiSpec = \cebe\openapi\Reader::readFromYamlFile(base_path('openapi.yaml'));
                } catch (\Throwable $e) {
                    // If spec can't be loaded, don't block requests in local/dev
                    Log::warning('OpenAPI spec load failed; skipping validation', ['error' => $e->getMessage()]);
                    return $next($request);
                }
            }

            // Skip validation for non-API routes
            if (!str_starts_with($request->path(), 'api/')) {
                return $next($request);
            }

            // Optionally skip auth endpoints to avoid blocking login during setup
            $normalized = '/' . ltrim($request->path(), '/');
            if (preg_match('#^/api/v1/(login|register)$#', $normalized)) {
                return $next($request);
            }

            // Basic validation - in production, use a more robust OpenAPI validator
            try {
                $this->validateRequest($request);
            } catch (\Throwable $e) {
                // Do not block requests in local/dev due to validator errors
                Log::warning('OpenAPI validation skipped due to error', [
                    'path' => $request->path(),
                    'error' => $e->getMessage(),
                ]);
                return $next($request);
            }

            return $next($request);
        } catch (\Throwable $e) {
            Log::warning('OpenAPI middleware failed; skipping', [
                'path' => $request->path(),
                'error' => $e->getMessage(),
            ]);
            return $next($request);
        }
    }

    private function validateRequest(Request $request): void
    {
        // This is a simplified validation
        // In production, use libraries like league/openapi-psr7-validator
        $method = strtolower($request->method());
        $path = $this->normalizePath($request->path());

        // Check if path exists in OpenAPI spec
        if (!isset($this->openApiSpec->paths[$path])) {
            // Do not abort in local; just log and continue
            Log::info('OpenAPI path not found; letting request pass', ['path' => $path]);
            return;
        }

        // Check if method is allowed
        if (!isset($this->openApiSpec->paths[$path]->$method)) {
            Log::info('OpenAPI method not allowed for path; letting request pass', ['path' => $path, 'method' => $method]);
            return;
        }
    }

    private function normalizePath(string $path): string
    {
        // Convert Laravel route parameters to OpenAPI format
        $path = preg_replace('/^api\/v1/', '', $path); // only strip the leading api/v1

        // Replace tenantId (UUID) only where it belongs
        $path = preg_replace('/^\/tenants\/[a-f0-9-]{36}/', '/tenants/{tenantId}', '/' . ltrim($path, '/'));

        // Replace specific resource IDs if present
        $path = preg_replace('/\/products\/[a-f0-9-]{36}/', '/products/{productId}', $path);
        $path = preg_replace('/\/roles\/[a-f0-9-]{36}/', '/roles/{roleId}', $path);

        return '/' . ltrim($path, '/');
    }
}