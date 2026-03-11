require("dotenv").config();
const app = require("./src/app");
const { testConnection } = require("./src/config/database");
const { logger } = require("./src/config/logger");

const PORT = process.env.PORT || 3000;

// Test database connection before starting server
testConnection().then((success) => {
  if (success) {
    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Log level: ${process.env.LOG_LEVEL || "info"}`);
    });
  } else {
    logger.error(
      "Failed to connect to database. Please check your configuration.",
    );
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error: error.message, stack: error.stack });
  process.exit(1);
});
