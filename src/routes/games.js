const express = require("express");
const gameController = require("../controllers/gameController");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", gameController.getAllGames);
router.get("/:id", gameController.getGameById);

// Protected routes
router.post("/:id/signup", authenticateToken, gameController.signupForGame);

// Admin routes
router.post(
  "/",
  authenticateToken,
  authenticateAdmin,
  gameController.createGame,
);

module.exports = router;
