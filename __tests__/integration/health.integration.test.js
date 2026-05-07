// __tests__/integration/health.integration.test.js
const request = require('supertest');
const app = require('../../src/app');
const database = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('Health Check API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return running status', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('running');
    });

    it('should return JSON response', async () => {
      const response = await request(app).get('/');

      expect(response.type).toBe('application/json');
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      database.testConnection = jest.fn().mockResolvedValueOnce(true);

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toBe('connected');
    });

    it('should return unhealthy status when database is disconnected', async () => {
      database.testConnection = jest.fn().mockResolvedValueOnce(false);

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('disconnected');
    });

    it('should include timestamp in response', async () => {
      database.testConnection = jest.fn().mockResolvedValueOnce(true);

      const response = await request(app).get('/api/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include uptime in response', async () => {
      database.testConnection = jest.fn().mockResolvedValueOnce(true);

      const response = await request(app).get('/api/health');

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });
});
