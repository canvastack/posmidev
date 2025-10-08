<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Product Analytics Report - {{ $product->name }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            color: #2563eb;
            font-size: 24px;
        }
        .header .subtitle {
            margin-top: 5px;
            font-size: 14px;
            color: #666;
        }
        .info-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .info-box table {
            width: 100%;
        }
        .info-box td {
            padding: 5px;
        }
        .info-box td:first-child {
            font-weight: bold;
            width: 150px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            background: #2563eb;
            color: white;
            padding: 10px;
            margin: 0 0 15px 0;
            font-size: 16px;
        }
        .metrics-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .metric-row {
            display: table-row;
        }
        .metric-cell {
            display: table-cell;
            width: 50%;
            padding: 10px;
            vertical-align: top;
        }
        .metric-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            padding: 15px;
        }
        .metric-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        table.data-table th {
            background: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #d1d5db;
        }
        table.data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        table.data-table tr:hover {
            background: #f9fafb;
        }
        .text-right {
            text-align: right;
        }
        .text-success {
            color: #059669;
        }
        .text-danger {
            color: #dc2626;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>Product Analytics Report</h1>
        <div class="subtitle">Comprehensive Performance Analysis</div>
    </div>
    
    <!-- Product Info -->
    <div class="info-box">
        <table>
            <tr>
                <td>Product Name:</td>
                <td>{{ $product->name }}</td>
            </tr>
            <tr>
                <td>SKU:</td>
                <td>{{ $product->sku }}</td>
            </tr>
            <tr>
                <td>Category:</td>
                <td>{{ $product->category->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td>Period:</td>
                <td>{{ $period_start ?? 'All time' }} to {{ $period_end ?? 'Now' }}</td>
            </tr>
            <tr>
                <td>Generated:</td>
                <td>{{ $generated_at }}</td>
            </tr>
        </table>
    </div>
    
    <!-- Key Metrics -->
    <div class="section">
        <h2>Key Metrics Summary</h2>
        <div class="metrics-grid">
            <div class="metric-row">
                <div class="metric-cell">
                    <div class="metric-card">
                        <div class="metric-label">Total Revenue</div>
                        <div class="metric-value">Rp {{ number_format($sales['total_revenue'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </div>
                <div class="metric-cell">
                    <div class="metric-card">
                        <div class="metric-label">Items Sold</div>
                        <div class="metric-value">{{ number_format($sales['total_quantity_sold'] ?? 0) }}</div>
                    </div>
                </div>
            </div>
            <div class="metric-row">
                <div class="metric-cell">
                    <div class="metric-card">
                        <div class="metric-label">Profit Margin</div>
                        <div class="metric-value">{{ number_format($profit['profit_margin'] ?? 0, 2) }}%</div>
                    </div>
                </div>
                <div class="metric-cell">
                    <div class="metric-card">
                        <div class="metric-label">Stock Value</div>
                        <div class="metric-value">Rp {{ number_format($stock['stock_value'] ?? 0, 0, ',', '.') }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Sales Metrics Detail -->
    <div class="section">
        <h2>Sales Performance</h2>
        <table class="data-table">
            <tr>
                <th>Metric</th>
                <th class="text-right">Value</th>
            </tr>
            <tr>
                <td>Total Orders</td>
                <td class="text-right">{{ number_format($sales['total_orders'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>Total Revenue</td>
                <td class="text-right">Rp {{ number_format($sales['total_revenue'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Total Quantity Sold</td>
                <td class="text-right">{{ number_format($sales['total_quantity_sold'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>Average Order Value</td>
                <td class="text-right">Rp {{ number_format($sales['average_order_value'] ?? 0, 0, ',', '.') }}</td>
            </tr>
        </table>
    </div>
    
    <!-- Stock Metrics Detail -->
    <div class="section">
        <h2>Stock Status</h2>
        <table class="data-table">
            <tr>
                <th>Metric</th>
                <th class="text-right">Value</th>
            </tr>
            <tr>
                <td>Current Stock</td>
                <td class="text-right">{{ number_format($stock['current_stock'] ?? 0) }} units</td>
            </tr>
            <tr>
                <td>Stock Value</td>
                <td class="text-right">Rp {{ number_format($stock['stock_value'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Total Stock In</td>
                <td class="text-right">{{ number_format($stock['total_stock_in'] ?? 0) }} units</td>
            </tr>
            <tr>
                <td>Total Stock Out</td>
                <td class="text-right">{{ number_format($stock['total_stock_out'] ?? 0) }} units</td>
            </tr>
        </table>
    </div>
    
    <!-- Profit Analysis -->
    <div class="section">
        <h2>Profit Analysis</h2>
        <table class="data-table">
            <tr>
                <th>Metric</th>
                <th class="text-right">Value</th>
            </tr>
            <tr>
                <td>Total Revenue</td>
                <td class="text-right">Rp {{ number_format($profit['total_revenue'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Total Cost</td>
                <td class="text-right">Rp {{ number_format($profit['total_cost'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Gross Profit</td>
                <td class="text-right {{ ($profit['gross_profit'] ?? 0) >= 0 ? 'text-success' : 'text-danger' }}">
                    Rp {{ number_format($profit['gross_profit'] ?? 0, 0, ',', '.') }}
                </td>
            </tr>
            <tr>
                <td>Profit Margin</td>
                <td class="text-right">{{ number_format($profit['profit_margin'] ?? 0, 2) }}%</td>
            </tr>
        </table>
    </div>
    
    <!-- Variant Performance -->
    @if(!empty($variants) && count($variants) > 0)
    <div class="section">
        <h2>Variant Performance</h2>
        <table class="data-table">
            <tr>
                <th>Variant Name</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Qty Sold</th>
                <th class="text-right">Avg Price</th>
                <th class="text-right">Stock</th>
            </tr>
            @foreach($variants as $variant)
            <tr>
                <td>{{ $variant['variant_name'] ?? 'N/A' }}</td>
                <td class="text-right">Rp {{ number_format($variant['revenue'] ?? 0, 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($variant['quantity_sold'] ?? 0) }}</td>
                <td class="text-right">Rp {{ number_format($variant['average_price'] ?? 0, 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($variant['current_stock'] ?? 0) }}</td>
            </tr>
            @endforeach
        </table>
    </div>
    @endif
    
    <!-- Footer -->
    <div class="footer">
        <p>This report was generated automatically by Canvastack POSMID System</p>
        <p>© {{ date('Y') }} Canvastack. All rights reserved.</p>
    </div>
</body>
</html>