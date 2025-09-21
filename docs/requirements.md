# Requirements

This document outlines the system requirements, dependencies, and prerequisites for running POSMID successfully.

## Server Requirements

### Minimum Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| **PHP** | 8.1.0+ | 8.2+ recommended for optimal performance |
| **Composer** | 2.0+ | PHP dependency manager |
| **Node.js** | 16.0+ | 18.x+ recommended |
| **npm** | 7.0+ | Comes with Node.js |
| **Database** | PostgreSQL 12+ or MySQL 8.0+ | PostgreSQL preferred for multi-tenancy |
| **Web Server** | Nginx or Apache | Nginx recommended |

### Operating System Support

#### Linux (Recommended)
- **Ubuntu**: 20.04 LTS, 22.04 LTS
- **CentOS/RHEL**: 8.x, 9.x
- **Debian**: 11.x, 12.x
- **Alpine Linux**: 3.15+ (for Docker)

#### macOS (Development)
- **macOS**: 10.15+ (Catalina or later)
- **Homebrew**: Latest version for package management

#### Windows (Development)
- **Windows**: 10+ with WSL2
- **WSL2**: Ubuntu 20.04+ distribution

### Hardware Requirements

#### Minimum (Development)
- **CPU**: 1 core
- **RAM**: 2GB
- **Storage**: 5GB free space
- **Network**: 10Mbps internet connection

#### Recommended (Production - Small)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 100Mbps connection

#### Production (Medium)
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: 1Gbps connection

#### Enterprise (Large)
- **CPU**: 8+ cores
- **RAM**: 16GB+
- **Storage**: 100GB+ SSD with RAID
- **Network**: 10Gbps connection

## PHP Requirements

### Required Extensions

POSMID requires the following PHP extensions:

| Extension | Purpose | Installation |
|-----------|---------|--------------|
| `pdo` | Database abstraction | Usually included |
| `pdo_pgsql` | PostgreSQL database driver | `apt install php8.1-pgsql` |
| `pdo_mysql` | MySQL database driver | `apt install php8.1-mysql` |
| `mbstring` | Multi-byte string support | `apt install php8.1-mbstring` |
| `openssl` | SSL/TLS support | Usually included |
| `tokenizer` | PHP tokenization | Usually included |
| `xml` | XML processing | `apt install php8.1-xml` |
| `ctype` | Character type checking | Usually included |
| `json` | JSON processing | Usually included |
| `bcmath` | Arbitrary precision mathematics | `apt install php8.1-bcmath` |
| `curl` | HTTP requests | `apt install php8.1-curl` |
| `zip` | ZIP file handling | `apt install php8.1-zip` |

### Optional Extensions (Recommended)

| Extension | Purpose | Benefits |
|-----------|---------|----------|
| `opcache` | PHP opcode caching | Significant performance improvement |
| `redis` | Redis support | Better caching and sessions |
| `xdebug` | Debugging | Development debugging support |
| `intl` | Internationalization | Better locale support |

### PHP Configuration

Recommended `php.ini` settings:

```ini
; Memory and execution
memory_limit = 256M          ; Minimum 128M, 256M+ recommended
max_execution_time = 300     ; 300 seconds for long-running tasks
max_input_time = 300         ; For large file uploads

; File uploads
upload_max_filesize = 10M    ; Maximum upload size
post_max_size = 10M          ; Maximum POST data size
max_file_uploads = 20        ; Maximum number of files

; Security
expose_php = Off             ; Don't expose PHP version
display_errors = Off         ; Don't display errors in production
log_errors = On              ; Log errors instead
error_log = /var/log/php_errors.log

; Performance
opcache.enable = 1           ; Enable OPcache
opcache.memory_consumption = 256
opcache.max_accelerated_files = 7963
opcache.revalidate_freq = 0

; Sessions
session.gc_maxlifetime = 7200 ; 2 hours
session.cookie_secure = 1     ; HTTPS only in production
session.cookie_httponly = 1   ; Prevent XSS
```

## Database Requirements

### PostgreSQL Configuration

For optimal performance with POSMID:

```sql
-- postgresql.conf settings
shared_buffers = 256MB              ; 25% of RAM
effective_cache_size = 1GB          ; 75% of RAM
maintenance_work_mem = 64MB         ; For VACUUM and CREATE INDEX
checkpoint_completion_target = 0.9  ; Spread checkpoint I/O
wal_buffers = 16MB                  ; WAL buffer size
default_statistics_target = 100     ; Statistics target

-- Connection settings
max_connections = 100               ; Maximum connections
work_mem = 4MB                      ; Memory per connection for sorts
temp_file_limit = 1GB               ; Limit temp file usage
```

### MySQL Configuration (Alternative)

```ini
[mysqld]
innodb_buffer_pool_size = 1G        ; 70% of RAM
innodb_log_file_size = 256M         ; Redo log size
innodb_flush_log_at_trx_commit = 1  ; ACID compliance
max_connections = 100               ; Maximum connections
query_cache_size = 64M              ; Query cache
tmp_table_size = 128M               ; Temp table size
max_heap_table_size = 128M          ; Memory table size
```

### Database Permissions

Required database user permissions:

```sql
-- PostgreSQL
GRANT CONNECT ON DATABASE posmid TO posmid_user;
GRANT USAGE ON SCHEMA public TO posmid_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO posmid_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO posmid_user;

-- Grant permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO posmid_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO posmid_user;
```

## Web Server Configuration

### Nginx Configuration

Recommended Nginx configuration for POSMID:

```nginx
# /etc/nginx/sites-available/posmid
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/posmid/public;
    index index.php;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;

    # PHP handling
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # API routes
    location /api/ {
        try_files $uri $uri/ /index.php?$query_string;
        client_max_body_size 10M;
    }

    # Deny access to sensitive files
    location ~ /\.(?!well-known).* {
        deny all;
    }
    location ~ \.(env|git|htaccess|htpasswd)$ {
        deny all;
    }
}
```

### Apache Configuration (Alternative)

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/posmid/public

    <Directory /var/www/posmid/public>
        AllowOverride All
        Require all granted

        # Security headers
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set X-XSS-Protection "1; mode=block"
        Header always set X-Content-Type-Options "nosniff"
        Header always set Referrer-Policy "strict-origin-when-downgrade"

        # PHP settings
        php_value upload_max_filesize 10M
        php_value post_max_size 10M
        php_value memory_limit 256M
        php_value max_execution_time 300
    </Directory>

    # API specific settings
    <Location /api>
        LimitRequestBody 10485760  # 10MB
    </Location>

    ErrorLog ${APACHE_LOG_DIR}/posmid_error.log
    CustomLog ${APACHE_LOG_DIR}/posmid_access.log combined
</VirtualHost>
```

## Node.js and Frontend Requirements

### Node.js Packages

POSMID requires specific versions of frontend dependencies:

```json
{
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=7.0.0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@types/react": "^18.0.0",
    "typescript": "^4.9.0",
    "vite": "^4.0.0",
    "@vitejs/plugin-react": "^3.0.0",
    "tailwindcss": "^3.2.0",
    "axios": "^1.3.0"
  }
}
```

### Build Requirements

For building frontend assets:

- **Minimum RAM**: 512MB for compilation
- **Disk Space**: 500MB for node_modules
- **Network**: Required for npm package downloads

## Security Requirements

### SSL/TLS Certificate

For production deployments:

- **Certificate Authority**: Let's Encrypt (free) or commercial CA
- **Key Size**: RSA 2048-bit or ECDSA P-256
- **Protocols**: TLS 1.2+ only
- **Ciphers**: Modern cipher suites only

### Firewall Configuration

Required open ports:

| Port | Protocol | Purpose | Access |
|------|----------|---------|--------|
| 22 | TCP | SSH | Admin only |
| 80 | TCP | HTTP | Public |
| 443 | TCP | HTTPS | Public |
| 5432 | TCP | PostgreSQL | Local only |
| 6379 | TCP | Redis | Local only |

Example UFW configuration:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## Caching and Session Storage

### Redis Requirements

For optimal performance:

- **Redis**: 6.0+
- **Memory**: 256MB+ (based on cache size)
- **Persistence**: RDB or AOF enabled
- **Security**: Password authentication enabled

### File System Permissions

Required permissions for Laravel:

```bash
# Application directories
chown -R www-data:www-data /var/www/posmid
chmod -R 755 /var/www/posmid

# Storage directories
chmod -R 775 /var/www/posmid/storage
chmod -R 775 /var/www/posmid/bootstrap/cache

# Environment file
chmod 600 /var/www/posmid/.env
```

## Development Environment

### Local Development Tools

Recommended tools for development:

- **IDE**: VS Code, PHPStorm, or Sublime Text
- **Version Control**: Git 2.0+
- **API Testing**: Postman or Insomnia
- **Database Tools**: pgAdmin, DBeaver, or TablePlus
- **Browser**: Chrome/Edge with DevTools

### Docker (Optional)

For containerized development:

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: php:8.1-fpm
    volumes:
      - .:/var/www
    environment:
      - APP_ENV=local
      - DB_HOST=db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: posmid
      POSTGRES_USER: posmid
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
```

## Performance Benchmarks

### Baseline Performance

Expected performance metrics:

- **API Response Time**: <200ms for simple requests
- **Page Load Time**: <2s for initial page load
- **Database Query Time**: <50ms for typical queries
- **Concurrent Users**: 100+ simultaneous users
- **Throughput**: 1000+ requests per minute

### Scaling Considerations

For higher loads:

- **Load Balancer**: Nginx or AWS ALB
- **Database**: Read replicas for SELECT queries
- **Cache**: Redis cluster for distributed caching
- **CDN**: CloudFront for static assets
- **Queue**: Separate queue workers for background jobs

## Compatibility Matrix

### Laravel Versions

| POSMID Version | Laravel Version | PHP Version | Support Status |
|----------------|-----------------|-------------|----------------|
| 1.0.x | 10.x | 8.1+ | Current |
| 0.9.x | 9.x | 8.0+ | Legacy |

### Database Compatibility

| Database | Version | Multi-Tenant | Full Support |
|----------|---------|--------------|-------------|
| PostgreSQL | 12+ | ✅ | ✅ |
| PostgreSQL | 10-11 | ⚠️ | Limited |
| MySQL | 8.0+ | ❌ | ✅ |
| MySQL | 5.7 | ❌ | Legacy |

### Browser Support

| Browser | Version | Support Level |
|---------|---------|----------------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |
| IE | 11 | Not supported |

## Verification Script

Run this script to verify all requirements:

```bash
#!/bin/bash
# requirements-check.sh

echo "POSMID Requirements Check"
echo "========================="

# PHP Version
echo -n "PHP Version: "
php_version=$(php -r "echo PHP_VERSION;")
if php -r "echo version_compare(PHP_VERSION, '8.1.0', '>=') ? 'PASS' : 'FAIL';"; then
    echo "✅ PHP $php_version (8.1.0+ required)"
else
    echo "❌ PHP $php_version (8.1.0+ required)"
fi

# Required Extensions
extensions=("pdo" "mbstring" "openssl" "tokenizer" "xml" "ctype" "json" "bcmath")
for ext in "${extensions[@]}"; do
    if php -m | grep -q "^$ext$"; then
        echo "✅ PHP Extension: $ext"
    else
        echo "❌ PHP Extension: $ext"
    fi
done

# Composer
if command -v composer &> /dev/null; then
    composer_version=$(composer --version | grep -oP 'version \K[^\s]+')
    echo "✅ Composer $composer_version"
else
    echo "❌ Composer not found"
fi

# Node.js
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo "✅ Node.js $node_version"
else
    echo "❌ Node.js not found"
fi

# npm
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo "✅ npm $npm_version"
else
    echo "❌ npm not found"
fi

# PostgreSQL
if command -v psql &> /dev/null; then
    pg_version=$(psql --version | grep -oP 'psql \(PostgreSQL\) \K[^\s]+')
    echo "✅ PostgreSQL $pg_version"
else
    echo "⚠️  PostgreSQL not found (install or ensure remote access)"
fi

echo ""
echo "Note: This is a basic check. For production deployment,"
echo "ensure all security and performance requirements are met."
```

## Support and Updates

### Version Support Policy

- **Current Version**: Full support and updates
- **Previous Version**: Security updates only (6 months)
- **Legacy Versions**: No support (consult enterprise support)

### Update Requirements

When upgrading POSMID:

1. **Backup Database**: Always backup before upgrading
2. **Check Compatibility**: Verify PHP, Laravel, and dependency versions
3. **Test Updates**: Test in staging environment first
4. **Review Breaking Changes**: Check release notes for breaking changes
5. **Update Dependencies**: Update all Composer and npm packages

### Getting Help

If you encounter issues with requirements:

1. **Check this document** for the latest requirements
2. **Run the verification script** to identify missing components
3. **Review installation guides** for your specific platform
4. **Contact support** for enterprise deployments

---

[← Troubleshooting](troubleshooting.md) | [← Back to Index](index.md)