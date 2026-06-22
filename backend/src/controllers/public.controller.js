/**
 * Public Controller
 *
 * Handles public API endpoints for landing page.
 * No authentication required.
 */

import Plan from '../models/Plan.js';
import Provider from '../models/Provider.js';
import AIModel from '../models/AIModel.js';
import Feature from '../models/Feature.js';
import Setting from '../models/Setting.js';

/**
 * Get public plans
 * Returns active public plans for landing page
 */
export const getPublicPlans = async (req, res) => {
  try {
    const plans = await Plan.find({
      status: 'active',
      'settings.isPublic': true
    })
      .select('name slug description tier billing pricingModel credits features limits settings displayOrder isPopular')
      .populate({
        path: 'features.feature',
        select: 'name slug description category'
      })
      .sort({ displayOrder: 1, tier: 1 });

    // Transform for public view - remove internal fields
    const publicPlans = plans.map(plan => ({
      id: plan._id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      tier: plan.tier,
      isPopular: plan.isPopular,
      billing: {
        price: plan.billing?.price || 0,
        currency: plan.billing?.currency || 'USD',
        interval: plan.billing?.interval || 'month',
        trialDays: plan.billing?.trialDays || 0
      },
      pricingModel: {
        type: plan.pricingModel?.type || 'flat',
        includedTokens: plan.pricingModel?.usageBased?.includedTokens || 0,
        includedRequests: plan.pricingModel?.usageBased?.includedRequests || 0
      },
      credits: {
        includedCredits: plan.credits?.includedCredits || 0,
        creditType: plan.credits?.creditType || 'token'
      },
      features: (plan.features || []).map(f => ({
        name: f.feature?.name,
        slug: f.feature?.slug,
        description: f.feature?.description,
        category: f.feature?.category,
        enabled: f.enabled,
        limits: f.limits
      })),
      limits: plan.limits,
      settings: {
        isPublic: plan.settings?.isPublic,
        isDefault: plan.settings?.isDefault
      }
    }));

    res.json({
      success: true,
      data: publicPlans
    });
  } catch (error) {
    console.error('Error fetching public plans:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch plans' }
    });
  }
};

/**
 * Get single public plan by ID
 */
export const getPublicPlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({
      _id: req.params.id,
      status: 'active',
      'settings.isPublic': true
    })
      .select('name slug description tier billing pricingModel credits features limits settings displayOrder isPopular')
      .populate({
        path: 'features.feature',
        select: 'name slug description category'
      });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { message: 'Plan not found' }
      });
    }

    res.json({
      success: true,
      data: {
        id: plan._id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        tier: plan.tier,
        isPopular: plan.isPopular,
        billing: plan.billing,
        pricingModel: plan.pricingModel,
        credits: plan.credits,
        features: plan.features,
        limits: plan.limits
      }
    });
  } catch (error) {
    console.error('Error fetching public plan:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch plan' }
    });
  }
};

/**
 * Get public providers
 * Returns active providers with basic info for landing page
 */
export const getPublicProviders = async (req, res) => {
  try {
    const providers = await Provider.find({ isActive: true })
      .select('name slug displayName description logo website settings')
      .sort({ name: 1 });

    // Get model count for each provider
    const providersWithModels = await Promise.all(
      providers.map(async (provider) => {
        const modelCount = await AIModel.countDocuments({
          provider: provider._id,
          isActive: true
        });

        return {
          id: provider._id,
          name: provider.name,
          slug: provider.slug,
          displayName: provider.displayName,
          description: provider.description,
          logo: provider.logo,
          website: provider.website,
          capabilities: {
            supportsStreaming: provider.settings?.supportsStreaming || false,
            supportsVision: provider.settings?.supportsVision || false,
            supportsFunctionCalling: provider.settings?.supportsFunctionCalling || false
          },
          modelCount
        };
      })
    );

    res.json({
      success: true,
      data: providersWithModels
    });
  } catch (error) {
    console.error('Error fetching public providers:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch providers' }
    });
  }
};

/**
 * Get single public provider by ID or slug
 */
export const getPublicProvider = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by ID or slug
    const provider = await Provider.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { slug: id }
      ],
      isActive: true
    }).select('name slug displayName description logo website settings');

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: { message: 'Provider not found' }
      });
    }

    // Get models for this provider
    const models = await AIModel.find({
      provider: provider._id,
      isActive: true
    })
      .select('name slug displayName description contextWindow pricing capabilities')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        id: provider._id,
        name: provider.name,
        slug: provider.slug,
        displayName: provider.displayName,
        description: provider.description,
        logo: provider.logo,
        website: provider.website,
        capabilities: {
          supportsStreaming: provider.settings?.supportsStreaming || false,
          supportsVision: provider.settings?.supportsVision || false,
          supportsFunctionCalling: provider.settings?.supportsFunctionCalling || false
        },
        models: models.map(model => ({
          id: model._id,
          name: model.name,
          slug: model.slug,
          displayName: model.displayName,
          description: model.description,
          contextWindow: model.contextWindow,
          pricing: model.pricing,
          capabilities: model.capabilities
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching public provider:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch provider' }
    });
  }
};

/**
 * Get public platform statistics
 * Returns aggregate stats for landing page
 */
export const getPublicStats = async (req, res) => {
  try {
    // Get counts
    const [providerCount, modelCount, planCount, featureCount] = await Promise.all([
      Provider.countDocuments({ isActive: true }),
      AIModel.countDocuments({ isActive: true }),
      Plan.countDocuments({ status: 'active', 'settings.isPublic': true }),
      Feature.countDocuments({ isActive: true })
    ]);

    // Get unique categories
    const categories = await Feature.distinct('category', { isActive: true });

    // Get tier distribution
    const tierDistribution = await Plan.aggregate([
      { $match: { status: 'active', 'settings.isPublic': true } },
      { $group: { _id: '$tier', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        providers: providerCount,
        models: modelCount,
        plans: planCount,
        features: featureCount,
        categories: categories.length,
        tierDistribution: tierDistribution.reduce((acc, t) => {
          acc[t._id] = t.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch stats' }
    });
  }
};

/**
 * Get public features
 * Returns active features for landing page
 */
export const getPublicFeatures = async (req, res) => {
  try {
    const features = await Feature.find({ isActive: true })
      .select('name slug description category icon tokenEstimate')
      .sort({ category: 1, name: 1 });

    // Group by category
    const groupedFeatures = features.reduce((acc, feature) => {
      const category = feature.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: feature._id,
        name: feature.name,
        slug: feature.slug,
        description: feature.description,
        icon: feature.icon,
        tokenEstimate: feature.tokenEstimate
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        features: features.map(f => ({
          id: f._id,
          name: f.name,
          slug: f.slug,
          description: f.description,
          category: f.category,
          icon: f.icon,
          tokenEstimate: f.tokenEstimate
        })),
        grouped: groupedFeatures,
        categories: Object.keys(groupedFeatures)
      }
    });
  } catch (error) {
    console.error('Error fetching public features:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch features' }
    });
  }
};

/**
 * Get public site settings
 * Returns site name and description for all users
 * This is accessible without authentication
 */
export const getPublicSiteSettings = async (req, res) => {
  try {
    const settings = await Setting.getSettings();

    res.json({
      success: true,
      data: {
        siteName: settings.siteName || 'API Token Manager',
        siteDescription: settings.siteDescription || 'AI API Token Cost Management Platform'
      }
    });
  } catch (error) {
    console.error('Error fetching public site settings:', error);
    // Return defaults on error
    res.json({
      success: true,
      data: {
        siteName: 'API Token Manager',
        siteDescription: 'AI API Token Cost Management Platform'
      }
    });
  }
};