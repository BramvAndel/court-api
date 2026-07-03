const bcrypt = require("bcryptjs");
const { query } = require("../config/database");

const mapOrgSummary = (row) => ({
  id: row.orgID,
  name: row.name,
  accentColor: row.accent_color,
  status: row.status,
  createdAt: row.created_at,
  memberCount: row.memberCount,
});

const getAllOrgs = async () => {
  const rows = await query(
    `SELECT o.orgID, o.name, o.accent_color, o.status, o.created_at,
            COUNT(u.userID) AS memberCount
     FROM organizations o
     LEFT JOIN users u ON u.orgID = o.orgID
     GROUP BY o.orgID
     ORDER BY o.created_at DESC`,
  );

  return rows.map(mapOrgSummary);
};

const getOrgById = async (orgId) => {
  const orgRows = await query(
    "SELECT orgID, name, accent_color, status, created_at FROM organizations WHERE orgID = ?",
    [orgId],
  );

  if (orgRows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  const org = orgRows[0];

  const [memberCountRows, gameCountRows, managers] = await Promise.all([
    query("SELECT COUNT(*) AS count FROM users WHERE orgID = ?", [orgId]),
    query("SELECT COUNT(*) AS count FROM games WHERE orgID = ?", [orgId]),
    query(
      "SELECT userID, email, username FROM users WHERE orgID = ? AND role = 'manager' ORDER BY userID ASC",
      [orgId],
    ),
  ]);

  return {
    id: org.orgID,
    name: org.name,
    accentColor: org.accent_color,
    status: org.status,
    createdAt: org.created_at,
    memberCount: memberCountRows[0].count,
    gameCount: gameCountRows[0].count,
    managers: managers.map((manager) => ({
      id: manager.userID,
      email: manager.email,
      name: manager.username,
    })),
  };
};

const updateOrg = async (orgId, updates) => {
  const fields = [];
  const params = [];

  if (updates.name) {
    fields.push("name = ?");
    params.push(updates.name);
  }

  if (updates.accentColor) {
    fields.push("accent_color = ?");
    params.push(updates.accentColor);
  }

  if (fields.length > 0) {
    params.push(orgId);

    try {
      const result = await query(
        `UPDATE organizations SET ${fields.join(", ")} WHERE orgID = ?`,
        params,
      );

      if (result.affectedRows === 0) {
        const error = new Error("Organization not found");
        error.status = 404;
        throw error;
      }
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        const conflictError = new Error("Organization name already in use");
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }
  }

  const rows = await query(
    "SELECT orgID, name, accent_color, status FROM organizations WHERE orgID = ?",
    [orgId],
  );

  if (rows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  return {
    id: rows[0].orgID,
    name: rows[0].name,
    accentColor: rows[0].accent_color,
    status: rows[0].status,
  };
};

const deactivateOrg = async (orgId) => {
  const rows = await query(
    "SELECT orgID, name, accent_color, status FROM organizations WHERE orgID = ?",
    [orgId],
  );

  if (rows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  if (rows[0].status !== "active") {
    const error = new Error("Organization is not active");
    error.status = 409;
    throw error;
  }

  await query("UPDATE organizations SET status = 'inactive' WHERE orgID = ?", [
    orgId,
  ]);

  return {
    id: rows[0].orgID,
    name: rows[0].name,
    accentColor: rows[0].accent_color,
    status: "inactive",
  };
};

const reactivateOrg = async (orgId) => {
  const rows = await query(
    "SELECT orgID, name, accent_color, status FROM organizations WHERE orgID = ?",
    [orgId],
  );

  if (rows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  if (rows[0].status !== "inactive") {
    const error = new Error("Organization is not inactive");
    error.status = 409;
    throw error;
  }

  await query("UPDATE organizations SET status = 'active' WHERE orgID = ?", [
    orgId,
  ]);

  return {
    id: rows[0].orgID,
    name: rows[0].name,
    accentColor: rows[0].accent_color,
    status: "active",
  };
};

const deleteOrg = async (orgId) => {
  const result = await query("DELETE FROM organizations WHERE orgID = ?", [
    orgId,
  ]);

  if (result.affectedRows === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  return { message: "Organization deleted successfully" };
};

const getOrgManagers = async (orgId) => {
  const orgRows = await query(
    "SELECT orgID FROM organizations WHERE orgID = ?",
    [orgId],
  );
  if (orgRows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  const managers = await query(
    "SELECT userID, email, username FROM users WHERE orgID = ? AND role = 'manager' ORDER BY userID ASC",
    [orgId],
  );

  return managers.map((manager) => ({
    id: manager.userID,
    email: manager.email,
    name: manager.username,
  }));
};

const createOrgManager = async (orgId, { email, password, username }) => {
  const orgRows = await query(
    "SELECT orgID FROM organizations WHERE orgID = ?",
    [orgId],
  );
  if (orgRows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  const existingEmail = await query("SELECT userID FROM users WHERE email = ?", [email]);
  if (existingEmail.length > 0) {
    const error = new Error("Email already in use");
    error.status = 409;
    throw error;
  }

  const resolvedUsername = username || email.split("@")[0];
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await query(
      "INSERT INTO users (orgID, username, email, password, role) VALUES (?, ?, ?, ?, 'manager')",
      [orgId, resolvedUsername, email, hashedPassword],
    );

    return {
      id: result.insertId,
      orgId,
      email,
      name: resolvedUsername,
      role: "manager",
    };
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      const conflictError = new Error("Username already in use");
      conflictError.status = 409;
      throw conflictError;
    }
    throw error;
  }
};

const updateOrgManager = async (orgId, managerId, { email, password }) => {
  const managerRows = await query(
    "SELECT userID FROM users WHERE orgID = ? AND userID = ? AND role = 'manager'",
    [orgId, managerId],
  );

  if (managerRows.length === 0) {
    const error = new Error("Manager not found");
    error.status = 404;
    throw error;
  }

  const fields = [];
  const params = [];

  if (email) {
    fields.push("email = ?");
    params.push(email);
  }

  if (password) {
    fields.push("password = ?");
    params.push(await bcrypt.hash(password, 10));
  }

  if (fields.length > 0) {
    try {
      params.push(managerId);
      await query(
        `UPDATE users SET ${fields.join(", ")} WHERE userID = ?`,
        params,
      );
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        const conflictError = new Error(
          "Email already taken in this organization",
        );
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }
  }

  const updatedRows = await query(
    "SELECT userID, orgID, email, username, role FROM users WHERE userID = ?",
    [managerId],
  );

  return {
    id: updatedRows[0].userID,
    orgId: updatedRows[0].orgID,
    email: updatedRows[0].email,
    name: updatedRows[0].username,
    role: updatedRows[0].role,
  };
};

const deleteOrgManager = async (orgId, managerId) => {
  const result = await query(
    "DELETE FROM users WHERE orgID = ? AND userID = ? AND role = 'manager'",
    [orgId, managerId],
  );

  if (result.affectedRows === 0) {
    const error = new Error("Manager not found");
    error.status = 404;
    throw error;
  }

  return { message: "Manager deleted successfully" };
};

const getAllAdmins = async () => {
  const rows = await query(
    "SELECT userID, email, username, role FROM users WHERE role = 'admin' ORDER BY userID ASC",
  );

  return rows.map((admin) => ({
    id: admin.userID,
    email: admin.email,
    name: admin.username,
    role: admin.role,
  }));
};

const createAdmin = async ({ email, password, username }) => {
  const resolvedUsername = username || email.split("@")[0];

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'admin')",
      [resolvedUsername, email, hashedPassword],
    );

    return {
      id: result.insertId,
      email,
      name: resolvedUsername,
      role: "admin",
    };
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      const conflictError = new Error(
        "An admin with this email already exists",
      );
      conflictError.status = 409;
      throw conflictError;
    }
    throw error;
  }
};

const deleteAdmin = async (callerUserId, targetAdminId) => {
  if (callerUserId === targetAdminId) {
    const error = new Error("Admins cannot delete their own account");
    error.status = 403;
    throw error;
  }

  const result = await query(
    "DELETE FROM users WHERE userID = ? AND role = 'admin'",
    [targetAdminId],
  );

  if (result.affectedRows === 0) {
    const error = new Error("Admin not found");
    error.status = 404;
    throw error;
  }

  return { message: "Admin deleted successfully" };
};

module.exports = {
  getAllOrgs,
  getOrgById,
  updateOrg,
  deactivateOrg,
  reactivateOrg,
  deleteOrg,
  getOrgManagers,
  createOrgManager,
  updateOrgManager,
  deleteOrgManager,
  getAllAdmins,
  createAdmin,
  deleteAdmin,
};
