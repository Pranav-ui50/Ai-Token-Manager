/**
 * Analytics Page Component Tests
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Analytics from '../../pages/Analytics';
import * as api from '../../services/api';

// Mock API calls
jest.mock('../../services/api', () => ({
  getAnalytics: jest.fn(),
  getTokenAnalytics: jest.fn(),
  getCostAnalytics: jest.fn(),
  getRevenueAnalytics: jest.fn(),
  getUserAnalytics: jest.fn(),
  getUsageTrends: jest.fn()
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  ComposedChart: ({ children }) => <div data-testid="composed-chart">{children}</div>,
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

const mockTokenAnalytics = {
  totalTokens: 1000000,
  inputTokens: 600000,
  outputTokens: 400000,
  inputRatio: 0.6,
  outputRatio: 0.4,
  byModel: [
    { model: 'gpt-4', tokens: 400000 },
    { model: 'gpt-3.5-turbo', tokens: 350000 },
    { model: 'claude-3', tokens: 250000 }
  ],
  byProvider: [
    { provider: 'openai', tokens: 750000 },
    { provider: 'anthropic', tokens: 250000 }
  ]
};

const mockCostAnalytics = {
  totalCost: 1500.50,
  avgCostPerToken: 0.0015,
  breakdown: {
    byProvider: [
      { provider: 'openai', cost: 1000 },
      { provider: 'anthropic', cost: 500.50 }
    ],
    byModel: [
      { model: 'gpt-4', cost: 800 },
      { model: 'gpt-3.5-turbo', cost: 200.50 },
      { model: 'claude-3', cost: 500 }
    ]
  }
};

const mockRevenueAnalytics = {
  totalRevenue: 50000,
  mrr: 4500,
  arr: 54000,
  revenueByPlan: [
    { plan: 'enterprise', revenue: 30000 },
    { plan: 'pro', revenue: 15000 },
    { plan: 'free', revenue: 5000 }
  ]
};

const mockUserAnalytics = {
  totalUsers: 150,
  activeUsers: 120,
  growthRate: 15,
  byRole: [
    { role: 'org_owner', count: 10 },
    { role: 'org_admin', count: 20 },
    { role: 'developer', count: 80 },
    { role: 'viewer', count: 40 }
  ]
};

const mockUsageTrends = {
  trends: [
    { date: '2024-01-01', tokens: 50000, cost: 500 },
    { date: '2024-02-01', tokens: 60000, cost: 600 },
    { date: '2024-03-01', tokens: 75000, cost: 750 }
  ],
  direction: 'up'
};

const renderAnalytics = () => {
  return render(
    <BrowserRouter>
      <Analytics />
    </BrowserRouter>
  );
};

describe('Analytics Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getAnalytics.mockResolvedValue({ data: { overview: {} } });
    api.getTokenAnalytics.mockResolvedValue({ data: mockTokenAnalytics });
    api.getCostAnalytics.mockResolvedValue({ data: mockCostAnalytics });
    api.getRevenueAnalytics.mockResolvedValue({ data: mockRevenueAnalytics });
    api.getUserAnalytics.mockResolvedValue({ data: mockUserAnalytics });
    api.getUsageTrends.mockResolvedValue({ data: mockUsageTrends });
  });

  describe('Initial Render', () => {
    it('should render analytics title', async () => {
      renderAnalytics();

      expect(screen.getByText(/analytics/i)).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      renderAnalytics();

      expect(screen.getByRole('status', { hidden: true }) ||
             screen.queryByTestId('loading-spinner') ||
             screen.getByText(/loading/i, { exact: false })).toBeTruthy();
    });

    it('should fetch analytics data on mount', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(api.getTokenAnalytics).toHaveBeenCalled();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should display tab navigation', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
    });

    it('should have tabs for different analytics types', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /tokens/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /costs/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /revenue/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
      });
    });

    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /tokens/i })).toBeInTheDocument();
      });

      const costsTab = screen.getByRole('tab', { name: /costs/i });
      await user.click(costsTab);

      await waitFor(() => {
        expect(api.getCostAnalytics).toHaveBeenCalled();
      });
    });

    it('should highlight active tab', async () => {
      const user = userEvent.setup();
      renderAnalytics();

      await waitFor(() => {
        const tokensTab = screen.getByRole('tab', { name: /tokens/i });
        expect(tokensTab).toHaveAttribute('aria-selected', 'true');
      });

      const revenueTab = screen.getByRole('tab', { name: /revenue/i });
      await user.click(revenueTab);

      await waitFor(() => {
        expect(revenueTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('Token Analytics Tab', () => {
    it('should display total tokens', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
      });
    });

    it('should display input/output breakdown', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/600,000/)).toBeInTheDocument();
        expect(screen.getByText(/400,000/)).toBeInTheDocument();
      });
    });

    it('should display token distribution by model', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/gpt-4/i)).toBeInTheDocument();
        expect(screen.getByText(/gpt-3.5-turbo/i)).toBeInTheDocument();
      });
    });

    it('should display token distribution by provider', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/openai/i)).toBeInTheDocument();
        expect(screen.getByText(/anthropic/i)).toBeInTheDocument();
      });
    });

    it('should display input/output ratio chart', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Cost Analytics Tab', () => {
    it('should display total cost', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /costs/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const costsTab = screen.getByRole('tab', { name: /costs/i });
      await user.click(costsTab);

      await waitFor(() => {
        expect(screen.getByText(/\$1,500/)).toBeInTheDocument();
      });
    });

    it('should display cost breakdown by provider', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /costs/i }));

      await waitFor(() => {
        expect(screen.getByText(/openai/i)).toBeInTheDocument();
        expect(screen.getByText(/\$1,000/)).toBeInTheDocument();
      });
    });

    it('should display cost breakdown by model', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /costs/i }));

      await waitFor(() => {
        expect(screen.getByText(/gpt-4/i)).toBeInTheDocument();
        expect(screen.getByText(/\$800/)).toBeInTheDocument();
      });
    });

    it('should display average cost per token', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /costs/i }));

      await waitFor(() => {
        expect(screen.getByText(/0.0015/)).toBeInTheDocument();
      });
    });
  });

  describe('Revenue Analytics Tab', () => {
    it('should display total revenue', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /revenue/i }));

      await waitFor(() => {
        expect(screen.getByText(/\$50,000/)).toBeInTheDocument();
      });
    });

    it('should display MRR', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /revenue/i }));

      await waitFor(() => {
        expect(screen.getByText(/\$4,500/)).toBeInTheDocument();
      });
    });

    it('should display ARR', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /revenue/i }));

      await waitFor(() => {
        expect(screen.getByText(/\$54,000/)).toBeInTheDocument();
      });
    });

    it('should display revenue by plan', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /revenue/i }));

      await waitFor(() => {
        expect(screen.getByText(/enterprise/i)).toBeInTheDocument();
        expect(screen.getByText(/pro/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Analytics Tab', () => {
    it('should display total users', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /users/i }));

      await waitFor(() => {
        expect(screen.getByText(/150/)).toBeInTheDocument();
      });
    });

    it('should display active users', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /users/i }));

      await waitFor(() => {
        expect(screen.getByText(/120/)).toBeInTheDocument();
      });
    });

    it('should display growth rate', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /users/i }));

      await waitFor(() => {
        expect(screen.getByText(/15%/)).toBeInTheDocument();
      });
    });

    it('should display user distribution by role', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /users/i }));

      await waitFor(() => {
        expect(screen.getByText(/org_owner/i)).toBeInTheDocument();
        expect(screen.getByText(/developer/i)).toBeInTheDocument();
      });
    });
  });

  describe('Trend Analysis', () => {
    it('should display usage trend chart', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByTestId('area-chart') ||
               screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should display trend direction indicator', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByTestId('area-chart') ||
               screen.getByText(/up/i) ||
               screen.getByTestId('trend-indicator')).toBeInTheDocument();
      });
    });

    it('should allow granularity selection', async () => {
      const user = userEvent.setup();
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/hourly/i) ||
               screen.getByText(/daily/i) ||
               screen.getByText(/weekly/i)).toBeInTheDocument();
      });

      const dailyButton = screen.getByRole('button', { name: /daily/i });
      await user.click(dailyButton);

      await waitFor(() => {
        expect(api.getUsageTrends).toHaveBeenCalled();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('should have date range selector', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i) ||
               screen.getByPlaceholderText(/from/i) ||
               screen.getByText(/date range/i)).toBeInTheDocument();
      });
    });

    it('should update analytics when date range changes', async () => {
      const user = userEvent.setup();
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/analytics/i)).toBeInTheDocument();
      });

      // Find and interact with date picker
      const dateInput = screen.getByLabelText(/start date/i) ||
                        screen.getByPlaceholderText(/from/i);
      await user.type(dateInput, '2024-01-01');

      await waitFor(() => {
        expect(api.getTokenAnalytics).toHaveBeenCalled();
      });
    });

    it('should support preset date ranges', async () => {
      const user = userEvent.setup();
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/last 7 days/i) ||
               screen.getByText(/last 30 days/i) ||
               screen.getByText(/last 90 days/i)).toBeInTheDocument();
      });

      const last7Days = screen.getByRole('button', { name: /last 7 days/i });
      await user.click(last7Days);

      await waitFor(() => {
        expect(api.getTokenAnalytics).toHaveBeenCalled();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should have export button', async () => {
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });

    it('should show export options on click', async () => {
      const user = userEvent.setup();
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/csv/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accuracy Tests', () => {
    it('should calculate token ratios correctly', async () => {
      renderAnalytics();

      await waitFor(() => {
        // Input ratio should be 60% (600k/1M)
        // Output ratio should be 40% (400k/1M)
        expect(screen.getByText(/60%/i)).toBeInTheDocument();
        expect(screen.getByText(/40%/i)).toBeInTheDocument();
      });
    });

    it('should display consistent totals across views', async () => {
      renderAnalytics();

      await waitFor(() => {
        // Total tokens should match sum of input + output
        expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
        expect(screen.getByText(/600,000/)).toBeInTheDocument();
        expect(screen.getByText(/400,000/)).toBeInTheDocument();
      });
    });

    it('should calculate percentage breakdowns correctly', async () => {
      renderAnalytics();

      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /costs/i }));

      await waitFor(() => {
        // OpenAI should be ~66.7% of total cost
        expect(screen.getByText(/66%/i) ||
               screen.getByText(/67%/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      api.getTokenAnalytics.mockRejectedValue(new Error('Failed to fetch'));

      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/error/i) ||
               screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should have retry functionality', async () => {
      const user = userEvent.setup();
      api.getTokenAnalytics.mockRejectedValueOnce(new Error('Failed'));
      api.getTokenAnalytics.mockResolvedValueOnce({ data: mockTokenAnalytics });

      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(api.getTokenAnalytics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should render within acceptable time', async () => {
      const startTime = Date.now();
      renderAnalytics();

      await waitFor(() => {
        expect(screen.getByText(/analytics/i)).toBeInTheDocument();
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1500);
    });

    it('should not make redundant API calls on tab switch', async () => {
      const user = userEvent.setup();
      renderAnalytics();

      await waitFor(() => {
        expect(api.getTokenAnalytics).toHaveBeenCalledTimes(1);
      });

      // Switch to costs tab
      await user.click(screen.getByRole('tab', { name: /costs/i }));

      await waitFor(() => {
        expect(api.getCostAnalytics).toHaveBeenCalledTimes(1);
      });

      // Switch back to tokens - should not refetch if cached
      await user.click(screen.getByRole('tab', { name: /tokens/i }));

      // Should still be 1 (no additional call)
      expect(api.getTokenAnalytics).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderAnalytics();

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toBeInTheDocument();
      });
    });

    it('should have accessible tabs', async () => {
      renderAnalytics();

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab');
        tabs.forEach(tab => {
          expect(tab).toHaveAttribute('aria-selected');
        });
      });
    });

    it('should have accessible charts', async () => {
      renderAnalytics();

      await waitFor(() => {
        const charts = screen.getAllByRole('img');
        expect(charts.length).toBeGreaterThan(0);
      });
    });
  });
});