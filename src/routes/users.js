const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const { authenticateToken, authenticateAdmin, ownerOrAdmin } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.post("/", authController.register); // POST /users (register)

// Protected routes
router.get("/", authenticateToken, authenticateAdmin, userController.getAllUsers);
router.get("/:id", authenticateToken, ownerOrAdmin(), userController.getUserById);
router.put("/:id", authenticateToken, ownerOrAdmin(), userController.updateUser);
router.delete("/:id", authenticateToken, ownerOrAdmin(), userController.deleteUser);

module.exports = router;
