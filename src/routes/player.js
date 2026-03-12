const express = require("express");
const playerController = require("../controllers/playerController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/leaderboard", playerController.getLeaderboard);

// Protected routes
router.get(
  "/search/:username",
  authenticateToken,
  playerController.searchPlayers,
);
router.get(
  "/profile/:id",
  authenticateToken,
  playerController.getPlayerProfile,
);

module.exports = router;
