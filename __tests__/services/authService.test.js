// __tests__/services/authService.test.js
const authService = require("../../src/services/authService");
const tokenUtils = require("../../src/utils/tokenUtils");
const database = require("../../src/config/database");
const bcrypt = require("bcryptjs");
const { testData, resetMocks } = require("../helpers/testUtils");

// Mock dependencies
jest.mock("../../src/config/database");
jest.mock("../../src/utils/tokenUtils");
jest.mock("bcryptjs");

describe("AuthService", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should successfully register a new user", async () => {
      const userData = {
        email: "newuser@example.com",
        password: "password123",
        username: "newuser",
      };

      database.query
        .mockResolvedValueOnce([]) // No existing user
        .mockResolvedValueOnce({ insertId: 1 }); // Insert successful

      bcrypt.hash.mockResolvedValueOnce("hashedPassword");

      const result = await authService.registerUser(userData);

      expect(result).toEqual({
        id: 1,
        orgId: null,
        email: userData.email,
        name: userData.username,
        role: "user",
      });

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM users"),
        [userData.email, userData.username],
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.any(Array),
      );
    });

    it("should throw error if email already exists", async () => {
      const userData = {
        email: testData.users.testUser1.email,
        password: "password123",
        username: "newuser",
      };

      database.query.mockResolvedValueOnce([testData.users.testUser1]);

      await expect(authService.registerUser(userData)).rejects.toThrow(
        "Email or username already exists",
      );
    });

    it("should throw error if username already exists", async () => {
      const userData = {
        email: "newemail@example.com",
        password: "password123",
        username: testData.users.testUser1.username,
      };

      database.query.mockResolvedValueOnce([testData.users.testUser1]);

      await expect(authService.registerUser(userData)).rejects.toThrow(
        "Email or username already exists",
      );
    });

    it("should generate username from email if not provided", async () => {
      const userData = {
        email: "user@example.com",
        password: "password123",
      };

      database.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ insertId: 1 });

      bcrypt.hash.mockResolvedValueOnce("hashedPassword");

      await authService.registerUser(userData);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        ["user", "hashedPassword", userData.email, "user"],
      );
    });
  });

  describe("loginUser", () => {
    it("should successfully login a user", async () => {
      const email = testData.users.testUser1.email;
      const password = "correctPassword";

      database.query.mockResolvedValueOnce([testData.users.testUser1]);
      bcrypt.compare.mockResolvedValueOnce(true);
      tokenUtils.generateAccessToken.mockReturnValueOnce("accessToken123");
      tokenUtils.generateRefreshToken.mockReturnValueOnce("refreshToken123");
      database.query.mockResolvedValueOnce({}); // Insert refresh token

      const result = await authService.loginUser(email, password);

      expect(result).toEqual({
        accessToken: "accessToken123",
        refreshToken: "refreshToken123",
        org: null,
        user: {
          id: testData.users.testUser1.userID,
          orgId: null,
          email: testData.users.testUser1.email,
          name: testData.users.testUser1.username,
          role: testData.users.testUser1.role,
        },
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        password,
        testData.users.testUser1.password,
      );
    });

    it("should throw error if user does not exist", async () => {
      const email = "nonexistent@example.com";
      const password = "password123";

      database.query.mockResolvedValueOnce([]);

      const error = await authService
        .loginUser(email, password)
        .catch((e) => e);

      expect(error).toBeTruthy();
      expect(error.message).toBe("Invalid credentials");
      expect(error.status).toBe(401);
    });

    it("should throw error if password is incorrect", async () => {
      const email = testData.users.testUser1.email;
      const password = "wrongPassword";

      database.query.mockResolvedValueOnce([testData.users.testUser1]);
      bcrypt.compare.mockResolvedValueOnce(false);

      const error = await authService
        .loginUser(email, password)
        .catch((e) => e);

      expect(error.message).toBe("Invalid credentials");
      expect(error.status).toBe(401);
    });

    it("should reject admin accounts from user login", async () => {
      const email = testData.users.admin.email;
      const password = "correctPassword";

      database.query.mockResolvedValueOnce([testData.users.admin]);

      const error = await authService
        .loginUser(email, password)
        .catch((e) => e);

      expect(error.message).toBe(
        "Admin accounts must use /api/auth/admin/login",
      );
      expect(error.status).toBe(403);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe("loginAdmin", () => {
    it("should login an admin account successfully", async () => {
      const email = testData.users.admin.email;
      const password = "correctPassword";

      database.query.mockResolvedValueOnce([testData.users.admin]);
      bcrypt.compare.mockResolvedValueOnce(true);
      tokenUtils.generateAccessToken.mockReturnValueOnce("accessToken123");
      tokenUtils.generateRefreshToken.mockReturnValueOnce("refreshToken123");
      database.query.mockResolvedValueOnce({});

      const result = await authService.loginAdmin(email, password);

      expect(result.user.role).toBe("admin");
      expect(result.accessToken).toBe("accessToken123");
      expect(result.refreshToken).toBe("refreshToken123");
    });

    it("should reject non-admin accounts from admin login", async () => {
      const email = testData.users.testUser1.email;
      const password = "correctPassword";

      database.query.mockResolvedValueOnce([testData.users.testUser1]);

      const error = await authService
        .loginAdmin(email, password)
        .catch((e) => e);

      expect(error.message).toBe("Only admin accounts can use this endpoint");
      expect(error.status).toBe(403);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe("refreshAccessToken", () => {
    it("should generate new access token with valid refresh token", async () => {
      const refreshToken = testData.tokens.validRefreshToken;

      database.query.mockResolvedValueOnce([{ token: refreshToken }]);
      tokenUtils.verifyToken.mockResolvedValueOnce({
        id: 1,
        email: testData.users.testUser1.email,
        role: "user",
      });
      tokenUtils.generateAccessToken.mockReturnValueOnce("newAccessToken");

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toEqual({ accessToken: "newAccessToken" });
      expect(tokenUtils.generateAccessToken).toHaveBeenCalled();
    });

    it("should throw error if refresh token is not found", async () => {
      const refreshToken = "invalidToken";

      database.query.mockResolvedValueOnce([]);

      const error = await authService
        .refreshAccessToken(refreshToken)
        .catch((e) => e);

      expect(error.message).toBe("Invalid refresh token");
      expect(error.status).toBe(403);
    });

    it("should throw error if refresh token is expired", async () => {
      const refreshToken = testData.tokens.validRefreshToken;

      database.query.mockResolvedValueOnce([{ token: refreshToken }]);
      tokenUtils.verifyToken.mockRejectedValueOnce(new Error("Token expired"));

      const error = await authService
        .refreshAccessToken(refreshToken)
        .catch((e) => e);

      expect(error.message).toBe("Invalid or expired refresh token");
      expect(error.status).toBe(403);
    });
  });

  describe("logoutUser", () => {
    it("should delete refresh token on logout", async () => {
      const refreshToken = testData.tokens.validRefreshToken;

      database.query.mockResolvedValueOnce({});

      await authService.logoutUser(refreshToken);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM refresh_tokens"),
        [refreshToken],
      );
    });

    it("should handle logout with no token", async () => {
      await authService.logoutUser(null);

      // Should not call database.query since token is null
      expect(database.query).not.toHaveBeenCalled();
    });
  });
});
