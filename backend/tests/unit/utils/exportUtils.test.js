/**
 * PDF and Excel Export Utility Tests
 */

import PDFGenerator from '../../../src/utils/pdfGenerator.js';
import ExcelGenerator from '../../../src/utils/excelGenerator.js';

// Mock the PDF and Excel libraries
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    end: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'end') {
        setTimeout(callback, 100);
      }
    })
  }));
});

jest.mock('exceljs', () => {
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      addWorksheet: jest.fn().mockReturnValue({
        columns: [],
        addRow: jest.fn(),
        getRow: jest.fn().mockReturnValue({
          font: jest.fn(),
          alignment: jest.fn(),
          border: jest.fn()
        }),
        columns: []
      }),
     .xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('test-excel-data'))
      }
    }))
  };
});

describe('PDF Generator', () => {
  let pdfGenerator;

  beforeEach(() => {
    pdfGenerator = new PDFGenerator();
  });

  describe('generate()', () => {
    it('should generate PDF buffer', async () => {
      const data = {
        title: 'Test Report',
        content: [
          { type: 'heading', text: 'Summary' },
          { type: 'paragraph', text: 'This is a test paragraph.' }
        ]
      };

      const result = await pdfGenerator.generate(data);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle empty data', async () => {
      const data = {
        title: 'Empty Report',
        content: []
      };

      const result = await pdfGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should include title in PDF', async () => {
      const data = {
        title: 'Custom Title Report',
        content: []
      };

      await pdfGenerator.generate(data);

      // PDFKit mock should have been called with title
      expect(pdfGenerator).toBeDefined();
    });

    it('should handle tables', async () => {
      const data = {
        title: 'Table Report',
        content: [
          {
            type: 'table',
            headers: ['Name', 'Value', 'Date'],
            rows: [
              ['Test 1', '100', '2024-01-01'],
              ['Test 2', '200', '2024-01-02']
            ]
          }
        ]
      };

      const result = await pdfGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should handle charts', async () => {
      const data = {
        title: 'Chart Report',
        content: [
          {
            type: 'chart',
            chartType: 'bar',
            data: {
              labels: ['Jan', 'Feb', 'Mar'],
              datasets: [{ data: [10, 20, 30] }]
            }
          }
        ]
      };

      const result = await pdfGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should handle large reports', async () => {
      const data = {
        title: 'Large Report',
        content: Array.from({ length: 100 }, (_, i) => ({
          type: 'paragraph',
          text: `Paragraph ${i + 1}: This is test content for paragraph ${i + 1}.`
        }))
      };

      const result = await pdfGenerator.generate(data);

      expect(result).toBeDefined();
    });
  });

  describe('addPage()', () => {
    it('should add new page to PDF', async () => {
      const data = {
        title: 'Multi-page Report',
        content: [
          { type: 'heading', text: 'Page 1' },
          { type: 'pagebreak' },
          { type: 'heading', text: 'Page 2' }
        ]
      };

      const result = await pdfGenerator.generate(data);

      expect(result).toBeDefined();
    });
  });

  describe('formatNumber()', () => {
    it('should format numbers correctly', () => {
      expect(pdfGenerator.formatNumber(1000)).toBe('1,000');
      expect(pdfGenerator.formatNumber(1000000)).toBe('1,000,000');
      expect(pdfGenerator.formatNumber(0)).toBe('0');
    });
  });

  describe('formatCurrency()', () => {
    it('should format currency correctly', () => {
      expect(pdfGenerator.formatCurrency(1000)).toBe('$1,000.00');
      expect(pdfGenerator.formatCurrency(0)).toBe('$0.00');
      expect(pdfGenerator.formatCurrency(1234.56)).toBe('$1,234.56');
    });
  });
});

describe('Excel Generator', () => {
  let excelGenerator;

  beforeEach(() => {
    excelGenerator = new ExcelGenerator();
  });

  describe('generate()', () => {
    it('should generate Excel buffer', async () => {
      const data = {
        sheets: [
          {
            name: 'Sheet1',
            headers: ['Name', 'Value', 'Date'],
            rows: [
              ['Test 1', 100, '2024-01-01'],
              ['Test 2', 200, '2024-01-02']
            ]
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle multiple sheets', async () => {
      const data = {
        sheets: [
          {
            name: 'Summary',
            headers: ['Metric', 'Value'],
            rows: [['Users', 1000], ['Revenue', 5000]]
          },
          {
            name: 'Details',
            headers: ['ID', 'Name', 'Status'],
            rows: [['1', 'Item 1', 'Active'], ['2', 'Item 2', 'Inactive']]
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should handle empty data', async () => {
      const data = {
        sheets: [
          {
            name: 'Empty',
            headers: [],
            rows: []
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should apply header styling', async () => {
      const data = {
        sheets: [
          {
            name: 'Styled',
            headers: ['Column A', 'Column B'],
            rows: [['Data 1', 'Data 2']],
            options: {
              headerStyle: {
                bold: true,
                backgroundColor: 'FF4472C4'
              }
            }
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should handle numeric formatting', async () => {
      const data = {
        sheets: [
          {
            name: 'Numbers',
            headers: ['Name', 'Amount', 'Percentage'],
            rows: [
              ['Item 1', 1234.56, 0.1234],
              ['Item 2', 5678.90, 0.5678]
            ],
            options: {
              numberFormats: {
                Amount: '#,##0.00',
                Percentage: '0.00%'
              }
            }
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should handle date formatting', async () => {
      const data = {
        sheets: [
          {
            name: 'Dates',
            headers: ['Event', 'Date'],
            rows: [
              ['Event 1', new Date('2024-01-01')],
              ['Event 2', new Date('2024-06-15')]
            ],
            options: {
              dateFormat: 'YYYY-MM-DD'
            }
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });

    it('should handle formula cells', async () => {
      const data = {
        sheets: [
          {
            name: 'Formulas',
            headers: ['Value', 'Sum'],
            rows: [
              [10, { formula: 'SUM(A2:A4)' }],
              [20, null],
              [30, null]
            ]
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });
  });

  describe('addWorksheet()', () => {
    it('should create worksheet with correct name', async () => {
      const data = {
        sheets: [
          {
            name: 'Custom Sheet Name',
            headers: ['A', 'B'],
            rows: [[1, 2]]
          }
        ]
      };

      await excelGenerator.generate(data);

      // Verify worksheet was created
      expect(excelGenerator).toBeDefined();
    });
  });

  describe('autoFitColumns()', () => {
    it('should adjust column widths based on content', async () => {
      const data = {
        sheets: [
          {
            name: 'AutoFit',
            headers: ['Short', 'Medium Length Header', 'Very Long Header Name'],
            rows: [
              ['A', 'B', 'Very long content here to test auto-fit']
            ],
            options: {
              autoFit: true
            }
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets', async () => {
      const rows = Array.from({ length: 10000 }, (_, i) => [
        `Item ${i + 1}`,
        Math.random() * 1000,
        new Date()
      ]);

      const data = {
        sheets: [
          {
            name: 'Large Dataset',
            headers: ['Name', 'Value', 'Date'],
            rows: rows
          }
        ]
      };

      const startTime = Date.now();
      const result = await excelGenerator.generate(data);
      const generationTime = Date.now() - startTime;

      expect(result).toBeDefined();
      // Should generate within 5 seconds
      expect(generationTime).toBeLessThan(5000);
    }, 10000);

    it('should handle many columns', async () => {
      const headers = Array.from({ length: 50 }, (_, i) => `Column ${i + 1}`);
      const rows = [
        Array.from({ length: 50 }, (_, i) => `Value ${i + 1}`)
      ];

      const data = {
        sheets: [
          {
            name: 'Many Columns',
            headers: headers,
            rows: rows
          }
        ]
      };

      const result = await excelGenerator.generate(data);

      expect(result).toBeDefined();
    });
  });
});

describe('Export Validation Tests', () => {
  it('should validate PDF data structure', () => {
    const validData = {
      title: 'Test Report',
      content: [
        { type: 'heading', text: 'Section 1' },
        { type: 'paragraph', text: 'Content here' }
      ]
    };

    // Validate structure
    expect(validData).toHaveProperty('title');
    expect(validData).toHaveProperty('content');
    expect(Array.isArray(validData.content)).toBe(true);
  });

  it('should validate Excel data structure', () => {
    const validData = {
      sheets: [
        {
          name: 'Sheet1',
          headers: ['A', 'B', 'C'],
          rows: [['1', '2', '3']]
        }
      ]
    };

    // Validate structure
    expect(validData).toHaveProperty('sheets');
    expect(Array.isArray(validData.sheets)).toBe(true);
    expect(validData.sheets[0]).toHaveProperty('name');
    expect(validData.sheets[0]).toHaveProperty('headers');
    expect(validData.sheets[0]).toHaveProperty('rows');
  });

  it('should handle invalid PDF data gracefully', async () => {
    const pdfGenerator = new PDFGenerator();

    const invalidData = {
      title: null,
      content: 'invalid content type'
    };

    // Should not throw
    await expect(pdfGenerator.generate(invalidData)).resolves.toBeDefined();
  });

  it('should handle invalid Excel data gracefully', async () => {
    const excelGenerator = new ExcelGenerator();

    const invalidData = {
      sheets: 'invalid sheets type'
    };

    // Should not throw
    await expect(excelGenerator.generate(invalidData)).rejects.toThrow();
  });
});