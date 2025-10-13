<?php

namespace App\Jobs\Analytics;

use App\Mail\AnomalyDetectedMail;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Src\Pms\Infrastructure\Models\AnalyticsAnomaly;
use Src\Pms\Infrastructure\Models\AnalyticsUserPreference;

/**
 * Background job to send email alerts for detected anomalies.
 * 
 * This job is dispatched when critical anomalies are detected.
 * It sends email notifications to users who have enabled email alerts
 * and whose notification severity filter includes the anomaly's severity level.
 * 
 * @see AnomalyDetectedMail
 * @see AnalyticsUserPreference
 */
class SendAnomalyAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The anomaly ID to send alerts for.
     *
     * @var string
     */
    public string $anomalyId;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 120;

    /**
     * Create a new job instance.
     *
     * @param string $anomalyId
     */
    public function __construct(string $anomalyId)
    {
        $this->anomalyId = $anomalyId;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        Log::info('SendAnomalyAlertJob: Starting to send anomaly alerts', [
            'anomaly_id' => $this->anomalyId,
        ]);

        try {
            // Load the anomaly
            $anomaly = AnalyticsAnomaly::find($this->anomalyId);

            if (!$anomaly) {
                Log::error('SendAnomalyAlertJob: Anomaly not found', [
                    'anomaly_id' => $this->anomalyId,
                ]);
                return;
            }

            // Get users with notification preferences enabled for this severity
            $preferences = AnalyticsUserPreference::where('tenant_id', $anomaly->tenant_id)
                ->where('email_notifications_enabled', true)
                ->get();

            $emailsSent = 0;
            $recipientsList = [];

            foreach ($preferences as $pref) {
                try {
                    // Check if this severity level is in the user's filter
                    $severityFilter = is_array($pref->notification_severity_filter) 
                        ? $pref->notification_severity_filter 
                        : json_decode($pref->notification_severity_filter ?? '[]', true);

                    if (!in_array($anomaly->severity, $severityFilter)) {
                        Log::debug('SendAnomalyAlertJob: Severity not in user filter', [
                            'user_id' => $pref->user_id,
                            'anomaly_severity' => $anomaly->severity,
                            'user_filter' => $severityFilter,
                        ]);
                        continue;
                    }

                    // Send email to specific user or tenant admins
                    if ($pref->user_id) {
                        // Send to specific user
                        $user = User::find($pref->user_id);
                        
                        if ($user && $user->email) {
                            Mail::to($user->email)->send(new AnomalyDetectedMail($anomaly));
                            $emailsSent++;
                            $recipientsList[] = $user->email;
                            
                            Log::info('SendAnomalyAlertJob: Email sent to user', [
                                'user_id' => $user->id,
                                'email' => $user->email,
                            ]);
                        }
                    } else {
                        // Tenant-wide preference: Send to all admins in this tenant
                        $admins = User::where('tenant_id', $anomaly->tenant_id)
                            ->whereHas('roles', function ($query) {
                                $query->where('name', 'Admin')
                                    ->orWhere('name', 'Super Admin');
                            })
                            ->get();

                        foreach ($admins as $admin) {
                            if ($admin->email) {
                                Mail::to($admin->email)->send(new AnomalyDetectedMail($anomaly));
                                $emailsSent++;
                                $recipientsList[] = $admin->email;
                                
                                Log::info('SendAnomalyAlertJob: Email sent to admin', [
                                    'admin_id' => $admin->id,
                                    'email' => $admin->email,
                                ]);
                            }
                        }

                        // Only send once for tenant-wide preferences
                        break;
                    }
                } catch (\Exception $e) {
                    Log::error('SendAnomalyAlertJob: Failed to send email for preference', [
                        'preference_id' => $pref->id,
                        'user_id' => $pref->user_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('SendAnomalyAlertJob: Completed sending alerts', [
                'anomaly_id' => $this->anomalyId,
                'emails_sent' => $emailsSent,
                'recipients' => $recipientsList,
            ]);
        } catch (\Exception $e) {
            Log::error('SendAnomalyAlertJob: Failed to process anomaly alert', [
                'anomaly_id' => $this->anomalyId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e; // Re-throw to trigger retry
        }
    }

    /**
     * Handle a job failure.
     *
     * @param \Throwable $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendAnomalyAlertJob: Job failed after all retry attempts', [
            'anomaly_id' => $this->anomalyId,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}