/**
 * Documentation Page
 *
 * API documentation and guides for developers.
 */

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';

// Documentation sections
const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    content: [
      {
        title: 'Introduction',
        description: 'Welcome to the API Token Management platform. This documentation will help you integrate with our API and manage your API tokens effectively.',
      },
      {
        title: 'Authentication',
        description: 'All API requests require authentication using an API key. Include your API key in the Authorization header as a Bearer token.',
        code: `curl -X GET "https://api.example.com/v1/projects" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      },
      {
        title: 'Base URL',
        description: 'All API requests should be made to the following base URL:',
        code: 'https://api.example.com/v1',
      },
    ],
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    content: [
      {
        title: 'Creating API Keys',
        description: 'Navigate to the API Keys section in your dashboard to create a new API key. You can create multiple keys for different purposes.',
      },
      {
        title: 'API Key Permissions',
        description: 'Each API key can be configured with specific permissions. Choose the minimum required permissions for your use case.',
      },
      {
        title: 'Securing Your Keys',
        description: 'Keep your API keys secure. Never expose them in client-side code or public repositories. Use environment variables instead.',
        code: `# Store in .env file
API_KEY=your_api_key_here

# Access in your application
const apiKey = process.env.API_KEY;`,
      },
    ],
  },
  {
    id: 'endpoints',
    title: 'API Endpoints',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
    content: [
      {
        title: 'Projects',
        description: 'Manage your projects and their configurations.',
        endpoints: [
          { method: 'GET', path: '/projects', desc: 'List all projects' },
          { method: 'POST', path: '/projects', desc: 'Create a new project' },
          { method: 'GET', path: '/projects/:id', desc: 'Get project details' },
          { method: 'PUT', path: '/projects/:id', desc: 'Update project' },
          { method: 'DELETE', path: '/projects/:id', desc: 'Delete project' },
        ],
      },
      {
        title: 'Features',
        description: 'Manage features within your projects.',
        endpoints: [
          { method: 'GET', path: '/features', desc: 'List all features' },
          { method: 'POST', path: '/features', desc: 'Create a feature' },
          { method: 'GET', path: '/features/:id', desc: 'Get feature details' },
          { method: 'PUT', path: '/features/:id', desc: 'Update feature' },
        ],
      },
      {
        title: 'Analytics',
        description: 'Retrieve usage analytics and metrics.',
        endpoints: [
          { method: 'GET', path: '/analytics/dashboard', desc: 'Get dashboard summary' },
          { method: 'GET', path: '/analytics/costs', desc: 'Get operational costs' },
          { method: 'GET', path: '/analytics/profitability', desc: 'Get feature profitability' },
          { method: 'GET', path: '/analytics/margins', desc: 'Get margin analytics' },
        ],
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    content: [
      {
        title: 'Setting Up Webhooks',
        description: 'Webhooks allow your application to receive real-time notifications when events occur in your account.',
      },
      {
        title: 'Webhook Events',
        description: 'Available webhook events:',
        events: [
          'project.created',
          'project.updated',
          'project.deleted',
          'feature.created',
          'feature.updated',
          'usage.threshold_reached',
          'billing.invoice_generated',
        ],
      },
      {
        title: 'Webhook Payload',
        description: 'All webhooks send a POST request with the following structure:',
        code: `{
  "event": "project.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "proj_abc123",
    "name": "My Project",
    "organizationId": "org_xyz789"
  },
  "signature": "sha256=..."
}`,
      },
      {
        title: 'Verifying Webhooks',
        description: 'Verify webhook signatures to ensure requests are from our servers:',
        code: `const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === \`sha256=\${expectedSignature}\`;
}`,
      },
    ],
  },
  {
    id: 'rate-limits',
    title: 'Rate Limits',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    content: [
      {
        title: 'Rate Limiting',
        description: 'API requests are rate limited to ensure fair usage. Rate limits vary by plan and endpoint.',
      },
      {
        title: 'Rate Limit Headers',
        description: 'Every response includes headers with your current rate limit status:',
        code: `X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642252800`,
      },
      {
        title: 'Handling Rate Limits',
        description: 'When you exceed the rate limit, you will receive a 429 response. Implement exponential backoff for best results:',
        code: `async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;

    const resetTime = response.headers.get('X-RateLimit-Reset');
    const waitTime = Math.pow(2, i) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  throw new Error('Max retries exceeded');
}`,
      },
    ],
  },
  {
    id: 'errors',
    title: 'Error Handling',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    content: [
      {
        title: 'Error Response Format',
        description: 'All error responses follow a consistent format:',
        code: `{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request parameters are invalid",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}`,
      },
      {
        title: 'HTTP Status Codes',
        description: 'Common status codes returned by the API:',
        codes: [
          { code: 200, desc: 'Success' },
          { code: 201, desc: 'Created' },
          { code: 400, desc: 'Bad Request - Invalid parameters' },
          { code: 401, desc: 'Unauthorized - Invalid or missing API key' },
          { code: 403, desc: 'Forbidden - Insufficient permissions' },
          { code: 404, desc: 'Not Found - Resource does not exist' },
          { code: 429, desc: 'Too Many Requests - Rate limit exceeded' },
          { code: 500, desc: 'Internal Server Error' },
        ],
      },
    ],
  },
  {
    id: 'sdks',
    title: 'SDKs & Libraries',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    content: [
      {
        title: 'Official SDKs',
        description: 'Use our official SDKs for quick integration:',
        sdks: [
          { name: 'Node.js', install: 'npm install @token-manager/sdk', version: '2.1.0' },
          { name: 'Python', install: 'pip install token-manager', version: '2.1.0' },
          { name: 'Go', install: 'go get github.com/token-manager/sdk-go', version: '1.5.0' },
        ],
      },
      {
        title: 'Quick Start - Node.js',
        code: `import { TokenManager } from '@token-manager/sdk';

const client = new TokenManager({
  apiKey: process.env.API_KEY,
});

// List projects
const projects = await client.projects.list();

// Create a feature
const feature = await client.features.create({
  name: 'My Feature',
  projectId: 'proj_abc123',
  pricing: {
    model: 'per_call',
    amount: 0.001,
    currency: 'USD'
  }
});`,
      },
      {
        title: 'Quick Start - Python',
        code: `from token_manager import TokenManager

client = TokenManager(api_key=os.environ['API_KEY'])

# List projects
projects = client.projects.list()

# Create a feature
feature = client.features.create(
    name='My Feature',
    project_id='proj_abc123',
    pricing={
        'model': 'per_call',
        'amount': 0.001,
        'currency': 'USD'
    }
)`,
      },
    ],
  },
];

// Method badge colors
const methodColors = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

function DocsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedCode, setExpandedCode] = useState({});

  const toggleCode = (id) => {
    setExpandedCode(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const activeDoc = docSections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
          <p className="mt-2 text-gray-600">
            Welcome, {user?.firstName || 'Developer'}! Learn how to integrate with our API.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:sticky lg:top-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Contents
              </h2>
              <ul className="space-y-1">
                {docSections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-red-50 text-[#DC2626]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {section.icon}
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-[#DC2626]">
                  {activeDoc?.icon}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{activeDoc?.title}</h2>
              </div>

              <div className="space-y-8">
                {activeDoc?.content.map((item, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    {item.description && (
                      <p className="text-gray-600">{item.description}</p>
                    )}

                    {/* Code Block */}
                    {item.code && (
                      <div className="relative">
                        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                          <code>{item.code}</code>
                        </pre>
                      </div>
                    )}

                    {/* Endpoints */}
                    {item.endpoints && (
                      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Method
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Endpoint
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {item.endpoints.map((endpoint, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${methodColors[endpoint.method]}`}>
                                    {endpoint.method}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <code className="text-sm text-gray-900 font-mono">{endpoint.path}</code>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {endpoint.desc}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Events List */}
                    {item.events && (
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <ul className="space-y-2">
                          {item.events.map((event, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-[#DC2626] rounded-full"></span>
                              <code className="text-sm font-mono text-gray-700">{event}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Status Codes */}
                    {item.codes && (
                      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status Code
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {item.codes.map((code, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                    code.code < 300 ? 'bg-green-100 text-green-700' :
                                    code.code < 400 ? 'bg-yellow-100 text-yellow-700' :
                                    code.code < 500 ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {code.code}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {code.desc}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* SDKs */}
                    {item.sdks && (
                      <div className="grid gap-4 sm:grid-cols-3">
                        {item.sdks.map((sdk, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <h4 className="font-medium text-gray-900 mb-2">{sdk.name}</h4>
                            <code className="block text-xs bg-gray-900 text-gray-100 rounded p-2 mb-2 overflow-x-auto">
                              {sdk.install}
                            </code>
                            <span className="text-xs text-gray-500">v{sdk.version}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default DocsPage;