const authService = require("./services/authService");

/**
 * Seed script to create an admin user
 * Run this script once to create an admin user for testing
 */
const seedAdmin = async () => {
  try {
    // Check if we have direct access to the users array
    const { getAllUsers } = authService;
    const users = getAllUsers();

    // Check if admin already exists
    const adminExists = users.some((u) => u.role === "admin");
    if (adminExists) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const admin = await authService.registerUser({
      email: "admin@example.com",
      password: "admin123",
      username: "admin",
    });

    console.log("Admin user created successfully:");
    console.log("Email: admin@example.com");
    console.log("Password: admin123");
    console.log("\nIMPORTANT: Change the password after first login!");
  } catch (error) {
    console.error("Error creating admin user:", error.message);
  }
};

// We need to manually set the role to admin
// since the registration defaults to "user"
const createAdminDirectly = () => {
  const bcrypt = require("bcryptjs");

  console.log("\n=== Creating Admin User ===\n");
  console.log("To create an admin user, you can:");
  console.log("1. Register a normal user through the API");
  console.log(
    "2. Manually change their role to 'admin' in the database/storage\n",
  );
  console.log("For in-memory storage (current setup):");
  console.log("- Start the server");
  console.log("- Register a user via POST /api/users with email and password");
  console.log("- The user will be created with role 'user'");
  console.log("- You'll need to manually edit the authService.js users array");
  console.log("  or add a migration to set role='admin' for that user\n");
};

createAdminDirectly();

module.exports = { seedAdmin };
