import { useState } from 'react';
import Button from '../common/Button';

function ReportForm({ onSubmit, onCancel, templates = [], reportTypes = [], initialData = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useTemplate, setUseTemplate] = useState(false);

  const [formData, setFormData] = useState(initialData || {
    name: '',
    type: 'cost_analysis',
    description: '',
    parameters: {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      groupBy: 'month',
      currency: 'USD',
      features: [],
      plans: [],
      providers: [],
      models: []
    },
    tags: [],
    isPublic: false,
    schedule: {
      isScheduled: false,
      frequency: 'once',
      recipients: []
    }
  });

  const [tagInput, setTagInput] = useState('');
  const [recipientInput, setRecipientInput] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('parameters.')) {
      const paramPath = name.split('.').slice(1);
      setFormData(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [paramPath[0]]: paramPath.length > 1
            ? { ...prev.parameters[paramPath[0]], [paramPath[1]]: value }
            : value
        }
      }));
    } else if (name.startsWith('schedule.')) {
      const schedulePath = name.split('.').slice(1);
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [schedulePath[0]]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleAddRecipient = () => {
    if (recipientInput.trim() && !formData.schedule.recipients.includes(recipientInput.trim())) {
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          recipients: [...prev.schedule.recipients, recipientInput.trim()]
        }
      }));
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        recipients: prev.schedule.recipients.filter(e => e !== email)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Convert date strings to Date objects
      const submitData = {
        ...formData,
        parameters: {
          ...formData.parameters,
          dateRange: {
            start: new Date(formData.parameters.dateRange.start),
            end: new Date(formData.parameters.dateRange.end)
          }
        }
      };

      await onSubmit(submitData);
    } catch (err) {
      setError(err.message || 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t._id === templateId);
    if (template) {
      setFormData({
        ...template,
        name: `${template.name} - Copy`,
        isTemplate: false,
        templateId: template._id
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Template Selection */}
      {templates.length > 0 && (
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Use a template</span>
          </label>

          {useTemplate && (
            <select
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name} ({template.type})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            placeholder="e.g., Monthly Cost Analysis"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Type *
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
          >
            {reportTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
          placeholder="Describe the purpose of this report..."
        />
      </div>

      {/* Date Range */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              name="parameters.dateRange.start"
              value={formData.parameters.dateRange.start}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              name="parameters.dateRange.end"
              value={formData.parameters.dateRange.end}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            />
          </div>
        </div>
      </div>

      {/* Grouping & Currency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group By
          </label>
          <select
            name="parameters.groupBy"
            value={formData.parameters.groupBy}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            name="parameters.currency"
            value={formData.parameters.currency}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            placeholder="Add a tag..."
          />
          <Button type="button" variant="secondary" onClick={handleAddTag}>
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm flex items-center">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-gray-500 hover:text-gray-700">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Scheduling */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Scheduling</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="schedule.isScheduled"
              checked={formData.schedule.isScheduled}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Schedule this report</span>
          </label>

          {formData.schedule.isScheduled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  name="schedule.frequency"
                  value={formData.schedule.frequency}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRecipient())}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
                    placeholder="email@example.com"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddRecipient}>
                    Add
                  </Button>
                </div>
                {formData.schedule.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.schedule.recipients.map((email, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center">
                        {email}
                        <button type="button" onClick={() => handleRemoveRecipient(email)} className="ml-1 text-blue-500 hover:text-blue-700">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Public Access */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Make this report public within the organization</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Report'}
        </Button>
      </div>
    </form>
  );
}

export default ReportForm;