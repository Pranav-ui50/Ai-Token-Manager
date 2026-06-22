/**
 * Reports Page
 *
 * System-generated reports for finance_admin.
 * Reports are automatically generated from Analytics, Invoices, Subscription, and Simulation data.
 * Finance/Admin can view, filter, search, and download reports.
 */

import { useState, useEffect } from 'react';
import Loader from '../../components/common/Loader.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import usePermissions from '../../hooks/usePermissions.js';
import analyticsApi from '../../services/api/analytics.api.js';
import { showToast } from '../../utils/toasts.js';
import jsPDF from 'jspdf';

// Report Content Component - displays formatted report data
function ReportContent({ type, data, formatCurrency, formatNumber }) {
  // Render different content based on report type
  switch (type) {
    case 'financial_summary':
    case 'cost_analysis':
      return <CostAnalysisContent data={data} formatCurrency={formatCurrency} formatNumber={formatNumber} />;

    case 'profitability':
      return <ProfitabilityContent data={data} formatCurrency={formatCurrency} formatNumber={formatNumber} />;

    case 'simulation':
      return <SimulationContent data={data} />;

    case 'invoice':
      return <InvoiceContent data={data} formatCurrency={formatCurrency} />;

    default:
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">Report data will be displayed here once available.</p>
        </div>
      );
  }
}

// Cost Analysis Report Content
function CostAnalysisContent({ data, formatCurrency, formatNumber }) {
  const summary = data?.summary || {};
  const costsByModel = data?.costsByModel || [];
  const costsByProvider = data?.costsByProvider || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalCost || summary.costs?.total || 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Tokens</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(summary.totalTokens || 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Requests</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(summary.totalRequests || 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Features</p>
          <p className="text-xl font-bold text-gray-900">{summary.featureCount || 0}</p>
        </div>
      </div>

      {/* Costs by Model */}
      {costsByModel.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Costs by Model</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tokens</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {costsByModel.map((model, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{model.name || model.model || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(model.cost || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(model.tokens || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(model.requests || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Costs by Provider */}
      {costsByProvider.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Costs by Provider</h4>
          <div className="space-y-3">
            {costsByProvider.map((provider, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{provider.name || provider.provider || 'Unknown'}</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(provider.cost || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {costsByModel.length === 0 && costsByProvider.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">No cost data available yet.</p>
          <p className="text-sm text-gray-400 mt-1">Cost data will appear here after API usage.</p>
        </div>
      )}
    </div>
  );
}

// Profitability Report Content
function ProfitabilityContent({ data, formatCurrency, formatNumber }) {
  const summary = data?.summary || {};
  const features = data?.features || [];
  const topPerformers = data?.topPerformers || [];
  const bottomPerformers = data?.bottomPerformers || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalRevenue || 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Costs</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalCosts || 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Profit</p>
          <p className={`text-xl font-bold ${(summary.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.totalProfit || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Overall Margin</p>
          <p className={`text-xl font-bold ${parseFloat(summary.overallMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.overallMargin || 0}%
          </p>
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Top Performers</h4>
          <div className="space-y-2">
            {topPerformers.slice(0, 5).map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{feature.featureName || feature.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(feature.profit || 0)} profit</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {feature.margin || 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Performers */}
      {bottomPerformers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Bottom Performers</h4>
          <div className="space-y-2">
            {bottomPerformers.slice(0, 5).map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{feature.featureName || feature.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(feature.profit || 0)} profit</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  {feature.margin || 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Features */}
      {features.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4">All Features</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {features.slice(0, 10).map((feature, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{feature.featureName || feature.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.revenue || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(feature.costs?.totalCost || feature.costs || 0)}</td>
                    <td className={`px-4 py-3 text-sm text-right ${(feature.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(feature.profit || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(feature.margin || 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {feature.margin || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data State */}
      {features.length === 0 && topPerformers.length === 0 && bottomPerformers.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-gray-500">No profitability data available yet.</p>
          <p className="text-sm text-gray-400 mt-1">Data will appear here after feature usage.</p>
        </div>
      )}
    </div>
  );
}

// Simulation Report Content
function SimulationContent({ data }) {
  const summary = data?.summary || {};
  const simulations = data?.simulations || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Simulations</p>
          <p className="text-xl font-bold text-gray-900">{summary.total || 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-xl font-bold text-green-600">{summary.completed || 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{summary.pending || 0}</p>
        </div>
      </div>

      {/* No Data State */}
      {simulations.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No simulation data available yet.</p>
          <p className="text-sm text-gray-400 mt-1">Run simulations to see results here.</p>
        </div>
      )}
    </div>
  );
}

// Invoice Report Content
function InvoiceContent({ data, formatCurrency }) {
  const summary = data?.summary || {};
  const invoices = data?.invoices || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Invoices</p>
          <p className="text-xl font-bold text-gray-900">{summary.total || 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Paid</p>
          <p className="text-xl font-bold text-green-600">{summary.paid || 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{summary.pending || 0}</p>
        </div>
      </div>

      {/* No Data State */}
      {invoices.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">No invoice data available yet.</p>
          <p className="text-sm text-gray-400 mt-1">Invoices will appear here after billing activity.</p>
        </div>
      )}
    </div>
  );
}

// System-generated report types
const REPORT_TYPES = [
  {
    id: 'financial_summary',
    label: 'Financial Summary Report',
    description: 'Overview of revenue, costs, and profit margins',
    icon: 'currency-dollar'
  },
  {
    id: 'cost_analysis',
    label: 'Cost Analysis Report',
    description: 'Detailed breakdown of operational costs',
    icon: 'chart-bar'
  },
  {
    id: 'profitability',
    label: 'Profitability Report',
    description: 'Analysis of feature profitability and margins',
    icon: 'trending-up'
  },
  {
    id: 'simulation',
    label: 'Simulation Report',
    description: 'Results and outcomes from simulation runs',
    icon: 'calculator'
  },
  {
    id: 'invoice',
    label: 'Invoice Summary Report',
    description: 'Summary of all invoices and payment status',
    icon: 'document-text'
  }
];

function ReportsPage() {
  const { currentOrganization } = useOrganization();
  const { role } = usePermissions();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  // Report data states
  const [reportData, setReportData] = useState({});

  // Stats
  const [stats, setStats] = useState({
    total: 5,
    completed: 5
  });

  // Filters
  const [reportType, setReportType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected report for viewing
  const [selectedReport, setSelectedReport] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Get organization ID
  const orgId = currentOrganization?._id || currentOrganization?.id;

  useEffect(() => {
    generateSystemReports();
  }, [currentOrganization]);

  const generateSystemReports = async () => {
    setLoading(true);
    try {
      // System-generated reports - these are always available
      const systemReports = REPORT_TYPES.map((type) => ({
        _id: type.id,
        type: type.id,
        name: type.label,
        description: type.description,
        icon: type.icon,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }));

      setReports(systemReports);
      setStats({
        total: systemReports.length,
        completed: systemReports.length
      });
    } catch (err) {
      console.error('Failed to generate reports:', err);
      showToast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Fetch actual report data from API
  const fetchReportData = async (reportType) => {
    try {
      setLoadingReport(true);

      let data = {};

      switch (reportType) {
        case 'financial_summary':
        case 'cost_analysis':
          const costsData = await analyticsApi.getOperationalCosts();
          data = {
            summary: costsData?.summary || costsData?.data?.summary || {},
            costsByModel: costsData?.costsByModel || costsData?.data?.costsByModel || [],
            costsByProvider: costsData?.costsByProvider || costsData?.data?.costsByProvider || []
          };
          break;

        case 'profitability':
          const profitData = await analyticsApi.getFeatureProfitability();
          data = {
            summary: profitData?.summary || profitData?.data?.summary || {},
            features: profitData?.features || profitData?.data?.features || [],
            topPerformers: profitData?.topPerformers || profitData?.data?.topPerformers || []
          };
          break;

        case 'simulation':
          // Simulations data would come from simulation API
          data = {
            summary: { total: 0, completed: 0, pending: 0 },
            simulations: []
          };
          break;

        case 'invoice':
          // Invoice data would come from billing API
          data = {
            summary: { total: 0, paid: 0, pending: 0 },
            invoices: []
          };
          break;

        default:
          const dashboardData = await analyticsApi.getDashboard();
          data = dashboardData?.data || dashboardData || {};
      }

      setReportData(prev => ({
        ...prev,
        [reportType]: data
      }));

      return data;
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      return {};
    } finally {
      setLoadingReport(false);
    }
  };

  const handleViewReport = async (report) => {
    setSelectedReport(report);
    setShowViewModal(true);
    await fetchReportData(report.type);
  };

  const handleExportPDF = async (report) => {
    setExporting(report._id);
    try {
      // Fetch report data first
      const data = await fetchReportData(report.type);

      // Create PDF using jsPDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38); // Red color #DC2626
      doc.text(report.name, margin, yPos);
      yPos += 10;

      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray color
      const reportType = REPORT_TYPES.find(t => t.id === report.type);
      doc.text(reportType?.description || '', margin, yPos);
      yPos += 8;

      // Organization and Date
      doc.setTextColor(55, 65, 81);
      doc.text(`Organization: ${currentOrganization?.name || 'N/A'}`, margin, yPos);
      yPos += 6;
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 15;

      // Add content based on report type
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Report Summary', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);

      switch (report.type) {
        case 'financial_summary':
        case 'cost_analysis':
          const summary = data?.summary || {};
          doc.text(`Total Cost: ${formatCurrency(summary.totalCost || summary.costs?.total || 0)}`, margin, yPos);
          yPos += 7;
          doc.text(`Total Tokens: ${formatNumber(summary.totalTokens || 0)}`, margin, yPos);
          yPos += 7;
          doc.text(`Total Requests: ${formatNumber(summary.totalRequests || 0)}`, margin, yPos);
          yPos += 7;
          doc.text(`Features: ${summary.featureCount || 0}`, margin, yPos);
          yPos += 15;

          // Costs by Model
          const costsByModel = data?.costsByModel || [];
          if (costsByModel.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(31, 41, 55);
            doc.text('Costs by Model', margin, yPos);
            yPos += 10;

            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);
            doc.text('Model', margin, yPos);
            doc.text('Cost', margin + 80, yPos);
            doc.text('Tokens', margin + 110, yPos);
            doc.text('Requests', margin + 140, yPos);
            yPos += 6;

            doc.setTextColor(55, 65, 81);
            costsByModel.forEach((model, index) => {
              if (yPos > 270) {
                doc.addPage();
                yPos = 20;
              }
              const name = (model.name || model.model || 'Unknown').substring(0, 25);
              doc.text(name, margin, yPos);
              doc.text(formatCurrency(model.cost || 0), margin + 80, yPos);
              doc.text(formatNumber(model.tokens || 0), margin + 110, yPos);
              doc.text(formatNumber(model.requests || 0), margin + 140, yPos);
              yPos += 6;
            });
          }
          break;

        case 'profitability':
          const profitSummary = data?.summary || {};
          doc.text(`Total Revenue: ${formatCurrency(profitSummary.totalRevenue || 0)}`, margin, yPos);
          yPos += 7;
          doc.text(`Total Costs: ${formatCurrency(profitSummary.totalCosts || 0)}`, margin, yPos);
          yPos += 7;
          doc.text(`Total Profit: ${formatCurrency(profitSummary.totalProfit || 0)}`, margin, yPos);
          yPos += 7;
          doc.text(`Overall Margin: ${profitSummary.overallMargin || 0}%`, margin, yPos);
          yPos += 15;

          // Features
          const features = data?.features || [];
          if (features.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(31, 41, 55);
            doc.text('Feature Profitability', margin, yPos);
            yPos += 10;

            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);
            doc.text('Feature', margin, yPos);
            doc.text('Revenue', margin + 60, yPos);
            doc.text('Cost', margin + 95, yPos);
            doc.text('Profit', margin + 125, yPos);
            doc.text('Margin', margin + 155, yPos);
            yPos += 6;

            doc.setTextColor(55, 65, 81);
            features.slice(0, 15).forEach((feature, index) => {
              if (yPos > 270) {
                doc.addPage();
                yPos = 20;
              }
              const name = (feature.featureName || feature.name || 'Unknown').substring(0, 20);
              doc.text(name, margin, yPos);
              doc.text(formatCurrency(feature.revenue || 0), margin + 60, yPos);
              doc.text(formatCurrency(feature.costs?.totalCost || feature.costs || 0), margin + 95, yPos);
              doc.text(formatCurrency(feature.profit || 0), margin + 125, yPos);
              doc.text(`${feature.margin || 0}%`, margin + 155, yPos);
              yPos += 6;
            });
          }
          break;

        case 'simulation':
          doc.text('Total Simulations: 0', margin, yPos);
          yPos += 7;
          doc.text('Completed: 0', margin, yPos);
          yPos += 7;
          doc.text('Pending: 0', margin, yPos);
          yPos += 15;
          doc.setTextColor(156, 163, 175);
          doc.text('No simulation data available.', margin, yPos);
          break;

        case 'invoice':
          doc.text('Total Invoices: 0', margin, yPos);
          yPos += 7;
          doc.text('Paid: 0', margin, yPos);
          yPos += 7;
          doc.text('Pending: 0', margin, yPos);
          yPos += 15;
          doc.setTextColor(156, 163, 175);
          doc.text('No invoice data available.', margin, yPos);
          break;

        default:
          doc.text('No data available for this report type.', margin, yPos);
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Generated by API Token Manager - Finance Reports | Page ${i} of ${pageCount}`,
          margin,
          doc.internal.pageSize.getHeight() - 10
        );
      }

      // Save the PDF
      doc.save(`${report.type}_${new Date().toISOString().split('T')[0]}.pdf`);

      showToast.success('Report downloaded as PDF');
    } catch (err) {
      console.error('Export failed:', err);
      showToast.error('Failed to export report');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async (report) => {
    setExporting(report._id);
    try {
      // Fetch report data first
      const data = await fetchReportData(report.type);

      // Generate CSV content (can be opened in Excel)
      const csvContent = generateCSVReport(report, data);

      // Create downloadable CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast.success('Report downloaded as CSV (Excel compatible)');
    } catch (err) {
      console.error('Export failed:', err);
      showToast.error('Failed to export report');
    } finally {
      setExporting(null);
    }
  };

  // Generate CSV content for Excel
  const generateCSVReport = (report, data) => {
    const orgName = currentOrganization?.name || 'Organization';
    const generatedDate = new Date().toISOString();

    let csvContent = `"${report.name}"\n`;
    csvContent += `"Organization","${orgName}"\n`;
    csvContent += `"Generated","${generatedDate}"\n`;
    csvContent += `\n`;

    switch (report.type) {
      case 'financial_summary':
      case 'cost_analysis':
        const summary = data?.summary || {};
        csvContent += `"COST SUMMARY"\n`;
        csvContent += `"Metric","Value"\n`;
        csvContent += `"Total Cost","${summary.totalCost || summary.costs?.total || 0}"\n`;
        csvContent += `"Total Tokens","${summary.totalTokens || 0}"\n`;
        csvContent += `"Total Requests","${summary.totalRequests || 0}"\n`;
        csvContent += `"Features","${summary.featureCount || 0}"\n`;
        csvContent += `\n`;

        const costsByModel = data?.costsByModel || [];
        if (costsByModel.length > 0) {
          csvContent += `"COST BY MODEL"\n`;
          csvContent += `"Model","Cost","Tokens","Requests"\n`;
          costsByModel.forEach(m => {
            csvContent += `"${m.name || m.model || 'Unknown'}","${m.cost || 0}","${m.tokens || 0}","${m.requests || 0}"\n`;
          });
        }
        break;

      case 'profitability':
        const profitSummary = data?.summary || {};
        csvContent += `"PROFITABILITY SUMMARY"\n`;
        csvContent += `"Metric","Value"\n`;
        csvContent += `"Total Revenue","${profitSummary.totalRevenue || 0}"\n`;
        csvContent += `"Total Costs","${profitSummary.totalCosts || 0}"\n`;
        csvContent += `"Total Profit","${profitSummary.totalProfit || 0}"\n`;
        csvContent += `"Overall Margin","${profitSummary.overallMargin || 0}%"\n`;
        csvContent += `\n`;

        const features = data?.features || [];
        if (features.length > 0) {
          csvContent += `"FEATURE PROFITABILITY"\n`;
          csvContent += `"Feature","Revenue","Cost","Profit","Margin"\n`;
          features.forEach(f => {
            csvContent += `"${f.featureName || f.name || 'Unknown'}","${f.revenue || 0}","${f.costs?.totalCost || f.costs || 0}","${f.profit || 0}","${f.margin || 0}%"\n`;
          });
        }
        break;

      case 'simulation':
        csvContent += `"SIMULATION SUMMARY"\n`;
        csvContent += `"No simulation data available"\n`;
        break;

      case 'invoice':
        csvContent += `"INVOICE SUMMARY"\n`;
        csvContent += `"No invoice data available"\n`;
        break;

      default:
        csvContent += `"No data available"\n`;
    }

    return csvContent;
  };

  const formatCurrency = (value) => {
    const num = typeof value === 'object' ? (value.total || value.amount || 0) : (Number(value) || 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatNumber = (value) => {
    const num = typeof value === 'object' ? (value.count || value.total || 0) : (Number(value) || 0);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter reports based on search and type
  const filteredReports = reports.filter(report => {
    const matchesType = !reportType || report.type === reportType;
    const matchesSearch = !searchTerm ||
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Get report icon
  const getReportIcon = (iconType) => {
    switch (iconType) {
      case 'currency-dollar':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'chart-bar':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'trending-up':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'calculator':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'document-text':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">
              System-generated reports from analytics, invoices, subscription, and simulation data
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed Reports</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Report Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
              >
                <option value="">All Report Types</option>
                {REPORT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Reports</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search reports..."
                  maxLength={200}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <Loader text="Loading reports..." />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Reports Found</h3>
            <p className="mt-2 text-gray-500">
              {searchTerm || reportType
                ? 'Try adjusting your search or filter criteria.'
                : 'Reports will be generated automatically from your data.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Report</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => {
                    const reportType = REPORT_TYPES.find(t => t.id === report.type);
                    return (
                      <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <div className="text-[#DC2626]">
                                {getReportIcon(reportType?.icon)}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{report.name}</p>
                              <p className="text-sm text-gray-500">{report.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {reportType?.label || report.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Completed
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(report.lastUpdated)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewReport(report)}
                              className="text-blue-600 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              title="View Report"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportPDF(report)}
                              disabled={exporting === report._id}
                              className="text-red-600 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Download PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportExcel(report)}
                              disabled={exporting === report._id}
                              className="text-green-600 hover:text-green-700 p-1.5 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                              title="Download Excel"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-700 font-medium">System-Generated Reports</p>
              <p className="text-sm text-blue-600">
                These reports are automatically generated from your organization's analytics, invoices, subscription, and simulation data. Reports update automatically when underlying data changes.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* View Report Modal */}
      {showViewModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedReport.name}</h2>
                  <p className="text-sm text-gray-500">{selectedReport.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingReport ? (
                <div className="flex items-center justify-center py-12">
                  <Loader />
                  <p className="ml-3 text-gray-500">Loading report data...</p>
                </div>
              ) : (
                <>
                  {/* Report Content */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Report Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-medium text-gray-900">{REPORT_TYPES.find(t => t.id === selectedReport.type)?.label}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Status</p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Completed
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500">Generated</p>
                          <p className="font-medium text-gray-900">{formatDate(selectedReport.generatedAt)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Last Updated</p>
                          <p className="font-medium text-gray-900">{formatDate(selectedReport.lastUpdated)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Report Data */}
                    {reportData[selectedReport.type] && (
                      <ReportContent
                        type={selectedReport.type}
                        data={reportData[selectedReport.type]}
                        formatCurrency={formatCurrency}
                        formatNumber={formatNumber}
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportPDF(selectedReport);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportExcel(selectedReport);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowViewModal(false)}
                      className="px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;