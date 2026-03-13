const express = require("express");
const historyController = require("../controllers/historyController");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest, commonSchemas } = require("../middleware/inputValidation");

const router = express.Router();

// All history routes require authentication
router.get("/games", authenticateToken, historyController.getUserHistory);
router.get(
	"/games/:id",
	authenticateToken,
	validateRequest(commonSchemas.idParam),
	historyController.getHistoryById,
);
router.get("/elo", authenticateToken, historyController.getUserEloHistory);
router.get(
	"/elo/:userId",
	authenticateToken,
	validateRequest(commonSchemas.userIdParam),
	historyController.getPlayerEloHistory,
);

module.exports = router;
