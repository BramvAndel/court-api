const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { query, transaction } = require("../config/database");

const ORG_PAYMENT_AMOUNT = 4900;
const ORG_PAYMENT_CURRENCY = "eur";

const mapOrg = (row) => ({
  id: row.orgID,
  name: row.name,
  accentColor: row.accent_color,
  status: row.status,
  createdAt: row.created_at,
});

const createOrg = async ({
  name,
  accentColor,
  managerEmail,
  managerPassword,
  managerUsername,
}) => {
  return transaction(async (conn) => {
    const [existingOrgs] = await conn.execute(
      "SELECT orgID FROM organizations WHERE name = ?",
      [name],
    );
    if (existingOrgs.length > 0) {
      const error = new Error("Organization name already in use");
      error.status = 409;
      throw error;
    }

    const [existingManagers] = await conn.execute(
      "SELECT userID FROM users WHERE email = ?",
      [managerEmail],
    );
    if (existingManagers.length > 0) {
      const error = new Error("Manager email already in use");
      error.status = 409;
      throw error;
    }

    const [orgInsert] = await conn.execute(
      "INSERT INTO organizations (name, accent_color, status) VALUES (?, ?, 'pending_payment')",
      [name, accentColor],
    );

    const orgId = orgInsert.insertId;
    const username = managerUsername || managerEmail.split("@")[0];
    const hashedPassword = await bcrypt.hash(managerPassword, 10);

    await conn.execute(
      "INSERT INTO users (orgID, username, email, password, role) VALUES (?, ?, ?, ?, 'manager')",
      [orgId, username, managerEmail, hashedPassword],
    );

    const sessionId = `sim_pay_${crypto.randomBytes(6).toString("hex")}`;

    await conn.execute(
      `INSERT INTO organization_payments
       (orgID, session_id, amount, currency, status)
       VALUES (?, ?, ?, ?, 'requires_payment')`,
      [orgId, sessionId, ORG_PAYMENT_AMOUNT, ORG_PAYMENT_CURRENCY],
    );

    const [orgRows] = await conn.execute(
      "SELECT orgID, name, accent_color, status FROM organizations WHERE orgID = ?",
      [orgId],
    );

    return {
      org: {
        id: orgRows[0].orgID,
        name: orgRows[0].name,
        accentColor: orgRows[0].accent_color,
        status: orgRows[0].status,
      },
      payment: {
        sessionId,
        amount: ORG_PAYMENT_AMOUNT,
        currency: ORG_PAYMENT_CURRENCY,
        status: "requires_payment",
      },
    };
  });
};

const simulatePayment = async (orgId, sessionId) => {
  return transaction(async (conn) => {
    const [orgRows] = await conn.execute(
      "SELECT orgID, name, status FROM organizations WHERE orgID = ?",
      [orgId],
    );

    if (orgRows.length === 0) {
      const error = new Error("Organization not found");
      error.status = 404;
      throw error;
    }

    const org = orgRows[0];
    if (org.status === "active") {
      const error = new Error("Organization is already active");
      error.status = 409;
      throw error;
    }

    const [paymentRows] = await conn.execute(
      `SELECT paymentID, status
       FROM organization_payments
       WHERE orgID = ? AND session_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [orgId, sessionId],
    );

    if (paymentRows.length === 0) {
      const error = new Error("Payment session not found");
      error.status = 404;
      throw error;
    }

    if (paymentRows[0].status === "paid") {
      const error = new Error("Payment already completed");
      error.status = 409;
      throw error;
    }

    await conn.execute(
      "UPDATE organization_payments SET status = 'paid', paid_at = NOW() WHERE paymentID = ?",
      [paymentRows[0].paymentID],
    );

    await conn.execute(
      "UPDATE organizations SET status = 'active' WHERE orgID = ?",
      [orgId],
    );

    return {
      org: {
        id: org.orgID,
        name: org.name,
        status: "active",
      },
      payment: {
        sessionId,
        status: "paid",
      },
    };
  });
};

const listLoginableOrgs = async (searchQuery = null) => {
  const params = ["active", "inactive"];
  let sql = `
    SELECT orgID, name, accent_color, status
    FROM organizations
    WHERE status IN (?, ?)
  `;

  if (searchQuery) {
    sql += " AND name LIKE ?";
    params.push(`%${searchQuery}%`);
  }

  sql += " ORDER BY name ASC";

  const rows = await query(sql, params);
  return rows.map((row) => ({
    id: row.orgID,
    name: row.name,
    accentColor: row.accent_color,
    status: row.status,
  }));
};

const getMyOrg = async (user) => {
  if (user.role === "admin") {
    const error = new Error("Admins do not belong to an organization");
    error.status = 403;
    throw error;
  }

  const orgRows = await query(
    "SELECT orgID, name, accent_color, status, created_at FROM organizations WHERE orgID = ?",
    [user.orgId],
  );

  if (orgRows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  const org = orgRows[0];

  if (user.role !== "manager") {
    return {
      id: org.orgID,
      name: org.name,
      accentColor: org.accent_color,
    };
  }

  const [memberCountRows, gameCountRows, managers] = await Promise.all([
    query("SELECT COUNT(*) AS count FROM users WHERE orgID = ?", [org.orgID]),
    query("SELECT COUNT(*) AS count FROM games WHERE orgID = ?", [org.orgID]),
    query(
      "SELECT userID, email, username FROM users WHERE orgID = ? AND role = 'manager' ORDER BY userID ASC",
      [org.orgID],
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

const updateMyOrg = async (user, updates) => {
  if (user.role !== "manager") {
    const error = new Error("Manager access required");
    error.status = 403;
    throw error;
  }

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

  if (fields.length === 0) {
    const orgRows = await query(
      "SELECT orgID, name, accent_color, status FROM organizations WHERE orgID = ?",
      [user.orgId],
    );

    if (orgRows.length === 0) {
      const error = new Error("Organization not found");
      error.status = 404;
      throw error;
    }

    const org = orgRows[0];
    return {
      id: org.orgID,
      name: org.name,
      accentColor: org.accent_color,
      status: org.status,
    };
  }

  params.push(user.orgId);

  try {
    await query(
      `UPDATE organizations SET ${fields.join(", ")} WHERE orgID = ?`,
      params,
    );
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      const conflictError = new Error("Organization name already in use");
      conflictError.status = 409;
      throw conflictError;
    }
    throw error;
  }

  const orgRows = await query(
    "SELECT orgID, name, accent_color, status FROM organizations WHERE orgID = ?",
    [user.orgId],
  );

  if (orgRows.length === 0) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  const org = orgRows[0];
  return {
    id: org.orgID,
    name: org.name,
    accentColor: org.accent_color,
    status: org.status,
  };
};

const reactivateMyOrg = async (user) => {
  if (user.role !== "manager") {
    const error = new Error("Manager access required");
    error.status = 403;
    throw error;
  }

  return transaction(async (conn) => {
    const [orgRows] = await conn.execute(
      "SELECT orgID, name, status FROM organizations WHERE orgID = ?",
      [user.orgId],
    );

    if (orgRows.length === 0) {
      const error = new Error("Organization not found");
      error.status = 404;
      throw error;
    }

    const org = orgRows[0];
    if (org.status !== "inactive") {
      const error = new Error("Organization is not inactive");
      error.status = 409;
      throw error;
    }

    const sessionId = `sim_pay_${crypto.randomBytes(6).toString("hex")}`;

    await conn.execute(
      `INSERT INTO organization_payments
       (orgID, session_id, amount, currency, status, paid_at)
       VALUES (?, ?, ?, ?, 'paid', NOW())`,
      [org.orgID, sessionId, ORG_PAYMENT_AMOUNT, ORG_PAYMENT_CURRENCY],
    );

    await conn.execute(
      "UPDATE organizations SET status = 'active' WHERE orgID = ?",
      [org.orgID],
    );

    return {
      org: {
        id: org.orgID,
        name: org.name,
        status: "active",
      },
      payment: {
        sessionId,
        status: "paid",
      },
    };
  });
};

module.exports = {
  createOrg,
  simulatePayment,
  listLoginableOrgs,
  getMyOrg,
  updateMyOrg,
  reactivateMyOrg,
  mapOrg,
};
