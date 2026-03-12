const bcrypt = require("bcryptjs");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../utils/tokenUtils");
const { query } = require("../config/database");

/**
 * Register a new user
 * @param {Object} userData - User data object { email, password, username }
 * @returns {Promise<Object>} Created user object
 * @throws {Error} If email already exists
 */
const registerUser = async ({ email, password, username }) => {
  // Check if user already exists
  const existingUsers = await query(
    "SELECT * FROM users WHERE email = ? OR username = ?",
    [email, username || email.split("@")[0]],
  );

  if (existingUsers.length > 0) {
    const error = new Error("Email or username already exists");
    error.status = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const result = await query(
    "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
    [username || email.split("@")[0], hashedPassword, email, "user"],
  );

  return {
    id: result.insertId,
    email,
    name: username || email.split("@")[0],
    role: "user",
  };
};

/**
 * Authenticate a user and generate tokens
 * @param {string} email - Email
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} Object containing tokens and user info
 * @throws {Error} If credentials are invalid
 */
const loginUser = async (email, password) => {
  // Find user
  const users = await query("SELECT * FROM users WHERE email = ?", [email]);

  if (users.length === 0) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  const user = users[0];

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

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
      email: user.email,
      name: user.username,
      role: user.role,
    },
  };
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

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @param {boolean} isAdmin - Whether the requester is an admin
 * @returns {Object|null} User object without password
 */
const getUserById = async (userId, isAdmin = false) => {
  const users = await query(
    "SELECT userID, username, email, role, elo, phone_number, created_at FROM users WHERE userID = ?",
    [userId],
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  const profile = {
    id: user.userID,
    name: user.username,
    elo: user.elo,
    phone_number: user.phone_number,
    createdAt: user.created_at,
  };

  if (isAdmin) {
    profile.email = user.email;
    profile.role = user.role;
  }

  return profile;
};

/**
 * Update user by ID
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated user object without password
 */
const updateUser = async (userId, updates) => {
  const updateFields = [];
  const values = [];

  if (updates.email) {
    updateFields.push("email = ?");
    values.push(updates.email);
  }
  if (updates.name || updates.username) {
    updateFields.push("username = ?");
    values.push(updates.name || updates.username);
  }

  if (updateFields.length === 0) {
    return getUserById(userId);
  }

  values.push(userId);
  await query(
    `UPDATE users SET ${updateFields.join(", ")} WHERE userID = ?`,
    values,
  );

  return getUserById(userId);
};

/**
 * Delete user by ID
 * @param {number} userId - User ID
 * @returns {boolean} Success status
 */
const deleteUser = async (userId) => {
  const result = await query("DELETE FROM users WHERE userID = ?", [userId]);
  return result.affectedRows > 0;
};

/**
 * Get all users (for internal use)
 * @returns {Array} Array of users without passwords
 */
const getAllUsers = async () => {
  const users = await query(
    "SELECT userID, username, email, role, elo, phone_number, created_at FROM users",
  );

  return users.map((user) => ({
    id: user.userID,
    email: user.email,
    name: user.username,
    role: user.role,
    elo: user.elo,
    phone_number: user.phone_number,
    createdAt: user.created_at,
  }));
};

/**
 * Search users by username
 * @param {string} searchTerm - Search term
 * @returns {Array} Array of matching users
 */
const searchUsersByUsername = async (searchTerm) => {
  const users = await query(
    "SELECT userID, username, elo, phone_number FROM users WHERE username LIKE ?",
    [`%${searchTerm}%`],
  );

  return users.map((user) => ({
    id: user.userID,
    name: user.username,
    elo: user.elo,
    phone_number: user.phone_number,
  }));
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  searchUsersByUsername,
};
