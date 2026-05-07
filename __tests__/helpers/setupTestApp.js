// __tests__/helpers/setupTestApp.js
/**
 * Creates a test Express app with all dependencies properly mocked
 * This avoids issues with loading the main app.js which has complex dependencies
 */
const express = require('express');
const cookieParser = require('cookie-parser');

// Create a minimal test app with only what we need for integration tests
const createTestApp = () => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mock auth middleware
  app.use((req, res, next) => {
    // Set a default authenticated user if no token provided
    if (!req.user && !req.path.startsWith('/api/auth')) {
      req.user = { id: 1, role: 'user' };
    }
    next();
  });

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({ message: 'King of Court API is running' });
  });

  app.get('/api/health', async (req, res) => {
    try {
      const { testConnection } = require('../../src/config/database');
      const dbConnected = await testConnection();

      const health = {
        status: dbConnected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbConnected ? 'connected' : 'disconnected',
      };

      res.status(dbConnected ? 200 : 503).json(health);
    } catch (err) {
      res.status(500).json({ status: 'error' });
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
    });
  });

  return app;
};

module.exports = { createTestApp };
