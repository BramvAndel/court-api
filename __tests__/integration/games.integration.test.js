// __tests__/integration/games.integration.test.js
/**
 * Game Controller Integration Tests
 * These test the game controller with mocked services
 */

const gameController = require("../../src/controllers/gameController");
const gameService = require("../../src/services/gameService");
const { testData } = require("../helpers/testUtils");

jest.mock("../../src/services/gameService");

describe("Game Controller Integration Tests", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      body: {},
      user: { id: 1, role: "user", orgId: 7 },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getAllGames", () => {
    it("should get all games", async () => {
      const games = [
        {
          gameID: 1,
          name: "Tennis Tournament",
          maxPlayers: 8,
        },
      ];

      gameService.getAllGames.mockResolvedValueOnce(games);

      await gameController.getAllGames(req, res);

      expect(res.json).toHaveBeenCalledWith(games);
    });

    it("should handle errors", async () => {
      gameService.getAllGames.mockRejectedValueOnce(
        new Error("Database error"),
      );

      await gameController.getAllGames(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getGameById", () => {
    it("should get game by ID", async () => {
      req.params.id = "1";

      const game = {
        gameID: 1,
        name: "Tennis Tournament",
        maxPlayers: 8,
      };

      gameService.getGameById.mockResolvedValueOnce(game);

      await gameController.getGameById(req, res);

      expect(gameService.getGameById).toHaveBeenCalledWith(1, 7);
      expect(res.json).toHaveBeenCalledWith(game);
    });

    it("should return 404 if game not found", async () => {
      req.params.id = "999";

      gameService.getGameById.mockResolvedValueOnce(null);

      await gameController.getGameById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getGameSchedule", () => {
    it("should get game schedule", async () => {
      req.params.id = "1";

      const schedule = {
        gameID: 1,
        rounds: [
          {
            round: 1,
            matches: [
              {
                field: 1,
                playerA: { userId: 1, username: "player1" },
                playerB: { userId: 2, username: "player2" },
              },
            ],
          },
        ],
      };

      gameService.getGameSchedule.mockResolvedValueOnce(schedule);

      await gameController.getGameSchedule(req, res);

      expect(gameService.getGameSchedule).toHaveBeenCalledWith(1, 7);
      expect(res.json).toHaveBeenCalledWith(schedule);
    });

    it("should return 404 if game not found", async () => {
      req.params.id = "999";

      gameService.getGameSchedule.mockResolvedValueOnce(null);

      await gameController.getGameSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("createGame", () => {
    it("should create a new game", async () => {
      req.body = {
        name: "New Tournament",
        maxPlayers: 8,
      };

      const newGame = {
        gameID: 1,
        ...req.body,
      };

      gameService.createGame.mockResolvedValueOnce(newGame);

      await gameController.createGame(req, res);

      expect(gameService.createGame).toHaveBeenCalledWith(
        { ...req.body, orgId: 7 },
        1,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newGame);
    });

    it("should handle creation errors", async () => {
      req.body = { name: "Invalid" };

      gameService.createGame.mockRejectedValueOnce(
        new Error("Invalid game data"),
      );

      await gameController.createGame(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("signupForGame", () => {
    it("should sign up user for game", async () => {
      req.params.id = "1";

      const signup = {
        gameID: 1,
        userID: 1,
        signed_up_at: new Date(),
      };

      gameService.signupForGame.mockResolvedValueOnce(signup);

      await gameController.signupForGame(req, res);

      expect(gameService.signupForGame).toHaveBeenCalledWith(1, 1, null, 7);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if game not found", async () => {
      req.params.id = "999";

      const error = new Error("Game not found");
      error.status = 404;
      gameService.signupForGame.mockRejectedValueOnce(error);

      await gameController.signupForGame(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("endGame", () => {
    it("should end a game", async () => {
      req.params.id = "1";

      gameService.endGame.mockResolvedValueOnce({
        gameID: 1,
        status: "ended",
      });

      await gameController.endGame(req, res);

      expect(gameService.endGame).toHaveBeenCalledWith(1, 7);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if game not found", async () => {
      req.params.id = "999";

      const error = new Error("Game not found");
      error.status = 404;
      gameService.endGame.mockRejectedValueOnce(error);

      await gameController.endGame(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
