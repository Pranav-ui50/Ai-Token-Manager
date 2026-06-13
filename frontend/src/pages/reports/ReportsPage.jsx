import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import reportApi from '../../services/api/report.api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ReportForm from '../../components/reports/ReportForm';
import { showToast } from '../../utils/toasts.js';

const REPORT_TYPES = [
  { value: 'cost_analysis', label: 'Cost Analysis', description: 'Analyze API and infrastructure costs' },
  { value: 'margin_analysis', label: 'Margin Analysis', description: 'Analyze profit margins by plan' },
  { value: 'profit_forecast', label: 'Profit Forecast', description: 'Forecast future profits' },
  { value: 'usage_report', label: 'Usage Report', description: 'Report on feature usage' },
  { value: 'feature_usage', label: 'Feature Usage', description: 'Detailed feature usage metrics' },
  { value: 'provider_comparison', label: 'Provider Comparison', description: 'Compare AI provider pricing' },
  { value: 'simulation_results', label: 'Simulation Results', description: 'Results from simulations' },
  { value: 'custom', label: 'Custom Report', description: 'Build a custom report' }
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
    isTemplate: 'false'
  });

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  useEffect(() => {
    loadReports();
    loadTemplates();
    loadStats();
  }, [filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.isTemplate) params.isTemplate = filters.isTemplate;

      const response = await reportApi.getReports(params);
      setReports(response.data);
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await reportApi.getTemplates();
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await reportApi.getReportStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleCreateReport = async (data) => {
    try {
      await reportApi.createReport(data);
      setShowCreateModal(false);
      loadReports();
      loadStats();
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to create report');
    }
  };

  const handleGenerateReport = async (id) => {
    try {
      await reportApi.generateReport(id);
      showToast.reportGenerated();
      loadReports();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to generate report');
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      await reportApi.deleteReport(reportToDelete._id);
      setShowDeleteModal(false);
      setReportToDelete(null);
      showToast.reportDeleted();
      loadReports();
      loadStats();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const handleExportReport = async (id, format = 'json') => {
    try {
      const response = await reportApi.exportReport(id, format);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${id}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast.reportExported(format);
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to export report');
    }
  };

  const handleDuplicateReport = async (id) => {
    try {
      await reportApi.duplicateReport(id);
      showToast.success('Report duplicated successfully');
      loadReports();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to duplicate report');
    }
  };

  const getTypeLabel = (type) => {
    const found = REPORT_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate and manage financial reports</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Report
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Reports</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-semibold text-red-600">{stats.failed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Templates</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.templates}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            >
              <option value="">All Types</option>
              {REPORT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Show</label>
            <select
              value={filters.isTemplate}
              onChange={(e) => setFilters({ ...filters, isTemplate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            >
              <option value="false">Reports</option>
              <option value="true">Templates</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search reports..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            />
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new report.</p>
          <div className="mt-6">
            <Button onClick={() => setShowCreateModal(true)}>
              Create Report
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <Link to={`/reports/${report._id}`} className="text-sm font-medium text-blue-600 hover:text-blue-900">
                          {report.name}
                        </Link>
                        {report.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{report.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{getTypeLabel(report.type)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[report.status]}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(report.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {report.status === 'pending' && (
                      <button
                        onClick={() => handleGenerateReport(report._id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Generate
                      </button>
                    )}
                    {report.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleExportReport(report._id, 'json')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Export
                        </button>
                      </>
                    )}
                    <Link to={`/reports/${report._id}`} className="text-gray-600 hover:text-gray-900">
                      View
                    </Link>
                    <button
                      onClick={() => handleDuplicateReport(report._id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        setReportToDelete(report);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Report"
        size="lg"
      >
        <ReportForm
          onSubmit={handleCreateReport}
          onCancel={() => setShowCreateModal(false)}
          templates={templates}
          reportTypes={REPORT_TYPES}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Report"
      >
        <div className="p-6">
          <p className="text-gray-600">
            Are you sure you want to delete "{reportToDelete?.name}"? This action cannot be undone.
          </p>
          <div className="mt-4 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteReport}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ReportsPage;