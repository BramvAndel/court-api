const userService = require("../services/userService");

/**
 * Search for players by username
 */
const searchPlayers = async (req, res) => {
  try {
    const username = req.params.username;
    const players = req.user.orgId
      ? await userService.searchUsersByUsernameInOrg(req.user.orgId, username)
      : await userService.searchUsersByUsername(username);
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
    const isManager = req.user?.role === "manager";
    const isAdmin = req.user?.role === "admin";
    const player = await userService.getUserById(
      playerId,
      isManager || isAdmin,
    );

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    if (
      req.user?.orgId &&
      player.orgId &&
      req.user.orgId !== player.orgId &&
      req.user.role !== "admin"
    ) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(player);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch player profile" });
  }
};

/**
 * Get leaderboard - top 50 players by ELO
 */
const getLeaderboard = async (req, res) => {
  try {
    let orgId = req.user?.orgId || null;

    if (!orgId && req.query.orgId) {
      orgId = parseInt(req.query.orgId, 10);
    }

    if (!orgId) {
      return res
        .status(400)
        .json({ message: "orgId is required when unauthenticated" });
    }

    const leaderboard = await userService.getLeaderboardByOrgId(orgId);
    res.json(leaderboard);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch leaderboard" });
  }
};

module.exports = {
  searchPlayers,
  getPlayerProfile,
  getLeaderboard,
};
