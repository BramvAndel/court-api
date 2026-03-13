const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const { authenticateToken, authenticateAdmin, ownerOrAdmin } = require("../middleware/auth");
const { validateRequest, commonSchemas } = require("../middleware/inputValidation");

const router = express.Router();

// Public routes
router.post("/", validateRequest(commonSchemas.register), authController.register); // POST /users (register)

// Protected routes
router.get("/", authenticateToken, authenticateAdmin, userController.getAllUsers);
router.get(
	"/:id",
	authenticateToken,
	validateRequest(commonSchemas.idParam),
	ownerOrAdmin(),
	userController.getUserById,
);
router.put(
	"/:id",
	authenticateToken,
	validateRequest({
		...commonSchemas.idParam,
		...commonSchemas.updateUser,
	}),
	ownerOrAdmin(),
	userController.updateUser,
);
router.delete(
	"/:id",
	authenticateToken,
	validateRequest(commonSchemas.idParam),
	ownerOrAdmin(),
	userController.deleteUser,
);

module.exports = router;
