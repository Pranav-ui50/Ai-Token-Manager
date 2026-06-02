/**
 * Feature Service Unit Tests
 *
 * Tests for Feature CRUD operations, validation, and edge cases.
 */

// Mock dependencies first before any imports
jest.mock('../../../src/models/Feature.js', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateMany: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn()
}));
jest.mock('../../../src/models/AIModel.js', () => ({
  findById: jest.fn()
}));
jest.mock('../../../src/models/Provider.js', () => ({
  findById: jest.fn()
}));
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

import Feature from '../../../src/models/Feature.js';
import AIModel from '../../../src/models/AIModel.js';
import Provider from '../../../src/models/Provider.js';
import featureService from '../../../src/services/feature.service.js';

describe('FeatureService', () => {
  const mockOrgId = '507f1f77bcf86cd799439011';
  const mockFeatureId = '507f1f77bcf86cd799439012';
  const mockModelId = '507f1f77bcf86cd799439013';
  const mockProviderId = '507f1f77bcf86cd799439014';
  const mockProjectId = '507f1f77bcf86cd799439015';

  const mockFeature = {
    _id: mockFeatureId,
    name: 'Chat Assistant',
    slug: 'chat-assistant',
    description: 'AI Chat Assistant',
    organization: mockOrgId,
    project: mockProjectId,
    category: 'chat',
    model: mockModelId,
    provider: mockProviderId,
    tokenEstimates: {
      inputTokensPerRequest: 500,
      outputTokensPerRequest: 200,
      calculationMethod: 'fixed'
    },
    infrastructureCost: {
      fixedCostPerRequest: 0.001,
      overheadPercentage: 10,
      monthlyFixedCost: 100
    },
    status: 'active',
    settings: {
      enabled: true,
      requiresAuth: false,
      cacheResponses: true
    },
    populate: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(true)
  };

  const mockModel = {
    _id: mockModelId,
    name: 'gpt-4',
    displayName: 'GPT-4',
    type: 'chat',
    pricing: {
      inputPrice: 30,
      outputPrice: 60,
      currency: 'USD'
    },
    capabilities: {
      contextWindow: 128000,
      maxOutputTokens: 4096
    }
  };

  const mockProvider = {
    _id: mockProviderId,
    name: 'OpenAI',
    displayName: 'OpenAI',
    slug: 'openai'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // CREATE Feature Tests
  // ==========================================
  describe('createFeature', () => {
    it('should create a feature successfully', async () => {
      const featureData = {
        organization: mockOrgId,
        name: 'Chat Assistant',
        description: 'AI Chat Assistant',
        category: 'chat',
        model: mockModelId,
        provider: mockProviderId
      };

      AIModel.findById.mockResolvedValue(mockModel);
      Provider.findById.mockResolvedValue(mockProvider);
      Feature.findOne.mockResolvedValue(null);
      Feature.create.mockResolvedValue({
        ...mockFeature,
        populate: jest.fn().mockReturnThis()
      });

      const result = await featureService.createFeature(featureData);

      expect(Feature.create).toHaveBeenCalled();
      expect(AIModel.findById).toHaveBeenCalledWith(mockModelId);
      expect(Provider.findById).toHaveBeenCalledWith(mockProviderId);
    });

    it('should throw error if model not found', async () => {
      const featureData = {
        organization: mockOrgId,
        name: 'Chat Assistant',
        model: mockModelId
      };

      AIModel.findById.mockResolvedValue(null);

      await expect(featureService.createFeature(featureData))
        .rejects.toThrow('AI Model not found');
    });

    it('should throw error if provider not found', async () => {
      const featureData = {
        organization: mockOrgId,
        name: 'Chat Assistant',
        provider: mockProviderId
      };

      Provider.findById.mockResolvedValue(null);

      await expect(featureService.createFeature(featureData))
        .rejects.toThrow('Provider not found');
    });

    it('should throw error for duplicate feature name', async () => {
      const featureData = {
        organization: mockOrgId,
        name: 'Chat Assistant'
      };

      Feature.findOne.mockResolvedValue(mockFeature);

      await expect(featureService.createFeature(featureData))
        .rejects.toThrow('Feature with this name already exists');
    });

    it('should create feature without model or provider', async () => {
      const featureData = {
        organization: mockOrgId,
        name: 'Basic Feature',
        category: 'other'
      };

      Feature.findOne.mockResolvedValue(null);
      Feature.create.mockResolvedValue({
        ...mockFeature,
        name: 'Basic Feature',
        model: null,
        provider: null,
        populate: jest.fn().mockReturnThis()
      });

      const result = await featureService.createFeature(featureData);

      expect(Feature.create).toHaveBeenCalled();
    });

    it('should generate slug from name', async () => {
      const featureData = {
        organization: mockOrgId,
        name: 'Chat Assistant Pro'
      };

      Feature.findOne.mockResolvedValue(null);
      Feature.create.mockResolvedValue({
        ...mockFeature,
        name: featureData.name,
        slug: 'chat-assistant-pro',
        populate: jest.fn().mockReturnThis()
      });

      await featureService.createFeature(featureData);

      expect(Feature.create).toHaveBeenCalled();
    });
  });

  // ==========================================
  // READ Feature Tests
  // ==========================================
  describe('getFeatures', () => {
    it('should return paginated features', async () => {
      const features = [mockFeature];

      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(features)
      });
      Feature.countDocuments.mockResolvedValue(1);

      const result = await featureService.getFeatures(mockOrgId, { page: 1, limit: 10 });

      expect(result.features).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by status', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockFeature])
      });
      Feature.countDocuments.mockResolvedValue(1);

      await featureService.getFeatures(mockOrgId, { status: 'active' });

      expect(Feature.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });

    it('should filter by category', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockFeature])
      });
      Feature.countDocuments.mockResolvedValue(1);

      await featureService.getFeatures(mockOrgId, { category: 'chat' });

      expect(Feature.find).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'chat' })
      );
    });

    it('should search by name and description', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockFeature])
      });
      Feature.countDocuments.mockResolvedValue(1);

      await featureService.getFeatures(mockOrgId, { search: 'chat' });

      expect(Feature.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { name: { $regex: 'chat', $options: 'i' } },
            { description: { $regex: 'chat', $options: 'i' } }
          ]
        })
      );
    });

    it('should filter by project', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockFeature])
      });
      Feature.countDocuments.mockResolvedValue(1);

      await featureService.getFeatures(mockOrgId, { project: mockProjectId });

      expect(Feature.find).toHaveBeenCalledWith(
        expect.objectContaining({ project: mockProjectId })
      );
    });
  });

  describe('getFeature', () => {
    it('should return feature by ID', async () => {
      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFeature)
      };
      Feature.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      const result = await featureService.getFeature(mockFeatureId, mockOrgId);

      expect(result).toEqual(mockFeature);
    });

    it('should throw error if feature not found', async () => {
      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };
      Feature.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      await expect(featureService.getFeature(mockFeatureId, mockOrgId))
        .rejects.toThrow('Feature not found');
    });

    it('should get feature without organization filter', async () => {
      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFeature)
      };
      Feature.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      const result = await featureService.getFeature(mockFeatureId);

      expect(Feature.findOne).toHaveBeenCalledWith({ _id: mockFeatureId });
    });
  });

  describe('getFeaturesByCategory', () => {
    it('should return active features by category', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockFeature])
      });

      const result = await featureService.getFeaturesByCategory(mockOrgId, 'chat');

      expect(Feature.find).toHaveBeenCalledWith({
        organization: mockOrgId,
        category: 'chat',
        status: 'active',
        'settings.enabled': true
      });
    });
  });

  // ==========================================
  // UPDATE Feature Tests
  // ==========================================
  describe('updateFeature', () => {
    it('should update feature successfully', async () => {
      const updateData = {
        name: 'Updated Feature',
        description: 'Updated description'
      };

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockFeature, ...updateData })
      };
      Feature.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      const result = await featureService.updateFeature(mockFeatureId, mockOrgId, updateData);

      expect(result.name).toBe('Updated Feature');
    });

    it('should validate model on update', async () => {
      const updateData = { model: mockModelId };

      AIModel.findById.mockResolvedValue(mockModel);
      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFeature)
      };
      Feature.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      await featureService.updateFeature(mockFeatureId, mockOrgId, updateData);

      expect(AIModel.findById).toHaveBeenCalledWith(mockModelId);
    });

    it('should validate provider on update', async () => {
      const updateData = { provider: mockProviderId };

      Provider.findById.mockResolvedValue(mockProvider);
      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFeature)
      };
      Feature.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      await featureService.updateFeature(mockFeatureId, mockOrgId, updateData);

      expect(Provider.findById).toHaveBeenCalledWith(mockProviderId);
    });

    it('should throw error if model not found on update', async () => {
      const updateData = { model: 'invalid-id' };

      AIModel.findById.mockResolvedValue(null);

      await expect(featureService.updateFeature(mockFeatureId, mockOrgId, updateData))
        .rejects.toThrow('AI Model not found');
    });

    it('should throw error if feature not found', async () => {
      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };
      Feature.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      await expect(featureService.updateFeature(mockFeatureId, mockOrgId, {}))
        .rejects.toThrow('Feature not found');
    });

    it('should not update protected fields', async () => {
      const updateData = {
        _id: 'new-id',
        organization: 'new-org',
        slug: 'new-slug',
        stats: { totalRequests: 999 }
      };

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFeature)
      };
      Feature.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      await featureService.updateFeature(mockFeatureId, mockOrgId, updateData);

      // Verify protected fields were deleted from update
      expect(Feature.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockFeatureId, organization: mockOrgId },
        { $set: {} },
        { new: true, runValidators: true }
      );
    });
  });

  // ==========================================
  // DELETE Feature Tests
  // ==========================================
  describe('deleteFeature', () => {
    it('should delete feature successfully', async () => {
      Feature.findOneAndDelete.mockResolvedValue(mockFeature);

      const result = await featureService.deleteFeature(mockFeatureId, mockOrgId);

      expect(result).toBe(true);
    });

    it('should throw error if feature not found', async () => {
      Feature.findOneAndDelete.mockResolvedValue(null);

      await expect(featureService.deleteFeature(mockFeatureId, mockOrgId))
        .rejects.toThrow('Feature not found');
    });
  });

  // ==========================================
  // BULK UPDATE Tests
  // ==========================================
  describe('bulkUpdateStatus', () => {
    it('should update multiple features status', async () => {
      const featureIds = [mockFeatureId];
      const mockResult = { modifiedCount: 1, matchedCount: 1 };

      Feature.updateMany.mockResolvedValue(mockResult);

      const result = await featureService.bulkUpdateStatus(featureIds, mockOrgId, 'inactive');

      expect(result.modified).toBe(1);
      expect(result.matched).toBe(1);
    });

    it('should only update features in organization', async () => {
      const featureIds = ['id1', 'id2'];

      Feature.updateMany.mockResolvedValue({ modifiedCount: 2, matchedCount: 2 });

      await featureService.bulkUpdateStatus(featureIds, mockOrgId, 'active');

      expect(Feature.updateMany).toHaveBeenCalledWith(
        { _id: { $in: featureIds }, organization: mockOrgId },
        { $set: { status: 'active' } }
      );
    });
  });

  // ==========================================
  // STATISTICS Tests
  // ==========================================
  describe('getFeatureStats', () => {
    it('should return feature statistics', async () => {
      const mockStats = [{
        totalFeatures: 10,
        activeFeatures: 8,
        totalRequests: 5000,
        totalTokens: 1000000,
        totalCost: 50
      }];

      Feature.aggregate.mockResolvedValueOnce(mockStats);
      Feature.aggregate.mockResolvedValueOnce([
        { _id: 'chat', count: 5 },
        { _id: 'analytics', count: 3 },
        { _id: 'other', count: 2 }
      ]);

      const result = await featureService.getFeatureStats(mockOrgId);

      expect(result.totalFeatures).toBe(10);
      expect(result.activeFeatures).toBe(8);
      expect(result.categories).toBeDefined();
    });

    it('should return default stats when no features', async () => {
      Feature.aggregate.mockResolvedValueOnce([]);
      Feature.aggregate.mockResolvedValueOnce([]);

      const result = await featureService.getFeatureStats(mockOrgId);

      expect(result.totalFeatures).toBe(0);
      expect(result.activeFeatures).toBe(0);
      expect(result.categories).toEqual({});
    });
  });

  // ==========================================
  // COST CALCULATION Tests
  // ==========================================
  describe('calculateCostEstimate', () => {
    it('should calculate cost estimate correctly', async () => {
      const featureWithModel = {
        ...mockFeature,
        model: mockModel
      };

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(featureWithModel)
      };
      Feature.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      const result = await featureService.calculateCostEstimate(mockFeatureId, mockOrgId, {
        requestsPerMonth: 1000,
        usersPerMonth: 100
      });

      expect(result).toHaveProperty('tokenCost');
      expect(result).toHaveProperty('inputCost');
      expect(result).toHaveProperty('outputCost');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('requestsPerMonth');
      expect(result).toHaveProperty('usersPerMonth');
    });

    it('should throw error if model pricing not available', async () => {
      const featureWithoutModel = {
        ...mockFeature,
        model: null
      };

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(featureWithoutModel)
      };
      Feature.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      await expect(featureService.calculateCostEstimate(mockFeatureId, mockOrgId))
        .rejects.toThrow('Model pricing not available');
    });

    it('should handle zero token estimates', async () => {
      const featureWithZeroTokens = {
        ...mockFeature,
        model: mockModel,
        tokenEstimates: {
          inputTokensPerRequest: 0,
          outputTokensPerRequest: 0
        }
      };

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(featureWithZeroTokens)
      };
      Feature.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulateChain)
      });

      const result = await featureService.calculateCostEstimate(mockFeatureId, mockOrgId);

      expect(result.tokenCost).toBe(0);
      expect(result.inputCost).toBe(0);
      expect(result.outputCost).toBe(0);
    });
  });

  // ==========================================
  // EDGE CASES Tests
  // ==========================================
  describe('edge cases', () => {
    it('should handle special characters in search', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });
      Feature.countDocuments.mockResolvedValue(0);

      await featureService.getFeatures(mockOrgId, { search: 'chat*?+' });

      expect(Feature.find).toHaveBeenCalled();
    });

    it('should handle large page numbers', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });
      Feature.countDocuments.mockResolvedValue(0);

      const result = await featureService.getFeatures(mockOrgId, { page: 9999, limit: 10 });

      expect(result.pagination.pages).toBe(0);
    });

    it('should handle empty feature arrays', async () => {
      Feature.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });
      Feature.countDocuments.mockResolvedValue(0);

      const result = await featureService.getFeatures(mockOrgId);

      expect(result.features).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});