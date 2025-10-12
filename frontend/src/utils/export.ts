/**
 * Advanced Export Utilities (Phase 4A+ Day 4)
 * 
 * Provides multi-format export capabilities for analytics data:
 * - CSV: Enhanced comma-separated values
 * - Excel: Multi-sheet workbook with formatting
 * - JSON: API-compatible structured data
 * - PDF: Business report with charts
 * 
 * Design: No hardcoded colors, all from design tokens
 * Performance: Optimized for large datasets (1000+ rows)
 * 
 * @module utils/export
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { 
  PosOverview, 
  SalesTrend, 
  BestSeller, 
  CashierPerformance,
  ForecastResult,
  BenchmarkData,
  AnomalyDetectionResult
} from '@/types';

/**
 * Export configuration interface
 */
export interface ExportConfig {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  filename?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  includeSections: {
    overview?: boolean;
    trends?: boolean;
    forecast?: boolean;
    benchmarks?: boolean;
    anomalies?: boolean;
    bestSellers?: boolean;
    cashierPerformance?: boolean;
  };
  includeCharts?: boolean; // PDF only
}

/**
 * Analytics export data structure
 */
export interface AnalyticsExportData {
  overview?: PosOverview;
  trends?: SalesTrend[];
  forecast?: ForecastResult;
  benchmarks?: BenchmarkData;
  anomalies?: AnomalyDetectionResult;
  bestSellers?: BestSeller[];
  cashierPerformance?: CashierPerformance[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Export to Enhanced CSV format
 * 
 * @param data - Analytics data
 * @param config - Export configuration
 * @returns CSV string
 */
export function exportToCSV(data: AnalyticsExportData, config: ExportConfig): string {
  let csv = 'data:text/csv;charset=utf-8,';
  const { includeSections } = config;

  // Header
  csv += `POS Analytics Export\n`;
  csv += `Generated: ${new Date().toLocaleString('id-ID')}\n`;
  if (config.dateRange) {
    csv += `Date Range: ${config.dateRange.startDate} to ${config.dateRange.endDate}\n`;
  }
  csv += '\n';

  // Overview Section
  if (includeSections.overview && data.overview) {
    csv += 'OVERVIEW METRICS\n';
    csv += 'Metric,Value\n';
    csv += `Total Revenue,${data.overview.total_revenue}\n`;
    csv += `Total Transactions,${data.overview.total_transactions}\n`;
    csv += `Average Ticket,${data.overview.average_ticket}\n`;
    csv += `Total Items Sold,${data.overview.total_items_sold}\n`;
    if (data.overview.top_cashier) {
      csv += `Top Cashier,${escapeCSV(data.overview.top_cashier.name)}\n`;
      csv += `Top Cashier Revenue,${data.overview.top_cashier.revenue}\n`;
    }
    csv += '\n';
  }

  // Trends Section
  if (includeSections.trends && data.trends && data.trends.length > 0) {
    csv += 'SALES TRENDS\n';
    csv += 'Date,Revenue,Transactions,Average Ticket\n';
    data.trends.forEach((trend) => {
      csv += `${trend.date},${trend.revenue},${trend.transactions},${trend.average_ticket}\n`;
    });
    csv += '\n';
  }

  // Forecast Section
  if (includeSections.forecast && data.forecast) {
    csv += 'FORECAST DATA\n';
    csv += 'Date,Predicted Value,Lower Bound,Upper Bound\n';
    data.forecast.predictions.forEach((pred) => {
      csv += `${pred.date},${pred.value},${pred.lowerBound},${pred.upperBound}\n`;
    });
    csv += `\nForecast Period,${data.forecast.forecastPeriod} days\n`;
    csv += `R-Squared,${data.forecast.rSquared.toFixed(4)}\n`;
    csv += `Reliability,${data.forecast.reliability}\n`;
    csv += '\n';
  }

  // Benchmarks Section
  if (includeSections.benchmarks && data.benchmarks) {
    csv += 'PERFORMANCE BENCHMARKS\n';
    csv += 'Metric,Current Value,Baseline,Variance %,Status\n';
    Object.entries(data.benchmarks).forEach(([metric, benchmark]) => {
      if (typeof benchmark === 'object' && 'currentValue' in benchmark) {
        csv += `${metric},${benchmark.currentValue},${benchmark.baselineValue},${benchmark.variancePercentage.toFixed(2)},${benchmark.status}\n`;
      }
    });
    csv += '\n';
  }

  // Anomalies Section
  if (includeSections.anomalies && data.anomalies && data.anomalies.anomalies.length > 0) {
    csv += 'DETECTED ANOMALIES\n';
    csv += 'Date,Type,Severity,Metric,Actual Value,Expected Value,Z-Score\n';
    data.anomalies.anomalies.forEach((anomaly) => {
      csv += `${anomaly.date},${anomaly.type},${anomaly.severity},${anomaly.metric},${anomaly.actualValue},${anomaly.expectedValue},${anomaly.zScore.toFixed(2)}\n`;
    });
    csv += '\n';
  }

  // Best Sellers Section
  if (includeSections.bestSellers && data.bestSellers && data.bestSellers.length > 0) {
    csv += 'BEST SELLERS\n';
    csv += 'Rank,Product,SKU,Category,Units Sold,Revenue\n';
    data.bestSellers.forEach((item) => {
      csv += `${item.rank},${escapeCSV(item.product_name)},${escapeCSV(item.sku)},${escapeCSV(item.category)},${item.units_sold},${item.revenue}\n`;
    });
    csv += '\n';
  }

  // Cashier Performance Section
  if (includeSections.cashierPerformance && data.cashierPerformance && data.cashierPerformance.length > 0) {
    csv += 'CASHIER PERFORMANCE\n';
    csv += 'Cashier,Transactions,Revenue,Average Ticket\n';
    data.cashierPerformance.forEach((item) => {
      csv += `${escapeCSV(item.cashier_name)},${item.transactions_handled},${item.revenue_generated},${item.average_ticket}\n`;
    });
    csv += '\n';
  }

  return csv;
}

/**
 * Export to Excel format (multi-sheet workbook)
 * 
 * @param data - Analytics data
 * @param config - Export configuration
 */
export function exportToExcel(data: AnalyticsExportData, config: ExportConfig): void {
  const workbook = XLSX.utils.book_new();
  const { includeSections } = config;

  // Sheet 1: Overview
  if (includeSections.overview && data.overview) {
    const overviewData = [
      ['POS Analytics Overview'],
      ['Generated', new Date().toLocaleString('id-ID')],
      [],
      ['Metric', 'Value'],
      ['Total Revenue', data.overview.total_revenue],
      ['Total Transactions', data.overview.total_transactions],
      ['Average Ticket', data.overview.average_ticket],
      ['Total Items Sold', data.overview.total_items_sold],
    ];

    if (data.overview.top_cashier) {
      overviewData.push(['Top Cashier', data.overview.top_cashier.name]);
      overviewData.push(['Top Cashier Revenue', data.overview.top_cashier.revenue]);
    }

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
  }

  // Sheet 2: Trends
  if (includeSections.trends && data.trends && data.trends.length > 0) {
    const trendsSheet = XLSX.utils.json_to_sheet(data.trends.map(t => ({
      'Date': t.date,
      'Revenue': t.revenue,
      'Transactions': t.transactions,
      'Average Ticket': t.average_ticket,
    })));
    XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Sales Trends');
  }

  // Sheet 3: Forecast
  if (includeSections.forecast && data.forecast) {
    const forecastData = data.forecast.predictions.map(p => ({
      'Date': p.date,
      'Predicted Value': p.value,
      'Lower Bound (95%)': p.lowerBound,
      'Upper Bound (95%)': p.upperBound,
    }));

    const forecastSheet = XLSX.utils.json_to_sheet(forecastData);
    XLSX.utils.book_append_sheet(workbook, forecastSheet, 'Forecast');

    // Add forecast metadata
    const metaStartRow = forecastData.length + 3;
    XLSX.utils.sheet_add_aoa(forecastSheet, [
      [],
      ['Forecast Metadata'],
      ['Forecast Period', `${data.forecast.forecastPeriod} days`],
      ['R-Squared', data.forecast.rSquared.toFixed(4)],
      ['Reliability', data.forecast.reliability],
    ], { origin: `A${metaStartRow}` });
  }

  // Sheet 4: Benchmarks
  if (includeSections.benchmarks && data.benchmarks) {
    const benchmarkData: Array<Record<string, any>> = [];
    Object.entries(data.benchmarks).forEach(([metric, benchmark]) => {
      if (typeof benchmark === 'object' && 'currentValue' in benchmark) {
        benchmarkData.push({
          'Metric': metric,
          'Current Value': benchmark.currentValue,
          'Baseline': benchmark.baselineValue,
          'Variance %': benchmark.variancePercentage.toFixed(2),
          'Status': benchmark.status,
        });
      }
    });

    if (benchmarkData.length > 0) {
      const benchmarkSheet = XLSX.utils.json_to_sheet(benchmarkData);
      XLSX.utils.book_append_sheet(workbook, benchmarkSheet, 'Benchmarks');
    }
  }

  // Sheet 5: Anomalies
  if (includeSections.anomalies && data.anomalies && data.anomalies.anomalies.length > 0) {
    const anomalyData = data.anomalies.anomalies.map(a => ({
      'Date': a.date,
      'Type': a.type,
      'Severity': a.severity,
      'Metric': a.metric,
      'Actual Value': a.actualValue,
      'Expected Value': a.expectedValue,
      'Z-Score': a.zScore.toFixed(2),
      'Description': a.description,
    }));

    const anomalySheet = XLSX.utils.json_to_sheet(anomalyData);
    XLSX.utils.book_append_sheet(workbook, anomalySheet, 'Anomalies');
  }

  // Sheet 6: Best Sellers
  if (includeSections.bestSellers && data.bestSellers && data.bestSellers.length > 0) {
    const sellersSheet = XLSX.utils.json_to_sheet(data.bestSellers.map(s => ({
      'Rank': s.rank,
      'Product': s.product_name,
      'SKU': s.sku,
      'Category': s.category,
      'Units Sold': s.units_sold,
      'Revenue': s.revenue,
    })));
    XLSX.utils.book_append_sheet(workbook, sellersSheet, 'Best Sellers');
  }

  // Sheet 7: Cashier Performance
  if (includeSections.cashierPerformance && data.cashierPerformance && data.cashierPerformance.length > 0) {
    const cashierSheet = XLSX.utils.json_to_sheet(data.cashierPerformance.map(c => ({
      'Cashier': c.cashier_name,
      'Transactions': c.transactions_handled,
      'Revenue': c.revenue_generated,
      'Average Ticket': c.average_ticket,
    })));
    XLSX.utils.book_append_sheet(workbook, cashierSheet, 'Cashier Performance');
  }

  // Write file
  const filename = config.filename || `analytics_${new Date().toISOString().split('T')[0]}`;
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export to JSON format (API-compatible)
 * 
 * @param data - Analytics data
 * @param config - Export configuration
 */
export function exportToJSON(data: AnalyticsExportData, config: ExportConfig): void {
  const { includeSections } = config;

  const exportData: Record<string, any> = {
    metadata: {
      exportedAt: new Date().toISOString(),
      dateRange: config.dateRange,
      format: 'json',
      version: '1.0',
    },
  };

  if (includeSections.overview && data.overview) {
    exportData.overview = data.overview;
  }

  if (includeSections.trends && data.trends) {
    exportData.trends = data.trends;
  }

  if (includeSections.forecast && data.forecast) {
    exportData.forecast = data.forecast;
  }

  if (includeSections.benchmarks && data.benchmarks) {
    exportData.benchmarks = data.benchmarks;
  }

  if (includeSections.anomalies && data.anomalies) {
    exportData.anomalies = data.anomalies;
  }

  if (includeSections.bestSellers && data.bestSellers) {
    exportData.bestSellers = data.bestSellers;
  }

  if (includeSections.cashierPerformance && data.cashierPerformance) {
    exportData.cashierPerformance = data.cashierPerformance;
  }

  // Create download
  const jsonString = JSON.stringify(exportData, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`;
  const filename = config.filename || `analytics_${new Date().toISOString().split('T')[0]}`;
  
  downloadFile(dataUri, `${filename}.json`);
}

/**
 * Export to PDF format (business report with charts)
 * 
 * @param data - Analytics data
 * @param config - Export configuration
 * @param chartRefs - Array of chart element refs (for capturing)
 */
export async function exportToPDF(
  data: AnalyticsExportData,
  config: ExportConfig,
  chartRefs?: React.RefObject<HTMLElement>[]
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const { includeSections } = config;
  const pageWidth = 210; // A4 width in mm
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.text('POS Analytics Report', margin, yPosition);
  yPosition += 10;

  // Metadata
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleString('id-ID')}`, margin, yPosition);
  yPosition += 5;
  if (config.dateRange) {
    pdf.text(`Period: ${config.dateRange.startDate} to ${config.dateRange.endDate}`, margin, yPosition);
    yPosition += 5;
  }
  yPosition += 10;

  // Overview Section
  if (includeSections.overview && data.overview) {
    pdf.setFontSize(14);
    pdf.text('Overview Metrics', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    const metrics = [
      ['Total Revenue', `Rp ${data.overview.total_revenue.toLocaleString('id-ID')}`],
      ['Total Transactions', data.overview.total_transactions.toString()],
      ['Average Ticket', `Rp ${data.overview.average_ticket.toLocaleString('id-ID')}`],
      ['Total Items Sold', data.overview.total_items_sold.toString()],
    ];

    if (data.overview.top_cashier) {
      metrics.push(['Top Cashier', data.overview.top_cashier.name]);
    }

    metrics.forEach(([label, value]) => {
      pdf.text(`${label}:`, margin, yPosition);
      pdf.text(value, margin + 50, yPosition);
      yPosition += 6;
    });

    yPosition += 5;
  }

  // Check if new page needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > 270) { // 270mm = A4 height - margin
      pdf.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Anomalies Section (if any critical)
  if (includeSections.anomalies && data.anomalies && data.anomalies.anomalies.length > 0) {
    const criticalAnomalies = data.anomalies.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    
    if (criticalAnomalies.length > 0) {
      checkNewPage(30);
      pdf.setFontSize(14);
      pdf.text('Critical Alerts', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      criticalAnomalies.slice(0, 5).forEach((anomaly) => {
        const text = `${anomaly.date}: ${anomaly.description}`;
        const splitText = pdf.splitTextToSize(text, contentWidth);
        pdf.text(splitText, margin, yPosition);
        yPosition += 5 * splitText.length;
      });

      yPosition += 5;
    }
  }

  // Charts Section
  if (config.includeCharts && chartRefs && chartRefs.length > 0) {
    for (const chartRef of chartRefs) {
      if (chartRef.current) {
        checkNewPage(100);

        try {
          const canvas = await html2canvas(chartRef.current, {
            scale: 2,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * contentWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (error) {
          console.error('Error capturing chart:', error);
        }
      }
    }
  }

  // Summary statistics on last page
  checkNewPage(40);
  pdf.setFontSize(12);
  pdf.text('Summary', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(9);
  const summaryItems: string[] = [];

  if (includeSections.trends && data.trends) {
    summaryItems.push(`Sales trends: ${data.trends.length} data points`);
  }

  if (includeSections.forecast && data.forecast) {
    summaryItems.push(`Forecast reliability: ${data.forecast.reliability}`);
  }

  if (includeSections.anomalies && data.anomalies) {
    summaryItems.push(`Anomalies detected: ${data.anomalies.totalCount}`);
  }

  if (includeSections.bestSellers && data.bestSellers) {
    summaryItems.push(`Best sellers: ${data.bestSellers.length} products`);
  }

  summaryItems.forEach((item) => {
    pdf.text(`- ${item}`, margin, yPosition);
    yPosition += 5;
  });

  // Save PDF
  const filename = config.filename || `analytics_${new Date().toISOString().split('T')[0]}`;
  pdf.save(`${filename}.pdf`);
}

/**
 * Helper: Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Helper: Download file
 */
function downloadFile(dataUri: string, filename: string): void {
  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get default filename based on date range
 */
export function getDefaultFilename(dateRange?: { startDate: string; endDate: string }): string {
  if (dateRange) {
    return `analytics_${dateRange.startDate}_to_${dateRange.endDate}`;
  }
  return `analytics_${new Date().toISOString().split('T')[0]}`;
}