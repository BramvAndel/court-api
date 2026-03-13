const express = require("express");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const { validateRequest, commonSchemas } = require("../middleware/inputValidation");

const router = express.Router();

// Public routes with strict rate limiting
router.post(
	"/register",
	authLimiter,
	validateRequest(commonSchemas.register),
	authController.register,
);
router.post(
	"/login",
	authLimiter,
	validateRequest(commonSchemas.login),
	authController.login,
);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Protected routes
router.get("/profile", authenticateToken, authController.getProfile);

module.exports = router;
