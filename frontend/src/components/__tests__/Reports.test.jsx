/**
 * Reports Page Component Tests
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Reports from '../../pages/Reports';
import * as api from '../../services/api';

// Mock API calls
jest.mock('../../services/api', () => ({
  getReports: jest.fn(),
  createReport: jest.fn(),
  getReport: jest.fn(),
  generateReport: jest.fn(),
  deleteReport: jest.fn(),
  exportReportPDF: jest.fn(),
  exportReportExcel: jest.fn()
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

const mockReports = [
  {
    _id: 'report1',
    name: 'Monthly Usage Report',
    type: 'usage',
    status: 'completed',
    createdAt: '2024-01-15T10:00:00Z',
    lastGenerated: '2024-01-20T10:00:00Z'
  },
  {
    _id: 'report2',
    name: 'Revenue Analysis',
    type: 'revenue',
    status: 'pending',
    createdAt: '2024-01-16T10:00:00Z'
  },
  {
    _id: 'report3',
    name: 'Cost Breakdown',
    type: 'cost',
    status: 'completed',
    createdAt: '2024-01-17T10:00:00Z'
  }
];

const mockReportDetail = {
  _id: 'report1',
  name: 'Monthly Usage Report',
  type: 'usage',
  status: 'completed',
  parameters: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    groupBy: 'model'
  },
  results: [
    { model: 'gpt-4', tokens: 50000, cost: 500 },
    { model: 'gpt-3.5-turbo', tokens: 30000, cost: 150 }
  ],
  summary: {
    totalTokens: 80000,
    totalCost: 650
  },
  createdAt: '2024-01-15T10:00:00Z',
  lastGenerated: '2024-01-20T10:00:00Z'
};

const renderReports = () => {
  return render(
    <BrowserRouter>
      <Reports />
    </BrowserRouter>
  );
};

describe('Reports Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getReports.mockResolvedValue({ data: { reports: mockReports, total: 3 } });
    api.getReport.mockResolvedValue({ data: mockReportDetail });
    api.createReport.mockResolvedValue({ data: mockReports[0] });
    api.generateReport.mockResolvedValue({ data: mockReportDetail });
    api.deleteReport.mockResolvedValue({ data: { success: true } });
    api.exportReportPDF.mockResolvedValue({
      data: new Blob(['pdf-content'], { type: 'application/pdf' })
    });
    api.exportReportExcel.mockResolvedValue({
      data: new Blob(['excel-content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    });
  });

  describe('Initial Render', () => {
    it('should render reports title', async () => {
      renderReports();

      expect(screen.getByText(/reports/i)).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      renderReports();

      expect(screen.getByRole('status', { hidden: true }) ||
             screen.queryByTestId('loading-spinner') ||
             screen.getByText(/loading/i, { exact: false })).toBeTruthy();
    });

    it('should fetch reports on mount', async () => {
      renderReports();

      await waitFor(() => {
        expect(api.getReports).toHaveBeenCalled();
      });
    });

    it('should display reports list after loading', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
        expect(screen.getByText('Revenue Analysis')).toBeInTheDocument();
        expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
      });
    });
  });

  describe('Report List', () => {
    it('should display report names', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });
    });

    it('should display report types', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/usage/i)).toBeInTheDocument();
        expect(screen.getByText(/revenue/i)).toBeInTheDocument();
        expect(screen.getByText(/cost/i)).toBeInTheDocument();
      });
    });

    it('should display report statuses', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });
    });

    it('should display creation dates', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/jan 15, 2024/i) ||
               screen.getByText(/jan 16, 2024/i)).toBeInTheDocument();
      });
    });

    it('should support pagination', async () => {
      api.getReports.mockResolvedValue({
        data: {
          reports: mockReports,
          total: 30,
          page: 1,
          totalPages: 3
        }
      });

      renderReports();

      await waitFor(() => {
        expect(screen.getByRole('navigation') ||
               screen.getByText(/page/i)).toBeInTheDocument();
      });
    });

    it('should support filtering by type', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/all types/i) ||
               screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument();
      });

      const typeFilter = screen.getByRole('combobox', { name: /type/i }) ||
                         screen.getByText(/all types/i);
      await user.selectOptions(typeFilter, 'usage');

      await waitFor(() => {
        expect(api.getReports).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'usage' })
        );
      });
    });

    it('should support sorting', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/sort/i) ||
               screen.getByRole('combobox', { name: /sort/i })).toBeInTheDocument();
      });

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      await user.selectOptions(sortSelect, 'name');

      await waitFor(() => {
        expect(api.getReports).toHaveBeenCalled();
      });
    });
  });

  describe('Create Report', () => {
    it('should have create report button', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create report/i }) ||
               screen.getByRole('button', { name: /new report/i })).toBeInTheDocument();
      });
    });

    it('should show create report modal on click', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have form fields for report creation', async () => {
      const user = userEvent.setup();
      renderReports();

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      renderReports();

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit/i }) ||
                           screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i) ||
               screen.getByText(/please fill/i)).toBeInTheDocument();
      });
    });

    it('should create report on form submission', async () => {
      const user = userEvent.setup();
      renderReports();

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'Test Report');
      await user.selectOptions(screen.getByLabelText(/type/i), 'usage');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-01-31');

      const submitButton = screen.getByRole('button', { name: /submit/i }) ||
                           screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.createReport).toHaveBeenCalled();
      });
    });

    it('should close modal after creation', async () => {
      const user = userEvent.setup();
      renderReports();

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/name/i), 'Test Report');
      await user.selectOptions(screen.getByLabelText(/type/i), 'usage');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-01-31');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('View Report Details', () => {
    it('should open report details on click', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article') ||
                          screen.getByText('Monthly Usage Report').closest('div[role="button"]');
      await user.click(reportCard);

      await waitFor(() => {
        expect(api.getReport).toHaveBeenCalled();
      });
    });

    it('should display report details in modal', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByText(/report details/i)).toBeInTheDocument();
      });
    });

    it('should display report summary', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByText(/80,000/)).toBeInTheDocument(); // Total tokens
        expect(screen.getByText(/\$650/)).toBeInTheDocument(); // Total cost
      });
    });

    it('should display report results', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByText('gpt-4')).toBeInTheDocument();
        expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();
      });
    });
  });

  describe('Generate Report', () => {
    it('should have generate button in report details', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
      });
    });

    it('should call generate API on click', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /generate/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(api.generateReport).toHaveBeenCalled();
      });
    });

    it('should show loading state during generation', async () => {
      const user = userEvent.setup();
      api.generateReport.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ data: mockReportDetail }), 1000);
      }));

      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /generate/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/generating/i) ||
               screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });
    });
  });

  describe('Export Report', () => {
    it('should have export buttons in report details', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
      });
    });

    it('should export to PDF on click', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      });

      const exportPDFButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportPDFButton);

      await waitFor(() => {
        expect(api.exportReportPDF).toHaveBeenCalled();
      });
    });

    it('should export to Excel on click', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
      });

      const exportExcelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(exportExcelButton);

      await waitFor(() => {
        expect(api.exportReportExcel).toHaveBeenCalled();
      });
    });

    it('should download file on export', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      });

      const exportPDFButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportPDFButton);

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Report', () => {
    it('should have delete button in report details', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog on delete', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm/i) ||
               screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it('should delete report after confirmation', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.deleteReport).toHaveBeenCalled();
      });
    });
  });

  describe('Report Generation Status', () => {
    it('should show completed status', async () => {
      renderReports();

      await waitFor(() => {
        const completedBadges = screen.getAllByText(/completed/i);
        expect(completedBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show pending status', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });
    });

    it('should show last generated date for completed reports', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/jan 20, 2024/i) ||
               screen.getByText(/last generated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accuracy Tests', () => {
    it('should display correct totals in summary', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        // Total tokens should match sum of results
        expect(screen.getByText(/80,000/)).toBeInTheDocument(); // 50k + 30k
        expect(screen.getByText(/\$650/)).toBeInTheDocument(); // 500 + 150
      });
    });

    it('should maintain data consistency across views', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByText(/gpt-4/i)).toBeInTheDocument();
        expect(screen.getByText(/50,000/)).toBeInTheDocument();
        expect(screen.getByText(/\$500/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      api.getReports.mockRejectedValue(new Error('Failed to fetch'));

      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/error/i) ||
               screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should have retry functionality', async () => {
      const user = userEvent.setup();
      api.getReports.mockRejectedValueOnce(new Error('Failed'));
      api.getReports.mockResolvedValueOnce({ data: { reports: mockReports, total: 3 } });

      renderReports();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(api.getReports).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle export errors gracefully', async () => {
      const user = userEvent.setup();
      api.exportReportPDF.mockRejectedValue(new Error('Export failed'));

      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      });

      const exportPDFButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportPDFButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i) ||
               screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should render within acceptable time', async () => {
      const startTime = Date.now();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/reports/i)).toBeInTheDocument();
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle large report lists efficiently', async () => {
      const largeReportList = Array.from({ length: 100 }, (_, i) => ({
        _id: `report${i}`,
        name: `Report ${i}`,
        type: 'usage',
        status: 'completed',
        createdAt: new Date().toISOString()
      }));

      api.getReports.mockResolvedValue({
        data: { reports: largeReportList, total: 100 }
      });

      const startTime = Date.now();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Report 99')).toBeInTheDocument();
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderReports();

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toBeInTheDocument();
      });
    });

    it('should have accessible report cards', async () => {
      renderReports();

      await waitFor(() => {
        const reportCards = screen.getAllByRole('article');
        expect(reportCards.length).toBeGreaterThan(0);
      });
    });

    it('should have accessible modal', async () => {
      const user = userEvent.setup();
      renderReports();

      await waitFor(() => {
        expect(screen.getByText('Monthly Usage Report')).toBeInTheDocument();
      });

      const reportCard = screen.getByText('Monthly Usage Report').closest('article');
      await user.click(reportCard);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('should support keyboard navigation', async () => {
      renderReports();

      await waitFor(() => {
        expect(screen.getByText(/reports/i)).toBeInTheDocument();
      });

      // Tab through interactive elements
      await userEvent.tab();
      expect(document.activeElement).toHaveProperty('role', 'button');
    });
  });
});
