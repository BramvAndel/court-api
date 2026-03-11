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
    const game = await gameService.getGameById(gameId);

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
 * Create a new game (admin only)
 */
const createGame = async (req, res) => {
  try {
    const gameData = req.body;
    const game = await gameService.createGame(gameData, req.user.id);

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
    const signup = await gameService.signupForGame(gameId, req.user.id);

    res.json({ message: "Signed up", signup });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to sign up for game" });
  }
};

/**
 * Start a game (admin only) — moves status from 'planned' to 'started'
 */
const startGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = await gameService.startGame(gameId);
    res.json(game);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to start game" });
  }
};

/**
 * End a game (admin only) — moves status from 'started' to 'ended'
 */
const endGame = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const game = await gameService.endGame(gameId);
    res.json(game);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to end game" });
  }
};

/**
 * Process a game (admin only) — records scores, calculates ELO, marks 'processed'
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

    const result = await gameService.processGame(gameId, winnerId, scores);
    res.json(result);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to process game" });
  }
};

module.exports = {
  getAllGames,
  getGameById,
  createGame,
  signupForGame,
  startGame,
  endGame,
  processGame,
};
