# Troubleshooting

This guide helps you diagnose and resolve common issues with POSMID. Follow the systematic approach to identify and fix problems.

## Quick Diagnosis

### System Health Check

Run the POSMID health check command:

```bash
php artisan posmid:health
```

This will check:
- Database connectivity
- Redis connection
- File permissions
- OpenAPI validation
- Pending migrations

### Log Analysis

Check Laravel logs for errors:

```bash
# View recent errors
tail -f storage/logs/laravel.log

# Search for specific errors
grep "ERROR" storage/logs/laravel.log

# Check PHP error logs
tail -f /var/log/php8.1-fpm.log
```

### Common Issues & Solutions

## Installation Issues

### Composer Install Fails

**Symptoms:**
- `composer install` hangs or fails
- Memory exhaustion errors
- Package conflicts

**Solutions:**

```bash
# Clear Composer cache
composer clear-cache

# Increase memory limit
php -d memory_limit=-1 composer install

# Update Composer
composer self-update

# Check PHP version compatibility
php --version
composer show --platform
```

### Database Connection Errors

**Symptoms:**
- `SQLSTATE[08006]` or similar connection errors
- Migration failures

**Solutions:**

```bash
# Test database connection
php artisan tinker
DB::connection()->getPdo()

# Check database credentials in .env
cat .env | grep DB_

# Verify PostgreSQL is running
sudo systemctl status postgresql

# Test connection manually
psql -h 127.0.0.1 -U posmid_user -d posmid
```

### Permission Errors

**Symptoms:**
- `Permission denied` errors
- Cannot write to storage directory

**Solutions:**

```bash
# Set proper ownership
sudo chown -R www-data:www-data storage bootstrap/cache

# Set proper permissions
sudo chmod -R 755 storage bootstrap/cache
sudo chmod -R 775 storage/logs

# For development (less secure)
sudo chmod -R 777 storage bootstrap/cache
```

## Runtime Issues

### 500 Internal Server Error

**Symptoms:**
- Blank white page
- `HTTP 500` status code
- Laravel debug page not showing

**Debug Steps:**

1. **Enable Debug Mode:**
   ```env
   APP_DEBUG=true
   APP_ENV=local
   ```

2. **Check Error Logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

3. **Clear Caches:**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   php artisan view:clear
   php artisan route:clear
   ```

4. **Check File Permissions:**
   ```bash
   ls -la storage/
   ls -la bootstrap/cache/
   ```

5. **Verify PHP Extensions:**
   ```bash
   php -m | grep -E "(pdo|mbstring|openssl|tokenizer)"
   ```

### Authentication Issues

**Symptoms:**
- Cannot login
- Invalid token errors
- Sanctum authentication failures

**Solutions:**

```bash
# Clear Sanctum cache
php artisan config:clear

# Verify Sanctum configuration
php artisan tinker
config('sanctum.stateful')

# Check token existence
$user = App\Models\User::find(1);
$user->tokens()->get()

# Verify CORS settings
cat config/cors.php
```

**Frontend Authentication Issues:**

```javascript
// Check browser console for CORS errors
// Verify token storage
localStorage.getItem('token')

// Check API endpoints
fetch('/api/user', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
```

### Database Issues

#### Slow Queries

**Symptoms:**
- Slow page loads
- Timeout errors
- High CPU usage

**Solutions:**

```bash
# Enable query logging
php artisan tinker
DB::enableQueryLog()
// Run some queries
dd(DB::getQueryLog())

# Check slow queries
tail -f /var/log/postgresql/postgresql-*.log

# Analyze table performance
php artisan tinker
Schema::getConnection()->getDoctrineSchemaManager()->listTableIndexes('products')
```

#### Migration Issues

**Symptoms:**
- Migration fails to run
- Foreign key constraint errors

**Solutions:**

```bash
# Check migration status
php artisan migrate:status

# Rollback and retry
php artisan migrate:rollback --step=1
php artisan migrate

# Skip problematic migration
php artisan migrate --force

# Reset all migrations
php artisan migrate:fresh
```

### API Issues

#### OpenAPI Validation Errors

**Symptoms:**
- API requests fail validation
- Response format errors

**Solutions:**

```bash
# Validate OpenAPI spec
php artisan openapi:validate

# Check request/response formats
php artisan tinker
// Test API validation
$response = $this->post('/api/products', ['invalid' => 'data']);
$response->getStatusCode()

# Update OpenAPI spec
php artisan openapi:generate
```

#### CORS Issues

**Symptoms:**
- Frontend cannot connect to API
- `CORS error` in browser console

**Solutions:**

```bash
# Check CORS configuration
cat config/cors.php

# Verify frontend domain in Sanctum config
php artisan tinker
config('sanctum.stateful')

# Test CORS headers
curl -I -H "Origin: http://localhost:5173" http://localhost:8000/api/user
```

## Frontend Issues

### Build Failures

**Symptoms:**
- `npm run build` fails
- Vite errors

**Solutions:**

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Check Node.js version
node --version
npm --version

# Update dependencies
npm update
```

### Hot Reload Not Working

**Symptoms:**
- Changes not reflected in browser
- Vite dev server issues

**Solutions:**

```bash
# Restart dev server
# Ctrl+C to stop, then:
npm run dev

# Clear browser cache
# Hard refresh: Ctrl+F5 or Cmd+Shift+R

# Check Vite config
cat vite.config.ts

# Verify file watching
lsof -i :5173
```

### React Component Errors

**Symptoms:**
- Component not rendering
- JavaScript errors in console

**Debug Steps:**

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

2. **Verify Component Structure:**
   ```typescript
   // Check for missing imports
   import React from 'react';

   // Verify prop types
   interface Props {
     user?: User;
   }
   ```

3. **Test API Integration:**
   ```typescript
   // Check API client
   console.log('API Base URL:', apiClient.baseURL);

   // Test authentication
   console.log('Token:', localStorage.getItem('token'));
   ```

## Performance Issues

### Slow Page Loads

**Symptoms:**
- Pages take >3 seconds to load
- High server resource usage

**Optimization Steps:**

```bash
# Enable OPcache
php -m | grep opcache

# Check caching
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Optimize Composer
composer install --optimize-autoloader

# Database optimization
php artisan tinker
DB::select('EXPLAIN ANALYZE SELECT * FROM products LIMIT 10');
```

### Memory Issues

**Symptoms:**
- `Allowed memory size exhausted` errors
- PHP-FPM restarts frequently

**Solutions:**

```bash
# Increase PHP memory limit
php -i | grep memory_limit

# Edit php.ini
sudo nano /etc/php/8.1/fpm/php.ini
memory_limit = 512M

# Restart PHP-FPM
sudo systemctl restart php8.1-fpm

# Check for memory leaks in code
# Use Laravel Debugbar for memory usage
composer require barryvdh/laravel-debugbar
```

### High CPU Usage

**Symptoms:**
- Server CPU consistently >80%
- Slow response times

**Debug Steps:**

```bash
# Check processes
top -c

# Monitor PHP-FPM
sudo systemctl status php8.1-fpm

# Check database connections
php artisan tinker
DB::select('SELECT count(*) FROM pg_stat_activity');

# Review slow queries
# Enable PostgreSQL logging
sudo nano /etc/postgresql/15/main/postgresql.conf
log_min_duration_statement = 1000  # Log queries > 1s
sudo systemctl restart postgresql
```

## Multi-Tenant Issues

### Tenant Resolution Failures

**Symptoms:**
- Wrong tenant data displayed
- Tenant not found errors

**Solutions:**

```bash
# Check tenant resolution
php artisan tinker
$tenant = App\Models\Tenant::where('domain', 'tenant1.posmid.com')->first();
dd($tenant);

# Verify middleware
php artisan route:list --middleware=tenant

# Check tenant database connection
php artisan tinker
config('database.connections.tenant.database');
DB::connection('tenant')->getPdo();
```

### Data Isolation Problems

**Symptoms:**
- Data from wrong tenant visible
- Cross-tenant data leakage

**Solutions:**

```bash
# Check global scopes
php artisan tinker
$user = App\Models\User::first();
$user->getGlobalScopes();

# Verify query constraints
DB::enableQueryLog();
$users = App\Models\User::all();
dd(DB::getQueryLog());

# Check tenant context
php artisan tinker
app('tenant') // Should show current tenant
```

## Testing Issues

### Test Failures

**Symptoms:**
- Tests pass locally but fail in CI
- Intermittent test failures

**Solutions:**

```bash
# Run tests with verbose output
php artisan test -v

# Run specific test
php artisan test --filter=ProductTest

# Check test database
php artisan tinker --env=testing
DB::connection()->getDatabaseName()

# Clear test caches
php artisan config:clear --env=testing
```

### Database Seeding Issues

**Symptoms:**
- Seeders fail to run
- Duplicate data errors

**Solutions:**

```bash
# Refresh database
php artisan migrate:fresh

# Run seeders individually
php artisan db:seed --class=PermissionSeeder

# Check seeder classes
php artisan tinker
$seeder = new Database\Seeders\PermissionSeeder();
$seeder->run();
```

## Security Issues

### Permission Errors

**Symptoms:**
- Users can access unauthorized resources
- Permission checks failing

**Solutions:**

```bash
# Clear permission cache
php artisan permission:cache-reset

# Verify user permissions
php artisan tinker
$user = App\Models\User::find(1);
$user->getAllPermissions();
$user->getRoleNames();

# Check permission definitions
Spatie\Permission\Models\Permission::all();
```

### CSRF Issues

**Symptoms:**
- Form submissions fail with CSRF errors
- `419 Page Expired` errors

**Solutions:**

```bash
# Check CSRF configuration
php artisan tinker
config('session.domain');
config('sanctum.stateful');

# Verify session configuration
cat config/session.php

# Clear session data
php artisan cache:clear
```

## Deployment Issues

### Environment Configuration

**Symptoms:**
- Production behaves differently than staging
- Environment variables not loaded

**Solutions:**

```bash
# Check environment file
cat .env

# Verify environment loading
php artisan tinker
app()->environment()
config('app.env')

# Clear configuration cache
php artisan config:clear
php artisan config:cache
```

### Build Issues

**Symptoms:**
- Assets not loading in production
- Build process fails

**Solutions:**

```bash
# Check build process
npm run build

# Verify asset URLs
php artisan tinker
config('app.asset_url')

# Clear compiled assets
php artisan view:clear
rm -rf public/build/*
```

## Advanced Debugging

### Laravel Debugbar

Install for detailed debugging:

```bash
composer require barryvdh/laravel-debugbar --dev
```

This provides:
- Database query monitoring
- Route information
- Memory usage
- Request timeline

### Xdebug Setup

For step-through debugging:

```bash
# Install Xdebug
sudo apt install php8.1-xdebug

# Configure Xdebug
sudo nano /etc/php/8.1/mods-available/xdebug.ini
```

```ini
zend_extension=xdebug.so
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_host=127.0.0.1
xdebug.client_port=9003
xdebug.idekey=VSCODE
```

### Profiling

Use Blackfire for performance profiling:

```bash
# Install Blackfire agent
# Follow: https://blackfire.io/docs/up-and-running/installation

# Profile a request
blackfire curl http://localhost:8000/api/products
```

## Getting Help

### Information to Provide

When seeking help, include:

1. **Error Messages:** Exact error text
2. **Environment:** OS, PHP version, Laravel version
3. **Steps to Reproduce:** Detailed reproduction steps
4. **Logs:** Relevant log entries
5. **Configuration:** Relevant config files (anonymized)

### Community Resources

- **Laravel Documentation:** https://laravel.com/docs
- **POSMID Issues:** GitHub repository issues
- **Laravel Forums:** https://laracasts.com/discussions
- **Stack Overflow:** Tag with `laravel`, `posmid`

### Professional Support

For enterprise support:
- Contact the development team
- Check service level agreements
- Review support documentation

## Prevention

### Best Practices

1. **Regular Backups:** Automate database backups
2. **Monitoring:** Set up error monitoring and alerts
3. **Testing:** Run comprehensive test suites before deployment
4. **Code Reviews:** Implement peer code reviews
5. **Documentation:** Keep runbooks and troubleshooting guides updated

### Maintenance Schedule

- **Daily:** Check logs and system health
- **Weekly:** Update dependencies and security patches
- **Monthly:** Performance reviews and optimization
- **Quarterly:** Major updates and infrastructure reviews

---

[← Deployment](deployment.md) | [Requirements →](requirements.md)