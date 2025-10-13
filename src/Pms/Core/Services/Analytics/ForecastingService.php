<?php

namespace Src\Pms\Core\Services\Analytics;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\AnalyticsForecast;

/**
 * ForecastingService
 *
 * Phase 5: Backend Analytics - Forecasting Engine
 * Generates sales forecasts using statistical algorithms.
 *
 * Algorithms supported:
 * - Linear Regression (default)
 * - Exponential Smoothing (future)
 */
class ForecastingService
{
    /**
     * Generate forecast using linear regression
     *
     * @param  string  $metricType  revenue|transactions|average_ticket
     * @param  int  $daysAhead  Number of days to forecast (1-365)
     * @param  int  $historicalDays  Days of historical data to use (default: 90)
     */
    public function linearRegressionForecast(
        string $tenantId,
        string $metricType,
        int $daysAhead = 30,
        int $historicalDays = 90
    ): array {
        $trends = $this->getHistoricalTrends($tenantId, $metricType, $historicalDays);

        if (count($trends) < 7) {
            throw new \Exception('Insufficient historical data. Need at least 7 days.');
        }

        $regression = $this->calculateLinearRegression($trends);

        $forecasts = [];
        $today = Carbon::today();

        for ($i = 1; $i <= $daysAhead; $i++) {
            $predictedDate = $today->copy()->addDays($i);
            $x = count($trends) + $i;
            $predictedValue = $regression['slope'] * $x + $regression['intercept'];

            $confidenceInterval = $this->calculateConfidenceInterval(
                $trends,
                $regression,
                $predictedValue
            );

            $forecasts[] = [
                'predicted_date' => $predictedDate->toDateString(),
                'predicted_value' => max(0, round($predictedValue, 2)),
                'confidence_lower' => max(0, round($predictedValue - $confidenceInterval, 2)),
                'confidence_upper' => round($predictedValue + $confidenceInterval, 2),
            ];
        }

        return [
            'forecasts' => $forecasts,
            'r_squared' => $regression['r_squared'],
            'algorithm' => 'linear_regression',
            'historical_days_used' => count($trends),
        ];
    }

    /**
     * Get historical trends for a metric
     */
    protected function getHistoricalTrends(string $tenantId, string $metricType, int $days): array
    {
        $startDate = Carbon::today()->subDays($days);

        $column = match ($metricType) {
            'revenue' => 'total',
            'transactions' => 'id',
            'average_ticket' => 'total',
            default => throw new \Exception("Invalid metric type: $metricType")
        };

        $query = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
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

        return array_map(function ($item) {
            return [
                'date' => $item->date,
                'value' => (float) $item->value,
            ];
        }, $results);
    }

    /**
     * Calculate linear regression (slope, intercept, R-squared)
     */
    protected function calculateLinearRegression(array $trends): array
    {
        $n = count($trends);
        $x = range(1, $n);
        $y = array_column($trends, 'value');

        $sumX = array_sum($x);
        $sumY = array_sum($y);
        $sumXY = 0;
        $sumX2 = 0;
        $sumY2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumXY += $x[$i] * $y[$i];
            $sumX2 += $x[$i] * $x[$i];
            $sumY2 += $y[$i] * $y[$i];
        }

        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        $intercept = ($sumY - $slope * $sumX) / $n;

        $meanY = $sumY / $n;
        $ssTotal = 0;
        $ssResidual = 0;

        for ($i = 0; $i < $n; $i++) {
            $predicted = $slope * $x[$i] + $intercept;
            $ssResidual += pow($y[$i] - $predicted, 2);
            $ssTotal += pow($y[$i] - $meanY, 2);
        }

        $rSquared = $ssTotal > 0 ? 1 - ($ssResidual / $ssTotal) : 0;

        return [
            'slope' => $slope,
            'intercept' => $intercept,
            'r_squared' => max(0, min(1, $rSquared)),
        ];
    }

    /**
     * Calculate 95% confidence interval
     */
    protected function calculateConfidenceInterval(
        array $trends,
        array $regression,
        float $predictedValue
    ): float {
        $n = count($trends);
        $x = range(1, $n);
        $y = array_column($trends, 'value');

        $sumSquaredErrors = 0;
        for ($i = 0; $i < $n; $i++) {
            $predicted = $regression['slope'] * $x[$i] + $regression['intercept'];
            $sumSquaredErrors += pow($y[$i] - $predicted, 2);
        }

        $standardError = sqrt($sumSquaredErrors / max(1, $n - 2));

        $tValue = 1.96;

        return $tValue * $standardError;
    }

    /**
     * Store forecasts in database
     *
     * @return int Number of forecasts stored
     */
    public function storeForecast(string $tenantId, string $metricType, array $forecastResult): int
    {
        $forecastDate = Carbon::today();
        $algorithm = $forecastResult['algorithm'];
        $rSquared = $forecastResult['r_squared'];

        $stored = 0;

        foreach ($forecastResult['forecasts'] as $forecast) {
            AnalyticsForecast::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'forecast_date' => $forecastDate,
                    'predicted_date' => $forecast['predicted_date'],
                    'metric_type' => $metricType,
                    'algorithm' => $algorithm,
                ],
                [
                    'predicted_value' => $forecast['predicted_value'],
                    'confidence_lower' => $forecast['confidence_lower'],
                    'confidence_upper' => $forecast['confidence_upper'],
                    'r_squared' => $rSquared,
                    'algorithm_params' => [
                        'historical_days_used' => $forecastResult['historical_days_used'],
                    ],
                ]
            );

            $stored++;
        }

        return $stored;
    }

    /**
     * Get stored forecasts
     */
    public function getStoredForecast(string $tenantId, string $metricType, int $daysAhead = 30): ?array
    {
        $today = Carbon::today();
        $endDate = $today->copy()->addDays($daysAhead);

        $forecasts = AnalyticsForecast::tenantScoped($tenantId)
            ->metricType($metricType)
            ->where('forecast_date', $today)
            ->predictedDateRange($today->toDateString(), $endDate->toDateString())
            ->orderBy('predicted_date', 'asc')
            ->get();

        if ($forecasts->isEmpty()) {
            return null;
        }

        return [
            'forecasts' => $forecasts->map(function ($f) {
                return [
                    'predicted_date' => $f->predicted_date->toDateString(),
                    'predicted_value' => (float) $f->predicted_value,
                    'confidence_lower' => (float) $f->confidence_lower,
                    'confidence_upper' => (float) $f->confidence_upper,
                ];
            })->toArray(),
            'r_squared' => (float) $forecasts->first()->r_squared,
            'algorithm' => $forecasts->first()->algorithm,
        ];
    }
}
