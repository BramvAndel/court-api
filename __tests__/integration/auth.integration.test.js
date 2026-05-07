// __tests__/integration/auth.integration.test.js
/**
 * Auth Controller Integration Tests
 * These test the auth controller with mocked services
 */

const authController = require('../../src/controllers/authController');
const authService = require('../../src/services/authService');
const { testData } = require('../helpers/testUtils');

jest.mock('../../src/services/authService');

describe('Auth Controller Integration Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      body: {},
      cookies: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
      };

      req.body = newUser;

      authService.registerUser.mockResolvedValueOnce({
        id: 1,
        email: newUser.email,
        name: newUser.username,
        role: 'user',
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          email: newUser.email,
        }),
      );
    });

    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123' };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email and password are required',
      });
    });

    it('should handle registration errors', async () => {
      req.body = {
        email: testData.users.testUser1.email,
        password: 'password123',
      };

      const error = new Error('Email already exists');
      error.status = 409;
      authService.registerUser.mockRejectedValueOnce(error);

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        email: testData.users.testUser1.email,
        password: 'correctPassword',
      };

      req.body = credentials;

      authService.loginUser.mockResolvedValueOnce({
        accessToken: 'accessToken123',
        refreshToken: 'refreshToken123',
        user: {
          id: 1,
          email: credentials.email,
          name: 'testuser1',
          role: 'user',
        },
      });

      await authController.login(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'accessToken123',
        expect.any(Object),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refreshToken123',
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object),
        }),
      );
    });

    it('should return 400 if credentials are missing', async () => {
      req.body = { email: 'test@example.com' };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle login errors', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      const error = new Error('Invalid credentials');
      error.status = 401;
      authService.loginUser.mockRejectedValueOnce(error);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      req.cookies.refreshToken = testData.tokens.validRefreshToken;

      authService.refreshAccessToken.mockResolvedValueOnce({
        accessToken: 'newAccessToken',
      });

      await authController.refresh(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'newAccessToken',
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 401 if refresh token is missing', async () => {
      req.cookies = {};

      await authController.refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('should logout user and clear cookies', async () => {
      req.cookies.refreshToken = testData.tokens.validRefreshToken;

      authService.logoutUser.mockResolvedValueOnce();

      await authController.logout(req, res);

      expect(authService.logoutUser).toHaveBeenCalledWith(
        testData.tokens.validRefreshToken,
      );
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
    });
  });
});

