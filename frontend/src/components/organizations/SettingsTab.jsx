/**
 * Settings Tab Component
 *
 * Organization settings form.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';

function SettingsTab({ organization, organizationId }) {
  const navigate = useNavigate();
  const { updateOrganization, deleteOrganization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: organization.name || '',
    description: organization.description || ''
  });
  const [errors, setErrors] = useState({});

  // Current user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = organization.owner?._id === currentUser._id;

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
    setSuccess('');

    try {
      await updateOrganization(organizationId, formData);
      setSuccess('Organization updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update organization');
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

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteOrganization(organizationId);
      navigate('/organizations');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete organization');
      setShowDeleteModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-sm text-yellow-700">
          Only the organization owner can modify settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Organization Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of your organization"
              className="block w-full px-3 py-2 rounded-md shadow-sm border border-gray-300 focus:border-primary-500 focus:outline-none text-sm"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div className="pt-4">
            <Button type="submit" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-4">
          Once you delete your organization, there is no going back. Please be certain.
        </p>

        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Organization
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Organization
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete <strong>{organization.name}</strong>? This action cannot be undone.
              </p>
              <p className="text-sm text-red-600 mb-4">
                All projects, features, and data associated with this organization will be permanently deleted.
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete} isLoading={isLoading}>
                  Delete Organization
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsTab;