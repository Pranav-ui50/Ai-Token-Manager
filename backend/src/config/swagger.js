/**
 * Swagger Configuration
 *
 * OpenAPI/Swagger documentation setup for the API.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import config from './index.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Token Manager API',
      version: '1.0.0',
      description: 'SaaS Pricing Calculator for AI API Token Cost Management API Documentation',
      contact: {
        name: 'UK Valley Projects',
        email: 'support@ukvalley.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development server'
      },
      {
        url: 'https://api.example.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { $ref: '#/components/schemas/Role' },
            organization: { $ref: '#/components/schemas/Organization' },
            isVerified: { type: 'boolean' },
            twoFactorEnabled: { type: 'boolean' },
            avatar: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Role: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', enum: ['super_admin', 'org_owner', 'finance_admin', 'product_manager', 'developer', 'viewer'] },
            displayName: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } }
          }
        },
        Organization: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            logo: { type: 'string', nullable: true },
            owner: { type: 'string' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { type: 'string' },
                  role: { type: 'string' },
                  joinedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            subscription: {
              type: 'object',
              properties: {
                plan: { type: 'string' },
                status: { type: 'string' }
              }
            },
            isActive: { type: 'boolean' }
          }
        },
        Provider: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            website: { type: 'string' },
            isActive: { type: 'boolean' }
          }
        },
        AIModel: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            provider: { type: 'string' },
            name: { type: 'string' },
            displayName: { type: 'string' },
            type: { type: 'string' },
            contextWindow: { type: 'integer' },
            pricing: {
              type: 'object',
              properties: {
                inputPrice: { type: 'number' },
                outputPrice: { type: 'number' },
                currency: { type: 'string' },
                unit: { type: 'string' }
              }
            },
            isActive: { type: 'boolean' }
          }
        },
        Feature: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            organization: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            model: { type: 'string' },
            provider: { type: 'string' },
            tokenEstimates: {
              type: 'object',
              properties: {
                inputTokensPerRequest: { type: 'integer' },
                outputTokensPerRequest: { type: 'integer' },
                calculationMethod: { type: 'string' }
              }
            },
            infrastructureCost: {
              type: 'object',
              properties: {
                fixedCostPerRequest: { type: 'number' },
                overheadPercentage: { type: 'number' },
                monthlyFixedCost: { type: 'number' }
              }
            },
            status: { type: 'string' }
          }
        },
        Plan: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            organization: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            tier: { type: 'string' },
            billing: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                currency: { type: 'string' },
                interval: { type: 'string' }
              }
            },
            pricingModel: {
              type: 'object',
              properties: {
                type: { type: 'string' }
              }
            },
            features: { type: 'array' },
            isActive: { type: 'boolean' }
          }
        },
        Simulation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            organization: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            parameters: { type: 'object' },
            results: { type: 'object' },
            status: { type: 'string' },
            createdBy: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/docs/*.yaml'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;