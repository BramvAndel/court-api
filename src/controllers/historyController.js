const historyService = require("../services/historyService");

/**
 * Get all history for the current user
 */
const getUserHistory = async (req, res) => {
  try {
    const history = await historyService.getUserHistory(
      req.user.id,
      req.user.orgId || null,
    );
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
    const isManager = req.user.role === "manager";
    const entry = await historyService.getHistoryById(gameId, req.user.id, {
      isManager,
      orgId: req.user.orgId || null,
    });

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
    const eloHistory = await historyService.getUserEloHistory(
      req.user.id,
      req.user.orgId || null,
    );
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

    const eloHistory = await historyService.getUserEloHistory(
      targetId,
      req.user.orgId || null,
    );
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
