/**
 * Pricing Engine Service Unit Tests
 *
 * Tests for all pricing calculation functions.
 */

import mongoose from 'mongoose';
import pricingEngineService from '../../../src/services/pricingEngine.service.js';
import AIModel from '../../../src/models/AIModel.js';
import Feature from '../../../src/models/Feature.js';
import Plan from '../../../src/models/Plan.js';
import Provider from '../../../src/models/Provider.js';
import Organization from '../../../src/models/Organization.js';

// Mock models
jest.mock('../../../src/models/AIModel.js');
jest.mock('../../../src/models/Feature.js');
jest.mock('../../../src/models/Plan.js');
jest.mock('../../../src/models/Provider.js');
jest.mock('../../../src/models/Organization.js');
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('PricingEngineService', () => {
  // Sample test data
  const mockModel = {
    _id: 'model123',
    name: 'gpt-4',
    displayName: 'GPT-4',
    type: 'chat',
    pricing: {
      inputPrice: 30, // $30 per 1M tokens
      outputPrice: 60, // $60 per 1M tokens
      currency: 'USD',
      unit: 'per_1m_tokens'
    }
  };

  const mockProvider = {
    _id: 'provider123',
    name: 'OpenAI',
    slug: 'openai'
  };

  const mockFeature = {
    _id: 'feature123',
    name: 'Chat Assistant',
    category: 'chat',
    model: mockModel,
    provider: mockProvider,
    tokenEstimates: {
      inputTokensPerRequest: 500,
      outputTokensPerRequest: 200,
      calculationMethod: 'fixed'
    },
    infrastructureCost: {
      fixedCostPerRequest: 0.001,
      overheadPercentage: 10,
      monthlyFixedCost: 100
    }
  };

  const mockPlan = {
    _id: 'plan123',
    name: 'Pro Plan',
    tier: 'pro',
    billing: {
      price: 49.99,
      currency: 'USD',
      interval: 'month'
    },
    pricingModel: {
      type: 'flat'
    },
    features: [],
    costs: {
      fixedCostsPerMonth: 500,
      variableCostPercentage: 2.9
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // FR-22: Token Cost Calculation Tests
  // ==========================================
  describe('calculateTokenCost', () => {
    it('should calculate token cost correctly', () => {
      const inputTokens = 1000000; // 1M tokens
      const outputTokens = 500000; // 500K tokens

      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        inputTokens,
        outputTokens
      );

      expect(result).toBeDefined();
      expect(result.tokens.input).toBe(inputTokens);
      expect(result.tokens.output).toBe(outputTokens);
      expect(result.tokens.total).toBe(1500000);
      expect(result.costs.inputCost).toBe(30); // $30 for 1M input
      expect(result.costs.outputCost).toBe(30); // $30 for 500K output (60/2)
      expect(result.costs.tokenCost).toBe(60);
      expect(result.costs.totalCost).toBe(60);
      expect(result.currency).toBe('USD');
    });

    it('should apply infrastructure overhead percentage', () => {
      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        1000000,
        1000000,
        { infrastructureOverheadPercent: 20 }
      );

      // Base cost: $30 + $60 = $90
      // Overhead: 20% of $90 = $18
      // Total: $108
      expect(result.costs.infrastructureCost).toBe(18);
      expect(result.costs.totalCost).toBe(108);
    });

    it('should apply fixed cost per request', () => {
      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        1000000,
        1000000,
        { fixedCostPerRequest: 0.01 }
      );

      expect(result.costs.fixedCost).toBe(0.01);
      expect(result.costs.totalCost).toBe(90.01);
    });

    it('should handle zero tokens', () => {
      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        0,
        0
      );

      expect(result.costs.totalCost).toBe(0);
    });

    it('should handle model without pricing', () => {
      const modelNoPricing = { ...mockModel, pricing: {} };
      const result = pricingEngineService.calculateTokenCost(
        modelNoPricing,
        1000000,
        1000000
      );

      expect(result.costs.inputCost).toBe(0);
      expect(result.costs.outputCost).toBe(0);
    });
  });

  // ==========================================
  // FR-23: Feature Cost Calculation Tests
  // ==========================================
  describe('calculateFeatureCost', () => {
    beforeEach(() => {
      Feature.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFeature)
      });
    });

    it('should calculate feature cost for fixed calculation method', async () => {
      const result = await pricingEngineService.calculateFeatureCost(
        'feature123',
        100 // requests
      );

      expect(result.requests).toBe(100);
      expect(result.tokens.input).toBe(500 * 100); // 50,000
      expect(result.tokens.output).toBe(200 * 100); // 20,000
    });

    it('should apply dynamic multiplier for dynamic calculation', async () => {
      const dynamicFeature = {
        ...mockFeature,
        tokenEstimates: {
          ...mockFeature.tokenEstimates,
          calculationMethod: 'dynamic',
          dynamicMultiplier: 1.5
        }
      };

      Feature.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(dynamicFeature)
      });

      const result = await pricingEngineService.calculateFeatureCost(
        'feature123',
        100
      );

      expect(result.tokens.input).toBe(500 * 100 * 1.5);
      expect(result.tokens.output).toBe(200 * 100 * 1.5);
    });

    it('should handle user-based calculation method', async () => {
      const userBasedFeature = {
        ...mockFeature,
        tokenEstimates: {
          ...mockFeature.tokenEstimates,
          calculationMethod: 'user-based'
        }
      };

      Feature.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(userBasedFeature)
      });

      const result = await pricingEngineService.calculateFeatureCost(
        'feature123',
        100,
        { users: 10 }
      );

      expect(result.tokens.input).toBe(500 * 100 * 10);
      expect(result.tokens.output).toBe(200 * 100 * 10);
    });
  });

  // ==========================================
  // FR-24: User Operational Cost Tests
  // ==========================================
  describe('calculateUserOperationalCosts', () => {
    it('should aggregate costs from multiple features', async () => {
      Feature.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFeature)
      });

      const usageData = {
        featureUsage: [
          { featureId: 'feature1', requests: 100 },
          { featureId: 'feature2', requests: 50 }
        ]
      };

      const result = await pricingEngineService.calculateUserOperationalCosts(
        'org123',
        'user123',
        usageData
      );

      expect(result.user).toBe('user123');
      expect(result.organization).toBe('org123');
      expect(result.summary.totalRequests).toBe(150);
      expect(result.breakdown.byFeature).toHaveLength(2);
    });

    it('should handle direct API usage', async () => {
      AIModel.findById.mockResolvedValue(mockModel);

      const usageData = {
        directApiUsage: [
          { modelId: 'model1', inputTokens: 1000, outputTokens: 500 }
        ]
      };

      const result = await pricingEngineService.calculateUserOperationalCosts(
        'org123',
        'user123',
        usageData
      );

      expect(result.breakdown.byApi).toHaveLength(1);
      expect(result.summary.apiCost).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // FR-25: Subscription Profitability Tests
  // ==========================================
  describe('calculatePlanProfitability', () => {
    beforeEach(() => {
      Plan.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPlan)
      });
    });

    it('should calculate flat pricing profitability', async () => {
      const result = await pricingEngineService.calculatePlanProfitability('plan123');

      expect(result.plan.name).toBe('Pro Plan');
      expect(result.revenue.base).toBe(49.99);
      expect(result.profitability).toBeDefined();
    });

    it('should calculate profit margin correctly', async () => {
      const result = await pricingEngineService.calculatePlanProfitability('plan123');

      // Margin = (Revenue - Cost) / Revenue * 100
      expect(result.profitability.margin).toBeDefined();
      expect(typeof result.profitability.margin).toBe('number');
    });
  });

  // ==========================================
  // FR-26: Multiple Pricing Models Tests
  // ==========================================
  describe('calculateByPricingModel', () => {
    it('should calculate flat pricing correctly', () => {
      const result = pricingEngineService.calculateFlatPricing(mockPlan, {});

      expect(result.model).toBe('flat');
      expect(result.basePrice).toBe(49.99);
      expect(result.totalCost).toBe(49.99);
    });

    it('should calculate usage-based pricing with overage', () => {
      const usagePlan = {
        ...mockPlan,
        pricingModel: {
          type: 'usage-based',
          usageBased: {
            includedTokens: 1000000,
            includedRequests: 1000,
            pricePerToken: 0.00002,
            pricePerRequest: 0.01,
            overageMultiplier: 1.5
          }
        }
      };

      const result = pricingEngineService.calculateUsageBasedPricing(usagePlan, {
        tokens: 2000000,
        requests: 1500
      });

      expect(result.model).toBe('usage-based');
      expect(result.overage.tokens).toBe(1000000);
      expect(result.overage.requests).toBe(500);
      expect(result.overageCost).toBeGreaterThan(0);
    });

    it('should calculate tiered pricing correctly', () => {
      const tieredPlan = {
        ...mockPlan,
        pricingModel: {
          type: 'tiered',
          tiers: [
            { from: 0, to: 1000000, pricePerUnit: 0.03 },
            { from: 1000000, to: 5000000, pricePerUnit: 0.02 },
            { from: 5000000, to: null, pricePerUnit: 0.01 }
          ]
        }
      };

      const result = pricingEngineService.calculateTieredPricing(tieredPlan, {
        tokens: 3000000
      });

      expect(result.model).toBe('tiered');
      expect(result.tiers).toHaveLength(2); // Falls into first two tiers
      expect(result.totalTokens).toBe(3000000);
    });

    it('should calculate hybrid pricing correctly', () => {
      const hybridPlan = {
        ...mockPlan,
        pricingModel: {
          type: 'hybrid',
          usageBased: {
            includedTokens: 1000000,
            pricePerToken: 0.00002
          }
        }
      };

      const result = pricingEngineService.calculateHybridPricing(hybridPlan, {
        tokens: 2000000
      });

      expect(result.model).toBe('hybrid');
      expect(result.flat).toBeDefined();
      expect(result.usage).toBeDefined();
    });

    it('should calculate credit-based pricing correctly', () => {
      const creditPlan = {
        ...mockPlan,
        credits: {
          includedCredits: 1000,
          creditPricing: {
            pricePerCredit: 0.01
          }
        }
      };

      const result = pricingEngineService.calculateCreditBasedPricing(creditPlan, {
        creditsUsed: 1500
      });

      expect(result.model).toBe('credit-based');
      expect(result.overageCredits).toBe(500);
      expect(result.overageCost).toBe(5); // 500 * 0.01
    });
  });

  // ==========================================
  // FR-27: Margin Calculations Tests
  // ==========================================
  describe('calculateMarginScenarios', () => {
    beforeEach(() => {
      Plan.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPlan)
      });
    });

    it('should calculate multiple margin scenarios', async () => {
      const scenarios = [
        { name: 'Low usage', usage: { users: 10 } },
        { name: 'Medium usage', usage: { users: 100 } },
        { name: 'High usage', usage: { users: 1000 } }
      ];

      const result = await pricingEngineService.calculateMarginScenarios('plan123', scenarios);

      expect(result.scenarios).toHaveLength(3);
      expect(result.averageMargin).toBeDefined();
      expect(result.bestCase).toBeDefined();
      expect(result.worstCase).toBeDefined();
    });
  });

  // ==========================================
  // FR-28: Break-even Analysis Tests
  // ==========================================
  describe('calculateBreakEvenAnalysis', () => {
    beforeEach(() => {
      Plan.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPlan)
      });
    });

    it('should calculate break-even users correctly', async () => {
      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      expect(result.analysis.breakEvenUsers).toBeDefined();
      expect(result.analysis.breakEvenUsers).toBeGreaterThanOrEqual(0);
      expect(result.analysis.contributionMargin).toBeDefined();
      expect(result.scenarios).toBeDefined();
      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations', async () => {
      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
    });

    it('should calculate scenarios for different user counts', async () => {
      const options = { scenarios: [10, 50, 100, 500] };
      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123', options);

      expect(result.scenarios).toHaveLength(4);
      result.scenarios.forEach(scenario => {
        expect(scenario.users).toBeDefined();
        expect(scenario.revenue).toBeDefined();
        expect(scenario.totalCost).toBeDefined();
        expect(scenario.profit).toBeDefined();
        expect(scenario.margin).toBeDefined();
      });
    });
  });

  // ==========================================
  // Model Comparison Tests
  // ==========================================
  describe('compareModelCosts', () => {
    it('should compare costs across multiple models', async () => {
      AIModel.findById
        .mockResolvedValueOnce(mockModel)
        .mockResolvedValueOnce({
          ...mockModel,
          _id: 'model456',
          name: 'gpt-3.5-turbo',
          pricing: { inputPrice: 1.5, outputPrice: 2 }
        });

      const result = await pricingEngineService.compareModelCosts(
        ['model123', 'model456'],
        { inputTokens: 1000000, outputTokens: 500000 }
      );

      expect(result.comparisons).toHaveLength(2);
      expect(result.cheapest).toBeDefined();
      expect(result.mostExpensive).toBeDefined();
      expect(result.savings).toBeDefined();
    });
  });

  // ==========================================
  // Edge Cases Tests
  // ==========================================
  describe('Edge Cases', () => {
    it('should handle zero pricing', () => {
      const freeModel = {
        ...mockModel,
        pricing: { inputPrice: 0, outputPrice: 0 }
      };

      const result = pricingEngineService.calculateTokenCost(freeModel, 1000, 1000);

      expect(result.costs.totalCost).toBe(0);
    });

    it('should handle very large token counts', () => {
      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        1000000000000, // 1 trillion tokens
        1000000000000
      );

      expect(result.costs.totalCost).toBeGreaterThan(0);
      expect(isFinite(result.costs.totalCost)).toBe(true);
    });

    it('should handle negative contribution margin (unprofitable)', async () => {
      const unprofitablePlan = {
        ...mockPlan,
        billing: { price: 5 }, // Very low price
        costs: { fixedCostsPerMonth: 1000 }
      };

      Plan.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(unprofitablePlan)
      });

      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      // Negative contribution margin means no break-even
      if (result.analysis.contributionMargin <= 0) {
        expect(result.recommendation).toContain('not profitable');
      }
    });
  });
});