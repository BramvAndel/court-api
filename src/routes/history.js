const express = require("express");
const historyController = require("../controllers/historyController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All history routes require authentication
router.get("/games", authenticateToken, historyController.getUserHistory);
router.get("/games/:id", authenticateToken, historyController.getHistoryById);
router.get("/elo", authenticateToken, historyController.getUserEloHistory);

module.exports = router;
