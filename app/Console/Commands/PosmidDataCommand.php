<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class PosmidDataCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * Usage:
     *  php artisan posmid:data --dummy
     */
    protected $signature = 'posmid:data {--dummy : Seed demo dataset (tenant, roles, users, products, orders, stock)}';

    /**
     * The console command description.
     */
    protected $description = 'POSMID data utilities (seeding demo data, etc.)';

    public function handle(): int
    {
        $didAnything = false;

        if ($this->option('dummy')) {
            $this->info('🌱 Seeding dummy/demo dataset...');
            try {
                $this->call('db:seed', ['--class' => 'Database\\Seeders\\DummyDataSeeder']);
                $this->info('✅ Dummy data seeded successfully.');
            } catch (\Throwable $e) {
                $this->error('❌ Failed seeding dummy data: ' . $e->getMessage());
                return 1;
            }
            $didAnything = true;
        }

        if (!$didAnything) {
            $this->line('No options provided. Try: php artisan posmid:data --dummy');
        }

        return 0;
    }
}