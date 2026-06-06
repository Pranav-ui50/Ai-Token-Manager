/**
 * Dynamic Models Service
 *
 * Fetches AI models directly from provider APIs for providers that support model discovery.
 * Falls back to database models for providers without API support.
 *
 * Supported providers with model discovery:
 * - OpenAI: GET /v1/models
 * - Google Gemini: models.list()
 * - Mistral AI: GET /v1/models
 * - Cohere: GET /models
 *
 * Unsupported (database fallback):
 * - Anthropic: No models API
 * - Meta/Llama: No official API (partner-dependent)
 */

import axios from 'axios';
import Integration from '../models/Integration.js';
import AIModel from '../models/AIModel.js';
import Provider from '../models/Provider.js';
import cacheService from './cache.service.js';
import logger from '../config/logger.js';

// Provider configurations for model discovery
const PROVIDER_CONFIGS = {
  openai: {
    name: 'OpenAI',
    supportsModelDiscovery: true,
    baseUrl: 'https://api.openai.com/v1',
    endpoint: '/models',
    authType: 'bearer',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    cacheTTL: 3600, // 1 hour
    // Models to exclude (not useful for users)
    excludePatterns: [
      /^whisper-\d/,
      /^tts-/,
      /^dall-e-/,
      /^babbage/,
      /^davinci/,
      /^code-davinci/,
      /^search-/,
      /^embedding-/,
      /:ft-/,  // Fine-tuned models (user-specific)
    ],
    // Model categorization
    modelCategories: {
      chat: ['gpt-4', 'gpt-3.5-turbo', 'o1-', 'o3-'],
      embedding: ['text-embedding'],
      image: ['dall-e', 'gpt-image'],
      audio: ['whisper', 'tts']
    }
  },

  anthropic: {
    name: 'Anthropic',
    supportsModelDiscovery: false, // No models API
    fallbackToDatabase: true
  },

  google: {
    name: 'Google Gemini',
    supportsModelDiscovery: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    endpoint: '/models',
    authType: 'query', // API key in query param
    queryParam: 'key',
    apiKeyEnvVar: 'GOOGLE_AI_API_KEY',
    cacheTTL: 3600,
    excludePatterns: [
      /^embedContent$/,
      /^embedText$/
    ],
    modelCategories: {
      chat: ['gemini'],
      embedding: ['embedding', 'embed']
    }
  },

  mistral: {
    name: 'Mistral AI',
    supportsModelDiscovery: true,
    baseUrl: 'https://api.mistral.ai/v1',
    endpoint: '/models',
    authType: 'bearer',
    apiKeyEnvVar: 'MISTRAL_API_KEY',
    cacheTTL: 3600,
    excludePatterns: [],
    modelCategories: {
      chat: ['mistral', 'mixtral', 'codestral', 'ministral']
    }
  },

  cohere: {
    name: 'Cohere',
    supportsModelDiscovery: true,
    baseUrl: 'https://api.cohere.ai/v1',
    endpoint: '/models',
    authType: 'bearer',
    apiKeyEnvVar: 'COHERE_API_KEY',
    cacheTTL: 3600,
    excludePatterns: [],
    modelCategories: {
      chat: ['command', 'c4ai'],
      embedding: ['embed'],
      rerank: ['rerank']
    }
  },

  meta: {
    name: 'Meta AI (Llama)',
    supportsModelDiscovery: false, // No official API
    fallbackToDatabase: true
  },

  together: {
    name: 'Together AI',
    supportsModelDiscovery: true,
    baseUrl: 'https://api.together.xyz/v1',
    endpoint: '/models',
    authType: 'bearer',
    apiKeyEnvVar: 'TOGETHER_API_KEY',
    cacheTTL: 3600,
    excludePatterns: [],
    modelCategories: {
      chat: ['llama', 'mistral', 'mixtral', 'qwen', 'deepseek', 'phi'],
      embedding: ['embed'],
      image: ['stable-diffusion', 'flux', 'sdxl']
    }
  },

  groq: {
    name: 'Groq',
    supportsModelDiscovery: true,
    baseUrl: 'https://api.groq.com/openai/v1',
    endpoint: '/models',
    authType: 'bearer',
    apiKeyEnvVar: 'GROQ_API_KEY',
    cacheTTL: 3600,
    excludePatterns: [/^whisper/],
    modelCategories: {
      chat: ['llama', 'mixtral', 'gemma', 'qwen', 'deepseek'],
      audio: ['whisper']
    }
  },

  deepseek: {
    name: 'DeepSeek',
    supportsModelDiscovery: true,
    baseUrl: 'https://api.deepseek.com/v1',
    endpoint: '/models',
    authType: 'bearer',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    cacheTTL: 3600,
    excludePatterns: [],
    modelCategories: {
      chat: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
      reasoning: ['deepseek-reasoner', 'deepseek-r1']
    }
  }
};

class DynamicModelsService {
  constructor() {
    this.cacheKeys = {
      providerModels: (providerId) => `dynamic:models:${providerId}`,
      providerModelsBySlug: (slug) => `dynamic:models:slug:${slug}`
    };
  }

  /**
   * Get models for a provider (dynamic fetch + database fallback)
   * @param {string} providerId - Provider ID or slug
   * @param {Object} options - Options
   * @param {string} organizationId - Organization ID for credential lookup
   * @returns {Object} Models with source info
   */
  async getModels(providerId, options = {}, organizationId = null) {
    const { forceRefresh = false, useCache = true } = options;

    // Get provider from database
    let provider;
    if (providerId.match(/^[0-9a-fA-F]{24}$/)) {
      provider = await Provider.findById(providerId);
    } else {
      provider = await Provider.findOne({
        $or: [
          { slug: providerId },
          { name: { $regex: new RegExp(`^${providerId}$`, 'i') } }
        ]
      });
    }

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Get provider config - try multiple matching strategies
    const providerNameLower = provider.name.toLowerCase();
    let config = null;

    // Try exact match first
    if (PROVIDER_CONFIGS[providerNameLower]) {
      config = PROVIDER_CONFIGS[providerNameLower];
    }
    // Try slug match
    else if (PROVIDER_CONFIGS[provider.slug]) {
      config = PROVIDER_CONFIGS[provider.slug];
    }
    // Try partial match (e.g., "Meta AI (Llama)" -> "meta")
    else {
      for (const [key, cfg] of Object.entries(PROVIDER_CONFIGS)) {
        if (providerNameLower.includes(key) || key.includes(providerNameLower.split(' ')[0])) {
          config = cfg;
          break;
        }
      }
    }

    // Check cache first
    if (!forceRefresh && useCache) {
      const cacheKey = this.cacheKeys.providerModels(provider._id);
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Returning cached models for provider ${provider.name}`);
        return {
          provider: {
            id: provider._id,
            name: provider.name,
            displayName: provider.displayName
          },
          source: cached.source,
          models: cached.models,
          fromCache: true
        };
      }
    }

    // Try dynamic fetch if supported
    if (config?.supportsModelDiscovery) {
      try {
        const dynamicModels = await this.fetchModelsFromProvider(provider, config, organizationId);

        if (dynamicModels.length > 0) {
          // Cache the results
          const result = {
            provider: {
              id: provider._id,
              name: provider.name,
              displayName: provider.displayName
            },
            source: 'api',
            models: dynamicModels,
            fromCache: false,
            fetchedAt: new Date()
          };

          await cacheService.set(
            this.cacheKeys.providerModels(provider._id),
            result,
            config.cacheTTL || 3600
          );

          // Merge with database models to include all available models
          const dbModels = await this.getModelsFromDatabase(provider._id);
          const mergedModels = this.mergeModels(dynamicModels, dbModels);

          result.models = mergedModels;
          result.source = 'hybrid';
          result.reason = 'Live API models merged with database models';

          return result;
        }
      } catch (error) {
        logger.warn(`Dynamic model fetch failed for ${provider.name}: ${error.message}`);
        // Fall through to database fallback
      }
    }

    // Fallback to database
    const dbModels = await this.getModelsFromDatabase(provider._id);

    const result = {
      provider: {
        id: provider._id,
        name: provider.name,
        displayName: provider.displayName
      },
      source: config?.supportsModelDiscovery ? 'database_fallback' : 'database',
      models: dbModels,
      fromCache: false,
      reason: config?.supportsModelDiscovery
        ? 'API fetch failed, using database fallback'
        : 'Provider does not support model discovery API'
    };

    return result;
  }

  /**
   * Fetch models from provider API
   * @private
   */
  async fetchModelsFromProvider(provider, config, organizationId) {
    // Get API credentials
    const credentials = await this.getProviderCredentials(provider, organizationId);

    if (!credentials?.apiKey) {
      throw new Error('No API credentials configured for this provider');
    }

    const { apiKey, baseUrl } = credentials;

    // Prepare request
    const url = `${baseUrl || config.baseUrl}${config.endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (config.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const params = {};
    if (config.authType === 'query') {
      params[config.queryParam] = apiKey;
    }

    // Make request
    const response = await axios.get(url, {
      headers,
      params,
      timeout: 15000
    });

    // Parse response based on provider
    const rawModels = this.parseProviderResponse(provider.name.toLowerCase(), response.data);

    // Normalize models
    const normalizedModels = rawModels
      .filter(model => !this.shouldExclude(model.id || model.name, config))
      .map(model => this.normalizeModel(model, provider, config))
      .sort((a, b) => {
        // Sort: recommended first, then by name
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.name.localeCompare(b.name);
      });

    return normalizedModels;
  }

  /**
   * Parse provider-specific response format
   * @private
   */
  parseProviderResponse(providerName, data) {
    switch (providerName) {
      case 'openai':
      case 'groq':
      case 'together':
      case 'deepseek':
        return data.data || [];

      case 'google':
        // Google returns models with different structure
        const googleModels = data.models || [];
        return googleModels.map(m => ({
          id: m.name?.replace('models/', '') || m.name,
          name: m.displayName || m.name?.replace('models/', ''),
          supportedGenerationMethods: m.supportedGenerationMethods || [],
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit
        }));

      case 'mistral':
        return data.data || [];

      case 'cohere':
        return (data.models || []).map(m => ({
          id: m.name || m,
          name: m.name || m,
          endpoints: m.endpoints || []
        }));

      default:
        return data.data || data.models || [];
    }
  }

  /**
   * Normalize model to consistent format
   * @private
   */
  normalizeModel(rawModel, provider, config) {
    const modelId = rawModel.id || rawModel.name;
    const modelName = rawModel.displayName || rawModel.name || modelId;

    // Determine model type
    const type = this.determineModelType(modelId, config);

    // Check if this is a recommended model
    const isRecommended = this.isRecommendedModel(modelId, provider.name.toLowerCase());

    return {
      id: modelId,
      name: modelId,
      displayName: this.formatDisplayName(modelId, modelName),
      provider: provider._id,
      providerName: provider.displayName || provider.name,
      type: type,
      capabilities: {
        supportsVision: this.checkVisionSupport(modelId),
        supportsFunctionCalling: this.checkFunctionCallingSupport(modelId),
        supportsStreaming: true,
        contextWindow: this.estimateContextWindow(modelId, rawModel),
        maxOutputTokens: rawModel.outputTokenLimit || this.estimateMaxOutput(modelId)
      },
      // Pricing will be merged from database if available
      pricing: null,
      isRecommended,
      isDynamic: true,
      rawId: modelId,
      fetchedAt: new Date()
    };
  }

  /**
   * Determine model type from ID
   * @private
   */
  determineModelType(modelId, config) {
    const id = modelId.toLowerCase();

    // Check config-defined categories
    if (config?.modelCategories) {
      for (const [type, patterns] of Object.entries(config.modelCategories)) {
        if (patterns.some(p => id.includes(p.toLowerCase()))) {
          return type;
        }
      }
    }

    // Fallback detection
    if (id.includes('embed')) return 'embedding';
    if (id.includes('image') || id.includes('dall-e') || id.includes('stable') || id.includes('flux')) return 'image';
    if (id.includes('audio') || id.includes('whisper') || id.includes('tts')) return 'audio';
    if (id.includes('video')) return 'video';

    return 'chat';
  }

  /**
   * Check if model should be excluded
   * @private
   */
  shouldExclude(modelId, config) {
    if (!config?.excludePatterns) return false;
    return config.excludePatterns.some(pattern => pattern.test(modelId));
  }

  /**
   * Format display name
   * @private
   */
  formatDisplayName(modelId, rawName) {
    // Convert model-id-like-this to "Model Id Like This"
    if (modelId.includes('-') || modelId.includes('_')) {
      return modelId
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Handle camelCase
    if (/[a-z][A-Z]/.test(modelId)) {
      return modelId
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, str => str.toUpperCase());
    }

    return rawName || modelId;
  }

  /**
   * Check if model is recommended (latest/best)
   * @private
   */
  isRecommendedModel(modelId, providerName) {
    const id = modelId.toLowerCase();

    const recommendedPatterns = {
      openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-4-0125', 'o1', 'o3'],
      google: ['gemini-2', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      mistral: ['mistral-large', 'codestral', 'ministral'],
      cohere: ['command-r-plus', 'command-r'],
      groq: ['llama-3.3', 'llama-3.2', 'deepseek-r1'],
      together: ['llama-3.3', 'llama-3.2', 'deepseek-r1', 'qwen2.5'],
      deepseek: ['deepseek-v3', 'deepseek-r1', 'deepseek-coder-v2']
    };

    const patterns = recommendedPatterns[providerName] || [];
    return patterns.some(p => id.includes(p.toLowerCase()));
  }

  /**
   * Check vision support
   * @private
   */
  checkVisionSupport(modelId) {
    const id = modelId.toLowerCase();
    const visionModels = [
      'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision', 'gpt-4-1106', 'gpt-4-0125',
      'gemini-1.5', 'gemini-2', 'gemini-pro-vision',
      'claude-3', 'claude-sonnet', 'claude-opus', 'claude-haiku',
      'llama-3.2-11b', 'llama-3.2-90b', 'llama-4',
      'qwen-vl', 'qwen2-vl'
    ];
    return visionModels.some(v => id.includes(v.toLowerCase()));
  }

  /**
   * Check function calling support
   * @private
   */
  checkFunctionCallingSupport(modelId) {
    const id = modelId.toLowerCase();
    // Most modern models support function calling
    const noFunctionCalling = ['embedding', 'whisper', 'tts', 'dall-e', 'image'];
    return !noFunctionCalling.some(n => id.includes(n));
  }

  /**
   * Estimate context window from model ID
   * @private
   */
  estimateContextWindow(modelId, rawModel) {
    // Use raw model data if available
    if (rawModel?.inputTokenLimit) return rawModel.inputTokenLimit;

    const id = modelId.toLowerCase();

    // GPT-4 family
    if (id.includes('gpt-4-turbo') || id.includes('gpt-4o')) return 128000;
    if (id.includes('gpt-4-32k')) return 32768;
    if (id.includes('gpt-4')) return 8192;

    // GPT-3.5
    if (id.includes('gpt-3.5-turbo-16k')) return 16384;
    if (id.includes('gpt-3.5')) return 4096;

    // O1/O3
    if (id.includes('o1') || id.includes('o3')) return 200000;

    // Gemini
    if (id.includes('gemini-1.5-pro')) return 2000000;
    if (id.includes('gemini-1.5-flash')) return 1000000;
    if (id.includes('gemini-2')) return 1048576;
    if (id.includes('gemini')) return 32760;

    // Claude (for reference)
    if (id.includes('claude-3') || id.includes('claude-sonnet') || id.includes('claude-opus')) return 200000;

    // Llama
    if (id.includes('llama-3.1') || id.includes('llama-3.2')) return 128000;
    if (id.includes('llama-3')) return 8192;
    if (id.includes('llama')) return 4096;

    // Mistral
    if (id.includes('mistral-large')) return 128000;
    if (id.includes('mistral') || id.includes('mixtral')) return 32768;

    // DeepSeek
    if (id.includes('deepseek-r1') || id.includes('deepseek-v3')) return 64000;
    if (id.includes('deepseek-coder-v2')) return 128000;
    if (id.includes('deepseek-coder')) return 64000;
    if (id.includes('deepseek')) return 64000;

    // Default
    return 4096;
  }

  /**
   * Estimate max output tokens
   * @private
   */
  estimateMaxOutput(modelId) {
    const id = modelId.toLowerCase();

    if (id.includes('gpt-4o') || id.includes('gpt-4-turbo')) return 4096;
    if (id.includes('o1') || id.includes('o3')) return 100000;
    if (id.includes('gemini-2')) return 8192;
    if (id.includes('gemini')) return 2048;

    return 4096;
  }

  /**
   * Get provider credentials
   * @private
   */
  async getProviderCredentials(provider, organizationId) {
    // First, try to get from organization's integration
    if (organizationId) {
      const integration = await Integration.findOne({
        organization: organizationId,
        type: provider.name.toLowerCase(),
        status: 'active'
      }).select('+credentials');

      if (integration?.credentials?.apiKey) {
        return {
          apiKey: integration.credentials.apiKey,
          baseUrl: integration.config?.endpoint || provider.apiEndpoint
        };
      }
    }

    // Fallback to environment variables
    const config = PROVIDER_CONFIGS[provider.name.toLowerCase()];
    if (config?.apiKeyEnvVar) {
      const apiKey = process.env[config.apiKeyEnvVar];
      if (apiKey) {
        return {
          apiKey,
          baseUrl: provider.apiEndpoint || config.baseUrl
        };
      }
    }

    // Check provider's stored API endpoint
    if (provider.apiEndpoint && provider.authConfig?.demoKey) {
      return {
        apiKey: provider.authConfig.demoKey,
        baseUrl: provider.apiEndpoint
      };
    }

    return null;
  }

  /**
   * Get models from database (fallback)
   * @private
   */
  async getModelsFromDatabase(providerId) {
    const models = await AIModel.find({
      provider: providerId,
      isActive: true
    }).sort({ name: 1 });

    return models.map(model => ({
      id: model._id,
      _id: model._id,
      name: model.name,
      displayName: model.displayName || model.name,
      provider: model.provider,
      providerName: null,
      type: model.type,
      capabilities: model.capabilities,
      pricing: model.pricing,
      isRecommended: false,
      isDynamic: false,
      isDatabaseModel: true
    }));
  }

  /**
   * Merge live API models with database models
   * Combines unique models from both sources
   * @param {Array} liveModels - Models from provider API
   * @param {Array} dbModels - Models from database
   * @returns {Array} Merged models
   */
  mergeModels(liveModels, dbModels) {
    const mergedMap = new Map();

    // Add live models first (they have latest info)
    liveModels.forEach(model => {
      const key = (model.name || model.id || '').toLowerCase();
      mergedMap.set(key, {
        ...model,
        source: 'api',
        isDynamic: true
      });
    });

    // Add database models that don't exist in live models
    dbModels.forEach(model => {
      const key = (model.name || '').toLowerCase();

      if (!mergedMap.has(key)) {
        // Database-only model
        mergedMap.set(key, {
          ...model,
          source: 'database',
          isDynamic: false,
          isDatabaseModel: true
        });
      } else {
        // Merge pricing from database into live model
        const existing = mergedMap.get(key);
        if (model.pricing && !existing.pricing) {
          existing.pricing = model.pricing;
        }
        if (model._id && !existing._id) {
          existing._id = model._id;
        }
      }
    });

    // Convert to array and sort by display name
    const result = Array.from(mergedMap.values());
    result.sort((a, b) => {
      const nameA = a.displayName || a.name || '';
      const nameB = b.displayName || b.name || '';
      return nameA.localeCompare(nameB);
    });

    return result;
  }

  /**
   * Merge dynamic models with database pricing
   * @param {Array} dynamicModels - Models from API
   * @param {Array} dbModels - Models from database with pricing
   * @returns {Array} Merged models
   */
  mergeWithDatabasePricing(dynamicModels, dbModels) {
    const dbModelMap = new Map(
      dbModels.map(m => [m.name.toLowerCase(), m])
    );

    return dynamicModels.map(dm => {
      const dbModel = dbModelMap.get(dm.name.toLowerCase()) ||
                      dbModelMap.get(dm.id.toLowerCase());

      if (dbModel && dbModel.pricing) {
        return {
          ...dm,
          databaseId: dbModel._id,
          pricing: dbModel.pricing
        };
      }

      return dm;
    });
  }

  /**
   * Get supported providers list
   * @returns {Array} Provider configurations
   */
  getSupportedProviders() {
    return Object.entries(PROVIDER_CONFIGS).map(([key, config]) => ({
      key,
      name: config.name,
      supportsModelDiscovery: config.supportsModelDiscovery,
      requiresApiKey: config.supportsModelDiscovery,
      apiKeyEnvVar: config.apiKeyEnvVar
    }));
  }

  /**
   * Clear cache for a provider
   * @param {string} providerId - Provider ID
   */
  async clearCache(providerId) {
    await cacheService.del(this.cacheKeys.providerModels(providerId));
    logger.info(`Cleared model cache for provider ${providerId}`);
  }
}

export default new DynamicModelsService();