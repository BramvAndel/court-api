const mysql = require("mysql2/promise");

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test the connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✓ Database connected successfully");
    connection.release();
    return true;
  } catch (error) {
    console.error("✗ Database connection failed:", error.message);
    return false;
  }
};

// Helper function to execute queries
const query = async (sql, params) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
};

// Helper function for transactions
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
};
