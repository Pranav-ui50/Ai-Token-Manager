# SaaS Pricing Calculator - Complete Project Flow & Usage Guide

> **Project Name:** API Token Manager  
> **Type:** SaaS Pricing Calculator for AI API Token Cost Management  
> **Author:** UK Valley Projects

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [User Flow Diagram](#user-flow-diagram)
3. [Step-by-Step Usage Guide](#step-by-step-usage-guide)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Cost Calculation Formulas](#cost-calculation-formulas)
6. [Key Features Summary](#key-features-summary)
7. [Role-Based Access Control](#role-based-access-control)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [File Structure](#file-structure)

---

## Project Overview

### What is This Project?

This is a **SaaS Pricing Calculator for AI API Token Cost Management**. It helps businesses that use AI APIs (OpenAI, Anthropic, Google AI, etc.) to:

- **Calculate and predict AI token costs** for their applications
- **Manage subscriptions and billing** with credit-based systems
- **Run simulations and forecasts** to predict future costs and revenue
- **Track usage across features and projects**
- **Manage teams and organizations** with role-based access control
- **Export reports** to Excel/PDF formats

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express.js, MongoDB, Mongoose |
| **Frontend** | React.js, Tailwind CSS, React Router |
| **Auth** | JWT, 2FA (otplib) |
| **Payments** | Stripe, Razorpay |
| **Real-time** | Socket.io |
| **Cache** | Redis |
| **Queue** | Bull |
| **Exports** | ExcelJS, PDFKit |

---

## User Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              REGISTRATION                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Register │ → │ Verify   │ → │  Login   │ → │ 2FA Setup│               │
│  │ (Create) │    │ Email    │    │ (Auth)   │    │ (Optional)│              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ORGANIZATION SETUP                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Create Org   │ → │ Add Team     │ → │ Assign Roles │                  │
│  │ (Workspace)  │    │ Members      │    │ (RBAC)       │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CONFIGURATION                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Add Providers│ → │ Add AI Models │ → │ Create Plans │                  │
│  │ (OpenAI, etc)│    │ (GPT-4, etc) │    │ (Pricing)    │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                     │                          │
│         └───────────────────┴─────────────────────┘                          │
│                             │                                                │
│                             ▼                                                │
│                    ┌──────────────┐                                        │
│                    │ Create Projects│                                       │
│                    │ & Features     │                                       │
│                    └──────────────┘                                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           OPERATIONS                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Subscribe to │ → │ Track Usage  │ → │ Run Cost      │                  │
│  │ Plan         │    │ & Credits    │    │ Simulations   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                     │                          │
│         ▼                   ▼                     ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Manage       │    │ View Analytics│    │ Export       │                  │
│  │ Billing      │    │ & Reports    │    │ Excel/PDF    │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Usage Guide

### Step 1: Registration & Authentication

**Endpoint:** `POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Process:**
1. User visits `/register` and fills the registration form
2. Backend creates User account with default role
3. Email verification is sent (optional based on config)
4. User can enable 2FA for additional security
5. User logs in at `/login` → JWT token is issued

**2FA Setup:**
- Navigate to Settings → Security
- Scan QR code with authenticator app
- Enter verification code to enable

---

### Step 2: Organization Creation

**Endpoint:** `POST /api/organizations`

```json
{
  "name": "My Company",
  "description": "Technology company",
  "industry": "technology"
}
```

**Process:**
1. After login, create your first Organization
2. You automatically become the **Organization Owner**
3. Organization serves as a workspace for:
   - Team members
   - Projects
   - AI models & providers
   - Pricing plans

---

### Step 3: Adding Team Members

**Endpoint:** `POST /api/organizations/:id/members`

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "password": "TempPass123!",
  "roleId": "role_id_here"
}
```

**Process:**
1. Go to `/team` → Click "Add Member"
2. Fill in member details and select role
3. Backend creates User account and adds to Organization
4. New member receives email with login credentials
5. Member can login and access organization based on role permissions

---

### Step 4: Setting Up Providers & AI Models

#### Create Provider
**Endpoint:** `POST /api/providers`

```json
{
  "name": "OpenAI",
  "displayName": "OpenAI",
  "website": "https://openai.com",
  "apiEndpoint": "https://api.openai.com/v1",
  "authType": "api_key"
}
```

#### Create AI Model
**Endpoint:** `POST /api/models`

```json
{
  "provider": "provider_id",
  "name": "gpt-4",
  "displayName": "GPT-4",
  "type": "chat",
  "pricing": {
    "inputPrice": 30,
    "outputPrice": 60,
    "currency": "USD",
    "unit": "per_token",
    "pricePerUnit": 1000000
  },
  "capabilities": {
    "contextWindow": 128000,
    "maxOutputTokens": 4096,
    "supportsVision": true,
    "supportsFunctionCalling": true
  }
}
```

**Pricing Explanation:**
- `inputPrice`: $30 per 1 million input tokens
- `outputPrice`: $60 per 1 million output tokens
- `pricePerUnit`: 1,000,000 (per million tokens)

---

### Step 5: Creating Projects

**Endpoint:** `POST /api/projects`

```json
{
  "name": "Customer Support Bot",
  "description": "AI-powered customer support chatbot",
  "settings": {
    "currency": "USD",
    "timezone": "America/New_York",
    "infrastructureCostPerMonth": 500
  }
}
```

Projects group features together for cost tracking and reporting.

---

### Step 6: Defining Features

**Endpoint:** `POST /api/features`

```json
{
  "name": "Chat Assistant",
  "description": "Main chatbot feature",
  "category": "chat",
  "project": "project_id",
  "model": "model_id",
  "provider": "provider_id",
  "tokenEstimates": {
    "inputTokensPerRequest": 500,
    "outputTokensPerRequest": 200,
    "calculationMethod": "fixed"
  },
  "infrastructureCost": {
    "fixedCostPerRequest": 0.001,
    "overheadPercentage": 10,
    "monthlyFixedCost": 100,
    "infrastructureType": "serverless"
  }
}
```

**Cost Calculation per Request:**
```
baseTokenCost = (inputTokens * inputPrice) + (outputTokens * outputPrice)
overheadCost = baseTokenCost * (overheadPercentage / 100)
totalCost = baseTokenCost + overheadCost + fixedCostPerRequest
```

---

### Step 7: Creating Pricing Plans

**Endpoint:** `POST /api/plans`

```json
{
  "name": "Professional",
  "description": "For growing businesses",
  "tier": "professional",
  "billing": {
    "price": 99,
    "currency": "USD",
    "interval": "month",
    "trialDays": 14
  },
  "pricingModel": {
    "type": "usage-based",
    "usageBased": {
      "pricePerToken": 0.00003,
      "includedTokens": 1000000,
      "includedRequests": 10000,
      "overageMultiplier": 1.5
    }
  },
  "credits": {
    "includedCredits": 1000000,
    "creditType": "token",
    "rollover": {
      "enabled": true,
      "maxRolloverPercent": 25,
      "expirationMonths": 3
    },
    "autoRecharge": {
      "enabled": true,
      "threshold": 100000,
      "rechargeAmount": 500000
    }
  },
  "features": [
    {
      "feature": "feature_id",
      "enabled": true,
      "limits": {
        "maxRequests": null,
        "maxTokens": null
      }
    }
  ],
  "limits": {
    "maxUsers": 50,
    "maxApiCalls": 100000,
    "maxTokens": 10000000
  }
}
```

---

### Step 8: Subscriptions & Credit System

**Credit Types:**
| Type | Description |
|------|-------------|
| `balance` | Current available credits |
| `includedCredits` | Credits from plan subscription |
| `rolloverCredits` | Unused credits from previous period |
| `purchasedCredits` | Additional credits purchased |

**Credit Operations:**

```javascript
// Add credits (purchase/allocation)
subscription.addCredits(amount, 'purchase', 'Credit pack purchase');

// Use credits (API calls)
subscription.useCredits(tokensUsed, 'Chat request', 'request_id');

// Process rollover at billing period end
subscription.processRollover(maxRolloverPercent);

// Check if auto-recharge needed
subscription.checkAutoRecharge();
```

---

### Step 9: Running Simulations & Forecasts

**Endpoint:** `POST /api/simulations`

#### Growth Scenario (FR-35)
```json
{
  "name": "User Growth Projection",
  "type": "growth",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "growth": {
      "userGrowthRate": 10,
      "tokenUsageGrowthRate": 15,
      "newUsersPerMonth": 500,
      "churnRate": 2
    }
  }
}
```

#### Pricing Change Scenario (FR-36)
```json
{
  "name": "GPT-4 Price Increase Impact",
  "type": "pricing_change",
  "parameters": {
    "pricingChange": {
      "modelId": "model_id",
      "currentInputPrice": 30,
      "currentOutputPrice": 60,
      "newInputPrice": 35,
      "newOutputPrice": 70,
      "effectiveDate": "2024-06-01",
      "applyToAllModels": false
    }
  }
}
```

#### Expense Forecast (FR-37)
```json
{
  "name": "Infrastructure Cost Projection",
  "type": "expense_forecast",
  "parameters": {
    "operationalExpenses": {
      "infrastructureCost": 5000,
      "infrastructureGrowthRate": 5,
      "laborCosts": 10000,
      "otherCosts": 2000,
      "costOptimizationFactor": 10
    }
  }
}
```

#### Revenue Forecast (FR-38)
```json
{
  "name": "Q4 Revenue Projection",
  "type": "revenue_forecast",
  "parameters": {
    "revenueForecast": {
      "subscriptionRevenue": 50000,
      "usageBasedRevenue": 20000,
      "revenueGrowthRate": 15,
      "averageRevenuePerUser": 49,
      "tokenPriceMarkup": 20
    }
  }
}
```

---

### Step 10: Reports & Analytics

**Usage Analytics:**
```
GET /api/analytics?startDate=2024-01-01&endDate=2024-12-31
```

**Export Reports:**
```
GET /api/reports/export?format=excel
GET /api/reports/export?format=pdf
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORGANIZATION                                    │
│                                                                              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │   Owner    │   │  Members   │   │   Roles    │   │  Settings  │         │
│  │  (User)    │   │  (Team)    │   │  (RBAC)    │   │            │         │
│  └────────────┘   └────────────┘   └────────────┘   └────────────┘         │
│                                                                              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │  Projects  │ → │  Features  │ → │   Plans    │   │Subscriptions│         │
│  │  (Groups)  │   │ (AI Usage) │   │ (Pricing)  │   │  (Credits) │         │
│  └────────────┘   └────────────┘   └────────────┘   └────────────┘         │
│         │                │                 │               │                  │
│         │                │                 │               │                  │
│         └────────────────┴─────────────────┴───────────────┘                  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                           PROVIDERS                                    │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                 │   │
│  │  │   OpenAI    │   │  Anthropic  │   │  Google AI   │                 │   │
│  │  │  (GPT-4)    │   │  (Claude)   │   │  (Gemini)   │                 │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘                 │   │
│  │         │                  │                  │                        │   │
│  │         └──────────────────┴──────────────────┘                        │   │
│  │                            │                                           │   │
│  │                            ▼                                           │   │
│  │  ┌───────────────────────────────────────────────────────────────┐    │   │
│  │  │                        AI MODELS                                │    │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐   │    │   │
│  │  │  │  Input Price ($/million tokens)  │  Output Price       │   │    │   │
│  │  │  │  Context Window                  │  Max Output         │   │    │   │
│  │  │  │  Capabilities                    │  Token Pricing      │   │    │   │
│  │  │  └─────────────────────────────────────────────────────────┘   │    │   │
│  │  └───────────────────────────────────────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                         SIMULATIONS                                    │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                 │   │
│  │  │   Growth    │   │   Pricing   │   │   Revenue   │                 │   │
│  │  │   Forecast  │   │   Change    │   │   Forecast  │                 │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘                 │   │
│  │  ┌─────────────┐   ┌─────────────┐                                    │   │
│  │  │   Expense   │   │  Break-Even │                                    │   │
│  │  │   Forecast  │   │   Analysis  │                                    │   │
│  │  └─────────────┘   └─────────────┘                                    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                           BILLING                                      │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                 │   │
│  │  │  Stripe     │   │  Razorpay   │   │  Invoices   │                 │   │
│  │  │  (Cards)    │   │  (India)    │   │  (PDF/Excel)│                 │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘                 │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Calculation Formulas

### Token Cost Calculation

```javascript
// Per Request Cost
function calculateRequestCost(feature, model) {
  const inputTokens = feature.tokenEstimates.inputTokensPerRequest;
  const outputTokens = feature.tokenEstimates.outputTokensPerRequest;
  
  // Base token cost
  const inputCost = (inputTokens / model.pricing.pricePerUnit) * model.pricing.inputPrice;
  const outputCost = (outputTokens / model.pricing.pricePerUnit) * model.pricing.outputPrice;
  const baseTokenCost = inputCost + outputCost;
  
  // Infrastructure overhead
  const overheadCost = baseTokenCost * (feature.infrastructureCost.overheadPercentage / 100);
  
  // Fixed cost per request
  const fixedCost = feature.infrastructureCost.fixedCostPerRequest;
  
  return {
    inputCost,
    outputCost,
    baseTokenCost,
    overheadCost,
    fixedCost,
    totalCost: baseTokenCost + overheadCost + fixedCost
  };
}
```

### Monthly Cost Calculation

```javascript
function calculateMonthlyCost(feature, requestsPerMonth, usersPerMonth) {
  const costPerRequest = calculateRequestCost(feature, feature.model);
  
  const variableCost = costPerRequest.totalCost * requestsPerMonth;
  const monthlyFixedCost = feature.infrastructureCost.monthlyFixedCost;
  
  return {
    tokenCost: variableCost,
    infrastructureCost: monthlyFixedCost,
    totalMonthlyCost: variableCost + monthlyFixedCost,
    costPerUser: (variableCost + monthlyFixedCost) / usersPerMonth
  };
}
```

### Plan Profitability

```javascript
function calculateProfitability(plan) {
  const price = plan.billing.price;
  
  // Costs
  const tokenCostPerUser = plan.costs.estimatedTokenCostPerUser;
  const fixedCostsPerMonth = plan.costs.fixedCostsPerMonth;
  const activeUsers = plan.stats.activeSubscribers;
  
  // Per user cost
  const fixedCostPerUser = fixedCostsPerMonth / Math.max(activeUsers, 1);
  const variableCost = (price * plan.costs.variableCostPercentage) / 100; // Payment processing
  
  const totalCostPerUser = tokenCostPerUser + fixedCostPerUser + variableCost;
  
  // Profit
  const profitPerUser = price - totalCostPerUser;
  const grossMargin = (profitPerUser / price) * 100;
  const breakEvenUsers = profitPerUser > 0 ? Math.ceil(fixedCostsPerMonth / profitPerUser) : 0;
  
  return {
    totalCostPerUser,
    profitPerUser,
    grossMargin,
    breakEvenUsers
  };
}
```

### Credit System Calculations

```javascript
// Credit purchase with bulk discount
function calculateCreditPurchaseCost(plan, credits) {
  const creditPricing = plan.credits.creditPricing;
  let discountPercent = 0;
  
  // Apply bulk discount
  for (const discount of creditPricing.bulkDiscounts) {
    if (credits >= discount.minQuantity) {
      discountPercent = Math.max(discountPercent, discount.discountPercent);
    }
  }
  
  const baseCost = credits * creditPricing.pricePerCredit;
  return baseCost * (1 - discountPercent / 100);
}

// Usage-based billing
function calculateUsageCost(plan, tokens, requests) {
  const usage = plan.pricingModel.usageBased;
  
  const tokenOverage = Math.max(0, tokens - usage.includedTokens);
  const requestOverage = Math.max(0, requests - usage.includedRequests);
  
  return (tokenOverage * usage.pricePerToken * usage.overageMultiplier) +
         (requestOverage * usage.pricePerRequest * usage.overageMultiplier);
}

// Rollover credits
function calculateRolloverCredits(plan, unusedCredits) {
  if (!plan.credits.rollover.enabled) return 0;
  
  const maxRollover = plan.credits.includedCredits * 
                      (plan.credits.rollover.maxRolloverPercent / 100);
  
  return Math.min(unusedCredits, maxRollover);
}
```

---

## Key Features Summary

| Feature | Description | Location |
|---------|-------------|----------|
| **Authentication** | JWT-based auth with 2FA support | `/login`, `/register` |
| **Organizations** | Multi-tenant workspace management | `/organizations` |
| **Team Management** | Role-based access control | `/team` |
| **Projects** | Group features for cost tracking | `/projects` |
| **AI Providers** | Configure AI service providers | `/providers` |
| **AI Models** | Define models with pricing | `/models` |
| **Features** | Map app features to AI models | `/features` |
| **Plans** | Subscription tiers with credits | `/plans` |
| **Subscriptions** | User subscriptions & credits | `/billing` |
| **Simulations** | Cost & revenue forecasting | `/simulations` |
| **Analytics** | Usage & cost analytics | `/analytics` |
| **Reports** | Excel/PDF exports | `/reports` |
| **API Keys** | Programmatic access | `/api-keys` |
| **Webhooks** | Event notifications | `/webhooks` |
| **Audit Logs** | Action tracking | `/audit-logs` |

---

## Role-Based Access Control

| Role | Permissions |
|------|-------------|
| `org_owner` | Full access - billing, team, settings, everything |
| `finance_admin` | Manage billing, invoices, pricing, view analytics |
| `product_manager` | Manage features, plans, models, view analytics |
| `developer` | Manage API keys, webhooks, view usage & integrations |
| `viewer` | Read-only access to view dashboards & reports |

### Permission Matrix

| Action | org_owner | finance_admin | product_manager | developer | viewer |
|--------|-----------|---------------|-----------------|-----------|--------|
| Manage Team | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Billing | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Pricing | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Features | ✅ | ❌ | ✅ | ❌ | ❌ |
| Manage Models | ✅ | ❌ | ✅ | ❌ | ❌ |
| Manage API Keys | ✅ | ❌ | ❌ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## API Endpoints Reference

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
POST   /api/auth/logout            - Logout user
POST   /api/auth/refresh-token     - Refresh JWT token
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password
POST   /api/auth/verify-email      - Verify email
```

### Organizations
```
GET    /api/organizations          - List user's organizations
POST   /api/organizations          - Create organization
GET    /api/organizations/:id      - Get organization
PUT    /api/organizations/:id      - Update organization
DELETE /api/organizations/:id      - Delete organization
POST   /api/organizations/:id/members - Add member
DELETE /api/organizations/:id/members/:memberId - Remove member
PUT    /api/organizations/:id/members/:memberId/role - Update role
```

### Projects
```
GET    /api/projects               - List projects
POST   /api/projects               - Create project
GET    /api/projects/:id           - Get project
PUT    /api/projects/:id           - Update project
DELETE /api/projects/:id           - Delete project
```

### Features
```
GET    /api/features               - List features
POST   /api/features               - Create feature
GET    /api/features/:id           - Get feature
PUT    /api/features/:id           - Update feature
DELETE /api/features/:id           - Delete feature
```

### Plans
```
GET    /api/plans                  - List plans
POST   /api/plans                  - Create plan
GET    /api/plans/:id               - Get plan
PUT    /api/plans/:id               - Update plan
DELETE /api/plans/:id               - Delete plan
```

### Billing
```
GET    /api/billing/:orgId         - Get billing info
PUT    /api/billing/:orgId/subscription - Update subscription
POST   /api/billing/:orgId/cancel  - Cancel subscription
POST   /api/billing/:orgId/reactivate - Reactivate subscription
GET    /api/billing/:orgId/usage   - Get usage summary
GET    /api/billing/:orgId/invoices - Get invoices
```

### Simulations
```
GET    /api/simulations            - List simulations
POST   /api/simulations            - Create simulation
GET    /api/simulations/:id        - Get simulation
PUT    /api/simulations/:id        - Update simulation
DELETE /api/simulations/:id        - Delete simulation
POST   /api/simulations/:id/run    - Run simulation
```

---

## File Structure

### Backend
```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── index.js         # Main config
│   │   ├── database.js      # MongoDB connection
│   │   └── logger.js        # Winston logger
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.js
│   │   ├── organization.controller.js
│   │   ├── project.controller.js
│   │   ├── feature.controller.js
│   │   ├── plan.controller.js
│   │   ├── simulation.controller.js
│   │   └── ...
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── ...
│   ├── models/              # Mongoose models
│   │   ├── User.js
│   │   ├── Organization.js
│   │   ├── Project.js
│   │   ├── Feature.js
│   │   ├── Plan.js
│   │   ├── AIModel.js
│   │   ├── Provider.js
│   │   ├── Subscription.js
│   │   ├── Simulation.js
│   │   └── ...
│   ├── routes/              # API routes
│   │   ├── auth.routes.js
│   │   ├── organization.routes.js
│   │   ├── project.routes.js
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── auth.service.js
│   │   ├── organization.service.js
│   │   ├── billing.service.js
│   │   ├── simulation.service.js
│   │   └── ...
│   ├── utils/               # Helper functions
│   └── app.js               # Express app entry
├── tests/                   # Test files
└── package.json
```

### Frontend
```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── common/           # Common UI components
│   │   └── layout/           # Layout components
│   ├── context/             # React contexts
│   │   ├── AuthContext.jsx
│   │   └── OrganizationContext.jsx
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.js
│   │   └── usePermissions.js
│   ├── pages/               # Page components
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── organizations/
│   │   ├── projects/
│   │   ├── features/
│   │   ├── plans/
│   │   ├── simulations/
│   │   ├── billing/
│   │   ├── team/
│   │   └── ...
│   ├── routes/              # Route configuration
│   │   └── routes.jsx
│   ├── services/            # API services
│   │   └── api/
│   │       ├── auth.api.js
│   │       ├── organization.api.js
│   │       └── ...
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

---

## Example Usage Scenario

### Scenario: Launching an AI Chatbot Service

1. **Setup Organization**
   - Create organization "ChatbotCorp"
   - Invite team members with appropriate roles

2. **Configure AI Providers**
   - Add OpenAI as provider
   - Add GPT-4 and GPT-3.5-turbo models with pricing

3. **Create Project**
   - Create project "Customer Support Bot"
   - Set monthly infrastructure cost: $500

4. **Define Features**
   - Feature: "Chat Assistant"
   - Link to GPT-4 model
   - Token estimates: 500 input, 200 output per request
   - Overhead: 10%, Fixed: $0.001/request

5. **Create Pricing Plans**
   - **Starter**: $29/month, 100K tokens included
   - **Professional**: $99/month, 1M tokens included
   - **Enterprise**: Custom pricing

6. **Run Simulations**
   - Project growth: 10% monthly user growth
   - Calculate break-even point
   - Forecast infrastructure costs

7. **Monitor & Optimize**
   - Track token usage per feature
   - Analyze cost per user
   - Optimize model selection based on cost

---

## Support & Documentation

- **API Documentation**: `/api/docs` (Swagger UI)
- **Health Check**: `/api/health`
- **Logs**: Check `logs/` directory in production

---

*This document provides a comprehensive guide to using the SaaS Pricing Calculator for AI API Token Cost Management.*