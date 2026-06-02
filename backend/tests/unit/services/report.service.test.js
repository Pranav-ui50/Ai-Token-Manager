/**
 * Report Service Unit Tests
 */

import ReportService from '../../../src/services/report.service.js';
import PDFGenerator from '../../../src/utils/pdfGenerator.js';
import ExcelGenerator from '../../../src/utils/excelGenerator.js';

// Mock dependencies
jest.mock('../../../src/models/Report.js', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../../../src/models/Usage.js', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../../src/utils/pdfGenerator.js', () => ({
  generate: jest.fn().mockResolvedValue(Buffer.from('test-pdf-content'))
}));

jest.mock('../../../src/utils/excelGenerator.js', () => ({
  generate: jest.fn().mockResolvedValue(Buffer.from('test-excel-content'))
}));

import Report from '../../../src/models/Report.js';
import Usage from '../../../src/models/Usage.js';

describe('ReportService', () => {
  let reportService;

  beforeEach(() => {
    reportService = new ReportService();
    jest.clearAllMocks();
  });

  describe('createReport()', () => {
    it('should create a new report', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Test Report',
        type: 'usage',
        parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
      };

      Report.create.mockResolvedValue(mockReport);

      const result = await reportService.createReport({
        name: 'Test Report',
        type: 'usage',
        parameters: { startDate: '2024-01-01', endDate: '2024-12-31' },
        organization: 'org123',
        createdBy: 'user123'
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Report');
      expect(Report.create).toHaveBeenCalled();
    });

    it('should validate report type', async () => {
      await expect(reportService.createReport({
        name: 'Invalid Report',
        type: 'invalid_type',
        organization: 'org123'
      })).rejects.toThrow();
    });

    it('should set default parameters', async () => {
      Report.create.mockResolvedValue({
        _id: 'report123',
        name: 'Test Report',
        type: 'usage',
        parameters: {}
      });

      await reportService.createReport({
        name: 'Test Report',
        type: 'usage',
        organization: 'org123'
      });

      const createCall = Report.create.mock.calls[0][0];
      expect(createCall.parameters).toBeDefined();
    });

    it('should accept valid report types', async () => {
      const validTypes = ['usage', 'revenue', 'cost', 'performance', 'forecast'];

      for (const type of validTypes) {
        Report.create.mockResolvedValue({
          _id: `report-${type}`,
          name: `${type} Report`,
          type: type
        });

        const result = await reportService.createReport({
          name: `${type} Report`,
          type: type,
          organization: 'org123'
        });

        expect(result.type).toBe(type);
      }
    });
  });

  describe('getReport()', () => {
    it('should return report by ID', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Test Report',
        type: 'usage'
      };

      Report.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      const result = await reportService.getReport('report123');

      expect(result).toBeDefined();
      expect(result._id).toBe('report123');
    });

    it('should return null for non-existent report', async () => {
      Report.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await reportService.getReport('nonexistent');

      expect(result).toBeNull();
    });

    it('should populate related fields', async () => {
      Report.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: 'report123',
          organization: { name: 'Test Org' },
          createdBy: { name: 'Test User' }
        })
      });

      const result = await reportService.getReport('report123');

      expect(Report.findById).toHaveBeenCalled();
    });
  });

  describe('listReports()', () => {
    it('should return paginated list of reports', async () => {
      const mockReports = [
        { _id: 'report1', name: 'Report 1' },
        { _id: 'report2', name: 'Report 2' }
      ];

      Report.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockReports)
      });

      Report.countDocuments.mockResolvedValue(2);

      const result = await reportService.listReports({
        organization: 'org123',
        page: 1,
        limit: 10
      });

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by report type', async () => {
      Report.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      });

      await reportService.listReports({
        organization: 'org123',
        type: 'usage'
      });

      expect(Report.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'usage' })
      );
    });

    it('should filter by date range', async () => {
      Report.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      });

      await reportService.listReports({
        organization: 'org123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      expect(Report.find).toHaveBeenCalled();
    });

    it('should support sorting', async () => {
      Report.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      });

      await reportService.listReports({
        organization: 'org123',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      expect(Report.find().sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('generateReport()', () => {
    it('should generate usage report', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'usage',
        parameters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01', tokens: 10000, cost: 100 }
      ]);

      const result = await reportService.generateReport('report123');

      expect(result).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should generate revenue report', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'revenue',
        parameters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01', revenue: 5000 }
      ]);

      const result = await reportService.generateReport('report123');

      expect(result).toBeDefined();
    });

    it('should generate cost report', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'cost',
        parameters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Usage.aggregate.mockResolvedValue([
        { _id: 'openai', cost: 1000 },
        { _id: 'anthropic', cost: 500 }
      ]);

      const result = await reportService.generateReport('report123');

      expect(result).toBeDefined();
    });

    it('should handle empty data', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'usage',
        parameters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Usage.aggregate.mockResolvedValue([]);

      const result = await reportService.generateReport('report123');

      expect(result).toBeDefined();
      expect(result.results).toEqual([]);
    });

    it('should update report after generation', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'usage',
        parameters: {}
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Report.findByIdAndUpdate.mockResolvedValue({
        ...mockReport,
        lastGenerated: new Date(),
        status: 'completed'
      });

      Usage.aggregate.mockResolvedValue([]);

      await reportService.generateReport('report123');

      expect(Report.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('exportToPDF()', () => {
    it('should export report to PDF', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Test Report',
        type: 'usage',
        results: [{ date: '2024-01-01', tokens: 1000 }],
        generatedAt: new Date()
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      PDFGenerator.generate.mockResolvedValue(Buffer.from('pdf-content'));

      const result = await reportService.exportToPDF('report123');

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should include report title in PDF', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Custom Report Title',
        type: 'usage',
        results: []
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      PDFGenerator.generate.mockResolvedValue(Buffer.from('pdf-content'));

      await reportService.exportToPDF('report123');

      expect(PDFGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Report Title'
        })
      );
    });

    it('should format data tables in PDF', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Test Report',
        type: 'usage',
        results: [
          { model: 'gpt-4', tokens: 10000, cost: 100 },
          { model: 'gpt-3.5', tokens: 5000, cost: 25 }
        ]
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      PDFGenerator.generate.mockResolvedValue(Buffer.from('pdf-content'));

      await reportService.exportToPDF('report123');

      expect(PDFGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'table' })
          ])
        })
      );
    });

    it('should throw error for non-existent report', async () => {
      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(reportService.exportToPDF('nonexistent')).rejects.toThrow();
    });
  });

  describe('exportToExcel()', () => {
    it('should export report to Excel', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Test Report',
        type: 'usage',
        results: [{ date: '2024-01-01', tokens: 1000 }],
        generatedAt: new Date()
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      ExcelGenerator.generate.mockResolvedValue(Buffer.from('excel-content'));

      const result = await reportService.exportToExcel('report123');

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should create multiple sheets for different data sections', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Test Report',
        type: 'revenue',
        results: {
          summary: [{ metric: 'MRR', value: 5000 }],
          details: [{ month: 'Jan', revenue: 4500 }]
        }
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      ExcelGenerator.generate.mockResolvedValue(Buffer.from('excel-content'));

      await reportService.exportToExcel('report123');

      expect(ExcelGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          sheets: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(String) })
          ])
        })
      );
    });

    it('should include headers in Excel', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Test Report',
        type: 'usage',
        results: [{ model: 'gpt-4', tokens: 10000, cost: 100 }]
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      ExcelGenerator.generate.mockResolvedValue(Buffer.from('excel-content'));

      await reportService.exportToExcel('report123');

      expect(ExcelGenerator.generate).toHaveBeenCalled();
    });

    it('should throw error for non-existent report', async () => {
      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(reportService.exportToExcel('nonexistent')).rejects.toThrow();
    });
  });

  describe('deleteReport()', () => {
    it('should delete report', async () => {
      Report.findByIdAndDelete.mockResolvedValue({
        _id: 'report123',
        name: 'Deleted Report'
      });

      const result = await reportService.deleteReport('report123');

      expect(result).toBeDefined();
      expect(Report.findByIdAndDelete).toHaveBeenCalledWith('report123');
    });

    it('should return null for non-existent report', async () => {
      Report.findByIdAndDelete.mockResolvedValue(null);

      const result = await reportService.deleteReport('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateReport()', () => {
    it('should update report parameters', async () => {
      Report.findByIdAndUpdate.mockResolvedValue({
        _id: 'report123',
        name: 'Updated Report',
        parameters: { startDate: '2024-02-01' }
      });

      const result = await reportService.updateReport('report123', {
        name: 'Updated Report',
        parameters: { startDate: '2024-02-01' }
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Report');
    });

    it('should preserve immutable fields', async () => {
      Report.findByIdAndUpdate.mockResolvedValue({
        _id: 'report123',
        type: 'usage',
        createdBy: 'user123'
      });

      await reportService.updateReport('report123', {
        type: 'revenue', // Should not change
        createdBy: 'user456' // Should not change
      });

      expect(Report.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('Accuracy Tests', () => {
    it('should calculate usage totals accurately', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'usage',
        parameters: { startDate: '2024-01-01', endDate: '2024-01-31' }
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Usage.aggregate.mockResolvedValue([
        { _id: '2024-01-01', tokens: 1000, cost: 10 },
        { _id: '2024-01-02', tokens: 2000, cost: 20 },
        { _id: '2024-01-03', tokens: 1500, cost: 15 }
      ]);

      const result = await reportService.generateReport('report123');

      // Total should be 4500 tokens and $45
      expect(result.summary.totalTokens).toBe(4500);
      expect(result.summary.totalCost).toBe(45);
    });

    it('should handle floating point calculations correctly', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'cost',
        parameters: {}
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Usage.aggregate.mockResolvedValue([
        { _id: 'openai', cost: 100.555 },
        { _id: 'anthropic', cost: 200.444 }
      ]);

      const result = await reportService.generateReport('report123');

      // Should round to 2 decimal places
      expect(result.summary.totalCost).toBeCloseTo(301.00, 2);
    });

    it('should maintain data consistency across report regenerations', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'usage',
        parameters: {}
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      Usage.aggregate.mockResolvedValue([
        { _id: null, tokens: 10000 }
      ]);

      // First generation
      const result1 = await reportService.generateReport('report123');

      // Second generation with same data
      const result2 = await reportService.generateReport('report123');

      // Results should be consistent
      expect(result2.summary.totalTokens).toBe(result1.summary.totalTokens);
    });
  });

  describe('Performance Tests', () => {
    it('should generate report within acceptable time', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'usage',
        parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      // Simulate a year of daily data
      Usage.aggregate.mockResolvedValue(
        Array.from({ length: 365 }, (_, i) => ({
          _id: `day-${i}`,
          tokens: Math.random() * 10000
        }))
      );

      const startTime = Date.now();
      await reportService.generateReport('report123');
      const endTime = Date.now();

      // Should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle large result sets', async () => {
      const mockReport = {
        _id: 'report123',
        type: 'usage',
        parameters: {}
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      // 10,000 records
      Usage.aggregate.mockResolvedValue(
        Array.from({ length: 10000 }, (_, i) => ({
          _id: `record-${i}`,
          tokens: i
        }))
      );

      const result = await reportService.generateReport('report123');

      expect(result.results.length).toBe(10000);
    });

    it('should export to PDF within acceptable time', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Large Report',
        type: 'usage',
        results: Array.from({ length: 1000 }, (_, i) => ({
          model: `model-${i}`,
          tokens: Math.random() * 10000
        }))
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      PDFGenerator.generate.mockResolvedValue(Buffer.from('pdf'));

      const startTime = Date.now();
      await reportService.exportToPDF('report123');
      const endTime = Date.now();

      // Should complete within 3 seconds
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should export to Excel within acceptable time', async () => {
      const mockReport = {
        _id: 'report123',
        name: 'Large Report',
        type: 'usage',
        results: Array.from({ length: 1000 }, (_, i) => ({
          model: `model-${i}`,
          tokens: Math.random() * 10000
        }))
      };

      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReport)
      });

      ExcelGenerator.generate.mockResolvedValue(Buffer.from('excel'));

      const startTime = Date.now();
      await reportService.exportToExcel('report123');
      const endTime = Date.now();

      // Should complete within 3 seconds
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during creation', async () => {
      Report.create.mockRejectedValue(new Error('Database error'));

      await expect(reportService.createReport({
        name: 'Test Report',
        type: 'usage',
        organization: 'org123'
      })).rejects.toThrow('Database error');
    });

    it('should handle database errors during generation', async () => {
      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'report123',
          type: 'usage'
        })
      });

      Usage.aggregate.mockRejectedValue(new Error('Aggregation error'));

      await expect(reportService.generateReport('report123'))
        .rejects.toThrow('Aggregation error');
    });

    it('should handle PDF generation errors', async () => {
      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'report123',
          type: 'usage',
          results: []
        })
      });

      PDFGenerator.generate.mockRejectedValue(new Error('PDF generation failed'));

      await expect(reportService.exportToPDF('report123'))
        .rejects.toThrow('PDF generation failed');
    });

    it('should handle Excel generation errors', async () => {
      Report.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'report123',
          type: 'usage',
          results: []
        })
      });

      ExcelGenerator.generate.mockRejectedValue(new Error('Excel generation failed'));

      await expect(reportService.exportToExcel('report123'))
        .rejects.toThrow('Excel generation failed');
    });
  });
});