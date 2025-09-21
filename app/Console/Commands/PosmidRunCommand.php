<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class PosmidRunCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'posmid:run {--frontend= : dev, build, or none}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run the Canvastack POSMID application with optional frontend setup';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Starting Canvastack POSMID...');

        $frontend = $this->option('frontend');

        if ($frontend === 'dev') {
            $this->info('📦 Starting frontend dev server in new window...');
            $frontendPath = base_path('frontend');
            exec("start cmd /c \"cd /d $frontendPath && npm run dev\"");
            $this->info('✅ Frontend dev server started in background.');
        } elseif ($frontend === 'build') {
            $this->info('🔨 Building frontend for production...');
            $frontendPath = base_path('frontend');
            exec("cd /d $frontendPath && npm run build");
            $this->info('✅ Frontend built successfully.');
        } elseif ($frontend && $frontend !== 'none') {
            $this->error("❌ Invalid frontend option: '$frontend'. Use 'dev', 'build', or omit for backend only.");
            return 1;
        }

        $this->info('🌐 Starting Laravel backend server...');
        $this->call('serve');
    }
}
