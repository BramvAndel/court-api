# API Testing Guide

This file contains example requests to test the King of Court API.

## Prerequisites

- Server must be running (`npm run dev`)
- Install a REST client like:
  - [HTTPie](https://httpie.io/)
  - [Postman](https://www.postman.com/)
  - [Thunder Client](https://www.thunderclient.com/) (VS Code extension)
  - Or use curl

## Test Sequence

### 1. Health Check

```bash
curl http://localhost:3000/
```

### 2. Register a User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Note: The `-c cookies.txt` flag saves cookies to a file for subsequent requests.

### 4. Get Profile (Protected)

```bash
curl http://localhost:3000/api/auth/profile \
  -b cookies.txt
```

### 5. Get User by ID (Protected)

```bash
curl http://localhost:3000/api/users/1 \
  -b cookies.txt
```

### 6. Update User (Protected)

```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Updated Name"
  }'
```

### 7. Create a Game (Admin Only)

First, you need to manually set a user's role to "admin" in the code.
Then:

```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Basketball Tournament",
    "date": "2026-03-15",
    "location": "Main Court",
    "description": "Annual tournament"
  }'
```

### 8. Get All Games (Public)

```bash
curl http://localhost:3000/api/games
```

### 9. Get Game by ID (Public)

```bash
curl http://localhost:3000/api/games/1
```

### 10. Sign Up for Game (Protected)

```bash
curl -X POST http://localhost:3000/api/games/1/signup \
  -b cookies.txt
```

### 11. Get User History (Protected)

```bash
curl http://localhost:3000/api/history \
  -b cookies.txt
```

### 12. Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 13. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## Using Postman or Thunder Client

When using GUI tools:

1. **Enable cookie handling**: Make sure your client is set to automatically handle cookies
2. **Set Content-Type**: For POST/PUT requests, set header `Content-Type: application/json`
3. **Test the flow**:
   - Register a user
   - Login (cookies will be saved automatically)
   - Try protected endpoints
   - Test refresh when token expires
   - Logout

## Testing with Frontend

The frontend should use `fetch` with `credentials: 'include'`:

```javascript
// Login example
const response = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include", // Important for cookies
  body: JSON.stringify({
    email: "test@example.com",
    password: "password123",
  }),
});

const data = await response.json();
console.log(data.user);

// Protected request example
const profileResponse = await fetch("http://localhost:3000/api/auth/profile", {
  credentials: "include", // Include cookies
});

const profile = await profileResponse.json();
console.log(profile);
```

## Expected Behaviors

### Successful Responses

- Registration: `201` with user object
- Login: `200` with user object + cookies set
- Protected endpoints: `200` with data if authenticated
- Logout: `200` with success message + cookies cleared

### Error Responses

- Missing credentials: `401` with `{ "message": "..." }`
- Invalid token: `401` with `{ "message": "Invalid or expired token" }`
- Admin-only endpoint: `403` with `{ "message": "Admin access required" }`
- Not found: `404` with `{ "message": "..." }`
- Duplicate email: `409` with `{ "message": "Email already exists" }`
