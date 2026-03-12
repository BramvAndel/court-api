const jwt = require("jsonwebtoken");

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

    req.user = user;
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

module.exports = { authenticateToken, authenticateAdmin, ownerOrAdmin };
