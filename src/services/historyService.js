// In-memory history storage (replace with database in production)
const history = [];

/**
 * Add a history entry
 * @param {number} userId - User ID
 * @param {number} gameId - Game ID
 * @param {Object} data - Additional history data
 * @returns {Object} Created history object
 */
const addHistoryEntry = (userId, gameId, data) => {
  const entry = {
    id: history.length + 1,
    userId,
    gameId,
    ...data,
    createdAt: new Date(),
  };

  history.push(entry);
  return entry;
};

/**
 * Get all history for a user
 * @param {number} userId - User ID
 * @returns {Array} Array of history entries
 */
const getUserHistory = (userId) => {
  return history.filter((h) => h.userId === userId);
};

/**
 * Get history entry by ID
 * @param {number} historyId - History ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Object|null} History object or null if not found
 */
const getHistoryById = (historyId, userId) => {
  const entry = history.find((h) => h.id === historyId);

  if (!entry) {
    return null;
  }

  // Users can only view their own history
  if (entry.userId !== userId) {
    const error = new Error("Access denied");
    error.status = 403;
    throw error;
  }

  return entry;
};

module.exports = {
  addHistoryEntry,
  getUserHistory,
  getHistoryById,
};
