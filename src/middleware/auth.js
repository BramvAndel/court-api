const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

/**
 * Middleware to authenticate JWT tokens from cookies
 */
const authenticateToken = (req, res, next) => {
  // Get token from cookies (cookie-based auth)
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Validate that token has required fields (handles old tokens)
    if (!user.id || !user.email || !user.role) {
      return res.status(401).json({
        message: "Invalid token format. Please log in again.",
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Optional auth middleware: attaches req.user when token is valid.
 */
const optionalAuthenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err && user?.id && user?.email && user?.role) {
      req.user = user;
    }
    next();
  });
};

/**
 * Middleware to check if user is admin
 */
const authenticateAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/**
 * Middleware to check if user is manager
 */
const authenticateManager = (req, res, next) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ message: "Manager access required" });
  }
  next();
};

/**
 * Middleware to check if user is manager OR platform admin
 */
const authenticateManagerOrAdmin = (req, res, next) => {
  if (req.user.role !== "manager" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Manager or admin access required" });
  }
  next();
};

const isReadOnlyExemptPath = (req) => {
  if (req.path.startsWith("/api/admin")) return true;
  if (req.path.startsWith("/api/auth")) return true;
  if (req.method === "POST" && req.path === "/api/orgs/me/reactivate") {
    return true;
  }
  return false;
};

/**
 * Block org-member writes while org is inactive (read-only mode).
 */
const enforceOrgWriteAccess = async (req, res, next) => {
  try {
    if (!["POST", "PUT", "DELETE"].includes(req.method)) {
      return next();
    }

    if (!req.user) {
      return next();
    }

    if (isReadOnlyExemptPath(req)) {
      return next();
    }

    if (!["user", "manager"].includes(req.user.role)) {
      return next();
    }

    if (!req.user.orgId) {
      return next();
    }

    const orgRows = await query(
      "SELECT status FROM organizations WHERE orgID = ?",
      [req.user.orgId],
    );

    if (orgRows.length === 0) {
      return res
        .status(403)
        .json({ message: "Organization context is invalid" });
    }

    if (orgRows[0].status === "inactive") {
      return res.status(403).json({
        message:
          "Organization is inactive (read-only). A manager must reactivate it.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is owner of resource or admin
 * @param {string} paramName - The parameter name to check (defaults to 'id')
 * @returns {Function} Express middleware function
 */
const ownerOrAdmin = (paramName = "id") => {
  return (req, res, next) => {
    const resourceId = parseInt(req.params[paramName]);
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    if (isAdmin || userId === resourceId) {
      next();
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  authenticateAdmin,
  authenticateManager,
  authenticateManagerOrAdmin,
  enforceOrgWriteAccess,
  ownerOrAdmin,
};
