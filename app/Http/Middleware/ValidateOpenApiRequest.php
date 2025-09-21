<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use cebe\openapi\Reader;
use cebe\openapi\spec\OpenApi;

class ValidateOpenApiRequest
{
    private ?OpenApi $openApiSpec = null;

    public function handle(Request $request, Closure $next): Response
    {
        if (!$this->openApiSpec) {
            $this->openApiSpec = Reader::readFromYamlFile(base_path('openapi.yaml'));
        }

        // Skip validation for non-API routes
        if (!str_starts_with($request->path(), 'api/')) {
            return $next($request);
        }

        // Basic validation - in production, use a more robust OpenAPI validator
        $this->validateRequest($request);

        return $next($request);
    }

    private function validateRequest(Request $request): void
    {
        // This is a simplified validation
        // In production, use libraries like league/openapi-psr7-validator
        $method = strtolower($request->method());
        $path = $this->normalizePath($request->path());

        // Check if path exists in OpenAPI spec
        if (!isset($this->openApiSpec->paths[$path])) {
            abort(404, 'Endpoint not found in API specification');
        }

        // Check if method is allowed
        if (!isset($this->openApiSpec->paths[$path]->$method)) {
            abort(405, 'Method not allowed');
        }
    }

    private function normalizePath(string $path): string
    {
        // Convert Laravel route parameters to OpenAPI format
        $path = preg_replace('/api\/v1/', '', $path);
        $path = preg_replace('/\/[a-f0-9-]{36}/', '/{tenantId}', $path);
        $path = preg_replace('/\/products\/[a-f0-9-]{36}/', '/products/{productId}', $path);
        $path = preg_replace('/\/roles\/[a-f0-9-]{36}/', '/roles/{roleId}', $path);
        
        return '/' . ltrim($path, '/');
    }
}