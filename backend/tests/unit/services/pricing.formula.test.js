/**
 * Pricing Engine Service Tests - Token Calculations & Formula Accuracy
 *
 * Comprehensive tests for:
 * - Token cost calculations
 * - Feature cost calculations
 * - Pricing model accuracy (flat, usage-based, tiered, hybrid, credit-based)
 * - Break-even calculations
 * - Edge cases and boundary conditions
 */

// Mock models before imports
jest.mock('../../../src/models/AIModel.js', () => ({
  findById: jest.fn()
}));
jest.mock('../../../src/models/Feature.js', () => ({
  findById: jest.fn()
}));
jest.mock('../../../src/models/Plan.js', () => ({
  findById: jest.fn()
}));
jest.mock('../../../src/models/Organization.js', () => ({
  findById: jest.fn()
}));
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

import pricingEngineService from '../../../src/services/pricingEngine.service.js';
import AIModel from '../../../src/models/AIModel.js';
import Feature from '../../../src/models/Feature.js';
import Plan from '../../../src/models/Plan.js';

describe('Pricing Engine - Token Calculations', () => {
  const mockModel = {
    _id: 'model123',
    name: 'gpt-4',
    displayName: 'GPT-4',
    type: 'chat',
    pricing: {
      inputPrice: 30, // $30 per 1M tokens
      outputPrice: 60, // $60 per 1M tokens
      currency: 'USD',
      unit: 'per_token',
      pricePerUnit: 1000000
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // TOKEN COST CALCULATION TESTS
  // ==========================================
  describe('calculateTokenCost', () => {
    it('should calculate token cost correctly for basic input', () => {
      const inputTokens = 1000000; // 1M tokens
      const outputTokens = 500000; // 500K tokens

      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        inputTokens,
        outputTokens
      );

      expect(result.tokens.input).toBe(1000000);
      expect(result.tokens.output).toBe(500000);
      expect(result.tokens.total).toBe(1500000);
      expect(result.costs.inputCost).toBe(30); // $30 for 1M input
      expect(result.costs.outputCost).toBe(30); // $30 for 500K output
      expect(result.costs.tokenCost).toBe(60);
      expect(result.costs.totalCost).toBe(60);
    });

    it('should handle zero tokens correctly', () => {
      const result = pricingEngineService.calculateTokenCost(mockModel, 0, 0);

      expect(result.tokens.total).toBe(0);
      expect(result.costs.totalCost).toBe(0);
      expect(result.costs.inputCost).toBe(0);
      expect(result.costs.outputCost).toBe(0);
    });

    it('should handle only input tokens', () => {
      const result = pricingEngineService.calculateTokenCost(mockModel, 500000, 0);

      expect(result.tokens.input).toBe(500000);
      expect(result.tokens.output).toBe(0);
      expect(result.costs.inputCost).toBe(15);
      expect(result.costs.outputCost).toBe(0);
    });

    it('should handle only output tokens', () => {
      const result = pricingEngineService.calculateTokenCost(mockModel, 0, 500000);

      expect(result.tokens.input).toBe(0);
      expect(result.tokens.output).toBe(500000);
      expect(result.costs.inputCost).toBe(0);
      expect(result.costs.outputCost).toBe(30);
    });

    it('should apply infrastructure overhead correctly', () => {
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

      // Token cost: $90
      // Fixed cost: $0.01
      // Total: $90.01
      expect(result.costs.fixedCost).toBe(0.01);
      expect(result.costs.totalCost).toBe(90.01);
    });

    it('should combine infrastructure overhead and fixed cost', () => {
      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        1000000,
        1000000,
        {
          infrastructureOverheadPercent: 10,
          fixedCostPerRequest: 0.05
        }
      );

      // Base: $90
      // Overhead: 10% = $9
      // Fixed: $0.05
      // Total: $99.05
      expect(result.costs.infrastructureCost).toBe(9);
      expect(result.costs.fixedCost).toBe(0.05);
      expect(result.costs.totalCost).toBe(99.05);
    });

    it('should handle very large token counts', () => {
      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        1000000000, // 1B tokens
        500000000 // 500M tokens
      );

      // Input: 1000 * $30 = $30,000
      // Output: 500 * $60 = $30,000
      // Total: $60,000
      expect(result.costs.inputCost).toBe(30000);
      expect(result.costs.outputCost).toBe(30000);
      expect(result.costs.totalCost).toBe(60000);
      expect(isFinite(result.costs.totalCost)).toBe(true);
    });

    it('should handle model without pricing', () => {
      const modelNoPricing = { ...mockModel, pricing: {} };

      const result = pricingEngineService.calculateTokenCost(modelNoPricing, 1000000, 500000);

      expect(result.costs.inputCost).toBe(0);
      expect(result.costs.outputCost).toBe(0);
      expect(result.costs.totalCost).toBe(0);
    });

    it('should handle decimal token counts', () => {
      const result = pricingEngineService.calculateTokenCost(
        mockModel,
        1000.5,
        500.25
      );

      expect(result.costs.totalCost).toBeCloseTo(0.06, 4);
    });
  });

// ==========================================
// FEATURE COST CALCULATION TESTS
// ==========================================
describe('calculateFeatureCost', () => {
  const mockFeature = {
    _id: 'feature123',
    name: 'Chat Assistant',
    model: mockModel,
    tokenEstimates: {
      inputTokensPerRequest: 500,
      outputTokensPerRequest: 200,
      calculationMethod: 'fixed'
    },
    infrastructureCost: {
      fixedCostPerRequest: 0.001,
      overheadPercentage: 10
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Feature.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockFeature)
    });
  });

  it('should calculate feature cost for fixed calculation method', async () => {
    const result = await pricingEngineService.calculateFeatureCost('feature123', 100);

    expect(result.requests).toBe(100);
    expect(result.tokens.input).toBe(500 * 100);
    expect(result.tokens.output).toBe(200 * 100);
  });

  it('should apply dynamic multiplier', async () => {
    const dynamicFeature = {
      ...mockFeature,
      tokenEstimates: {
        ...mockFeature.tokenEstimates,
        calculationMethod: 'dynamic',
        dynamicMultiplier: 1.5
      }
    };

    Feature.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      exec: jest.fn().mockResolvedValue(dynamicFeature)
    });

    const result = await pricingEngineService.calculateFeatureCost('feature123', 100);

    expect(result.tokens.input).toBe(500 * 100 * 1.5);
    expect(result.tokens.output).toBe(200 * 100 * 1.5);
  });

  it('should apply user-based calculation', async () => {
    const userBasedFeature = {
      ...mockFeature,
      tokenEstimates: {
        ...mockFeature.tokenEstimates,
        calculationMethod: 'user-based'
      }
    };

    Feature.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
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

  it('should handle feature without model', async () => {
    const featureNoModel = {
      ...mockFeature,
      model: null
    };

    Feature.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      exec: jest.fn().mockResolvedValue(featureNoModel)
    });

    const result = await pricingEngineService.calculateFeatureCost('feature123', 100);

    expect(result).toBeDefined();
  });
});

// ==========================================
// PRICING MODELS - FORMULA ACCURACY
// ==========================================
describe('Pricing Models - Formula Accuracy', () => {
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
  // FLAT PRICING TESTS
  // ==========================================
  describe('calculateFlatPricing', () => {
    it('should calculate flat pricing correctly', () => {
      const result = pricingEngineService.calculateFlatPricing(mockPlan, {});

      expect(result.model).toBe('flat');
      expect(result.basePrice).toBe(49.99);
      expect(result.totalCost).toBe(49.99);
    });

    it('should handle zero base price', () => {
      const freePlan = {
        ...mockPlan,
        billing: { ...mockPlan.billing, price: 0 }
      };

      const result = pricingEngineService.calculateFlatPricing(freePlan, {});

      expect(result.basePrice).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  // ==========================================
  // USAGE-BASED PRICING TESTS
  // ==========================================
  describe('calculateUsageBasedPricing', () => {
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

    it('should calculate usage-based pricing with overage', () => {
      const result = pricingEngineService.calculateUsageBasedPricing(usagePlan, {
        tokens: 2000000, // 2M tokens, 1M overage
        requests: 1500 // 1500 requests, 500 overage
      });

      expect(result.model).toBe('usage-based');
      expect(result.overage.tokens).toBe(1000000);
      expect(result.overage.requests).toBe(500);
      expect(result.overageCost).toBeGreaterThan(0);
    });

    it('should calculate without overage when under limit', () => {
      const result = pricingEngineService.calculateUsageBasedPricing(usagePlan, {
        tokens: 500000, // Under limit
        requests: 500 // Under limit
      });

      expect(result.overage.tokens).toBe(0);
      expect(result.overage.requests).toBe(0);
      expect(result.overageCost).toBe(0);
    });

    it('should apply overage multiplier correctly', () => {
      const result = pricingEngineService.calculateUsageBasedPricing(usagePlan, {
        tokens: 2000000,
        requests: 1000
      });

      // Overage: 1M tokens
      // Cost without multiplier: 1M * 0.00002 = $20
      // With 1.5x multiplier: $30
      expect(result.overageCost).toBe(30);
    });

    it('should handle exactly at limit', () => {
      const result = pricingEngineService.calculateUsageBasedPricing(usagePlan, {
        tokens: 1000000,
        requests: 1000
      });

      expect(result.overage.tokens).toBe(0);
      expect(result.overage.requests).toBe(0);
      expect(result.overageCost).toBe(0);
    });
  });

  // ==========================================
  // TIERED PRICING TESTS
  // ==========================================
  describe('calculateTieredPricing', () => {
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

    it('should calculate single tier correctly', () => {
      const result = pricingEngineService.calculateTieredPricing(tieredPlan, {
        tokens: 500000 // Only first tier
      });

      expect(result.tiers).toHaveLength(1);
      expect(result.totalTokens).toBe(500000);
      // 500K * $0.03 = $15
    });

    it('should calculate multiple tiers correctly', () => {
      const result = pricingEngineService.calculateTieredPricing(tieredPlan, {
        tokens: 3000000 // Crosses two tiers
      });

      // First tier: 1M @ $0.03 = $30
      // Second tier: 2M @ $0.02 = $40
      // Total: $70
      expect(result.tiers).toHaveLength(2);
      expect(result.totalTokens).toBe(3000000);
    });

    it('should handle unlimited tier (to: null)', () => {
      const result = pricingEngineService.calculateTieredPricing(tieredPlan, {
        tokens: 10000000 // Crosses all tiers including unlimited
      });

      // First: 1M @ $0.03 = $30
      // Second: 4M @ $0.02 = $80
      // Third: 5M @ $0.01 = $50
      // Total: $160
      expect(result.tiers).toHaveLength(3);
    });

    it('should handle zero tokens', () => {
      const result = pricingEngineService.calculateTieredPricing(tieredPlan, {
        tokens: 0
      });

      expect(result.totalTokens).toBe(0);
      expect(result.tiers).toHaveLength(0);
    });
  });

  // ==========================================
  // HYBRID PRICING TESTS
  // ==========================================
  describe('calculateHybridPricing', () => {
    const hybridPlan = {
      ...mockPlan,
      billing: { price: 29.99 },
      pricingModel: {
        type: 'hybrid',
        usageBased: {
          includedTokens: 500000,
          pricePerToken: 0.00003
        }
      }
    };

    it('should calculate hybrid pricing with overage', () => {
      const result = pricingEngineService.calculateHybridPricing(hybridPlan, {
        tokens: 1000000 // 500K overage
      });

      expect(result.model).toBe('hybrid');
      expect(result.flat).toBe(29.99);
      // Overage: 500K * 0.00003 = $15
      expect(result.usage).toBeGreaterThan(0);
    });

    it('should calculate without overage when under limit', () => {
      const result = pricingEngineService.calculateHybridPricing(hybridPlan, {
        tokens: 300000
      });

      expect(result.flat).toBe(29.99);
      expect(result.usage).toBe(0);
    });
  });

  // ==========================================
  // CREDIT-BASED PRICING TESTS
  // ==========================================
  describe('calculateCreditBasedPricing', () => {
    const creditPlan = {
      ...mockPlan,
      credits: {
        includedCredits: 1000,
        creditPricing: {
          pricePerCredit: 0.01
        }
      }
    };

    it('should calculate credit-based pricing with overage', () => {
      const result = pricingEngineService.calculateCreditBasedPricing(creditPlan, {
        creditsUsed: 1500
      });

      expect(result.model).toBe('credit-based');
      expect(result.overageCredits).toBe(500);
      expect(result.overageCost).toBe(5); // 500 * $0.01
    });

    it('should calculate without overage', () => {
      const result = pricingEngineService.calculateCreditBasedPricing(creditPlan, {
        creditsUsed: 800
      });

      expect(result.overageCredits).toBe(0);
      expect(result.overageCost).toBe(0);
    });

    it('should handle exactly at limit', () => {
      const result = pricingEngineService.calculateCreditBasedPricing(creditPlan, {
        creditsUsed: 1000
      });

      expect(result.overageCredits).toBe(0);
    });
  });
});

describe('Break-Even Calculations', () => {
  const mockBreakEvenPlan = {
    _id: 'plan123',
    name: 'Pro Plan',
    tier: 'pro',
    billing: {
      price: 49.99
    },
    costs: {
      fixedCostsPerMonth: 5000,
      variableCostPerUser: 5
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    Plan.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      populate: jest.fn().mockReturnThis()
    }).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBreakEvenPlan)
    });
  });

  // ==========================================
  // BREAK-EVEN ANALYSIS TESTS
  // ==========================================
  describe('calculateBreakEvenAnalysis', () => {
    it('should calculate break-even users correctly', async () => {
      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      expect(result.analysis.breakEvenUsers).toBeDefined();
      expect(result.analysis.breakEvenUsers).toBeGreaterThan(0);
      expect(result.analysis.contributionMargin).toBeDefined();
    });

    it('should generate appropriate recommendations', async () => {
      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
    });

    it('should calculate scenarios for different user counts', async () => {
      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123', {
        scenarios: [10, 50, 100, 500]
      });

      expect(result.scenarios).toHaveLength(4);
      result.scenarios.forEach(scenario => {
        expect(scenario.users).toBeDefined();
        expect(scenario.revenue).toBeDefined();
        expect(scenario.totalCost).toBeDefined();
        expect(scenario.profit).toBeDefined();
        expect(scenario.margin).toBeDefined();
      });
    });

    it('should handle negative contribution margin', async () => {
      const unprofitablePlan = {
        ...mockBreakEvenPlan,
        billing: { price: 5 }, // Very low price
        costs: { fixedCostsPerMonth: 10000, variableCostPerUser: 10 } // High costs
      };

      Plan.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis()
      }).mockReturnValue({
        populate: jest.fn().mockReturnThis()
      }).mockReturnValue({
        exec: jest.fn().mockResolvedValue(unprofitablePlan)
      });

      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      // Negative contribution margin means no break-even possible
      if (result.analysis.contributionMargin <= 0) {
        expect(result.recommendation).toContain('not profitable');
      }
    });

    it('should handle zero fixed costs', async () => {
      const noFixedCostPlan = {
        ...mockBreakEvenPlan,
        costs: { fixedCostsPerMonth: 0, variableCostPerUser: 5 }
      };

      Plan.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis()
      }).mockReturnValue({
        populate: jest.fn().mockReturnThis()
      }).mockReturnValue({
        exec: jest.fn().mockResolvedValue(noFixedCostPlan)
      });

      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      // With zero fixed costs and positive margin, should be immediately profitable
      expect(result.analysis.breakEvenUsers).toBe(0);
    });
  });

  // ==========================================
  // MARGIN SCENARIOS TESTS
  // ==========================================
  describe('calculateMarginScenarios', () => {
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
});

describe('Edge Cases and Boundary Conditions', () => {
  // ==========================================
  // ZERO AND NULL VALUES
  // ==========================================
  describe('zero and null values', () => {
    it('should handle zero pricing', () => {
      const freeModel = {
        pricing: { inputPrice: 0, outputPrice: 0 }
      };

      const result = pricingEngineService.calculateTokenCost(freeModel, 1000000, 1000000);

      expect(result.costs.totalCost).toBe(0);
    });

    it('should handle undefined infrastructure costs', () => {
      const modelNoInfra = {
        pricing: { inputPrice: 30, outputPrice: 60 }
      };

      const result = pricingEngineService.calculateTokenCost(modelNoInfra, 1000, 500, {
        infrastructureOverheadPercent: undefined,
        fixedCostPerRequest: undefined
      });

      expect(result.costs.totalCost).toBeDefined();
    });
  });

  // ==========================================
  // VERY LARGE NUMBERS
  // ==========================================
  describe('very large numbers', () => {
    it('should handle extremely large token counts', () => {
      const model = { pricing: { inputPrice: 30, outputPrice: 60 } };

      const result = pricingEngineService.calculateTokenCost(model, 1e15, 1e15);

      expect(result.costs.totalCost).toBeGreaterThan(0);
      expect(isFinite(result.costs.totalCost)).toBe(true);
    });

    it('should handle very high pricing', () => {
      const expensiveModel = {
        pricing: { inputPrice: 1000000, outputPrice: 2000000 }
      };

      const result = pricingEngineService.calculateTokenCost(expensiveModel, 1000000, 500000);

      expect(result.costs.totalCost).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // NEGATIVE VALUES
  // ==========================================
  describe('negative values', () => {
    it('should handle negative contribution margin correctly', async () => {
      const plan = {
        _id: 'plan123',
        billing: { price: 10 },
        costs: { fixedCostsPerMonth: 1000, variableCostPerUser: 20 }
      };

      Plan.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis()
      }).mockReturnValue({
        populate: jest.fn().mockReturnThis()
      }).mockReturnValue({
        exec: jest.fn().mockResolvedValue(plan)
      });

      const result = await pricingEngineService.calculateBreakEvenAnalysis('plan123');

      // Price ($10) - Variable ($20) = -$10 contribution margin
      expect(result.analysis.contributionMargin).toBeLessThan(0);
    });
  });

  // ==========================================
  // PRECISION AND ROUNDING
  // ==========================================
  describe('precision and rounding', () => {
    it('should maintain precision for small amounts', () => {
      const model = { pricing: { inputPrice: 0.0001, outputPrice: 0.0002 } };

      const result = pricingEngineService.calculateTokenCost(model, 1, 1);

      // Very small amounts should still be calculated
      expect(result.costs.totalCost).toBeCloseTo(0.0000000003, 15);
    });

    it('should handle fractional cents correctly', () => {
      const model = { pricing: { inputPrice: 0.5, outputPrice: 1.5 } };

      const result = pricingEngineService.calculateTokenCost(model, 1000000, 500000);

      // Input: 0.5 * 1 = $0.5
      // Output: 1.5 * 0.5 = $0.75
      // Total: $1.25
      expect(result.costs.totalCost).toBeCloseTo(1.25, 2);
    });
  });

  // ==========================================
  // MODEL COMPARISON TESTS
  // ==========================================
  describe('compareModelCosts', () => {
    it('should compare costs across multiple models', async () => {
      const mockModels = [
        { _id: 'model1', name: 'gpt-4', pricing: { inputPrice: 30, outputPrice: 60 } },
        { _id: 'model2', name: 'gpt-3.5-turbo', pricing: { inputPrice: 1.5, outputPrice: 2 } }
      ];

      AIModel.findById = jest.fn()
        .mockResolvedValueOnce(mockModels[0])
        .mockResolvedValueOnce(mockModels[1]);

      const result = await pricingEngineService.compareModelCosts(
        ['model1', 'model2'],
        { inputTokens: 1000000, outputTokens: 500000 }
      );

      expect(result.comparisons).toHaveLength(2);
      expect(result.cheapest).toBeDefined();
      expect(result.mostExpensive).toBeDefined();
      expect(result.savings).toBeDefined();
    });
  });
});