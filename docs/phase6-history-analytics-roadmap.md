# Phase 6 Enhancement: Product History & Analytics Tabs

## 📋 Overview
This document outlines the development roadmap for completing the **History** and **Analytics** tabs in the Product Detail page.

---

## 🎯 Current Status

### ✅ Completed
- Product detail page structure with tabs
- Variants tab (fully functional)
- Basic tab navigation
- Placeholder UI for History and Analytics tabs

### ❌ Not Yet Implemented
- Activity history tracking
- Historical data storage
- Analytics data collection
- Analytics visualization

---

## 📅 Development Roadmap

### **Stage 1: Activity History Tab** (Estimated: 2-3 days)

#### Backend Development
1. **Create Activity Log Migration** (`database/migrations/`)
   ```php
   Schema::create('product_activity_logs', function (Blueprint $table) {
       $table->uuid('id')->primary();
       $table->uuid('tenant_id')->index();
       $table->uuid('product_id')->index();
       $table->uuid('user_id')->nullable();
       $table->string('action'); // created, updated, price_changed, stock_adjusted, etc.
       $table->jsonb('old_values')->nullable();
       $table->jsonb('new_values')->nullable();
       $table->text('description')->nullable();
       $table->string('ip_address')->nullable();
       $table->string('user_agent')->nullable();
       $table->timestamps();
       
       $table->foreign('tenant_id')->references('id')->on('tenants');
       $table->foreign('product_id')->references('id')->on('products');
       $table->foreign('user_id')->references('id')->on('users');
   });
   ```

2. **Create Activity Log Model** (`src/Pms/Infrastructure/Models/ProductActivityLog.php`)
   - UUID primary key
   - Tenant-scoped relationships
   - JSON casting for old_values/new_values
   - Searchable traits

3. **Create Activity Observer** (`app/Observers/ProductActivityObserver.php`)
   - Log product creation
   - Log product updates (track field changes)
   - Log price changes
   - Log stock adjustments
   - Log variant changes
   - Log archive/restore actions

4. **Create API Endpoint** (`routes/api.php`)
   ```php
   // GET /api/v1/tenants/{tenantId}/products/{productId}/activity
   Route::get('products/{productId}/activity', [ProductController::class, 'activityHistory']);
   ```

5. **Controller Method** (`ProductController@activityHistory`)
   - Paginated activity logs
   - Filter by action type
   - Filter by date range
   - Filter by user
   - Sort by timestamp

#### Frontend Development
1. **Create Activity Log Types** (`frontend/src/types/activityLog.ts`)
   ```typescript
   export interface ProductActivityLog {
     id: string;
     tenant_id: string;
     product_id: string;
     user_id: string | null;
     user?: {
       name: string;
       email: string;
     };
     action: ActivityAction;
     old_values: Record<string, any> | null;
     new_values: Record<string, any> | null;
     description: string | null;
     created_at: string;
   }
   
   export type ActivityAction = 
     | 'created'
     | 'updated'
     | 'price_changed'
     | 'stock_adjusted'
     | 'variant_added'
     | 'variant_updated'
     | 'variant_deleted'
     | 'archived'
     | 'restored';
   ```

2. **Create Activity Log Hook** (`frontend/src/hooks/useProductActivity.ts`)
   - Fetch activity logs with pagination
   - Filter by action/date/user
   - Real-time updates (optional)

3. **Create Activity Timeline Component** (`frontend/src/components/domain/products/ActivityTimeline.tsx`)
   - Timeline visualization
   - Activity item cards showing:
     - Action icon (based on type)
     - User who performed action
     - Timestamp (relative time)
     - Description
     - Change details (diff view for old vs new)
   - Pagination controls
   - Filters (by action, date range, user)

4. **Update ProductDetailPage** - Replace placeholder with ActivityTimeline

#### Testing
- Unit tests for Activity Observer
- API tests for activity endpoint
- Frontend component tests
- E2E test: Create product → Check activity log

---

### **Stage 2: Analytics Tab** (Estimated: 3-4 days)

#### Backend Development
1. **Create Analytics Aggregation Service** (`src/Pms/Core/Services/ProductAnalyticsService.php`)
   - Calculate sales metrics (total sales, revenue, quantity sold)
   - Calculate stock movement (in/out transactions)
   - Calculate profit margins
   - Calculate variant performance
   - Time-series data aggregation

2. **Create Analytics Endpoints** (`routes/api.php`)
   ```php
   // GET /api/v1/tenants/{tenantId}/products/{productId}/analytics
   Route::prefix('products/{productId}/analytics')->group(function () {
       Route::get('sales', [ProductAnalyticsController::class, 'salesMetrics']);
       Route::get('stock', [ProductAnalyticsController::class, 'stockMetrics']);
       Route::get('profit', [ProductAnalyticsController::class, 'profitMetrics']);
       Route::get('variants', [ProductAnalyticsController::class, 'variantPerformance']);
   });
   ```

3. **Database Views/Queries** (Optional)
   - Create materialized views for performance
   - Scheduled aggregation jobs for large datasets

#### Frontend Development
1. **Install Chart Library**
   ```bash
   npm install recharts
   ```

2. **Create Analytics Types** (`frontend/src/types/analytics.ts`)
   ```typescript
   export interface ProductSalesMetrics {
     total_revenue: number;
     total_quantity_sold: number;
     total_orders: number;
     average_order_value: number;
     sales_trend: TimeSeriesData[];
   }
   
   export interface ProductStockMetrics {
     current_stock: number;
     stock_value: number;
     stock_movements: StockMovement[];
     low_stock_alerts: number;
   }
   
   export interface ProductProfitMetrics {
     total_cost: number;
     total_revenue: number;
     gross_profit: number;
     profit_margin: number;
     profit_trend: TimeSeriesData[];
   }
   
   export interface VariantPerformance {
     variant_id: string;
     variant_name: string;
     total_sold: number;
     revenue: number;
     stock_remaining: number;
   }
   ```

3. **Create Analytics Hook** (`frontend/src/hooks/useProductAnalytics.ts`)
   - Fetch sales metrics
   - Fetch stock metrics
   - Fetch profit metrics
   - Fetch variant performance
   - Date range filter support

4. **Create Analytics Components**
   - `SalesChart.tsx` - Line/bar chart for sales over time
   - `StockMovementChart.tsx` - Stock in/out visualization
   - `ProfitMarginCard.tsx` - Profit metrics display
   - `VariantPerformanceTable.tsx` - Top/bottom performing variants
   - `MetricCard.tsx` - Reusable card for displaying single metrics

5. **Create Analytics Dashboard** (`frontend/src/components/domain/products/ProductAnalytics.tsx`)
   ```tsx
   <div className="space-y-6">
     {/* Key Metrics Row */}
     <div className="grid grid-cols-4 gap-4">
       <MetricCard title="Total Revenue" value={salesMetrics.total_revenue} />
       <MetricCard title="Items Sold" value={salesMetrics.total_quantity_sold} />
       <MetricCard title="Profit Margin" value={profitMetrics.profit_margin} />
       <MetricCard title="Stock Value" value={stockMetrics.stock_value} />
     </div>
     
     {/* Charts Row */}
     <div className="grid grid-cols-2 gap-4">
       <Card>
         <CardHeader>
           <CardTitle>Sales Trend</CardTitle>
         </CardHeader>
         <CardContent>
           <SalesChart data={salesMetrics.sales_trend} />
         </CardContent>
       </Card>
       
       <Card>
         <CardHeader>
           <CardTitle>Stock Movements</CardTitle>
         </CardHeader>
         <CardContent>
           <StockMovementChart data={stockMetrics.stock_movements} />
         </CardContent>
       </Card>
     </div>
     
     {/* Variant Performance */}
     <Card>
       <CardHeader>
         <CardTitle>Variant Performance</CardTitle>
       </CardHeader>
       <CardContent>
         <VariantPerformanceTable data={variantPerformance} />
       </CardContent>
     </Card>
   </div>
   ```

6. **Update ProductDetailPage** - Replace placeholder with ProductAnalytics

#### Testing
- Unit tests for Analytics Service
- API tests for analytics endpoints
- Frontend component tests
- Performance tests for large datasets

---

## 🔧 Technical Considerations

### Performance
- **Caching**: Cache analytics results (Redis) with TTL
- **Aggregation**: Pre-calculate metrics via scheduled jobs
- **Pagination**: Paginate long activity histories
- **Lazy Loading**: Load analytics data only when tab is active

### Security
- **Tenant Isolation**: All queries must be tenant-scoped
- **Permissions**: Check `products.analytics.view` permission
- **Rate Limiting**: Prevent abuse of analytics endpoints

### Data Integrity
- **Soft Deletes**: Keep activity logs even if product is deleted
- **Audit Trail**: Never delete activity logs (GDPR-compliant retention)
- **Time Zones**: Store timestamps in UTC, display in user's timezone

---

## 📦 Dependencies

### Backend
- Spatie Activity Log (optional - alternative to custom implementation)
  ```bash
  composer require spatie/laravel-activitylog
  ```

### Frontend
- Recharts (for charts)
  ```bash
  npm install recharts
  ```
- date-fns (for date formatting)
  ```bash
  npm install date-fns
  ```

---

## 🎨 UI/UX Mockups

### Activity History Tab
```
┌─────────────────────────────────────────────────────────┐
│ Activity History                            [Filters ▼] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ● John Doe created this product               2 hrs ago │
│    Product: Tea Leaves - Premium                         │
│                                                           │
│  ● Jane Smith updated price                   5 hrs ago  │
│    $15.00 → $18.50                                       │
│                                                           │
│  ● System adjusted stock                      1 day ago  │
│    Stock: 100 → 85 (Sold: 15)                           │
│                                                           │
│  ● Admin added variant "Large Size"           2 days ago │
│    Variant: L - Large, SKU: TEA-001-L-001                │
│                                                           │
│                        [Load More]                        │
└─────────────────────────────────────────────────────────┘
```

### Analytics Tab
```
┌─────────────────────────────────────────────────────────┐
│ Product Analytics                   [Last 30 Days ▼]    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Revenue  │ │Items Sold│ │  Profit  │ │  Stock   │  │
│  │ $1,250   │ │   85     │ │  32.5%   │ │  $850    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │   Sales Trend       │  │  Stock Movement     │      │
│  │                     │  │                     │      │
│  │     ╱╲              │  │    ┌─┐              │      │
│  │    ╱  ╲   ╱╲        │  │  ┌─┘ └─┐  ┌─┐      │      │
│  │   ╱    ╲_╱  ╲       │  │  │     └──┘ └─     │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Top Performing Variants                         │    │
│  ├─────────────────┬─────────┬──────────┬─────────┤    │
│  │ Variant         │ Sold    │ Revenue  │ Stock   │    │
│  ├─────────────────┼─────────┼──────────┼─────────┤    │
│  │ Medium - Red    │ 45      │ $550     │ 12      │    │
│  │ Large - Blue    │ 30      │ $480     │ 8       │    │
│  │ Small - Green   │ 10      │ $220     │ 25      │    │
│  └─────────────────┴─────────┴──────────┴─────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## ⏱️ Estimated Timeline

| Stage | Component | Estimated Time |
|-------|-----------|----------------|
| 1 | Activity History Backend | 1 day |
| 1 | Activity History Frontend | 1-2 days |
| 1 | Testing & Polish | 0.5 day |
| 2 | Analytics Backend | 1.5 days |
| 2 | Analytics Frontend | 2 days |
| 2 | Testing & Polish | 0.5 day |
| **Total** | | **6-7 days** |

---

## ✅ Acceptance Criteria

### Activity History Tab
- [x] Display chronological activity log
- [x] Show user who performed action
- [x] Show timestamp (relative time)
- [x] Show detailed change information (old vs new)
- [x] Filter by action type
- [x] Filter by date range
- [x] Pagination support
- [x] Empty state when no activities

### Analytics Tab
- [x] Display key metrics (revenue, sold, profit, stock value)
- [x] Sales trend chart (last 7/30/90 days)
- [x] Stock movement visualization
- [x] Variant performance ranking
- [x] Date range filter
- [x] Export analytics (CSV/PDF) - Optional
- [x] Empty state when no data

---

## 🚀 Priority Recommendation

**Priority Order:**
1. **Activity History** (Higher priority) - Important for audit trail and compliance
2. **Analytics** (Medium priority) - Valuable for business insights but not critical for operations

**Rationale:**
- Activity history provides audit trail which is often required for compliance
- Analytics provides business insights but doesn't block core POS functionality
- Both enhance user experience but are not blocking Phase 6 completion

---

## 📝 Notes

- Consider using **Spatie Activity Log** package for backend to speed up development
- **Recharts** is recommended for React charts (lightweight, TypeScript support)
- Ensure all data is **tenant-scoped** following system architecture rules
- Add **caching layer** for analytics to prevent performance issues
- Consider **real-time updates** via WebSockets for activity log (future enhancement)

---

## 🔗 Related Documents

- [Phase 6 Variants Specification](./phase6-variants-spec.md)
- [System Architecture](../architecture/hexagonal-architecture.md)
- [Multi-Tenancy Rules](./.zencoder/rules/repo.md)

---

**Status**: 📋 Roadmap (Not Started)  
**Last Updated**: 2025-01-XX  
**Owner**: Development Team