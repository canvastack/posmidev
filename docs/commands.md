# Commands

POSMID provides several custom Artisan commands to streamline development, deployment, and maintenance tasks. The most important command is `posmid:run`, which serves as a unified entry point for running the application.

## POSMID Run Command

The `posmid:run` command is the primary command for starting the POSMID application. It provides options for running both backend and frontend concurrently.

### Basic Usage

```bash
# Start backend only
php artisan posmid:run

# Start backend + frontend development server
php artisan posmid:run --frontend=dev

# Build frontend and start backend
php artisan posmid:run --frontend=build
```

### Command Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--frontend` | `dev`, `build`, `none` | `none` | Frontend handling mode |
| `--port` | number | `8000` | Backend server port |
| `--host` | string | `127.0.0.1` | Backend server host |
| `--no-backend` | - | `false` | Skip starting backend server |
| `--quiet` | - | `false` | Suppress output |

### Detailed Option Descriptions

#### `--frontend=dev`
Starts the Vite development server in a new command window for hot-reloading during development.

- **Command executed**: `npm run dev` in `frontend/` directory
- **New window**: Opens separate terminal/command prompt
- **Hot reload**: Automatically refreshes browser on file changes
- **Port**: Usually `5173` (configurable in Vite config)

#### `--frontend=build`
Builds the frontend for production and then starts the backend server.

- **Build process**: `npm run build` creates optimized assets
- **Output directory**: `frontend/dist/`
- **Asset serving**: Laravel serves built assets from `public/build/`
- **Optimization**: Minified CSS/JS with hashed filenames

#### `--frontend=none` (default)
Starts only the backend Laravel server without frontend handling.

### Examples

#### Development Environment
```bash
# Full development setup with hot-reloading
php artisan posmid:run --frontend=dev

# Backend only for API development
php artisan posmid:run

# Custom port
php artisan posmid:run --port=9000 --frontend=dev
```

#### Production-like Environment
```bash
# Build frontend for production testing
php artisan posmid:run --frontend=build

# Custom host for network access
php artisan posmid:run --host=0.0.0.0 --frontend=build
```

### Output Examples

#### Successful Backend Start
```
🚀 Starting Canvastack POSMID...
🌐 Starting Laravel backend server...
Laravel development server started: http://127.0.0.1:9000
```

#### Backend + Frontend Dev
```
🚀 Starting Canvastack POSMID...
📦 Starting frontend dev server in new window...
✅ Frontend dev server started in background.
🌐 Starting Laravel backend server...
Laravel development server started: http://127.0.0.1:9000
```

#### Build Process
```
🚀 Starting Canvastack POSMID...
🔨 Building frontend for production...
✅ Frontend built successfully.
🌐 Starting Laravel backend server...
Laravel development server started: http://127.0.0.1:9000
```

### Error Handling

The command includes comprehensive error checking:

#### Frontend Directory Missing
```
❌ Error: Frontend directory not found at: d:\worksites\canvastack\posmidev\frontend
Please ensure the frontend directory exists and contains a valid package.json
```

#### npm Not Installed
```
❌ Error: npm command not found.
Please install Node.js and npm: https://nodejs.org/
```

#### Port Already in Use
```
❌ Error: Port 8000 is already in use.
Please specify a different port using --port option.
```

#### Build Failures
```
❌ Error: Frontend build failed.
Check the build output above for details.
```

### Implementation Details

The command is located at `app/Console/Commands/PosmidRunCommand.php`:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class PosmidRunCommand extends Command
{
    protected $signature = 'posmid:run
                            {--frontend=none : Frontend mode (dev, build, none)}
                            {--port=8000 : Backend server port}
                            {--host=127.0.0.1 : Backend server host}
                            {--no-backend : Skip backend server}
                            {--quiet : Suppress output}';

    protected $description = 'Start POSMID application with backend and/or frontend';

    public function handle()
    {
        $this->info('🚀 Starting Canvastack POSMID...');

        $frontend = $this->option('frontend');
        $port = $this->option('port');
        $host = $this->option('host');
        $noBackend = $this->option('no-backend');
        $quiet = $this->option('quiet');

        // Handle frontend
        if ($frontend === 'dev') {
            $this->startFrontendDev();
        } elseif ($frontend === 'build') {
            $this->buildFrontend();
        }

        // Handle backend
        if (!$noBackend) {
            $this->startBackend($host, $port, $quiet);
        }
    }

    private function startFrontendDev()
    {
        $frontendPath = base_path('frontend');

        if (!is_dir($frontendPath)) {
            $this->error("❌ Error: Frontend directory not found at: {$frontendPath}");
            return;
        }

        $this->info('📦 Starting frontend dev server in new window...');

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows: Use start cmd
            $command = "start cmd /c \"cd /d {$frontendPath} && npm run dev\"";
        } else {
            // Unix-like systems
            $command = "cd {$frontendPath} && npm run dev";
        }

        exec($command);
        $this->info('✅ Frontend dev server started in background.');
    }

    private function buildFrontend()
    {
        $frontendPath = base_path('frontend');

        if (!is_dir($frontendPath)) {
            $this->error("❌ Error: Frontend directory not found at: {$frontendPath}");
            return;
        }

        $this->info('🔨 Building frontend for production...');

        $process = Process::fromShellCommandline("cd {$frontendPath} && npm run build");
        $process->setTimeout(300); // 5 minutes timeout

        try {
            $process->mustRun();
            $this->info('✅ Frontend built successfully.');
        } catch (\Exception $e) {
            $this->error('❌ Error: Frontend build failed.');
            $this->error($e->getMessage());
            return;
        }
    }

    private function startBackend($host, $port, $quiet)
    {
        $this->info('🌐 Starting Laravel backend server...');

        $command = "php artisan serve --host={$host} --port={$port}";

        if ($quiet) {
            $command .= ' --quiet';
        }

        $this->info("Command: {$command}");

        // For Windows, we need to handle the process differently
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $fullCommand = "start cmd /c \"cd /d " . base_path() . " && {$command}\"";
            exec($fullCommand);
        } else {
            $process = Process::fromShellCommandline($command);
            $process->setTimeout(null); // No timeout for server
            $process->start();

            if (!$quiet) {
                foreach ($process as $type => $data) {
                    echo $data;
                }
            }
        }
    }
}
```

## Other Custom Commands

### Permission Management

#### Create Role
```bash
php artisan roles:create {name} {--permissions=*}
```

Creates a new role with optional permissions.

**Examples:**
```bash
# Create basic role
php artisan roles:create cashier

# Create role with permissions
php artisan roles:create manager --permissions=products.view,products.create,orders.view

# Create admin role with all permissions
php artisan roles:create admin --permissions=*
```

#### Assign Permissions to Role
```bash
php artisan permissions:assign {role} {permissions*}
```

Assigns permissions to an existing role.

**Example:**
```bash
php artisan permissions:assign manager products.update orders.create
```

### Database Management

#### Seed Permissions
```bash
php artisan permissions:seed
```

Seeds the database with default permissions and roles.

#### Create Tenant Database
```bash
php artisan tenant:create {name} {domain}
```

Creates a new tenant database and configures the domain.

**Example:**
```bash
php artisan tenant:create store1 store1.posmid.com
```

### Development Helpers

#### Generate OpenAPI Documentation
```bash
php artisan openapi:generate
```

Regenerates the OpenAPI specification from current routes and models.

#### Validate OpenAPI Spec
```bash
php artisan openapi:validate
```

Validates the current OpenAPI specification against the schema.

#### Run API Tests
```bash
php artisan test:api
```

Runs all API-related tests with detailed output.

### Maintenance Commands

#### Clear All Caches
```bash
php artisan posmid:clear-cache
```

Clears all Laravel caches including config, route, view, and permission caches.

#### Backup Database
```bash
php artisan posmid:backup {--tenant=*}
```

Creates database backups for specified tenants.

**Examples:**
```bash
# Backup all tenants
php artisan posmid:backup

# Backup specific tenant
php artisan posmid:backup --tenant=store1
```

#### Health Check
```bash
php artisan posmid:health
```

Performs comprehensive health checks on the application.

**Output:**
```
✅ Database connection: OK
✅ Redis connection: OK
✅ File permissions: OK
✅ OpenAPI validation: OK
⚠️  Pending migrations: 2 migrations need to be run
```

## Command Development

### Creating Custom Commands

To create a new POSMID command:

1. **Generate Command**
   ```bash
   php artisan make:command YourCommandName
   ```

2. **Implement Command Logic**
   ```php
   <?php

   namespace App\Console\Commands;

   use Illuminate\Console\Command;

   class YourCommandName extends Command
   {
       protected $signature = 'posmid:your-command
                               {--option= : Description}
                               {parameter : Required parameter}';

       protected $description = 'Description of what this command does';

       public function handle()
       {
           // Command logic here
           $this->info('Command executed successfully!');
       }
   }
   ```

3. **Register Command**
   Commands are auto-discovered in Laravel 11. No manual registration needed.

### Command Best Practices

1. **Descriptive Names**: Use `posmid:` prefix for POSMID-specific commands
2. **Help Text**: Provide clear descriptions and option details
3. **Error Handling**: Use try-catch blocks and provide meaningful error messages
4. **User Feedback**: Use `$this->info()`, `$this->warn()`, `$this->error()` for output
5. **Progress Bars**: Use progress bars for long-running operations
6. **Confirmation**: Ask for confirmation on destructive operations

### Testing Commands

```php
<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosmidRunCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_can_start_backend()
    {
        $this->artisan('posmid:run', ['--no-backend' => true])
             ->expectsOutput('🚀 Starting Canvastack POSMID...')
             ->assertExitCode(0);
    }

    public function test_command_validates_frontend_option()
    {
        $this->artisan('posmid:run', ['--frontend' => 'invalid'])
             ->expectsOutput('Invalid frontend option')
             ->assertExitCode(1);
    }
}
```

## Scheduling Commands

POSMID includes scheduled commands for maintenance:

```php
// In app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Daily backups
    $schedule->command('posmid:backup')
             ->daily()
             ->at('02:00');

    // Clear expired tokens
    $schedule->command('sanctum:prune-expired')
             ->daily();

    // Health checks
    $schedule->command('posmid:health')
             ->everyFiveMinutes();
}
```

## Next Steps

- [Testing](testing.md) - Testing commands and application
- [Deployment](deployment.md) - Deployment commands and strategies
- [Troubleshooting](troubleshooting.md) - Command-related issues

---

[← API Reference](api.md) | [Testing →](testing.md)