const historyService = require("../../src/services/historyService");
const database = require("../../src/config/database");

jest.mock("../../src/config/database");

describe("HistoryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getHistoryById", () => {
    it("should block non-manager when not a participant", async () => {
      database.query
        .mockResolvedValueOnce([{ userID: 10, orgID: 7 }])
        .mockResolvedValueOnce([]);

      await expect(
        historyService.getHistoryById(2, 10, { isManager: false, orgId: 7 }),
      ).rejects.toMatchObject({ status: 403, message: "Access denied" });
    });

    it("should allow manager to read org game without participant check", async () => {
      database.query
        .mockResolvedValueOnce([{ userID: 12, orgID: 7 }])
        .mockResolvedValueOnce([
          {
            gameID: 3,
            name: "Friday Session",
            description: "desc",
            createdAt: "2026-06-18T10:00:00.000Z",
            startedAt: null,
            endedAt: null,
            status: "started",
            createdBy: 1,
            winner_userID: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            participantID: 1,
            userID: 10,
            username: "u1",
            email: "u1@example.com",
            score: 21,
          },
        ]);

      const result = await historyService.getHistoryById(3, 12, {
        isManager: true,
        orgId: 7,
      });

      expect(result.id).toBe(3);
      expect(result.participants[0].email).toBe("u1@example.com");
    });
  });

  describe("getUserEloHistory", () => {
    it("should return 403 when user is outside org scope", async () => {
      database.query.mockResolvedValueOnce([]);

      await expect(
        historyService.getUserEloHistory(99, 7),
      ).rejects.toMatchObject({
        status: 403,
        message: "Access denied",
      });
    });
  });
});
