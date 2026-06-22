/**
 * Dashboard Page Component Tests
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import * as api from '../../services/api';

// Mock API calls
jest.mock('../../services/api', () => ({
  getDashboardData: jest.fn(),
  getDashboardStats: jest.fn(),
  getDashboardCharts: jest.fn()
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

const mockDashboardData = {
  stats: {
    totalUsers: 150,
    activeFeatures: 12,
    totalProviders: 5,
    totalModels: 25,
    totalRevenue: 15000.50,
    monthlyRevenue: 4500.00,
    tokenUsage: {
      total: 1000000,
      input: 600000,
      output: 400000
    }
  },
  recentActivity: [
    { id: 1, type: 'user_signup', description: 'New user registered', timestamp: new Date() },
    { id: 2, type: 'api_call', description: 'API call completed', timestamp: new Date() }
  ]
};

const mockChartData = {
  revenueChart: [
    { date: '2024-01-01', value: 1000 },
    { date: '2024-02-01', value: 1200 },
    { date: '2024-03-01', value: 1500 }
  ],
  usageChart: [
    { date: '2024-01-01', tokens: 50000 },
    { date: '2024-02-01', tokens: 60000 },
    { date: '2024-03-01', tokens: 75000 }
  ],
  userGrowthChart: [
    { date: '2024-01-01', users: 100 },
    { date: '2024-02-01', users: 115 },
    { date: '2024-03-01', users: 130 }
  ]
};

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getDashboardData.mockResolvedValue({ data: mockDashboardData });
    api.getDashboardStats.mockResolvedValue({ data: mockDashboardData.stats });
    api.getDashboardCharts.mockResolvedValue({ data: mockChartData });
  });

  describe('Initial Render', () => {
    it('should render dashboard title', async () => {
      renderDashboard();

      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      renderDashboard();

      expect(screen.getByRole('status', { hidden: true }) ||
             screen.queryByTestId('loading-spinner') ||
             screen.getByText(/loading/i, { exact: false })).toBeTruthy();
    });

    it('should fetch dashboard data on mount', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(api.getDashboardData).toHaveBeenCalled();
      });
    });

    it('should display user count after loading', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('should display revenue after loading', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/\$15,000/)).toBeInTheDocument();
      });
    });
  });

  describe('Stats Cards', () => {
    it('should display total users stat', async () => {
      renderDashboard();

      await waitFor(() => {
        const usersCard = screen.getByText(/total users/i).closest('.stat-card');
        expect(within(usersCard).getByText('150')).toBeInTheDocument();
      });
    });

    it('should display active features stat', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/active features/i)).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
      });
    });

    it('should display total providers stat', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/providers/i)).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should display total models stat', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/models/i)).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });

    it('should display monthly revenue stat', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/monthly revenue/i)).toBeInTheDocument();
        expect(screen.getByText(/\$4,500/)).toBeInTheDocument();
      });
    });
  });

  describe('Charts', () => {
    it('should render revenue chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should render usage chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });

    it('should render user growth chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('should display chart tooltips on hover', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Activity', () => {
    it('should display recent activity section', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
      });
    });

    it('should display activity items', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/New user registered/i)).toBeInTheDocument();
      });
    });

    it('should display activity timestamps', async () => {
      renderDashboard();

      await waitFor(() => {
        const timestamps = screen.getAllByText(/ago|just now/i);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Time Period Selection', () => {
    it('should have time period selector', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /period/i }) ||
               screen.getByText(/last 7 days/i) ||
               screen.getByText(/last 30 days/i)).toBeInTheDocument();
      });
    });

    it('should update data when period changes', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(api.getDashboardData).toHaveBeenCalled();
      });

      // Find period selector and change it
      const periodSelector = screen.getByRole('combobox');
      await user.selectOptions(periodSelector, 'month');

      await waitFor(() => {
        expect(api.getDashboardStats).toHaveBeenCalled();
      });
    });

    it('should support custom date range', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/custom range/i) ||
               screen.getByPlaceholderText(/from/i) ||
               screen.getByPlaceholderText(/to/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Usage Display', () => {
    it('should display total tokens', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
      });
    });

    it('should display input/output token ratio', async () => {
      renderDashboard();

      await waitFor(() => {
        // Should show ratio somewhere
        expect(screen.getByText(/600,000/i) ||
               screen.getByText(/400,000/i)).toBeInTheDocument();
      });
    });

    it('should show token usage percentage breakdown', async () => {
      renderDashboard();

      await waitFor(() => {
        // Should show percentages (60% input, 40% output)
        expect(screen.getByText(/60%/i) ||
               screen.getByText(/40%/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      api.getDashboardData.mockRejectedValue(new Error('Failed to fetch'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/error/i) ||
               screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should have retry button on error', async () => {
      api.getDashboardData.mockRejectedValue(new Error('Failed to fetch'));

      renderDashboard();

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should reload data when retry is clicked', async () => {
      const user = userEvent.setup();
      api.getDashboardData.mockRejectedValueOnce(new Error('Failed to fetch'));
      api.getDashboardData.mockResolvedValueOnce({ data: mockDashboardData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(api.getDashboardData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should display stats in grid layout', async () => {
      renderDashboard();

      await waitFor(() => {
        const statsGrid = screen.getByTestId('stats-grid') ||
                          document.querySelector('.stats-grid');
        expect(statsGrid).toBeTruthy();
      });
    });

    it('should stack charts on mobile', async () => {
      // Mock window.innerWidth for mobile
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        const chartsContainer = screen.getByTestId('charts-container') ||
                                document.querySelector('.charts-container');
        expect(chartsContainer).toBeTruthy();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should render within acceptable time', async () => {
      const startTime = Date.now();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should not make redundant API calls', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(api.getDashboardData).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle rapid time period changes', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      const periodSelector = screen.getByRole('combobox');

      // Rapidly change periods
      await user.selectOptions(periodSelector, 'week');
      await user.selectOptions(periodSelector, 'month');
      await user.selectOptions(periodSelector, 'year');

      // Should debounce and not make too many calls
      await waitFor(() => {
        expect(api.getDashboardData.mock.calls.length).toBeLessThan(5);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderDashboard();

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toBeInTheDocument();
      });
    });

    it('should have accessible stat cards', async () => {
      renderDashboard();

      await waitFor(() => {
        const statCards = screen.getAllByRole('article');
        expect(statCards.length).toBeGreaterThan(0);
      });
    });

    it('should have accessible chart labels', async () => {
      renderDashboard();

      await waitFor(() => {
        const chartLabels = screen.getAllByRole('img');
        expect(chartLabels.length).toBeGreaterThan(0);
      });
    });
  });
});
