const rateLimit = require("express-rate-limit");
const { logger } = require("../config/logger");

/**
 * General rate limiter for all API routes
 * 100 requests per 15 minutes (automatically resets after window)
 */
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn({
      message: "Rate limit exceeded",
      ip: req.ip,
      path: req.path,
      requestId: req.id,
    });

    const retryAfter = Math.ceil(options.windowMs / 1000);

    res.status(429).json({
      message: `Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter: retryAfter,
    });
  },
});

/**
 * Strict rate limiter for authentication routes
 * 5 requests per 5 minutes (resets after window expires)
 */
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 login/register attempts per window
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res, next, options) => {
    logger.warn({
      message: "Auth rate limit exceeded",
      ip: req.ip,
      path: req.path,
      requestId: req.id,
    });

    // Calculate retry after time in seconds
    const retryAfter = Math.ceil(options.windowMs / 1000);

    res.status(429).json({
      message: `Too many authentication attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter: retryAfter,
    });
  },
});

/**
 * Moderate rate limiter for creating resources
 * 20 requests per 15 minutes (resets after window expires)
 */
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 create requests per window
  message: "Too many create requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn({
      message: "Create rate limit exceeded",
      ip: req.ip,
      path: req.path,
      requestId: req.id,
    });

    const retryAfter = Math.ceil(options.windowMs / 1000);

    res.status(429).json({
      message: `Too many create requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter: retryAfter,
    });
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
};
