/**
 * Landing Page Content Model
 *
 * Stores dynamic content for the landing page that can be edited by superadmin.
 */

import mongoose from 'mongoose';

const landingPageContentSchema = new mongoose.Schema({
  // Section identifier
  section: {
    type: String,
    required: true,
    unique: true,
    enum: ['hero', 'features', 'howItWorks', 'testimonials', 'faq', 'stats', 'cta', 'providers', 'analytics', 'footer']
  },

  // Content data (flexible schema for different sections)
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },

  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
landingPageContentSchema.index({ section: 1 });

// Static method to get all active content
landingPageContentSchema.statics.getActiveContent = async function() {
  const contents = await this.find({ isActive: true });
  const result = {};
  contents.forEach(item => {
    result[item.section] = item.content;
  });
  return result;
};

// Static method to get content by section
landingPageContentSchema.statics.getSectionContent = async function(section) {
  return await this.findOne({ section, isActive: true });
};

// Static method to update section content
landingPageContentSchema.statics.updateSectionContent = async function(section, content, userId) {
  return await this.findOneAndUpdate(
    { section },
    {
      content,
      lastUpdatedBy: userId,
      isActive: true
    },
    { upsert: true, new: true }
  );
};

// Default content for each section
landingPageContentSchema.statics.getDefaultContent = () => ({
  hero: {
    title: 'AI API Cost',
    titleHighlight: 'Management Platform',
    subtitle: 'Track token usage, optimize AI costs, and scale your infrastructure efficiently. Get real-time analytics and forecasting for OpenAI, Anthropic, and 15+ AI providers.',
    stats: [
      { label: 'Cost Reduction', value: '40%', icon: '💰', description: 'Average savings' },
      { label: 'API Calls Tracked', value: '10M+', icon: '📊', description: 'Monthly volume' },
      { label: 'Providers Supported', value: '15+', icon: '🔌', description: 'AI integrations' },
      { label: 'Uptime', value: '99.9%', icon: '⚡', description: 'Reliability' }
    ],
    ctaButton: 'Start Free Trial',
    secondaryCta: 'View Pricing'
  },
  howItWorks: {
    title: 'Get Started in Minutes',
    subtitle: 'Our streamlined onboarding process gets you up and running quickly.',
    steps: [
      {
        number: '01',
        title: 'Connect Provider',
        description: 'Link your AI provider accounts using secure API keys. We support OpenAI, Anthropic, Google, and 15+ more.',
        icon: 'link'
      },
      {
        number: '02',
        title: 'Configure Pricing',
        description: 'Set up your pricing models, tokens, and usage limits. Configure subscription plans for your customers.',
        icon: 'settings'
      },
      {
        number: '03',
        title: 'Track Usage',
        description: 'Monitor real-time token usage, API calls, and costs across all your providers in one dashboard.',
        icon: 'chart'
      },
      {
        number: '04',
        title: 'Optimize Cost',
        description: 'Identify cost-saving opportunities with AI-powered insights and optimization recommendations.',
        icon: 'trending'
      },
      {
        number: '05',
        title: 'Scale Profitably',
        description: 'Make informed decisions with forecasting and break-even analysis. Grow your AI business sustainably.',
        icon: 'rocket'
      }
    ]
  },
  testimonials: {
    title: 'Trusted by AI-First Companies',
    subtitle: 'See how teams are managing their AI costs with our platform.',
    items: [
      {
        quote: 'We reduced our AI costs by 35% in the first month. The analytics dashboard alone is worth the subscription.',
        author: 'Sarah Chen',
        role: 'CTO',
        company: 'AI Startup Inc',
        avatar: null
      },
      {
        quote: 'Finally, a platform that gives us complete visibility into our AI spending across all providers.',
        author: 'Michael Rodriguez',
        role: 'Engineering Lead',
        company: 'TechCorp',
        avatar: null
      },
      {
        quote: 'The forecasting feature helped us plan our infrastructure budget for the next quarter.',
        author: 'Emily Watson',
        role: 'Product Manager',
        company: 'DataFlow AI',
        avatar: null
      }
    ]
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Find answers to common questions about our platform.',
    items: [
      {
        question: 'How does the pricing work?',
        answer: 'We offer tiered pricing based on your usage. You can choose from our Free, Starter, Professional, or Enterprise plans depending on your needs. Each plan includes a set number of tokens and features.'
      },
      {
        question: 'Can I track multiple AI providers?',
        answer: 'Yes! Our platform supports 15+ AI providers including OpenAI, Anthropic, Google AI, Meta, Mistral, and more. You can manage all your API keys and track usage from a single dashboard.'
      },
      {
        question: 'Is my API key secure?',
        answer: 'Absolutely. We use enterprise-grade encryption to store your API keys. Keys are encrypted at rest and in transit. We never expose your keys in logs or dashboards.'
      },
      {
        question: 'Can I cancel my subscription anytime?',
        answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period. We also offer a 14-day free trial on all paid plans.'
      },
      {
        question: 'Do you offer custom enterprise plans?',
        answer: 'Yes, we offer custom enterprise plans for organizations with specific needs. Contact our sales team to discuss your requirements and get a tailored solution.'
      }
    ]
  },
  cta: {
    title: 'Ready to Optimize Your AI Costs?',
    subtitle: 'Join thousands of companies already managing their AI infrastructure with TokenManager.',
    primaryButton: 'Start Free Trial',
    secondaryButton: 'Contact Sales'
  },
  features: {
    title: 'Everything You Need to Manage AI Costs',
    subtitle: 'Powerful features designed to help you track, analyze, and optimize your AI API usage across all providers.',
    items: [
      {
        id: 1,
        title: 'Real-Time Token Tracking',
        description: 'Monitor your AI API token usage in real-time across all providers. Get instant insights into consumption patterns.',
        icon: 'chart',
        category: 'tracking',
        color: 'blue'
      },
      {
        id: 2,
        title: 'Cost Calculation Engine',
        description: 'Accurately calculate AI costs with our advanced pricing engine. Support for tiered, usage-based, and hybrid pricing models.',
        icon: 'currency',
        category: 'analytics',
        color: 'green'
      },
      {
        id: 3,
        title: 'Multi-Provider Support',
        description: 'Manage AI models from OpenAI, Anthropic, Google, Meta, and 15+ providers in one unified dashboard.',
        icon: 'server',
        category: 'management',
        color: 'purple'
      },
      {
        id: 4,
        title: 'Dynamic Pricing Configuration',
        description: 'Configure custom pricing models, tiered rates, and promotional discounts for your subscription plans.',
        icon: 'settings',
        category: 'management',
        color: 'orange'
      },
      {
        id: 5,
        title: 'Usage Analytics Dashboard',
        description: 'Visualize your API usage patterns with interactive charts, trends, and detailed breakdowns.',
        icon: 'analytics',
        category: 'analytics',
        color: 'indigo'
      },
      {
        id: 6,
        title: 'Forecasting & Growth Analytics',
        description: 'Predict future costs and usage trends with AI-powered forecasting. Plan your budget with confidence.',
        icon: 'trending',
        category: 'analytics',
        color: 'cyan'
      },
      {
        id: 7,
        title: 'Scenario Simulation',
        description: 'Run what-if scenarios to compare pricing models and predict outcomes before making changes.',
        icon: 'calculator',
        category: 'optimization',
        color: 'pink'
      },
      {
        id: 8,
        title: 'Break-Even Analysis',
        description: 'Understand when your AI investments become profitable with detailed break-even calculations.',
        icon: 'lightning',
        category: 'analytics',
        color: 'yellow'
      },
      {
        id: 9,
        title: 'Team & Organization Management',
        description: 'Invite team members, assign roles, and manage organization-wide settings with granular permissions.',
        icon: 'users',
        category: 'management',
        color: 'teal'
      },
      {
        id: 10,
        title: 'Cost Optimization Alerts',
        description: 'Get notified when costs exceed thresholds, usage spikes occur, or anomalies are detected.',
        icon: 'bell',
        category: 'optimization',
        color: 'red'
      },
      {
        id: 11,
        title: 'API Key Management',
        description: 'Securely manage API keys for all your AI providers with rotation, expiration, and access controls.',
        icon: 'key',
        category: 'management',
        color: 'gray'
      },
      {
        id: 12,
        title: 'Subscription Plans',
        description: 'Create and manage flexible subscription plans with usage limits, credits, and tiered features.',
        icon: 'credit-card',
        category: 'management',
        color: 'emerald'
      }
    ]
  },
  providers: {
    title: 'Supported AI Providers',
    subtitle: 'Connect and manage AI models from all major providers through a single unified API.',
    showModels: true
  },
  analytics: {
    title: 'Powerful Analytics Dashboard',
    subtitle: 'Get complete visibility into your AI usage and costs',
    features: [
      { title: 'Real-time Monitoring', description: 'Track token usage as it happens' },
      { title: 'Cost Forecasting', description: 'Predict future spending with AI' },
      { title: 'Usage Patterns', description: 'Identify trends and anomalies' },
      { title: 'Break-even Analysis', description: 'Know when you become profitable' }
    ]
  },
  footer: {
    companyName: 'TokenManager',
    tagline: 'The complete platform for managing AI token usage, costs, and subscriptions.',
    socialLinks: [
      { name: 'Twitter', url: 'https://twitter.com/tokenmanager', icon: 'twitter' },
      { name: 'LinkedIn', url: 'https://linkedin.com/company/tokenmanager', icon: 'linkedin' },
      { name: 'GitHub', url: 'https://github.com/tokenmanager', icon: 'github' }
    ],
    productLinks: [
      { label: 'Features', url: '/#features' },
      { label: 'Pricing', url: '/#pricing' },
      { label: 'Providers', url: '/#providers' },
      { label: 'API Documentation', url: '/docs' }
    ],
    companyLinks: [
      { label: 'About Us', url: '/about' },
      { label: 'Careers', url: '/careers' },
      { label: 'Blog', url: '/blog' },
      { label: 'Contact', url: '/contact' }
    ],
    legalLinks: [
      { label: 'Privacy Policy', url: '/privacy' },
      { label: 'Terms of Service', url: '/terms' },
      { label: 'Cookie Policy', url: '/cookies' }
    ]
  }
});

// Initialize default content if not exists
landingPageContentSchema.statics.initializeDefaults = async function() {
  const defaults = this.getDefaultContent();
  const session = await this.startSession();

  try {
    session.startTransaction();

    for (const [section, content] of Object.entries(defaults)) {
      const existing = await this.findOne({ section });
      if (!existing) {
        await this.create({ section, content });
      }
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return await this.getActiveContent();
};

const LandingPageContent = mongoose.model('LandingPageContent', landingPageContentSchema);

export default LandingPageContent;