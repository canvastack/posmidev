<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anomaly Alert</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 32px 24px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
        }
        .email-body {
            padding: 32px 24px;
        }
        .severity-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
        }
        .alert-summary {
            background-color: #f9fafb;
            border-left: 4px solid;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 24px;
        }
        .alert-summary h2 {
            margin: 0 0 12px 0;
            font-size: 18px;
            color: #111827;
        }
        .alert-summary p {
            margin: 8px 0;
            color: #4b5563;
            font-size: 14px;
        }
        .metric-card {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
        }
        .metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .metric-label {
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
        }
        .metric-value {
            color: #111827;
            font-size: 16px;
            font-weight: 700;
        }
        .metric-value.critical {
            color: #dc2626;
        }
        .metric-value.positive {
            color: #059669;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 16px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .email-footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .email-footer p {
            margin: 4px 0;
            color: #6b7280;
            font-size: 13px;
        }
        .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 24px 0;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="email-header">
            <div class="icon">
                @if($anomaly->severity === 'critical')
                    🚨
                @elseif($anomaly->severity === 'high')
                    ⚠️
                @elseif($anomaly->severity === 'medium')
                    ⚡
                @else
                    ℹ️
                @endif
            </div>
            <h1>Anomaly Alert Detected</h1>
        </div>

        <!-- Body -->
        <div class="email-body">
            <!-- Severity Badge -->
            <span class="severity-badge" style="background-color: {{ $severityColor }}; color: #ffffff;">
                {{ $severityBadge }} SEVERITY
            </span>

            <!-- Alert Summary -->
            <div class="alert-summary" style="border-color: {{ $severityColor }};">
                <h2>{{ $anomalyTypeLabel }} in {{ $metricLabel }}</h2>
                <p><strong>Detected Date:</strong> {{ \Carbon\Carbon::parse($anomaly->detected_date)->format('F j, Y') }}</p>
                <p><strong>Metric Type:</strong> {{ $metricLabel }}</p>
                <p><strong>Anomaly Type:</strong> {{ ucfirst($anomaly->anomaly_type) }}</p>
            </div>

            <!-- Metric Details -->
            <div class="metric-card">
                <div class="metric-row">
                    <span class="metric-label">Expected Value</span>
                    <span class="metric-value">
                        @if($anomaly->metric_type === 'revenue')
                            Rp {{ number_format($anomaly->expected_value, 0, ',', '.') }}
                        @elseif($anomaly->metric_type === 'transactions')
                            {{ number_format($anomaly->expected_value, 0) }} transactions
                        @else
                            Rp {{ number_format($anomaly->expected_value, 0, ',', '.') }}
                        @endif
                    </span>
                </div>

                <div class="metric-row">
                    <span class="metric-label">Actual Value</span>
                    <span class="metric-value critical">
                        @if($anomaly->metric_type === 'revenue')
                            Rp {{ number_format($anomaly->actual_value, 0, ',', '.') }}
                        @elseif($anomaly->metric_type === 'transactions')
                            {{ number_format($anomaly->actual_value, 0) }} transactions
                        @else
                            Rp {{ number_format($anomaly->actual_value, 0, ',', '.') }}
                        @endif
                    </span>
                </div>

                <div class="divider"></div>

                <div class="metric-row">
                    <span class="metric-label">Variance</span>
                    <span class="metric-value critical">
                        {{ $anomaly->variance_percent > 0 ? '+' : '' }}{{ number_format($anomaly->variance_percent, 2) }}%
                    </span>
                </div>

                <div class="metric-row">
                    <span class="metric-label">Statistical Score (Z-Score)</span>
                    <span class="metric-value">
                        {{ number_format($anomaly->z_score, 2) }}σ
                    </span>
                </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
                <a href="{{ $dashboardUrl }}" class="cta-button">
                    View Analytics Dashboard
                </a>
            </div>

            <!-- Additional Context -->
            @if($anomaly->context_data)
                <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong>Additional Context:</strong><br>
                        {{ $anomaly->context_data }}
                    </p>
                </div>
            @endif

            <!-- Help Text -->
            <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
                This anomaly was detected using statistical analysis (Z-Score method) on your sales data. 
                A Z-score of {{ number_format(abs($anomaly->z_score), 2) }} indicates this value is 
                {{ number_format(abs($anomaly->z_score), 2) }} standard deviations away from the expected average.
            </p>

            <p style="color: #6b7280; font-size: 14px;">
                <strong>What should you do?</strong><br>
                Review the Analytics Dashboard to investigate the root cause of this anomaly. 
                Consider factors like marketing campaigns, seasonal trends, operational issues, or data quality.
            </p>
        </div>

        <!-- Footer -->
        <div class="email-footer">
            <p><strong>POSMID Analytics</strong></p>
            <p>Intelligent Sales Intelligence System</p>
            <p style="margin-top: 16px; font-size: 12px;">
                You received this email because you have enabled anomaly alerts in your analytics preferences.
            </p>
            <p style="font-size: 12px;">
                <a href="{{ config('app.frontend_url') }}/pos/analytics/settings" style="color: #667eea;">
                    Manage notification settings
                </a>
            </p>
        </div>
    </div>
</body>
</html>