const { query } = require("../config/database");

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
 * Get all users
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
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  searchUsersByUsername,
};
