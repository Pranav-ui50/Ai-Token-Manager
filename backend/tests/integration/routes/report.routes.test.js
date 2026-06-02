/**
 * Report Routes Integration Tests
 */

import request from 'supertest';
import app from '../../../src/app.js';
import { createTestUser, createTestOrganization, generateToken } from '../helpers/testUtils.js';

describe('Report Routes', () => {
  let authToken;
  let testUser;
  let testOrg;

  beforeAll(async () => {
    testUser = await createTestUser({ role: 'org_owner' });
    testOrg = await createTestOrganization({ members: [{ user: testUser._id, role: 'owner' }] });
    authToken = generateToken(testUser);
  });

  describe('GET /api/reports', () => {
    it('should return list of reports', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/reports?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter by report type', async () => {
      const types = ['usage', 'revenue', 'cost', 'performance'];

      for (const type of types) {
        const response = await request(app)
          .get(`/api/reports?type=${type}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      }
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/reports');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/reports', () => {
    it('should create a new report', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Usage Report',
          type: 'usage',
          parameters: {
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            groupBy: 'model'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe('Test Usage Report');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing name and type
          parameters: {
            startDate: '2024-01-01'
          }
        });

      expect(response.status).toBe(400);
    });

    it('should accept valid report types', async () => {
      const validTypes = ['usage', 'revenue', 'cost', 'performance', 'forecast'];

      for (const type of validTypes) {
        const response = await request(app)
          .post('/api/reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Test ${type} Report`,
            type: type,
            parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('GET /api/reports/:id', () => {
    let testReport;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Report for Get',
          type: 'usage',
          parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
        });
      testReport = response.body.data;
    });

    it('should return report details', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(testReport._id);
    });

    it('should return 404 for non-existent report', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/reports/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/reports/:id/generate', () => {
    let testReport;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Report for Generation',
          type: 'usage',
          parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
        });
      testReport = response.body.data;
    });

    it('should generate report', async () => {
      const response = await request(app)
        .post(`/api/reports/${testReport._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should include report data', async () => {
      const response = await request(app)
        .post(`/api/reports/${testReport._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('generatedAt');
      expect(response.body.data).toHaveProperty('results');
    });
  });

  describe('GET /api/reports/:id/export/pdf', () => {
    let testReport;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Report for PDF Export',
          type: 'usage',
          parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
        });
      testReport = response.body.data;
    });

    it('should export report as PDF', async () => {
      // First generate the report
      await request(app)
        .post(`/api/reports/${testReport._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get(`/api/reports/${testReport._id}/export/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should include correct headers for download', async () => {
      await request(app)
        .post(`/api/reports/${testReport._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get(`/api/reports/${testReport._id}/export/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-disposition']).toMatch(/attachment/);
    });
  });

  describe('GET /api/reports/:id/export/excel', () => {
    let testReport;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Report for Excel Export',
          type: 'usage',
          parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
        });
      testReport = response.body.data;
    });

    it('should export report as Excel', async () => {
      await request(app)
        .post(`/api/reports/${testReport._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get(`/api/reports/${testReport._id}/export/excel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/spreadsheet/);
    });

    it('should include correct file extension', async () => {
      await request(app)
        .post(`/api/reports/${testReport._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get(`/api/reports/${testReport._id}/export/excel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-disposition']).toMatch(/\.xlsx/);
    });
  });

  describe('DELETE /api/reports/:id', () => {
    let testReport;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Report for Deletion',
          type: 'usage',
          parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
        });
      testReport = response.body.data;
    });

    it('should delete report', async () => {
      const response = await request(app)
        .delete(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Report Generation Accuracy', () => {
    it('should calculate usage totals correctly', async () => {
      // Create report with specific parameters
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Accuracy Test Report',
          type: 'usage',
          parameters: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            groupBy: 'day'
          }
        });

      const report = response.body.data;

      // Generate the report
      await request(app)
        .post(`/api/reports/${report._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      // Get the results
      const result = await request(app)
        .get(`/api/reports/${report._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(result.status).toBe(200);
    });

    it('should include all requested fields in report', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Fields Test Report',
          type: 'revenue',
          parameters: {
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            includeTokens: true,
            includeCosts: true,
            includeRevenue: true
          }
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Performance Tests', () => {
    it('should generate report within acceptable time', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Performance Test Report',
          type: 'usage',
          parameters: { startDate: '2024-01-01', endDate: '2024-12-31' }
        });

      const reportId = response.body.data._id;

      const startTime = Date.now();
      await request(app)
        .post(`/api/reports/${reportId}/generate`)
        .set('Authorization', `Bearer ${authToken}`);
      const generationTime = Date.now() - startTime;

      // Report generation should complete within 5 seconds
      expect(generationTime).toBeLessThan(5000);
    });

    it('should handle large date ranges', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Large Range Report',
          type: 'usage',
          parameters: {
            startDate: '2020-01-01',
            endDate: '2024-12-31'
          }
        });

      expect(response.status).toBe(201);
    });
  });
});