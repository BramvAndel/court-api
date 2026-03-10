const express = require("express");
const historyController = require("../controllers/historyController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All history routes require authentication
router.get("/", authenticateToken, historyController.getUserHistory);
router.get("/:id", authenticateToken, historyController.getHistoryById);

module.exports = router;
