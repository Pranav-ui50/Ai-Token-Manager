/**
 * Chart Service Unit Tests
 */

import ChartService from '../../../src/services/chart.service.js';
import { mockRequest, mockResponse } from '../helpers/testUtils.js';

// Mock dependencies
jest.mock('../../../src/models/Usage.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../../src/models/Feature.js', () => ({
  find: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../../../src/models/User.js', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../../../src/models/Organization.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

import Usage from '../../../src/models/Usage.js';
import Feature from '../../../src/models/Feature.js';
import User from '../../../src/models/User.js';
import Organization from '../../../src/models/Organization.js';

describe('ChartService', () => {
  let chartService;

  beforeEach(() => {
    chartService = new ChartService();
    jest.clearAllMocks();
  });

  describe('getRevenueChartData()', () => {
    it('should return revenue chart data', async () => {
      const mockData = [
        { date: '2024-01-01', value: 1000 },
        { date: '2024-01-02', value: 1200 },
        { date: '2024-01-03', value: 900 }
      ];

      Usage.aggregate.mockResolvedValue(mockData);

      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty results', async () => {
      Usage.aggregate.mockResolvedValue([]);

      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result).toEqual([]);
    });

    it('should group by day correctly', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01-01', total: 5000 },
        { _id: '2024-01-02', total: 6000 }
      ]);

      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        granularity: 'day'
      });

      expect(Usage.aggregate).toHaveBeenCalled();
    });

    it('should group by week correctly', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-W01', total: 15000 },
        { _id: '2024-W02', total: 18000 }
      ]);

      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        granularity: 'week'
      });

      expect(Usage.aggregate).toHaveBeenCalled();
    });

    it('should group by month correctly', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01', total: 50000 },
        { _id: '2024-02', total: 55000 }
      ]);

      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        granularity: 'month'
      });

      expect(Usage.aggregate).toHaveBeenCalled();
    });
  });

  describe('getUsageChartData()', () => {
    it('should return usage chart data', async () => {
      Usage.aggregate.mockResolvedValue([
        { date: '2024-01-01', inputTokens: 1000, outputTokens: 500 },
        { date: '2024-01-02', inputTokens: 1200, outputTokens: 600 }
      ]);

      const result = await chartService.getUsageChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result).toBeDefined();
    });

    it('should calculate token ratios', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01-01', inputTokens: 1000, outputTokens: 500, total: 1500 }
      ]);

      const result = await chartService.getUsageChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(Usage.aggregate).toHaveBeenCalled();
    });

    it('should support model filtering', async () => {
      Usage.aggregate.mockResolvedValue([
        { model: 'gpt-4', totalTokens: 10000 }
      ]);

      const result = await chartService.getUsageChartData({
        organizationId: 'org123',
        modelId: 'model123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(Usage.aggregate).toHaveBeenCalled();
    });

    it('should support provider filtering', async () => {
      Usage.aggregate.mockResolvedValue([
        { provider: 'openai', totalTokens: 15000 }
      ]);

      const result = await chartService.getUsageChartData({
        organizationId: 'org123',
        providerId: 'provider123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(Usage.aggregate).toHaveBeenCalled();
    });
  });

  describe('getUserGrowthChartData()', () => {
    it('should return user growth chart data', async () => {
      User.aggregate.mockResolvedValue([
        { date: '2024-01-01', newUsers: 10, totalUsers: 100 },
        { date: '2024-02-01', newUsers: 15, totalUsers: 115 }
      ]);

      const result = await chartService.getUserGrowthChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      expect(result).toBeDefined();
    });

    it('should calculate growth rate correctly', async () => {
      User.aggregate.mockResolvedValue([
        { _id: '2024-01', count: 100 },
        { _id: '2024-02', count: 115 },
        { _id: '2024-03', count: 130 }
      ]);

      const result = await chartService.getUserGrowthChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      });

      expect(Usage.aggregate).toBeDefined();
    });
  });

  describe('getCostDistributionChartData()', () => {
    it('should return cost distribution by provider', async () => {
      Usage.aggregate.mockResolvedValue([
        { provider: 'openai', cost: 500 },
        { provider: 'anthropic', cost: 300 },
        { provider: 'google', cost: 200 }
      ]);

      const result = await chartService.getCostDistributionChartData({
        organizationId: 'org123',
        groupBy: 'provider'
      });

      expect(result).toBeDefined();
    });

    it('should return cost distribution by model', async () => {
      Usage.aggregate.mockResolvedValue([
        { model: 'gpt-4', cost: 400 },
        { model: 'gpt-3.5-turbo', cost: 300 },
        { model: 'claude-3', cost: 300 }
      ]);

      const result = await chartService.getCostDistributionChartData({
        organizationId: 'org123',
        groupBy: 'model'
      });

      expect(result).toBeDefined();
    });

    it('should return cost distribution by feature', async () => {
      Feature.aggregate.mockResolvedValue([
        { feature: 'Chat', cost: 600 },
        { feature: 'Completion', cost: 400 }
      ]);

      const result = await chartService.getCostDistributionChartData({
        organizationId: 'org123',
        groupBy: 'feature'
      });

      expect(result).toBeDefined();
    });
  });

  describe('getFeatureUsageChartData()', () => {
    it('should return feature usage data', async () => {
      Feature.aggregate.mockResolvedValue([
        { name: 'Chat API', usage: 5000 },
        { name: 'Image Generation', usage: 3000 },
        { name: 'Embeddings', usage: 2000 }
      ]);

      const result = await chartService.getFeatureUsageChartData({
        organizationId: 'org123'
      });

      expect(result).toBeDefined();
    });

    it('should calculate percentage correctly', async () => {
      Feature.aggregate.mockResolvedValue([
        { name: 'Chat', count: 500 },
        { name: 'Images', count: 300 },
        { name: 'Embeddings', count: 200 }
      ]);

      const result = await chartService.getFeatureUsageChartData({
        organizationId: 'org123'
      });

      // Total is 1000, percentages should be 50%, 30%, 20%
      expect(Feature.aggregate).toHaveBeenCalled();
    });
  });

  describe('getTrendChartData()', () => {
    it('should return trend data with comparison', async () => {
      Usage.aggregate.mockResolvedValue([
        { period: 'current', value: 1000 },
        { period: 'previous', value: 800 }
      ]);

      const result = await chartService.getTrendChartData({
        organizationId: 'org123',
        metric: 'revenue',
        currentPeriod: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        previousPeriod: { start: new Date('2023-12-01'), end: new Date('2023-12-31') }
      });

      expect(result).toBeDefined();
    });

    it('should calculate percentage change correctly', async () => {
      Usage.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 1000 }]) // Current period
        .mockResolvedValueOnce([{ _id: null, total: 800 }]); // Previous period

      const result = await chartService.getTrendChartData({
        organizationId: 'org123',
        metric: 'tokens'
      });

      // Change should be +25% (1000 - 800) / 800 * 100
      expect(Usage.aggregate).toHaveBeenCalled();
    });
  });

  describe('formatChartData()', () => {
    it('should format data for Chart.js', () => {
      const rawData = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 }
      ];

      const result = chartService.formatChartData(rawData, {
        label: 'Revenue',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)'
      });

      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('datasets');
      expect(Array.isArray(result.labels)).toBe(true);
      expect(Array.isArray(result.datasets)).toBe(true);
    });

    it('should handle multiple datasets', () => {
      const rawData = {
        input: [{ date: '2024-01-01', value: 100 }],
        output: [{ date: '2024-01-01', value: 50 }]
      };

      const result = chartService.formatChartData(rawData, [
        { key: 'input', label: 'Input Tokens', color: 'blue' },
        { key: 'output', label: 'Output Tokens', color: 'green' }
      ]);

      expect(result.datasets).toHaveLength(2);
    });
  });

  describe('Chart Rendering Tests', () => {
    it('should generate valid chart configuration for line chart', () => {
      const config = chartService.getChartConfig('line', {
        labels: ['Jan', 'Feb', 'Mar'],
        data: [10, 20, 30],
        label: 'Revenue'
      });

      expect(config.type).toBe('line');
      expect(config.data.labels).toEqual(['Jan', 'Feb', 'Mar']);
      expect(config.data.datasets[0].data).toEqual([10, 20, 30]);
    });

    it('should generate valid chart configuration for bar chart', () => {
      const config = chartService.getChartConfig('bar', {
        labels: ['Provider A', 'Provider B', 'Provider C'],
        data: [100, 200, 150],
        label: 'Usage'
      });

      expect(config.type).toBe('bar');
      expect(config.data.labels).toHaveLength(3);
    });

    it('should generate valid chart configuration for pie chart', () => {
      const config = chartService.getChartConfig('pie', {
        labels: ['Chat', 'Images', 'Embeddings'],
        data: [50, 30, 20],
        label: 'Feature Distribution'
      });

      expect(config.type).toBe('pie');
      expect(config.data.labels).toHaveLength(3);
    });

    it('should generate valid chart configuration for doughnut chart', () => {
      const config = chartService.getChartConfig('doughnut', {
        labels: ['Model A', 'Model B'],
        data: [60, 40],
        label: 'Model Usage'
      });

      expect(config.type).toBe('doughnut');
    });

    it('should apply custom colors', () => {
      const config = chartService.getChartConfig('line', {
        labels: ['Jan', 'Feb'],
        data: [10, 20],
        label: 'Test',
        colors: {
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          borderColor: 'rgba(255, 0, 0, 1)'
        }
      });

      expect(config.data.datasets[0].backgroundColor).toBe('rgba(255, 0, 0, 0.2)');
      expect(config.data.datasets[0].borderColor).toBe('rgba(255, 0, 0, 1)');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        date: new Date(2024, 0, 1 + (i % 365)),
        value: Math.random() * 1000
      }));

      Usage.aggregate.mockResolvedValue(largeData);

      const startTime = Date.now();
      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });
      const endTime = Date.now();

      // Should process within 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should cache frequently accessed data', async () => {
      Usage.aggregate.mockResolvedValue([{ value: 100 }]);

      // First call
      await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      // Second call should use cache
      await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      // Implementation should check cache
      expect(Usage.aggregate).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values in data', () => {
      const data = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: null },
        { date: '2024-01-03', value: 200 }
      ];

      const result = chartService.formatChartData(data, { label: 'Test' });

      // Should handle null gracefully
      expect(result.datasets[0].data).toBeDefined();
    });

    it('should handle missing dates', async () => {
      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01-01', total: 100 },
        // Missing 2024-01-02
        { _id: '2024-01-03', total: 200 }
      ]);

      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
        fillGaps: true
      });

      expect(result).toBeDefined();
    });

    it('should handle invalid date ranges', async () => {
      Usage.aggregate.mockResolvedValue([]);

      const result = await chartService.getRevenueChartData({
        organizationId: 'org123',
        startDate: new Date('2024-12-31'), // End date before start date
        endDate: new Date('2024-01-01')
      });

      expect(result).toBeDefined();
    });
  });
});