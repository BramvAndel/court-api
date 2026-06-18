const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const {
  authenticateToken,
  authenticateManager,
  enforceOrgWriteAccess,
} = require("../middleware/auth");
const {
  validateRequest,
  commonSchemas,
} = require("../middleware/inputValidation");

const router = express.Router();

// Public routes
router.post(
  "/",
  validateRequest(commonSchemas.register),
  authController.register,
); // POST /users (register)

// Protected routes
router.get(
  "/",
  authenticateToken,
  authenticateManager,
  userController.getAllUsers,
);
router.get(
  "/:id",
  authenticateToken,
  validateRequest(commonSchemas.idParam),
  userController.getUserById,
);
router.put(
  "/:id",
  authenticateToken,
  enforceOrgWriteAccess,
  validateRequest({
    ...commonSchemas.idParam,
    ...commonSchemas.updateUser,
  }),
  userController.updateUser,
);
router.delete(
  "/:id",
  authenticateToken,
  enforceOrgWriteAccess,
  validateRequest(commonSchemas.idParam),
  userController.deleteUser,
);

module.exports = router;
