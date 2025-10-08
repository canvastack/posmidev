<?php

namespace Src\Pms\Core\Services;

use Src\Pms\Infrastructure\Models\ProductSearchTerm;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Search Analytics Service
 * 
 * Handles product search tracking and analytics.
 * Provides insights into what users are searching for.
 * 
 * @package Src\Pms\Core\Services
 */
class SearchAnalyticsService
{
    /**
     * Track a search query
     * 
     * @param string $searchTerm
     * @param string $tenantId
     * @param int $resultsCount
     * @param string|null $userId
     * @param array $metadata
     * @return ProductSearchTerm
     */
    public function trackSearch(
        string $searchTerm,
        string $tenantId,
        int $resultsCount = 0,
        ?string $userId = null,
        array $metadata = []
    ): ProductSearchTerm {
        // Normalize search term (lowercase, trim)
        $normalizedTerm = trim(strtolower($searchTerm));
        
        return ProductSearchTerm::create([
            'tenant_id' => $tenantId,
            'search_term' => $normalizedTerm,
            'user_id' => $userId,
            'results_count' => $resultsCount,
            'ip_address' => $metadata['ip_address'] ?? null,
            'searched_at' => now(),
        ]);
    }

    /**
     * Get most popular search terms
     * 
     * @param string $tenantId
     * @param int $limit
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getPopularSearches(
        string $tenantId,
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $query = ProductSearchTerm::query()
            ->select([
                'search_term',
                DB::raw('COUNT(*) as search_count'),
                DB::raw('AVG(results_count) as avg_results'),
                DB::raw('MAX(searched_at) as last_searched'),
            ])
            ->tenantScoped($tenantId)
            ->groupBy('search_term')
            ->orderByDesc('search_count')
            ->limit($limit);
        
        if ($periodStart) {
            $query->where('searched_at', '>=', $periodStart);
        }
        if ($periodEnd) {
            $query->where('searched_at', '<=', $periodEnd);
        }
        
        $results = $query->get();
        
        return $results->map(function ($item) {
            return [
                'search_term' => $item->search_term,
                'search_count' => (int) $item->search_count,
                'avg_results' => round((float) $item->avg_results, 1),
                'last_searched' => $item->last_searched,
            ];
        })->toArray();
    }

    /**
     * Get search trends over time
     * 
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @param string $groupBy ('day', 'week', 'month')
     * @return array
     */
    public function getSearchTrends(
        string $tenantId,
        ?string $periodStart = null,
        ?string $periodEnd = null,
        string $groupBy = 'day'
    ): array {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        // Build date grouping based on $groupBy
        $dateFormat = match($groupBy) {
            'week' => 'YYYY-IW', // ISO week
            'month' => 'YYYY-MM',
            default => 'YYYY-MM-DD', // day
        };
        
        $results = ProductSearchTerm::query()
            ->select([
                DB::raw("TO_CHAR(searched_at, '{$dateFormat}') as period"),
                DB::raw('COUNT(*) as search_count'),
                DB::raw('COUNT(DISTINCT search_term) as unique_terms'),
            ])
            ->tenantScoped($tenantId)
            ->dateRange($period['start'], $period['end'])
            ->groupBy('period')
            ->orderBy('period')
            ->get();
        
        return $results->map(function ($item) {
            return [
                'period' => $item->period,
                'search_count' => (int) $item->search_count,
                'unique_terms' => (int) $item->unique_terms,
            ];
        })->toArray();
    }

    /**
     * Get zero-result searches (terms that returned no products)
     * 
     * @param string $tenantId
     * @param int $limit
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getZeroResultSearches(
        string $tenantId,
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $query = ProductSearchTerm::query()
            ->select([
                'search_term',
                DB::raw('COUNT(*) as attempt_count'),
                DB::raw('MAX(searched_at) as last_attempted'),
            ])
            ->tenantScoped($tenantId)
            ->withoutResults()
            ->groupBy('search_term')
            ->orderByDesc('attempt_count')
            ->limit($limit);
        
        if ($periodStart) {
            $query->where('searched_at', '>=', $periodStart);
        }
        if ($periodEnd) {
            $query->where('searched_at', '<=', $periodEnd);
        }
        
        $results = $query->get();
        
        return $results->map(function ($item) {
            return [
                'search_term' => $item->search_term,
                'attempt_count' => (int) $item->attempt_count,
                'last_attempted' => $item->last_attempted,
            ];
        })->toArray();
    }

    /**
     * Get search statistics summary
     * 
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getSearchStats(
        string $tenantId,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        $stats = ProductSearchTerm::query()
            ->select([
                DB::raw('COUNT(*) as total_searches'),
                DB::raw('COUNT(DISTINCT search_term) as unique_terms'),
                DB::raw('COUNT(CASE WHEN results_count = 0 THEN 1 END) as zero_result_count'),
                DB::raw('AVG(results_count) as avg_results_per_search'),
            ])
            ->tenantScoped($tenantId)
            ->dateRange($period['start'], $period['end'])
            ->first();
        
        $totalSearches = (int) ($stats->total_searches ?? 0);
        $zeroResultCount = (int) ($stats->zero_result_count ?? 0);
        
        return [
            'total_searches' => $totalSearches,
            'unique_terms' => (int) ($stats->unique_terms ?? 0),
            'zero_result_count' => $zeroResultCount,
            'zero_result_percentage' => $totalSearches > 0 
                ? round(($zeroResultCount / $totalSearches) * 100, 2) 
                : 0,
            'avg_results_per_search' => round((float) ($stats->avg_results_per_search ?? 0), 1),
            'period' => $period,
        ];
    }

    /**
     * Normalize period dates
     */
    private function normalizePeriod(?string $periodStart, ?string $periodEnd): array
    {
        $end = $periodEnd ? Carbon::parse($periodEnd) : Carbon::now();
        $start = $periodStart ? Carbon::parse($periodStart) : Carbon::now()->subDays(30);
        
        return [
            'start' => $start->toDateTimeString(),
            'end' => $end->toDateTimeString(),
        ];
    }
}