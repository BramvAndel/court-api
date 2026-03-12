const userService = require("../services/userService");

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch users" });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Authorization check first - users can only view their own profile unless admin
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Pass true to get full user details since we've verified authorization
    const user = await userService.getUserById(userId, true);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch user" });
  }
};

/**
 * Update user by ID
 */
const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const updates = req.body;
    const user = await userService.updateUser(userId, updates);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to update user" });
  }
};

/**
 * Delete user by ID
 */
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const success = await userService.deleteUser(userId);

    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to delete user" });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
