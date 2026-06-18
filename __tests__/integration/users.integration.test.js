// __tests__/integration/users.integration.test.js
/**
 * User Controller Integration Tests
 * These test the user controller with mocked services
 */

const userController = require("../../src/controllers/userController");
const userService = require("../../src/services/userService");
const { testData } = require("../helpers/testUtils");

jest.mock("../../src/services/userService");

describe("User Controller Integration Tests", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      body: {},
      user: { id: 1, role: "user" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getAllUsers", () => {
    it("should get all users", async () => {
      const users = [
        {
          id: 1,
          name: "testuser1",
          elo: 1200,
        },
        {
          id: 2,
          name: "testuser2",
          elo: 1150,
        },
      ];

      userService.getAllUsers.mockResolvedValueOnce(users);

      await userController.getAllUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(users);
    });

    it("should handle errors gracefully", async () => {
      userService.getAllUsers.mockRejectedValueOnce(
        new Error("Database error"),
      );

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getUserById", () => {
    it("should get user by ID", async () => {
      req.params.id = "1";

      userService.getUserById.mockResolvedValueOnce({
        id: 1,
        name: "testuser1",
        elo: 1200,
      });

      await userController.getUserById(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(1, true);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if user not found", async () => {
      req.params.id = "1"; // Same as req.user.id to avoid 403 error
      req.user = { id: 1, role: "user" };

      userService.getUserById.mockResolvedValueOnce(null);

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should prevent non-admin users from viewing other profiles", async () => {
      req.params.id = "2";
      req.user = { id: 1, role: "user" };

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should allow admin users to view any profile", async () => {
      req.params.id = "2";
      req.user = { id: 1, role: "admin" };

      userService.getUserById.mockResolvedValueOnce({
        id: 2,
        name: "other user",
      });

      await userController.getUserById(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      req.params.id = "1";
      req.body = { email: "newemail@example.com" };
      req.user = { id: 1, role: "user" };

      userService.updateUser.mockResolvedValueOnce({
        id: 1,
        name: "testuser1",
        email: "newemail@example.com",
      });

      await userController.updateUser(req, res);

      expect(userService.updateUser).toHaveBeenCalledWith(1, req.body, true);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if user not found", async () => {
      req.params.id = "999";
      req.body = { email: "test@example.com" };
      req.user = { id: 999, role: "user" };

      userService.updateUser.mockResolvedValueOnce(null);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should deny non-admin role updates", async () => {
      req.params.id = "1";
      req.body = { role: "admin" };
      req.user = { id: 1, role: "user" };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it("should deny non-admin elo updates", async () => {
      req.params.id = "1";
      req.body = { elo: 1300 };
      req.user = { id: 1, role: "user" };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it("should prevent granting admin role via users endpoint", async () => {
      req.params.id = "2";
      req.body = { role: "admin", elo: 1400 };
      req.user = { id: 1, role: "admin" };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it("should deny admin changing own role", async () => {
      req.params.id = "1";
      req.body = { role: "user" };
      req.user = { id: 1, role: "admin" };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(userService.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      req.params.id = "1";

      userService.deleteUser.mockResolvedValueOnce(true);

      await userController.deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("deleted"),
        }),
      );
    });

    it("should reject deleting another user without manager/admin role", async () => {
      req.params.id = "999";

      userService.deleteUser.mockResolvedValueOnce(false);

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should prevent admin from deleting own account", async () => {
      req.params.id = "1";
      req.user = { id: 1, role: "admin" };

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(userService.deleteUser).not.toHaveBeenCalled();
    });
  });
});
