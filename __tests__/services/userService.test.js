// __tests__/services/userService.test.js
const userService = require("../../src/services/userService");
const database = require("../../src/config/database");
const { testData, resetMocks } = require("../helpers/testUtils");

jest.mock("../../src/config/database");

describe("UserService", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe("getUserById", () => {
    it("should return user profile without password", async () => {
      database.query.mockResolvedValueOnce([testData.users.testUser1]);

      const result = await userService.getUserById(1);

      expect(result).toEqual({
        id: testData.users.testUser1.userID,
        orgId: null,
        name: testData.users.testUser1.username,
        elo: testData.users.testUser1.elo,
        phone_number: testData.users.testUser1.phone_number,
        createdAt: testData.users.testUser1.created_at,
      });

      // Password should not be in result
      expect(result.password).toBeUndefined();
    });

    it("should include email and role for admin users", async () => {
      database.query.mockResolvedValueOnce([testData.users.testUser1]);

      const result = await userService.getUserById(1, true);

      expect(result).toEqual({
        id: testData.users.testUser1.userID,
        orgId: null,
        name: testData.users.testUser1.username,
        elo: testData.users.testUser1.elo,
        phone_number: testData.users.testUser1.phone_number,
        createdAt: testData.users.testUser1.created_at,
        email: testData.users.testUser1.email,
        role: testData.users.testUser1.role,
      });
    });

    it("should return null if user not found", async () => {
      database.query.mockResolvedValueOnce([]);

      const result = await userService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("should update user email and username", async () => {
      const updates = {
        email: "newemail@example.com",
        name: "newusername",
      };

      const updatedUserData = {
        ...testData.users.testUser1,
        email: updates.email,
        username: updates.name,
      };

      database.query
        .mockResolvedValueOnce({}) // Update query
        .mockResolvedValueOnce([updatedUserData]); // Get updated user

      const result = await userService.updateUser(1, updates);

      expect(result.id).toEqual(testData.users.testUser1.userID);
      expect(result.name).toEqual(updates.name);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET"),
        expect.arrayContaining([updates.email, updates.name, 1]),
      );
    });

    it("should update only provided fields", async () => {
      const updates = { email: "newemail@example.com" };

      database.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([{ ...testData.users.testUser1 }]);

      await userService.updateUser(1, updates);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET email = ?"),
        expect.arrayContaining([updates.email, 1]),
      );
    });

    it("should return current user if no updates provided", async () => {
      database.query.mockResolvedValueOnce([testData.users.testUser1]);

      const result = await userService.updateUser(1, {});

      expect(result).toBeTruthy();
      expect(database.query).toHaveBeenCalledTimes(1);
    });

    it("should handle username field", async () => {
      const updates = { username: "newusername" };

      database.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([{ ...testData.users.testUser1 }]);

      await userService.updateUser(1, updates);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET username = ?"),
        expect.arrayContaining([updates.username, 1]),
      );
    });

    it("should update admin fields role and elo", async () => {
      const updates = { role: "admin", elo: 1300 };

      database.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([
          { ...testData.users.testUser1, role: updates.role, elo: updates.elo },
        ]);

      await userService.updateUser(1, updates);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET role = ?, elo = ?"),
        expect.arrayContaining([updates.role, updates.elo, 1]),
      );
    });

    it("should support elo value of zero", async () => {
      const updates = { elo: 0 };

      database.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce([{ ...testData.users.testUser1, elo: 0 }]);

      await userService.updateUser(1, updates);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET elo = ?"),
        expect.arrayContaining([0, 1]),
      );
    });

    it("should convert duplicate constraint errors to 409", async () => {
      const duplicateError = new Error("Duplicate entry");
      duplicateError.code = "ER_DUP_ENTRY";
      database.query.mockRejectedValueOnce(duplicateError);

      await expect(
        userService.updateUser(1, { email: "taken@example.com" }),
      ).rejects.toMatchObject({
        status: 409,
        message: "Email or username already exists",
      });
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      database.query.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await userService.deleteUser(1);

      expect(result).toBe(true);
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM users"),
        [1],
      );
    });

    it("should return false if user not found", async () => {
      database.query.mockResolvedValueOnce({ affectedRows: 0 });

      const result = await userService.deleteUser(999);

      expect(result).toBe(false);
    });
  });

  describe("getAllUsers", () => {
    it("should return all users without passwords", async () => {
      const rawUsers = [testData.users.testUser1, testData.users.testUser2];
      database.query.mockResolvedValueOnce(rawUsers);

      const result = await userService.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: testData.users.testUser1.userID,
        orgId: null,
        email: testData.users.testUser1.email,
        name: testData.users.testUser1.username,
        role: testData.users.testUser1.role,
        elo: testData.users.testUser1.elo,
        phone_number: testData.users.testUser1.phone_number,
        createdAt: testData.users.testUser1.created_at,
      });
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
      );
    });

    it("should return empty array if no users", async () => {
      database.query.mockResolvedValueOnce([]);

      const result = await userService.getAllUsers();

      expect(result).toEqual([]);
    });
  });
});
