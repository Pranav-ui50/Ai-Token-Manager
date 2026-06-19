/**
 * Database Seeder
 *
 * Seeds the database with initial data including:
 * - Default roles (SUPER_ADMIN, ORG_OWNER, FINANCE_ADMIN, PRODUCT_MANAGER, DEVELOPER, VIEWER)
 * - Demo users for each role
 */

import Role from '../models/Role.js';
import User from '../models/User.js';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../utils/constants.js';
import config from './index.js';
import logger from './logger.js';

/**
 * Seed default roles
 */
export const seedRoles = async () => {
  try {
    const rolesCount = await Role.countDocuments();

    if (rolesCount === 0) {
      logger.info('Seeding default roles...');
      await Role.seedDefaults();
      logger.info('Default roles seeded successfully');
    } else {
      logger.info(`Roles already exist (${rolesCount} roles found)`);

      // Update existing roles with latest permissions from constants
      logger.info('Updating existing roles with latest permissions...');
      const defaultRoles = [
        {
          name: ROLES.SUPER_ADMIN,
          permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN]
        },
        {
          name: ROLES.ORG_OWNER,
          permissions: ROLE_PERMISSIONS[ROLES.ORG_OWNER]
        },
        {
          name: ROLES.FINANCE_ADMIN,
          permissions: ROLE_PERMISSIONS[ROLES.FINANCE_ADMIN]
        },
        {
          name: ROLES.PRODUCT_MANAGER,
          permissions: ROLE_PERMISSIONS[ROLES.PRODUCT_MANAGER]
        },
        {
          name: ROLES.DEVELOPER,
          permissions: ROLE_PERMISSIONS[ROLES.DEVELOPER]
        },
        {
          name: ROLES.VIEWER,
          permissions: ROLE_PERMISSIONS[ROLES.VIEWER]
        }
      ];

      for (const roleData of defaultRoles) {
        const result = await Role.updateOne(
          { name: roleData.name },
          { $set: { permissions: roleData.permissions } }
        );
        if (result.modifiedCount > 0) {
          logger.info(`  - Updated permissions for ${roleData.name} role`);
        }
      }
      logger.info('Role permissions updated successfully');
    }
  } catch (error) {
    logger.error('Error seeding roles:', error);
    throw error;
  }
};

/**
 * Demo users configuration for each role
 */
const DEMO_USERS = [
  {
    email: 'superadmin@apitokenmanager.com',
    password: 'SuperAdmin@123',
    firstName: 'Super',
    lastName: 'Admin',
    role: ROLES.SUPER_ADMIN,
    description: 'Full system administrator with all permissions',
    createOrganization: false
  },
  {
    email: 'orgowner@apitokenmanager.com',
    password: 'OrgOwner@123',
    firstName: 'Organization',
    lastName: 'Owner',
    role: ROLES.ORG_OWNER,
    description: 'Organization owner with full org access',
    createOrganization: true,
    organizationName: 'Demo Organization'
  },
  {
    email: 'finance@apitokenmanager.com',
    password: 'Finance@123',
    firstName: 'Finance',
    lastName: 'Admin',
    role: ROLES.FINANCE_ADMIN,
    description: 'Finance admin for billing and pricing',
    createOrganization: false
  },
  {
    email: 'product@apitokenmanager.com',
    password: 'Product@123',
    firstName: 'Product',
    lastName: 'Manager',
    role: ROLES.PRODUCT_MANAGER,
    description: 'Product manager for features and plans',
    createOrganization: false
  },
  {
    email: 'developer@apitokenmanager.com',
    password: 'Developer@123',
    firstName: 'Dev',
    lastName: 'User',
    role: ROLES.DEVELOPER,
    description: 'Developer for API keys and integrations',
    createOrganization: false
  },
  {
    email: 'viewer@apitokenmanager.com',
    password: 'Viewer@123',
    firstName: 'View',
    lastName: 'User',
    role: ROLES.VIEWER,
    description: 'Read-only access for stakeholders',
    createOrganization: false
  }
];

/**
 * Seed demo users for all roles
 */
export const seedDemoUsers = async () => {
  try {
    logger.info('Seeding demo users for all roles...');

    const createdUsers = [];
    const existingUsers = [];
    let demoOrganization = null;

    // First, find or create the demo organization
    const Organization = (await import('../models/Organization.js')).default;
    const orgOwnerRole = await Role.findOne({ name: ROLES.ORG_OWNER });

    // Check if demo organization already exists
    demoOrganization = await Organization.findOne({ name: 'Demo Organization' });

    for (const demoUser of DEMO_USERS) {
      // Check if user already exists
      const existingUser = await User.findByEmail(demoUser.email);

      if (existingUser) {
        existingUsers.push({
          email: demoUser.email,
          role: demoUser.role,
          status: 'already exists'
        });
        continue;
      }

      // Get the role
      const role = await Role.findOne({ name: demoUser.role });

      if (!role) {
        logger.warn(`Role ${demoUser.role} not found, skipping user ${demoUser.email}`);
        continue;
      }

      // Create user
      const user = await User.create({
        email: demoUser.email,
        password: demoUser.password, // Will be hashed by model pre-save hook
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        role: role._id,
        isVerified: true,
        isActive: true
      });

      // Create organization if needed (for ORG_OWNER)
      if (demoUser.createOrganization) {
        const organization = await Organization.create({
          name: demoUser.organizationName || `${demoUser.firstName}'s Organization`,
          owner: user._id,
          members: [{
            user: user._id,
            role: role._id,
            joinedAt: new Date()
          }],
          isActive: true
        });

        // Update user with organization reference
        user.organization = organization._id;
        await user.save();

        demoOrganization = organization;

        logger.info(`  - Created organization: ${organization.name} for user ${demoUser.email}`);
      } else if (demoOrganization) {
        // Add user to the demo organization (for non-owner roles)
        user.organization = demoOrganization._id;
        await user.save();

        // Add user as member to the organization
        await Organization.findByIdAndUpdate(demoOrganization._id, {
          $push: {
            members: {
              user: user._id,
              role: role._id,
              joinedAt: new Date()
            }
          }
        });

        logger.info(`  - Added ${demoUser.email} to organization: ${demoOrganization.name}`);
      }

      createdUsers.push({
        email: demoUser.email,
        password: demoUser.password,
        role: demoUser.role,
        description: demoUser.description
      });
    }

    // Print summary
    if (createdUsers.length > 0 || existingUsers.length > 0) {
      logger.info('');
      logger.info('========================================');
      logger.info('        DEMO USERS CREDENTIALS        ');
      logger.info('========================================');
      logger.info('');

      if (createdUsers.length > 0) {
        logger.info('--- NEWLY CREATED USERS ---');
        createdUsers.forEach((user, index) => {
          logger.info('');
          logger.info(`[${index + 1}] ${user.description}`);
          logger.info(`    Role: ${user.role.toUpperCase()}`);
          logger.info(`    Email: ${user.email}`);
          logger.info(`    Password: ${user.password}`);
        });
      }

      if (existingUsers.length > 0) {
        logger.info('');
        logger.info('--- EXISTING USERS (NOT RECREATED) ---');
        existingUsers.forEach((user) => {
          logger.info(`    - ${user.email} (${user.role})`);
        });
      }

      logger.info('');
      logger.info('========================================');
      logger.info('');
    }

    return { createdUsers, existingUsers };
  } catch (error) {
    logger.error('Error seeding demo users:', error);
    throw error;
  }
};

/**
 * Seed default admin user (legacy function, kept for compatibility)
 */
export const seedAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findByEmail('admin@apitokenmanager.com');

    if (existingAdmin) {
      logger.info('Admin user already exists');
      return existingAdmin;
    }

    // Get super admin role
    const superAdminRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });

    if (!superAdminRole) {
      logger.warn('Super admin role not found, creating roles first...');
      await Role.seedDefaults();
      const newRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });
      if (!newRole) {
        logger.error('Failed to create super admin role');
        return null;
      }
    }

    const adminRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });

    // Create admin user
    const adminUser = await User.create({
      email: 'admin@apitokenmanager.com',
      password: 'Admin@123456', // Will be hashed by model pre-save hook
      firstName: 'Super',
      lastName: 'Admin',
      role: adminRole._id,
      isVerified: true,
      isActive: true
    });

    logger.info('========================================');
    logger.info('Default admin user created successfully!');
    logger.info('Email: admin@apitokenmanager.com');
    logger.info('Password: Admin@123456');
    logger.info('========================================');

    return adminUser;
  } catch (error) {
    logger.error('Error seeding admin user:', error);
    throw error;
  }
};

/**
 * Seed test user (for development)
 */
export const seedTestUser = async () => {
  if (config.nodeEnv === 'production') {
    logger.info('Skipping test user creation in production');
    return null;
  }

  try {
    // Check if test user already exists
    const existingUser = await User.findByEmail('test@test.com');

    if (existingUser) {
      logger.info('Test user already exists');
      return existingUser;
    }

    // Get viewer role
    const viewerRole = await Role.findOne({ name: ROLES.VIEWER });

    if (!viewerRole) {
      logger.warn('Viewer role not found');
      return null;
    }

    // Create test user
    const testUser = await User.create({
      email: 'test@test.com',
      password: 'Test@123456', // Will be hashed by model pre-save hook
      firstName: 'Test',
      lastName: 'User',
      role: viewerRole._id,
      isVerified: true,
      isActive: true
    });

    logger.info('========================================');
    logger.info('Test user created successfully!');
    logger.info('Email: test@test.com');
    logger.info('Password: Test@123456');
    logger.info('========================================');

    return testUser;
  } catch (error) {
    logger.error('Error seeding test user:', error);
    throw error;
  }
};

/**
 * Default AI Providers (Updated May 2026)
 */
const DEFAULT_PROVIDERS = [
  {
    name: 'OpenAI',
    displayName: 'OpenAI',
    description: 'Leading AI research lab providing GPT-5, GPT-4.1, GPT-4o, DALL-E, and Whisper APIs. Best for general-purpose applications with advanced reasoning.',
    website: 'https://openai.com',
    apiEndpoint: 'https://api.openai.com/v1',
    authType: 'api_key',
    settings: {
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsEmbeddings: true,
      supportsImages: true,
      supportsAudio: true,
      defaultMaxTokens: 4096,
      requestTimeout: 60000,
      rateLimitPerMinute: 500
    }
  },
  {
    name: 'Anthropic',
    displayName: 'Anthropic',
    description: 'AI safety company providing Claude 4, Claude 3.5 models. Known for helpfulness, harmlessness, and honesty. Excellent for complex reasoning tasks.',
    website: 'https://anthropic.com',
    apiEndpoint: 'https://api.anthropic.com/v1',
    authType: 'api_key',
    settings: {
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsEmbeddings: false,
      supportsImages: false,
      supportsAudio: false,
      defaultMaxTokens: 4096,
      requestTimeout: 60000,
      rateLimitPerMinute: 1000
    }
  },
  {
    name: 'Google AI',
    displayName: 'Google AI (Gemini)',
    description: 'Google\'s generative AI platform with Gemini 3.1, Gemini 2.5, and Gemini 1.5 models. Best context window support (up to 2M tokens).',
    website: 'https://ai.google.dev',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
    authType: 'api_key',
    settings: {
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsEmbeddings: true,
      supportsImages: true,
      supportsAudio: false,
      defaultMaxTokens: 8192,
      requestTimeout: 60000,
      rateLimitPerMinute: 1500
    }
  },
  {
    name: 'Meta AI',
    displayName: 'Meta AI (Llama)',
    description: 'Meta\'s open-source Llama 4 and Llama 3.3 models. Available via hosting providers (Together AI, Groq, Deepinfra). Best value for self-hosting.',
    website: 'https://llama.meta.com',
    apiEndpoint: 'https://api.together.xyz/v1',
    authType: 'api_key',
    settings: {
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      supportsEmbeddings: false,
      supportsImages: false,
      supportsAudio: false,
      defaultMaxTokens: 4096,
      requestTimeout: 60000,
      rateLimitPerMinute: 60
    }
  },
  {
    name: 'Mistral AI',
    displayName: 'Mistral AI',
    description: 'European AI company providing efficient models including Mistral Large 3, Medium 3, and Codestral. GDPR-compliant, EU data residency available.',
    website: 'https://mistral.ai',
    apiEndpoint: 'https://api.mistral.ai/v1',
    authType: 'api_key',
    settings: {
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      supportsEmbeddings: true,
      supportsImages: false,
      supportsAudio: false,
      defaultMaxTokens: 4096,
      requestTimeout: 60000,
      rateLimitPerMinute: 100
    }
  },
  {
    name: 'DeepSeek',
    displayName: 'DeepSeek',
    description: 'Chinese AI lab offering extremely competitive pricing. DeepSeek V3 and R1 reasoning models at fraction of competitor costs.',
    website: 'https://deepseek.com',
    apiEndpoint: 'https://api.deepseek.com/v1',
    authType: 'api_key',
    settings: {
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      supportsEmbeddings: false,
      supportsImages: false,
      supportsAudio: false,
      defaultMaxTokens: 4096,
      requestTimeout: 60000,
      rateLimitPerMinute: 60
    }
  },
  {
    name: 'Ollama',
    displayName: 'Ollama (Local)',
    description: 'Run open-source models locally on your machine. Free, private, and offline-capable. Supports Llama 3.3, Mistral, Gemma, and more.',
    website: 'https://ollama.ai',
    apiEndpoint: 'http://localhost:11434/api',
    authType: 'api_key',
    settings: {
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: false,
      supportsEmbeddings: true,
      supportsImages: false,
      supportsAudio: false,
      defaultMaxTokens: 4096,
      requestTimeout: 300000,
      rateLimitPerMinute: 1000
    }
  }
];

/**
 * Seed default AI providers
 */
export const seedProviders = async () => {
  try {
    const Provider = (await import('../models/Provider.js')).default;
    const providersCount = await Provider.countDocuments();

    if (providersCount > 0) {
      logger.info(`Providers already exist (${providersCount} providers found)`);
      return await Provider.find({}).sort({ name: 1 });
    }

    logger.info('Seeding default AI providers...');

    const createdProviders = [];
    for (const providerData of DEFAULT_PROVIDERS) {
      const provider = await Provider.create(providerData);
      createdProviders.push(provider);
      logger.info(`  - Created provider: ${provider.displayName}`);
    }

    logger.info(`Successfully seeded ${createdProviders.length} providers`);
    return createdProviders;
  } catch (error) {
    logger.error('Error seeding providers:', error);
    throw error;
  }
};

/**
 * Default AI Models (Updated May 2026 - Real Market Prices)
 * Prices are in USD per million tokens
 */
const DEFAULT_MODELS = [
  // ===========================================
  // OpenAI Models (GPT-5, GPT-4.1, GPT-4o families)
  // ===========================================
  {
    providerName: 'OpenAI',
    models: [
      // GPT-5 Family (Latest Flagship)
      { name: 'gpt-5.5', displayName: 'GPT-5.5', type: 'chat', inputPrice: 5.00, outputPrice: 30.00, contextWindow: 1000000 },
      { name: 'gpt-5.4', displayName: 'GPT-5.4', type: 'chat', inputPrice: 2.50, outputPrice: 15.00, contextWindow: 1000000 },
      { name: 'gpt-5', displayName: 'GPT-5', type: 'chat', inputPrice: 1.25, outputPrice: 10.00, contextWindow: 1000000 },
      { name: 'gpt-5-mini', displayName: 'GPT-5 Mini', type: 'chat', inputPrice: 0.25, outputPrice: 2.00, contextWindow: 1000000 },
      { name: 'gpt-5-nano', displayName: 'GPT-5 Nano', type: 'chat', inputPrice: 0.05, outputPrice: 0.40, contextWindow: 1000000 },
      // GPT-4.1 Family (Production Recommended)
      { name: 'gpt-4.1', displayName: 'GPT-4.1', type: 'chat', inputPrice: 2.00, outputPrice: 8.00, contextWindow: 1000000 },
      { name: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini', type: 'chat', inputPrice: 0.40, outputPrice: 1.60, contextWindow: 1000000 },
      { name: 'gpt-4.1-nano', displayName: 'GPT-4.1 Nano', type: 'chat', inputPrice: 0.10, outputPrice: 0.40, contextWindow: 1000000 },
      // GPT-4o Family (Legacy)
      { name: 'gpt-4o', displayName: 'GPT-4o', type: 'chat', inputPrice: 2.50, outputPrice: 10.00, contextWindow: 128000 },
      { name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', type: 'chat', inputPrice: 0.15, outputPrice: 0.60, contextWindow: 128000 },
      // GPT-4 Legacy
      { name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', type: 'chat', inputPrice: 10.00, outputPrice: 30.00, contextWindow: 128000 },
      { name: 'gpt-4', displayName: 'GPT-4', type: 'chat', inputPrice: 30.00, outputPrice: 60.00, contextWindow: 8192 },
      // GPT-3.5 Legacy
      { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', type: 'chat', inputPrice: 0.50, outputPrice: 1.50, contextWindow: 16385 },
      // Embeddings
      { name: 'text-embedding-3-large', displayName: 'Text Embedding 3 Large', type: 'embedding', inputPrice: 0.13, outputPrice: 0, contextWindow: 8191 },
      { name: 'text-embedding-3-small', displayName: 'Text Embedding 3 Small', type: 'embedding', inputPrice: 0.02, outputPrice: 0, contextWindow: 8191 },
      // Image Generation
      { name: 'dall-e-3', displayName: 'DALL-E 3', type: 'image', inputPrice: 40.00, outputPrice: 0, contextWindow: 4096 },
      // Audio
      { name: 'whisper-1', displayName: 'Whisper', type: 'audio', inputPrice: 0.36, outputPrice: 0, contextWindow: 26214400 },
      { name: 'tts-1', displayName: 'TTS-1', type: 'audio', inputPrice: 15.00, outputPrice: 0, contextWindow: 4096 },
      { name: 'tts-1-hd', displayName: 'TTS-1 HD', type: 'audio', inputPrice: 30.00, outputPrice: 0, contextWindow: 4096 }
    ]
  },
  // ===========================================
  // Anthropic Models (Claude 4, Claude 3.5)
  // ===========================================
  {
    providerName: 'Anthropic',
    models: [
      // Claude 4 Family (Latest)
      { name: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', type: 'chat', inputPrice: 5.00, outputPrice: 25.00, contextWindow: 1000000 },
      { name: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', type: 'chat', inputPrice: 5.00, outputPrice: 25.00, contextWindow: 1000000 },
      { name: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', type: 'chat', inputPrice: 3.00, outputPrice: 15.00, contextWindow: 1000000 },
      { name: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', type: 'chat', inputPrice: 1.00, outputPrice: 5.00, contextWindow: 200000 },
      // Claude 3.5 Family
      { name: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet', type: 'chat', inputPrice: 3.00, outputPrice: 15.00, contextWindow: 200000 },
      { name: 'claude-3-5-haiku', displayName: 'Claude 3.5 Haiku', type: 'chat', inputPrice: 0.80, outputPrice: 4.00, contextWindow: 200000 },
      // Claude 3 Family (Legacy)
      { name: 'claude-3-opus', displayName: 'Claude 3 Opus', type: 'chat', inputPrice: 15.00, outputPrice: 75.00, contextWindow: 200000 },
      { name: 'claude-3-sonnet', displayName: 'Claude 3 Sonnet', type: 'chat', inputPrice: 3.00, outputPrice: 15.00, contextWindow: 200000 },
      { name: 'claude-3-haiku', displayName: 'Claude 3 Haiku', type: 'chat', inputPrice: 0.25, outputPrice: 1.25, contextWindow: 200000 }
    ]
  },
  // ===========================================
  // Google AI Models (Gemini 3, Gemini 2.5, Gemini 1.5)
  // ===========================================
  {
    providerName: 'Google AI',
    models: [
      // Gemini 3.1 Family (Preview)
      { name: 'gemini-3.1-pro', displayName: 'Gemini 3.1 Pro', type: 'chat', inputPrice: 2.00, outputPrice: 12.00, contextWindow: 2000000 },
      { name: 'gemini-3.1-flash-lite', displayName: 'Gemini 3.1 Flash-Lite', type: 'chat', inputPrice: 0.25, outputPrice: 1.50, contextWindow: 1000000 },
      // Gemini 2.5 Family
      { name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', type: 'chat', inputPrice: 1.25, outputPrice: 10.00, contextWindow: 2000000 },
      { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', type: 'chat', inputPrice: 0.30, outputPrice: 2.50, contextWindow: 1000000 },
      { name: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash-Lite', type: 'chat', inputPrice: 0.10, outputPrice: 0.40, contextWindow: 1000000 },
      // Gemini 1.5 Family (Legacy)
      { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', type: 'chat', inputPrice: 1.25, outputPrice: 5.00, contextWindow: 2097152 },
      { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', type: 'chat', inputPrice: 0.075, outputPrice: 0.30, contextWindow: 1048576 },
      { name: 'gemini-1.0-pro', displayName: 'Gemini 1.0 Pro', type: 'chat', inputPrice: 0.50, outputPrice: 1.50, contextWindow: 32760 },
      // Embeddings
      { name: 'text-embedding-004', displayName: 'Text Embedding 004', type: 'embedding', inputPrice: 0.13, outputPrice: 0, contextWindow: 2048 },
      // Image Generation
      { name: 'imagen-3', displayName: 'Imagen 3', type: 'image', inputPrice: 20.00, outputPrice: 0, contextWindow: 4096 }
    ]
  },
  // ===========================================
  // Meta AI Models (Llama 4, Llama 3.3)
  // Note: Meta models via hosting providers (Together AI, Groq, Deepinfra)
  // ===========================================
  {
    providerName: 'Meta AI',
    models: [
      // Llama 4 Family (Latest)
      { name: 'llama-4-maverick', displayName: 'Llama 4 Maverick', type: 'chat', inputPrice: 0.15, outputPrice: 0.60, contextWindow: 1000000, description: 'Via Together AI' },
      { name: 'llama-4-scout', displayName: 'Llama 4 Scout', type: 'chat', inputPrice: 0.08, outputPrice: 0.30, contextWindow: 10000000, description: 'Via Together AI - 10M context' },
      // Llama 3.3 Family
      { name: 'llama-3.3-70b', displayName: 'Llama 3.3 70B', type: 'chat', inputPrice: 0.23, outputPrice: 0.40, contextWindow: 131000, description: 'Via Deepinfra' },
      { name: 'llama-3.3-70b-groq', displayName: 'Llama 3.3 70B (Groq)', type: 'chat', inputPrice: 0.59, outputPrice: 0.79, contextWindow: 131000, description: 'Fast inference via Groq' },
      // Llama 3.1 Family
      { name: 'llama-3.1-405b', displayName: 'Llama 3.1 405B', type: 'chat', inputPrice: 2.50, outputPrice: 3.00, contextWindow: 128000, description: 'Via Together AI' },
      { name: 'llama-3.1-70b', displayName: 'Llama 3.1 70B', type: 'chat', inputPrice: 0.35, outputPrice: 0.40, contextWindow: 128000, description: 'Via Deepinfra' },
      { name: 'llama-3.1-8b', displayName: 'Llama 3.1 8B', type: 'chat', inputPrice: 0.05, outputPrice: 0.05, contextWindow: 128000, description: 'Via Deepinfra' }
    ]
  },
  // ===========================================
  // Mistral AI Models (Large 3, Medium 3, Small 4)
  // ===========================================
  {
    providerName: 'Mistral AI',
    models: [
      // Mistral Large Family (Flagship)
      { name: 'mistral-large-3', displayName: 'Mistral Large 3', type: 'chat', inputPrice: 0.50, outputPrice: 1.50, contextWindow: 262000 },
      { name: 'mistral-large-2', displayName: 'Mistral Large 2', type: 'chat', inputPrice: 2.00, outputPrice: 6.00, contextWindow: 262000 },
      // Mistral Medium Family
      { name: 'mistral-medium-3', displayName: 'Mistral Medium 3', type: 'chat', inputPrice: 0.40, outputPrice: 2.00, contextWindow: 131000 },
      { name: 'mistral-medium-3.5', displayName: 'Mistral Medium 3.5', type: 'chat', inputPrice: 1.50, outputPrice: 7.50, contextWindow: 131000 },
      // Mistral Small Family (Budget)
      { name: 'mistral-small-4', displayName: 'Mistral Small 4', type: 'chat', inputPrice: 0.15, outputPrice: 0.60, contextWindow: 262000 },
      { name: 'mistral-small-3.2', displayName: 'Mistral Small 3.2', type: 'chat', inputPrice: 0.08, outputPrice: 0.25, contextWindow: 131000 },
      // Code Specialist
      { name: 'codestral', displayName: 'Codestral', type: 'chat', inputPrice: 0.20, outputPrice: 0.60, contextWindow: 256000, description: 'Code specialist - 80+ languages' },
      { name: 'codestral-latest', displayName: 'Codestral Latest', type: 'chat', inputPrice: 0.30, outputPrice: 0.90, contextWindow: 256000, description: 'Latest code model' },
      // Edge/On-Device
      { name: 'ministral-3b', displayName: 'Ministral 3B', type: 'chat', inputPrice: 0.04, outputPrice: 0.04, contextWindow: 128000, description: 'Edge/on-device' },
      { name: 'ministral-8b', displayName: 'Ministral 8B', type: 'chat', inputPrice: 0.10, outputPrice: 0.10, contextWindow: 128000, description: 'Edge/on-device' },
      // Vision
      { name: 'pixtral-large', displayName: 'Pixtral Large', type: 'chat', inputPrice: 2.00, outputPrice: 6.00, contextWindow: 128000, description: 'Multimodal/vision model' },
      // Embeddings
      { name: 'mistral-embed', displayName: 'Mistral Embed', type: 'embedding', inputPrice: 0.10, outputPrice: 0, contextWindow: 8192 }
    ]
  },
  // ===========================================
  // DeepSeek (Budget/High-Performance)
  // ===========================================
  {
    providerName: 'DeepSeek',
    models: [
      // Flagship Models
      { name: 'deepseek-v3', displayName: 'DeepSeek V3', type: 'chat', inputPrice: 0.27, outputPrice: 1.10, contextWindow: 64000, description: 'Latest flagship model' },
      { name: 'deepseek-r1', displayName: 'DeepSeek R1', type: 'chat', inputPrice: 0.55, outputPrice: 2.19, contextWindow: 64000, description: 'Reasoning model with extended thinking' },

      // Code Models
      { name: 'deepseek-coder', displayName: 'DeepSeek Coder', type: 'chat', inputPrice: 0.14, outputPrice: 0.28, contextWindow: 64000, description: 'Code specialist' },
      { name: 'deepseek-coder-v2', displayName: 'DeepSeek Coder V2', type: 'chat', inputPrice: 0.14, outputPrice: 0.28, contextWindow: 128000, description: 'Improved code model' },

      // R1 Distill Models (Qwen-based)
      { name: 'deepseek-r1-distill-qwen-1.5b', displayName: 'DeepSeek R1 Distill Qwen 1.5B', type: 'chat', inputPrice: 0.00, outputPrice: 0.00, contextWindow: 32000, description: 'Smallest R1 distill - Qwen based' },
      { name: 'deepseek-r1-distill-qwen-7b', displayName: 'DeepSeek R1 Distill Qwen 7B', type: 'chat', inputPrice: 0.00, outputPrice: 0.00, contextWindow: 32000, description: 'R1 distill - Qwen 7B' },
      { name: 'deepseek-r1-distill-qwen-14b', displayName: 'DeepSeek R1 Distill Qwen 14B', type: 'chat', inputPrice: 0.00, outputPrice: 0.00, contextWindow: 32000, description: 'R1 distill - Qwen 14B' },
      { name: 'deepseek-r1-distill-qwen-32b', displayName: 'DeepSeek R1 Distill Qwen 32B', type: 'chat', inputPrice: 0.00, outputPrice: 0.00, contextWindow: 32000, description: 'R1 distill - Qwen 32B' },

      // R1 Distill Models (Llama-based)
      { name: 'deepseek-r1-distill-llama-8b', displayName: 'DeepSeek R1 Distill Llama 8B', type: 'chat', inputPrice: 0.00, outputPrice: 0.00, contextWindow: 32000, description: 'R1 distill - Llama 8B' },
      { name: 'deepseek-r1-distill-llama-70b', displayName: 'DeepSeek R1 Distill Llama 70B', type: 'chat', inputPrice: 0.00, outputPrice: 0.00, contextWindow: 32000, description: 'Largest R1 distill - Llama 70B' },

      // Chat Models
      { name: 'deepseek-chat', displayName: 'DeepSeek Chat', type: 'chat', inputPrice: 0.27, outputPrice: 1.10, contextWindow: 64000, description: 'General purpose chat' }
    ]
  },
  // ===========================================
  // Ollama (Local Models - Free)
  // ===========================================
  {
    providerName: 'Ollama',
    models: [
      // Llama Family
      { name: 'llama3.3:70b', displayName: 'Llama 3.3 70B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Latest Llama - Local' },
      { name: 'llama3.3:8b', displayName: 'Llama 3.3 8B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Efficient local model' },
      { name: 'llama3.2:3b', displayName: 'Llama 3.2 3B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Lightweight local' },
      { name: 'llama3.2:1b', displayName: 'Llama 3.2 1B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Ultra lightweight' },
      { name: 'llama3.1:8b', displayName: 'Llama 3.1 8B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Stable Llama 3.1' },
      // Mistral Family
      { name: 'mistral:7b', displayName: 'Mistral 7B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 32768, description: 'Fast & efficient' },
      { name: 'mistral-small3.1', displayName: 'Mistral Small 3.1', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 131000, description: 'Latest Mistral' },
      // Gemma Family
      { name: 'gemma3:12b', displayName: 'Gemma 3 12B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Google open model' },
      { name: 'gemma3:4b', displayName: 'Gemma 3 4B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Compact Gemma' },
      { name: 'gemma2:9b', displayName: 'Gemma 2 9B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 8192, description: 'Stable Gemma' },
      // Qwen Family
      { name: 'qwen2.5:14b', displayName: 'Qwen 2.5 14B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 32768, description: 'Alibaba Qwen' },
      { name: 'qwen2.5:7b', displayName: 'Qwen 2.5 7B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 32768, description: 'Efficient Qwen' },
      // Code Models
      { name: 'codellama:34b', displayName: 'Code Llama 34B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 16384, description: 'Code specialist' },
      { name: 'deepseek-coder-v2', displayName: 'DeepSeek Coder V2', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 128000, description: 'Code expert' },
      { name: 'starcoder2:15b', displayName: 'StarCoder 15B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 16384, description: 'Code generation' },
      // Vision Models
      { name: 'llava:13b', displayName: 'LLaVA 13B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 4096, description: 'Vision model' },
      { name: 'bakllava:7b', displayName: 'BakLLaVA 7B', type: 'chat', inputPrice: 0, outputPrice: 0, contextWindow: 4096, description: 'Vision model' },
      // Embeddings
      { name: 'nomic-embed-text', displayName: 'Nomic Embed Text', type: 'embedding', inputPrice: 0, outputPrice: 0, contextWindow: 8192, description: 'Embedding model' },
      { name: 'mxbai-embed-large', displayName: 'Mxbai Embed Large', type: 'embedding', inputPrice: 0, outputPrice: 0, contextWindow: 512, description: 'Large embedding' }
    ]
  }
];

/**
 * Seed default AI models
 */
export const seedModels = async () => {
  try {
    const AIModel = (await import('../models/AIModel.js')).default;
    const Provider = (await import('../models/Provider.js')).default;

    const modelsCount = await AIModel.countDocuments();

    if (modelsCount > 0) {
      logger.info(`Models already exist (${modelsCount} models found)`);
      return await AIModel.find({}).sort({ name: 1 }).populate('provider', 'name displayName');
    }

    logger.info('Seeding default AI models...');

    let totalCreated = 0;
    for (const providerData of DEFAULT_MODELS) {
      const provider = await Provider.findOne({ name: providerData.providerName });

      if (!provider) {
        logger.warn(`Provider ${providerData.providerName} not found, skipping models`);
        continue;
      }

      for (const modelData of providerData.models) {
        await AIModel.create({
          provider: provider._id,
          name: modelData.name,
          displayName: modelData.displayName,
          description: modelData.description || '',
          type: modelData.type,
          capabilities: {
            contextWindow: modelData.contextWindow,
            supportsStreaming: true,
            supportsVision: modelData.type === 'chat' && ['chat'].includes(modelData.type),
            supportsFunctionCalling: modelData.type === 'chat',
            maxOutputTokens: Math.min(modelData.contextWindow, 8192)
          },
          pricing: {
            inputPrice: modelData.inputPrice,
            outputPrice: modelData.outputPrice,
            currency: 'USD',
            unit: 'per_token',
            pricePerUnit: 1000000
          },
          isActive: true
        });
        totalCreated++;
      }
      logger.info(`  - Created ${providerData.models.length} models for ${providerData.providerName}`);
    }

    logger.info(`Successfully seeded ${totalCreated} AI models`);
    return await AIModel.find({}).sort({ name: 1 }).populate('provider', 'name displayName');
  } catch (error) {
    logger.error('Error seeding models:', error);
    throw error;
  }
};

/**
 * Default Subscription Plans
 */
const DEFAULT_PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    tier: 'starter',
    description: 'Great for small teams exploring AI APIs',
    billing: { price: 29, yearlyPrice: 278.4, currency: 'USD', interval: 'month', trialDays: 14 }, // 20% discount yearly
    pricingModel: { type: 'usage-based', usageBased: { includedTokens: 500000, includedRequests: 5000 } },
    credits: { includedCredits: 500000, creditType: 'token' },
    limits: { maxProjects: 3, maxFeatures: 10, maxSimulations: 100, maxUsers: 3, maxApiCalls: 10000, maxTokens: 500000 },
    isPopular: false,
    displayOrder: 1
  },
  {
    name: 'Professional',
    slug: 'professional',
    tier: 'professional',
    description: 'Ideal for growing teams with advanced AI needs',
    billing: { price: 99, yearlyPrice: 950.4, currency: 'USD', interval: 'month', trialDays: 14 }, // 20% discount yearly
    pricingModel: { type: 'usage-based', usageBased: { includedTokens: 2000000, includedRequests: 20000 } },
    credits: { includedCredits: 2000000, creditType: 'token' },
    limits: { maxProjects: 10, maxFeatures: 50, maxSimulations: 500, maxUsers: 10, maxApiCalls: 50000, maxTokens: 2000000 },
    isPopular: true,
    displayOrder: 2
  },
  {
    name: 'Business',
    slug: 'business',
    tier: 'business',
    description: 'For organizations with heavy AI API usage',
    billing: { price: 299, yearlyPrice: 2870.4, currency: 'USD', interval: 'month', trialDays: 14 }, // 20% discount yearly
    pricingModel: { type: 'usage-based', usageBased: { includedTokens: 10000000, includedRequests: 100000 } },
    credits: { includedCredits: 10000000, creditType: 'token' },
    limits: { maxProjects: 50, maxFeatures: 200, maxSimulations: 2000, maxUsers: 50, maxApiCalls: 200000, maxTokens: 10000000 },
    isPopular: false,
    displayOrder: 3
  }
];

/**
 * Seed default subscription plans
 */
export const seedPlans = async () => {
  try {
    const Plan = (await import('../models/Plan.js')).default;
    const Organization = (await import('../models/Organization.js')).default;

    const plansCount = await Plan.countDocuments();

    if (plansCount > 0) {
      logger.info(`Plans already exist (${plansCount} plans found)`);
      return await Plan.find({}).sort({ displayOrder: 1 });
    }

    // Get the demo organization (or create one if it doesn't exist)
    let organization = await Organization.findOne({ name: 'Demo Organization' });

    if (!organization) {
      // Create a default organization for public plans
      const superAdmin = await User.findOne({ email: 'superadmin@apitokenmanager.com' });

      if (superAdmin) {
        organization = await Organization.create({
          name: 'Demo Organization',
          owner: superAdmin._id,
          members: [{
            user: superAdmin._id,
            role: superAdmin.role,
            joinedAt: new Date()
          }],
          isActive: true
        });
        logger.info('  - Created default organization for plans');
      } else {
        logger.warn('No organization found for seeding plans. Skipping plan seeding.');
        return [];
      }
    }

    logger.info('Seeding default subscription plans...');

    const createdPlans = [];
    for (const planData of DEFAULT_PLANS) {
      const plan = await Plan.create({
        organization: organization._id,
        ...planData,
        status: 'active',
        settings: {
          isPublic: true,
          isDefault: false,
          allowUpgrade: true,
          allowDowngrade: true
        }
      });
      createdPlans.push(plan);
      logger.info(`  - Created plan: ${plan.name} ($${plan.billing.price}/month)`);
    }

    logger.info(`Successfully seeded ${createdPlans.length} plans`);
    return createdPlans;
  } catch (error) {
    logger.error('Error seeding plans:', error);
    throw error;
  }
};

/**
 * Seed all initial data
 */
export const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');

    // Seed roles first
    await seedRoles();

    // Seed demo users for all roles
    await seedDemoUsers();

    // Seed AI providers
    await seedProviders();

    // Seed AI models
    await seedModels();

    // Seed subscription plans
    await seedPlans();

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

export default {
  seedRoles,
  seedDemoUsers,
  seedAdminUser,
  seedTestUser,
  seedProviders,
  seedModels,
  seedPlans,
  seedDatabase
};