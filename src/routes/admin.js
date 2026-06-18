const express = require("express");
const adminController = require("../controllers/adminController");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const {
  validateRequest,
  commonSchemas,
} = require("../middleware/inputValidation");

const router = express.Router();

router.use(authenticateToken);
router.use(authenticateAdmin);

router.get("/orgs", adminController.getAllOrgs);
router.get(
  "/orgs/:id",
  validateRequest(commonSchemas.idParam),
  adminController.getOrgById,
);
router.put(
  "/orgs/:id",
  validateRequest({
    ...commonSchemas.idParam,
    ...commonSchemas.updateOrg,
  }),
  adminController.updateOrg,
);
router.post(
  "/orgs/:id/deactivate",
  validateRequest(commonSchemas.idParam),
  adminController.deactivateOrg,
);
router.post(
  "/orgs/:id/reactivate",
  validateRequest(commonSchemas.idParam),
  adminController.reactivateOrg,
);
router.delete(
  "/orgs/:id",
  validateRequest(commonSchemas.idParam),
  adminController.deleteOrg,
);

router.get(
  "/orgs/:id/managers",
  validateRequest(commonSchemas.idParam),
  adminController.getOrgManagers,
);
router.post(
  "/orgs/:id/managers",
  validateRequest({
    ...commonSchemas.idParam,
    ...commonSchemas.createManager,
  }),
  adminController.createOrgManager,
);
router.put(
  "/orgs/:id/managers/:managerId",
  validateRequest({
    params: {
      id: commonSchemas.idParam.params.id,
      managerId: commonSchemas.idParam.params.id,
    },
    ...commonSchemas.updateManager,
  }),
  adminController.updateOrgManager,
);
router.delete(
  "/orgs/:id/managers/:managerId",
  validateRequest({
    params: {
      id: commonSchemas.idParam.params.id,
      managerId: commonSchemas.idParam.params.id,
    },
  }),
  adminController.deleteOrgManager,
);

router.get("/admins", adminController.getAllAdmins);
router.post(
  "/admins",
  validateRequest(commonSchemas.createAdmin),
  adminController.createAdmin,
);
router.delete(
  "/admins/:id",
  validateRequest(commonSchemas.idParam),
  adminController.deleteAdmin,
);

module.exports = router;
