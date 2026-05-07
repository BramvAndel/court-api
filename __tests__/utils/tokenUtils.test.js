// __tests__/utils/tokenUtils.test.js
const tokenUtils = require('../../src/utils/tokenUtils');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('TokenUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
      };

      const mockToken = 'mockAccessToken';
      jwt.sign.mockReturnValueOnce(mockToken);

      const token = tokenUtils.generateAccessToken(user);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: expect.any(String) },
      );
    });

    it('should include all required user fields', () => {
      const user = {
        id: 42,
        email: 'admin@example.com',
        role: 'admin',
      };

      jwt.sign.mockReturnValueOnce('token');

      tokenUtils.generateAccessToken(user);

      const callArgs = jwt.sign.mock.calls[0][0];
      expect(callArgs.id).toBe(user.id);
      expect(callArgs.email).toBe(user.email);
      expect(callArgs.role).toBe(user.role);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
      };

      const mockToken = 'mockRefreshToken';
      jwt.sign.mockReturnValueOnce(mockToken);

      const token = tokenUtils.generateRefreshToken(user);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: expect.any(String) },
      );
    });

    it('should use different secret than access token', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
      };

      jwt.sign.mockReturnValueOnce('token');

      tokenUtils.generateRefreshToken(user);

      const secret = jwt.sign.mock.calls[0][1];
      expect(secret).toBe(process.env.JWT_REFRESH_SECRET);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = 'validToken';
      const secret = 'secret';
      const payload = { id: 1, email: 'test@example.com' };

      jwt.verify.mockImplementationOnce((token, secret, callback) => {
        callback(null, payload);
      });

      const result = await tokenUtils.verifyToken(token, secret);

      expect(result).toEqual(payload);
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        secret,
        expect.any(Function),
      );
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalidToken';
      const secret = 'secret';
      const error = new Error('Invalid token');

      jwt.verify.mockImplementationOnce((token, secret, callback) => {
        callback(error);
      });

      await expect(tokenUtils.verifyToken(token, secret)).rejects.toThrow(
        'Invalid token',
      );
    });

    it('should throw error for expired token', async () => {
      const token = 'expiredToken';
      const secret = 'secret';
      const error = new Error('Token expired');

      jwt.verify.mockImplementationOnce((token, secret, callback) => {
        callback(error);
      });

      await expect(tokenUtils.verifyToken(token, secret)).rejects.toThrow(
        'Token expired',
      );
    });
  });
});
