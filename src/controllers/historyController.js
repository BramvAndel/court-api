const historyService = require("../services/historyService");

/**
 * Get all history for the current user
 */
const getUserHistory = (req, res) => {
  try {
    const history = historyService.getUserHistory(req.user.id);
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
const getHistoryById = (req, res) => {
  try {
    const historyId = parseInt(req.params.id);
    const entry = historyService.getHistoryById(historyId, req.user.id);

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

module.exports = {
  getUserHistory,
  getHistoryById,
};
