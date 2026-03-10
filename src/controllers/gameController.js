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

module.exports = {
  getAllGames,
  getGameById,
  createGame,
  signupForGame,
};
