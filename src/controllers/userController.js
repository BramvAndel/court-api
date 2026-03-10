const authService = require("../services/authService");

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Users can only view their own profile unless admin
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
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

    // Users can only update their own profile unless admin
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const updates = req.body;
    const user = await authService.updateUser(userId, updates);

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

    // Users can only delete their own profile unless admin
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const success = await authService.deleteUser(userId);

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
  getUserById,
  updateUser,
  deleteUser,
};
