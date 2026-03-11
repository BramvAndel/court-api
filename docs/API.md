# King of Court — API Reference

## Base URL
```
http://localhost:3000
```

## Authentication

This API uses **HTTP-only cookie-based JWT authentication**. Cookies are set automatically on login and must be included in every subsequent request.

> Frontend: always pass `credentials: 'include'` with every request.

| Token | Lifetime | Cookie name |
|-------|----------|-------------|
| Access token | 15 minutes | `accessToken` |
| Refresh token | 7 days | `refreshToken` |

When an access token expires the server returns **401**. Call `POST /api/auth/refresh` to silently obtain a new one.

---

## Response format

All responses are JSON.

**Success**
```json
{ ...resource fields }
```

**Error**
```json
{ "message": "Human-readable description" }
```

---

## Status codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request (missing / invalid fields) |
| 401 | Unauthenticated |
| 403 | Forbidden (authenticated but not allowed) |
| 404 | Not found |
| 409 | Conflict (duplicate / wrong state) |
| 422 | Unprocessable (business-rule violation) |
| 500 | Internal server error |

---

## Health

### `GET /api/health`
Returns the current health status of the API and its database connection. No authentication required.

**200 OK** — database is reachable.
```json
{
  "status": "healthy",
  "timestamp": "2026-03-11T09:00:00.000Z",
  "uptime": 3600.5,
  "database": "connected"
}
```

**503 Service Unavailable** — database is unreachable.
```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-11T09:00:00.000Z",
  "uptime": 3600.5,
  "database": "disconnected"
}
```

---

## Auth  `/api/auth`

### `POST /api/auth/register`
Create a new user account.

> Also available as `POST /api/users` (see Users section).

**Body**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "username": "optional_username"
}
```
`email` and `password` are required. `username` defaults to the part of the email before `@`.

**201 Created**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "user",
  "role": "user"
}
```

**409 Conflict** — email or username already taken.

---

### `POST /api/auth/login`
Authenticate and receive session cookies.

**Body**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**200 OK** — sets `accessToken` and `refreshToken` cookies.
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

**401 Unauthorized** — invalid credentials.

---

### `POST /api/auth/refresh`
Exchange a valid refresh token for a new access token.

No body required — reads the `refreshToken` cookie.

**200 OK** — sets a new `accessToken` cookie.
```json
{ "message": "Token refreshed" }
```

**401 Unauthorized** — missing or expired refresh token.

---

### `POST /api/auth/logout`
Invalidate the current session.

No body required — reads the `refreshToken` cookie.

**200 OK** — clears both cookies.
```json
{ "message": "Logged out" }
```

---

### `GET /api/auth/profile` 🔒
Return the authenticated user's own profile.

**200 OK**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "user",
  "role": "user",
  "elo": 1000,
  "createdAt": "2026-03-11T08:00:00.000Z"
}
```

---

## Users  `/api/users`

### `POST /api/users`
Register a new user (alias for `POST /api/auth/register`).

See [Auth → Register](#post-apiauthregister).

---

### `GET /api/users/:id` 🔒
Fetch a user by ID.

Users may only fetch their own profile. Admins may fetch any profile.

**200 OK**
```json
{
  "id": 3,
  "email": "user@example.com",
  "name": "username",
  "role": "user",
  "elo": 1024,
  "createdAt": "2026-03-11T08:00:00.000Z"
}
```

**403 Forbidden** — requesting another user's profile without admin role.
**404 Not Found**

---

### `PUT /api/users/:id` 🔒
Update a user's profile.

Users may only update their own profile. Admins may update any profile.

**Body** (all fields optional)
```json
{
  "email": "new@example.com",
  "username": "newname"
}
```

**200 OK** — returns the updated user object.

**403 Forbidden** — updating another user without admin role.
**404 Not Found**

---

### `DELETE /api/users/:id` 🔒
Delete a user account.

Users may only delete their own account. Admins may delete any account.

**200 OK**
```json
{ "message": "User deleted successfully" }
```

**403 Forbidden**
**404 Not Found**

---

## Players  `/api/player`

Public endpoints for looking up player profiles and ELO.

### `GET /api/player/search/:username`
Search for players by username (partial match).

**200 OK**
```json
[
  {
    "id": 3,
    "email": "user@example.com",
    "name": "bram",
    "role": "user",
    "elo": 1024
  }
]
```

Returns an empty array when no matches are found.

---

### `GET /api/player/profile/:id`
Fetch a public player profile by user ID.

**200 OK**
```json
{
  "id": 3,
  "email": "user@example.com",
  "name": "bram",
  "role": "user",
  "elo": 1024,
  "createdAt": "2026-03-11T08:00:00.000Z"
}
```

**404 Not Found**

---

## Games  `/api/games`

### `GET /api/games`
List all games with participant counts.

**200 OK**
```json
[
  {
    "id": 1,
    "name": "Friday Session",
    "description": "Weekly court game",
    "createdAt": "2026-03-11T08:00:00.000Z",
    "plannedAt": "2026-03-14T14:00:00.000Z",
    "startedAt": null,
    "endedAt": null,
    "status": "planned",
    "createdBy": 1,
    "winnerUserId": null,
    "signupCount": 4
  }
]
```

---

### `GET /api/games/:id`
Get full game details including all participants.

**200 OK**
```json
{
  "id": 1,
  "name": "Friday Session",
  "description": "Weekly court game",
  "createdAt": "2026-03-11T08:00:00.000Z",
  "plannedAt": "2026-03-14T14:00:00.000Z",
  "startedAt": "2026-03-14T14:05:00.000Z",
  "endedAt": null,
  "status": "started",
  "createdBy": 1,
  "winnerUserId": null,
  "participants": [
    {
      "id": 1,
      "userId": 3,
      "username": "bram",
      "email": "bram@example.com",
      "score": null
    }
  ]
}
```

**404 Not Found**

---

### `POST /api/games` 🔒 Admin
Create a new game.

**Body**
```json
{
  "name": "Friday Session",
  "description": "Weekly court game",
  "plannedAt": "2026-03-14T14:00:00.000Z",
  "startedAt": null,
  "endedAt": null,
  "status": "planned"
}
```
Only `name` is required. `status` defaults to `"planned"`.

**201 Created** — returns the created game object.

---

### `POST /api/games/:id/signup` 🔒
Sign the authenticated user up for a game.

**200 OK**
```json
{
  "message": "Signed up",
  "signup": {
    "id": 5,
    "gameId": 1,
    "userId": 3
  }
}
```

**404 Not Found** — game does not exist.
**409 Conflict** — user is already signed up.

---

### `PUT /api/games/:id/start` 🔒 Admin
Move the game from `planned` → `started`. Sets `startedAt` to the current timestamp.

**200 OK** — returns the updated game row.

**404 Not Found**
**409 Conflict** — game is not in `planned` state.

---

### `PUT /api/games/:id/end` 🔒 Admin
Move the game from `started` → `ended`. Sets `endedAt` to the current timestamp.

**200 OK** — returns the updated game row.

**404 Not Found**
**409 Conflict** — game is not in `started` state.

---

### `PUT /api/games/:id/process` 🔒 Admin
Process a finished game: record final scores, calculate ELO changes, and mark the game as `processed`.

The game must be in `ended` state before this can be called.

**Body**
```json
{
  "winnerId": 3,
  "scores": [
    { "userId": 3, "score": 21 },
    { "userId": 5, "score": 15 },
    { "userId": 7, "score": 9 }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `winnerId` | integer | ✅ | `userID` of the winning participant |
| `scores` | array | ✅ | Final score for every participant |

**How ELO is calculated**
The standard ELO formula (K = 32) is applied. The winner is paired against each loser individually; each loser's rating adjusts based only on their match against the winner.

$$
E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}
\qquad
R'_A = R_A + 32\,(S_A - E_A)
$$

ELO changes are inserted into `historical_elo`, which fires a database trigger that keeps `users.elo` in sync automatically.

**200 OK**
```json
{
  "gameId": 1,
  "winnerId": 3,
  "eloChanges": [
    { "userId": 3, "isWinner": true,  "oldElo": 1000, "newElo": 1045, "change": 45 },
    { "userId": 5, "isWinner": false, "oldElo": 1000, "newElo": 984,  "change": -16 },
    { "userId": 7, "isWinner": false, "oldElo": 1000, "newElo": 971,  "change": -29 }
  ]
}
```

**400 Bad Request** — `winnerId` or `scores` missing.
**404 Not Found**
**409 Conflict** — game not in `ended` state.
**422 Unprocessable** — fewer than 2 participants, or `winnerId` is not a participant.

---

## History  `/api/history`

All history endpoints require authentication 🔒.

### `GET /api/history/games`
List all games the authenticated user has participated in.

**200 OK**
```json
[
  {
    "id": 1,
    "name": "Friday Session",
    "description": "Weekly court game",
    "createdAt": "2026-03-11T08:00:00.000Z",
    "startedAt": "2026-03-14T14:05:00.000Z",
    "endedAt": "2026-03-14T15:00:00.000Z",
    "status": "processed",
    "createdBy": 1,
    "winnerUserId": 3,
    "userScore": 21,
    "participantId": 5
  }
]
```

---

### `GET /api/history/games/:id`
Get the full details of a specific game from the authenticated user's history.

The user must have been a participant in the game, otherwise **403** is returned.

**200 OK** — same shape as `GET /api/games/:id` plus all participant details.

**403 Forbidden** — user was not a participant.
**404 Not Found**

---

### `GET /api/history/elo`
Get the authenticated user's own ELO history.

**200 OK**
```json
{
  "userId": 3,
  "currentElo": 1045,
  "history": [
    {
      "id": 1,
      "elo": 1045,
      "recordedAt": "2026-03-14T15:01:00.000Z",
      "gameId": 1,
      "gameName": "Friday Session"
    }
  ]
}
```

Returns `{ "userId": n, "currentElo": 1000, "history": [] }` when no games have been processed yet.

---

### `GET /api/history/elo/:userId`
Get the ELO history for any user.

- **Own ID** — accessible to the user themselves.
- **Other ID** — requires admin role.

**200 OK** — same shape as `GET /api/history/elo`.

**403 Forbidden** — non-admin requesting another user's history.
**404 Not Found** — user does not exist.

---

## Game lifecycle

Games follow a strict state machine enforced by the API:

```
planned ──(start)──► started ──(end)──► ended ──(process)──► processed
```

| Transition | Endpoint | Role |
|------------|----------|------|
| Create | `POST /api/games` | Admin |
| planned → started | `PUT /api/games/:id/start` | Admin |
| started → ended | `PUT /api/games/:id/end` | Admin |
| ended → processed | `PUT /api/games/:id/process` | Admin |
| Sign up | `POST /api/games/:id/signup` | Any authenticated user |

---

## ELO system

Every user starts with an ELO of **1000**.

When a game is processed:
1. The winner is matched against every other participant using the standard ELO formula.
2. A row is inserted into `historical_elo` for each participant.
3. A database trigger (`trg_historical_elo_after_insert`) automatically updates `users.elo`.
4. The game's `winner_userID` is set and status becomes `processed`.

ELO history is permanently stored and available via `GET /api/history/elo`.

---

## Role reference

| Role | Description |
|------|-------------|
| `user` | Default role assigned on registration |
| `admin` | Full access — create/manage games, process results, view all data |

---

## 🔒 Auth legend

| Symbol | Requirement |
|--------|-------------|
| 🔒 | Requires valid `accessToken` cookie |
| 🔒 Admin | Requires valid `accessToken` cookie **and** `role = admin` |
