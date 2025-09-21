# Deployment

This guide covers deploying POSMID to production environments, including server setup, configuration, and best practices for reliable deployments.

## Prerequisites

### Server Requirements

- **Operating System**: Ubuntu 20.04 LTS or CentOS 8+
- **Web Server**: Nginx or Apache
- **PHP**: 8.1+ with required extensions
- **Database**: PostgreSQL 12+
- **Node.js**: 16+ (for building assets)
- **SSL Certificate**: Valid SSL certificate

### Hardware Requirements

- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recommended)
- **Storage**: 20GB+ SSD
- **Network**: 100Mbps+ connection

## Deployment Options

### Option 1: Single Server Deployment

For small to medium applications with low traffic.

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx postgresql postgresql-contrib redis-server \
                    php8.1 php8.1-fpm php8.1-cli php8.1-pgsql php8.1-redis \
                    php8.1-mbstring php8.1-xml php8.1-curl php8.1-zip \
                    nodejs npm git unzip

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

#### 2. Database Setup

```bash
# Create PostgreSQL user and database
sudo -u postgres psql

CREATE USER posmid_user WITH PASSWORD 'secure_password';
CREATE DATABASE posmid OWNER posmid_user;
CREATE DATABASE posmid_tenant OWNER posmid_user;
GRANT ALL PRIVILEGES ON DATABASE posmid TO posmid_user;
GRANT ALL PRIVILEGES ON DATABASE posmid_tenant TO posmid_user;
\q
```

#### 3. Application Deployment

```bash
# Clone application
cd /var/www
sudo git clone https://github.com/your-org/posmid.git
cd posmid

# Install dependencies
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# Environment configuration
cp .env.example .env
nano .env  # Configure production settings

# Generate keys and cache
php artisan key:generate
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations and seeders
php artisan migrate --force
php artisan db:seed --force
```

#### 4. Web Server Configuration

**Nginx Configuration (/etc/nginx/sites-available/posmid):**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/posmid/public;
    index index.php index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # PHP handling
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend routing (for SPA)
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # API routes
    location /api/ {
        try_files $uri $uri/ /index.php?$query_string;

        # API-specific settings
        client_max_body_size 10M;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ \.(env|git) {
        deny all;
    }
}
```

**Enable site and SSL:**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/posmid /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Install Certbot for SSL
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

#### 5. Process Management

**Supervisor for Queue Workers:**

```bash
sudo apt install supervisor

# Create supervisor config
sudo nano /etc/supervisor/conf.d/posmid-worker.conf
```

**/etc/supervisor/conf.d/posmid-worker.conf:**
```ini
[program:posmid-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/posmid/artisan queue:work --sleep=3 --tries=3 --max-jobs=1000
directory=/var/www/posmid
user=www-data
numprocs=2
priority=999
autostart=true
autorestart=true
startretries=3
stdout_logfile=/var/www/posmid/storage/logs/worker.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start posmid-worker:*
```

### Option 2: Docker Deployment

For containerized deployments with Docker Compose.

#### Docker Compose Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: posmid-app
    restart: unless-stopped
    working_dir: /var/www
    volumes:
      - ./:/var/www
      - ./docker/php/local.ini:/usr/local/etc/php/conf.d/local.ini
    networks:
      - posmid

  nginx:
    image: nginx:alpine
    container_name: posmid-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./:/var/www
      - ./docker/nginx/conf.d/:/etc/nginx/conf.d/
    networks:
      - posmid

  db:
    image: postgres:15-alpine
    container_name: posmid-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: posmid
      POSTGRES_USER: posmid
      POSTGRES_PASSWORD: posmid_password
    volumes:
      - posmid_db_data:/var/lib/postgresql/data
    networks:
      - posmid

  redis:
    image: redis:alpine
    container_name: posmid-redis
    restart: unless-stopped
    networks:
      - posmid

volumes:
  posmid_db_data:

networks:
  posmid:
    driver: bridge
```

**Dockerfile:**
```dockerfile
FROM php:8.1-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    curl-dev \
    libxml2-dev \
    linux-headers \
    nodejs \
    npm

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql mbstring zip exif pcntl bcmath

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy application
COPY . /var/www

# Install dependencies
RUN composer install --no-dev --optimize-autoloader
RUN npm ci && npm run build

# Set permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
```

**Deploy with Docker:**

```bash
# Build and start services
docker-compose up -d --build

# Run migrations
docker-compose exec app php artisan migrate --force
docker-compose exec app php artisan db:seed --force

# Generate optimized assets
docker-compose exec app php artisan config:cache
docker-compose exec app php artisan route:cache
docker-compose exec app php artisan view:cache
```

## Environment Configuration

### Production .env

```env
APP_NAME=POSMID
APP_ENV=production
APP_KEY=base64:generated_key_here
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=posmid
DB_USERNAME=posmid_user
DB_PASSWORD=secure_password

# Cache & Sessions
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls

# Logging
LOG_CHANNEL=daily
LOG_LEVEL=error

# Security
SANCTUM_STATEFUL_DOMAINS=https://your-domain.com
```

## SSL and Security

### SSL Configuration

```bash
# Using Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Hardening

**PHP Configuration (/etc/php/8.1/fpm/php.ini):**
```ini
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php_errors.log
upload_max_filesize = 10M
post_max_size = 10M
memory_limit = 256M
max_execution_time = 300
```

**File Permissions:**
```bash
# Set proper ownership
sudo chown -R www-data:www-data /var/www/posmid

# Secure sensitive files
sudo chmod 600 /var/www/posmid/.env
sudo chmod 600 /var/www/posmid/storage/logs
sudo chmod 755 /var/www/posmid/storage
```

## Performance Optimization

### Application Optimization

```bash
# Optimize Composer autoloader
composer install --no-dev --optimize-autoloader

# Cache Laravel configurations
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Optimize for production
php artisan optimize
```

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_products_category_id ON products (category_id);
CREATE INDEX CONCURRENTLY idx_products_sku ON products (sku);
CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders (customer_id);
CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders (created_at);

-- Analyze tables for query optimization
ANALYZE products;
ANALYZE orders;
ANALYZE customers;
```

### Caching Strategy

```php
// Cache frequently accessed data
Cache::remember('categories', 3600, function () {
    return Category::active()->get();
});

// Cache user permissions
$user->load('roles.permissions');
Cache::put("user_permissions_{$user->id}", $user->permissions, 3600);
```

## Monitoring and Logging

### Application Monitoring

**Laravel Telescope (Development):**
```bash
composer require laravel/telescope
php artisan telescope:install
php artisan migrate
```

**Production Monitoring:**
- Set up error tracking (Sentry, Bugsnag)
- Monitor application performance (New Relic, Blackfire)
- Log aggregation (ELK stack, Papertrail)

### Server Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nload

# Monitor logs
tail -f /var/www/posmid/storage/logs/laravel.log

# Check PHP-FPM status
sudo systemctl status php8.1-fpm

# Monitor database
sudo -u postgres psql -d posmid -c "SELECT * FROM pg_stat_activity;"
```

## Backup Strategy

### Database Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# /usr/local/bin/posmid-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/posmid"
DB_NAME="posmid"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U posmid_user -h localhost $DB_NAME > $BACKUP_DIR/${DB_NAME}_${DATE}.sql

# Compress backup
gzip $BACKUP_DIR/${DB_NAME}_${DATE}.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Optional: Upload to cloud storage
# aws s3 cp $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz s3://your-backup-bucket/
```

**Schedule Backup:**
```bash
# Add to crontab
sudo crontab -e
# 0 2 * * * /usr/local/bin/posmid-backup.sh
```

### Application Backup

```bash
# Backup application files
tar -czf /var/backups/posmid/app_$(date +%Y%m%d).tar.gz \
    --exclude='storage/logs/*' \
    --exclude='storage/framework/cache/*' \
    --exclude='storage/framework/sessions/*' \
    /var/www/posmid
```

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or AWS ALB for multiple app servers
2. **Database Read Replicas**: Offload read queries to replica databases
3. **Redis Cluster**: Scale Redis for caching and sessions
4. **CDN**: Use CloudFront or similar for static assets

### Vertical Scaling

1. **Increase Server Resources**: More CPU, RAM based on monitoring
2. **Database Optimization**: Query optimization, indexing, partitioning
3. **Caching**: Implement aggressive caching strategies
4. **Queue Processing**: Move heavy tasks to background queues

## Deployment Automation

### GitHub Actions CI/CD

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.1'

      - name: Install dependencies
        run: composer install --no-dev --optimize-autoloader

      - name: Build assets
        run: npm ci && npm run build

      - name: Run tests
        run: php artisan test

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/posmid
            git pull origin main
            composer install --no-dev --optimize-autoloader
            npm ci && npm run build
            php artisan migrate --force
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache
            sudo systemctl reload nginx
```

### Laravel Envoy

**Envoy.blade.php:**
```php
@servers(['web' => 'user@your-server.com'])

@task('deploy')
    cd /var/www/posmid
    git pull origin main
    composer install --no-dev --optimize-autoloader
    npm ci && npm run build
    php artisan migrate --force
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    sudo systemctl reload nginx
@endtask
```

**Deploy:**
```bash
envoy run deploy
```

## Troubleshooting

### Common Deployment Issues

1. **Permission Errors**: Check file ownership and permissions
2. **Database Connection**: Verify credentials and database existence
3. **Asset Loading**: Check file paths and permissions
4. **SSL Issues**: Verify certificate installation and renewal
5. **Performance Problems**: Monitor resources and optimize queries

### Rollback Strategy

```bash
# Quick rollback script
#!/bin/bash
cd /var/www/posmid
git reset --hard HEAD~1
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate:rollback
php artisan config:cache
sudo systemctl reload nginx
```

## Maintenance

### Zero-Downtime Deployment

1. **Blue-Green Deployment**: Deploy to staging, then switch traffic
2. **Rolling Updates**: Update servers one by one
3. **Feature Flags**: Enable/disable features without redeployment
4. **Database Migrations**: Test migrations before deployment

### Health Checks

```php
// routes/web.php
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
        'checks' => [
            'database' => DB::connection()->getPdo() ? 'ok' : 'error',
            'redis' => Cache::store('redis')->getStore() ? 'ok' : 'error',
            'storage' => is_writable(storage_path()) ? 'ok' : 'error',
        ]
    ]);
});
```

## Next Steps

- [Monitoring](monitoring.md) - Set up comprehensive monitoring
- [Security](security.md) - Implement security best practices
- [Scaling](scaling.md) - Plan for growth and high traffic

---

[← Multi-Tenancy](multi-tenancy.md) | [Troubleshooting →](troubleshooting.md)