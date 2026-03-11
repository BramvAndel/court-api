const express = require("express");
const gameController = require("../controllers/gameController");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", gameController.getAllGames);
router.get("/:id", authenticateToken, gameController.getGameById);

// Protected routes
router.post("/:id/signup", authenticateToken, gameController.signupForGame);

// Admin routes
router.post(
  "/create",
  authenticateToken,
  authenticateAdmin,
  gameController.createGame,
);
router.put(
  "/:id/start",
  authenticateToken,
  authenticateAdmin,
  gameController.startGame,
);
router.put(
  "/:id/end",
  authenticateToken,
  authenticateAdmin,
  gameController.endGame,
);
router.put(
  "/:id/process",
  authenticateToken,
  authenticateAdmin,
  gameController.processGame,
);

module.exports = router;
