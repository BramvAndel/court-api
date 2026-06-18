const userService = require("../services/userService");

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = req.user.orgId
      ? await userService.getAllUsersByOrgId(req.user.orgId)
      : await userService.getAllUsers();
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
    const isManager = req.user.role === "manager";
    const isSelf = req.user.id === userId;
    const isAdmin = req.user.role === "admin";

    if (!isSelf && !isManager && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await userService.getUserById(
      userId,
      isManager || isAdmin || isSelf,
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      req.user.orgId &&
      user.orgId &&
      req.user.orgId !== user.orgId &&
      req.user.role !== "admin"
    ) {
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
    const isAdmin = req.user.role === "admin";
    const isManager = req.user.role === "manager";
    const isSelf = req.user.id === userId;
    const hasOwn = (field) =>
      Object.prototype.hasOwnProperty.call(req.body, field);

    if (req.user.orgId) {
      const targetUser = await userService.getUserById(userId, true);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.orgId && req.user.orgId !== targetUser.orgId && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if (!isSelf && !isAdmin && !isManager) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (!isAdmin && !isManager && (hasOwn("role") || hasOwn("elo"))) {
      return res.status(403).json({ message: "Access denied" });
    }
    if ((isAdmin || isManager) && isSelf && hasOwn("role")) {
      return res
        .status(403)
        .json({ message: "Managers and admins cannot change their own role" });
    }
    if (hasOwn("role") && req.body.role === "admin") {
      return res
        .status(403)
        .json({
          message: "The admin role can only be managed via /api/admin/admins",
        });
    }

    const user = await userService.updateUser(userId, req.body, true);

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
    const isAdmin = req.user.role === "admin";
    const isManager = req.user.role === "manager";
    const isSelf = req.user.id === userId;

    if (req.user.orgId) {
      const targetUser = await userService.getUserById(userId, true);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.orgId && req.user.orgId !== targetUser.orgId && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if (!isSelf && !isManager && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user.id === userId &&
      ["admin", "manager"].includes(req.user.role)
    ) {
      return res.status(403).json({
        message:
          "Managers and admins cannot delete their own account. Ask another operator to remove it.",
      });
    }

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
