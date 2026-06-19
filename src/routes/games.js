const express = require("express");
const gameController = require("../controllers/gameController");
const {
  authenticateToken,
  authenticateManagerOrAdmin,
  enforceOrgWriteAccess,
} = require("../middleware/auth");
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
  enforceOrgWriteAccess,
  validateRequest(commonSchemas.idParam),
  gameController.signupForGame,
);
router.post(
  "/:id/leave",
  authenticateToken,
  enforceOrgWriteAccess,
  validateRequest(commonSchemas.idParam),
  gameController.leaveGame,
);
router.get(
  "/:id/current-round",
  authenticateToken,
  validateRequest(commonSchemas.idParam),
  gameController.getCurrentRound,
);
router.post(
  "/:id/match-request",
  authenticateToken,
  enforceOrgWriteAccess,
  validateRequest(commonSchemas.idParam),
  gameController.sendMatchRequest,
);
router.get(
  "/match-requests/incoming",
  authenticateToken,
  gameController.getMatchRequests,
);
router.put(
  "/match-requests/:requestId/respond",
  authenticateToken,
  enforceOrgWriteAccess,
  gameController.respondToMatchRequest,
);

// Manager routes
router.post(
  "/create",
  authenticateToken,
  enforceOrgWriteAccess,
  authenticateManagerOrAdmin,
  validateRequest(commonSchemas.createGame),
  gameController.createGame,
);
router.post(
  "/:id/signup/:userId",
  authenticateToken,
  enforceOrgWriteAccess,
  authenticateManagerOrAdmin,
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
  enforceOrgWriteAccess,
  authenticateManagerOrAdmin,
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
  enforceOrgWriteAccess,
  authenticateManagerOrAdmin,
  validateRequest(commonSchemas.idParam),
  gameController.startGame,
);
router.put(
  "/:id/end",
  authenticateToken,
  enforceOrgWriteAccess,
  authenticateManagerOrAdmin,
  validateRequest(commonSchemas.idParam),
  gameController.endGame,
);
router.put(
  "/:id/process",
  authenticateToken,
  enforceOrgWriteAccess,
  authenticateManagerOrAdmin,
  validateRequest({
    ...commonSchemas.idParam,
    ...commonSchemas.processGame,
  }),
  gameController.processGame,
);
router.put(
  "/:id/current-round",
  authenticateToken,
  enforceOrgWriteAccess,
  authenticateManagerOrAdmin,
  validateRequest(commonSchemas.idParam),
  gameController.setCurrentRound,
);

module.exports = router;
