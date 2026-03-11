const winston = require("winston");
const path = require("path");

/**
 * Custom log format that includes timestamp, level, and message
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    // Add stack trace for errors
    if (stack) {
      msg += `\n${stack}`;
    }

    return msg;
  }),
);

/**
 * JSON format for structured logging (useful for log aggregation tools)
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Colorized format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;

    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }

    if (stack) {
      msg += `\n${stack}`;
    }

    return msg;
  }),
);

/**
 * Configuration options for logger
 */
const config = {
  // Log level from environment or default to 'info'
  level: process.env.LOG_LEVEL || "info",

  // Log format: 'json' or 'text'
  format: process.env.LOG_FORMAT || "text",

  // Enable/disable file logging
  enableFileLogging: process.env.ENABLE_FILE_LOGGING !== "false",

  // Enable/disable console logging
  enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== "false",

  // Log directory
  logDirectory: process.env.LOG_DIRECTORY || "logs",

  // Maximum size of log files before rotation
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || "20m",

  // Maximum number of log files to keep
  maxFiles: process.env.LOG_MAX_FILES || "14d",
};

/**
 * Create transports array based on configuration
 */
const transports = [];

// Console transport
if (config.enableConsoleLogging) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );
}

// File transports
if (config.enableFileLogging) {
  const logFormat = config.format === "json" ? jsonFormat : customFormat;

  // Combined log (all levels)
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logDirectory, "combined.log"),
      format: logFormat,
      maxsize: parseFileSize(config.maxFileSize),
      maxFiles: config.maxFiles,
      tailable: true,
    }),
  );

  // Error log (error level only)
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logDirectory, "error.log"),
      level: "error",
      format: logFormat,
      maxsize: parseFileSize(config.maxFileSize),
      maxFiles: config.maxFiles,
      tailable: true,
      handleExceptions: true,
      handleRejections: true,
    }),
  );

  // Access log (for HTTP requests)
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logDirectory, "access.log"),
      format: logFormat,
      maxsize: parseFileSize(config.maxFileSize),
      maxFiles: config.maxFiles,
      tailable: true,
    }),
  );
}

/**
 * Parse file size string to bytes
 * @param {string} size - Size string like '20m' or '1g'
 * @returns {number} Size in bytes
 */
function parseFileSize(size) {
  if (typeof size === "number") return size;

  const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)([kmg]?)$/);

  if (!match) return 20 * 1024 * 1024; // Default 20MB

  const value = parseInt(match[1]);
  const unit = match[2] || "";

  return value * (units[unit] || 1);
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: config.level,
  transports,
  exitOnError: false,
});

/**
 * Stream object for Morgan middleware
 */
logger.stream = {
  write: (message) => {
    // Remove trailing newline
    logger.info(message.trim());
  },
};

/**
 * Log helper methods for different contexts
 */
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get("user-agent"),
    ip: req.ip || req.connection.remoteAddress,
  };

  if (req.user) {
    logData.userId = req.user.id;
    logData.userRole = req.user.role;
  }

  const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
  logger.log(level, `${req.method} ${req.originalUrl || req.url}`, logData);
};

logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    ...(error.status && { statusCode: error.status }),
  };

  if (req) {
    errorData.method = req.method;
    errorData.url = req.originalUrl || req.url;
    errorData.ip = req.ip || req.connection.remoteAddress;
    if (req.user) {
      errorData.userId = req.user.id;
    }
  }

  logger.error("Application Error", errorData);
};

logger.logDatabase = (operation, query, duration = null) => {
  const logData = {
    operation,
    query: query.substring(0, 200), // Truncate long queries
    ...(duration && { duration: `${duration}ms` }),
  };

  logger.debug("Database Operation", logData);
};

logger.logAuth = (action, userId, metadata = {}) => {
  logger.info(`Auth: ${action}`, {
    userId,
    action,
    ...metadata,
  });
};

logger.logSecurity = (event, metadata = {}) => {
  logger.warn(`Security Event: ${event}`, metadata);
};

/**
 * Export logger and configuration
 */
module.exports = {
  logger,
  config,
};
