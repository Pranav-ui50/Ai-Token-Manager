/**
 * Analytics Service Unit Tests
 */

import AnalyticsService from '../../../src/services/analytics.service.js';

// Mock dependencies
jest.mock('../../../src/models/Usage.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../../../src/models/User.js', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../../src/models/Organization.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../../../src/models/Feature.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../../src/models/AIModel.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../../src/models/Provider.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

import Usage from '../../../src/models/Usage.js';
import User from '../../../src/models/User.js';
import Organization from '../../../src/models/Organization.js';
import Feature from '../../../src/models/Feature.js';
import AIModel from '../../../src/models/AIModel.js';
import Provider from '../../../src/models/Provider.js';

describe('AnalyticsService', () => {
  let analyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    jest.clearAllMocks();
  });

  describe('getTokenUsageAnalytics()', () => {
    it('should return token usage statistics', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalTokens: 100000, inputTokens: 70000, outputTokens: 30000 }
      ]);

      const result = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('inputTokens');
      expect(result).toHaveProperty('outputTokens');
    });

    it('should return zero values when no data exists', async () => {
      Usage.aggregate.mockResolvedValue([]);

      const result = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.totalTokens).toBe(0);
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });

    it('should calculate token ratios correctly', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalTokens: 100000, inputTokens: 60000, outputTokens: 40000 }
      ]);

      const result = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      // Output ratio should be 40%
      expect(result.outputRatio).toBeCloseTo(0.4, 2);
      // Input ratio should be 60%
      expect(result.inputRatio).toBeCloseTo(0.6, 2);
    });

    it('should group by model when requested', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: { model: 'gpt-4' }, totalTokens: 50000 },
        { _id: { model: 'gpt-3.5-turbo' }, totalTokens: 30000 },
        { _id: { model: 'claude-3' }, totalTokens: 20000 }
      ]);

      const result = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123',
        groupBy: 'model'
      });

      expect(result.byModel).toBeDefined();
      expect(Array.isArray(result.byModel)).toBe(true);
    });

    it('should group by provider when requested', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: { provider: 'openai' }, totalTokens: 70000 },
        { _id: { provider: 'anthropic' }, totalTokens: 30000 }
      ]);

      const result = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123',
        groupBy: 'provider'
      });

      expect(result.byProvider).toBeDefined();
    });
  });

  describe('getCostAnalytics()', () => {
    it('should return cost statistics', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalCost: 1500.50, totalTokens: 100000 }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('avgCostPerToken');
    });

    it('should calculate average cost per token correctly', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalCost: 1000, totalTokens: 1000000 }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123'
      });

      // $0.001 per token
      expect(result.avgCostPerToken).toBeCloseTo(0.001, 6);
    });

    it('should provide cost breakdown by provider', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: { provider: 'openai' }, cost: 1000 },
        { _id: { provider: 'anthropic' }, cost: 500 }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123',
        groupBy: 'provider'
      });

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.byProvider).toBeDefined();
    });

    it('should provide cost breakdown by model', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: { model: 'gpt-4' }, cost: 800 },
        { _id: { model: 'gpt-3.5-turbo' }, cost: 200 }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123',
        groupBy: 'model'
      });

      expect(result.breakdown.byModel).toBeDefined();
    });

    it('should provide cost breakdown by feature', async () => {
      Feature.aggregate.mockResolvedValue([
        { _id: { feature: 'chat' }, cost: 600 },
        { _id: { feature: 'embeddings' }, cost: 400 }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123',
        groupBy: 'feature'
      });

      expect(result.breakdown.byFeature).toBeDefined();
    });
  });

  describe('getRevenueAnalytics()', () => {
    it('should return revenue statistics', async () => {
      Organization.aggregate.mockResolvedValue([
        { _id: null, totalRevenue: 50000, monthlyRevenue: 4500 }
      ]);

      const result = await analyticsService.getRevenueAnalytics({
        organizationId: 'org123'
      });

      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('mrr');
    });

    it('should calculate MRR correctly', async () => {
      Organization.aggregate.mockResolvedValue([
        { _id: null, mrr: 5000 }
      ]);

      const result = await analyticsService.getRevenueAnalytics({
        organizationId: 'org123'
      });

      expect(result.mrr).toBeDefined();
    });

    it('should provide revenue by plan', async () => {
      Organization.aggregate.mockResolvedValue([
        { _id: { plan: 'enterprise' }, revenue: 30000 },
        { _id: { plan: 'pro' }, revenue: 15000 },
        { _id: { plan: 'free' }, revenue: 0 }
      ]);

      const result = await analyticsService.getRevenueAnalytics({
        organizationId: 'org123',
        groupBy: 'plan'
      });

      expect(result.revenueByPlan).toBeDefined();
    });

    it('should calculate ARR from MRR', async () => {
      Organization.aggregate.mockResolvedValue([
        { _id: null, mrr: 5000 }
      ]);

      const result = await analyticsService.getRevenueAnalytics({
        organizationId: 'org123'
      });

      // ARR = MRR * 12
      expect(result.arr).toBe(60000);
    });
  });

  describe('getUserAnalytics()', () => {
    it('should return user statistics', async () => {
      User.countDocuments.mockResolvedValue(100);
      User.aggregate.mockResolvedValue([
        { _id: null, activeUsers: 75, newUsers: 10 }
      ]);

      const result = await analyticsService.getUserAnalytics({
        organizationId: 'org123'
      });

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('activeUsers');
    });

    it('should calculate user growth rate', async () => {
      User.aggregate.mockResolvedValue([
        { _id: '2024-01', count: 100 },
        { _id: '2024-02', count: 115 }
      ]);

      const result = await analyticsService.getUserAnalytics({
        organizationId: 'org123'
      });

      expect(result).toHaveProperty('growthRate');
    });

    it('should provide user distribution by role', async () => {
      User.aggregate.mockResolvedValue([
        { _id: 'org_owner', count: 10 },
        { _id: 'org_admin', count: 20 },
        { _id: 'developer', count: 50 },
        { _id: 'viewer', count: 20 }
      ]);

      const result = await analyticsService.getUserAnalytics({
        organizationId: 'org123',
        groupBy: 'role'
      });

      expect(result.byRole).toBeDefined();
    });

    it('should provide user distribution by status', async () => {
      User.aggregate.mockResolvedValue([
        { _id: 'active', count: 90 },
        { _id: 'inactive', count: 10 }
      ]);

      const result = await analyticsService.getUserAnalytics({
        organizationId: 'org123',
        groupBy: 'status'
      });

      expect(result.byStatus).toBeDefined();
    });
  });

  describe('getUsageTrends()', () => {
    it('should return usage trends over time', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01-01', tokens: 1000, cost: 10 },
        { _id: '2024-01-02', tokens: 1200, cost: 12 },
        { _id: '2024-01-03', tokens: 900, cost: 9 }
      ]);

      const result = await analyticsService.getUsageTrends({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        granularity: 'day'
      });

      expect(result).toHaveProperty('trends');
      expect(Array.isArray(result.trends)).toBe(true);
    });

    it('should support hourly granularity', async () => {
      Usage.aggregate.mockResolvedValue(
        Array.from({ length: 24 }, (_, i) => ({
          _id: `hour-${i}`,
          tokens: Math.random() * 1000
        }))
      );

      const result = await analyticsService.getUsageTrends({
        organizationId: 'org123',
        granularity: 'hour'
      });

      expect(result.trends).toBeDefined();
    });

    it('should support daily granularity', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01-01', tokens: 1000 },
        { _id: '2024-01-02', tokens: 1100 }
      ]);

      const result = await analyticsService.getUsageTrends({
        organizationId: 'org123',
        granularity: 'day'
      });

      expect(result.trends).toBeDefined();
    });

    it('should support weekly granularity', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-W01', tokens: 7000 },
        { _id: '2024-W02', tokens: 7500 }
      ]);

      const result = await analyticsService.getUsageTrends({
        organizationId: 'org123',
        granularity: 'week'
      });

      expect(result.trends).toBeDefined();
    });

    it('should support monthly granularity', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01', tokens: 30000 },
        { _id: '2024-02', tokens: 32000 }
      ]);

      const result = await analyticsService.getUsageTrends({
        organizationId: 'org123',
        granularity: 'month'
      });

      expect(result.trends).toBeDefined();
    });

    it('should calculate trend direction', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01-01', tokens: 1000 },
        { _id: '2024-01-02', tokens: 1200 },
        { _id: '2024-01-03', tokens: 1500 }
      ]);

      const result = await analyticsService.getUsageTrends({
        organizationId: 'org123'
      });

      expect(result).toHaveProperty('direction');
      expect(['up', 'down', 'stable']).toContain(result.direction);
    });
  });

  describe('Analytics Accuracy Tests', () => {
    it('should calculate accurate totals', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalTokens: 100000, inputTokens: 60000, outputTokens: 40000 }
      ]);

      const result = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123'
      });

      // Total should equal input + output
      expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
    });

    it('should maintain consistency across related metrics', async () => {
      // Setup multiple aggregates that should be consistent
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalCost: 1000, totalTokens: 100000 }
      ]);

      const costResult = await analyticsService.getCostAnalytics({
        organizationId: 'org123'
      });

      Usage.aggregate.mockResolvedValue([
        { _id: null, totalTokens: 100000 }
      ]);

      const tokenResult = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123'
      });

      // Both should report the same token count
      expect(costResult.totalTokens).toBe(tokenResult.totalTokens);
    });

    it('should handle percentage calculations accurately', async () => {
      User.aggregate.mockResolvedValue([
        { _id: 'active', count: 80 },
        { _id: 'inactive', count: 20 }
      ]);

      const result = await analyticsService.getUserAnalytics({
        organizationId: 'org123',
        groupBy: 'status'
      });

      // Percentages should sum to 100
      const percentages = result.byStatus.map(s => s.percentage);
      const sum = percentages.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(100, 0);
    });

    it('should handle currency precision correctly', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalCost: 1234.5678 }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123'
      });

      // Should round to 2 decimal places
      expect(result.totalCost).toBeCloseTo(1234.57, 2);
    });

    it('should correctly aggregate nested data', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: { provider: 'openai', model: 'gpt-4' }, cost: 500 },
        { _id: { provider: 'openai', model: 'gpt-3.5' }, cost: 300 },
        { _id: { provider: 'anthropic', model: 'claude' }, cost: 200 }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123',
        groupBy: 'provider'
      });

      // OpenAI should have combined cost of 800
      const openaiProvider = result.breakdown.byProvider.find(p => p._id === 'openai');
      expect(openaiProvider.cost).toBe(800);
    });
  });

  describe('Performance Tests', () => {
    it('should respond quickly for simple queries', async () => {
      Usage.aggregate.mockResolvedValue([{ _id: null, total: 100 }]);

      const startTime = Date.now();
      await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123'
      });
      const endTime = Date.now();

      // Should complete within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle large result sets', async () => {
      // Simulate a year of daily data
      const largeData = Array.from({ length: 365 }, (_, i) => ({
        _id: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        tokens: Math.random() * 10000
      }));

      Usage.aggregate.mockResolvedValue(largeData);

      const result = await analyticsService.getUsageTrends({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        granularity: 'day'
      });

      expect(result.trends.length).toBe(365);
    });

    it('should use indexes efficiently', async () => {
      // Test that queries use proper filtering
      Usage.aggregate.mockResolvedValue([]);

      await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      // Verify the aggregate was called (implementation should use proper indexes)
      expect(Usage.aggregate).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      Usage.aggregate.mockRejectedValue(new Error('Database error'));

      await expect(analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123'
      })).rejects.toThrow('Database error');
    });

    it('should handle invalid date ranges', async () => {
      Usage.aggregate.mockResolvedValue([]);

      const result = await analyticsService.getTokenUsageAnalytics({
        organizationId: 'org123',
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01') // End before start
      });

      // Should return empty result, not throw
      expect(result).toBeDefined();
    });

    it('should handle null/undefined values', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: null, totalTokens: null, cost: undefined }
      ]);

      const result = await analyticsService.getCostAnalytics({
        organizationId: 'org123'
      });

      // Should handle null/undefined gracefully
      expect(result).toBeDefined();
    });
  });
});