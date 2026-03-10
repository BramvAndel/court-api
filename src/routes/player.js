const express = require("express");
const playerController = require("../controllers/playerController");

const router = express.Router();

// Public routes
router.get("/search/:username", playerController.searchPlayers);
router.get("/profile/:id", playerController.getPlayerProfile);

module.exports = router;
