require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");

async function setupDatabase() {
  let connection;

  try {
    console.log("🔧 Starting database setup...\n");

    // Connect to MySQL server without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log("✓ Connected to MySQL server");

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || "king_of_court";
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✓ Database '${dbName}' created/verified`);

    // Use the database
    await connection.query(`USE \`${dbName}\``);
    console.log(`✓ Using database '${dbName}'`);

    // Read and execute schema file
    const schemaPath = path.join(__dirname, "..", "courts_db.sql");
    const schema = await fs.readFile(schemaPath, "utf8");

    // Split by semicolons and execute each statement
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log("✓ Database schema created successfully");

    // Ask if user wants to load dummy data
    console.log("\n📊 Loading dummy data...");
    const dummyDataPath = path.join(__dirname, "..", "dummy_data.sql");
    const dummyData = await fs.readFile(dummyDataPath, "utf8");

    const dummyStatements = dummyData
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of dummyStatements) {
      try {
        await connection.query(statement);
      } catch (error) {
        // Ignore duplicate entry errors
        if (!error.message.includes("Duplicate entry")) {
          throw error;
        }
      }
    }
    console.log("✓ Dummy data loaded successfully");

    console.log("\n✅ Database setup completed successfully!\n");
    console.log("You can now start your application with: npm start\n");
  } catch (error) {
    console.error("\n❌ Database setup failed:");
    console.error(error.message);
    console.error("\nPlease check your database credentials in .env file");
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
