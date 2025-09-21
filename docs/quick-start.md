# Quick Start

Get POSMID up and running quickly with this step-by-step guide. This tutorial assumes you have the basic requirements installed.

## Prerequisites

Before starting, ensure you have:

- PHP 8.1+ installed
- Composer installed
- Node.js 16+ and npm installed
- PostgreSQL 12+ running
- Git installed

## 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/posmid.git
cd posmid

# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install
```

## 2. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

Edit `.env` with your database credentials:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=posmid
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

## 3. Database Setup

```bash
# Create database
createdb posmid

# Run migrations
php artisan migrate

# Seed initial data
php artisan db:seed
```

## 4. Build Assets

```bash
# Build frontend for production
npm run build
```

## 5. Start the Application

```bash
# Start both backend and frontend
php artisan posmid:run --frontend=dev
```

Your application will be available at:
- **Backend API**: http://localhost:8000
- **Frontend App**: http://localhost:5173

## 6. First Login

Visit the frontend application and login with the default admin account:

- **Email**: admin@posmid.test
- **Password**: password

## 7. Create Your First Product

1. Navigate to the Products section
2. Click "Create Product"
3. Fill in the form:
   - Name: "Coffee"
   - Price: 3.50
   - Category: Create "Beverages" first
   - Stock: 100

## 8. Test the API

Use tools like Postman or curl to test the API:

```bash
# Get products
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/products

# Create an order
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "items": [{"product_id": 1, "quantity": 2}]}' \
  http://localhost:8000/api/orders
```

## What's Next?

- **[Configure](configuration.md)** advanced settings
- **[Add users](authentication.md)** and set permissions
- **[Explore the API](api.md)** endpoints
- **[Run tests](testing.md)** to ensure everything works

## Troubleshooting

**Can't connect to database?**
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if database exists: `psql -l`

**Frontend not loading?**
- Check if Vite dev server is running
- Clear browser cache
- Check browser console for errors

**API returns 401?**
- Ensure you're sending the Authorization header
- Check token expiration
- Verify user has required permissions

**Permission denied errors?**
- Run `php artisan permission:cache-reset`
- Check user roles and permissions
- Clear application cache

---

[← Index](index.md) | [Installation →](installation.md)