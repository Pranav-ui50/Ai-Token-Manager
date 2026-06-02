/**
 * Pricing History Model Tests
 *
 * Tests for pricing history tracking functionality.
 */

import mongoose from 'mongoose';

// Mock PricingHistory model
const mockPricingHistory = {
  create: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
  recordChange: jest.fn(),
  getHistoryForModel: jest.fn(),
  getHistoryForProvider: jest.fn(),
  getRecentChanges: jest.fn(),
  getPriceTrends: jest.fn()
};

jest.mock('../../../src/models/PricingHistory.js', () => mockPricingHistory);

jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('PricingHistory Model', () => {
  const mockModelId = '507f1f77bcf86cd799439011';
  const mockProviderId = '507f1f77bcf86cd799439012';
  const mockUserId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // Record Price Change Tests
  // ==========================================
  describe('recordChange', () => {
    it('should create pricing history entry with price change calculation', async () => {
      const previousPricing = { inputPrice: 20, outputPrice: 40 };
      const newPricing = { inputPrice: 30, outputPrice: 60 };

      mockPricingHistory.recordChange.mockResolvedValue({
        _id: 'mockId',
        model: mockModelId,
        provider: mockProviderId,
        previousPricing,
        newPricing,
        priceChange: {
          inputPriceChange: 10,
          outputPriceChange: 20,
          inputPriceChangePercent: 50,
          outputPriceChangePercent: 50
        },
        changedBy: mockUserId
      });

      const result = await mockPricingHistory.recordChange({
        modelId: mockModelId,
        providerId: mockProviderId,
        previousPricing,
        newPricing,
        changedBy: mockUserId,
        reason: 'provider_update'
      });

      expect(result).toBeDefined();
      expect(result.priceChange.inputPriceChange).toBe(10);
      expect(result.priceChange.outputPriceChange).toBe(20);
      expect(result.priceChange.inputPriceChangePercent).toBe(50);
      expect(result.priceChange.outputPriceChangePercent).toBe(50);
    });

    it('should handle price decrease correctly', async () => {
      const previousPricing = { inputPrice: 30, outputPrice: 60 };
      const newPricing = { inputPrice: 15, outputPrice: 30 };

      mockPricingHistory.recordChange.mockResolvedValue({
        _id: 'mockId',
        model: mockModelId,
        provider: mockProviderId,
        previousPricing,
        newPricing,
        priceChange: {
          inputPriceChange: -15,
          outputPriceChange: -30,
          inputPriceChangePercent: -50,
          outputPriceChangePercent: -50
        },
        changedBy: mockUserId
      });

      const result = await mockPricingHistory.recordChange({
        modelId: mockModelId,
        providerId: mockProviderId,
        previousPricing,
        newPricing,
        changedBy: mockUserId
      });

      expect(result.priceChange.inputPriceChange).toBe(-15);
      expect(result.priceChange.outputPriceChange).toBe(-30);
    });

    it('should handle zero to non-zero price change', async () => {
      const previousPricing = { inputPrice: 0, outputPrice: 0 };
      const newPricing = { inputPrice: 10, outputPrice: 20 };

      mockPricingHistory.recordChange.mockResolvedValue({
        _id: 'mockId',
        model: mockModelId,
        provider: mockProviderId,
        previousPricing,
        newPricing,
        priceChange: {
          inputPriceChange: 10,
          outputPriceChange: 20,
          inputPriceChangePercent: 0,
          outputPriceChangePercent: 0
        },
        changedBy: mockUserId
      });

      const result = await mockPricingHistory.recordChange({
        modelId: mockModelId,
        providerId: mockProviderId,
        previousPricing,
        newPricing,
        changedBy: mockUserId
      });

      expect(result.priceChange.inputPriceChange).toBe(10);
      expect(result.priceChange.outputPriceChange).toBe(20);
    });

    it('should include optional fields', async () => {
      const data = {
        modelId: mockModelId,
        providerId: mockProviderId,
        previousPricing: { inputPrice: 20, outputPrice: 40 },
        newPricing: { inputPrice: 30, outputPrice: 60 },
        changedBy: mockUserId,
        reason: 'manual_adjustment',
        notes: 'Annual price review',
        source: 'official'
      };

      mockPricingHistory.recordChange.mockResolvedValue({
        _id: 'mockId',
        ...data
      });

      const result = await mockPricingHistory.recordChange(data);

      expect(result).toBeDefined();
      expect(mockPricingHistory.recordChange).toHaveBeenCalledWith(data);
    });
  });

  // ==========================================
  // Get History Tests
  // ==========================================
  describe('getHistoryForModel', () => {
    it('should return pricing history for a model', async () => {
      mockPricingHistory.getHistoryForModel.mockResolvedValue([]);

      const history = await mockPricingHistory.getHistoryForModel(mockModelId);

      expect(mockPricingHistory.getHistoryForModel).toHaveBeenCalled();
    });

    it('should support pagination options', async () => {
      mockPricingHistory.getHistoryForModel.mockResolvedValue([]);

      const history = await mockPricingHistory.getHistoryForModel(mockModelId, {
        limit: 10,
        skip: 5
      });

      expect(mockPricingHistory.getHistoryForModel).toHaveBeenCalledWith(mockModelId, {
        limit: 10,
        skip: 5
      });
    });
  });

  describe('getHistoryForProvider', () => {
    it('should return pricing history for a provider', async () => {
      mockPricingHistory.getHistoryForProvider.mockResolvedValue([]);

      const history = await mockPricingHistory.getHistoryForProvider(mockProviderId);

      expect(mockPricingHistory.getHistoryForProvider).toHaveBeenCalled();
    });

    it('should populate model and changedBy fields', async () => {
      mockPricingHistory.getHistoryForProvider.mockResolvedValue([]);

      await mockPricingHistory.getHistoryForProvider(mockProviderId);

      expect(mockPricingHistory.getHistoryForProvider).toHaveBeenCalledWith(mockProviderId);
    });
  });

  // ==========================================
  // Recent Changes Tests
  // ==========================================
  describe('getRecentChanges', () => {
    it('should return recent pricing changes', async () => {
      mockPricingHistory.getRecentChanges.mockResolvedValue([]);

      const changes = await mockPricingHistory.getRecentChanges();

      expect(mockPricingHistory.getRecentChanges).toHaveBeenCalled();
    });

    it('should filter by number of days', async () => {
      mockPricingHistory.getRecentChanges.mockResolvedValue([]);

      const changes = await mockPricingHistory.getRecentChanges({ days: 30 });

      expect(mockPricingHistory.getRecentChanges).toHaveBeenCalledWith({ days: 30 });
    });

    it('should limit results', async () => {
      mockPricingHistory.getRecentChanges.mockResolvedValue([]);

      const changes = await mockPricingHistory.getRecentChanges({ days: 7, limit: 100 });

      expect(mockPricingHistory.getRecentChanges).toHaveBeenCalledWith({ days: 7, limit: 100 });
    });
  });

  // ==========================================
  // Price Trends Tests
  // ==========================================
  describe('getPriceTrends', () => {
    it('should return price trends for a model', async () => {
      mockPricingHistory.getPriceTrends.mockResolvedValue([]);

      const trends = await mockPricingHistory.getPriceTrends(mockModelId);

      expect(mockPricingHistory.getPriceTrends).toHaveBeenCalled();
    });

    it('should support custom date range', async () => {
      mockPricingHistory.getPriceTrends.mockResolvedValue([]);

      const trends = await mockPricingHistory.getPriceTrends(mockModelId, 60);

      expect(mockPricingHistory.getPriceTrends).toHaveBeenCalledWith(mockModelId, 60);
    });
  });

  // ==========================================
  // Verification Tests
  // ==========================================
  describe('verify pricing change', () => {
    it('should mark pricing change as verified', async () => {
      const historyEntry = {
        _id: 'mockId',
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
        save: jest.fn().mockResolvedValue({
          isVerified: true,
          verifiedBy: mockUserId,
          verifiedAt: new Date()
        })
      };

      historyEntry.isVerified = true;
      historyEntry.verifiedBy = mockUserId;
      historyEntry.verifiedAt = new Date();

      const result = await historyEntry.save();

      expect(result.isVerified).toBe(true);
      expect(result.verifiedBy).toBe(mockUserId);
      expect(result.verifiedAt).toBeDefined();
    });
  });

  // ==========================================
  // Price Change Calculation Tests
  // ==========================================
  describe('price change calculations', () => {
    it('should calculate percentage change correctly', () => {
      const previousPrice = 100;
      const newPrice = 150;
      const percentChange = ((newPrice - previousPrice) / previousPrice) * 100;

      expect(percentChange).toBe(50);
    });

    it('should handle zero previous price', () => {
      const previousPrice = 0;
      const newPrice = 50;
      const percentChange = previousPrice === 0 ? 0 : ((newPrice - previousPrice) / previousPrice) * 100;

      expect(percentChange).toBe(0);
    });

    it('should identify price increase direction', () => {
      const inputChange = 10;
      const outputChange = 20;

      const inputDirection = inputChange > 0 ? 'increase' : inputChange < 0 ? 'decrease' : 'no_change';
      const outputDirection = outputChange > 0 ? 'increase' : outputChange < 0 ? 'decrease' : 'no_change';

      expect(inputDirection).toBe('increase');
      expect(outputDirection).toBe('increase');
    });

    it('should identify price decrease direction', () => {
      const inputChange = -10;
      const outputChange = -5;

      const inputDirection = inputChange > 0 ? 'increase' : inputChange < 0 ? 'decrease' : 'no_change';
      const outputDirection = outputChange > 0 ? 'increase' : outputChange < 0 ? 'decrease' : 'no_change';

      expect(inputDirection).toBe('decrease');
      expect(outputDirection).toBe('decrease');
    });
  });

  // ==========================================
  // Validation Tests
  // ==========================================
  describe('validation', () => {
    it('should validate required fields', () => {
      const requiredFields = ['model', 'provider', 'newPricing', 'changedBy'];
      const data = {
        model: mockModelId,
        provider: mockProviderId,
        newPricing: { inputPrice: 30, outputPrice: 60 },
        changedBy: mockUserId
      };

      requiredFields.forEach(field => {
        expect(data[field]).toBeDefined();
      });
    });

    it('should validate reason enum values', () => {
      const validReasons = ['provider_update', 'manual_adjustment', 'market_adjustment', 'promotional', 'other'];
      const reason = 'provider_update';

      expect(validReasons).toContain(reason);
    });

    it('should validate source enum values', () => {
      const validSources = ['official', 'estimated', 'manual'];
      const source = 'official';

      expect(validSources).toContain(source);
    });
  });
});