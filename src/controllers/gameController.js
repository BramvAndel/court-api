const gameService = require("../services/gameService");

/**
 * Get all games
 */
const getAllGames = async (req, res) => {
  try {
    const games = await gameService.getAllGames();
    res.json(games);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch games" });
  }
};

/**
 * Get game by ID
 */
const getGameById = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = await gameService.getGameById(gameId, req.user?.orgId || null);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.json(game);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch game" });
  }
};

/**
 * Get game schedule with rounds, opponents and fields
 */
const getGameSchedule = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const schedule = await gameService.getGameSchedule(
      gameId,
      req.user?.orgId || null,
    );

    if (!schedule) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.json(schedule);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch game schedule" });
  }
};

/**
 * Create a new game (manager only)
 */
const createGame = async (req, res) => {
  try {
    const gameData = req.body;
    const game = await gameService.createGame(
      { ...gameData, orgId: req.user.orgId || gameData.orgId || null },
      req.user.id,
    );

    res.status(201).json(game);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to create game" });
  }
};

/**
 * Sign up for a game
 */
const signupForGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const signup = await gameService.signupForGame(
      gameId,
      req.user.id,
      null,
      req.user.orgId || null,
    );

    res.json({ message: "Signed up", signup });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to sign up for game" });
  }
};

/**
 * Sign up another user for a game (manager only)
 */
const signupUserForGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const signup = await gameService.signupForGame(
      gameId,
      userId,
      req.user.id,
      req.user.orgId || null,
    );

    res.json({ message: "Signed up", signup });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to sign up user for game" });
  }
};

/**
 * Leave a game (remove authenticated user from game)
 */
const leaveGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    await gameService.leaveGame(gameId, req.user.id, req.user.orgId || null);

    res.json({ message: "Left game" });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to leave game" });
  }
};

/**
 * Remove a specific user from a game (manager only)
 */
const removeUserFromGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const { reason } = req.body || {};
    await gameService.removeUserFromGameAsAdmin(
      gameId,
      userId,
      req.user.id,
      reason,
      req.user.orgId || null,
    );

    res.json({ message: "User removed from game" });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to remove user from game" });
  }
};

/**
 * Start a game (manager only) — moves status from 'planned' to 'started'
 */
const startGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = await gameService.startGame(gameId, req.user.orgId || null);
    res.json(game);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to start game" });
  }
};

/**
 * End a game (manager only) — moves status from 'started' to 'ended'
 */
const endGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = await gameService.endGame(gameId, req.user.orgId || null);
    res.json(game);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to end game" });
  }
};

/**
 * Process a game (manager only) — records scores, calculates ELO, marks 'processed'
 * Body: { winnerId: number, scores: [{ userId: number, score: number }] }
 */
const processGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { winnerId, scores } = req.body;

    if (!winnerId) {
      return res.status(400).json({ message: "winnerId is required" });
    }
    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ message: "scores array is required" });
    }

    const result = await gameService.processGame(
      gameId,
      winnerId,
      scores,
      req.user.orgId || null,
    );
    res.json(result);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to process game" });
  }
};

/**
 * Get current round for a game
 */
const getCurrentRound = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const currentRound = await gameService.getCurrentRound(
      gameId,
      req.user?.orgId || null,
    );

    res.json({ gameId, currentRound });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch current round" });
  }
};

/**
 * Set current round for a game (manager only)
 */
const setCurrentRound = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { roundNumber } = req.body;

    if (!roundNumber || roundNumber < 1) {
      return res
        .status(400)
        .json({ message: "roundNumber must be at least 1" });
    }

    const result = await gameService.setCurrentRound(
      gameId,
      roundNumber,
      req.user.orgId || null,
    );
    res.json(result);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to set current round" });
  }
};

/**
 * Send a match request to another player
 */
const sendMatchRequest = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { requestedForUserId, message } = req.body;

    if (!requestedForUserId) {
      return res
        .status(400)
        .json({ message: "requestedForUserId is required" });
    }

    const result = await gameService.sendMatchRequest(
      gameId,
      req.user.id,
      requestedForUserId,
      message,
      req.user.orgId || null,
    );

    res.status(201).json(result);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to send match request" });
  }
};

/**
 * Respond to a match request
 */
const respondToMatchRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    const result = await gameService.respondToMatchRequest(
      requestId,
      status,
      req.user.id,
      req.user.orgId || null,
    );
    res.json(result);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to respond to match request" });
  }
};

/**
 * Get match requests for the authenticated user
 */
const getMatchRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await gameService.getMatchRequests(
      req.user.id,
      status,
      req.user.orgId || null,
    );

    res.json(requests);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch match requests" });
  }
};

module.exports = {
  getAllGames,
  getGameById,
  getGameSchedule,
  createGame,
  signupForGame,
  signupUserForGame,
  leaveGame,
  removeUserFromGame,
  startGame,
  endGame,
  processGame,
  getCurrentRound,
  setCurrentRound,
  sendMatchRequest,
  respondToMatchRequest,
  getMatchRequests,
};
