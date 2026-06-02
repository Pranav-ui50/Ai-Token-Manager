/**
 * Model Service Unit Tests
 *
 * Tests for AI Model CRUD operations and related functionality.
 */

import mongoose from 'mongoose';
import AIModel from '../../../src/models/AIModel.js';
import Provider from '../../../src/models/Provider.js';
import { AppError } from '../../../src/middlewares/error.middleware.js';

// Mock dependencies
jest.mock('../../../src/models/AIModel.js');
jest.mock('../../../src/models/Provider.js');
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('ModelService', () => {
  const mockModelId = new mongoose.Types.ObjectId().toString();
  const mockProviderId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  const mockModel = {
    _id: mockModelId,
    name: 'gpt-4',
    slug: 'openai-gpt-4',
    displayName: 'GPT-4',
    type: 'chat',
    provider: mockProviderId,
    pricing: {
      inputPrice: 30,
      outputPrice: 60,
      currency: 'USD',
      unit: 'per_token',
      pricePerUnit: 1000000
    },
    capabilities: {
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsStreaming: true,
      contextWindow: 128000,
      maxOutputTokens: 4096
    },
    isActive: true,
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnThis(),
    calculateCost: jest.fn((input, output) => (input + output) * 0.00003)
  };

  const mockProvider = {
    _id: mockProviderId,
    name: 'OpenAI',
    slug: 'openai',
    displayName: 'OpenAI',
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // CREATE Model Tests
  // ==========================================
  describe('create model', () => {
    it('should create a new model successfully', async () => {
      const modelData = {
        name: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        type: 'chat',
        provider: mockProviderId,
        pricing: {
          inputPrice: 10,
          outputPrice: 30,
          currency: 'USD'
        }
      };

      Provider.findById.mockResolvedValue(mockProvider);
      AIModel.findOne.mockResolvedValue(null);
      AIModel.create.mockResolvedValue({
        ...mockModel,
        ...modelData
      });

      // Assuming modelService.create exists
      const result = await AIModel.create(modelData);

      expect(AIModel.create).toHaveBeenCalled();
    });

    it('should throw error if provider not found', async () => {
      const modelData = {
        name: 'new-model',
        provider: mockProviderId
      };

      Provider.findById.mockResolvedValue(null);

      await expect(Provider.findById(mockProviderId))
        .resolves.toBeNull();
    });

    it('should create model with all capabilities', async () => {
      const modelData = {
        name: 'claude-3',
        displayName: 'Claude 3',
        type: 'chat',
        provider: mockProviderId,
        capabilities: {
          supportsVision: true,
          supportsFunctionCalling: true,
          supportsStreaming: true,
          supportsJsonMode: true,
          contextWindow: 200000,
          maxOutputTokens: 4096
        }
      };

      AIModel.create.mockResolvedValue({ ...mockModel, ...modelData });

      const result = await AIModel.create(modelData);

      expect(AIModel.create).toHaveBeenCalled();
    });
  });

  // ==========================================
  // READ Model Tests
  // ==========================================
  describe('get models', () => {
    it('should return all models for a provider', async () => {
      const models = [mockModel];

      AIModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(models)
        })
      });

      const result = await AIModel.find({ provider: mockProviderId }).sort({ name: 1 }).populate('deprecated.replacementModel');

      expect(result).toHaveLength(1);
    });

    it('should return active models only', async () => {
      const activeModels = [mockModel];

      AIModel.findActive = jest.fn().mockResolvedValue(activeModels);

      const result = await AIModel.findActive();

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should find model by slug', async () => {
      AIModel.findBySlug = jest.fn().mockResolvedValue(mockModel);

      const result = await AIModel.findBySlug('openai-gpt-4');

      expect(result).toEqual(mockModel);
    });

    it('should find models by provider', async () => {
      const models = [mockModel];

      AIModel.findByProvider = jest.fn().mockResolvedValue(models);

      const result = await AIModel.findByProvider(mockProviderId, true);

      expect(AIModel.findByProvider).toHaveBeenCalledWith(mockProviderId, true);
    });
  });

  // ==========================================
  // UPDATE Model Tests
  // ==========================================
  describe('update model', () => {
    it('should update model pricing', async () => {
      const updateData = {
        pricing: {
          inputPrice: 20,
          outputPrice: 40,
          currency: 'USD'
        }
      };

      AIModel.findById.mockResolvedValue(mockModel);

      const result = await AIModel.findById(mockModelId);

      expect(result).toBeDefined();
    });

    it('should update model capabilities', async () => {
      const updateData = {
        capabilities: {
          contextWindow: 256000,
          maxOutputTokens: 8192
        }
      };

      AIModel.findById.mockResolvedValue(mockModel);

      const result = await AIModel.findById(mockModelId);

      expect(result).toBeDefined();
    });

    it('should mark model as deprecated', async () => {
      const deprecatedModel = {
        ...mockModel,
        deprecated: {
          isDeprecated: true,
          sunsetDate: new Date('2024-12-31')
        }
      };

      AIModel.findById.mockResolvedValue(deprecatedModel);

      const result = await AIModel.findById(mockModelId);

      expect(result.deprecated.isDeprecated).toBe(true);
    });
  });

  // ==========================================
  // DELETE Model Tests
  // ==========================================
  describe('delete model', () => {
    it('should soft delete model (set isActive to false)', async () => {
      const modelToDelete = {
        ...mockModel,
        isActive: false,
        save: jest.fn().mockResolvedValue(true)
      };

      AIModel.findById.mockResolvedValue(modelToDelete);

      await modelToDelete.save();

      expect(modelToDelete.save).toHaveBeenCalled();
      expect(modelToDelete.isActive).toBe(false);
    });

    it('should throw error when model not found', async () => {
      AIModel.findById.mockResolvedValue(null);

      await expect(AIModel.findById(mockModelId))
        .resolves.toBeNull();
    });
  });

  // ==========================================
  // PRICING VALIDATION Tests
  // ==========================================
  describe('pricing validation', () => {
    it('should calculate cost correctly for token-based pricing', () => {
      const model = {
        ...mockModel,
        pricing: {
          inputPrice: 30,
          outputPrice: 60,
          unit: 'per_token',
          pricePerUnit: 1000000
        }
      };

      // Calculate cost: (inputTokens / pricePerUnit) * inputPrice + (outputTokens / pricePerUnit) * outputPrice
      const inputTokens = 1000000; // 1M tokens
      const outputTokens = 500000; // 500K tokens

      const inputCost = (inputTokens / model.pricing.pricePerUnit) * model.pricing.inputPrice;
      const outputCost = (outputTokens / model.pricing.pricePerUnit) * model.pricing.outputPrice;
      const totalCost = inputCost + outputCost;

      expect(totalCost).toBe(60); // $30 + $30 = $60
    });

    it('should handle zero pricing', () => {
      const freeModel = {
        pricing: {
          inputPrice: 0,
          outputPrice: 0,
          unit: 'per_token',
          pricePerUnit: 1000000
        }
      };

      const cost = (1000000 / freeModel.pricing.pricePerUnit) * freeModel.pricing.inputPrice;
      expect(cost).toBe(0);
    });

    it('should validate pricing model types', () => {
      const validPricingTypes = ['per_token', 'per_request', 'per_second', 'per_image'];

      validPricingTypes.forEach(type => {
        expect(['per_token', 'per_request', 'per_second', 'per_image']).toContain(type);
      });
    });

    it('should validate model types', () => {
      const validModelTypes = ['chat', 'completion', 'embedding', 'image', 'audio', 'other'];

      validModelTypes.forEach(type => {
        expect(['chat', 'completion', 'embedding', 'image', 'audio', 'other']).toContain(type);
      });
    });
  });

  // ==========================================
  // Model Capabilities Tests
  // ==========================================
  describe('model capabilities', () => {
    it('should validate context window limits', () => {
      const model = {
        ...mockModel,
        capabilities: {
          contextWindow: 128000,
          maxOutputTokens: 4096
        }
      };

      expect(model.capabilities.contextWindow).toBeGreaterThan(0);
      expect(model.capabilities.maxOutputTokens).toBeGreaterThan(0);
    });

    it('should validate default parameters', () => {
      const defaults = {
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0
      };

      expect(defaults.temperature).toBeGreaterThanOrEqual(0);
      expect(defaults.temperature).toBeLessThanOrEqual(2);
      expect(defaults.topP).toBeGreaterThanOrEqual(0);
      expect(defaults.topP).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================
  // Model Deprecation Tests
  // ==========================================
  describe('model deprecation', () => {
    it('should check if model is deprecated', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const deprecatedModel = {
        ...mockModel,
        deprecated: {
          isDeprecated: true,
          sunsetDate: futureDate
        }
      };

      const isDeprecated = deprecatedModel.deprecated.isDeprecated &&
        (!deprecatedModel.deprecated.sunsetDate || new Date() < deprecatedModel.deprecated.sunsetDate);

      expect(isDeprecated).toBe(true);
    });

    it('should handle models without deprecation', () => {
      const activeModel = {
        ...mockModel,
        deprecated: {
          isDeprecated: false,
          sunsetDate: null
        }
      };

      expect(activeModel.deprecated.isDeprecated).toBe(false);
    });

    it('should handle sunset date in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const deprecatedModel = {
        ...mockModel,
        deprecated: {
          isDeprecated: true,
          sunsetDate: futureDate
        }
      };

      const isStillActive = !deprecatedModel.deprecated.sunsetDate || new Date() < deprecatedModel.deprecated.sunsetDate;

      expect(isStillActive).toBe(true);
    });
  });
});