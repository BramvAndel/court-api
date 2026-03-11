const morgan = require("morgan");
const { logger } = require("../config/logger");

/**
 * Custom Morgan tokens for enhanced logging
 */

// Response time in milliseconds
morgan.token("response-time-ms", (req, res) => {
  if (!req._hrtimeStart) return "-";
  const diff = process.hrtime(req._hrtimeStart);
  return (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
});

// User ID from authenticated request
morgan.token("user-id", (req) => {
  return req.user ? req.user.id : "anonymous";
});

// User role from authenticated request
morgan.token("user-role", (req) => {
  return req.user ? req.user.role : "-";
});

// Request ID (if you implement it)
morgan.token("request-id", (req) => {
  return req.id || "-";
});

// Request body size
morgan.token("req-body-size", (req) => {
  return req.get("content-length") || "-";
});

// Error message (for failed requests)
morgan.token("error-message", (req, res) => {
  return res.locals.errorMessage || "-";
});

/**
 * Custom Morgan formats
 */

// Detailed format for debugging
const detailedFormat = [
  ":remote-addr",
  ":user-id",
  '":method :url HTTP/:http-version"',
  ":status",
  ":res[content-length]",
  ":response-time-ms ms",
  '":referrer"',
  '":user-agent"',
].join(" ");

// Compact format for production
const compactFormat = [
  ":method",
  ":url",
  ":status",
  ":response-time-ms ms",
  "- :user-id",
].join(" ");

// JSON format for structured logging
const jsonFormat = (tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens["response-time-ms"](req, res),
    contentLength: tokens.res(req, res, "content-length"),
    userAgent: tokens["user-agent"](req, res),
    ip: tokens["remote-addr"](req, res),
    userId: tokens["user-id"](req, res),
    userRole: tokens["user-role"](req, res),
    referrer: tokens.referrer(req, res),
  });
};

/**
 * Configuration for logging middleware
 */
const config = {
  // Log format: 'detailed', 'compact', 'json', or custom string
  format: process.env.HTTP_LOG_FORMAT || "detailed",

  // Skip logging for certain paths
  skipPaths: (process.env.HTTP_LOG_SKIP_PATHS || "").split(",").filter(Boolean),

  // Skip successful requests (status < 400)
  skipSuccessfulRequests: process.env.HTTP_LOG_SKIP_SUCCESS === "true",

  // Skip health check endpoints
  skipHealthChecks: process.env.HTTP_LOG_SKIP_HEALTH !== "false",

  // Log request body (be careful with sensitive data!)
  logRequestBody: process.env.HTTP_LOG_REQUEST_BODY === "true",

  // Log response body (be careful with large responses!)
  logResponseBody: process.env.HTTP_LOG_RESPONSE_BODY === "true",
};

/**
 * Determine which format to use
 */
function getFormat() {
  switch (config.format) {
    case "detailed":
      return detailedFormat;
    case "compact":
      return compactFormat;
    case "json":
      return jsonFormat;
    default:
      return config.format; // Custom format string
  }
}

/**
 * Skip function for Morgan
 */
function shouldSkipLog(req, res) {
  // Skip specific paths
  if (config.skipPaths.some((path) => req.url.includes(path))) {
    return true;
  }

  // Skip health checks
  if (config.skipHealthChecks && (req.url === "/api/health" || req.url === "/")) {
    return true;
  }

  // Skip successful requests if configured
  if (config.skipSuccessfulRequests && res.statusCode < 400) {
    return true;
  }

  return false;
}

/**
 * Main HTTP logging middleware using Morgan
 */
const httpLogger = morgan(getFormat(), {
  stream: logger.stream,
  skip: shouldSkipLog,
});

/**
 * Middleware to add start time to request for accurate timing
 */
const requestTimer = (req, res, next) => {
  req._hrtimeStart = process.hrtime();
  next();
};

/**
 * Middleware to log request body (optional - use with caution)
 */
const requestBodyLogger = (req, res, next) => {
  if (config.logRequestBody && req.body && Object.keys(req.body).length > 0) {
    // Clone body and redact sensitive fields
    const sanitizedBody = { ...req.body };

    // Redact sensitive fields
    const sensitiveFields = ["password", "token", "secret", "apiKey", "creditCard"];
    sensitiveFields.forEach((field) => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = "[REDACTED]";
      }
    });

    logger.debug("Request Body", {
      method: req.method,
      url: req.url,
      body: sanitizedBody,
    });
  }
  next();
};

/**
 * Middleware to log response (optional - use with caution for large responses)
 */
const responseLogger = (req, res, next) => {
  if (config.logResponseBody) {
    const originalSend = res.send;

    res.send = function (data) {
      // Log response data (truncated for large responses)
      const responseData =
        typeof data === "string" && data.length > 1000
          ? data.substring(0, 1000) + "... [truncated]"
          : data;

      logger.debug("Response Body", {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        body: responseData,
      });

      originalSend.call(this, data);
    };
  }
  next();
};

/**
 * Error logging middleware (should be placed after routes)
 */
const errorLogger = (err, req, res, next) => {
  // Store error message for Morgan token
  res.locals.errorMessage = err.message;

  // Log the error
  logger.logError(err, req);

  // Pass error to next error handler
  next(err);
};

/**
 * Request context middleware - adds unique request ID
 */
const requestContext = (req, res, next) => {
  // Generate unique request ID
  req.id = generateRequestId();
  res.setHeader("X-Request-ID", req.id);
  next();
};

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Security event logger middleware
 */
const securityLogger = (req, res, next) => {
  // Track and log suspicious activities
  const suspiciousPatterns = [
    /(\.\.\/)/, // Path traversal
    /<script>/i, // XSS attempts
    /union\s+select/i, // SQL injection
    /etc\/passwd/, // File access attempts
  ];

  const checkValue = (value) => {
    if (typeof value === "string") {
      return suspiciousPatterns.some((pattern) => pattern.test(value));
    }
    if (typeof value === "object" && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Check URL, query params, and body
  const suspicious =
    checkValue(req.url) || checkValue(req.query) || checkValue(req.body);

  if (suspicious) {
    logger.logSecurity("Suspicious Request Detected", {
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      userAgent: req.get("user-agent"),
      userId: req.user?.id,
    });
  }

  next();
};

/**
 * Slow request logger - logs requests that take too long
 */
const slowRequestLogger = (threshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      if (duration > threshold) {
        logger.warn("Slow Request Detected", {
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          statusCode: res.statusCode,
          userId: req.user?.id,
        });
      }
    });

    next();
  };
};

/**
 * Export middleware functions
 */
module.exports = {
  httpLogger,
  requestTimer,
  requestBodyLogger,
  responseLogger,
  errorLogger,
  requestContext,
  securityLogger,
  slowRequestLogger,
  config,
};
