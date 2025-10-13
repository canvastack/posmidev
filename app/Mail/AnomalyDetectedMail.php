<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Src\Pms\Infrastructure\Models\AnalyticsAnomaly;

/**
 * Email notification for detected anomalies in POS analytics.
 * 
 * Sent to users when critical anomalies are detected in their tenant's sales data.
 * Includes anomaly details, severity badge, and call-to-action button.
 */
class AnomalyDetectedMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * The detected anomaly.
     *
     * @var AnalyticsAnomaly
     */
    public AnalyticsAnomaly $anomaly;

    /**
     * Create a new message instance.
     *
     * @param AnalyticsAnomaly $anomaly
     */
    public function __construct(AnalyticsAnomaly $anomaly)
    {
        $this->anomaly = $anomaly;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $severityEmoji = match ($this->anomaly->severity) {
            'critical' => '🚨',
            'high' => '⚠️',
            'medium' => '⚡',
            'low' => 'ℹ️',
            default => '📊',
        };

        $subject = "{$severityEmoji} Anomaly Alert: {$this->getMetricLabel()} " . 
                   ucfirst($this->anomaly->anomaly_type) . " Detected";

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.anomaly-detected',
            with: [
                'anomaly' => $this->anomaly,
                'metricLabel' => $this->getMetricLabel(),
                'severityColor' => $this->getSeverityColor(),
                'severityBadge' => $this->getSeverityBadge(),
                'anomalyTypeLabel' => $this->getAnomalyTypeLabel(),
                'dashboardUrl' => $this->getDashboardUrl(),
            ],
        );
    }

    /**
     * Get human-readable metric label.
     *
     * @return string
     */
    private function getMetricLabel(): string
    {
        return match ($this->anomaly->metric_type) {
            'revenue' => 'Revenue',
            'transactions' => 'Transaction Count',
            'average_ticket' => 'Average Ticket Size',
            default => ucfirst($this->anomaly->metric_type),
        };
    }

    /**
     * Get severity color for styling.
     *
     * @return string
     */
    private function getSeverityColor(): string
    {
        return match ($this->anomaly->severity) {
            'critical' => '#dc2626', // red-600
            'high' => '#ea580c',     // orange-600
            'medium' => '#f59e0b',   // amber-500
            'low' => '#3b82f6',      // blue-500
            default => '#6b7280',    // gray-500
        };
    }

    /**
     * Get severity badge text.
     *
     * @return string
     */
    private function getSeverityBadge(): string
    {
        return strtoupper($this->anomaly->severity);
    }

    /**
     * Get anomaly type label.
     *
     * @return string
     */
    private function getAnomalyTypeLabel(): string
    {
        return match ($this->anomaly->anomaly_type) {
            'spike' => 'Unusual Increase',
            'drop' => 'Unusual Decrease',
            'flat' => 'Unusual Flat Trend',
            default => ucfirst($this->anomaly->anomaly_type),
        };
    }

    /**
     * Get dashboard URL for viewing the anomaly.
     *
     * @return string
     */
    private function getDashboardUrl(): string
    {
        $baseUrl = config('app.frontend_url', config('app.url'));
        return "{$baseUrl}/pos/analytics?anomaly_id={$this->anomaly->id}";
    }
}