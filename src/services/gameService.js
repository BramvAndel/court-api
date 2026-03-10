const { query } = require("../config/database");

/**
 * Create a new game
 * @param {Object} gameData - Game data
 * @param {number} creatorId - ID of the user creating the game
 * @returns {Object} Created game object
 */
const createGame = async (gameData, creatorId) => {
  const { name, description, startedAt, endedAt, status } = gameData;

  const result = await query(
    "INSERT INTO games (name, description, startedAt, endedAt, status, createdBy) VALUES (?, ?, ?, ?, ?, ?)",
    [
      name || "Unnamed Game",
      description || null,
      startedAt || null,
      endedAt || null,
      status || "planned",
      creatorId,
    ],
  );

  return {
    id: result.insertId,
    name: name || "Unnamed Game",
    description,
    startedAt,
    endedAt,
    status: status || "planned",
    createdBy: creatorId,
  };
};

/**
 * Get all games
 * @returns {Array} Array of all games
 */
const getAllGames = async () => {
  const games = await query(`
    SELECT 
      g.*,
      COUNT(gp.participantID) as signupCount
    FROM games g
    LEFT JOIN game_participants gp ON g.gameID = gp.gameID
    GROUP BY g.gameID
    ORDER BY g.createdAt DESC
  `);

  return games.map((game) => ({
    id: game.gameID,
    name: game.name,
    description: game.description,
    createdAt: game.createdAt,
    startedAt: game.startedAt,
    endedAt: game.endedAt,
    status: game.status,
    createdBy: game.createdBy,
    winnerUserId: game.winner_userID,
    signupCount: game.signupCount,
  }));
};

/**
 * Get game by ID
 * @param {number} gameId - Game ID
 * @returns {Object|null} Game object or null if not found
 */
const getGameById = async (gameId) => {
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    return null;
  }

  const game = games[0];

  // Get participants
  const participants = await query(
    `SELECT gp.*, u.username, u.email 
     FROM game_participants gp
     JOIN users u ON gp.userID = u.userID
     WHERE gp.gameID = ?`,
    [gameId],
  );

  return {
    id: game.gameID,
    name: game.name,
    description: game.description,
    createdAt: game.createdAt,
    startedAt: game.startedAt,
    endedAt: game.endedAt,
    status: game.status,
    createdBy: game.createdBy,
    winnerUserId: game.winner_userID,
    participants: participants.map((p) => ({
      id: p.participantID,
      userId: p.userID,
      username: p.username,
      email: p.email,
      score: p.score,
    })),
  };
};

/**
 * Sign up for a game
 * @param {number} gameId - Game ID
 * @param {number} userId - User ID
 * @returns {Object} Signup object
 * @throws {Error} If already signed up or game not found
 */
const signupForGame = async (gameId, userId) => {
  // Check if game exists
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }

  // Check if already signed up
  const existingSignups = await query(
    "SELECT * FROM game_participants WHERE gameID = ? AND userID = ?",
    [gameId, userId],
  );

  if (existingSignups.length > 0) {
    const error = new Error("Already signed up for this game");
    error.status = 409;
    throw error;
  }

  const result = await query(
    "INSERT INTO game_participants (gameID, userID) VALUES (?, ?)",
    [gameId, userId],
  );

  return {
    id: result.insertId,
    gameId,
    userId,
  };
};

module.exports = {
  createGame,
  getAllGames,
  getGameById,
  signupForGame,
};
