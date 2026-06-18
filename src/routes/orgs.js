const express = require("express");
const orgController = require("../controllers/orgController");
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

router.post(
  "/",
  validateRequest(commonSchemas.createOrg),
  orgController.createOrg,
);
router.post(
  "/:id/payment/simulate",
  validateRequest({
    ...commonSchemas.idParam,
    ...commonSchemas.simulateOrgPayment,
  }),
  orgController.simulatePayment,
);
router.get("/", orgController.getOrgs);
router.get(
  "/search",
  validateRequest(commonSchemas.orgSearch),
  orgController.searchOrgs,
);

router.get("/me", authenticateToken, orgController.getMyOrg);
router.put(
  "/me",
  authenticateToken,
  enforceOrgWriteAccess,
  authenticateManager,
  validateRequest(commonSchemas.updateOrg),
  orgController.updateMyOrg,
);
router.post(
  "/me/reactivate",
  authenticateToken,
  authenticateManager,
  orgController.reactivateMyOrg,
);

module.exports = router;
