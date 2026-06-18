const orgService = require("../services/orgService");

const createOrg = async (req, res) => {
  try {
    const result = await orgService.createOrg(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to create organization",
    });
  }
};

const simulatePayment = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const { sessionId } = req.body;
    const result = await orgService.simulatePayment(orgId, sessionId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to simulate payment",
    });
  }
};

const getOrgs = async (req, res) => {
  try {
    const orgs = await orgService.listLoginableOrgs();
    res.json(orgs);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch organizations",
    });
  }
};

const searchOrgs = async (req, res) => {
  try {
    const orgs = await orgService.listLoginableOrgs(req.query.q);
    res.json(orgs);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to search organizations",
    });
  }
};

const getMyOrg = async (req, res) => {
  try {
    const org = await orgService.getMyOrg(req.user);
    res.json(org);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch organization",
    });
  }
};

const updateMyOrg = async (req, res) => {
  try {
    const org = await orgService.updateMyOrg(req.user, req.body);
    res.json(org);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to update organization",
    });
  }
};

const reactivateMyOrg = async (req, res) => {
  try {
    const result = await orgService.reactivateMyOrg(req.user);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to reactivate organization",
    });
  }
};

module.exports = {
  createOrg,
  simulatePayment,
  getOrgs,
  searchOrgs,
  getMyOrg,
  updateMyOrg,
  reactivateMyOrg,
};
