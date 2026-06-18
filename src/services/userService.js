const { query } = require("../config/database");

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @param {boolean} isAdmin - Whether the requester is an admin
 * @returns {Object|null} User object without password
 */
const getUserById = async (userId, isAdmin = false) => {
  const users = await query(
    "SELECT userID, orgID, username, email, role, elo, phone_number, created_at FROM users WHERE userID = ?",
    [userId],
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  const profile = {
    id: user.userID,
    orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
      ? user.orgID
      : null,
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
  const hasOwn = (field) =>
    Object.prototype.hasOwnProperty.call(updates, field);

  if (updates.email) {
    updateFields.push("email = ?");
    values.push(updates.email);
  }
  if (updates.name || updates.username) {
    updateFields.push("username = ?");
    values.push(updates.name || updates.username);
  }
  if (updates.role) {
    updateFields.push("role = ?");
    values.push(updates.role);
  }
  if (hasOwn("elo")) {
    updateFields.push("elo = ?");
    values.push(updates.elo);
  }

  if (updateFields.length === 0) {
    return getUserById(userId, true);
  }

  values.push(userId);
  try {
    await query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE userID = ?`,
      values,
    );
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      const conflictError = new Error("Email or username already exists");
      conflictError.status = 409;
      throw conflictError;
    }
    throw error;
  }

  return getUserById(userId, true);
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
    "SELECT userID, orgID, username, email, role, elo, phone_number, created_at FROM users",
  );

  return users.map((user) => ({
    id: user.userID,
    orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
      ? user.orgID
      : null,
    email: user.email,
    name: user.username,
    role: user.role,
    elo: user.elo,
    phone_number: user.phone_number,
    createdAt: user.created_at,
  }));
};

/**
 * Get all users in an organization
 * @param {number} orgId - Organization ID
 * @returns {Array} Array of users without passwords
 */
const getAllUsersByOrgId = async (orgId) => {
  const users = await query(
    "SELECT userID, orgID, username, email, role, elo, phone_number, created_at FROM users WHERE orgID = ?",
    [orgId],
  );

  return users.map((user) => ({
    id: user.userID,
    orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
      ? user.orgID
      : null,
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
    "SELECT userID, orgID, username, elo, phone_number FROM users WHERE username LIKE ?",
    [`%${searchTerm}%`],
  );

  return users.map((user) => ({
    id: user.userID,
    orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
      ? user.orgID
      : null,
    name: user.username,
    elo: user.elo,
    phone_number: user.phone_number,
  }));
};

/**
 * Search users by username within an organization
 * @param {number} orgId - Organization ID
 * @param {string} searchTerm - Search term
 * @returns {Array} Array of matching users
 */
const searchUsersByUsernameInOrg = async (orgId, searchTerm) => {
  const users = await query(
    "SELECT userID, orgID, username, elo, phone_number FROM users WHERE orgID = ? AND username LIKE ?",
    [orgId, `%${searchTerm}%`],
  );

  return users.map((user) => ({
    id: user.userID,
    orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
      ? user.orgID
      : null,
    name: user.username,
    elo: user.elo,
    phone_number: user.phone_number,
  }));
};

/**
 * Get leaderboard - top 50 players by ELO
 * @returns {Array} Array of top players with rank
 */
const getLeaderboard = async () => {
  const users = await query(
    "SELECT userID, orgID, username, elo FROM users ORDER BY elo DESC, username ASC LIMIT 50",
  );

  return users.map((user, index) => ({
    id: user.userID,
    orgId: Object.prototype.hasOwnProperty.call(user, "orgID")
      ? user.orgID
      : null,
    rank: index + 1,
    name: user.username,
    elo: user.elo,
  }));
};

/**
 * Get leaderboard for a specific org - top 50 players by ELO
 * @param {number} orgId - Organization ID
 * @returns {Array} Array of top players with rank
 */
const getLeaderboardByOrgId = async (orgId) => {
  const users = await query(
    "SELECT userID, orgID, username, elo FROM users WHERE orgID = ? ORDER BY elo DESC, username ASC LIMIT 50",
    [orgId],
  );

  return users.map((user, index) => ({
    id: user.userID,
    rank: index + 1,
    name: user.username,
    elo: user.elo,
  }));
};

module.exports = {
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  getAllUsersByOrgId,
  searchUsersByUsername,
  searchUsersByUsernameInOrg,
  getLeaderboard,
  getLeaderboardByOrgId,
};
