const express = require("express");
const cookieParser = require("cookie-parser");
const { logger } = require("./config/logger");
const {
  httpLogger,
  requestTimer,
  requestContext,
  securityLogger,
  slowRequestLogger,
  errorLogger,
} = require("./middleware/logger");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const gameRoutes = require("./routes/games");
const historyRoutes = require("./routes/history");
const playerRoutes = require("./routes/player");

const app = express();

// CORS configuration for frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200,
};

// Apply CORS manually
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", corsOptions.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Logging and security middleware
app.use(requestTimer); // Track request timing
app.use(requestContext); // Add request ID
app.use(httpLogger); // HTTP request logging
app.use(securityLogger); // Security event logging
app.use(slowRequestLogger(2000)); // Log requests slower than 2 seconds

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/player", playerRoutes);

// Basic health check route
app.get("/", (req, res) => {
  res.json({ message: "King of Court API is running" });
});

// Health check endpoint with detailed status
app.get("/health", async (req, res) => {
  const { testConnection } = require("./config/database");
  const dbConnected = await testConnection();

  const health = {
    status: dbConnected ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? "connected" : "disconnected",
  };

  res.status(dbConnected ? 200 : 503).json(health);
});

// Error logging middleware (logs errors before sending response)
app.use(errorLogger);

// Error handling middleware
app.use((err, req, res, next) => {
  // Error already logged by errorLogger middleware
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
