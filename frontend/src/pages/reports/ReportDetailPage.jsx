import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import reportApi from '../../services/api/report.api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const REPORT_TYPES = {
  cost_analysis: 'Cost Analysis',
  margin_analysis: 'Margin Analysis',
  profit_forecast: 'Profit Forecast',
  usage_report: 'Usage Report',
  feature_usage: 'Feature Usage',
  provider_comparison: 'Provider Comparison',
  simulation_results: 'Simulation Results',
  custom: 'Custom Report'
};

function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmails, setShareEmails] = useState('');

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getReport(id);
      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const response = await reportApi.generateReport(id);
      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportApi.exportReport(id, exportFormat);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.name.replace(/\s+/g, '_')}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export report');
    }
  };

  const handleShare = async () => {
    try {
      const emails = shareEmails.split(',').map(e => e.trim()).filter(e => e);
      // Note: This would need to convert emails to user IDs in a real implementation
      // For now, we'll just show success
      setShowShareModal(false);
      setShareEmails('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share report');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      await reportApi.deleteReport(id);
      navigate('/reports');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Helper to safely get entries from Map or Object
  const getEntries = (data) => {
    if (!data) return [];
    if (data instanceof Map) {
      return Array.from(data.entries());
    }
    if (typeof data === 'object') {
      return Object.entries(data);
    }
    return [];
  };

  // Helper to safely get values from Map or Object
  const getValues = (data) => {
    if (!data) return [];
    if (data instanceof Map) {
      return Array.from(data.values());
    }
    if (typeof data === 'object') {
      return Object.values(data);
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Report not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{report.name}</h1>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[report.status]}`}>
              {report.status}
            </span>
          </div>
          <p className="text-gray-600 mt-1">{report.description}</p>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <span>Type: {REPORT_TYPES[report.type]}</span>
            <span>Created: {formatDate(report.createdAt)}</span>
            {report.file?.generatedAt && (
              <span>Generated: {formatDate(report.file.generatedAt)}</span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {report.status === 'pending' && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          )}
          {report.status === 'completed' && (
            <>
              <Button variant="secondary" onClick={() => setShowExportModal(true)}>
                Export
              </Button>
              <Button variant="secondary" onClick={() => setShowShareModal(true)}>
                Share
              </Button>
            </>
          )}
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {report.status === 'failed' && report.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800">Error</h3>
          <p className="text-red-700 mt-1">{report.error.message}</p>
          {report.error.stack && (
            <pre className="mt-2 text-xs text-red-600 overflow-auto bg-red-100 p-2 rounded">
              {report.error.stack}
            </pre>
          )}
        </div>
      )}

      {/* Parameters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Date Range</p>
            <p className="font-medium">
              {formatDate(report.parameters?.dateRange?.start)} - {formatDate(report.parameters?.dateRange?.end)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Group By</p>
            <p className="font-medium capitalize">{report.parameters.groupBy || 'month'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Currency</p>
            <p className="font-medium">{report.parameters.currency || 'USD'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Is Template</p>
            <p className="font-medium">{report.isTemplate ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {report.parameters.features?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Features</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {report.parameters.features.map((feature, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {feature.name || feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {report.parameters.plans?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Plans</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {report.parameters.plans.map((plan, index) => (
                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  {plan.name || plan}
                </span>
              ))}
            </div>
          </div>
        )}

        {report.tags?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Tags</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {report.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Data */}
      {report.status === 'completed' && report.data && (
        <>
          {/* Summary */}
          {report.data.summary && Object.keys(report.data.summary).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getEntries(report.data.summary).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-xl font-semibold mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown */}
          {report.data.breakdown && report.data.breakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcategory</th>
                      {report.data.breakdown[0]?.metrics && getEntries(report.data.breakdown[0].metrics).map(([key]) => (
                        <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.data.breakdown.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.subcategory}</td>
                        {item.metrics && getValues(item.metrics).map((value, idx) => (
                          <td key={idx} className="px-4 py-3 text-sm text-gray-900">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Time Series */}
          {report.data.timeSeries && report.data.timeSeries.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Time Series</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      {report.data.timeSeries[0]?.metrics && getEntries(report.data.timeSeries[0].metrics).map(([key]) => (
                        <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.data.timeSeries.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.period}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        {item.metrics && getValues(item.metrics).map((value, idx) => (
                          <td key={idx} className="px-4 py-3 text-sm text-gray-900">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Report"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">Select export format:</p>
          <div className="space-y-2">
            {['json', 'csv', 'excel'].map((format) => (
              <label key={format} className="flex items-center">
                <input
                  type="radio"
                  value={format}
                  checked={exportFormat === format}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="mr-2"
                />
                <span className="capitalize">{format}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Report"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">Enter Email IDes to share with (comma-separated):</p>
          <textarea
            value={shareEmails}
            onChange={(e) => setShareEmails(e.target.value)}
            placeholder="email1@example.com, email2@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none "
            rows={3}
          />
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowShareModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare}>
              Share
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ReportDetailPage;