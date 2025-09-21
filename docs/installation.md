# Installation

This guide will walk you through the complete installation process for POSMID, including system requirements, dependencies, and initial setup.

## System Requirements

### Server Requirements
- **PHP**: 8.1 or higher (recommended: 8.2+)
- **Composer**: 2.0 or higher
- **Node.js**: 16.0 or higher (recommended: 18.x+)
- **npm**: 7.0 or higher (comes with Node.js)

### Database
- **PostgreSQL**: 12.0 or higher (recommended: 15.x+)
- **MySQL**: 8.0 or higher (alternative, but PostgreSQL preferred for multi-tenancy)

### Operating System
- **Linux**: Ubuntu 20.04+, CentOS 8+, or similar
- **macOS**: 10.15+ (Catalina or later)
- **Windows**: 10+ with WSL2 (recommended) or native Windows

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/posmid.git
cd posmid
```

Replace `your-org` with your actual GitHub organization or username.

### 2. Install PHP Dependencies

```bash
composer install
```

This will install all required PHP packages including Laravel framework, Sanctum for authentication, spatie/laravel-permission for authorization, and cebe/php-openapi for API validation.

**Common Issues:**
- If you encounter memory issues, run: `php -d memory_limit=-1 /usr/local/bin/composer install`
- Ensure PHP extensions are installed: `pdo`, `pdo_pgsql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`

### 3. Install Frontend Dependencies

```bash
npm install
```

This installs React, TypeScript, Vite, and other frontend dependencies. The process may take several minutes.

### 4. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
APP_NAME="POSMID"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_TIMEZONE=UTC
APP_URL=http://localhost

# Database Configuration
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=posmid
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

# Multi-tenancy (if using PostgreSQL schemas)
DB_TENANT_CONNECTION=pgsql
DB_TENANT_HOST=127.0.0.1
DB_TENANT_PORT=5432
DB_TENANT_DATABASE=posmid_tenant
DB_TENANT_USERNAME=your_db_user
DB_TENANT_PASSWORD=your_db_password

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1
SANCTUM_GUARD=web

# OpenAPI Configuration
OPENAPI_SPEC_PATH=openapi.yaml
OPENAPI_VALIDATE_REQUEST=true
OPENAPI_VALIDATE_RESPONSE=true
```

**Parameter Details:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `APP_NAME` | string | "POSMID" | Application display name |
| `APP_ENV` | string | local | Environment (local, staging, production) |
| `APP_KEY` | string | (auto-generated) | Laravel application key for encryption |
| `APP_DEBUG` | boolean | true | Enable debug mode for development |
| `APP_TIMEZONE` | string | UTC | Application timezone |
| `APP_URL` | string | http://localhost | Base application URL |
| `DB_CONNECTION` | string | pgsql | Database driver (pgsql, mysql) |
| `DB_HOST` | string | 127.0.0.1 | Database host |
| `DB_PORT` | string | 5432 | Database port (5432 for PostgreSQL, 3306 for MySQL) |
| `DB_DATABASE` | string | posmid | Main database name |
| `DB_USERNAME` | string | - | Database username |
| `DB_PASSWORD` | string | - | Database password |
| `SANCTUM_STATEFUL_DOMAINS` | string | localhost,127.0.0.1 | Domains for Sanctum authentication |
| `OPENAPI_SPEC_PATH` | string | openapi.yaml | Path to OpenAPI specification file |
| `OPENAPI_VALIDATE_REQUEST` | boolean | true | Enable request validation against OpenAPI spec |
| `OPENAPI_VALIDATE_RESPONSE` | boolean | true | Enable response validation against OpenAPI spec |

### 5. Generate Application Key

```bash
php artisan key:generate
```

This generates a unique `APP_KEY` for your application.

### 6. Database Setup

#### Create Database
Create the required databases in PostgreSQL:

```sql
CREATE DATABASE posmid;
CREATE DATABASE posmid_tenant;
```

#### Run Migrations

```bash
php artisan migrate
```

This creates all necessary tables including:
- Users and authentication tables
- Tenants table for multi-tenancy
- Products, categories, customers, orders tables
- Permission tables (via spatie/laravel-permission)

#### Seed Database (Optional)

```bash
php artisan db:seed
```

This populates the database with sample data including permissions, roles, and demo users.

### 7. Build Frontend Assets

For development:
```bash
npm run dev
```

For production:
```bash
npm run build
```

### 8. Start the Application

Use the custom POSMID command:

```bash
# Backend only
php artisan posmid:run

# Backend + Frontend development
php artisan posmid:run --frontend=dev

# Build frontend and start backend
php artisan posmid:run --frontend=build
```

See [Commands](commands.md) for detailed usage.

## Verification

After installation, verify everything is working:

1. **Backend**: Visit `http://localhost:8000/api/health` (should return JSON status)
2. **Frontend**: If using `--frontend=dev`, visit `http://localhost:5173`
3. **Tests**: Run `php artisan test` (should pass all tests)

## Post-Installation Tasks

### 1. Configure Permissions
Ensure proper file permissions:

```bash
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 2. Setup Queue Worker (if needed)

```bash
php artisan queue:work
```

### 3. Configure Web Server

For production deployment, configure your web server (Apache/Nginx) to point to the `public` directory.

### 4. SSL Certificate

For production, obtain and install SSL certificates for HTTPS.

## Troubleshooting

### Common Issues

**Composer Install Fails:**
- Check PHP version: `php --version`
- Verify extensions: `php -m | grep -E "(pdo|mbstring|openssl)"`
- Clear cache: `composer clear-cache`

**Database Connection Error:**
- Verify PostgreSQL is running
- Check credentials in `.env`
- Test connection: `psql -h 127.0.0.1 -U your_user -d posmid`

**Frontend Build Fails:**
- Check Node.js version: `node --version`
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Permission Errors:**
- Run commands as appropriate user (not root)
- Check file ownership and permissions

### Getting Help

If you encounter issues not covered here:
1. Check the [Troubleshooting](troubleshooting.md) section
2. Review Laravel logs: `storage/logs/laravel.log`
3. Check browser console for frontend errors
4. Verify all requirements are met

## Next Steps

Once installed, you can:
- [Configure](configuration.md) advanced settings
- Explore the [API Reference](api.md)
- Set up [Authentication](authentication.md)
- Run [Tests](testing.md)

---

[← Back to Index](index.md) | [Configuration →](configuration.md)