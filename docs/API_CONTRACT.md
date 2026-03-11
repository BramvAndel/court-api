# API Contract - court-front

This document lists the backend endpoints the frontend calls and the exact behavior/response shapes expected by the current frontend implementation. Update the backend to match these contracts so the frontend works reliably.

Base URL

- The frontend reads the base URL from appConfig.apiBaseUrl.

Authentication overview

- The frontend uses cookie-based auth for protected endpoints. All requests that require authentication are sent with `credentials: 'include'` (HTTP-only cookies). The frontend will attempt `POST /auth/refresh` when a protected request returns `401`.
- All JSON responses must include `Content-Type: application/json` when returning JSON.
- Error responses should return JSON with a `message` field, e.g. `{ "message": "Invalid token" }`.

Standard user object (recommended canonical shape)

- `id` (number or string)
- `email` (string)
- `name` (string) OR `username` (string)
- `role` (string) - e.g., `user`, `admin`

Notes about flexible shapes

- The frontend tolerates either returning a user object at the top-level (e.g. `{ id: 1, email: ... }`) or wrapped in a `user` field (e.g. `{ user: { id: 1, ... } }`). To reduce frontend edge-cases, return the canonical user object at the top-level for `login`, `POST /users`, and `GET /users/:id`.

Authentication endpoints (must be implemented)

- POST `/auth/login`
  - Request: JSON `{ "email": "...", "password": "..." }`
  - Response (200): JSON `{ "user": { ... } }` OR (preferred) top-level user object `{ id, email, name, role }`.
  - Side-effect: Set HTTP-only cookies (session/refresh token or access cookie) so subsequent requests with `credentials: 'include'` are authorized.

- POST `/auth/logout`
  - Request: no body required; `credentials: 'include'` must be respected.
  - Response (200): JSON `{ "message": "Logged out" }`.
  - Side-effect: clear HTTP-only cookies.

- POST `/auth/refresh`
  - Request: no body; called with `credentials: 'include'` (cookie present).
  - Response (200): success and set refreshed cookie(s) so the original request can be retried by the frontend.
  - Response (401): when refresh is invalid/expired.

Game endpoints

- GET `/games`
  - Auth: none
  - Request: GET
  - Response (200): JSON array of games

- GET `/games/:id`
  - Auth: none
  - Request: GET
  - Response (200): JSON game object

- POST `/games/:id/signup`
  - Auth: required (cookie)
  - Request: POST with `credentials: 'include'`.
  - Response (200): JSON `{ "message": "Signed up" }` or the created signup object. Return `401` if not authenticated.

- POST `/games`
  - Auth: required (admin)
  - Request body: JSON game data (shape determined by backend). Frontend sends `body: JSON.stringify(gameData)` without special multipart headers.
  - Response (201): created game object JSON.
  - Response (403): if user is not admin.

History endpoints (frontend expects these paths)

- GET `/history/games`
  - Auth: required (cookie)
  - Request: GET with `credentials: 'include'`
  - Response (200): JSON array of history items (games) for the current user.

- GET `/history/games/:id`
  - Auth: required
  - Request: GET with `credentials: 'include'`
  - Response (200): JSON history/game object

- GET `/history/elo`
  - Auth: required
  - Request: GET with `credentials: 'include'`
  - Response (200): JSON array of historical ELO ratings for the current user.

Player endpoints (added to match frontend calls in `src/services/apiService.js`)

- GET `/player/search/:username`
  - Auth: none
  - Request: GET
  - Response (200): JSON array of players matching the search criteria

- GET `/player/profile/:id`
  - Auth: none
  - Request: GET
  - Response (200): JSON player profile object

User endpoints

- POST `/users` (register)
  - Auth: none
  - Request body: JSON `{ "email": "..", "password": "..", "username"?: ".." }` (backend decides required fields)
  - Response (201): created user object JSON (prefer top-level user object)

- GET `/users/:id`
  - Auth: required (cookie)
  - Request: GET with `credentials: 'include'`
  - Response (200): user object JSON (top-level preferred). Example: `{ id: 1, email: "...", name: "...", role: "user" }`.

- PUT `/users/:id`
  - Auth: required (cookie)
  - Request body: JSON with updated user fields (e.g. `name`, `email`)
  - Response (200): updated user object JSON

- DELETE `/users/:id`
  - Auth: required (cookie)
  - Response (200): success message

General expectations and error handling

- Protected endpoints must return 401 when the request is unauthorized. The frontend will attempt `POST /auth/refresh` when it receives 401; if refresh succeeds, the frontend retries the original request.
- All JSON error responses should include `{ "message": "..." }` and appropriate status codes.
- Accept `credentials: 'include'` for cookie-based sessions.

Shapes referenced in code

- `authService.login` expects the login response to include either:
  - `user` object, or
  - `userId` (then the frontend calls `GET /users/:id` to recover the user object).
    To simplify frontend logic, return the full `user` object directly from the login endpoint.

Backend changes suggested (summary)

- Ensure `/auth/login`, `/auth/logout`, and `/auth/refresh` exist and set/clear HTTP-only cookies.
- Return canonical top-level user objects for `login`, `GET /users/:id`, and `POST /users` responses.
- Return `application/json` with `{ message }` for errors.
- Ensure protected endpoints return `401` when unauthorized and support the refresh flow described above.
