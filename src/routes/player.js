const express = require("express");
const playerController = require("../controllers/playerController");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest, commonSchemas } = require("../middleware/inputValidation");

const router = express.Router();

// Public routes
router.get("/leaderboard", playerController.getLeaderboard);

// Protected routes
router.get(
  "/search/:username",
  authenticateToken,
  validateRequest(commonSchemas.usernameParam),
  playerController.searchPlayers,
);
router.get(
  "/profile/:id",
  authenticateToken,
  validateRequest(commonSchemas.idParam),
  playerController.getPlayerProfile,
);

module.exports = router;
