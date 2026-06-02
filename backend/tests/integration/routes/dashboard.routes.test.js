/**
 * Dashboard Routes Integration Tests
 */

import request from 'supertest';
import app from '../../../src/app.js';
import { createTestUser, createTestOrganization, generateToken } from '../helpers/testUtils.js';

describe('Dashboard Routes', () => {
  let authToken;
  let testUser;
  let testOrg;

  beforeAll(async () => {
    // Create test user and organization
    const user = await createTestUser({ role: 'org_owner' });
    const org = await createTestOrganization({ members: [{ user: user._id, role: 'owner' }] });
    testUser = user;
    testOrg = org;
    authToken = generateToken(user);
  });

  describe('GET /api/dashboard', () => {
    it('should return dashboard data for authenticated user', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
    });

    it('should include user count in dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toHaveProperty('totalUsers');
    });

    it('should include organization stats', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toHaveProperty('activeFeatures');
      expect(response.body.data.stats).toHaveProperty('totalProviders');
      expect(response.body.data.stats).toHaveProperty('totalModels');
    });

    it('should include revenue data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toHaveProperty('totalRevenue');
      expect(response.body.data.stats).toHaveProperty('monthlyRevenue');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard');

      expect(response.status).toBe(401);
    });

    it('should return recent activity', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(Array.isArray(response.body.data.recentActivity)).toBe(true);
    });
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return statistics for the period', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats?period=month')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support different time periods', async () => {
      const periods = ['day', 'week', 'month', 'year'];

      for (const period of periods) {
        const response = await request(app)
          .get(`/api/dashboard/stats?period=${period}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      }
    });

    it('should calculate token usage correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats?period=month')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('tokenUsage');
      expect(response.body.data.tokenUsage).toHaveProperty('total');
      expect(response.body.data.tokenUsage).toHaveProperty('input');
      expect(response.body.data.tokenUsage).toHaveProperty('output');
    });
  });

  describe('GET /api/dashboard/charts', () => {
    it('should return chart data for visualization', async () => {
      const response = await request(app)
        .get('/api/dashboard/charts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('revenueChart');
      expect(response.body.data).toHaveProperty('usageChart');
      expect(response.body.data).toHaveProperty('userGrowthChart');
    });

    it('should return properly formatted chart data', async () => {
      const response = await request(app)
        .get('/api/dashboard/charts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Check revenue chart format
      const revenueChart = response.body.data.revenueChart;
      expect(Array.isArray(revenueChart)).toBe(true);

      if (revenueChart.length > 0) {
        expect(revenueChart[0]).toHaveProperty('date');
        expect(revenueChart[0]).toHaveProperty('value');
      }
    });

    it('should filter charts by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/dashboard/charts?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time (dashboard load)', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 500ms
      expect(responseTime).toBeLessThan(500);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});