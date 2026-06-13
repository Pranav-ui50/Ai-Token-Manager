/**
 * Admin Testimonials Management Page
 *
 * Allows Super Admin to manage landing page testimonials.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import testimonialApi from '../../services/api/testimonial.api.js';
import { showToast } from '../../utils/toasts.js';

const AVATAR_COLORS = [
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Amber', value: 'bg-amber-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Pink', value: 'bg-pink-500' }
];

function AdminTestimonialsPage() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    content: '',
    rating: 5.0,
    isVerified: false,
    source: 'requested'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const response = await testimonialApi.getAll();
      setTestimonials(response.data || []);
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
      showToast.error('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (testimonial = null) => {
    if (testimonial) {
      setEditingId(testimonial._id);
      setFormData({
        name: testimonial.name,
        role: testimonial.role,
        company: testimonial.company,
        content: testimonial.content,
        rating: testimonial.rating,
        isVerified: testimonial.isVerified,
        source: testimonial.source || 'requested'
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        role: '',
        company: '',
        content: '',
        rating: 5.0,
        isVerified: false,
        source: 'requested'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.role || !formData.company || !formData.content) {
      showToast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(editingId || 'new');

      if (editingId) {
        await testimonialApi.update(editingId, formData);
        showToast.success('Testimonial updated successfully');
      } else {
        await testimonialApi.create(formData);
        showToast.success('Testimonial created successfully');
      }

      handleCloseModal();
      fetchTestimonials();
    } catch (err) {
      console.error('Failed to save testimonial:', err);
      showToast.error(err.response?.data?.message || 'Failed to save testimonial');
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (id) => {
    try {
      await testimonialApi.toggle(id);
      showToast.success('Testimonial status updated');
      fetchTestimonials();
    } catch (err) {
      console.error('Failed to toggle testimonial:', err);
      showToast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this testimonial?')) {
      return;
    }

    try {
      await testimonialApi.delete(id);
      showToast.success('Testimonial deleted');
      fetchTestimonials();
    } catch (err) {
      console.error('Failed to delete testimonial:', err);
      showToast.error('Failed to delete testimonial');
    }
  };

  const handleReorder = async (dragIndex, hoverIndex) => {
    const newOrder = [...testimonials];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);

    setTestimonials(newOrder);

    try {
      await testimonialApi.reorder(newOrder.map(t => t._id));
    } catch (err) {
      console.error('Failed to reorder:', err);
      showToast.error('Failed to save order');
      fetchTestimonials();
    }
  };

  const moveUp = async (index) => {
    if (index === 0) return;
    const newOrder = [...testimonials];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setTestimonials(newOrder);
    try {
      await testimonialApi.reorder(newOrder.map(t => t._id));
      showToast.success('Order updated');
    } catch (err) {
      showToast.error('Failed to update order');
      fetchTestimonials();
    }
  };

  const moveDown = async (index) => {
    if (index === testimonials.length - 1) return;
    const newOrder = [...testimonials];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setTestimonials(newOrder);
    try {
      await testimonialApi.reorder(newOrder.map(t => t._id));
      showToast.success('Order updated');
    } catch (err) {
      showToast.error('Failed to update order');
      fetchTestimonials();
    }
  };

  const filteredTestimonials = testimonials.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === 'all' ||
                          (filterActive === 'active' && t.isActive) ||
                          (filterActive === 'inactive' && !t.isActive);
    return matchesSearch && matchesFilter;
  });

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading testimonials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
          <p className="text-sm text-gray-500">Manage landing page testimonials</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Testimonial
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, company, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626]"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#DC2626]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Testimonials List */}
      {filteredTestimonials.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No testimonials found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Add your first testimonial to get started'}
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Testimonial
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTestimonials.map((testimonial, index) => (
            <div
              key={testimonial._id}
              className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
                !testimonial.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`${testimonial.avatarColor || 'bg-gray-500'} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-medium text-sm">
                    {testimonial.avatarInitials || testimonial.name?.substring(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{testimonial.name}</h3>
                      <p className="text-sm text-gray-500">{testimonial.role} at {testimonial.company}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(testimonial.rating)}
                    </div>
                  </div>
                  <p className="mt-2 text-gray-600 text-sm line-clamp-2">{testimonial.content}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {testimonial.isVerified && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Verified
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      testimonial.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {testimonial.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-400">Order: {testimonial.displayOrder}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move Up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === filteredTestimonials.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move Down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(testimonial)}
                      className="p-1 text-gray-400 hover:text-[#DC2626]"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(testimonial._id)}
                      className={`p-1 ${testimonial.isActive ? 'text-gray-400 hover:text-yellow-600' : 'text-gray-400 hover:text-green-600'}`}
                      title={testimonial.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {testimonial.isActive ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-3v.01M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a7 7 0 11-14 0 7 7 0 0114 0z" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(testimonial._id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Edit Testimonial' : 'Add Testimonial'}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {editingId ? 'Update testimonial details' : 'Add a new testimonial to display on the landing page'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="Enter full name"
                  maxLength={50}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-400">{formData.name.length}/50</span>
                </div>
              </div>

              {/* Role Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="Enter role/designation"
                  maxLength={50}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-400">{formData.role.length}/50</span>
                </div>
              </div>

              {/* Company Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                  placeholder="Enter company name"
                  maxLength={100}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-400">{formData.company.length}/100</span>
                </div>
              </div>

              {/* Testimonial Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Testimonial <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent resize-none overflow-y-auto"
                  placeholder="Write your experience..."
                  rows={4}
                  maxLength={250}
                  style={{ minHeight: '100px', maxHeight: '150px' }}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-400">{formData.content.length}/250 characters</span>
                </div>
              </div>

              {/* Rating Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-1"
                    >
                      <svg
                        className={`w-6 h-6 ${star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Verified Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={formData.isVerified}
                  onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                />
                <label htmlFor="isVerified" className="text-sm text-gray-700">
                  Mark as verified testimonial
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AdminTestimonialsPage;