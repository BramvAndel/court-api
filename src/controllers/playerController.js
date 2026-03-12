const userService = require("../services/userService");

/**
 * Search for players by username
 */
const searchPlayers = async (req, res) => {
  try {
    const username = req.params.username;
    const players = await userService.searchUsersByUsername(username);
    res.json(players);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to search players" });
  }
};

/**
 * Get player profile by ID
 */
const getPlayerProfile = async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const isAdmin = req.user?.role === "admin";
    const player = await userService.getUserById(playerId, isAdmin);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(player);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch player profile" });
  }
};

module.exports = {
  searchPlayers,
  getPlayerProfile,
};
