/**
 * Create Organization Form
 *
 * Form for creating a new organization.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';

function CreateOrganizationForm({ onSuccess, onCancel }) {
  const navigate = useNavigate();
  const { createOrganization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const organization = await createOrganization(formData);
      onSuccess?.();
      navigate(`/organizations/${organization._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Input
        label="Organization Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        placeholder="Enter organization name"
        required
        autoFocus
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
          <span className="text-gray-400 ml-1">(optional)</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of your organization"
          rows={3}
          className="block w-full px-3 py-2 rounded-md shadow-sm border border-gray-300 focus:border-primary-500 focus:outline-none text-sm"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Create Organization
        </Button>
      </div>
    </form>
  );
}

export default CreateOrganizationForm;