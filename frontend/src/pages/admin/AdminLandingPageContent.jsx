/**
 * Admin Landing Page Content Editor
 *
 * Allows superadmin to edit landing page content dynamically.
 */

import { useState, useEffect } from 'react';
import api from '../../services/api/axios.js';

const AdminLandingPageContent = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const sections = [
    { id: 'hero', label: 'Hero Section', icon: '🏠' },
    { id: 'features', label: 'Features', icon: '⚡' },
    { id: 'howItWorks', label: 'How It Works', icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'providers', label: 'Providers', icon: '🔌' },
    { id: 'testimonials', label: 'Testimonials', icon: '💬' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
    { id: 'cta', label: 'Call to Action', icon: '📢' }
  ];

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await api.get('/public/landing-content');
      if (response.data.success) {
        setContent(response.data.data);
      }
    } catch (err) {
      setError('Failed to load landing page content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await api.put(`/admin/landing-content/${activeSection}`, {
        content: content[activeSection]
      });

      if (response.data.success) {
        setSuccess('Content saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to save content');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset this section to default?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await api.post(`/admin/landing-content/${activeSection}/reset`);

      if (response.data.success) {
        setContent(prev => ({
          ...prev,
          [activeSection]: response.data.data.content
        }));
        setSuccess('Content reset to default successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to reset content');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (section, path, value) => {
    setContent(prev => {
      const newContent = { ...prev };
      const keys = path.split('.');
      let current = newContent[section];

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newContent;
    });
  };

  const updateArrayItem = (section, arrayPath, index, field, value) => {
    setContent(prev => {
      const newContent = { ...prev };
      const keys = arrayPath.split('.');
      let current = newContent[section];

      for (const key of keys) {
        current = current[key];
      }

      if (current[index]) {
        current[index][field] = value;
      }

      return newContent;
    });
  };

  const addArrayItem = (section, arrayPath, template) => {
    setContent(prev => {
      const newContent = { ...prev };
      const keys = arrayPath.split('.');
      let current = newContent[section];

      for (const key of keys) {
        if (!current[key]) {
          current[key] = [];
        }
        current = current[key];
      }

      current.push(template);
      return newContent;
    });
  };

  const removeArrayItem = (section, arrayPath, index) => {
    setContent(prev => {
      const newContent = { ...prev };
      const keys = arrayPath.split('.');
      let current = newContent[section];

      for (const key of keys) {
        current = current[key];
      }

      current.splice(index, 1);
      return newContent;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Landing Page Content</h1>
        <p className="text-gray-600 mt-1">Manage the content displayed on your public landing page.</p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Section Tabs */}
        <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Sections</h2>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-red-50 text-[#DC2626] font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Editor */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeSection === 'hero' && content.hero && (
            <HeroEditor
              content={content.hero}
              onUpdate={(path, value) => updateContent('hero', path, value)}
              onUpdateStat={(index, field, value) => updateArrayItem('hero', 'stats', index, field, value)}
            />
          )}

          {activeSection === 'howItWorks' && content.howItWorks && (
            <HowItWorksEditor
              content={content.howItWorks}
              onUpdate={(path, value) => updateContent('howItWorks', path, value)}
              onUpdateStep={(index, field, value) => updateArrayItem('howItWorks', 'steps', index, field, value)}
              onAddStep={() => addArrayItem('howItWorks', 'steps', { number: String(content.howItWorks.steps.length + 1).padStart(2, '0'), title: 'New Step', description: 'Step description', icon: 'star' })}
              onRemoveStep={(index) => removeArrayItem('howItWorks', 'steps', index)}
            />
          )}

          {activeSection === 'testimonials' && content.testimonials && (
            <TestimonialsEditor
              content={content.testimonials}
              onUpdate={(path, value) => updateContent('testimonials', path, value)}
              onUpdateItem={(index, field, value) => updateArrayItem('testimonials', 'items', index, field, value)}
              onAddItem={() => addArrayItem('testimonials', 'items', { quote: '', author: 'Name', role: 'Role', company: 'Company', avatar: null })}
              onRemoveItem={(index) => removeArrayItem('testimonials', 'items', index)}
            />
          )}

          {activeSection === 'faq' && content.faq && (
            <FAQEditor
              content={content.faq}
              onUpdate={(path, value) => updateContent('faq', path, value)}
              onUpdateItem={(index, field, value) => updateArrayItem('faq', 'items', index, field, value)}
              onAddItem={() => addArrayItem('faq', 'items', { question: 'New Question?', answer: 'Answer to the question.' })}
              onRemoveItem={(index) => removeArrayItem('faq', 'items', index)}
            />
          )}

          {activeSection === 'cta' && content.cta && (
            <CTAEditor
              content={content.cta}
              onUpdate={(path, value) => updateContent('cta', path, value)}
            />
          )}

          {activeSection === 'features' && content.features && (
            <FeaturesEditor
              content={content.features}
              onUpdate={(path, value) => updateContent('features', path, value)}
              onUpdateItem={(index, field, value) => updateArrayItem('features', 'items', index, field, value)}
              onAddItem={() => addArrayItem('features', 'items', { id: Date.now(), title: 'New Feature', description: 'Feature description', icon: 'star', category: 'management', color: 'blue' })}
              onRemoveItem={(index) => removeArrayItem('features', 'items', index)}
            />
          )}

          {activeSection === 'providers' && content.providers && (
            <ProvidersEditor
              content={content.providers}
              onUpdate={(path, value) => updateContent('providers', path, value)}
            />
          )}

          {activeSection === 'analytics' && content.analytics && (
            <AnalyticsEditor
              content={content.analytics}
              onUpdate={(path, value) => updateContent('analytics', path, value)}
              onUpdateItem={(index, field, value) => updateArrayItem('analytics', 'features', index, field, value)}
              onAddItem={() => addArrayItem('analytics', 'features', { title: 'New Feature', description: 'Feature description' })}
              onRemoveItem={(index) => removeArrayItem('analytics', 'features', index)}
            />
          )}

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hero Section Editor
const HeroEditor = ({ content, onUpdate, onUpdateStat }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Hero Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title Highlight</label>
      <input
        type="text"
        value={content.titleHighlight || ''}
        onChange={(e) => onUpdate('titleHighlight', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={3}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Primary CTA Button</label>
      <input
        type="text"
        value={content.ctaButton || ''}
        onChange={(e) => onUpdate('ctaButton', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary CTA Button</label>
      <input
        type="text"
        value={content.secondaryCta || ''}
        onChange={(e) => onUpdate('secondaryCta', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Stats</label>
      <div className="space-y-4">
        {(content.stats || []).map((stat, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => onUpdateStat(index, 'label', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => onUpdateStat(index, 'value', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={stat.description}
                  onChange={(e) => onUpdateStat(index, 'description', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// How It Works Editor
const HowItWorksEditor = ({ content, onUpdate, onUpdateStep, onAddStep, onRemoveStep }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">How It Works Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">Steps</label>
        <button
          onClick={onAddStep}
          className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
        >
          + Add Step
        </button>
      </div>
      <div className="space-y-4">
        {(content.steps || []).map((step, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
            <button
              onClick={() => onRemoveStep(index)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Number</label>
                  <input
                    type="text"
                    value={step.number}
                    onChange={(e) => onUpdateStep(index, 'number', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => onUpdateStep(index, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  value={step.description}
                  onChange={(e) => onUpdateStep(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Testimonials Editor
const TestimonialsEditor = ({ content, onUpdate, onUpdateItem, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Testimonials Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">Testimonials</label>
        <button
          onClick={onAddItem}
          className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
        >
          + Add Testimonial
        </button>
      </div>
      <div className="space-y-4">
        {(content.items || []).map((item, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
            <button
              onClick={() => onRemoveItem(index)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quote</label>
                <textarea
                  value={item.quote}
                  onChange={(e) => onUpdateItem(index, 'quote', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Author</label>
                  <input
                    type="text"
                    value={item.author}
                    onChange={(e) => onUpdateItem(index, 'author', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Role</label>
                  <input
                    type="text"
                    value={item.role}
                    onChange={(e) => onUpdateItem(index, 'role', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Company</label>
                  <input
                    type="text"
                    value={item.company}
                    onChange={(e) => onUpdateItem(index, 'company', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// FAQ Editor
const FAQEditor = ({ content, onUpdate, onUpdateItem, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">FAQ Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">FAQ Items</label>
        <button
          onClick={onAddItem}
          className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
        >
          + Add Question
        </button>
      </div>
      <div className="space-y-4">
        {(content.items || []).map((item, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
            <button
              onClick={() => onRemoveItem(index)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Question</label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => onUpdateItem(index, 'question', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Answer</label>
                <textarea
                  value={item.answer}
                  onChange={(e) => onUpdateItem(index, 'answer', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// CTA Editor
const CTAEditor = ({ content, onUpdate }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Call to Action Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={3}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Button Text</label>
      <input
        type="text"
        value={content.primaryButton || ''}
        onChange={(e) => onUpdate('primaryButton', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Button Text</label>
      <input
        type="text"
        value={content.secondaryButton || ''}
        onChange={(e) => onUpdate('secondaryButton', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>
  </div>
);

// Features Editor
const FeaturesEditor = ({ content, onUpdate, onUpdateItem, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Features Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">Features</label>
        <button
          onClick={onAddItem}
          className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
        >
          + Add Feature
        </button>
      </div>
      <div className="space-y-4">
        {(content.items || []).map((item, index) => (
          <div key={item.id || index} className="p-4 bg-gray-50 rounded-lg relative">
            <button
              onClick={() => onRemoveItem(index)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => onUpdateItem(index, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select
                    value={item.category || 'management'}
                    onChange={(e) => onUpdateItem(index, 'category', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  >
                    <option value="tracking">Tracking</option>
                    <option value="analytics">Analytics</option>
                    <option value="management">Management</option>
                    <option value="optimization">Optimization</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  value={item.description}
                  onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Icon</label>
                  <select
                    value={item.icon || 'star'}
                    onChange={(e) => onUpdateItem(index, 'icon', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  >
                    <option value="chart">Chart</option>
                    <option value="currency">Currency</option>
                    <option value="server">Server</option>
                    <option value="settings">Settings</option>
                    <option value="analytics">Analytics</option>
                    <option value="trending">Trending</option>
                    <option value="calculator">Calculator</option>
                    <option value="lightning">Lightning</option>
                    <option value="users">Users</option>
                    <option value="bell">Bell</option>
                    <option value="key">Key</option>
                    <option value="credit-card">Credit Card</option>
                    <option value="star">Star</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color</label>
                  <select
                    value={item.color || 'blue'}
                    onChange={(e) => onUpdateItem(index, 'color', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                    <option value="orange">Orange</option>
                    <option value="indigo">Indigo</option>
                    <option value="cyan">Cyan</option>
                    <option value="pink">Pink</option>
                    <option value="yellow">Yellow</option>
                    <option value="teal">Teal</option>
                    <option value="red">Red</option>
                    <option value="gray">Gray</option>
                    <option value="emerald">Emerald</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Providers Editor
const ProvidersEditor = ({ content, onUpdate }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Providers Section</h2>
    <p className="text-sm text-gray-500">This section displays AI providers dynamically from the database. You can customize the section title and subtitle below.</p>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id="showModels"
        checked={content.showModels || false}
        onChange={(e) => onUpdate('showModels', e.target.checked)}
        className="w-4 h-4 text-[#DC2626] rounded focus:ring-[#DC2626]"
      />
      <label htmlFor="showModels" className="text-sm text-gray-700">Show model count for each provider</label>
    </div>
  </div>
);

// Analytics Editor
const AnalyticsEditor = ({ content, onUpdate, onUpdateItem, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Analytics Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        rows={2}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">Features</label>
        <button
          onClick={onAddItem}
          className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
        >
          + Add Feature
        </button>
      </div>
      <div className="space-y-4">
        {(content.features || []).map((item, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
            <button
              onClick={() => onRemoveItem(index)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => onUpdateItem(index, 'title', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default AdminLandingPageContent;