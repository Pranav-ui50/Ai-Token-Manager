/**
 * Organization Detail Page
 *
 * Displays organization details, members, and settings.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Button from '../../components/common/Button.jsx';
import Tabs from '../../components/common/Tabs.jsx';
import MembersTab from '../../components/organizations/MembersTab.jsx';
import SettingsTab from '../../components/organizations/SettingsTab.jsx';
import Loader from '../../components/common/Loader.jsx';
import Modal from '../../components/common/Modal.jsx';
import organizationApi from '../../services/api/organization.api.js';

function OrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization, isLoading, error, getOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState('members');
  const [localError, setLocalError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      getOrganization(id).catch((err) => {
        console.error('Failed to fetch organization:', err);
        setLocalError(err.message || 'Failed to load organization. Please try again.');
      });
    }
  }, [id, getOrganization]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['members', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (isLoading && !currentOrganization) {
    return <Loader />;
  }

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Organization not found</p>
        <Button className="mt-4" onClick={() => navigate('/organizations')}>
          Back to Organizations
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'members', label: 'Members' },
    { id: 'settings', label: 'Settings' }
  ];

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = currentOrganization.owner?._id === currentUser._id;

  const openEditModal = () => {
    setEditForm({
      name: currentOrganization.name || '',
      description: currentOrganization.description || ''
    });
    setShowEditModal(true);
  };

  const handleEditOrganization = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      await organizationApi.update(id, editForm);
      await getOrganization(id);
      setShowEditModal(false);
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await organizationApi.delete(id);
      navigate('/organizations');
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Failed to delete organization');
      setShowDeleteModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/organizations')}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{currentOrganization.name}</h1>
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                if (isOwner) {
                  setShowDeleteModal(true);
                } else {
                  alert('Only the organization owner can delete this organization.');
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
        {currentOrganization.description && (
          <p className="text-gray-600 mb-4">{currentOrganization.description}</p>
        )}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>
            {currentOrganization.members?.length || 0} members
          </span>
          <span>•</span>
          <span>
            Created {new Date(currentOrganization.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Error message */}
      {(error || localError) && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error || localError}</p>
            <button
              onClick={() => {
                setLocalError('');
                if (id) getOrganization(id);
              }}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          navigate(`?tab=${tab}`, { replace: true });
        }}
      />

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'members' && (
          <MembersTab
            organization={currentOrganization}
            organizationId={id}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            organization={currentOrganization}
            organizationId={id}
          />
        )}
      </div>

      {/* Edit Organization Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Organization"
      >
        <form onSubmit={handleEditOrganization} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              placeholder="Enter organization name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent resize-none"
              placeholder="Enter description (optional)"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Organization Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Organization"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-700">
              Are you sure you want to delete <strong>{currentOrganization.name}</strong>?
            </p>
          </div>
          <p className="text-sm text-gray-500">
            This action cannot be undone. All projects, features, and data associated with this organization will be permanently deleted.
          </p>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteOrganization}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Organization'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default OrganizationDetailPage;