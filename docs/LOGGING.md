# Logging System Documentation

## Overview

This API implements a comprehensive, customizable logging system using **Winston** (logging framework) and **Morgan** (HTTP request logger). The logging system provides:

- Multiple log levels (error, warn, info, debug)
- File-based logging with automatic rotation
- Console logging with colorized output
- HTTP request/response logging
- Security event logging
- Performance monitoring (slow requests)
- Error tracking with stack traces
- Customizable via environment variables

---

## Architecture

### Components

1. **Logger Configuration** (`src/config/logger.js`)
   - Winston logger setup
   - Custom formatters (text, JSON, colorized)
   - Transport configuration (console, files)
   - Helper methods for different log types

2. **Logging Middleware** (`src/middleware/logger.js`)
   - HTTP request logging (Morgan)
   - Request timing and context
   - Security event detection
   - Slow request monitoring
   - Error logging

3. **Log Files** (`logs/` directory)
   - `combined.log` - All logs
   - `error.log` - Errors only
   - `access.log` - HTTP requests
   - Automatic rotation when files exceed size limit

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Log level: error, warn, info, http, verbose, debug, silly
LOG_LEVEL=info

# Log format: json or text
LOG_FORMAT=text

# Enable/disable console logging
ENABLE_CONSOLE_LOGGING=true

# Enable/disable file logging
ENABLE_FILE_LOGGING=true

# Log directory (relative to project root)
LOG_DIRECTORY=logs

# Maximum log file size before rotation (e.g., 20m, 1g)
LOG_MAX_FILE_SIZE=20m

# Maximum number of log files to keep (e.g., 14d for 14 days)
LOG_MAX_FILES=14d

# HTTP request logging format: detailed, compact, json
HTTP_LOG_FORMAT=detailed

# Skip logging for specific paths (comma-separated)
HTTP_LOG_SKIP_PATHS=/favicon.ico,/static

# Skip logging successful requests (status < 400)
HTTP_LOG_SKIP_SUCCESS=false

# Skip logging health check endpoints
HTTP_LOG_SKIP_HEALTH=true

# Log request bodies (WARNING: may log sensitive data)
HTTP_LOG_REQUEST_BODY=false

# Log response bodies (WARNING: may be large)
HTTP_LOG_RESPONSE_BODY=false
```

---

## Log Levels

Winston supports multiple log levels (from highest to lowest priority):

| Level   | Description                                    | When to Use                          |
|---------|------------------------------------------------|--------------------------------------|
| error   | Error messages, application failures           | Critical issues requiring attention  |
| warn    | Warning messages, potential issues             | Suspicious activity, slow requests   |
| info    | Informational messages, general flow           | Application lifecycle, key operations|
| http    | HTTP request/response logs                     | API requests (handled by Morgan)     |
| verbose | Detailed operational information               | Detailed debugging                   |
| debug   | Debug information, development details         | Development troubleshooting          |
| silly   | Very verbose, trace-level logging              | Deep debugging                       |

**Setting Log Level:** Set `LOG_LEVEL=debug` to see debug and all higher levels (info, warn, error).

---

## HTTP Request Logging

### Morgan Formats

The system supports three HTTP logging formats:

#### 1. **Detailed Format** (default)
```
127.0.0.1 user-123 "GET /api/games HTTP/1.1" 200 1234 45.23 ms "http://localhost:5173" "Mozilla/5.0..."
```

Includes:
- IP address
- User ID (if authenticated)
- Method, URL, HTTP version
- Status code
- Response size
- Response time
- Referrer
- User agent

#### 2. **Compact Format**
```
GET /api/games 200 45.23 ms - user-123
```

Minimal format for production environments.

#### 3. **JSON Format**
```json
{
  "timestamp": "2026-03-11T10:30:45.123Z",
  "method": "GET",
  "url": "/api/games",
  "status": "200",
  "responseTime": "45.23",
  "userId": "user-123",
  "ip": "127.0.0.1"
}
```

Structured format ideal for log aggregation tools (ELK Stack, Splunk, etc.).

### Custom Morgan Tokens

Available custom tokens:
- `:user-id` - Authenticated user's ID
- `:user-role` - User's role (admin/user)
- `:request-id` - Unique request identifier
- `:response-time-ms` - Response time in milliseconds (uses `req._hrtimeStart` set by `requestTimer`; deliberately avoids `req._startTime` which Morgan reserves internally as a `Date`)
- `:error-message` - Error message (for failed requests)

---

## Using the Logger

### In Your Code

Import the logger:
```javascript
const { logger } = require("./config/logger");
```

### Basic Logging

```javascript
// Information
logger.info("User logged in successfully", { userId: 123 });

// Warning
logger.warn("Slow database query detected", { query: "SELECT...", duration: 3000 });

// Error
logger.error("Failed to process payment", { orderId: 456, error: err.message });

// Debug (only in debug mode)
logger.debug("Processing request", { data: requestData });
```

### Specialized Logging Methods

#### Request Logging
```javascript
logger.logRequest(req, res, responseTime);
```

#### Error Logging
```javascript
logger.logError(error, req);
```

#### Database Operations
```javascript
logger.logDatabase("SELECT", query, duration);
```

#### Authentication Events
```javascript
logger.logAuth("login", userId, { ip: req.ip });
logger.logAuth("logout", userId);
logger.logAuth("failed_login_attempt", null, { email, ip: req.ip });
```

#### Security Events
```javascript
logger.logSecurity("brute_force_attempt", { ip: req.ip, attempts: 5 });
logger.logSecurity("suspicious_request", { pattern: "SQL injection", ip: req.ip });
```

---

## Middleware Components

### 1. Request Timer
Tracks request duration for performance monitoring.

```javascript
app.use(requestTimer);
```

### 2. Request Context
Adds unique request ID to each request.

```javascript
app.use(requestContext);
// Each response includes: X-Request-ID header
```

### 3. HTTP Logger
Logs all HTTP requests using Morgan.

```javascript
app.use(httpLogger);
```

### 4. Security Logger
Detects and logs suspicious patterns (XSS, SQL injection, path traversal).

```javascript
app.use(securityLogger);
```

### 5. Slow Request Logger
Logs requests exceeding a time threshold.

```javascript
app.use(slowRequestLogger(2000)); // Log requests > 2 seconds
```

### 6. Error Logger
Logs errors before sending error responses.

```javascript
app.use(errorLogger);
```

---

## Log File Management

### File Rotation

Logs automatically rotate when:
- File size exceeds `LOG_MAX_FILE_SIZE` (default: 20MB)
- Older files are archived with timestamps
- Only `LOG_MAX_FILES` are kept (default: 14 days)

### Log Files Structure

```
logs/
├── combined.log          # All log levels
├── error.log            # Errors only
├── access.log           # HTTP requests
├── combined-2026-03-10.log  # Rotated files
└── error-2026-03-09.log
```

### Viewing Logs

```bash
# View all logs
cat logs/combined.log

# View errors only
cat logs/error.log

# View HTTP requests
cat logs/access.log

# Follow logs in real-time
tail -f logs/combined.log

# Search for specific errors
grep "ERROR" logs/combined.log

# View last 100 lines
tail -n 100 logs/combined.log
```

---

## Production Configuration

### Recommended Production Settings

```bash
NODE_ENV=production
LOG_LEVEL=warn                    # Only warnings and errors
LOG_FORMAT=json                   # Structured for log aggregation
ENABLE_CONSOLE_LOGGING=false      # Reduce console noise
ENABLE_FILE_LOGGING=true          # Keep file logs
HTTP_LOG_FORMAT=json              # Structured HTTP logs
HTTP_LOG_SKIP_HEALTH=true         # Skip health checks
HTTP_LOG_SKIP_SUCCESS=true        # Only log errors
LOG_MAX_FILE_SIZE=50m             # Larger files in production
LOG_MAX_FILES=30d                 # Keep 30 days
```

### Development Settings

```bash
NODE_ENV=development
LOG_LEVEL=debug                   # Verbose logging
LOG_FORMAT=text                   # Human-readable
ENABLE_CONSOLE_LOGGING=true       # See logs in console
ENABLE_FILE_LOGGING=true          # Also save to files
HTTP_LOG_FORMAT=detailed          # Full request details
HTTP_LOG_SKIP_HEALTH=false        # Log everything
HTTP_LOG_SKIP_SUCCESS=false       # Log all requests
```

---

## Security Considerations

### Sensitive Data Protection

The logging system automatically redacts sensitive fields in request bodies:
- `password`
- `token`
- `secret`
- `apiKey`
- `creditCard`

These fields are replaced with `[REDACTED]` in logs.

### What NOT to Log

❌ **Never enable these in production:**
```bash
HTTP_LOG_REQUEST_BODY=true   # May log passwords, tokens
HTTP_LOG_RESPONSE_BODY=true  # May log sensitive user data
```

✅ **Safe to enable:**
```bash
HTTP_LOG_REQUEST_BODY=true   # Only in development/debugging
```

### Security Events Logged

The system automatically logs:
- Suspicious patterns (SQL injection, XSS attempts)
- Path traversal attempts
- Unusual request patterns
- Failed authentication attempts (implement in auth service)
- Brute force attempts (implement with rate limiting)

---

## Integration with Monitoring Tools

### ELK Stack (Elasticsearch, Logstash, Kibana)

1. Set `LOG_FORMAT=json`
2. Configure Logstash to read from log files
3. Parse JSON logs in Elasticsearch
4. Visualize in Kibana

### Splunk

1. Point Splunk forwarder to `logs/` directory
2. Set `LOG_FORMAT=json` for better parsing
3. Create dashboards for API metrics

### CloudWatch (AWS)

```javascript
// Add CloudWatch transport to logger.js
const WinstonCloudWatch = require('winston-cloudwatch');

transports.push(
  new WinstonCloudWatch({
    logGroupName: 'court-api',
    logStreamName: process.env.NODE_ENV,
    awsRegion: 'us-east-1',
  })
);
```

### Sentry (Error Tracking)

```javascript
// Add Sentry transport for errors
const Sentry = require('@sentry/node');

logger.on('error', (error) => {
  Sentry.captureException(error);
});
```

---

## Performance Impact

### Overhead

- **Console logging:** Minimal (~0.1ms per log)
- **File logging:** Low (~0.5ms per log)
- **JSON formatting:** Slightly higher (~1ms per log)
- **Request logging:** ~1-2ms per request

### Optimization Tips

1. **Production:** Use `LOG_LEVEL=warn` or `error` only
2. **Skip health checks:** `HTTP_LOG_SKIP_HEALTH=true`
3. **Skip successful requests:** `HTTP_LOG_SKIP_SUCCESS=true` in high-traffic APIs
4. **Use JSON format:** Faster parsing for aggregation tools
5. **Disable request/response body logging:** Reduces I/O significantly

---

## Troubleshooting

### Logs Not Appearing

1. Check `ENABLE_FILE_LOGGING=true` and `ENABLE_CONSOLE_LOGGING=true`
2. Verify `logs/` directory exists and is writable
3. Check `LOG_LEVEL` - set to `debug` to see all logs
4. Ensure Winston/Morgan are installed: `npm install winston morgan`

### Log Files Too Large

1. Reduce `LOG_MAX_FILE_SIZE` (e.g., `10m`)
2. Reduce `LOG_MAX_FILES` (e.g., `7d`)
3. Increase `LOG_LEVEL` to `warn` or `error`
4. Enable `HTTP_LOG_SKIP_SUCCESS=true`

### Performance Issues

1. Disable console logging in production: `ENABLE_CONSOLE_LOGGING=false`
2. Skip successful requests: `HTTP_LOG_SKIP_SUCCESS=true`
3. Use compact or JSON format: `HTTP_LOG_FORMAT=compact`
4. Increase log level: `LOG_LEVEL=warn`

### `ERR_INVALID_ARG_TYPE` crash on every request

Symptom: the server crashes with _"The 'time' argument must be an instance of Array. Received an instance of Date"_ originating from `process.hrtime` inside the `response-time-ms` Morgan token.

Cause: Morgan sets `req._startTime` as a `Date` object internally. If `requestTimer` also writes to `req._startTime` (as an `hrtime` array), Morgan's assignment overwrites it, and the token later receives a `Date` instead of the expected `[seconds, nanoseconds]` array.

Fix (already applied): `requestTimer` stores the high-resolution timer under `req._hrtimeStart` instead, which does not conflict with Morgan's internals.

### Missing Request Details

1. Ensure all middleware is properly ordered in `app.js`:
   ```javascript
   app.use(requestTimer);      // Must be first
   app.use(requestContext);
   app.use(httpLogger);
   // ... other middleware
   app.use(errorLogger);       // Before error handler
   ```

---

## Examples

### Example 1: Log User Actions

```javascript
// In authService.js
const { logger } = require('../config/logger');

const loginUser = async (email, password) => {
  try {
    // ... authentication logic
    logger.logAuth('login_success', user.id, { email, ip: req.ip });
    return { user, tokens };
  } catch (error) {
    logger.logAuth('login_failed', null, { email, error: error.message });
    throw error;
  }
};
```

### Example 2: Log Database Performance

```javascript
// In database.js
const query = async (sql, params) => {
  const startTime = Date.now();
  try {
    const [rows] = await pool.execute(sql, params);
    const duration = Date.now() - startTime;
    
    if (duration > 100) {
      logger.logDatabase('slow_query', sql, duration);
    }
    
    return rows;
  } catch (error) {
    logger.error('Database query failed', { sql, error: error.message });
    throw error;
  }
};
```

### Example 3: Custom Business Logic Logging

```javascript
// In gameService.js
const { logger } = require('../config/logger');

const createGame = async (gameData, creatorId) => {
  logger.info('Creating new game', { 
    name: gameData.name,
    creatorId,
    startedAt: gameData.startedAt 
  });
  
  try {
    const game = await query(/* ... */);
    logger.info('Game created successfully', { gameId: game.id });
    return game;
  } catch (error) {
    logger.error('Failed to create game', { 
      error: error.message,
      gameData 
    });
    throw error;
  }
};
```

---

## Advanced Customization

### Adding Custom Transports

Edit `src/config/logger.js`:

```javascript
// Add custom transport
const transports = [
  // ... existing transports
  
  // Custom transport for critical errors
  new winston.transports.File({
    filename: 'logs/critical.log',
    level: 'error',
    format: jsonFormat,
  }),
  
  // Email transport for critical errors (requires winston-mail)
  new winston.transports.Mail({
    to: 'admin@example.com',
    from: 'alerts@example.com',
    subject: 'Critical Error in API',
    level: 'error',
  }),
];
```

### Custom Log Formats

```javascript
// Add to src/config/logger.js
const customFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${JSON.stringify(meta)}`;
});
```

### Environment-Specific Configuration

```javascript
// In src/config/logger.js
const getTransports = () => {
  if (process.env.NODE_ENV === 'production') {
    return [
      new winston.transports.File({ filename: 'logs/production.log' }),
      new WinstonCloudWatch({ /* config */ }),
    ];
  }
  
  return [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ filename: 'logs/development.log' }),
  ];
};
```

---

## Best Practices

1. ✅ **Always log errors** with context (user, request, data)
2. ✅ **Use appropriate log levels** (don't use `error` for warnings)
3. ✅ **Include request IDs** for tracing requests across services
4. ✅ **Log performance metrics** (response times, slow queries)
5. ✅ **Sanitize sensitive data** before logging
6. ✅ **Use structured logging** (JSON) in production
7. ✅ **Set up log rotation** to prevent disk space issues
8. ✅ **Monitor logs** with alerting for critical errors
9. ❌ **Don't log passwords, tokens, or secrets**
10. ❌ **Don't log entire request/response bodies** in production

---

## Next Steps

- [ ] Set up log aggregation (ELK, Splunk, CloudWatch)
- [ ] Configure error alerting (email, Slack, PagerDuty)
- [ ] Implement request ID tracking across microservices
- [ ] Add APM integration (New Relic, DataDog)
- [ ] Create log dashboards for monitoring
- [ ] Set up automated log analysis for anomaly detection
