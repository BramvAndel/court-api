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
 * Get ELO history for a user from the historical_elo table
 * @param {number} userId - User ID
 * @returns {Array} Array of ELO records over time
 */
const getUserEloHistory = async (userId) => {
  // Verify user exists
  const users = await query("SELECT userID, elo FROM users WHERE userID = ?", [userId]);
  if (users.length === 0) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const records = await query(
    `SELECT
      h.id,
      h.elo,
      h.recorded_at,
      g.gameID,
      g.name   AS gameName,
      g.status AS gameStatus
    FROM historical_elo h
    LEFT JOIN games g ON g.gameID = (
      SELECT gp.gameID
      FROM game_participants gp
      JOIN games g2 ON g2.gameID = gp.gameID
      WHERE gp.userID = h.userID
        AND g2.status = 'processed'
        AND g2.endedAt <= h.recorded_at
      ORDER BY g2.endedAt DESC
      LIMIT 1
    )
    WHERE h.userID = ?
    ORDER BY h.recorded_at ASC`,
    [userId],
  );

  return {
    userId,
    currentElo: users[0].elo,
    history: records.map((r) => ({
      id: r.id,
      elo: r.elo,
      recordedAt: r.recorded_at,
      gameId: r.gameID || null,
      gameName: r.gameName || null,
    })),
  };
};

module.exports = {
  getUserHistory,
  getHistoryById,
  getUserEloHistory,
};
