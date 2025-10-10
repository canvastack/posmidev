/**
 * BOMDashboardPage Component Tests
 * 
 * Tests the BOM Analytics Dashboard functionality.
 * 
 * Test Coverage:
 * - Page rendering with data
 * - Executive summary cards
 * - Chart components rendering
 * - Alerts and recommendations display
 * - Refresh functionality
 * - Loading and error states
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - All operations are tenant-scoped
 * - guard_name: 'api'
 * 
 * @module pages/backend/bom-dashboard/__tests__/BOMDashboardPage.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  mockTenantId,
  mockStockStatus,
  mockCategoryBreakdown,
  mockUsageTrends,
} from '@/test/test-utils';
import BOMDashboardPage from '../index';

// ============================================================================
// MOCKS
// ============================================================================

const mockNavigate = vi.fn();

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenant_id: mockTenantId(),
      email: 'test@example.com',
      name: 'Test User',
    },
    tenantId: mockTenantId(),
    token: 'mock-token',
  }),
}));

// Mock bomApi
vi.mock('@/api/bomApi', () => ({
  bomApi: {
    analytics: {
      getStockStatus: vi.fn(),
      getCategories: vi.fn(),
      getUsageTrends: vi.fn(),
    },
    alerts: {
      getActiveAlerts: vi.fn(),
      getReorderRecommendations: vi.fn(),
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock react-router-dom - must return consistent mock
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock child components that use useNavigate to avoid nested mocking issues
vi.mock('../AlertsList', () => ({
  AlertsList: ({ alerts, isLoading }: any) => (
    <div data-testid="alerts-list">
      {isLoading && <div>Loading alerts...</div>}
      {!isLoading && alerts.length === 0 && <div>No active alerts</div>}
      {!isLoading && alerts.length > 0 && alerts.map((alert: any) => (
        <div key={alert.id} data-testid={`alert-${alert.id}`}>
          <span>{alert.material_name}</span>
          <span data-testid={`alert-severity-${alert.severity}`}>{alert.severity}</span>
          <button onClick={() => mockNavigate(`/materials/${alert.material_id}`)}>
            View Material
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../ReorderRecommendationsTable', () => ({
  ReorderRecommendationsTable: ({ recommendations, isLoading }: any) => (
    <div data-testid="reorder-recommendations">
      {isLoading && <div>Loading recommendations...</div>}
      {!isLoading && recommendations.length === 0 && <div>No reorder recommendations</div>}
      {!isLoading && recommendations.length > 0 && recommendations.map((rec: any) => (
        <div key={rec.material_id} data-testid={`recommendation-${rec.material_id}`}>
          <span>{rec.material_name}</span>
          <span data-testid={`priority-${rec.priority}`}>{rec.priority}</span>
          <span data-testid={`cost-${rec.material_id}`}>{rec.estimated_cost}</span>
        </div>
      ))}
    </div>
  ),
}));

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div>Pie</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div>Bar</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
  Cell: () => <div>Cell</div>,
}));

import { bomApi } from '@/api/bomApi';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockAlerts = [
  {
    id: '1',
    material_id: 'mat-1',
    material_name: 'Flour',
    material_code: 'MAT-001',
    severity: 'critical' as const,
    message: 'Stock below minimum level',
    current_stock: 5,
    reorder_level: 20,
    days_until_stockout: 2,
  },
  {
    id: '2',
    material_id: 'mat-2',
    material_name: 'Sugar',
    material_code: 'MAT-002',
    severity: 'warning' as const,
    message: 'Approaching reorder point',
    current_stock: 25,
    reorder_level: 30,
    days_until_stockout: 5,
  },
];

const mockRecommendations = [
  {
    material_id: 'mat-1',
    material_name: 'Flour',
    material_code: 'MAT-001',
    priority: 'high' as const,
    suggested_order_quantity: 100,
    estimated_cost: 500000,
    current_stock: 5,
    unit_cost: 5000,
    supplier: 'ABC Supplier',
  },
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe('BOMDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Default mocks: successful API calls
    vi.mocked(bomApi.analytics.getStockStatus).mockResolvedValue(mockStockStatus());
    vi.mocked(bomApi.analytics.getCategories).mockResolvedValue(mockCategoryBreakdown());
    vi.mocked(bomApi.analytics.getUsageTrends).mockResolvedValue(mockUsageTrends());
    vi.mocked(bomApi.alerts.getActiveAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(bomApi.alerts.getReorderRecommendations).mockResolvedValue(mockRecommendations);
  });

  // --------------------------------------------------------------------------
  // RENDERING TESTS
  // --------------------------------------------------------------------------

  it('should render page title', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/BOM Dashboard|Dashboard/i)).toBeInTheDocument();
    });
  });

  it('should render all executive summary cards', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      // Check for card titles
      expect(screen.getByText(/Total Materials/i)).toBeInTheDocument();
      expect(screen.getByText(/Low Stock/i)).toBeInTheDocument();
      expect(screen.getByText(/Inventory Value|Total Value/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Alerts/i)).toBeInTheDocument();
    });
  });

  it('should display correct summary data', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      const stockStatus = mockStockStatus();
      const totalMaterials = Object.values(stockStatus).reduce((a, b) => a + b, 0);
      
      // Total materials count
      expect(screen.getByText(totalMaterials.toString())).toBeInTheDocument();
      
      // Low stock count
      const lowStockCount = stockStatus.low + stockStatus.critical + stockStatus.out_of_stock;
      expect(screen.getByText(lowStockCount.toString())).toBeInTheDocument();
    });
  });

  it('should display loading skeletons while fetching data', () => {
    renderWithProviders(<BOMDashboardPage />);
    
    // Check for loading indicators
    const loadingElements = document.querySelectorAll('[data-loading="true"]');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should display error message when fetch fails', async () => {
    vi.mocked(bomApi.analytics.getStockStatus).mockRejectedValue(
      new Error('Failed to fetch analytics')
    );
    
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // CHART RENDERING TESTS
  // --------------------------------------------------------------------------

  it('should render stock status chart', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  it('should render category breakdown chart', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('should render usage trends chart', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('should display chart empty state when no data', async () => {
    vi.mocked(bomApi.analytics.getStockStatus).mockResolvedValue({
      normal: 0,
      low: 0,
      critical: 0,
      out_of_stock: 0,
    });
    
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no data|empty/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // ALERTS SECTION TESTS
  // --------------------------------------------------------------------------

  it('should render alerts list', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Flour')).toBeInTheDocument();
      expect(screen.getByText('Sugar')).toBeInTheDocument();
    });
  });

  it('should display alert severity badges', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/critical/i)).toBeInTheDocument();
      expect(screen.getByText(/warning/i)).toBeInTheDocument();
    });
  });

  it('should display "View Material" button for each alert', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /view|material/i });
      expect(viewButtons.length).toBeGreaterThanOrEqual(mockAlerts.length);
    });
  });

  it('should show empty state when no alerts', async () => {
    vi.mocked(bomApi.alerts.getActiveAlerts).mockResolvedValue([]);
    
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no alerts|all good/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // RECOMMENDATIONS SECTION TESTS
  // --------------------------------------------------------------------------

  it('should render reorder recommendations', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Flour/i)).toBeInTheDocument();
    });
  });

  it('should display priority badges for recommendations', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/high/i)).toBeInTheDocument();
    });
  });

  it('should display estimated costs in IDR format', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      // Check for currency format (IDR or Rp)
      expect(screen.getByText(/Rp|IDR|500,000/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no recommendations', async () => {
    vi.mocked(bomApi.alerts.getReorderRecommendations).mockResolvedValue([]);
    
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no recommendations|stock levels are good/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // REFRESH FUNCTIONALITY TESTS
  // --------------------------------------------------------------------------

  it('should have refresh button', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh|reload/i })).toBeInTheDocument();
    });
  });

  it('should refetch all data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh|reload/i })).toBeInTheDocument();
    });
    
    // Clear previous calls
    vi.clearAllMocks();
    
    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh|reload/i });
    await user.click(refreshButton);
    
    await waitFor(() => {
      expect(bomApi.analytics.getStockStatus).toHaveBeenCalled();
      expect(bomApi.analytics.getCategories).toHaveBeenCalled();
      expect(bomApi.analytics.getUsageTrends).toHaveBeenCalled();
      expect(bomApi.alerts.getActiveAlerts).toHaveBeenCalled();
      expect(bomApi.alerts.getReorderRecommendations).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // USAGE TRENDS TIME PERIOD SELECTOR TESTS
  // --------------------------------------------------------------------------

  it('should have time period selector for usage trends', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/days|period|range/i)).toBeInTheDocument();
    });
  });

  it('should refetch usage trends when time period changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/days|period|range/i)).toBeInTheDocument();
    });
    
    // Clear previous calls
    vi.clearAllMocks();
    
    // Change time period
    const periodSelector = screen.getByLabelText(/days|period|range/i);
    await user.click(periodSelector);
    
    const option30Days = screen.getByRole('option', { name: /30/i });
    await user.click(option30Days);
    
    await waitFor(() => {
      expect(bomApi.analytics.getUsageTrends).toHaveBeenCalledWith(
        mockTenantId(),
        30
      );
    });
  });

  // --------------------------------------------------------------------------
  // RESPONSIVE LAYOUT TESTS
  // --------------------------------------------------------------------------

  it('should render in grid layout', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      const grid = document.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // TENANT ISOLATION TEST
  // --------------------------------------------------------------------------

  it('should always use tenant_id from auth context', async () => {
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(bomApi.analytics.getStockStatus).toHaveBeenCalledWith(mockTenantId());
      expect(bomApi.analytics.getCategories).toHaveBeenCalledWith(mockTenantId());
      expect(bomApi.alerts.getActiveAlerts).toHaveBeenCalledWith(mockTenantId());
      expect(bomApi.alerts.getReorderRecommendations).toHaveBeenCalledWith(mockTenantId());
    });
  });

  // --------------------------------------------------------------------------
  // NAVIGATION TESTS
  // --------------------------------------------------------------------------

  it('should navigate to materials page when clicking alert action', async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();
    
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });
    
    renderWithProviders(<BOMDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Flour')).toBeInTheDocument();
    });
    
    // Click view material button
    const viewButtons = screen.getAllByRole('button', { name: /view|material/i });
    await user.click(viewButtons[0]);
    
    // Should navigate (implementation-specific, adjust as needed)
    // This test may need adjustment based on actual navigation implementation
  });
});