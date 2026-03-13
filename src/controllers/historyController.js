const historyService = require("../services/historyService");

/**
 * Get all history for the current user
 */
const getUserHistory = async (req, res) => {
  try {
    const history = await historyService.getUserHistory(req.user.id);
    res.json(history);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch history" });
  }
};

/**
 * Get history entry by ID
 */
const getHistoryById = async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const isAdmin = req.user.role === "admin";
    const entry = await historyService.getHistoryById(gameId, req.user.id, isAdmin);

    if (!entry) {
      return res.status(404).json({ message: "History entry not found" });
    }

    res.json(entry);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch history entry" });
  }
};

/**
 * Get ELO history for the current user
 */
const getUserEloHistory = async (req, res) => {
  try {
    const eloHistory = await historyService.getUserEloHistory(req.user.id);
    res.json(eloHistory);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch ELO history" });
  }
};

/**
 * Get ELO history for a specific player (any authenticated user)
 */
const getPlayerEloHistory = async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);

    const eloHistory = await historyService.getUserEloHistory(targetId);
    res.json(eloHistory);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch player ELO history" });
  }
};

module.exports = {
  getUserHistory,
  getHistoryById,
  getUserEloHistory,
  getPlayerEloHistory,
};
