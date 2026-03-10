// In-memory game storage (replace with database in production)
const games = [];
const signups = [];

/**
 * Create a new game
 * @param {Object} gameData - Game data
 * @param {number} creatorId - ID of the user creating the game
 * @returns {Object} Created game object
 */
const createGame = (gameData, creatorId) => {
  const game = {
    id: games.length + 1,
    ...gameData,
    createdBy: creatorId,
    createdAt: new Date(),
    signups: [],
  };

  games.push(game);
  return game;
};

/**
 * Get all games
 * @returns {Array} Array of all games
 */
const getAllGames = () => {
  return games.map((game) => ({
    ...game,
    signupCount: signups.filter((s) => s.gameId === game.id).length,
  }));
};

/**
 * Get game by ID
 * @param {number} gameId - Game ID
 * @returns {Object|null} Game object or null if not found
 */
const getGameById = (gameId) => {
  const game = games.find((g) => g.id === gameId);
  if (!game) {
    return null;
  }

  return {
    ...game,
    signups: signups.filter((s) => s.gameId === gameId),
  };
};

/**
 * Sign up for a game
 * @param {number} gameId - Game ID
 * @param {number} userId - User ID
 * @returns {Object} Signup object
 * @throws {Error} If already signed up or game not found
 */
const signupForGame = (gameId, userId) => {
  const game = games.find((g) => g.id === gameId);
  if (!game) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }

  // Check if already signed up
  const existingSignup = signups.find(
    (s) => s.gameId === gameId && s.userId === userId,
  );
  if (existingSignup) {
    const error = new Error("Already signed up for this game");
    error.status = 409;
    throw error;
  }

  const signup = {
    id: signups.length + 1,
    gameId,
    userId,
    signedUpAt: new Date(),
  };

  signups.push(signup);
  return signup;
};

module.exports = {
  createGame,
  getAllGames,
  getGameById,
  signupForGame,
};
