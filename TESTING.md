# Testing Guide - King of Court API

## Overview

This project includes comprehensive unit tests and integration tests to ensure code quality and reliability.

- **Unit Tests**: Test individual functions and services in isolation using mocks
- **Integration Tests**: Test API endpoints and their interactions with mocked database

## Test Structure

```
__tests__/
├── helpers/
│   └── testUtils.js          # Test utilities and sample data
├── services/
│   ├── authService.test.js   # Auth service unit tests
│   └── userService.test.js   # User service unit tests
├── utils/
│   └── tokenUtils.test.js    # Token utility unit tests
└── integration/
    ├── auth.integration.test.js    # Auth API endpoint tests
    ├── users.integration.test.js   # Users API endpoint tests
    ├── games.integration.test.js   # Games API endpoint tests
    └── health.integration.test.js  # Health check API tests
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (re-run on file changes)
```bash
npm run test:watch
```

### Run unit tests only
```bash
npm run test:unit
```

### Run integration tests only
```bash
npm run test:integration
```

### Run tests with coverage report
```bash
npm run test:coverage
```

The coverage report will be generated in `./coverage` directory with HTML report in `./coverage/index.html`

## Test Files Explained

### Unit Tests

#### authService.test.js
Tests for authentication service functions:
- `registerUser()` - User registration with validation
- `loginUser()` - Login with password verification
- `refreshAccessToken()` - Token refresh mechanism
- `logoutUser()` - Token invalidation

**Test Cases:**
- Successful registration
- Duplicate email/username detection
- Login with correct/incorrect credentials
- Token refresh with valid/invalid tokens

#### userService.test.js
Tests for user management service:
- `getUserById()` - Retrieve user profile
- `updateUser()` - Update user information
- `deleteUser()` - Delete user account
- `getAllUsers()` - Get all users list

**Test Cases:**
- Profile retrieval with/without admin privileges
- Partial updates
- User deletion
- Empty result handling

#### tokenUtils.test.js
Tests for JWT token utilities:
- `generateAccessToken()` - Create access tokens
- `generateRefreshToken()` - Create refresh tokens
- `verifyToken()` - Validate and decode tokens

**Test Cases:**
- Token generation with correct payload
- Token verification
- Expired token handling
- Invalid token detection

### Integration Tests

#### auth.integration.test.js
API endpoint tests:
- `POST /api/auth/register` - User registration endpoint
- `POST /api/auth/login` - User login endpoint
- `POST /api/auth/refresh` - Token refresh endpoint
- `POST /api/auth/logout` - User logout endpoint

**Test Cases:**
- Successful registration/login flow
- Input validation
- Error handling (401, 409, 400)
- Cookie management

#### users.integration.test.js
User management API tests:
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

**Test Cases:**
- Authorization checks
- Not found scenarios
- Partial updates
- CRUD operations

#### games.integration.test.js
Game management API tests:
- `GET /api/games` - List games
- `GET /api/games/:id` - Get game details
- `GET /api/games/:id/schedule` - Get schedule
- `POST /api/games` - Create game
- `POST /api/games/:id/signup` - Sign up for game
- `POST /api/games/:id/finish` - Finish game

**Test Cases:**
- Game CRUD operations
- Signup functionality
- Schedule generation
- Match result recording

#### health.integration.test.js
Health check and status API tests:
- `GET /` - Basic health check
- `GET /api/health` - Detailed health status

**Test Cases:**
- Running status verification
- Database connection status
- Response format validation
- Status code correctness

## Test Utilities

### testUtils.js

Provides test data and helper functions:

```javascript
// Sample test data
testData.users.testUser1         // Regular user
testData.users.admin             // Admin user
testData.games.game1             // Sample game
testData.tokens.validAccessToken // Valid JWT token

// Helper functions
resetMocks()    // Clear all mock call history
mockQuery       // Mock database query function
```

## Configuration Files

### jest.config.js
Jest test runner configuration:
- Test environment: Node.js
- Coverage collection from `src/` directory
- Test timeout: 10 seconds
- Automatic setup with `jest.setup.js`

### jest.setup.js
Test environment setup:
- Load environment variables from `.env.test`
- Set NODE_ENV to 'test'
- Configure JWT secrets for testing
- Suppress console logs during tests

### .env.test
Test-specific environment variables:
- Test database credentials
- Test JWT secrets
- Test server port (3001)

## Mocking Strategy

### Database Mocking
All database calls are mocked using Jest:
```javascript
jest.mock('../../src/config/database');
database.query.mockResolvedValueOnce([...]);
```

This allows tests to:
- Run without a real database
- Control query responses
- Test error scenarios
- Verify correct SQL queries

### Authentication Mocking
Auth middleware is mocked in integration tests:
```javascript
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, role: 'user' };
    next();
  }
}));
```

### Dependency Mocking
External dependencies are mocked:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT operations
- Database module

## Best Practices

1. **Isolation**: Unit tests test services in isolation
2. **Mocking**: External dependencies are mocked
3. **Coverage**: Each function has multiple test cases
4. **Error Handling**: Both success and error paths tested
5. **Descriptive Names**: Test names clearly describe what they test
6. **AAA Pattern**: Arrange-Act-Assert structure

## Adding New Tests

When adding new features:

1. Create test file following naming pattern: `featureName.test.js`
2. Import test utilities and dependencies
3. Mock external dependencies
4. Write test cases following AAA pattern:
   ```javascript
   it('should do something', async () => {
     // Arrange - Set up test data
     const input = { ... };
     
     // Act - Execute the function
     const result = await functionToTest(input);
     
     // Assert - Verify the result
     expect(result).toEqual(...);
   });
   ```

## Troubleshooting

### Tests timing out
- Increase timeout in jest.config.js
- Check for infinite loops or hanging promises

### Mock not working
- Ensure mock is set up before function is called
- Check that module path in jest.mock() matches import path

### Database connection errors
- Ensure .env.test file exists
- Verify database mock is set up correctly
- Check that jest.mock() is at the top of the test file

### Coverage gaps
- Run `npm run test:coverage` to see coverage report
- Focus on untested branches and error cases
- Add test cases for edge conditions

## Continuous Integration

For CI/CD pipelines, use:
```bash
npm run test:coverage -- --ci --coverage --maxWorkers=2
```

This generates coverage reports suitable for CI systems and limits worker processes.

## Further Reading

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
