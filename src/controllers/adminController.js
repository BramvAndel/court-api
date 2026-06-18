const adminService = require("../services/adminService");

const getAllOrgs = async (req, res) => {
  try {
    const orgs = await adminService.getAllOrgs();
    res.json(orgs);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch organizations",
    });
  }
};

const getOrgById = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const org = await adminService.getOrgById(orgId);
    res.json(org);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch organization",
    });
  }
};

const updateOrg = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const org = await adminService.updateOrg(orgId, req.body);
    res.json(org);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to update organization",
    });
  }
};

const deactivateOrg = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const org = await adminService.deactivateOrg(orgId);
    res.json(org);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to deactivate organization",
    });
  }
};

const reactivateOrg = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const org = await adminService.reactivateOrg(orgId);
    res.json(org);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to reactivate organization",
    });
  }
};

const deleteOrg = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const result = await adminService.deleteOrg(orgId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to delete organization",
    });
  }
};

const getOrgManagers = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const managers = await adminService.getOrgManagers(orgId);
    res.json(managers);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch managers",
    });
  }
};

const createOrgManager = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const manager = await adminService.createOrgManager(orgId, req.body);
    res.status(201).json(manager);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to create manager",
    });
  }
};

const updateOrgManager = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const managerId = parseInt(req.params.managerId, 10);
    const manager = await adminService.updateOrgManager(
      orgId,
      managerId,
      req.body,
    );
    res.json(manager);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to update manager",
    });
  }
};

const deleteOrgManager = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const managerId = parseInt(req.params.managerId, 10);
    const result = await adminService.deleteOrgManager(orgId, managerId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to delete manager",
    });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await adminService.getAllAdmins();
    res.json(admins);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch admins",
    });
  }
};

const createAdmin = async (req, res) => {
  try {
    const admin = await adminService.createAdmin(req.body);
    res.status(201).json(admin);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to create admin",
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const adminId = parseInt(req.params.id, 10);
    const result = await adminService.deleteAdmin(req.user.id, adminId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to delete admin",
    });
  }
};

module.exports = {
  getAllOrgs,
  getOrgById,
  updateOrg,
  deactivateOrg,
  reactivateOrg,
  deleteOrg,
  getOrgManagers,
  createOrgManager,
  updateOrgManager,
  deleteOrgManager,
  getAllAdmins,
  createAdmin,
  deleteAdmin,
};
