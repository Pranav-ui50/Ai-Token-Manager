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
import Setting from '../models/Setting.js';
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

      // Valid subscription statuses from Organization schema
      const validStatuses = ['active', 'trial', 'pending_payment', 'past_due', 'expired', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status. Valid statuses are: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
      }

      const organization = await Organization.findByIdAndUpdate(
        id,
        {
          'subscription.status': status,
          isActive: status !== 'expired' && status !== 'cancelled'
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

      // Valid plans in the system
      const validPlans = ['free', 'starter', 'professional', 'business', 'enterprise'];
      if (!validPlans.includes(plan)) {
        throw new AppError('Invalid plan. Valid plans are: free, starter, professional, business, enterprise', 400, 'INVALID_PLAN');
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
   * Get user by ID
   * @route GET /api/admin/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .populate('organization', 'name slug')
        .populate('role', 'name permissions');

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status
   * @route PATCH /api/admin/users/:id/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive'].includes(status)) {
        throw new AppError('Invalid status. Use "active" or "inactive"', 400, 'INVALID_STATUS');
      }

      const user = await User.findByIdAndUpdate(
        id,
        { isActive: status === 'active' },
        { new: true }
      ).populate('organization', 'name slug').populate('role', 'name');

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      logger.info(`Admin updated user ${id} status to ${status}`);

      res.json({
        success: true,
        message: 'User status updated',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role
   * @route PATCH /api/admin/users/:id/role
   */
  async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      if (!roleId) {
        throw new AppError('Role ID is required', 400, 'ROLE_REQUIRED');
      }

      const user = await User.findByIdAndUpdate(
        id,
        { role: roleId },
        { new: true }
      ).populate('organization', 'name slug').populate('role', 'name');

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      logger.info(`Admin updated user ${id} role to ${roleId}`);

      res.json({
        success: true,
        message: 'User role updated',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create organization (admin)
   * @route POST /api/admin/organizations
   *
   * According to SRS:
   * - Super Admin can create Organization
   * - Do NOT make Super Admin pay subscription
   * - Subscription belongs to Organization
   * - Set subscription status as Trial until Organization Owner completes payment
   */
  async createOrganization(req, res, next) {
    try {
      const { name, description, plan, ownerEmail, ownerFirstName, ownerLastName, ownerPassword, sendInvitation } = req.body;

      // Validate plan - only allow valid plans that exist in the system
      const validPlans = ['free', 'starter', 'professional', 'business', 'enterprise'];
      const selectedPlan = validPlans.includes(plan) ? plan : 'starter';

      // Check if organization name already exists
      const existingOrg = await Organization.findOne({ name });
      if (existingOrg) {
        throw new AppError('Organization with this name already exists', 400, 'DUPLICATE_NAME');
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Check if slug already exists
      const existingSlug = await Organization.findOne({ slug });
      if (existingSlug) {
        throw new AppError('Organization slug already exists', 400, 'DUPLICATE_SLUG');
      }

      // Find or create owner user
      let owner = await User.findOne({ email: ownerEmail.toLowerCase() });
      let isNewUser = false;
      let userPassword = ownerPassword; // Store the password to return

      if (!owner) {
        // Validate password is provided for new user
        if (!ownerPassword || ownerPassword.length < 8) {
          throw new AppError('Password must be at least 8 characters for new users', 400, 'INVALID_PASSWORD');
        }

        // Create owner user with provided password
        owner = await User.create({
          firstName: ownerFirstName,
          lastName: ownerLastName,
          email: ownerEmail.toLowerCase(),
          password: ownerPassword,
          isActive: true,
          isFirstLogin: true
        });
        isNewUser = true;
        logger.info(`Created new user for organization owner: ${ownerEmail}`);
      } else {
        // Existing user - they will use their existing password
        userPassword = null; // Don't return password for existing users
      }

      // Create organization with Trial status
      // Super Admin creates org - no payment required, set to trial
      const organization = await Organization.create({
        name,
        slug,
        description: description || '',
        owner: owner._id,
        members: [{
          user: owner._id,
          role: owner.role || null
        }],
        subscription: {
          plan: selectedPlan,
          status: 'trial', // Set to trial - owner completes payment separately
          startDate: new Date(),
          // Trial period: 14 days for the owner to set up payment
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        },
        isActive: true
      });

      // Update user's organization
      await User.findByIdAndUpdate(owner._id, { organization: organization._id });

      logger.info(`Admin created organization: ${name} with plan: ${selectedPlan}, status: trial`);

      // TODO: Send invitation email to owner if sendInvitation is true
      // This would be implemented with an email service

      res.status(201).json({
        success: true,
        message: isNewUser
          ? 'Organization created successfully. Share the credentials with the owner.'
          : 'Organization created successfully. Existing user assigned as owner.',
        data: {
          organization,
          owner: {
            id: owner._id,
            email: owner.email,
            firstName: owner.firstName,
            lastName: owner.lastName,
            isNewUser
          }
        }
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
        organizationsByPlan,
        organizationsByStatus,
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
        Organization.aggregate([
          { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
        ]),
        Organization.aggregate([
          { $group: { _id: '$subscription.status', count: { $sum: 1 } } }
        ]),
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

      // Process organizations by plan - include all tier options
      const planCounts = {
        free: 0,
        starter: 0,
        professional: 0,
        business: 0,
        enterprise: 0
      };
      organizationsByPlan.forEach(item => {
        const tier = item._id || 'free';
        if (planCounts.hasOwnProperty(tier)) {
          planCounts[tier] = item.count;
        } else {
          planCounts['free'] += item.count; // Add unknown plans to free
        }
      });

      // Process organizations by status - include all status options
      const statusCounts = {
        active: 0,
        trial: 0,
        pending_payment: 0,
        past_due: 0,
        suspended: 0,
        cancelled: 0,
        expired: 0
      };
      organizationsByStatus.forEach(item => {
        const status = item._id || 'active';
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status] = item.count;
        } else {
          statusCounts['active'] += item.count; // Add unknown status to active
        }
      });

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
          organizationsByPlan: planCounts,
          organizationsByStatus: statusCounts,
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

      // Debug logging
      console.log('\n[DEBUG getPlans] ========================================');
      console.log('[DEBUG getPlans] found', plans.length, 'plans');
      if (plans.length > 0) {
        console.log('[DEBUG getPlans] First plan _id:', plans[0]._id);
        console.log('[DEBUG getPlans] First plan name:', plans[0].name);
        console.log('[DEBUG getPlans] First plan limits:', JSON.stringify(plans[0].limits, null, 2));
        console.log('[DEBUG getPlans] First plan limits.maxProjects:', plans[0].limits?.maxProjects);
        console.log('[DEBUG getPlans] First plan limits.maxFeatures:', plans[0].limits?.maxFeatures);
        console.log('[DEBUG getPlans] First plan limits.maxSimulations:', plans[0].limits?.maxSimulations);
        console.log('[DEBUG getPlans] First plan raw (toObject):', JSON.stringify(plans[0].toObject(), null, 2));
      }
      console.log('[DEBUG getPlans] ========================================\n');

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

      console.log('\n[DEBUG getPlanById] ========================================');
      console.log('[DEBUG getPlanById] Fetching plan with id:', id);

      const plan = await Plan.findById(id)
        .populate('organization', 'name slug')
        .populate('features.feature', 'name slug category tokenEstimates');

      if (!plan) {
        console.log('[DEBUG getPlanById] Plan not found!');
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      // Debug logging
      console.log('[DEBUG getPlanById] plan._id:', plan._id);
      console.log('[DEBUG getPlanById] plan.name:', plan.name);
      console.log('[DEBUG getPlanById] plan.limits:', JSON.stringify(plan.limits, null, 2));
      console.log('[DEBUG getPlanById] plan.limits.maxProjects:', plan.limits?.maxProjects, '(type:', typeof plan.limits?.maxProjects, ')');
      console.log('[DEBUG getPlanById] plan.limits.maxFeatures:', plan.limits?.maxFeatures, '(type:', typeof plan.limits?.maxFeatures, ')');
      console.log('[DEBUG getPlanById] plan.limits.maxSimulations:', plan.limits?.maxSimulations, '(type:', typeof plan.limits?.maxSimulations, ')');
      console.log('[DEBUG getPlanById] plan raw (toObject):', JSON.stringify(plan.toObject(), null, 2));
      console.log('[DEBUG getPlanById] ========================================\n');

      res.json({
        success: true,
        data: { plan }
      });
    } catch (error) {
      console.error('[DEBUG getPlanById] ERROR:', error);
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

      // Debug logging - verify request body
      console.log('\n[DEBUG createPlan] ========================================');
      console.log('[DEBUG createPlan] createPlan called');
      console.log('[DEBUG createPlan] Request body:', JSON.stringify(planData, null, 2));
      console.log('[DEBUG createPlan] planData.limits:', JSON.stringify(planData.limits, null, 2));
      console.log('[DEBUG createPlan] planData.limits.maxProjects:', planData.limits?.maxProjects, '(type:', typeof planData.limits?.maxProjects, ')');
      console.log('[DEBUG createPlan] planData.limits.maxFeatures:', planData.limits?.maxFeatures, '(type:', typeof planData.limits?.maxFeatures, ')');
      console.log('[DEBUG createPlan] planData.limits.maxSimulations:', planData.limits?.maxSimulations, '(type:', typeof planData.limits?.maxSimulations, ')');

      // Validate and convert limits to proper numbers or null
      if (planData.limits) {
        const limitFields = ['maxProjects', 'maxFeatures', 'maxSimulations', 'maxUsers', 'maxApiCalls', 'maxTokens', 'maxStorage'];
        for (const field of limitFields) {
          const value = planData.limits[field];
          if (value === null || value === undefined || value === '') {
            // Convert null, undefined, or empty string to null (unlimited)
            planData.limits[field] = null;
          } else if (typeof value === 'string') {
            // If it's a string, try to parse it as a number
            const parsed = parseInt(value, 10);
            planData.limits[field] = isNaN(parsed) ? null : parsed;
          } else if (typeof value === 'number') {
            // If it's already a number, keep it (unless NaN)
            planData.limits[field] = isNaN(value) ? null : Math.floor(value);
          } else {
            // Unknown type, convert to null
            console.warn(`[DEBUG createPlan] Invalid ${field} value: ${value}, type: ${typeof value}. Converting to null.`);
            planData.limits[field] = null;
          }
        }
      }

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

      // Create plan with all fields
      const planToCreate = {
        organization: organization._id,
        name: planData.name,
        slug: planData.slug,
        description: planData.description || '',
        tier: planData.tier || 'starter',
        status: planData.status || 'draft',
        isPopular: planData.isPopular || false,
        displayOrder: planData.displayOrder || 0,

        // Billing
        billing: {
          price: planData.billing?.price || 0,
          yearlyPrice: planData.billing?.yearlyPrice,
          currency: planData.billing?.currency || 'USD',
          interval: planData.billing?.interval || 'month',
          trialDays: planData.billing?.trialDays || 0
        },

        // Pricing Model
        pricingModel: {
          type: planData.pricingModel?.type || 'flat',
          usageBased: {
            includedTokens: planData.pricingModel?.usageBased?.includedTokens || 0,
            includedRequests: planData.pricingModel?.usageBased?.includedRequests || 0,
            pricePerToken: planData.pricingModel?.usageBased?.pricePerToken || 0,
            pricePerRequest: planData.pricingModel?.usageBased?.pricePerRequest || 0,
            overageMultiplier: planData.pricingModel?.usageBased?.overageMultiplier || 1
          },
          tiers: planData.pricingModel?.tiers || []
        },

        // Credits
        credits: {
          includedCredits: planData.credits?.includedCredits || 0,
          creditType: planData.credits?.creditType || 'token'
        },

        // Settings
        settings: {
          isPublic: planData.settings?.isPublic ?? true,
          isDefault: planData.settings?.isDefault ?? false,
          allowUpgrade: planData.settings?.allowUpgrade ?? true,
          allowDowngrade: planData.settings?.allowDowngrade ?? true,
          maxDowngradeInterval: planData.settings?.maxDowngradeInterval || 30
        },

        // Features
        features: planData.features || []
      };

      // CRITICAL: Explicitly set all limits fields
      // Using direct assignment to ensure Mongoose tracks the change
      planToCreate.limits = {
        maxProjects: planData.limits?.maxProjects ?? null,
        maxFeatures: planData.limits?.maxFeatures ?? null,
        maxSimulations: planData.limits?.maxSimulations ?? null,
        maxUsers: planData.limits?.maxUsers ?? null,
        maxApiCalls: planData.limits?.maxApiCalls ?? null,
        maxTokens: planData.limits?.maxTokens ?? null,
        maxStorage: planData.limits?.maxStorage ?? null
      };

      console.log('[DEBUG createPlan] planToCreate.limits:', JSON.stringify(planToCreate.limits, null, 2));
      console.log('[DEBUG createPlan] About to call Plan.create()...');
      console.log('[DEBUG createPlan] ========================================\n');

      // Create the plan using Model.create() which handles nested objects better
      const newPlan = await Plan.create(planToCreate);

      console.log('\n[DEBUG createPlan] ====== AFTER CREATE ======');
      console.log('[DEBUG createPlan] newPlan._id:', newPlan._id);
      console.log('[DEBUG createPlan] newPlan.limits:', JSON.stringify(newPlan.limits, null, 2));
      console.log('[DEBUG createPlan] newPlan.limits.maxProjects:', newPlan.limits?.maxProjects);
      console.log('[DEBUG createPlan] newPlan.limits.maxFeatures:', newPlan.limits?.maxFeatures);
      console.log('[DEBUG createPlan] newPlan.limits.maxSimulations:', newPlan.limits?.maxSimulations);

      // Verify by fetching from database
      const planVerify = await Plan.findById(newPlan._id).lean();
      console.log('[DEBUG createPlan] ====== VERIFIED FROM DB ======');
      console.log('[DEBUG createPlan] planVerify.limits:', JSON.stringify(planVerify.limits, null, 2));
      console.log('[DEBUG createPlan] planVerify.limits.maxProjects:', planVerify.limits?.maxProjects);
      console.log('[DEBUG createPlan] planVerify.limits.maxFeatures:', planVerify.limits?.maxFeatures);
      console.log('[DEBUG createPlan] planVerify.limits.maxSimulations:', planVerify.limits?.maxSimulations);
      console.log('[DEBUG createPlan] ========================================\n');

      await newPlan.populate('features.feature', 'name slug category');

      logger.info(`Admin created plan: ${newPlan.name}`);

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: { plan: newPlan }
      });
    } catch (error) {
      console.error('[DEBUG createPlan] ERROR:', error);
      console.error('[DEBUG createPlan] Error stack:', error.stack);
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

      // Debug logging - verify request body
      console.log('\n[DEBUG updatePlan] ========================================');
      console.log('[DEBUG updatePlan] updatePlan called for id:', id);
      console.log('[DEBUG updatePlan] Request body:', JSON.stringify(updates, null, 2));
      console.log('[DEBUG updatePlan] updates.limits:', JSON.stringify(updates.limits, null, 2));
      console.log('[DEBUG updatePlan] updates.limits.maxProjects:', updates.limits?.maxProjects, '(type:', typeof updates.limits?.maxProjects, ')');
      console.log('[DEBUG updatePlan] updates.limits.maxFeatures:', updates.limits?.maxFeatures, '(type:', typeof updates.limits?.maxFeatures, ')');
      console.log('[DEBUG updatePlan] updates.limits.maxSimulations:', updates.limits?.maxSimulations, '(type:', typeof updates.limits?.maxSimulations, ')');

      // Validate and convert limits to proper numbers or null
      if (updates.limits) {
        const limitFields = ['maxProjects', 'maxFeatures', 'maxSimulations', 'maxUsers', 'maxApiCalls', 'maxTokens', 'maxStorage'];
        for (const field of limitFields) {
          const value = updates.limits[field];
          if (value === null || value === undefined || value === '') {
            // Convert null, undefined, or empty string to null (unlimited)
            updates.limits[field] = null;
          } else if (typeof value === 'string') {
            // If it's a string, try to parse it as a number
            const parsed = parseInt(value, 10);
            updates.limits[field] = isNaN(parsed) ? null : parsed;
          } else if (typeof value === 'number') {
            // If it's already a number, keep it (unless NaN)
            updates.limits[field] = isNaN(value) ? null : Math.floor(value);
          } else {
            // Unknown type, convert to null
            console.warn(`[DEBUG updatePlan] Invalid ${field} value: ${value}, type: ${typeof value}. Converting to null.`);
            updates.limits[field] = null;
          }
        }
        console.log('[DEBUG updatePlan] Validated and converted updates.limits:', JSON.stringify(updates.limits, null, 2));
      }

      // Find the plan first
      const plan = await Plan.findById(id);
      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      console.log('[DEBUG updatePlan] Plan BEFORE update - limits:', JSON.stringify(plan.limits, null, 2));

      // Build the update object with individual fields using dot notation
      const updateObj = {};

      // Update basic fields
      if (updates.name) updateObj.name = updates.name;
      if (updates.slug) updateObj.slug = updates.slug;
      if (updates.description !== undefined) updateObj.description = updates.description;
      if (updates.tier) updateObj.tier = updates.tier;
      if (updates.status) updateObj.status = updates.status;
      if (updates.isPopular !== undefined) updateObj.isPopular = updates.isPopular;
      if (updates.displayOrder !== undefined) updateObj.displayOrder = updates.displayOrder;

      // Update billing
      if (updates.billing) {
        updateObj.billing = {
          price: updates.billing.price ?? plan.billing?.price ?? 0,
          yearlyPrice: updates.billing.yearlyPrice ?? plan.billing?.yearlyPrice,
          currency: updates.billing.currency ?? plan.billing?.currency ?? 'USD',
          interval: updates.billing.interval ?? plan.billing?.interval ?? 'month',
          trialDays: updates.billing.trialDays ?? plan.billing?.trialDays ?? 0
        };
      }

      // Update pricingModel
      if (updates.pricingModel) {
        updateObj.pricingModel = {
          type: updates.pricingModel.type ?? plan.pricingModel?.type ?? 'flat',
          usageBased: {
            includedTokens: updates.pricingModel.usageBased?.includedTokens ?? plan.pricingModel?.usageBased?.includedTokens ?? 0,
            includedRequests: updates.pricingModel.usageBased?.includedRequests ?? plan.pricingModel?.usageBased?.includedRequests ?? 0,
            pricePerToken: updates.pricingModel.usageBased?.pricePerToken ?? plan.pricingModel?.usageBased?.pricePerToken ?? 0,
            pricePerRequest: updates.pricingModel.usageBased?.pricePerRequest ?? plan.pricingModel?.usageBased?.pricePerRequest ?? 0,
            overageMultiplier: updates.pricingModel.usageBased?.overageMultiplier ?? plan.pricingModel?.usageBased?.overageMultiplier ?? 1
          },
          tiers: updates.pricingModel.tiers ?? plan.pricingModel?.tiers ?? []
        };
      }

      // Update credits
      if (updates.credits) {
        updateObj.credits = {
          includedCredits: updates.credits.includedCredits ?? plan.credits?.includedCredits ?? 0,
          creditType: updates.credits.creditType ?? plan.credits?.creditType ?? 'token'
        };
      }

      // CRITICAL: Update limits using DOT NOTATION to ensure all fields are set
      // Using dot notation (e.g., 'limits.maxProjects') instead of nested object
      // ensures MongoDB properly sets each field
      if (updates.limits) {
        // Set each limit field individually using dot notation
        updateObj['limits.maxProjects'] = updates.limits.maxProjects ?? null;
        updateObj['limits.maxFeatures'] = updates.limits.maxFeatures ?? null;
        updateObj['limits.maxSimulations'] = updates.limits.maxSimulations ?? null;
        updateObj['limits.maxUsers'] = updates.limits.maxUsers ?? null;
        updateObj['limits.maxApiCalls'] = updates.limits.maxApiCalls ?? null;
        updateObj['limits.maxTokens'] = updates.limits.maxTokens ?? null;
        updateObj['limits.maxStorage'] = updates.limits.maxStorage ?? null;

        console.log('[DEBUG updatePlan] limits update using dot notation:');
        console.log('[DEBUG updatePlan]   limits.maxProjects:', updateObj['limits.maxProjects']);
        console.log('[DEBUG updatePlan]   limits.maxFeatures:', updateObj['limits.maxFeatures']);
        console.log('[DEBUG updatePlan]   limits.maxSimulations:', updateObj['limits.maxSimulations']);
      }

      // Update settings
      if (updates.settings) {
        updateObj.settings = {
          isPublic: updates.settings.isPublic ?? plan.settings?.isPublic ?? true,
          isDefault: updates.settings.isDefault ?? plan.settings?.isDefault ?? false,
          allowUpgrade: updates.settings.allowUpgrade ?? plan.settings?.allowUpgrade ?? true,
          allowDowngrade: updates.settings.allowDowngrade ?? plan.settings?.allowDowngrade ?? true,
          maxDowngradeInterval: updates.settings.maxDowngradeInterval ?? plan.settings?.maxDowngradeInterval ?? 30
        };
      }

      // Update features if provided
      if (updates.features) {
        updateObj.features = updates.features;
      }

      console.log('[DEBUG updatePlan] Final updateObj keys:', Object.keys(updateObj));
      console.log('[DEBUG updatePlan] About to call findByIdAndUpdate...');
      console.log('[DEBUG updatePlan] ========================================\n');

      // Use findByIdAndUpdate with the update object
      const updatedPlan = await Plan.findByIdAndUpdate(
        id,
        { $set: updateObj },
        { new: true, runValidators: true }
      ).populate('features.feature', 'name slug category tokenEstimates');

      console.log('\n[DEBUG updatePlan] ====== AFTER UPDATE ======');
      console.log('[DEBUG updatePlan] updatedPlan._id:', updatedPlan._id);
      console.log('[DEBUG updatePlan] updatedPlan.limits:', JSON.stringify(updatedPlan.limits, null, 2));
      console.log('[DEBUG updatePlan] updatedPlan.limits.maxProjects:', updatedPlan.limits?.maxProjects);
      console.log('[DEBUG updatePlan] updatedPlan.limits.maxFeatures:', updatedPlan.limits?.maxFeatures);
      console.log('[DEBUG updatePlan] updatedPlan.limits.maxSimulations:', updatedPlan.limits?.maxSimulations);

      // Verify by fetching from database
      const planVerify = await Plan.findById(id).lean();
      console.log('[DEBUG updatePlan] ====== VERIFIED FROM DB ======');
      console.log('[DEBUG updatePlan] planVerify.limits:', JSON.stringify(planVerify.limits, null, 2));
      console.log('[DEBUG updatePlan] planVerify.limits.maxProjects:', planVerify.limits?.maxProjects);
      console.log('[DEBUG updatePlan] planVerify.limits.maxFeatures:', planVerify.limits?.maxFeatures);
      console.log('[DEBUG updatePlan] planVerify.limits.maxSimulations:', planVerify.limits?.maxSimulations);
      console.log('[DEBUG updatePlan] ========================================\n');

      logger.info(`Admin updated plan: ${updatedPlan.name}`);

      res.json({
        success: true,
        message: 'Plan updated successfully',
        data: { plan: updatedPlan }
      });
    } catch (error) {
      console.error('[DEBUG updatePlan] ERROR:', error);
      console.error('[DEBUG updatePlan] Error stack:', error.stack);
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

  // ===========================================
  // SETTINGS MANAGEMENT
  // ===========================================

  /**
   * Get system settings
   * @route GET /api/admin/settings
   */
  async getSettings(req, res, next) {
    try {
      const settings = await Setting.getSettings();

      res.json({
        success: true,
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        email: settings.email,
        security: settings.security,
        features: settings.features
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update system settings
   * @route PUT /api/admin/settings
   */
  async updateSettings(req, res, next) {
    try {
      const { siteName, siteDescription, email, security, features } = req.body;

      const settings = await Setting.updateSettings({
        siteName,
        siteDescription,
        email,
        security,
        features
      });

      logger.info(`Admin updated system settings`);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        email: settings.email,
        security: settings.security,
        features: settings.features
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();