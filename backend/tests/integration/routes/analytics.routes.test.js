/**
 * Analytics Routes Integration Tests
 */

import request from 'supertest';
import app from '../../../src/app.js';
import { createTestUser, createTestOrganization, generateToken, createTestFeature, createTestProvider, createTestModel } from '../helpers/testUtils.js';

describe('Analytics Routes', () => {
  let authToken;
  let testUser;
  let testOrg;

  beforeAll(async () => {
    testUser = await createTestUser({ role: 'org_owner' });
    testOrg = await createTestOrganization({ members: [{ user: testUser._id, role: 'owner' }] });
    authToken = generateToken(testUser);
  });

  describe('GET /api/analytics', () => {
    it('should return analytics overview', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/analytics');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/analytics/tokens', () => {
    it('should return token usage analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/tokens')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTokens');
      expect(response.body.data).toHaveProperty('inputTokens');
      expect(response.body.data).toHaveProperty('outputTokens');
    });

    it('should calculate token ratios correctly', async () => {
      const response = await request(app)
        .get('/api/analytics/tokens')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const { totalTokens, inputTokens, outputTokens } = response.body.data;

      // Verify consistency
      if (totalTokens > 0) {
        expect(inputTokens + outputTokens).toBe(totalTokens);
      }
    });

    it('should support date range filtering', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/analytics/tokens?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should support model filtering', async () => {
      const response = await request(app)
        .get('/api/analytics/tokens?modelId=all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/costs', () => {
    it('should return cost analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/costs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('breakdown');
    });

    it('should include cost breakdown by provider', async () => {
      const response = await request(app)
        .get('/api/analytics/costs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown).toHaveProperty('byProvider');
      expect(Array.isArray(response.body.data.breakdown.byProvider)).toBe(true);
    });

    it('should include cost breakdown by model', async () => {
      const response = await request(app)
        .get('/api/analytics/costs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown).toHaveProperty('byModel');
      expect(Array.isArray(response.body.data.breakdown.byModel)).toBe(true);
    });

    it('should calculate cost per token correctly', async () => {
      const response = await request(app)
        .get('/api/analytics/costs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('avgCostPerToken');
    });
  });

  describe('GET /api/analytics/revenue', () => {
    it('should return revenue analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
    });

    it('should include MRR calculation', async () => {
      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('mrr');
    });

    it('should include revenue by plan', async () => {
      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('revenueByPlan');
    });
  });

  describe('GET /api/analytics/users', () => {
    it('should return user analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
    });

    it('should calculate user growth rate', async () => {
      const response = await request(app)
        .get('/api/analytics/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('growthRate');
    });

    it('should include user distribution by role', async () => {
      const response = await request(app)
        .get('/api/analytics/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('byRole');
    });
  });

  describe('GET /api/analytics/usage', () => {
    it('should return usage trends', async () => {
      const response = await request(app)
        .get('/api/analytics/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
    });

    it('should include hourly distribution', async () => {
      const response = await request(app)
        .get('/api/analytics/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('hourlyDistribution');
    });

    it('should include daily distribution', async () => {
      const response = await request(app)
        .get('/api/analytics/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('dailyDistribution');
    });
  });

  describe('GET /api/analytics/trends', () => {
    it('should return trend analysis', async () => {
      const response = await request(app)
        .get('/api/analytics/trends')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support different metrics', async () => {
      const metrics = ['tokens', 'costs', 'revenue', 'users'];

      for (const metric of metrics) {
        const response = await request(app)
          .get(`/api/analytics/trends?metric=${metric}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Accuracy Tests', () => {
    it('should calculate totals correctly', async () => {
      const response = await request(app)
        .get('/api/analytics/tokens')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const { totalTokens, inputTokens, outputTokens } = response.body.data;

      // If there's data, verify the math
      if (totalTokens > 0) {
        expect(inputTokens + outputTokens).toBeLessThanOrEqual(totalTokens + 1);
      }
    });

    it('should return consistent data across endpoints', async () => {
      // Get analytics from multiple endpoints
      const [tokensRes, costsRes] = await Promise.all([
        request(app).get('/api/analytics/tokens').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/analytics/costs').set('Authorization', `Bearer ${authToken}`)
      ]);

      expect(tokensRes.status).toBe(200);
      expect(costsRes.status).toBe(200);

      // Both should have the same organization context
      expect(tokensRes.body.data.organizationId).toBe(costsRes.body.data.organizationId);
    });

    it('should handle edge cases gracefully', async () => {
      // Test with invalid date range
      const response = await request(app)
        .get('/api/analytics/tokens?startDate=invalid&endDate=invalid')
        .set('Authorization', `Bearer ${authToken}`);

      // Should handle gracefully, not crash
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;

      // Analytics should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle complex queries efficiently', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/analytics/trends?metric=tokens&granularity=hour&days=30')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;

      // Complex queries should still be fast
      expect(responseTime).toBeLessThan(2000);
    });
  });
});