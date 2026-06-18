const bcrypt = require("bcryptjs");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../utils/tokenUtils");
const { query } = require("../config/database");

/**
 * Register a new user
 * @param {Object} userData - User data object { orgId, email, password, username }
 * @returns {Promise<Object>} Created user object
 * @throws {Error} If email already exists
 */
const registerUser = async ({ orgId, email, password, username }) => {
  const resolvedUsername = username || email.split("@")[0];

  if (orgId) {
    const orgRows = await query(
      "SELECT orgID, status FROM organizations WHERE orgID = ?",
      [orgId],
    );

    if (orgRows.length === 0 || orgRows[0].status !== "active") {
      const error = new Error("Organization not found or inactive");
      error.status = 404;
      throw error;
    }
  }

  // Check if user already exists (org-scoped when orgId is provided)
  const existingUsers = orgId
    ? await query(
        "SELECT * FROM users WHERE orgID = ? AND (email = ? OR username = ?)",
        [orgId, email, resolvedUsername],
      )
    : await query("SELECT * FROM users WHERE email = ? OR username = ?", [
        email,
        resolvedUsername,
      ]);

  if (existingUsers.length > 0) {
    const error = new Error("Email or username already exists");
    error.status = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const result = orgId
    ? await query(
        "INSERT INTO users (orgID, username, password, email, role) VALUES (?, ?, ?, ?, ?)",
        [orgId, resolvedUsername, hashedPassword, email, "user"],
      )
    : await query(
        "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
        [resolvedUsername, hashedPassword, email, "user"],
      );

  return {
    id: result.insertId,
    orgId: orgId || null,
    email,
    name: resolvedUsername,
    role: "user",
  };
};

const authenticateAndIssueTokens = async (
  email,
  password,
  {
    orgId = null,
    requiredRole = null,
    forbiddenRole = null,
    forbiddenMessage = "Forbidden",
    notFoundMessage = "Invalid credentials",
  } = {},
) => {
  // Find user (org-scoped when orgId is provided)
  const users = orgId
    ? await query(
        `SELECT u.*, o.name AS org_name, o.accent_color AS org_accent_color, o.status AS org_status
         FROM users u
         JOIN organizations o ON o.orgID = u.orgID
         WHERE u.email = ? AND u.orgID = ?`,
        [email, orgId],
      )
    : await query("SELECT * FROM users WHERE email = ?", [email]);

  if (users.length === 0) {
    const error = new Error(notFoundMessage);
    error.status = orgId ? 404 : 401;
    throw error;
  }

  const user = users[0];

  if (orgId && user.org_status === "pending_payment") {
    const error = new Error("Organization not found or pending payment");
    error.status = 404;
    throw error;
  }

  if (requiredRole && user.role !== requiredRole) {
    const error = new Error(forbiddenMessage);
    error.status = 403;
    throw error;
  }

  if (forbiddenRole && user.role === forbiddenRole) {
    const error = new Error(forbiddenMessage);
    error.status = 403;
    throw error;
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  // Generate tokens with properly formatted user object
  const userPayload = {
    id: user.userID,
    email: user.email,
    role: user.role,
    orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
      ? user.orgID
      : null,
  };

  const accessToken = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken(userPayload);

  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    "INSERT INTO refresh_tokens (token, userID, expires_at) VALUES (?, ?, ?)",
    [refreshToken, user.userID, expiresAt],
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.userID,
      orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
        ? user.orgID
        : null,
      email: user.email,
      name: user.username,
      role: user.role,
    },
    org: orgId
      ? {
          id: user.orgID,
          name: user.org_name,
          accentColor: user.org_accent_color,
          status: user.org_status,
        }
      : null,
  };
};

/**
 * Authenticate a non-admin user and generate tokens.
 */
const loginUser = async (orgId, email, password) => {
  if (password === undefined) {
    // Backward compatibility: loginUser(email, password)
    return authenticateAndIssueTokens(orgId, email, {
      forbiddenRole: "admin",
      forbiddenMessage: "Admin accounts must use /api/auth/admin/login",
      notFoundMessage: "Invalid credentials",
    });
  }

  return authenticateAndIssueTokens(email, password, {
    orgId,
    forbiddenRole: "admin",
    forbiddenMessage: "Admin accounts must use /api/auth/admin/login",
    notFoundMessage: "Invalid credentials",
  });
};

/**
 * Authenticate a platform admin and generate tokens.
 */
const loginAdmin = async (email, password) => {
  return authenticateAndIssueTokens(email, password, {
    requiredRole: "admin",
    forbiddenMessage: "Only admin accounts can use this endpoint",
  });
};

/**
 * Refresh access token using a refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} Object containing new access token
 * @throws {Error} If refresh token is invalid
 */
const refreshAccessToken = async (refreshToken) => {
  // Check if refresh token exists and is not expired
  const tokens = await query(
    "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()",
    [refreshToken],
  );

  if (tokens.length === 0) {
    const error = new Error("Invalid refresh token");
    error.status = 403;
    throw error;
  }

  try {
    // Verify refresh token
    const user = await verifyToken(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
    );

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: Object.prototype.hasOwnProperty.call(user, "orgId")
        ? user.orgId
        : null,
    });

    return { accessToken };
  } catch (err) {
    const error = new Error("Invalid or expired refresh token");
    error.status = 403;
    throw error;
  }
};

/**
 * Logout user by removing refresh token
 * @param {string} refreshToken - Refresh token to invalidate
 */
const logoutUser = async (refreshToken) => {
  if (refreshToken) {
    await query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
  }
};

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  refreshAccessToken,
  logoutUser,
};
