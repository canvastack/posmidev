<?php

namespace Src\Pms\Core\Services\Analytics;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\AnalyticsAnomaly;
use Src\Pms\Infrastructure\Models\AnalyticsUserPreference;

/**
 * AnomalyDetectionService
 *
 * Phase 5: Backend Analytics - Anomaly Detection Engine
 * Detects anomalies (spikes, drops, flat periods) using statistical analysis.
 *
 * Algorithm: Z-Score (Standard Score) Analysis
 * Compares each data point against a rolling window mean/stddev.
 */
class AnomalyDetectionService
{
    /**
     * Detect anomalies in a date range
     *
     * @param  string  $metricType  revenue|transactions|average_ticket
     */
    public function detectAnomalies(
        string $tenantId,
        string $startDate,
        string $endDate,
        string $metricType = 'revenue'
    ): array {
        $prefs = AnalyticsUserPreference::getForUser($tenantId);
        $windowSize = $prefs->anomaly_window_days;

        $extendedStartDate = Carbon::parse($startDate)->subDays($windowSize);

        $trends = $this->getOrderTrends($tenantId, $extendedStartDate->toDateString(), $endDate, $metricType);

        if (count($trends) < $windowSize + 1) {
            return [];
        }

        $anomalies = [];

        for ($i = $windowSize; $i < count($trends); $i++) {
            $currentDate = Carbon::parse($trends[$i]['date']);

            if ($currentDate->lt(Carbon::parse($startDate))) {
                continue;
            }

            $window = array_slice($trends, $i - $windowSize, $windowSize);

            $mean = $this->calculateMean($window);
            $stdDev = $this->calculateStdDev($window, $mean);

            if ($stdDev == 0) {
                continue;
            }

            $currentValue = $trends[$i]['value'];
            $zScore = ($currentValue - $mean) / $stdDev;

            $severity = $this->classifySeverity(abs($zScore), $prefs);

            if ($severity) {
                $anomalyType = $this->determineAnomalyType($zScore, $currentValue, $mean);

                $variancePercent = $mean > 0 ? (($currentValue - $mean) / $mean) * 100 : 0;

                $anomaly = [
                    'tenant_id' => $tenantId,
                    'detected_date' => $trends[$i]['date'],
                    'metric_type' => $metricType,
                    'anomaly_type' => $anomalyType,
                    'severity' => $severity,
                    'actual_value' => $currentValue,
                    'expected_value' => $mean,
                    'variance_percent' => round($variancePercent, 2),
                    'z_score' => round($zScore, 4),
                    'context_data' => json_encode([
                        'window_size' => $windowSize,
                        'std_dev' => round($stdDev, 2),
                    ]),
                ];

                $storedAnomaly = $this->storeAnomaly($anomaly);
                $anomalies[] = $storedAnomaly;
            }
        }

        return $anomalies;
    }

    /**
     * Get order trends for analysis
     */
    protected function getOrderTrends(
        string $tenantId,
        string $startDate,
        string $endDate,
        string $metricType
    ): array {
        $query = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
            ->selectRaw('DATE(created_at) as date')
            ->groupBy('date')
            ->orderBy('date', 'asc');

        if ($metricType === 'revenue') {
            $query->selectRaw('SUM(total) as value');
        } elseif ($metricType === 'transactions') {
            $query->selectRaw('COUNT(id) as value');
        } elseif ($metricType === 'average_ticket') {
            $query->selectRaw('AVG(total) as value');
        }

        $results = $query->get()->toArray();

        $allDates = [];
        $current = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        while ($current->lte($end)) {
            $allDates[$current->toDateString()] = 0;
            $current->addDay();
        }

        foreach ($results as $item) {
            $allDates[$item->date] = (float) $item->value;
        }

        $trends = [];
        foreach ($allDates as $date => $value) {
            $trends[] = ['date' => $date, 'value' => $value];
        }

        return $trends;
    }

    /**
     * Calculate mean of values
     */
    protected function calculateMean(array $data): float
    {
        $values = array_column($data, 'value');
        $sum = array_sum($values);
        $count = count($values);

        return $count > 0 ? $sum / $count : 0;
    }

    /**
     * Calculate standard deviation
     */
    protected function calculateStdDev(array $data, float $mean): float
    {
        $values = array_column($data, 'value');
        $count = count($values);

        if ($count < 2) {
            return 0;
        }

        $sumSquaredDiff = 0;
        foreach ($values as $value) {
            $sumSquaredDiff += pow($value - $mean, 2);
        }

        return sqrt($sumSquaredDiff / $count);
    }

    /**
     * Classify severity based on Z-score
     */
    protected function classifySeverity(float $absZScore, AnalyticsUserPreference $prefs): ?string
    {
        if ($absZScore >= $prefs->anomaly_threshold_critical) {
            return 'critical';
        }
        if ($absZScore >= $prefs->anomaly_threshold_high) {
            return 'high';
        }
        if ($absZScore >= $prefs->anomaly_threshold_medium) {
            return 'medium';
        }
        if ($absZScore >= $prefs->anomaly_threshold_low) {
            return 'low';
        }

        return null;
    }

    /**
     * Determine anomaly type (spike, drop, flat)
     */
    protected function determineAnomalyType(float $zScore, float $actual, float $expected): string
    {
        if ($zScore > 0) {
            return 'spike';
        } elseif ($zScore < 0) {
            return 'drop';
        } else {
            return 'flat';
        }
    }

    /**
     * Store anomaly in database
     */
    protected function storeAnomaly(array $anomalyData): AnalyticsAnomaly
    {
        $existing = AnalyticsAnomaly::where('tenant_id', $anomalyData['tenant_id'])
            ->where('detected_date', $anomalyData['detected_date'])
            ->where('metric_type', $anomalyData['metric_type'])
            ->first();

        if ($existing) {
            $existing->update($anomalyData);

            return $existing;
        }

        return AnalyticsAnomaly::create($anomalyData);
    }

    /**
     * Get anomalies with filters
     *
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getAnomalies(string $tenantId, array $filters = [])
    {
        $query = AnalyticsAnomaly::tenantScoped($tenantId);

        if (isset($filters['start_date'])) {
            $query->where('detected_date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->where('detected_date', '<=', $filters['end_date']);
        }

        if (isset($filters['severity'])) {
            $query->severity($filters['severity']);
        }

        if (isset($filters['acknowledged'])) {
            $query->acknowledged((bool) $filters['acknowledged']);
        }

        if (isset($filters['metric_type'])) {
            $query->where('metric_type', $filters['metric_type']);
        }

        $perPage = $filters['per_page'] ?? 20;

        return $query->orderBy('detected_date', 'desc')
            ->orderBy('severity', 'desc')
            ->paginate($perPage);
    }
}
