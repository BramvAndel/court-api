const { query } = require("../config/database");

/**
 * Get all history for a user (games they participated in)
 * @param {number} userId - User ID
 * @returns {Array} Array of history entries (games)
 */
const getUserHistory = async (userId) => {
  const games = await query(
    `SELECT 
      g.*,
      gp.score as userScore,
      gp.participantID
    FROM games g
    JOIN game_participants gp ON g.gameID = gp.gameID
    WHERE gp.userID = ?
    ORDER BY g.createdAt DESC`,
    [userId],
  );

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
    userScore: game.userScore,
    participantId: game.participantID,
  }));
};

/**
 * Get history entry by ID (game details)
 * @param {number} gameId - Game ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Object|null} History object or null if not found
 */
const getHistoryById = async (gameId, userId) => {
  // Check if user participated in this game
  const participants = await query(
    "SELECT * FROM game_participants WHERE gameID = ? AND userID = ?",
    [gameId, userId],
  );

  if (participants.length === 0) {
    const error = new Error("Access denied");
    error.status = 403;
    throw error;
  }

  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    return null;
  }

  const game = games[0];

  // Get all participants
  const allParticipants = await query(
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
    participants: allParticipants.map((p) => ({
      id: p.participantID,
      userId: p.userID,
      username: p.username,
      email: p.email,
      score: p.score,
    })),
  };
};

/**
 * Get ELO history for a user
 * @param {number} userId - User ID
 * @returns {Array} Array of ELO ratings over time
 */
const getUserEloHistory = async (userId) => {
  // For now, return mock ELO data
  // In a real implementation, you would have an elo_history table
  const games = await query(
    `SELECT 
      g.gameID,
      g.endedAt,
      gp.score
    FROM games g
    JOIN game_participants gp ON g.gameID = gp.gameID
    WHERE gp.userID = ? AND g.status = 'ended'
    ORDER BY g.endedAt ASC`,
    [userId],
  );

  // Calculate mock ELO based on game results
  let currentElo = 1000; // Starting ELO
  const eloHistory = [{ gameId: null, timestamp: null, elo: currentElo }];

  games.forEach((game) => {
    // Simple ELO calculation (win = +20, loss = -20)
    // This is a placeholder - implement proper ELO calculation
    if (game.score) {
      currentElo += game.score > 0 ? 20 : -20;
    }

    eloHistory.push({
      gameId: game.gameID,
      timestamp: game.endedAt,
      elo: currentElo,
    });
  });

  return eloHistory;
};

module.exports = {
  getUserHistory,
  getHistoryById,
  getUserEloHistory,
};
