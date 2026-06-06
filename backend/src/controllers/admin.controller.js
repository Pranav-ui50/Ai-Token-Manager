/**
 * Admin Controller
 *
 * Handles super admin operations for managing organizations, users, and system.
 */

import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Feature from '../models/Feature.js';
import AIModel from '../models/AIModel.js';
import Provider from '../models/Provider.js';
import Plan from '../models/Plan.js';
import PricingHistory from '../models/PricingHistory.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class AdminController {
  /**
   * Get all organizations with filtering and pagination
   * @route GET /api/admin/organizations
   */
  async getOrganizations(req, res, next) {
    try {
      const { page = 1, limit = 10, search, status, plan } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } }
        ];
      }

      if (status && status !== 'all') {
        query['subscription.status'] = status;
      }

      if (plan && plan !== 'all') {
        query['subscription.plan'] = plan;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const organizations = await Organization.find(query)
        .populate('owner', 'firstName lastName email')
        .populate('members.user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Organization.countDocuments(query);

      // Get member counts
      const orgsWithStats = await Promise.all(organizations.map(async (org) => {
        const memberCount = org.members?.length || 0;
        const projectCount = await Project.countDocuments({ organization: org._id });
        const featureCount = await Feature.countDocuments({ organization: org._id });

        return {
          ...org.toObject(),
          memberCount,
          projectCount,
          featureCount,
          stats: {
            members: memberCount,
            projects: projectCount,
            features: featureCount
          }
        };
      }));

      res.json({
        success: true,
        data: {
          organizations: orgsWithStats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization by ID with detailed stats
   * @route GET /api/admin/organizations/:id
   */
  async getOrganizationById(req, res, next) {
    try {
      const { id } = req.params;

      const organization = await Organization.findById(id)
        .populate('owner', 'firstName lastName email createdAt')
        .populate('members.user', 'firstName lastName email createdAt')
        .populate('members.role', 'name permissions');

      if (!organization) {
        throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
      }

      // Get projects
      const projects = await Project.find({ organization: id })
        .select('name slug status createdAt')
        .sort({ createdAt: -1 });

      // Get features with token usage
      const features = await Feature.find({ organization: id })
        .populate('model', 'name displayName pricing')
        .populate('provider', 'name displayName')
        .select('name status category tokenEstimates stats createdAt');

      // Calculate totals
      const totalTokens = features.reduce((sum, f) => sum + (f.stats?.totalTokens || 0), 0);
      const totalRequests = features.reduce((sum, f) => sum + (f.stats?.totalRequests || 0), 0);
      const totalCost = features.reduce((sum, f) => sum + (f.stats?.totalCost || 0), 0);

      res.json({
        success: true,
        data: {
          organization: organization.toObject(),
          projects,
          features,
          stats: {
            totalTokens,
            totalRequests,
            totalCost,
            totalFeatures: features.length,
            totalProjects: projects.length,
            totalMembers: organization.members?.length || 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization status
   * @route PATCH /api/admin/organizations/:id/status
   */
  async updateOrganizationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'trial', 'suspended', 'cancelled'].includes(status)) {
        throw new AppError('Invalid status', 400, 'INVALID_STATUS');
      }

      const organization = await Organization.findByIdAndUpdate(
        id,
        {
          'subscription.status': status,
          isActive: status !== 'suspended'
        },
        { new: true }
      );

      if (!organization) {
        throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
      }

      logger.info(`Admin updated organization ${id} status to ${status}`);

      res.json({
        success: true,
        message: 'Organization status updated',
        data: { organization }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization plan
   * @route PATCH /api/admin/organizations/:id/plan
   */
  async updateOrganizationPlan(req, res, next) {
    try {
      const { id } = req.params;
      const { plan } = req.body;

      if (!['free', 'starter', 'professional', 'enterprise'].includes(plan)) {
        throw new AppError('Invalid plan', 400, 'INVALID_PLAN');
      }

      const organization = await Organization.findByIdAndUpdate(
        id,
        { 'subscription.plan': plan },
        { new: true }
      );

      if (!organization) {
        throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
      }

      logger.info(`Admin updated organization ${id} plan to ${plan}`);

      res.json({
        success: true,
        message: 'Organization plan updated',
        data: { organization }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system statistics
   * @route GET /api/admin/stats
   */
  async getSystemStats(req, res, next) {
    try {
      const [
        totalOrganizations,
        totalUsers,
        totalProjects,
        totalFeatures,
        totalModels,
        totalProviders,
        activeOrganizations,
        organizationsByPlan,
        organizationsByStatus
      ] = await Promise.all([
        Organization.countDocuments(),
        User.countDocuments(),
        Project.countDocuments(),
        Feature.countDocuments(),
        AIModel.countDocuments(),
        Provider.countDocuments(),
        Organization.countDocuments({ isActive: true }),
        Organization.aggregate([
          { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
        ]),
        Organization.aggregate([
          { $group: { _id: '$subscription.status', count: { $sum: 1 } } }
        ])
      ]);

      // Get recent organizations
      const recentOrganizations = await Organization.find()
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name slug createdAt subscription');

      res.json({
        success: true,
        data: {
          counts: {
            organizations: totalOrganizations,
            users: totalUsers,
            projects: totalProjects,
            features: totalFeatures,
            models: totalModels,
            providers: totalProviders,
            activeOrganizations
          },
          organizationsByPlan: organizationsByPlan.reduce((acc, item) => {
            acc[item._id || 'free'] = item.count;
            return acc;
          }, {}),
          organizationsByStatus: organizationsByStatus.reduce((acc, item) => {
            acc[item._id || 'active'] = item.count;
            return acc;
          }, {}),
          recentOrganizations
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users with filtering
   * @route GET /api/admin/users
   */
  async getUsers(req, res, next) {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      if (status && status !== 'all') {
        query.isActive = status === 'active';
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await User.find(query)
        .populate('organization', 'name slug')
        .populate('role', 'name')
        .select('firstName lastName email isActive createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create organization (admin)
   * @route POST /api/admin/organizations
   */
  async createOrganization(req, res, next) {
    try {
      const { name, description, plan, ownerEmail, ownerFirstName, ownerLastName } = req.body;

      // Check if organization name already exists
      const existingOrg = await Organization.findOne({ name });
      if (existingOrg) {
        throw new AppError('Organization with this name already exists', 400, 'DUPLICATE_NAME');
      }

      // Find or create owner user
      let owner = await User.findOne({ email: ownerEmail });

      if (!owner) {
        // Create owner user
        owner = await User.create({
          firstName: ownerFirstName,
          lastName: ownerLastName,
          email: ownerEmail,
          password: 'TempPassword123!', // User should change this
          isActive: true,
          isFirstLogin: true
        });
      }

      // Create organization
      const organization = await Organization.create({
        name,
        description: description || '',
        owner: owner._id,
        members: [{
          user: owner._id,
          role: owner.role || null
        }],
        subscription: {
          plan: plan || 'free',
          status: 'active'
        }
      });

      // Update user's organization
      await User.findByIdAndUpdate(owner._id, { organization: organization._id });

      logger.info(`Admin created organization: ${name}`);

      res.status(201).json({
        success: true,
        message: 'Organization created successfully',
        data: { organization }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all providers with model counts
   * @route GET /api/admin/providers
   */
  async getProviders(req, res, next) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } }
        ];
      }

      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const providers = await Provider.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get model counts for each provider
      const providersWithModels = await Promise.all(providers.map(async (provider) => {
        const modelCount = await AIModel.countDocuments({ provider: provider._id });
        const activeModelCount = await AIModel.countDocuments({ provider: provider._id, isActive: true });
        return {
          ...provider.toObject(),
          modelCount,
          activeModelCount
        };
      }));

      const total = await Provider.countDocuments(query);

      res.json({
        success: true,
        data: {
          providers: providersWithModels,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider by ID with models
   * @route GET /api/admin/providers/:id
   */
  async getProviderById(req, res, next) {
    try {
      const { id } = req.params;

      const provider = await Provider.findById(id);

      if (!provider) {
        throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
      }

      // Get models for this provider
      const models = await AIModel.find({ provider: id })
        .sort({ name: 1 });

      res.json({
        success: true,
        data: {
          provider,
          models
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create provider
   * @route POST /api/admin/providers
   */
  async createProvider(req, res, next) {
    try {
      const { name, displayName, description, logo, website, settings } = req.body;

      // Check if provider already exists
      const existingProvider = await Provider.findOne({ name: name.toLowerCase() });
      if (existingProvider) {
        throw new AppError('Provider with this name already exists', 400, 'DUPLICATE_PROVIDER');
      }

      const provider = await Provider.create({
        name: name.toLowerCase(),
        displayName: displayName || name,
        description: description || '',
        logo: logo || null,
        website: website || null,
        settings: settings || {},
        isActive: true
      });

      logger.info(`Admin created provider: ${name}`);

      res.status(201).json({
        success: true,
        message: 'Provider created successfully',
        data: { provider }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update provider
   * @route PUT /api/admin/providers/:id
   */
  async updateProvider(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.createdAt;

      const provider = await Provider.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!provider) {
        throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
      }

      logger.info(`Admin updated provider: ${provider.name}`);

      res.json({
        success: true,
        message: 'Provider updated successfully',
        data: { provider }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete provider
   * @route DELETE /api/admin/providers/:id
   */
  async deleteProvider(req, res, next) {
    try {
      const { id } = req.params;

      // Check if provider has models
      const modelCount = await AIModel.countDocuments({ provider: id });
      if (modelCount > 0) {
        throw new AppError('Cannot delete provider with existing models. Delete models first.', 400, 'PROVIDER_HAS_MODELS');
      }

      const provider = await Provider.findByIdAndDelete(id);

      if (!provider) {
        throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
      }

      logger.info(`Admin deleted provider: ${provider.name}`);

      res.json({
        success: true,
        message: 'Provider deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle provider status (activate/deactivate)
   * @route PATCH /api/admin/providers/:id/status
   */
  async toggleProviderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const provider = await Provider.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      );

      if (!provider) {
        throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
      }

      logger.info(`Admin ${isActive ? 'activated' : 'deactivated'} provider: ${provider.name}`);

      res.json({
        success: true,
        message: `Provider ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { provider }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all models with filtering
   * @route GET /api/admin/models
   */
  async getModels(req, res, next) {
    try {
      const { page = 1, limit = 20, search, provider, type, status } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } }
        ];
      }

      if (provider) {
        query.provider = provider;
      }

      if (type) {
        query.type = type;
      }

      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const models = await AIModel.find(query)
        .populate('provider', 'name displayName logo')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AIModel.countDocuments(query);

      res.json({
        success: true,
        data: {
          models,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get model by ID
   * @route GET /api/admin/models/:id
   */
  async getModelById(req, res, next) {
    try {
      const { id } = req.params;

      const model = await AIModel.findById(id)
        .populate('provider', 'name displayName logo website');

      if (!model) {
        throw new AppError('Model not found', 404, 'MODEL_NOT_FOUND');
      }

      res.json({
        success: true,
        data: { model }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create model
   * @route POST /api/admin/models
   */
  async createModel(req, res, next) {
    try {
      const { name, displayName, provider, type, pricing, capabilities, settings } = req.body;

      // Check if model already exists for this provider
      const existingModel = await AIModel.findOne({ name: name.toLowerCase(), provider });
      if (existingModel) {
        throw new AppError('Model with this name already exists for this provider', 400, 'DUPLICATE_MODEL');
      }

      // Verify provider exists
      const providerDoc = await Provider.findById(provider);
      if (!providerDoc) {
        throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
      }

      const model = await AIModel.create({
        name: name.toLowerCase(),
        displayName: displayName || name,
        provider,
        type: type || 'chat',
        pricing: pricing || {},
        capabilities: capabilities || {},
        settings: settings || {},
        isActive: true
      });

      await model.populate('provider', 'name displayName logo');

      logger.info(`Admin created model: ${name} for provider: ${providerDoc.name}`);

      res.status(201).json({
        success: true,
        message: 'Model created successfully',
        data: { model }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update model
   * @route PUT /api/admin/models/:id
   */
  async updateModel(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.createdAt;

      // Fetch current model to check for pricing changes
      const currentModel = await AIModel.findById(id);
      if (!currentModel) {
        throw new AppError('Model not found', 404, 'MODEL_NOT_FOUND');
      }

      // Check if pricing is being updated - record history
      if (updates.pricing && (
        updates.pricing.inputPrice !== currentModel.pricing.inputPrice ||
        updates.pricing.outputPrice !== currentModel.pricing.outputPrice ||
        updates.pricing.unit !== currentModel.pricing.unit ||
        updates.pricing.pricePerUnit !== currentModel.pricing.pricePerUnit
      )) {
        const previousPricing = {
          inputPrice: currentModel.pricing.inputPrice,
          outputPrice: currentModel.pricing.outputPrice,
          currency: currentModel.pricing.currency,
          unit: currentModel.pricing.unit,
          pricePerUnit: currentModel.pricing.pricePerUnit
        };

        const newPricing = {
          inputPrice: updates.pricing.inputPrice ?? currentModel.pricing.inputPrice,
          outputPrice: updates.pricing.outputPrice ?? currentModel.pricing.outputPrice,
          currency: updates.pricing.currency ?? currentModel.pricing.currency,
          unit: updates.pricing.unit ?? currentModel.pricing.unit,
          pricePerUnit: updates.pricing.pricePerUnit ?? currentModel.pricing.pricePerUnit
        };

        await PricingHistory.recordChange({
          modelId: currentModel._id,
          providerId: currentModel.provider,
          previousPricing,
          newPricing,
          changedBy: req.user.id || req.user.userId,
          reason: 'manual_adjustment',
          notes: 'Updated via Super Admin Dashboard',
          source: 'official'
        });

        logger.info(`Pricing history recorded for model ${currentModel._id}: input ${previousPricing.inputPrice} -> ${newPricing.inputPrice}`);
      }

      const model = await AIModel.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('provider', 'name displayName logo');

      logger.info(`Admin updated model: ${model.name}`);

      res.json({
        success: true,
        message: 'Model updated successfully',
        data: { model }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete model
   * @route DELETE /api/admin/models/:id
   */
  async deleteModel(req, res, next) {
    try {
      const { id } = req.params;

      // Check if model is used by any features
      const featureCount = await Feature.countDocuments({ model: id });
      if (featureCount > 0) {
        throw new AppError('Cannot delete model that is used by features. Remove features first.', 400, 'MODEL_IN_USE');
      }

      const model = await AIModel.findByIdAndDelete(id);

      if (!model) {
        throw new AppError('Model not found', 404, 'MODEL_NOT_FOUND');
      }

      logger.info(`Admin deleted model: ${model.name}`);

      res.json({
        success: true,
        message: 'Model deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle model status (activate/deactivate)
   * @route PATCH /api/admin/models/:id/status
   */
  async toggleModelStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const model = await AIModel.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      ).populate('provider', 'name displayName logo');

      if (!model) {
        throw new AppError('Model not found', 404, 'MODEL_NOT_FOUND');
      }

      logger.info(`Admin ${isActive ? 'activated' : 'deactivated'} model: ${model.name}`);

      res.json({
        success: true,
        message: `Model ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { model }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard statistics
   * @route GET /api/admin/dashboard
   */
  async getDashboardStats(req, res, next) {
    try {
      const [
        totalOrganizations,
        totalUsers,
        totalProjects,
        totalFeatures,
        totalModels,
        totalProviders,
        activeOrganizations,
        modelsByType,
        featuresByStatus
      ] = await Promise.all([
        Organization.countDocuments(),
        User.countDocuments(),
        Project.countDocuments(),
        Feature.countDocuments(),
        AIModel.countDocuments(),
        Provider.countDocuments(),
        Organization.countDocuments({ isActive: true }),
        AIModel.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
        Feature.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      ]);

      // Recent activity
      const recentOrganizations = await Organization.find()
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name slug createdAt subscription');

      const recentModels = await AIModel.find()
        .populate('provider', 'name displayName')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name displayName type createdAt');

      res.json({
        success: true,
        data: {
          counts: {
            organizations: totalOrganizations,
            users: totalUsers,
            projects: totalProjects,
            features: totalFeatures,
            models: totalModels,
            providers: totalProviders,
            activeOrganizations
          },
          modelsByType: modelsByType.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          featuresByStatus: featuresByStatus.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          recentOrganizations,
          recentModels
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================
  // PLAN MANAGEMENT (Platform-wide)
  // ===========================================

  /**
   * Get all plans (platform-wide)
   * @route GET /api/admin/plans
   */
  async getPlans(req, res, next) {
    try {
      const { page = 1, limit = 20, status, tier, public: isPublic } = req.query;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (tier) {
        query.tier = tier;
      }

      if (isPublic !== undefined) {
        query['settings.isPublic'] = isPublic === 'true';
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const plans = await Plan.find(query)
        .populate('organization', 'name slug')
        .populate('features.feature', 'name slug category')
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Plan.countDocuments(query);

      res.json({
        success: true,
        data: {
          plans,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plan by ID
   * @route GET /api/admin/plans/:id
   */
  async getPlanById(req, res, next) {
    try {
      const { id } = req.params;

      const plan = await Plan.findById(id)
        .populate('organization', 'name slug')
        .populate('features.feature', 'name slug category tokenEstimates');

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      res.json({
        success: true,
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new plan (platform-wide)
   * @route POST /api/admin/plans
   */
  async createPlan(req, res, next) {
    try {
      const planData = req.body;

      // Get the first organization or create one
      let organization = await Organization.findOne().sort({ createdAt: 1 });

      if (!organization) {
        // Create a default organization if none exists
        const superAdmin = await User.findOne({ role: { name: 'super_admin' } });
        organization = await Organization.create({
          name: 'Platform Plans',
          owner: superAdmin?._id,
          isActive: true
        });
      }

      // Auto-generate slug from name
      if (!planData.slug && planData.name) {
        planData.slug = planData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      const plan = await Plan.create({
        ...planData,
        organization: organization._id
      });

      await plan.populate('features.feature', 'name slug category');

      logger.info(`Admin created plan: ${plan.name}`);

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update plan (platform-wide)
   * @route PUT /api/admin/plans/:id
   */
  async updatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.organization;
      delete updates.createdAt;

      // Auto-generate slug from name if name changed
      if (updates.name && !updates.slug) {
        updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      const plan = await Plan.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('features.feature', 'name slug category tokenEstimates');

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      logger.info(`Admin updated plan: ${plan.name}`);

      res.json({
        success: true,
        message: 'Plan updated successfully',
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete plan (platform-wide)
   * @route DELETE /api/admin/plans/:id
   */
  async deletePlan(req, res, next) {
    try {
      const { id } = req.params;

      const plan = await Plan.findByIdAndDelete(id);

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      logger.info(`Admin deleted plan: ${plan.name}`);

      res.json({
        success: true,
        message: 'Plan deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle plan status (activate/deactivate)
   * @route PATCH /api/admin/plans/:id/status
   */
  async togglePlanStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['draft', 'active', 'archived', 'deprecated'].includes(status)) {
        throw new AppError('Invalid status', 400, 'INVALID_STATUS');
      }

      const plan = await Plan.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate('features.feature', 'name slug category');

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      logger.info(`Admin changed plan ${plan.name} status to ${status}`);

      res.json({
        success: true,
        message: `Plan status changed to ${status}`,
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle plan public visibility
   * @route PATCH /api/admin/plans/:id/visibility
   */
  async togglePlanVisibility(req, res, next) {
    try {
      const { id } = req.params;
      const { isPublic } = req.body;

      const plan = await Plan.findByIdAndUpdate(
        id,
        { 'settings.isPublic': isPublic },
        { new: true }
      ).populate('features.feature', 'name slug category');

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      logger.info(`Admin ${isPublic ? 'published' : 'unpublished'} plan: ${plan.name}`);

      res.json({
        success: true,
        message: `Plan ${isPublic ? 'published' : 'unpublished'} successfully`,
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set plan as default
   * @route PATCH /api/admin/plans/:id/default
   */
  async setDefaultPlan(req, res, next) {
    try {
      const { id } = req.params;

      // Remove default from all other plans
      await Plan.updateMany({}, { 'settings.isDefault': false });

      // Set this plan as default
      const plan = await Plan.findByIdAndUpdate(
        id,
        { 'settings.isDefault': true },
        { new: true }
      ).populate('features.feature', 'name slug category');

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      logger.info(`Admin set default plan: ${plan.name}`);

      res.json({
        success: true,
        message: 'Default plan updated',
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder plans
   * @route PATCH /api/admin/plans/reorder
   */
  async reorderPlans(req, res, next) {
    try {
      const { planOrders } = req.body; // Array of { id, displayOrder }

      if (!planOrders || !Array.isArray(planOrders)) {
        throw new AppError('Plan orders are required', 400, 'INVALID_REQUEST');
      }

      const updates = planOrders.map(({ id, displayOrder }) =>
        Plan.findByIdAndUpdate(id, { displayOrder }, { new: true })
      );

      await Promise.all(updates);

      logger.info(`Admin reordered plans`);

      res.json({
        success: true,
        message: 'Plans reordered successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();