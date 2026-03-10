# King of Court API

A RESTful Express API with cookie-based JWT authentication supporting games, user management, and history tracking.

## Getting Started

### Prerequisites

- Node.js installed
- npm or yarn package manager

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the JWT secrets (IMPORTANT: Change in production!)

### Running the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will run on `http://localhost:3000` by default.

## Authentication

This API uses **HTTP-only cookie-based authentication**:

- Access tokens are valid for 15 minutes
- Refresh tokens are valid for 7 days
- All requests requiring authentication must include `credentials: 'include'` in the frontend
- When an access token expires (401 response), call `/api/auth/refresh` to get a new one

## API Endpoints

### Authentication Routes

#### 1. Register a New User

```http
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password",
  "username": "optional_username"
}
```

**Response (201):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "user",
  "role": "user"
}
```

#### 2. Login

```http
POST /api/auth/login
Content-Type: application/json
Credentials: include

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response (200):**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "user",
    "role": "user"
  }
}
```

**Side effect:** Sets HTTP-only cookies `accessToken` and `refreshToken`

#### 3. Refresh Access Token

```http
POST /api/auth/refresh
Credentials: include
```

**Response (200):**

```json
{
  "message": "Token refreshed"
}
```

**Side effect:** Refreshes the `accessToken` cookie

#### 4. Logout

```http
POST /api/auth/logout
Credentials: include
```

**Response (200):**

```json
{
  "message": "Logged out"
}
```

**Side effect:** Clears authentication cookies

#### 5. Get User Profile (Protected)

```http
GET /api/auth/profile
Credentials: include
```

**Response (200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "user",
  "role": "user",
  "createdAt": "2026-03-10T..."
}
```

### User Routes

#### Get User by ID (Protected)

```http
GET /api/users/:id
Credentials: include
```

**Response (200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "user",
  "role": "user",
  "createdAt": "2026-03-10T..."
}
```

#### Update User (Protected)

```http
PUT /api/users/:id
Content-Type: application/json
Credentials: include

{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

**Response (200):**

```json
{
  "id": 1,
  "email": "newemail@example.com",
  "name": "New Name",
  "role": "user",
  "createdAt": "2026-03-10T..."
}
```

#### Delete User (Protected)

```http
DELETE /api/users/:id
Credentials: include
```

**Response (200):**

```json
{
  "message": "User deleted successfully"
}
```

### Game Routes

#### Get All Games (Public)

```http
GET /api/games
```

**Response (200):**

```json
[
  {
    "id": 1,
    "name": "Basketball Tournament",
    "date": "2026-03-15",
    "location": "Main Court",
    "createdBy": 1,
    "createdAt": "2026-03-10T...",
    "signupCount": 5
  }
]
```

#### Get Game by ID (Public)

```http
GET /api/games/:id
```

**Response (200):**

```json
{
  "id": 1,
  "name": "Basketball Tournament",
  "date": "2026-03-15",
  "location": "Main Court",
  "createdBy": 1,
  "createdAt": "2026-03-10T...",
  "signups": [
    {
      "id": 1,
      "gameId": 1,
      "userId": 2,
      "signedUpAt": "2026-03-10T..."
    }
  ]
}
```

#### Sign Up for Game (Protected)

```http
POST /api/games/:id/signup
Credentials: include
```

**Response (200):**

```json
{
  "message": "Signed up",
  "signup": {
    "id": 1,
    "gameId": 1,
    "userId": 2,
    "signedUpAt": "2026-03-10T..."
  }
}
```

#### Create Game (Admin Only)

```http
POST /api/games
Content-Type: application/json
Credentials: include

{
  "name": "Basketball Tournament",
  "date": "2026-03-15",
  "location": "Main Court",
  "description": "Annual tournament"
}
```

**Response (201):**

```json
{
  "id": 1,
  "name": "Basketball Tournament",
  "date": "2026-03-15",
  "location": "Main Court",
  "description": "Annual tournament",
  "createdBy": 1,
  "createdAt": "2026-03-10T...",
  "signups": []
}
```

### History Routes

#### Get User History (Protected)

```http
GET /api/history
Credentials: include
```

**Response (200):**

```json
[
  {
    "id": 1,
    "userId": 1,
    "gameId": 1,
    "createdAt": "2026-03-10T..."
  }
]
```

#### Get History Entry by ID (Protected)

```http
GET /api/history/:id
Credentials: include
```

**Response (200):**

```json
{
  "id": 1,
  "userId": 1,
  "gameId": 1,
  "createdAt": "2026-03-10T..."
}
```

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description"
}
```

Common status codes:

- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (missing or invalid token, refresh needed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

## Creating an Admin User

By default, all registered users have the `user` role. To create an admin user:

1. Register a normal user through the API
2. Manually edit `src/services/authService.js` and change the user's role to `"admin"` in the users array

Example:

```javascript
// In authService.js, find the user in the users array and update:
{
  id: 1,
  email: "admin@example.com",
  name: "admin",
  role: "admin",  // Change this from "user" to "admin"
  // ...
}
```

In production, you would typically have a database migration or seed script to create admin users.

## Token Management

- **Access Token**: Short-lived (15 minutes by default), used for API requests
- **Refresh Token**: Long-lived (7 days by default), used to get new access tokens

### Using Protected Routes

Include the access token in the Authorization header:

```
Authorization: Bearer your_access_token
```

## Project Structure

```
kingOfCourt/
├── src/
│   ├── controllers/
│   │   └── authController.js    # Request/response handlers
│   ├── services/
│   │   └── authService.js       # Business logic
│   ├── utils/
│   │   └── tokenUtils.js        # JWT token utilities
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   └── auth.js              # Route definitions
│   └── app.js                   # Express app configuration
├── .env                         # Environment variables
├── .gitignore
├── index.js                     # Application entry point
├── package.json
└── README.md
```

### Architecture

The application follows a layered architecture:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and data operations
- **Utils**: Reusable utility functions (token generation, validation)
- **Middleware**: Authentication and request processing
- **Routes**: Define API endpoints and map to controllers

## Security Notes

⚠️ **Important for Production:**

1. **Change JWT Secrets**: Update `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env` with strong, random values
2. **Use HTTPS**: Always use HTTPS in production
3. **Database**: Replace in-memory storage with a proper database (MongoDB, PostgreSQL, etc.)
4. **Rate Limiting**: Implement rate limiting to prevent brute force attacks
5. **Input Validation**: Add comprehensive input validation
6. **CORS**: Configure CORS appropriately for your frontend
7. **Environment Variables**: Never commit `.env` file to version control

## Current Limitations

- Uses in-memory storage (data is lost on server restart)
- No password strength validation
- No email verification
- No password reset functionality
- Basic error handling

## Next Steps

Consider adding:

- Database integration (MongoDB, PostgreSQL)
- Password strength requirements
- Email verification
- Password reset functionality
- Role-based access control (RBAC)
- Rate limiting
- Request logging
- Unit tests
