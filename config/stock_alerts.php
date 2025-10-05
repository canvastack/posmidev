<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stock Alert Configuration
    |--------------------------------------------------------------------------
    |
    | Phase 5: Stock Management Enhancements
    | 
    | Configuration for stock alert notifications and automated checks.
    | These settings control how the system monitors inventory levels
    | and notifies users about low stock conditions.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Scheduled Job Settings
    |--------------------------------------------------------------------------
    |
    | Configure the scheduled job that checks for low stock products.
    |
    */
    'schedule' => [
        // Time to run the daily check (24-hour format)
        'time' => env('STOCK_ALERT_SCHEDULE_TIME', '09:00'),
        
        // Timezone for scheduled job
        'timezone' => env('STOCK_ALERT_TIMEZONE', 'Asia/Jakarta'),
        
        // Enable/disable the scheduled job
        'enabled' => env('STOCK_ALERT_SCHEDULE_ENABLED', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification Settings
    |--------------------------------------------------------------------------
    |
    | Configure how notifications are sent to users.
    |
    */
    'notifications' => [
        // Enable email notifications for low stock alerts
        'mail_enabled' => env('MAIL_LOW_STOCK_ALERTS_ENABLED', false),
        
        // Database notifications (in-app) are always enabled
        'database_enabled' => true,
        
        // Maximum number of products to show in email
        'email_product_limit' => 10,
        
        // Maximum number of products to show in database notification
        'database_product_limit' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Alert Thresholds
    |--------------------------------------------------------------------------
    |
    | Define stock level thresholds for different severity levels.
    | These percentages are calculated based on the reorder_point.
    |
    */
    'thresholds' => [
        // Out of stock: stock = 0
        'out_of_stock' => 0,
        
        // Critical: stock <= 25% of reorder_point
        'critical_percentage' => 25,
        
        // Low: stock <= reorder_point but > critical threshold
        // (automatically calculated)
    ],

    /*
    |--------------------------------------------------------------------------
    | Alert Deduplication
    |--------------------------------------------------------------------------
    |
    | Prevent duplicate alerts for the same product within a time window.
    |
    */
    'deduplication' => [
        // Don't create new alert if one exists within this many hours
        'window_hours' => 24,
        
        // Update existing alerts if stock levels change significantly
        'update_on_change' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Frontend URLs
    |--------------------------------------------------------------------------
    |
    | Base URL for the frontend application (used in notifications).
    |
    */
    'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000')),

];