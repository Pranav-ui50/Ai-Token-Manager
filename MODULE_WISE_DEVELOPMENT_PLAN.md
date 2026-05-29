# Module-Wise Development Plan
## SaaS Pricing Calculator for AI API Token Cost Management

---

# Development Overview

## Prerequisites (Complete First)

Before starting module development, ensure:

1. ✅ Project structure created
2. ✅ Dependencies installed
3. ✅ Database connection configured
4. ✅ Environment variables set

## Development Order

```
Phase 1: Foundation
├── Module 1: Authentication
└── Module 2: Organization

Phase 2: Core Features
├── Module 3: AI Provider Management
├── Module 4: Feature Consumption Mapping
└── Module 5: Pricing Engine

Phase 3: Business Logic
├── Module 6: Subscription Plans
└── Module 7: Simulation & Forecasting

Phase 4: Analytics & Reporting
├── Module 8: Analytics Dashboard
└── Module 9: Reports

Phase 5: Support Features
├── Module 10: API Integration
├── Module 11: Notifications
└── Module 12: Audit & Logs
```

---

# Module 1: Authentication Module

## 📋 Overview
Handle user identity, registration, login, and secure access control.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| User Registration | High | Email + password signup |
| Email Verification | High | Verify email before activation |
| Login/Logout | High | JWT-based authentication |
| Password Reset | Medium | Self-service password recovery |
| Two-Factor Auth | Medium | TOTP-based 2FA |
| Session Management | Medium | Track active sessions |
| Role Assignment | High | Assign user roles |

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,           // unique, required
  password_hash: String,  // required, bcrypt hashed
  first_name: String,     // required
  last_name: String,      // required
  role_id: ObjectId,      // reference to Role
  organization_id: ObjectId, // reference to Organization
  is_verified: Boolean,   // default: false
  is_active: Boolean,     // default: true
  two_factor_enabled: Boolean, // default: false
  two_factor_secret: String,   // encrypted TOTP secret
  last_login: Date,
  created_at: Date,
  updated_at: Date
}
```

### Roles Collection
```javascript
{
  _id: ObjectId,
  name: String,           // super_admin, org_owner, etc.
  display_name: String,   // "Super Admin"
  permissions: [String],  // ["manage_platform", "manage_users"]
  is_system: Boolean,     // cannot be deleted
  created_at: Date
}
```

### Sessions Collection (Redis)
```javascript
{
  session_id: String,
  user_id: String,
  token: String,
  refresh_token: String,
  expires_at: Timestamp,
  created_at: Timestamp
}
```

### Password Resets Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  token: String,          // unique reset token
  expires_at: Date,       // 1 hour expiry
  used: Boolean,          // default: false
  created_at: Date
}
```

## 🔌 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/verify-email` | Verify email address |

### Protected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/2fa/enable` | Enable 2FA |
| POST | `/api/auth/2fa/verify` | Verify 2FA code |
| POST | `/api/auth/2fa/disable` | Disable 2FA |
| GET | `/api/auth/sessions` | List active sessions |
| DELETE | `/api/auth/sessions/:id` | Revoke session |

### Request/Response Examples

#### Register
```javascript
// POST /api/auth/register
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}

// Response
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com"
  }
}
```

#### Login
```javascript
// POST /api/auth/login
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "remember_me": true
}

// Response
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "org_owner",
      "organization_id": "64f8a1b2c3d4e5f6a7b8c9d1"
    }
  }
}
```

## 🖥️ Frontend Pages/Components

### Pages
| Page | Route | Description |
|------|-------|-------------|
| LoginPage | `/login` | User login form |
| RegisterPage | `/register` | User registration form |
| ForgotPasswordPage | `/forgot-password` | Request password reset |
| ResetPasswordPage | `/reset-password/:token` | Reset password form |
| VerifyEmailPage | `/verify-email/:token` | Email verification |
| ProfilePage | `/settings/profile` | User profile settings |
| SecurityPage | `/settings/security` | Password & 2FA settings |
| SessionsPage | `/settings/sessions` | Active sessions |

### Components
| Component | Description |
|-----------|-------------|
| LoginForm | Email/password form |
| RegisterForm | Registration form with validation |
| PasswordInput | Password field with show/hide |
| TwoFactorSetup | QR code + setup flow |
| TwoFactorVerify | 2FA code input |
| SessionList | Active sessions list |
| PasswordStrengthMeter | Password quality indicator |

## 🔨 Backend Implementation Files

```
backend/src/
├── models/
│   ├── User.js
│   ├── Role.js
│   └── PasswordReset.js
├── controllers/
│   └── auth.controller.js
├── services/
│   ├── auth.service.js
│   ├── token.service.js
│   └── email.service.js
├── routes/
│   └── auth.routes.js
├── middlewares/
│   ├── auth.middleware.js
│   └── rbac.middleware.js
├── validators/
│   └── auth.validator.js
└── utils/
    ├── jwt.js
    └── encryption.js
```

## 🖥️ Frontend Implementation Files

```
frontend/src/
├── pages/auth/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── ResetPasswordPage.jsx
│   └── VerifyEmailPage.jsx
├── components/features/auth/
│   ├── LoginForm.jsx
│   ├── RegisterForm.jsx
│   ├── TwoFactorSetup.jsx
│   └── PasswordStrengthMeter.jsx
├── context/
│   └── AuthContext.jsx
├── hooks/
│   └── useAuth.js
└── services/api/
    └── auth.api.js
```

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 4 |
| Backend services | 12 |
| API endpoints | 8 |
| Frontend pages | 16 |
| Frontend components | 8 |
| Testing | 8 |
| **Total** | **56 hours** |

## 📦 Dependencies

### Backend
- bcrypt (password hashing)
- jsonwebtoken (JWT)
- otplib (TOTP for 2FA)
- qrcode (QR generation)
- nodemailer (email)

### Frontend
- react-hook-form (forms)
- zod (validation)
- react-hot-toast (notifications)

## ✅ Testing Checklist

- [ ] User can register with valid data
- [ ] Registration fails with invalid data
- [ ] Email verification works correctly
- [ ] User can login with correct credentials
- [ ] Login fails with wrong credentials
- [ ] Account locked after failed attempts
- [ ] JWT tokens generated correctly
- [ ] Token refresh works
- [ ] Password reset flow works
- [ ] 2FA setup and verification works
- [ ] Session management works
- [ ] RBAC middleware blocks unauthorized access

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Registration completion | > 90% |
| Login success rate | > 99% |
| Average login time | < 500ms |
| 2FA adoption rate | > 30% |

---

# Module 2: Organization Management Module

## 📋 Overview
Manage multi-tenant organizations, workspaces, and team members.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Create Organization | High | New workspace creation |
| Organization Settings | High | Update org details |
| Invite Members | High | Email invitations |
| Member Management | High | Add/remove/role assignment |
| Project Management | Medium | Create projects under org |
| Organization Billing | Medium | Subscription management |

## 🗄️ Database Schema

### Organizations Collection
```javascript
{
  _id: ObjectId,
  name: String,              // required, unique
  slug: String,              // unique URL-friendly identifier
  description: String,
  logo_url: String,
  subscription_plan_id: ObjectId,
  owner_id: ObjectId,        // reference to User
  settings: {
    currency: String,        // default: "USD"
    timezone: String,
    notification_preferences: Object
  },
  is_active: Boolean,        // default: true
  created_at: Date,
  updated_at: Date
}
```

### Projects Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId, // required
  name: String,              // required
  description: String,
  settings: Object,
  is_active: Boolean,        // default: true
  created_at: Date,
  updated_at: Date
}
```

### Invitations Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  email: String,             // invitee email
  role_id: ObjectId,         // assigned role
  token: String,             // unique invite token
  invited_by: ObjectId,      // user who sent invite
  status: String,            // pending/accepted/expired
  expires_at: Date,          // 7 days
  created_at: Date
}
```

### Organization Members (Embedded in Organization)
```javascript
// Embedded in Organization document
members: [{
  user_id: ObjectId,
  role_id: ObjectId,
  joined_at: Date,
  invited_by: ObjectId
}]
```

## 🔌 API Endpoints

### Organization Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/api/organizations` | Create organization | Any |
| GET | `/api/organizations` | List user's organizations | Any |
| GET | `/api/organizations/:id` | Get organization details | Member |
| PUT | `/api/organizations/:id` | Update organization | Owner |
| DELETE | `/api/organizations/:id` | Delete organization | Owner |

### Member Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/organizations/:id/members` | List members | Member |
| POST | `/api/organizations/:id/invite` | Invite member | Owner |
| POST | `/api/organizations/join/:token` | Accept invitation | Any |
| PUT | `/api/organizations/:id/members/:userId` | Update role | Owner |
| DELETE | `/api/organizations/:id/members/:userId` | Remove member | Owner |

### Project Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | List projects | Member |
| POST | `/api/projects` | Create project | Owner/Admin |
| GET | `/api/projects/:id` | Get project details | Member |
| PUT | `/api/projects/:id` | Update project | Owner/Admin |
| DELETE | `/api/projects/:id` | Delete project | Owner |

### Request/Response Examples

#### Create Organization
```javascript
// POST /api/organizations
// Request
{
  "name": "Acme Corporation",
  "description": "AI-powered solutions company"
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Acme Corporation",
    "slug": "acme-corporation",
    "owner_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Invite Member
```javascript
// POST /api/organizations/:id/invite
// Request
{
  "email": "newuser@example.com",
  "role_id": "64f8a1b2c3d4e5f6a7b8c9d2"
}

// Response
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invitation_id": "64f8a1b2c3d4e5f6a7b8c9d3",
    "email": "newuser@example.com",
    "expires_at": "2024-01-22T10:30:00Z"
  }
}
```

## 🖥️ Frontend Pages/Components

### Pages
| Page | Route | Description |
|------|-------|-------------|
| CreateOrgPage | `/create-organization` | Create new organization |
| OrgDashboardPage | `/org/:id/dashboard` | Organization overview |
| OrgSettingsPage | `/org/:id/settings` | Organization settings |
| TeamPage | `/org/:id/team` | Team management |
| ProjectsPage | `/org/:id/projects` | Projects list |
| InviteAcceptPage | `/invite/:token` | Accept invitation |

### Components
| Component | Description |
|-----------|-------------|
| OrganizationForm | Create/edit organization |
| TeamMemberList | List of team members |
| InviteMemberModal | Invite new member |
| RoleAssignment | Role dropdown selector |
| ProjectList | Projects grid/list |
| ProjectForm | Create/edit project |

## 🔨 Backend Implementation Files

```
backend/src/
├── models/
│   ├── Organization.js
│   ├── Project.js
│   └── Invitation.js
├── controllers/
│   ├── organization.controller.js
│   ├── member.controller.js
│   └── project.controller.js
├── services/
│   ├── organization.service.js
│   ├── invitation.service.js
│   └── project.service.js
├── routes/
│   ├── organization.routes.js
│   ├── member.routes.js
│   └── project.routes.js
└── validators/
    └── organization.validator.js
```

## 🖥️ Frontend Implementation Files

```
frontend/src/
├── pages/organization/
│   ├── CreateOrgPage.jsx
│   ├── OrgDashboardPage.jsx
│   ├── OrgSettingsPage.jsx
│   ├── TeamPage.jsx
│   └── ProjectsPage.jsx
├── components/features/organization/
│   ├── OrganizationForm.jsx
│   ├── TeamMemberList.jsx
│   ├── InviteMemberModal.jsx
│   ├── ProjectList.jsx
│   └── ProjectForm.jsx
├── context/
│   └── OrganizationContext.jsx
└── services/api/
    ├── organization.api.js
    └── project.api.js
```

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 4 |
| Backend services | 10 |
| API endpoints | 10 |
| Frontend pages | 16 |
| Frontend components | 12 |
| Testing | 10 |
| **Total** | **62 hours** |

## 📦 Dependencies

### Backend
- mongoose (MongoDB)
- uuid (unique tokens)

### Frontend
- react-router-dom (routing)

## ✅ Testing Checklist

- [ ] Organization creation works
- [ ] Duplicate organization names handled
- [ ] Member invitation sends email
- [ ] Invitation acceptance works
- [ ] Role assignment works
- [ ] Member removal works
- [ ] Project creation works
- [ ] Multi-tenant data isolation works
- [ ] Organization settings update works

---

# Module 3: AI Provider Management Module

## 📋 Overview
Manage AI service providers, their models, and pricing structures.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Provider CRUD | High | Create/read/update/delete providers |
| Model Management | High | Add models under providers |
| Pricing Configuration | High | Set input/output token costs |
| Pricing History | Medium | Track pricing changes |
| Multiple Pricing Units | Medium | Per-1K, per-1M tokens |
| Enable/Disable Providers | Medium | Activate/deactivate |
| Provider Categories | Low | LLM, Image, Audio, Embedding |

## 🗄️ Database Schema

### Providers Collection
```javascript
{
  _id: ObjectId,
  name: String,              // "OpenAI", "Anthropic"
  slug: String,              // unique, URL-friendly
  category: String,          // llm, image, audio, embedding
  description: String,
  website_url: String,
  logo_url: String,
  is_active: Boolean,        // default: true
  metadata: Object,          // additional info
  created_at: Date,
  updated_at: Date
}
```

### AI Models Collection
```javascript
{
  _id: ObjectId,
  provider_id: ObjectId,     // reference to Provider
  name: String,               // "GPT-4", "Claude 3"
  slug: String,               // unique
  type: String,               // chat, completion, embedding
  description: String,
  context_window: Number,     // max tokens
  max_output_tokens: Number,
  capabilities: [String],     // ["streaming", "function_calling"]
  current_pricing_id: ObjectId, // reference to current pricing
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

### Pricing History Collection
```javascript
{
  _id: ObjectId,
  model_id: ObjectId,         // reference to AI Model
  pricing_unit: String,        // per_1k_tokens, per_1m_tokens
  input_cost: Number,          // cost per unit
  output_cost: Number,         // cost per unit
  currency: String,            // USD
  effective_from: Date,
  effective_to: Date,          // null if current
  is_current: Boolean,
  created_at: Date
}
```

## 🔌 API Endpoints

### Provider Endpoints (Super Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/providers` | Create provider |
| GET | `/api/providers` | List all providers |
| GET | `/api/providers/:id` | Get provider details |
| PUT | `/api/providers/:id` | Update provider |
| DELETE | `/api/providers/:id` | Delete provider |
| PATCH | `/api/providers/:id/activate` | Activate provider |
| PATCH | `/api/providers/:id/deactivate` | Deactivate provider |

### Model Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers/:providerId/models` | List provider models |
| POST | `/api/providers/:providerId/models` | Add model |
| GET | `/api/models/:id` | Get model details |
| PUT | `/api/models/:id` | Update model |
| DELETE | `/api/models/:id` | Delete model |

### Pricing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/:id/pricing` | Get current pricing |
| GET | `/api/models/:id/pricing/history` | Get pricing history |
| POST | `/api/models/:id/pricing` | Update pricing |
| GET | `/api/pricing/compare` | Compare model pricing |

### Request/Response Examples

#### Create Provider
```javascript
// POST /api/providers
// Request
{
  "name": "OpenAI",
  "category": "llm",
  "description": "Leading AI research laboratory",
  "website_url": "https://openai.com"
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "OpenAI",
    "slug": "openai",
    "category": "llm",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Add Model
```javascript
// POST /api/providers/:providerId/models
// Request
{
  "name": "GPT-4 Turbo",
  "type": "chat",
  "context_window": 128000,
  "max_output_tokens": 4096,
  "capabilities": ["streaming", "function_calling", "vision"]
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "provider_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "GPT-4 Turbo",
    "type": "chat",
    "context_window": 128000,
    "is_active": true
  }
}
```

#### Set Pricing
```javascript
// POST /api/models/:id/pricing
// Request
{
  "pricing_unit": "per_1k_tokens",
  "input_cost": 0.01,
  "output_cost": 0.03,
  "currency": "USD"
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "model_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "input_cost": 0.01,
    "output_cost": 0.03,
    "effective_from": "2024-01-15T10:30:00Z"
  }
}
```

## 🖥️ Frontend Pages/Components

### Pages
| Page | Route | Description |
|------|-------|-------------|
| ProvidersListPage | `/providers` | List all providers |
| ProviderDetailPage | `/providers/:id` | Provider details |
| ProviderFormPage | `/providers/new` | Create provider |
| ModelDetailPage | `/models/:id` | Model details |
| PricingComparisonPage | `/pricing/compare` | Compare pricing |

### Components
| Component | Description |
|-----------|-------------|
| ProviderCard | Provider summary card |
| ProviderForm | Create/edit provider form |
| ModelList | Models under provider |
| ModelForm | Create/edit model form |
| PricingForm | Set pricing form |
| PricingHistory | Pricing history table |
| PricingComparison | Compare multiple models |

## 🔨 Backend Implementation Files

```
backend/src/
├── models/
│   ├── Provider.js
│   ├── AIModel.js
│   └── PricingHistory.js
├── controllers/
│   ├── provider.controller.js
│   └── model.controller.js
├── services/
│   ├── provider.service.js
│   └── model.service.js
├── routes/
│   ├── provider.routes.js
│   └── model.routes.js
└── validators/
    └── provider.validator.js
```

## 🖥️ Frontend Implementation Files

```
frontend/src/
├── pages/providers/
│   ├── ProvidersListPage.jsx
│   ├── ProviderDetailPage.jsx
│   ├── ProviderFormPage.jsx
│   └── ModelDetailPage.jsx
├── components/features/providers/
│   ├── ProviderCard.jsx
│   ├── ProviderForm.jsx
│   ├── ModelList.jsx
│   ├── ModelForm.jsx
│   ├── PricingForm.jsx
│   └── PricingComparison.jsx
└── services/api/
    └── provider.api.js
```

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 4 |
| Backend services | 12 |
| API endpoints | 8 |
| Frontend pages | 12 |
| Frontend components | 10 |
| Testing | 6 |
| **Total** | **52 hours** |

## ✅ Testing Checklist

- [ ] Provider CRUD works
- [ ] Model CRUD works
- [ ] Pricing configuration works
- [ ] Pricing history tracked
- [ ] Provider activation/deactivation works
- [ ] Pricing comparison works correctly
- [ ] Data validation works

---

# Module 4: Feature Consumption Mapping Module

## 📋 Overview
Map SaaS product features to AI models and token usage estimates.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Feature CRUD | High | Create/read/update/delete features |
| Model Assignment | High | Link features to AI models |
| Token Estimation | High | Estimate input/output tokens |
| Usage Frequency | Medium | Configure how often features used |
| Infrastructure Overhead | Medium | Add cloud/infrastructure costs |
| Feature Categories | Low | Group features by type |

## 🗄️ Database Schema

### Features Collection
```javascript
{
  _id: ObjectId,
  project_id: ObjectId,       // reference to Project
  name: String,               // "Chat Completion"
  description: String,
  category: String,           // "chat", "generation", "analysis"
  model_id: ObjectId,          // reference to AI Model
  
  // Token estimates
  token_estimates: {
    input_tokens_avg: Number,
    input_tokens_min: Number,
    input_tokens_max: Number,
    output_tokens_avg: Number,
    output_tokens_min: Number,
    output_tokens_max: Number
  },
  
  // Usage frequency
  usage_frequency: {
    type: String,              // per_user, per_day, per_month
    avg_per_user: Number,      // average uses per user
    peak_multiplier: Number    // peak usage multiplier
  },
  
  // Infrastructure overhead
  infrastructure: {
    base_cost: Number,         // fixed infrastructure cost
    per_request_cost: Number,  // variable cost
    currency: String
  },
  
  // Feature limits
  limits: {
    max_requests_per_day: Number,
    max_tokens_per_request: Number
  },
  
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

### Feature Mappings Collection (Optional - for complex mappings)
```javascript
{
  _id: ObjectId,
  feature_id: ObjectId,
  model_id: ObjectId,
  usage_weight: Number,        // percentage of feature usage
  created_at: Date
}
```

## 🔌 API Endpoints

### Feature Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:projectId/features` | List project features |
| POST | `/api/projects/:projectId/features` | Create feature |
| GET | `/api/features/:id` | Get feature details |
| PUT | `/api/features/:id` | Update feature |
| DELETE | `/api/features/:id` | Delete feature |
| POST | `/api/features/:id/calculate` | Calculate feature cost |

### Batch Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/features/bulk` | Create multiple features |
| PUT | `/api/features/bulk` | Update multiple features |

### Request/Response Examples

#### Create Feature
```javascript
// POST /api/projects/:projectId/features
// Request
{
  "name": "Chat Completion",
  "description": "AI chat completion feature",
  "category": "chat",
  "model_id": "64f8a1b2c3d4e5f6a7b8c9d1",
  "token_estimates": {
    "input_tokens_avg": 500,
    "input_tokens_min": 100,
    "input_tokens_max": 2000,
    "output_tokens_avg": 300,
    "output_tokens_min": 50,
    "output_tokens_max": 1500
  },
  "usage_frequency": {
    "type": "per_month",
    "avg_per_user": 100
  },
  "infrastructure": {
    "base_cost": 10,
    "per_request_cost": 0.001,
    "currency": "USD"
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "name": "Chat Completion",
    "calculated_cost_per_use": 0.012,
    "monthly_cost_per_user": 1.20
  }
}
```

#### Calculate Feature Cost
```javascript
// POST /api/features/:id/calculate
// Request
{
  "users": 1000,
  "usage_multiplier": 1.0
}

// Response
{
  "success": true,
  "data": {
    "feature": "Chat Completion",
    "cost_per_use": 0.012,
    "monthly_users": 1000,
    "usage_per_user": 100,
    "total_monthly_requests": 100000,
    "total_monthly_cost": 1200.00,
    "infrastructure_cost": 110.00,
    "total_cost": 1310.00
  }
}
```

## 🖥️ Frontend Pages/Components

### Pages
| Page | Route | Description |
|------|-------|-------------|
| FeaturesListPage | `/projects/:id/features` | List features |
| FeatureDetailPage | `/features/:id` | Feature details |
| FeatureFormPage | `/projects/:id/features/new` | Create feature |

### Components
| Component | Description |
|-----------|-------------|
| FeatureCard | Feature summary card |
| FeatureForm | Create/edit feature form |
| TokenEstimator | Token estimate input |
| UsageFrequencyInput | Usage configuration |
| FeatureCostBreakdown | Cost visualization |

## 🔨 Backend Implementation Files

```
backend/src/
├── models/
│   └── Feature.js
├── controllers/
│   └── feature.controller.js
├── services/
│   └── feature.service.js
├── routes/
│   └── feature.routes.js
└── validators/
    └── feature.validator.js
```

## 🖥️ Frontend Implementation Files

```
frontend/src/
├── pages/features/
│   ├── FeaturesListPage.jsx
│   ├── FeatureDetailPage.jsx
│   └── FeatureFormPage.jsx
├── components/features/features/
│   ├── FeatureCard.jsx
│   ├── FeatureForm.jsx
│   ├── TokenEstimator.jsx
│   ├── UsageFrequencyInput.jsx
│   └── FeatureCostBreakdown.jsx
└── services/api/
    └── feature.api.js
```

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 3 |
| Backend services | 8 |
| API endpoints | 6 |
| Frontend pages | 10 |
| Frontend components | 8 |
| Testing | 5 |
| **Total** | **40 hours** |

---

# Module 5: Pricing Engine Module

## 📋 Overview
Core calculation engine for computing costs, margins, and profitability.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Token Cost Calculator | Critical | Calculate API token costs |
| Feature Cost Calculator | High | Calculate feature-level costs |
| User Cost Calculator | High | Calculate monthly user cost |
| Profitability Calculator | High | Calculate subscription profitability |
| Margin Calculator | High | Calculate profit margins |
| Break-Even Calculator | High | Calculate break-even users |
| Multiple Currencies | Medium | Support different currencies |

## 🧮 Calculation Formulas

### Token Cost Formula
```javascript
/**
 * Calculate cost for API tokens
 */
function calculateTokenCost(inputTokens, outputTokens, inputCostPerK, outputCostPerK) {
  const inputCost = (inputTokens / 1000) * inputCostPerK;
  const outputCost = (outputTokens / 1000) * outputCostPerK;
  const totalCost = inputCost + outputCost;
  
  return {
    inputCost,
    outputCost,
    totalCost,
    currency: 'USD'
  };
}
```

### Feature Cost Formula
```javascript
/**
 * Calculate cost for a single feature
 */
function calculateFeatureCost(feature, users, usageMultiplier = 1) {
  const { token_estimates, usage_frequency, infrastructure, model } = feature;
  
  // Get model pricing
  const pricing = model.current_pricing;
  
  // Calculate token costs
  const inputTokens = token_estimates.input_tokens_avg * usage_frequency.avg_per_user;
  const outputTokens = token_estimates.output_tokens_avg * usage_frequency.avg_per_user;
  
  const tokenCost = calculateTokenCost(
    inputTokens, outputTokens,
    pricing.input_cost, pricing.output_cost
  );
  
  // Calculate infrastructure cost
  const infraCost = infrastructure.base_cost + 
    (infrastructure.per_request_cost * usage_frequency.avg_per_user);
  
  // Total cost per user
  const costPerUser = tokenCost.totalCost + infraCost;
  
  return {
    feature_id: feature._id,
    feature_name: feature.name,
    cost_per_use: tokenCost.totalCost,
    infrastructure_cost_per_user: infraCost,
    total_cost_per_user: costPerUser,
    monthly_users: users,
    total_monthly_cost: costPerUser * users
  };
}
```

### Subscription Profitability Formula
```javascript
/**
 * Calculate subscription profitability
 */
function calculateProfitability(plan, users, features) {
  // Calculate total costs
  const featureCosts = features.map(f => calculateFeatureCost(f, users));
  const totalMonthlyCost = featureCosts.reduce((sum, f) => sum + f.total_monthly_cost, 0);
  
  // Calculate revenue
  const monthlyRevenue = plan.price * users;
  
  // Calculate profit
  const grossProfit = monthlyRevenue - totalMonthlyCost;
  const profitMargin = (grossProfit / monthlyRevenue) * 100;
  
  // Break-even calculation
  const avgRevenuePerUser = plan.price;
  const avgCostPerUser = totalMonthlyCost / users;
  const breakEvenUsers = avgRevenuePerUser > avgCostPerUser 
    ? Math.ceil(plan.fixed_costs / (avgRevenuePerUser - avgCostPerUser))
    : Infinity;
  
  return {
    revenue: {
      total: monthlyRevenue,
      per_user: avgRevenuePerUser
    },
    costs: {
      total: totalMonthlyCost,
      per_user: avgCostPerUser,
      breakdown: featureCosts
    },
    profit: {
      gross: grossProfit,
      margin_percentage: profitMargin
    },
    break_even: {
      users: breakEvenUsers,
      fixed_costs: plan.fixed_costs
    }
  };
}
```

## 🔌 API Endpoints

### Calculation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pricing/calculate` | Calculate token costs |
| POST | `/api/pricing/feature-cost` | Calculate feature cost |
| POST | `/api/pricing/user-cost` | Calculate monthly user cost |
| POST | `/api/pricing/profitability` | Calculate subscription profitability |
| POST | `/api/pricing/break-even` | Calculate break-even analysis |
| POST | `/api/pricing/compare` | Compare pricing scenarios |

### Request/Response Examples

#### Calculate Token Cost
```javascript
// POST /api/pricing/calculate
// Request
{
  "model_id": "64f8a1b2c3d4e5f6a7b8c9d1",
  "input_tokens": 10000,
  "output_tokens": 5000
}

// Response
{
  "success": true,
  "data": {
    "model": "GPT-4 Turbo",
    "input_tokens": 10000,
    "output_tokens": 5000,
    "input_cost": 0.10,
    "output_cost": 0.15,
    "total_cost": 0.25,
    "currency": "USD"
  }
}
```

#### Calculate Profitability
```javascript
// POST /api/pricing/profitability
// Request
{
  "plan_id": "64f8a1b2c3d4e5f6a7b8c9d3",
  "users": 1000,
  "features": [
    { "feature_id": "64f8a1b2c3d4e5f6a7b8c9d4", "usage_per_user": 100 },
    { "feature_id": "64f8a1b2c3d4e5f6a7b8c9d5", "usage_per_user": 50 }
  ],
  "fixed_costs": 5000
}

// Response
{
  "success": true,
  "data": {
    "summary": {
      "monthly_revenue": 29900.00,
      "monthly_cost": 15200.00,
      "gross_profit": 14700.00,
      "profit_margin": 49.16
    },
    "breakdown": {
      "features": [...],
      "fixed_costs": 5000.00,
      "infrastructure": 2200.00
    },
    "break_even": {
      "users": 548
    }
  }
}
```

## 🔨 Backend Implementation Files

```
backend/src/
├── services/
│   ├── pricing.service.js       // Main pricing calculations
│   ├── calculator.service.js     // Helper calculations
│   └── forecast.service.js       // Forecasting utilities
├── controllers/
│   └── pricing.controller.js
├── routes/
│   └── pricing.routes.js
└── validators/
    └── pricing.validator.js
```

## 🖥️ Frontend Implementation Files

```
frontend/src/
├── pages/pricing/
│   ├── TokenCalculatorPage.jsx
│   ├── FeatureCostPage.jsx
│   ├── ProfitabilityPage.jsx
│   └── BreakEvenPage.jsx
├── components/features/pricing/
│   ├── TokenCalculator.jsx
│   ├── CostBreakdown.jsx
│   ├── ProfitabilityChart.jsx
│   └── BreakEvenChart.jsx
├── utils/
│   └── calculations.js
└── services/api/
    └── pricing.api.js
```

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Calculation services | 16 |
| API endpoints | 8 |
| Frontend pages | 12 |
| Frontend components | 10 |
| Testing (critical) | 12 |
| **Total** | **58 hours** |

## ✅ Testing Checklist

- [ ] Token cost calculation is accurate
- [ ] Feature cost calculation is accurate
- [ ] Profitability calculation is accurate
- [ ] Break-even calculation is accurate
- [ ] Multiple currencies supported
- [ ] Edge cases handled (zero values, negative, etc.)
- [ ] Large numbers handled correctly
- [ ] Performance within 3 seconds

---

# Module 6: Subscription Plan Management Module

## 📋 Overview
Create and manage subscription packages for SaaS products.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Plan CRUD | High | Create/read/update/delete plans |
| Plan Tiers | High | Multiple pricing tiers |
| Feature Access Control | High | Control features per plan |
| Usage Limits | Medium | Define usage caps |
| Plan Comparison | Medium | Compare plans side-by-side |
| Plan Templates | Low | Pre-built plan templates |

## 🗄️ Database Schema

### Subscription Plans Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,   // reference to Organization
  name: String,                // "Pro", "Enterprise"
  slug: String,                // unique within org
  description: String,
  
  // Pricing
  pricing: {
    type: String,              // flat_rate, usage_based, credit_based, tiered
    monthly_price: Number,
    yearly_price: Number,       // optional yearly price
    currency: String,           // USD
    setup_fee: Number,          // one-time fee
  },
  
  // Usage limits
  limits: {
    users: Number,              // max users
    requests_per_month: Number,
    tokens_per_month: Number,
    storage_gb: Number
  },
  
  // Feature access
  features: [{
    feature_id: ObjectId,       // reference to Feature
    included: Boolean,
    limit: Number,              // usage limit if applicable
  }],
  
  // Billing
  billing: {
    trial_days: Number,
    grace_period_days: Number,
    overage_rate: Number         // rate for exceeding limits
  },
  
  is_active: Boolean,
  is_default: Boolean,
  display_order: Number,
  created_at: Date,
  updated_at: Date
}
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plans` | List organization plans |
| POST | `/api/plans` | Create plan |
| GET | `/api/plans/:id` | Get plan details |
| PUT | `/api/plans/:id` | Update plan |
| DELETE | `/api/plans/:id` | Delete plan |
| POST | `/api/plans/:id/activate` | Activate plan |
| POST | `/api/plans/compare` | Compare multiple plans |
| GET | `/api/plans/:id/profitability` | Get plan profitability |

### Request/Response Examples

#### Create Plan
```javascript
// POST /api/plans
// Request
{
  "name": "Pro Plan",
  "description": "Perfect for growing teams",
  "pricing": {
    "type": "flat_rate",
    "monthly_price": 99,
    "yearly_price": 999,
    "currency": "USD"
  },
  "limits": {
    "users": 50,
    "requests_per_month": 100000,
    "tokens_per_month": 5000000
  },
  "features": [
    { "feature_id": "64f8a1b2c3d4e5f6a7b8c9d1", "included": true },
    { "feature_id": "64f8a1b2c3d4e5f6a7b8c9d2", "included": true, "limit": 1000 }
  ]
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d3",
    "name": "Pro Plan",
    "monthly_price": 99,
    "features_included": 15,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## 🖥️ Frontend Pages/Components

### Pages
| Page | Route | Description |
|------|-------|-------------|
| PlansListPage | `/plans` | List all plans |
| PlanDetailPage | `/plans/:id` | Plan details |
| PlanBuilderPage | `/plans/new` | Create plan |
| PlanComparePage | `/plans/compare` | Compare plans |

### Components
| Component | Description |
|-----------|-------------|
| PlanCard | Plan summary card |
| PlanBuilder | Visual plan builder |
| FeatureSelector | Select features for plan |
| PricingInput | Pricing configuration |
| PlanComparison | Side-by-side comparison |

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 4 |
| Backend services | 10 |
| API endpoints | 6 |
| Frontend pages | 12 |
| Frontend components | 10 |
| Testing | 6 |
| **Total** | **48 hours** |

---

# Module 7: Simulation & Forecasting Module

## 📋 Overview
Run what-if simulations and forecast business outcomes.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| User Growth Simulation | High | Model user growth scenarios |
| Pricing Change Simulation | High | Impact of price changes |
| Cost Projection | Medium | Forecast operational costs |
| Revenue Forecasting | Medium | Project revenues |
| Scenario Comparison | Medium | Compare multiple scenarios |
| Export Results | Low | Export simulation data |

## 🗄️ Database Schema

### Simulations Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  project_id: ObjectId,
  user_id: ObjectId,           // creator
  
  name: String,                // "Q1 Growth Scenario"
  description: String,
  type: String,                // growth, pricing_change, custom
  
  // Input parameters
  parameters: {
    base_users: Number,
    growth_rate: Number,        // monthly growth %
    churn_rate: Number,          // monthly churn %
    time_period_months: Number,
    plan_id: ObjectId,
    features: [{
      feature_id: ObjectId,
      usage_per_user: Number,
      growth_factor: Number
    }],
    fixed_costs: Number,
    variable_cost_increase: Number // % increase over time
  },
  
  // Results
  results: {
    total_users: [Number],       // array per month
    total_revenue: [Number],
    total_costs: [Number],
    gross_profit: [Number],
    profit_margins: [Number],
    break_even_month: Number
  },
  
  created_at: Date,
  updated_at: Date
}
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simulations` | List simulations |
| POST | `/api/simulations` | Create simulation |
| GET | `/api/simulations/:id` | Get simulation |
| POST | `/api/simulations/:id/run` | Run simulation |
| POST | `/api/simulations/:id/duplicate` | Duplicate simulation |
| DELETE | `/api/simulations/:id` | Delete simulation |
| POST | `/api/simulations/compare` | Compare simulations |

### Request/Response Examples

#### Create & Run Simulation
```javascript
// POST /api/simulations/:id/run
// Request
{
  "base_users": 1000,
  "growth_rate": 10,            // 10% monthly growth
  "churn_rate": 5,              // 5% monthly churn
  "time_period_months": 12,
  "plan_id": "64f8a1b2c3d4e5f6a7b8c9d3",
  "fixed_costs": 5000
}

// Response
{
  "success": true,
  "data": {
    "simulation_id": "64f8a1b2c3d4e5f6a7b8c9d4",
    "summary": {
      "starting_users": 1000,
      "ending_users": 2853,
      "total_revenue": 342360,
      "total_costs": 185422,
      "net_profit": 156938,
      "average_margin": 45.8
    },
    "monthly_data": [
      { "month": 1, "users": 1050, "revenue": 10495, "costs": 5500, "profit": 4995 },
      // ... 12 months
    ],
    "chart_data": { /* for visualization */ }
  }
}
```

## 🖥️ Frontend Pages/Components

### Pages
| Page | Route | Description |
|------|-------|-------------|
| SimulationsListPage | `/simulations` | List simulations |
| SimulationCreatePage | `/simulations/new` | Create simulation |
| SimulationResultsPage | `/simulations/:id` | View results |
| SimulationComparePage | `/simulations/compare` | Compare |

### Components
| Component | Description |
|-----------|-------------|
| SimulationForm | Parameter inputs |
| GrowthChart | User growth visualization |
| RevenueChart | Revenue projection |
| ProfitChart | Profit trend |
| ScenarioCard | Saved scenario card |
| ComparisonTable | Side-by-side comparison |

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 3 |
| Backend services | 14 |
| API endpoints | 6 |
| Frontend pages | 12 |
| Frontend components | 12 |
| Testing | 6 |
| **Total** | **53 hours** |

---

# Module 8: Analytics Dashboard Module

## 📋 Overview
Visualize operational costs, trends, and key metrics.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Cost Dashboard | High | Overall cost visualization |
| Feature Analytics | High | Cost per feature |
| Trend Analysis | High | Historical trends |
| Margin Dashboard | Medium | Profit margins |
| Custom Date Range | Medium | Filter by date |
| Export Data | Low | Export charts/data |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard metrics |
| GET | `/api/analytics/costs` | Cost analytics |
| GET | `/api/analytics/margins` | Margin analytics |
| GET | `/api/analytics/trends` | Trend data |
| POST | `/api/analytics/custom` | Custom analytics |

### Response Example

```javascript
// GET /api/analytics/dashboard
{
  "success": true,
  "data": {
    "summary": {
      "total_monthly_cost": 15200.00,
      "total_monthly_revenue": 29900.00,
      "profit_margin": 49.16,
      "active_users": 1000
    },
    "cost_breakdown": {
      "api_costs": 12000.00,
      "infrastructure": 2200.00,
      "overhead": 1000.00
    },
    "trends": {
      "cost_change": +5.2,
      "revenue_change": +12.3,
      "user_change": +8.1
    },
    "charts": {
      "monthly_costs": [...],
      "cost_by_feature": [...],
      "margin_trend": [...]
    }
  }
}
```

## 🖥️ Frontend Pages/Components

### Pages
| Page | Route | Description |
|------|-------|-------------|
| DashboardPage | `/dashboard` | Main dashboard |
| CostAnalyticsPage | `/analytics/costs` | Cost analytics |
| MarginAnalyticsPage | `/analytics/margins` | Margin analytics |

### Components
| Component | Description |
|-----------|-------------|
| SummaryCard | Metric summary card |
| CostChart | Cost trend chart |
| FeatureBreakdown | Feature cost pie chart |
| MarginGauge | Margin gauge |
| TrendLine | Trend visualization |

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Backend services | 10 |
| API endpoints | 6 |
| Frontend pages | 10 |
| Frontend components | 12 |
| Testing | 6 |
| **Total** | **44 hours** |

---

# Module 9: Reports Module

## 📋 Overview
Generate and export financial reports.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Report Templates | High | Pre-built report templates |
| Custom Reports | Medium | Build custom reports |
| Export PDF | High | PDF export |
| Export Excel | High | Excel/CSV export |
| Scheduled Reports | Low | Auto-generate reports |
| Email Reports | Low | Email generated reports |

## 🗄️ Database Schema

### Reports Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  user_id: ObjectId,
  
  name: String,
  type: String,              // cost_analysis, margin_analysis, profit_forecast
  
  // Parameters
  parameters: {
    date_range: {
      start: Date,
      end: Date
    },
    features: [ObjectId],
    plans: [ObjectId],
    group_by: String         // day, week, month
  },
  
  // Generated data
  data: Object,              // report data
  
  // File info
  file_url: String,          // storage URL
  file_format: String,       // pdf, excel
  
  status: String,            // pending, completed, failed
  created_at: Date,
  completed_at: Date
}
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List reports |
| POST | `/api/reports` | Generate report |
| GET | `/api/reports/:id` | Get report |
| GET | `/api/reports/:id/download` | Download report |
| DELETE | `/api/reports/:id` | Delete report |

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 3 |
| Backend services | 8 |
| API endpoints | 4 |
| Frontend pages | 8 |
| Frontend components | 6 |
| PDF/Excel generation | 8 |
| Testing | 4 |
| **Total** | **41 hours** |

---

# Module 10: API Integration Module

## 📋 Overview
Connect with external AI providers and sync usage data.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| API Key Management | High | Store API keys securely |
| Provider Connection | High | Connect to AI providers |
| Usage Sync | Medium | Sync actual usage data |
| Webhook Config | Medium | Receive provider webhooks |
| Integration Status | Medium | Monitor connection health |

## 🗄️ Database Schema

### Integrations Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  
  type: String,              // openai, anthropic, custom
  name: String,
  
  // Encrypted credentials
  credentials: {
    api_key: String,         // encrypted
    api_secret: String,       // encrypted
    additional: Object        // other config
  },
  
  configuration: {
    sync_interval: Number,    // minutes
    auto_sync: Boolean,
    webhook_url: String
  },
  
  status: {
    connected: Boolean,
    last_sync: Date,
    last_error: String,
    sync_count: Number
  },
  
  created_at: Date,
  updated_at: Date
}
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations` | List integrations |
| POST | `/api/integrations` | Create integration |
| GET | `/api/integrations/:id` | Get integration |
| PUT | `/api/integrations/:id` | Update integration |
| DELETE | `/api/integrations/:id` | Delete integration |
| POST | `/api/integrations/:id/test` | Test connection |
| POST | `/api/integrations/:id/sync` | Manual sync |

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 3 |
| Backend services | 12 |
| API endpoints | 6 |
| Frontend pages | 8 |
| Frontend components | 6 |
| Encryption/security | 6 |
| Testing | 4 |
| **Total** | **45 hours** |

---

# Module 11: Notifications Module

## 📋 Overview
Manage alerts and user notifications.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| In-App Notifications | High | App notification center |
| Email Notifications | High | Email alerts |
| Pricing Alerts | High | Provider price changes |
| Margin Alerts | Medium | Low margin warnings |
| Usage Alerts | Medium | Usage spike warnings |
| Notification Preferences | Medium | User settings |

## 🗄️ Database Schema

### Notifications Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  user_id: ObjectId,
  
  type: String,              // pricing_change, low_margin, usage_spike, system
  title: String,
  message: String,
  
  data: Object,              // additional context
  
  read: Boolean,             // default: false
  read_at: Date,
  
  email_sent: Boolean,
  email_sent_at: Date,
  
  created_at: Date
}
```

### Notification Settings Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  
  settings: {
    pricing_change: {
      in_app: Boolean,
      email: Boolean
    },
    low_margin: {
      threshold: Number,      // margin %
      in_app: Boolean,
      email: Boolean
    },
    usage_spike: {
      threshold: Number,      // % increase
      in_app: Boolean,
      email: Boolean
    }
  },
  
  created_at: Date,
  updated_at: Date
}
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/unread` | Unread count |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all read |
| GET | `/api/notifications/settings` | Get settings |
| PUT | `/api/notifications/settings` | Update settings |

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 2 |
| Backend services | 8 |
| API endpoints | 4 |
| Frontend pages | 6 |
| Frontend components | 6 |
| Email templates | 4 |
| Testing | 4 |
| **Total** | **34 hours** |

---

# Module 12: Audit & Logs Module

## 📋 Overview
Track activities and maintain compliance records.

## 🎯 Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Activity Logs | High | Track user actions |
| Pricing History | High | Track pricing changes |
| Audit Trail | Medium | Compliance records |
| Log Search | Medium | Search/filter logs |
| Export Logs | Low | Export for compliance |

## 🗄️ Database Schema

### Activity Logs Collection
```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  user_id: ObjectId,
  
  action: String,            // create, update, delete, login, etc.
  resource_type: String,     // user, provider, plan, etc.
  resource_id: ObjectId,
  
  details: {
    before: Object,           // state before action
    after: Object,            // state after action
    changes: Object           // what changed
  },
  
  ip_address: String,
  user_agent: String,
  
  created_at: Date            // immutable
}
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs` | List logs |
| GET | `/api/audit-logs/:id` | Get log details |
| GET | `/api/audit-logs/user/:userId` | User activity |
| GET | `/api/audit-logs/resource/:type/:id` | Resource history |
| POST | `/api/audit-logs/export` | Export logs |

## ⏱️ Time Estimate

| Task | Hours |
|------|-------|
| Database models | 2 |
| Backend services | 6 |
| API endpoints | 4 |
| Frontend pages | 6 |
| Frontend components | 4 |
| Testing | 4 |
| **Total** | **26 hours** |

---

# Development Timeline Summary

## Total Hours per Module

| Module | Hours | Weeks (40hr/week) |
|--------|-------|-------------------|
| 1. Authentication | 56 | 1.4 |
| 2. Organization | 62 | 1.5 |
| 3. AI Provider | 52 | 1.3 |
| 4. Feature Mapping | 40 | 1.0 |
| 5. Pricing Engine | 58 | 1.5 |
| 6. Subscription Plans | 48 | 1.2 |
| 7. Simulation | 53 | 1.3 |
| 8. Analytics | 44 | 1.1 |
| 9. Reports | 41 | 1.0 |
| 10. Integration | 45 | 1.1 |
| 11. Notifications | 34 | 0.9 |
| 12. Audit & Logs | 26 | 0.7 |
| **Total** | **559** | **14 weeks** |

## Additional Time

| Task | Hours | Weeks |
|------|-------|-------|
| Setup & Configuration | 16 | 0.4 |
| Testing & Bug Fixes | 80 | 2.0 |
| Documentation | 24 | 0.6 |
| Deployment | 16 | 0.4 |
| **Total Additional** | **136** | **3.4 weeks** |

## Grand Total

**Total Development Time: 695 hours (~17-18 weeks)**

---

# Quick Reference

## Module Dependencies

```
Module 1: Authentication (No dependencies)
    ↓
Module 2: Organization (Depends on: Auth)
    ↓
Module 3: AI Provider (Depends on: Auth, Org)
    ↓
Module 4: Feature Mapping (Depends on: Auth, Org, Provider)
    ↓
Module 5: Pricing Engine (Depends on: Provider, Feature)
    ↓
Module 6: Subscription Plans (Depends on: Org, Feature, Pricing)
    ↓
Module 7: Simulation (Depends on: Pricing, Plans)
    ↓
Module 8: Analytics (Depends on: All above)
    ↓
Module 9: Reports (Depends on: Analytics)
    ↓
Module 10: Integration (Depends on: Auth, Org)
    ↓
Module 11: Notifications (Depends on: Auth, Org)
    ↓
Module 12: Audit Logs (Depends on: Auth, Org)
```

---

This module-wise development plan provides a complete blueprint for building each feature systematically. Each module includes database schemas, API endpoints, frontend components, and time estimates.