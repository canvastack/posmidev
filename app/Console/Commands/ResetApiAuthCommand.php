<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\PermissionRegistrar;
use Database\Seeders\DummyDataSeeder;

class ResetApiAuthCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'app:auth:reset {--reseed : Reseed minimal roles/permissions using DummyDataSeeder}';

    /**
     * The console command description.
     */
    protected $description = 'Purge Sanctum tokens and reset roles/permissions for guard "api"';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Purging Sanctum personal access tokens...');
        // Delete all tokens (safer than truncate with potential FKs)
        PersonalAccessToken::query()->delete();
        $this->info('Tokens purged.');

        $this->info('Clearing Spatie permission cache...');
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->info('Permission cache cleared.');

        if ($this->option('reseed')) {
            $this->info('Running DummyDataSeeder (guard="api")...');
            // Ensure seeder runs non-interactively
            Artisan::call('db:seed', [
                '--class' => DummyDataSeeder::class,
                '--force' => true,
            ]);
            $this->line(Artisan::output());
            $this->info('Seeding completed.');
        } else {
            $this->line('Skipping reseed. Use --reseed to run DummyDataSeeder.');
        }

        $this->newLine();
        $this->info('Auth reset complete. Next suggested steps:');
        $this->line('1) php artisan optimize:clear');
        $this->line('2) Restart your dev server');
        $this->line('3) Re-login to obtain a fresh Bearer token');

        return self::SUCCESS;
    }
}