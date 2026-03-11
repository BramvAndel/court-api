# Logging System - Quick Start Guide

## ✅ What Was Implemented

A comprehensive, production-ready logging system with:

### Core Features
- ✅ **Winston** for flexible, structured logging
- ✅ **Morgan** for HTTP request logging
- ✅ **Multiple log levels** (error, warn, info, debug)
- ✅ **File-based logging** with automatic rotation
- ✅ **Colorized console output** for development
- ✅ **JSON format support** for log aggregation tools
- ✅ **Request tracking** with unique request IDs
- ✅ **Performance monitoring** (slow request detection)
- ✅ **Security event logging** (detects XSS, SQL injection attempts)
- ✅ **Error tracking** with stack traces
- ✅ **Customizable via environment variables**

### Files Created
1. `src/config/logger.js` - Winston configuration with custom formats
2. `src/middleware/logger.js` - HTTP request logging middleware
3. `logs/` - Directory for log files (combined, error, access)
4. `LOGGING.md` - Complete documentation

### Files Modified
1. `src/app.js` - Integrated logging middleware
2. `index.js` - Replaced console.log with logger, added process handlers
3. `.env.example` - Added logging configuration variables

---

## 🚀 Quick Start

### 1. Copy Environment Variables

If you haven't already, copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Configure Logging (Optional)

Default settings work out of the box. To customize, edit `.env`:

```bash
# Basic configuration
LOG_LEVEL=info              # error, warn, info, debug
LOG_FORMAT=text             # text or json
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=true

# HTTP request logging
HTTP_LOG_FORMAT=detailed    # detailed, compact, or json
```

### 3. Start the Server

```bash
npm run dev
```

You'll see colorized logs in the console:
```
08:32:37 info: Server is running on http://localhost:3000
08:32:37 info: Environment: development
08:32:37 info: Log level: info
```

### 4. Check Log Files

Log files are automatically created in the `logs/` directory:

```bash
# View all logs
cat logs/combined.log

# View only errors
cat logs/error.log

# View HTTP requests
cat logs/access.log

# Follow logs in real-time
tail -f logs/combined.log
```

---

## 📝 Using the Logger in Your Code

### Import the Logger

```javascript
const { logger } = require('./config/logger');
```

### Basic Examples

```javascript
// Information
logger.info('User registered', { userId: 123, email: 'user@example.com' });

// Warning
logger.warn('Slow database query', { duration: 3000, query: 'SELECT...' });

// Error
logger.error('Payment failed', { orderId: 456, error: err.message });

// Debug (only when LOG_LEVEL=debug)
logger.debug('Processing data', { data: requestData });
```

### Specialized Logging

```javascript
// Authentication events
logger.logAuth('login', userId, { ip: req.ip });

// Security events
logger.logSecurity('brute_force_attempt', { ip: req.ip, attempts: 5 });

// Database operations
logger.logDatabase('SELECT', query, duration);

// Errors with request context
logger.logError(error, req);
```

---

## 🎛️ Customization Options

### Log Levels

Set `LOG_LEVEL` in `.env`:
- `error` - Only errors (production)
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging
- `silly` - Everything (very verbose)

### HTTP Request Formats

Set `HTTP_LOG_FORMAT` in `.env`:

**Detailed** (default):
```
127.0.0.1 user-123 "GET /api/games HTTP/1.1" 200 1234 45.23 ms
```

**Compact**:
```
GET /api/games 200 45.23 ms - user-123
```

**JSON**:
```json
{"timestamp":"2026-03-11T10:30:45Z","method":"GET","url":"/api/games","status":"200"}
```

### Skip Certain Logs

```bash
# Skip health check endpoints (/api/health)
HTTP_LOG_SKIP_HEALTH=true

# Skip successful requests (only log errors)
HTTP_LOG_SKIP_SUCCESS=true

# Skip specific paths
HTTP_LOG_SKIP_PATHS=/favicon.ico,/static
```

### File Rotation

```bash
# Maximum file size before rotation
LOG_MAX_FILE_SIZE=20m     # 20 megabytes

# Maximum number of files to keep
LOG_MAX_FILES=14d         # 14 days worth of logs
```

---

## 🔒 Security Features

### Automatic Sensitive Data Redaction

These fields are automatically redacted from logs:
- password
- token
- secret
- apiKey
- creditCard

```javascript
// Input: { email: "user@test.com", password: "secret123" }
// Logged: { email: "user@test.com", password: "[REDACTED]" }
```

### Security Event Detection

Automatically logs suspicious patterns:
- SQL injection attempts
- XSS attempts
- Path traversal attempts
- Unusual request patterns

```javascript
// Suspicious request detected and logged automatically
GET /api/users?id=1' OR '1'='1
// Log: "Security Event: Suspicious Request Detected"
```

### Slow Request Monitoring

Automatically logs requests taking longer than threshold:

```javascript
// In app.js
app.use(slowRequestLogger(2000)); // Log requests > 2 seconds
```

---

## 📊 Log File Structure

```
logs/
├── combined.log          # All log levels (info, warn, error, etc.)
├── error.log            # Only errors with stack traces
├── access.log           # HTTP requests and responses
├── combined-2026-03-10.log  # Rotated files (automatic)
└── error-2026-03-09.log
```

---

## 🌍 Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_FORMAT=text
ENABLE_CONSOLE_LOGGING=true
HTTP_LOG_FORMAT=detailed
HTTP_LOG_SKIP_HEALTH=false
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
ENABLE_CONSOLE_LOGGING=false
HTTP_LOG_FORMAT=json
HTTP_LOG_SKIP_HEALTH=true
HTTP_LOG_SKIP_SUCCESS=true
```

---

## 🔧 Troubleshooting

### Logs not appearing?
1. Check `ENABLE_FILE_LOGGING=true` in `.env`
2. Verify `logs/` directory exists
3. Set `LOG_LEVEL=debug` to see all logs

### Too many logs?
1. Increase `LOG_LEVEL` to `warn` or `error`
2. Enable `HTTP_LOG_SKIP_SUCCESS=true`
3. Enable `HTTP_LOG_SKIP_HEALTH=true`

### Performance issues?
1. Disable console logging: `ENABLE_CONSOLE_LOGGING=false`
2. Use compact format: `HTTP_LOG_FORMAT=compact`
3. Skip successful requests: `HTTP_LOG_SKIP_SUCCESS=true`

---

## 📚 Full Documentation

For comprehensive documentation including:
- Integration with monitoring tools (ELK, Splunk, CloudWatch)
- Advanced customization
- Best practices
- Performance optimization
- Security considerations

See **[LOGGING.md](LOGGING.md)**

---

## ✨ What's Next?

- [ ] Configure database connection to see full HTTP request logging
- [ ] Integrate with monitoring tools (Sentry, CloudWatch, etc.)
- [ ] Set up log aggregation for production
- [ ] Configure alerting for critical errors
- [ ] Create log dashboards

---

## 🎉 Testing the Logger

Start the server and make some requests:

```bash
# Start server
npm run dev

# Make a request
curl http://localhost:3000/

# Check logs
tail -f logs/combined.log
```

You'll see detailed logs for every request with:
- Request method and URL
- Response status and time
- User information (if authenticated)
- Error details (if any)
- Security warnings (if suspicious)

---

**The logging system is fully functional and ready to use!** 🚀
