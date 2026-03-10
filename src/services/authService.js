const bcrypt = require("bcryptjs");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../utils/tokenUtils");

// In-memory user storage (replace with database in production)
const users = [];
const refreshTokens = [];

/**
 * Register a new user
 * @param {Object} userData - User data object { email, password, username }
 * @returns {Promise<Object>} Created user object
 * @throws {Error} If email already exists
 */
const registerUser = async ({ email, password, username }) => {
  // Check if user already exists
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    const error = new Error("Email already exists");
    error.status = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = {
    id: users.length + 1,
    email,
    username: username || email.split("@")[0], // Default username from email
    name: username || email.split("@")[0],
    password: hashedPassword,
    role: "user", // Default role
    createdAt: new Date(),
  };

  users.push(user);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
  const user = users.find((u) => u.email === email);
  if (!user) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

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

  // Store refresh token
  refreshTokens.push(refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
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
  // Check if refresh token exists
  if (!refreshTokens.includes(refreshToken)) {
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
const logoutUser = (refreshToken) => {
  if (refreshToken) {
    const index = refreshTokens.indexOf(refreshToken);
    if (index > -1) {
      refreshTokens.splice(index, 1);
    }
  }
};

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Object|null} User object without password
 */
const getUserById = (userId) => {
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
};

/**
 * Update user by ID
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated user object without password
 */
const updateUser = (userId, updates) => {
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return null;
  }

  // Update allowed fields
  if (updates.email) user.email = updates.email;
  if (updates.name) user.name = updates.name;
  if (updates.username) user.username = updates.username;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
};

/**
 * Delete user by ID
 * @param {number} userId - User ID
 * @returns {boolean} Success status
 */
const deleteUser = (userId) => {
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return false;
  }
  users.splice(index, 1);
  return true;
};

/**
 * Get all users (for internal use)
 * @returns {Array} Array of users without passwords
 */
const getAllUsers = () => {
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
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
};
