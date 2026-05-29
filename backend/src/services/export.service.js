/**
 * Export Service
 *
 * Handles Excel and PDF report exports.
 * FR-26: Excel/PDF Report Exports
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import logger from '../config/logger.js';

class ExportService {
  /**
   * Export report to Excel
   * @param {Object} report - Report document
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async exportToExcel(report) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'API Token Manager';
    workbook.created = new Date();
    workbook.properties = {
      title: report.name,
      subject: report.type,
      description: report.description || ''
    };

    // Add metadata sheet
    await this.addMetadataSheet(workbook, report);

    // Add summary sheet
    await this.addSummarySheet(workbook, report);

    // Add breakdown sheet
    if (report.data?.breakdown?.length > 0) {
      await this.addBreakdownSheet(workbook, report);
    }

    // Add time series sheet
    if (report.data?.timeSeries?.length > 0) {
      await this.addTimeSeriesSheet(workbook, report);
    }

    // Add charts sheet (as data tables)
    if (report.data?.charts && Object.keys(report.data.charts).length > 0) {
      await this.addChartsSheet(workbook, report);
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Add metadata sheet
   */
  async addMetadataSheet(workbook, report) {
    const sheet = workbook.addWorksheet('Metadata');

    // Title
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = report.name;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Metadata
    const metadata = [
      ['Report Type', report.type],
      ['Description', report.description || 'N/A'],
      ['Generated At', new Date().toISOString()],
      ['Created By', report.createdBy?.email || 'Unknown'],
      ['Organization', report.organization?.name || 'N/A'],
      ['Date Range', `${report.parameters?.dateRange?.start?.toLocaleDateString() || 'N/A'} - ${report.parameters?.dateRange?.end?.toLocaleDateString() || 'N/A'}`],
      ['Status', report.status]
    ];

    let row = 3;
    for (const [label, value] of metadata) {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = value;
      row++;
    }

    sheet.columns = [{ width: 20 }, { width: 50 }, { width: 20 }, { width: 20 }];
  }

  /**
   * Add summary sheet
   */
  async addSummarySheet(workbook, report) {
    const sheet = workbook.addWorksheet('Summary');

    // Title
    sheet.getCell('A1').value = 'Summary Metrics';
    sheet.getCell('A1').font = { size: 14, bold: true };

    // Headers
    sheet.getCell('A2').value = 'Metric';
    sheet.getCell('B2').value = 'Value';
    sheet.getCell('A2').font = { bold: true };
    sheet.getCell('B2').font = { bold: true };

    // Summary data
    let row = 3;
    if (report.data?.summary) {
      for (const [key, value] of report.data.summary) {
        sheet.getCell(`A${row}`).value = this.formatLabel(key);
        sheet.getCell(`B${row}`).value = value;
        row++;
      }
    }

    // Auto-fit columns
    sheet.columns = [{ width: 30 }, { width: 25 }];
  }

  /**
   * Add breakdown sheet
   */
  async addBreakdownSheet(workbook, report) {
    const sheet = workbook.addWorksheet('Breakdown');

    // Title
    sheet.getCell('A1').value = 'Detailed Breakdown';
    sheet.getCell('A1').font = { size: 14, bold: true };

    if (!report.data?.breakdown?.length) return;

    // Get all metric keys from first item
    const firstItem = report.data.breakdown[0];
    const metricKeys = firstItem.metrics ? Object.keys(firstItem.metrics) : [];

    // Headers
    const headers = ['Category', 'Subcategory', ...metricKeys.map(k => this.formatLabel(k))];
    headers.forEach((header, col) => {
      const cell = sheet.getCell(2, col + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Data
    let row = 3;
    for (const item of report.data.breakdown) {
      sheet.getCell(row, 1).value = item.category;
      sheet.getCell(row, 2).value = item.subcategory;

      if (item.metrics) {
        metricKeys.forEach((key, col) => {
          sheet.getCell(row, col + 3).value = item.metrics[key];
        });
      }
      row++;
    }

    // Auto-fit columns
    sheet.columns.forEach((col, i) => {
      col.width = i < 2 ? 20 : 15;
    });

    // Add number formatting
    for (let r = 3; r < row; r++) {
      for (let c = 3; c <= metricKeys.length + 2; c++) {
        const cell = sheet.getCell(r, c);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      }
    }
  }

  /**
   * Add time series sheet
   */
  async addTimeSeriesSheet(workbook, report) {
    const sheet = workbook.addWorksheet('Time Series');

    // Title
    sheet.getCell('A1').value = 'Time Series Data';
    sheet.getCell('A1').font = { size: 14, bold: true };

    if (!report.data?.timeSeries?.length) return;

    // Get all metric keys from first item
    const firstItem = report.data.timeSeries[0];
    const metricKeys = firstItem.metrics ? Object.keys(firstItem.metrics) : [];

    // Headers
    const headers = ['Period', 'Date', ...metricKeys.map(k => this.formatLabel(k))];
    headers.forEach((header, col) => {
      const cell = sheet.getCell(2, col + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Data
    let row = 3;
    for (const item of report.data.timeSeries) {
      sheet.getCell(row, 1).value = item.period;
      sheet.getCell(row, 2).value = item.date instanceof Date
        ? item.date.toISOString().split('T')[0]
        : String(item.date);

      if (item.metrics) {
        metricKeys.forEach((key, col) => {
          sheet.getCell(row, col + 3).value = item.metrics[key];
        });
      }
      row++;
    }

    // Add chart if data available
    if (report.data.timeSeries.length > 1 && metricKeys.length > 0) {
      const chartData = report.data.timeSeries.map(item => ({
        period: item.period,
        value: item.metrics[metricKeys[0]]
      }));

      // Add a simple line chart
      const chartSheet = workbook.addWorksheet('Trend Chart');
      chartSheet.getCell('A1').value = 'Trend Visualization';
      chartSheet.getCell('A1').font = { size: 14, bold: true };

      // Note: ExcelJS chart support is limited, so we just add data
      // For actual charts, consider using a library like chart.js with canvas

      headers.forEach((header, col) => {
        chartSheet.getCell(2, col + 1).value = header;
        chartSheet.getCell(2, col + 1).font = { bold: true };
      });

      row = 3;
      for (const item of report.data.timeSeries) {
        chartSheet.getCell(row, 1).value = item.period;
        metricKeys.forEach((key, col) => {
          chartSheet.getCell(row, col + 2).value = item.metrics[key];
        });
        row++;
      }
    }

    // Auto-fit columns
    sheet.columns.forEach(col => { col.width = 15; });
  }

  /**
   * Add charts sheet
   */
  async addChartsSheet(workbook, report) {
    const sheet = workbook.addWorksheet('Chart Data');

    // Title
    sheet.getCell('A1').value = 'Chart Data';
    sheet.getCell('A1').font = { size: 14, bold: true };

    if (!report.data?.charts) return;

    let row = 3;
    for (const [chartName, chartData] of Object.entries(report.data.charts)) {
      // Chart title
      sheet.getCell(row, 1).value = this.formatLabel(chartName);
      sheet.getCell(row, 1).font = { size: 12, bold: true };
      row++;

      if (chartData.type === 'pie' && chartData.data?.labels) {
        // Pie chart data
        sheet.getCell(row, 1).value = 'Label';
        sheet.getCell(row, 2).value = 'Value';
        sheet.getCell(row, 1).font = { bold: true };
        sheet.getCell(row, 2).font = { bold: true };
        row++;

        for (let i = 0; i < chartData.data.labels.length; i++) {
          sheet.getCell(row, 1).value = chartData.data.labels[i];
          sheet.getCell(row, 2).value = chartData.data.values[i];
          row++;
        }
        row += 2;
      } else if (chartData.type === 'bar' || chartData.type === 'line') {
        // Bar/Line chart data
        if (chartData.data?.labels) {
          const hasDatasets = chartData.data.datasets && chartData.data.datasets.length > 0;

          if (hasDatasets) {
            // Multiple datasets
            sheet.getCell(row, 1).value = 'Label';
            chartData.data.datasets.forEach((dataset, i) => {
              sheet.getCell(row, i + 2).value = dataset.label;
            });
            row++;

            for (let i = 0; i < chartData.data.labels.length; i++) {
              sheet.getCell(row, 1).value = chartData.data.labels[i];
              chartData.data.datasets.forEach((dataset, j) => {
                sheet.getCell(row, j + 2).value = dataset.values[i];
              });
              row++;
            }
          } else {
            // Single data array
            sheet.getCell(row, 1).value = 'Label';
            sheet.getCell(row, 2).value = 'Value';
            row++;

            for (let i = 0; i < chartData.data.labels.length; i++) {
              sheet.getCell(row, 1).value = chartData.data.labels[i];
              sheet.getCell(row, 2).value = chartData.data.values[i];
              row++;
            }
          }
        }
        row += 2;
      }
    }

    // Auto-fit columns
    sheet.columns = [{ width: 25 }, { width: 20 }, { width: 20 }, { width: 20 }];
  }

  /**
   * Export report to PDF
   * @param {Object} report - Report document
   * @returns {Promise<Buffer>} PDF file buffer
   */
  async exportToPDF(report) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: report.name,
          Author: 'API Token Manager',
          Subject: report.type,
          Creator: 'API Token Manager'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add header
      this.addPDFHeader(doc, report);

      // Add summary
      this.addPDFSummary(doc, report);

      // Add breakdown
      if (report.data?.breakdown?.length > 0) {
        this.addPDFBreakdown(doc, report);
      }

      // Add time series
      if (report.data?.timeSeries?.length > 0) {
        this.addPDFTimeSeries(doc, report);
      }

      // Add footer
      this.addPDFFooter(doc);

      doc.end();
    });
  }

  /**
   * Add PDF header
   */
  addPDFHeader(doc, report) {
    // Logo placeholder (would use actual logo in production)
    doc.fontSize(24).font('Helvetica-Bold').text(report.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Report Type: ${this.formatLabel(report.type)}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Divider
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(1);
  }

  /**
   * Add PDF summary section
   */
  addPDFSummary(doc, report) {
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);

    if (report.data?.summary) {
      doc.fontSize(10).font('Helvetica');

      // Create a simple table for summary
      const summaryArray = Array.from(report.data.summary);

      // Calculate column widths
      const pageWidth = doc.page.width - 100; // Margins
      const labelWidth = pageWidth * 0.4;
      const valueWidth = pageWidth * 0.6;

      for (const [key, value] of summaryArray) {
        doc.text(`${this.formatLabel(key)}:`, { continued: true, width: labelWidth });
        doc.text(` ${value}`, { width: valueWidth });
      }
    } else {
      doc.fontSize(10).font('Helvetica').text('No summary data available.');
    }

    doc.moveDown(1);
  }

  /**
   * Add PDF breakdown section
   */
  addPDFBreakdown(doc, report) {
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('Detailed Breakdown', { underline: true });
    doc.moveDown(0.5);

    if (!report.data?.breakdown?.length) {
      doc.fontSize(10).font('Helvetica').text('No breakdown data available.');
      return;
    }

    const breakdown = report.data.breakdown;
    const firstItem = breakdown[0];
    const metricKeys = firstItem.metrics ? Object.keys(firstItem.metrics) : [];

    // Table header
    const headers = ['Category', 'Subcategory', ...metricKeys.map(k => this.formatLabel(k))];
    const colWidths = [100, 100, ...metricKeys.map(() => 80)];
    const tableTop = doc.y;
    const rowHeight = 20;

    // Header row
    doc.font('Helvetica-Bold').fontSize(9);
    let x = 50;
    for (let i = 0; i < headers.length; i++) {
      doc.rect(x, tableTop, colWidths[i], rowHeight).fill('#E0E0E0');
      doc.fillColor('black').text(headers[i], x + 5, tableTop + 5, { width: colWidths[i] - 10 });
      x += colWidths[i];
    }

    // Data rows
    doc.font('Helvetica').fontSize(9);
    let y = tableTop + rowHeight;

    for (const item of breakdown) {
      // Check if we need a new page
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = doc.y;
      }

      x = 50;
      doc.text(item.category, x + 5, y + 5, { width: colWidths[0] - 10 });
      x += colWidths[0];
      doc.text(item.subcategory, x + 5, y + 5, { width: colWidths[1] - 10 });

      if (item.metrics) {
        metricKeys.forEach((key, i) => {
          x += colWidths[i + 1 < colWidths.length ? i + 1 : i];
          const value = typeof item.metrics[key] === 'number'
            ? item.metrics[key].toFixed(2)
            : String(item.metrics[key]);
          doc.text(value, x + 5, y + 5, { width: colWidths[i + 2] - 10 });
        });
      }

      y += rowHeight;
    }

    doc.moveDown(2);
  }

  /**
   * Add PDF time series section
   */
  addPDFTimeSeries(doc, report) {
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('Time Series Data', { underline: true });
    doc.moveDown(0.5);

    if (!report.data?.timeSeries?.length) {
      doc.fontSize(10).font('Helvetica').text('No time series data available.');
      return;
    }

    const timeSeries = report.data.timeSeries;
    const firstItem = timeSeries[0];
    const metricKeys = firstItem.metrics ? Object.keys(firstItem.metrics) : [];

    // Table header
    const headers = ['Period', 'Date', ...metricKeys.map(k => this.formatLabel(k))];
    const colWidths = [80, 80, ...metricKeys.map(() => 70)];
    const tableTop = doc.y;
    const rowHeight = 18;

    // Header row
    doc.font('Helvetica-Bold').fontSize(9);
    let x = 50;
    for (let i = 0; i < headers.length; i++) {
      doc.rect(x, tableTop, colWidths[i], rowHeight).fill('#E0E0E0');
      doc.fillColor('black').text(headers[i], x + 5, tableTop + 4, { width: colWidths[i] - 10 });
      x += colWidths[i];
    }

    // Data rows
    doc.font('Helvetica').fontSize(9);
    let y = tableTop + rowHeight;

    for (const item of timeSeries) {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = doc.y;
      }

      x = 50;
      doc.text(item.period, x + 5, y + 4, { width: colWidths[0] - 10 });
      x += colWidths[0];
      doc.text(item.date instanceof Date ? item.date.toISOString().split('T')[0] : String(item.date), x + 5, y + 4, { width: colWidths[1] - 10 });

      if (item.metrics) {
        metricKeys.forEach((key, i) => {
          x += colWidths[i + 1 < colWidths.length ? i + 1 : i];
          const value = typeof item.metrics[key] === 'number'
            ? item.metrics[key].toFixed(2)
            : String(item.metrics[key]);
          doc.text(value, x + 5, y + 4, { width: colWidths[i + 2] - 10 });
        });
      }

      y += rowHeight;
    }
  }

  /**
   * Add PDF footer
   */
  addPDFFooter(doc) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica').text(
        `Page ${i + 1} of ${pages.count} | API Token Manager Report`,
        50,
        doc.page.height - 30,
        { align: 'center' }
      );
    }
  }

  /**
   * Format label from camelCase/snake_case
   */
  formatLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Generate and export report
   * @param {Object} report - Report document
   * @param {string} format - Export format (excel, pdf, csv, json)
   * @returns {Promise<Object>} Export result
   */
  async exportReport(report, format = 'excel') {
    logger.info(`Exporting report ${report._id} to ${format}`);

    try {
      let buffer;
      let contentType;
      let extension;
      let filename;

      switch (format.toLowerCase()) {
        case 'excel':
        case 'xlsx':
          buffer = await this.exportToExcel(report);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;

        case 'pdf':
          buffer = await this.exportToPDF(report);
          contentType = 'application/pdf';
          extension = 'pdf';
          break;

        case 'csv':
          buffer = Buffer.from(this.convertToCSV(report));
          contentType = 'text/csv';
          extension = 'csv';
          break;

        case 'json':
        default:
          buffer = Buffer.from(JSON.stringify(report.toObject(), null, 2));
          contentType = 'application/json';
          extension = 'json';
      }

      filename = `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${extension}`;

      return {
        buffer,
        contentType,
        filename,
        size: buffer.length
      };
    } catch (error) {
      logger.error(`Export failed for report ${report._id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert report to CSV
   */
  convertToCSV(report) {
    const lines = [];

    // Header
    lines.push(`Report: ${report.name}`);
    lines.push(`Type: ${report.type}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    lines.push('Summary');
    lines.push('Metric,Value');
    if (report.data?.summary) {
      for (const [key, value] of report.data.summary) {
        lines.push(`${this.formatLabel(key)},${value}`);
      }
    }
    lines.push('');

    // Breakdown
    if (report.data?.breakdown?.length > 0) {
      lines.push('Breakdown');
      const firstItem = report.data.breakdown[0];
      const metricKeys = firstItem.metrics ? Object.keys(firstItem.metrics) : [];
      const headers = ['Category', 'Subcategory', ...metricKeys.map(k => this.formatLabel(k))];
      lines.push(headers.join(','));

      for (const item of report.data.breakdown) {
        const row = [item.category, item.subcategory];
        if (item.metrics) {
          metricKeys.forEach(key => {
            row.push(item.metrics[key]);
          });
        }
        lines.push(row.join(','));
      }
      lines.push('');
    }

    // Time Series
    if (report.data?.timeSeries?.length > 0) {
      lines.push('Time Series');
      const firstItem = report.data.timeSeries[0];
      const metricKeys = firstItem.metrics ? Object.keys(firstItem.metrics) : [];
      const headers = ['Period', 'Date', ...metricKeys.map(k => this.formatLabel(k))];
      lines.push(headers.join(','));

      for (const item of report.data.timeSeries) {
        const row = [
          item.period,
          item.date instanceof Date ? item.date.toISOString().split('T')[0] : String(item.date)
        ];
        if (item.metrics) {
          metricKeys.forEach(key => {
            row.push(item.metrics[key]);
          });
        }
        lines.push(row.join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * Export multiple reports as a zip
   * @param {Array} reports - Array of report documents
   * @param {string} format - Export format
   * @returns {Promise<Buffer>} Zip file buffer
   */
  async exportMultipleReports(reports, format = 'excel') {
    // For multiple reports, we'd use a zip library
    // For now, return individual exports
    const exports = [];
    for (const report of reports) {
      const exported = await this.exportReport(report, format);
      exports.push({
        filename: exported.filename,
        buffer: exported.buffer,
        contentType: exported.contentType
      });
    }
    return exports;
  }
}

export default new ExportService();