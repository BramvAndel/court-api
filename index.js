require("dotenv").config();
const app = require("./src/app");
const { testConnection } = require("./src/config/database");

const PORT = process.env.PORT || 3000;

// Test database connection before starting server
testConnection().then((success) => {
  if (success) {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } else {
    console.error(
      "Failed to connect to database. Please check your configuration.",
    );
    process.exit(1);
  }
});
