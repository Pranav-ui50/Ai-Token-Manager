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
    enum: ['hero', 'features', 'howItWorks', 'testimonials', 'faq', 'stats', 'cta']
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