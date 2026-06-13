/**
 * Admin Landing Page Content Editor
 *
 * Allows superadmin to edit landing page content dynamically.
 */

import { useState, useEffect, useRef } from 'react';
import api from '../../services/api/axios.js';
import { showToast } from '../../utils/toasts.js';

const AdminLandingPageContent = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchedRef = useRef(false);

  // Track last add time to prevent double-adds
  const lastAddTimeRef = useRef(0);

  const sections = [
    { id: 'hero', label: 'Hero Section', icon: '🏠' },
    { id: 'features', label: 'Features', icon: '⚡' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
    { id: 'footer', label: 'Footer', icon: '📋' }
  ];

  useEffect(() => {
    // Prevent double fetch in React StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
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
      showToast.error('Failed to load landing page content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to clean content (trim strings, remove empty values)
  const cleanContent = (data) => {
    if (typeof data === 'string') {
      const trimmed = data.trim();
      return trimmed === '' ? null : trimmed;
    }

    if (Array.isArray(data)) {
      return data
        .map(item => cleanContent(item))
        .filter(item => {
          if (item === null || item === undefined) return false;
          if (typeof item === 'object' && !Array.isArray(item)) {
            // For objects, check if they have at least one non-empty property
            return Object.values(item).some(val => {
              if (typeof val === 'string') return val.trim() !== '';
              if (typeof val === 'number') return true;
              if (typeof val === 'boolean') return true;
              return val !== null && val !== undefined;
            });
          }
          return true;
        });
    }

    if (typeof data === 'object' && data !== null) {
      const cleaned = {};
      for (const key in data) {
        const value = cleanContent(data[key]);
        // Only include non-null values
        if (value !== null && value !== undefined) {
          cleaned[key] = value;
        }
      }
      // Return null if object is empty after cleaning
      return Object.keys(cleaned).length > 0 ? cleaned : null;
    }

    return data;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Clean the content before saving (trim strings, remove empty values)
      const cleanedContent = cleanContent(content[activeSection]);

      const response = await api.put(`/admin/landing-content/${activeSection}`, {
        content: cleanedContent || {}
      });

      if (response.data.success) {
        showToast.success('Content saved successfully!');
      }
    } catch (err) {
      showToast.error('Failed to save content');
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

      const response = await api.post(`/admin/landing-content/${activeSection}/reset`);

      if (response.data.success) {
        setContent(prev => ({
          ...prev,
          [activeSection]: response.data.data.content
        }));
        showToast.success('Content reset to default successfully!');
      }
    } catch (err) {
      showToast.error('Failed to reset content');
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

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = [];
        }
        current[keys[i]] = [...current[keys[i]]]; // Create a new array reference
        current = current[keys[i]];
      }

      // Create a new array for the final level
      const array = [...(current[keys[keys.length - 1]] || [])];
      if (array[index]) {
        array[index] = { ...array[index], [field]: value };
      }
      current[keys[keys.length - 1]] = array;

      return newContent;
    });
  };

  const addArrayItem = (section, arrayPath, template) => {
    // Prevent rapid double-adds (within 100ms)
    const now = Date.now();
    if (now - lastAddTimeRef.current < 100) {
      return;
    }
    lastAddTimeRef.current = now;

    setContent(prev => {
      const newContent = { ...prev };
      const keys = arrayPath.split('.');
      let current = newContent[section];

      // Navigate through the path, creating new references
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = [];
        }
        current[keys[i]] = [...current[keys[i]]];
        current = current[keys[i]];
      }

      // Create a new array for the final level with the new item at the TOP
      const lastKey = keys[keys.length - 1];
      const existingArray = current[lastKey] || [];
      current[lastKey] = [{ ...template }, ...existingArray];

      return newContent;
    });
  };

  const removeArrayItem = (section, arrayPath, index) => {
    setContent(prev => {
      const newContent = { ...prev };
      const keys = arrayPath.split('.');
      let current = newContent[section];

      // Navigate through the path, creating new references
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = [...current[keys[i]]]; // Create a new array reference
        current = current[keys[i]];
      }

      // Create a new array without the removed item
      const lastKey = keys[keys.length - 1];
      const existingArray = current[lastKey] || [];
      current[lastKey] = existingArray.filter((_, i) => i !== index);

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
          {/* Action Buttons - Moved to Top */}
          <div className="mb-6 pb-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
            <div className="flex gap-3">
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

          {activeSection === 'hero' && content.hero && (
            <HeroEditor
              content={content.hero}
              onUpdate={(path, value) => updateContent('hero', path, value)}
              onUpdateStat={(index, field, value) => updateArrayItem('hero', 'stats', index, field, value)}
            />
          )}

          {activeSection === 'faq' && content.faq && (
            <FAQEditor
              content={content.faq}
              onUpdate={(path, value) => updateContent('faq', path, value)}
              onUpdateItem={(index, field, value) => updateArrayItem('faq', 'items', index, field, value)}
              onAddItem={() => {
                addArrayItem('faq', 'items', { question: '', answer: '' });
                showToast.success('New FAQ added');
              }}
              onRemoveItem={(index) => removeArrayItem('faq', 'items', index)}
            />
          )}

          {activeSection === 'features' && content.features && (
            <FeaturesEditor
              content={content.features}
              onUpdate={(path, value) => updateContent('features', path, value)}
              onUpdateItem={(index, field, value) => updateArrayItem('features', 'items', index, field, value)}
              onAddItem={() => {
                addArrayItem('features', 'items', { id: Date.now(), title: '', description: '', icon: 'star', category: 'management', color: 'blue' });
                showToast.success('New feature added');
              }}
              onRemoveItem={(index) => removeArrayItem('features', 'items', index)}
            />
          )}

          {activeSection === 'analytics' && content.analytics && (
            <AnalyticsEditor
              content={content.analytics}
              onUpdate={(path, value) => updateContent('analytics', path, value)}
              onUpdateItem={(index, field, value) => updateArrayItem('analytics', 'features', index, field, value)}
              onAddItem={() => {
                addArrayItem('analytics', 'features', { title: '', description: '' });
                showToast.success('New analytics feature added');
              }}
              onRemoveItem={(index) => removeArrayItem('analytics', 'features', index)}
            />
          )}

          {activeSection === 'footer' && content.footer && (
            <FooterEditor
              content={content.footer}
              onUpdateSocialLink={(index, field, value) => updateArrayItem('footer', 'socialLinks', index, field, value)}
              onAddSocialLink={() => {
                addArrayItem('footer', 'socialLinks', { name: '', url: 'https://', icon: 'twitter' });
                showToast.success('New social link added');
              }}
              onRemoveSocialLink={(index) => removeArrayItem('footer', 'socialLinks', index)}
            />
          )}
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Title <span className="text-gray-400 text-xs">({content.title?.length || 0}/30 characters)</span>
      </label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        maxLength={30}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
      <p className="text-xs text-gray-400 mt-1">Maximum 30 characters</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Title Highlight <span className="text-gray-400 text-xs">({content.titleHighlight?.length || 0}/30 characters)</span>
      </label>
      <input
        type="text"
        value={content.titleHighlight || ''}
        onChange={(e) => onUpdate('titleHighlight', e.target.value)}
        maxLength={30}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
      <p className="text-xs text-gray-400 mt-1">Maximum 30 characters</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Subtitle <span className="text-gray-400 text-xs">({content.subtitle?.length || 0}/200 characters)</span>
      </label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        maxLength={200}
        rows={3}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none overflow-y-auto"
      />
      <p className="text-xs text-gray-400 mt-1">Maximum 200 characters</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Stats</label>
      <div className="space-y-4">
        {(content.stats || []).map((stat, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Label <span className="text-gray-400">({stat.label?.length || 0}/25)</span>
                </label>
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => onUpdateStat(index, 'label', e.target.value)}
                  maxLength={25}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Value <span className="text-gray-400">(max 4 digits)</span>
                  </label>
                  <input
                    type="text"
                    value={stat.value}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      onUpdateStat(index, 'value', value);
                    }}
                    maxLength={4}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                    placeholder="e.g., 40, 9999"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Symbol</label>
                  <select
                    value={stat.suffix || ''}
                    onChange={(e) => onUpdateStat(index, 'suffix', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  >
                    <option value="">None</option>
                    <option value="%">%</option>
                    <option value="K">K</option>
                    <option value="M">M</option>
                    <option value="B">B</option>
                    <option value="+">+</option>
                  </select>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Description <span className="text-gray-400">({stat.description?.length || 0}/25)</span>
                </label>
                <input
                  type="text"
                  value={stat.description}
                  onChange={(e) => onUpdateStat(index, 'description', e.target.value)}
                  maxLength={25}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Preview: <span className="font-medium text-gray-600">{stat.value}{stat.suffix || ''} - {stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// FAQ Editor
let faqAddingInProgress = false;

const FAQEditor = ({ content, onUpdate, onUpdateItem, onAddItem, onRemoveItem }) => {
  const handleAddItem = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent double-add from React StrictMode double-render
    if (faqAddingInProgress) return;
    faqAddingInProgress = true;

    onAddItem();

    // Reset after a short delay
    setTimeout(() => {
      faqAddingInProgress = false;
    }, 100);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">FAQ Section</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-gray-400 text-xs">({content.title?.length || 0}/50)</span>
        </label>
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => onUpdate('title', e.target.value)}
          maxLength={50}
          placeholder="Enter section title (leave empty to hide on landing page)"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
        />
        <p className="text-xs text-gray-400 mt-1">Maximum 50 characters. Leave empty to hide title on landing page.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subtitle <span className="text-gray-400 text-xs">({content.subtitle?.length || 0}/200)</span>
        </label>
        <textarea
          value={content.subtitle || ''}
          onChange={(e) => onUpdate('subtitle', e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Enter section subtitle (leave empty to hide on landing page)"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none overflow-y-auto"
        />
        <p className="text-xs text-gray-400 mt-1">Maximum 200 characters. Leave empty to hide subtitle on landing page.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">FAQ Items</label>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
          >
            + Add Question
          </button>
        </div>
        <div className="space-y-4">
          {(content.items || []).map((item, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveItem(index);
                }}
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
                    value={item.question || ''}
                    onChange={(e) => onUpdateItem(index, 'question', e.target.value)}
                    maxLength={100}
                    placeholder="Enter your question here"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Answer</label>
                  <textarea
                    value={item.answer || ''}
                    onChange={(e) => onUpdateItem(index, 'answer', e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder="Enter the answer here"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 resize-none overflow-y-auto"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// CTA Editor
// Features Editor
const FeaturesEditor = ({ content, onUpdate, onUpdateItem, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Features Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Title <span className="text-gray-400 text-xs">({content.title?.length || 0}/40 characters)</span>
      </label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        maxLength={40}
        placeholder="Enter section title"
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
      <p className="text-xs text-gray-400 mt-1">Maximum 40 characters</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Subtitle <span className="text-gray-400 text-xs">({content.subtitle?.length || 0}/100 characters)</span>
      </label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        maxLength={100}
        rows={2}
        placeholder="Enter section subtitle"
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none overflow-y-auto"
      />
      <p className="text-xs text-gray-400 mt-1">Maximum 100 characters</p>
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
                  <label className="block text-xs text-gray-500 mb-1">
                    Title <span className="text-gray-400">({item.title?.length || 0}/25)</span>
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => onUpdateItem(index, 'title', e.target.value)}
                    maxLength={25}
                    placeholder="e.g., Real-Time Tracking"
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
                <label className="block text-xs text-gray-500 mb-1">
                  Description <span className="text-gray-400">({item.description?.length || 0}/200)</span>
                </label>
                <textarea
                  value={item.description}
                  onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Enter feature description..."
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 resize-none overflow-y-auto"
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

// Analytics Editor
const AnalyticsEditor = ({ content, onUpdate, onUpdateItem, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-900">Analytics Section</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Title <span className="text-gray-400 text-xs">({content.title?.length || 0}/50 characters)</span>
      </label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onUpdate('title', e.target.value)}
        maxLength={50}
        placeholder="Enter section title (leave empty to hide on landing page)"
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
      />
      <p className="text-xs text-gray-400 mt-1">Maximum 50 characters. Leave empty to hide title on landing page.</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Subtitle <span className="text-gray-400 text-xs">({content.subtitle?.length || 0}/200 characters)</span>
      </label>
      <textarea
        value={content.subtitle || ''}
        onChange={(e) => onUpdate('subtitle', e.target.value)}
        maxLength={200}
        rows={3}
        placeholder="Enter section subtitle (leave empty to hide on landing page)"
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none overflow-y-auto"
      />
      <p className="text-xs text-gray-400 mt-1">Maximum 200 characters. Leave empty to hide subtitle on landing page.</p>
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
                <label className="block text-xs text-gray-500 mb-1">
                  Title <span className="text-gray-400">({item.title?.length || 0}/50)</span>
                </label>
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) => onUpdateItem(index, 'title', e.target.value)}
                  maxLength={50}
                  placeholder="Enter feature title"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Description <span className="text-gray-400">({item.description?.length || 0}/180)</span>
                </label>
                <textarea
                  value={item.description || ''}
                  onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                  maxLength={180}
                  rows={3}
                  placeholder="Enter feature description"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 resize-none overflow-y-auto"
                />
                <p className="text-xs text-gray-400 mt-1">Maximum 180 characters</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Footer Editor
const FooterEditor = ({
  content,
  onUpdateSocialLink,
  onAddSocialLink,
  onRemoveSocialLink
}) => {
  const handleAddSocialLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAddSocialLink();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Footer Section</h2>
      <p className="text-sm text-gray-500">Manage social media icons displayed in the footer.</p>

      {/* Social Links */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Social Links</label>
          <button
            type="button"
            onClick={handleAddSocialLink}
            className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
          >
            + Add Social Link
          </button>
        </div>
        <div className="space-y-3">
          {(content.socialLinks || []).map((link, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveSocialLink(index);
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={link.name}
                    onChange={(e) => onUpdateSocialLink(index, 'name', e.target.value)}
                    placeholder="e.g., Twitter"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Icon</label>
                  <select
                    value={link.icon || 'twitter'}
                    onChange={(e) => onUpdateSocialLink(index, 'icon', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
                  >
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="github">GitHub</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">URL</label>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => onUpdateSocialLink(index, 'url', e.target.value)}
                    placeholder="https://..."
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
};

export default AdminLandingPageContent;