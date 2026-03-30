const express = require("express");
const gameController = require("../controllers/gameController");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const {
  validateRequest,
  commonSchemas,
} = require("../middleware/inputValidation");

const router = express.Router();

// Public routes
router.get("/", gameController.getAllGames);
router.get(
  "/:id",
  authenticateToken,
  validateRequest(commonSchemas.idParam),
  gameController.getGameById,
);
router.get(
  "/:id/schedule",
  authenticateToken,
  validateRequest(commonSchemas.idParam),
  gameController.getGameSchedule,
);

// Protected routes (authenticated users)
router.post(
  "/:id/signup",
  authenticateToken,
  validateRequest(commonSchemas.idParam),
  gameController.signupForGame,
);
router.post(
  "/:id/leave",
  authenticateToken,
  validateRequest(commonSchemas.idParam),
  gameController.leaveGame,
);

// Admin routes
router.post(
  "/create",
  authenticateToken,
  authenticateAdmin,
  validateRequest(commonSchemas.createGame),
  gameController.createGame,
);
router.post(
  "/:id/signup/:userId",
  authenticateToken,
  authenticateAdmin,
  validateRequest({
    params: {
      id: commonSchemas.idParam.params.id,
      userId: commonSchemas.userIdParam.params.userId,
    },
  }),
  gameController.signupUserForGame,
);
router.post(
  "/:id/leave/:userId",
  authenticateToken,
  authenticateAdmin,
  validateRequest({
    params: {
      id: commonSchemas.idParam.params.id,
      userId: commonSchemas.userIdParam.params.userId,
    },
  }),
  gameController.removeUserFromGame,
);
router.put(
  "/:id/start",
  authenticateToken,
  authenticateAdmin,
  validateRequest(commonSchemas.idParam),
  gameController.startGame,
);
router.put(
  "/:id/end",
  authenticateToken,
  authenticateAdmin,
  validateRequest(commonSchemas.idParam),
  gameController.endGame,
);
router.put(
  "/:id/process",
  authenticateToken,
  authenticateAdmin,
  validateRequest({
    ...commonSchemas.idParam,
    ...commonSchemas.processGame,
  }),
  gameController.processGame,
);

module.exports = router;
