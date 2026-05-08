# King of Court - API Reference

## Base URL

```url
http://localhost:3000
```

## Authentication

This API uses **HTTP-only cookie-based JWT authentication**. Cookies are set automatically on login and must be included in every subsequent request.

> Frontend: always pass `credentials: 'include'` with every request.

| Token         | Lifetime   | Cookie name    |
| ------------- | ---------- | -------------- |
| Access token  | 15 minutes | `accessToken`  |
| Refresh token | 7 days     | `refreshToken` |

When an access token expires the server returns **401**. Call `POST /api/auth/refresh` **once** to silently obtain a new one, if that fails (e.g. refresh token expired) the user must log in again.

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

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| 200  | OK                                        |
| 201  | Created                                   |
| 400  | Bad request (missing / invalid fields)    |
| 401  | Unauthenticated                           |
| 403  | Forbidden (authenticated but not allowed) |
| 404  | Not found                                 |
| 409  | Conflict (duplicate / wrong state)        |
| 422  | Unprocessable (business-rule violation)   |
| 500  | Internal server error                     |

---

## Health

### `GET /api/health` (public)

Returns the current health status of the API and its database connection. No authentication required.

**200 OK** - database is reachable.

```json
{
  "status": "healthy",
  "timestamp": "2026-03-11T09:00:00.000Z",
  "uptime": 3600.5,
  "database": "connected"
}
```

**503 Service Unavailable** - database is unreachable.

```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-11T09:00:00.000Z",
  "uptime": 3600.5,
  "database": "disconnected"
}
```

---

## Auth `/api/auth/*`

### `POST /api/auth/register` (public)

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

**409 Conflict** - email or username already taken.

---

### `POST /api/auth/login` (public)

Authenticate and receive session cookies.

**Body**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**200 OK** - sets `accessToken` and `refreshToken` cookies.

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

**401 Unauthorized** - invalid credentials.

---

### `POST /api/auth/refresh` (refresh token required)

Exchange a valid refresh token for a new access token.

No body required - reads the `refreshToken` cookie.

**200 OK** - sets a new `accessToken` cookie.

```json
{ "message": "Token refreshed" }
```

**401 Unauthorized** - refresh token not present in cookies.
**403 Forbidden** - refresh token is invalid or expired.

---

### `POST /api/auth/logout` (public)

Invalidate the current session.

No body required - reads the `refreshToken` cookie.

**200 OK** - clears both cookies.

```json
{ "message": "Logged out" }
```

---

### `GET /api/auth/profile` (auth required)

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

## Users `/api/users/*`

### `POST /api/users` (public)

Register a new user (alias for `POST /api/auth/register`).

See [Auth -> Register](#post-apiauthregister).

---

### `GET /api/users` (admin required)

Fetch all users.

Requires an authenticated user with `admin` role.

**200 OK**

```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "name": "admin",
    "role": "admin",
    "elo": 1200,
    "phone_number": "+31 6 12345678",
    "createdAt": "2026-03-11T08:00:00.000Z"
  },
  {
    "id": 3,
    "email": "user@example.com",
    "name": "username",
    "role": "user",
    "elo": 1024,
    "phone_number": null,
    "createdAt": "2026-03-11T08:00:00.000Z"
  }
]
```

**403 Forbidden** - authenticated user is not an admin.

---

### `GET /api/users/:id` (auth required)

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

**403 Forbidden** - requesting another user's profile without admin role.
**404 Not Found**

---

### `PUT /api/users/:id` (auth required)

Update a user's profile.

- **Own ID** - users can update their own email and username.
- **Other ID** - admins can update any user's email, username, role, and elo.
- **Role change** - admins only; cannot change their own role.
- **Elo change** - admins only; can change any user's elo.

**Body** (all fields optional)

```json
{
  "email": "new@example.com",
  "username": "newname",
  "role": "admin",
  "elo": 1200
}
```

> `role` and `elo` are admin-only fields. Admins cannot change their own `role`.

**200 OK** - returns the updated user object.

**403 Forbidden** - updating another user without admin role, or admin attempting to change their own role, or non-admin attempting to change role/elo.
**404 Not Found**

---

### `DELETE /api/users/:id` (auth required)

Delete a user account.

- **Own ID** - users can delete their own account.
- **Other ID** - admins can delete any account.

**200 OK**

```json
{ "message": "User deleted successfully" }
```

**403 Forbidden** - attempting to delete another user's account without admin role.
**404 Not Found**

---

## Players `/api/player/*`

### `GET /api/player/search/:username` (auth required)

Search for players by username (partial match).

**200 OK**

```json
[
  {
    "id": 3,
    "name": "bram",
    "elo": 1024
  }
]
```

Returns an empty array when no matches are found.

---

### `GET /api/player/profile/:id` (auth required)

Fetch a public player profile by user ID.

If an admin makes the request, the full profile is returned. If a regular user makes the request, only the `id`, `name`, `elo`, and `createdAt` fields are returned.

**200 OK** (regular user)

```json
{
  "id": 3,
  "name": "bram",
  "elo": 1024,
  "createdAt": "2026-03-11T08:00:00.000Z"
}
```

**200 OK** (admin)

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

### `GET /api/player/leaderboard` (public)

Fetch the top 50 players based on their ELO ratings.

**200 OK**

` ` `json
[
  {
    "id": 3,
    "rank": 1,
    "name": "bram",
    "elo": 1024
  },
  {
    "id": 5,
    "rank": 2,
    "name": "alice",
    "elo": 980
  }
]
` ` `

Returns an empty array if no players are found.

---

## Games `/api/games/*`

### `GET /api/games` (public)

List all **planned** games with signup count and average elo.

> This endpoint only returns games with `planned` status.

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
    "signupCount": 4,
    "averageElo": 1025
  }
]
```

---

### `GET /api/games/:id` (auth required)

Get full game details including all participants, round matchups, and field assignments.

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
      "elo": 1050
    }
  ],
  "schedule": {
    "rounds": [
      {
        "round": 1,
        "matches": [
          {
            "field": 1,
            "playerA": { "userId": 3, "username": "bram" },
            "playerB": { "userId": 5, "username": "sara" }
          }
        ],
        "sittingOut": []
      }
    ],
    "playerRounds": [
      {
        "userId": 3,
        "username": "bram",
        "rounds": [
          {
            "round": 1,
            "opponent": { "userId": 5, "username": "sara" },
            "field": 1,
            "isSittingOut": false
          }
        ]
      }
    ]
  }
}
```

**404 Not Found**

---

### `GET /api/games/:id/schedule` (auth required)

Get only the schedule view for a game: rounds, opponents, and field assignments.

**200 OK**

```json
{
  "gameId": 1,
  "name": "Friday Session",
  "status": "started",
  "participantCount": 4,
  "rounds": [
    {
      "round": 1,
      "matches": [
        {
          "field": 1,
          "playerA": { "userId": 3, "username": "bram" },
          "playerB": { "userId": 5, "username": "sara" }
        },
        {
          "field": 2,
          "playerA": { "userId": 7, "username": "mike" },
          "playerB": { "userId": 9, "username": "nina" }
        }
      ],
      "sittingOut": []
    }
  ],
  "playerRounds": [
    {
      "userId": 3,
      "username": "bram",
      "rounds": [
        {
          "round": 1,
          "opponent": { "userId": 5, "username": "sara" },
          "field": 1,
          "isSittingOut": false
        }
      ]
    }
  ]
}
```

**404 Not Found**

---

### `POST /api/games/create` (admin required)

Create a new game.

**Body** (all fields optional)

```json
{
  "name": "Friday Session",
  "description": "Weekly court game",
  "plannedAt": "2026-03-14T14:00:00.000Z"
}
```

All fields are optional. `name` defaults to `"Unnamed Game"`.

**201 Created** - returns the created game object.

```json
{
  "id": 1,
  "name": "Friday Session",
  "description": "Weekly court game",
  "plannedAt": "2026-03-14T14:00:00.000Z",
  "startedAt": null,
  "endedAt": null,
  "status": "planned",
  "createdBy": 1
}
```

---

### `POST /api/games/:id/signup` (auth required)

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

**404 Not Found** - game does not exist.
**409 Conflict** - user is already signed up.

---

### `POST /api/games/:id/signup/:userId` (admin required)

Sign up any user for a game.

When an admin signs up a user, the user is marked as `added_by_admin` and **cannot leave the game**.

**200 OK**

```json
{
  "message": "Signed up",
  "signup": {
    "id": 5,
    "gameId": 1,
    "userId": 3,
    "addedByAdmin": true
  }
}
```

**404 Not Found** - game does not exist.
**409 Conflict** - user is already signed up or has been removed from this game.
**403 Forbidden** - user has been previously removed from this game.

---

### `POST /api/games/:id/leave` (auth required)

Remove the authenticated user from a game's participant list.

**200 OK**

```json
{
  "message": "Left game"
}
```

**404 Not Found** - game does not exist.
**403 Forbidden** - user was added by an admin and cannot leave.
**409 Conflict** - user is not signed up.

> **Note**: Users added by an admin cannot leave the game. Admins must remove them using the remove endpoint.

---

Sign up any user for a game.

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

**404 Not Found** - game does not exist.
**409 Conflict** - user is already signed up.

---

### `POST /api/games/:id/leave` (auth required)

Remove the authenticated user from a game's participant list.

**200 OK**

```json
{
  "message": "Left game"
}
```

**404 Not Found** - game does not exist.
**409 Conflict** - user is not signed up.

---

### `POST /api/games/:id/leave/:userId` (admin required)

Remove a specific user from a game's participant list.

**Body** (optional)

```json
{
  "reason": "Player didn't show up"
}
```

**200 OK**

```json
{
  "message": "User removed from game"
}
```

**404 Not Found** - game does not exist.
**409 Conflict** - user is not signed up.

> **Note**: When an admin removes a user, the user is recorded in `removed_game_participants` and cannot rejoin this game.

---

### `GET /api/games/:id/current-round` (auth required)

Get the current round of a game when it has started.

Returns the round number that is currently being played, or `null` if the game hasn't started yet.

**200 OK**

```json
{
  "gameId": 1,
  "currentRound": 2
}
```

**404 Not Found** - game does not exist.

---

### `PUT /api/games/:id/current-round` (admin required)

Set the current round for a game (to track progress during play).

**Body**

```json
{
  "roundNumber": 3
}
```

| Field        | Type    | Required | Description                   |
| ------------ | ------- | -------- | ----------------------------- |
| `roundNumber` | integer | ✅       | Round number to set (≥ 1)     |

**200 OK**

```json
{
  "gameId": 1,
  "currentRound": 3
}
```

**400 Bad Request** - `roundNumber` missing or invalid.
**404 Not Found** - game does not exist.
**422 Unprocessable** - `roundNumber` is less than 1.

---

### `POST /api/games/:id/match-request` (auth required)

Send a match request to another player for a specific game.

This allows players to invite or request matches with other players.

**Body**

```json
{
  "requestedForUserId": 5,
  "message": "Want to play a match?"
}
```

| Field                 | Type    | Required | Description                        |
| --------------------- | ------- | -------- | ---------------------------------- |
| `requestedForUserId`   | integer | ✅       | User ID of the player being invited |
| `message`              | string  | ❌       | Optional message with the request  |

**201 Created**

```json
{
  "id": 1,
  "gameId": 1,
  "requestedByUserId": 3,
  "requestedForUserId": 5,
  "status": "pending",
  "message": "Want to play a match?",
  "createdAt": "2026-03-14T14:00:00.000Z"
}
```

**404 Not Found** - game or user does not exist.
**409 Conflict** - a pending request already exists between these users for this game.

---

### `GET /api/games/match-requests/incoming` (auth required)

Get all incoming match requests for the authenticated user.

**Query Parameters** (optional)

| Parameter | Type   | Description                                                      |
| --------- | ------ | ---------------------------------------------------------------- |
| `status`  | string | Filter by status: `pending`, `accepted`, `rejected`, `cancelled` |

**200 OK**

```json
[
  {
    "id": 1,
    "gameId": 1,
    "gameName": "Friday Session",
    "requestedByUserId": 3,
    "requestedByUsername": "bram",
    "status": "pending",
    "message": "Want to play a match?",
    "createdAt": "2026-03-14T14:00:00.000Z",
    "updatedAt": "2026-03-14T14:00:00.000Z"
  }
]
```

Returns an empty array if no requests are found.

---

### `PUT /api/games/match-requests/:requestId/respond` (auth required)

Accept or reject a match request.

When accepting a request, the requestee is automatically signed up for the game.

**Body**

```json
{
  "status": "accepted"
}
```

| Field    | Type   | Required | Description              |
| -------- | ------ | -------- | ------------------------ |
| `status` | string | ✅       | Either `accepted` or `rejected` |

**200 OK**

```json
{
  "id": 1,
  "gameId": 1,
  "requestedByUserId": 3,
  "requestedForUserId": 5,
  "status": "accepted",
  "updatedAt": "2026-03-14T14:05:00.000Z"
}
```

**400 Bad Request** - `status` missing.
**404 Not Found** - request does not exist.
**422 Unprocessable** - invalid status value.

---

## Match and Participant Management

### Admin-Added Users

When an admin signs up a user for a game using `POST /api/games/:id/signup/:userId`, the user:
- Is marked with `added_by_admin = true`
- **Cannot leave the game** - attempting to leave will return **403 Forbidden**
- Can only be removed by an admin using `POST /api/games/:id/leave/:userId`

This is useful for mandatory participation or tournament-style events where admins have direct control.

### Removed Users

When an admin removes a user from a game using `POST /api/games/:id/leave/:userId`, the removal is recorded permanently:
- The user is removed from the game's participant list
- The user is recorded in the `removed_game_participants` table
- The user **cannot rejoin this specific game** - attempting to sign up will return **403 Forbidden** with message "You have been removed from this game and cannot rejoin"
- Admins can sign them up again by force using the admin signup endpoint

This prevents accidental rejoinings after removal.

### Current Round Tracking

Games track their current round of play:
- When a game is started, `current_round` is set to **1**
- Admins can update the current round using `PUT /api/games/:id/current-round` to track progress
- Users can view the current round using `GET /api/games/:id/current-round` to see which round is being played

This is useful for real-time score tracking and tournament management.

### Match Requests System

The match request system allows players to invite or request matches with other players:

1. **Send Request**: Use `POST /api/games/:id/match-request` to invite another player to join a game
2. **View Requests**: Use `GET /api/games/match-requests/incoming` to see all requests sent to you
3. **Respond**: Use `PUT /api/games/match-requests/:requestId/respond` to accept or reject
   - **Accept**: Automatically signs you up for the game
   - **Reject**: Records the rejection but doesn't sign you up

Request statuses:
- `pending` - awaiting response
- `accepted` - request accepted and user signed up
- `rejected` - request declined
- `cancelled` - request cancelled by sender

---

### `PUT /api/games/:id/start` (admin required)

Move the game from `planned` -> `started`. Sets `startedAt` to the current timestamp.

**200 OK** - returns the updated game row.

**404 Not Found**
**409 Conflict** - game is not in `planned` state.

---

### `PUT /api/games/:id/end` (admin required)

Move the game from `started` -> `ended`. Sets `endedAt` to the current timestamp.

**200 OK** - returns the updated game row.

**404 Not Found**
**409 Conflict** - game is not in `started` state.

---

### `PUT /api/games/:id/process` (admin required)

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

| Field      | Type    | Required | Description                         |
| ---------- | ------- | -------- | ----------------------------------- |
| `winnerId` | integer | ✅       | `userID` of the winning participant |
| `scores`   | array   | ✅       | Final score for every participant   |

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
    {
      "userId": 3,
      "isWinner": true,
      "oldElo": 1000,
      "newElo": 1045,
      "change": 45
    },
    {
      "userId": 5,
      "isWinner": false,
      "oldElo": 1000,
      "newElo": 984,
      "change": -16
    },
    {
      "userId": 7,
      "isWinner": false,
      "oldElo": 1000,
      "newElo": 971,
      "change": -29
    }
  ]
}
```

**400 Bad Request** - `winnerId` or `scores` missing.
**404 Not Found**
**409 Conflict** - game not in `ended` state.
**422 Unprocessable** - fewer than 2 participants, or `winnerId` is not a participant.

---

## History `/api/history/*`

All history endpoints require authentication.

### `GET /api/history/games` (auth required)

List all games the authenticated user has participated in.

- **Participated Games** - accessible to the user.
- **Other Games** - admin required role.

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

### `GET /api/history/games/:id` (auth required)

Get the full details of a specific game from the authenticated user's history.

- **Participated Games** - accessible to the user.
- **Other Games** - admin required role.

**200 OK**

```json
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
  "participants": [
    {
      "id": 5,
      "userId": 3,
      "username": "bram",
      "score": 21
    },
    {
      "id": 6,
      "userId": 5,
      "username": "alice",
      "score": 15
    }
  ]
}
```

**403 Forbidden** - user was not a participant.
**404 Not Found**

---

### `GET /api/history/elo` (auth required)

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

### `GET /api/history/elo/:userId` (auth required)

Get the ELO history for any user.

- Any authenticated user can request this endpoint.

**200 OK** - same shape as `GET /api/history/elo`.

**404 Not Found** - user does not exist.

---

## Game lifecycle

Games follow a strict state machine enforced by the API:

```txt
planned --(start)--> started --(end)--> ended --(process)--> processed
```

| Transition         | Endpoint                     | Role                   |
| ------------------ | ---------------------------- | ---------------------- |
| Create             | `POST /api/games/create`     | Admin                  |
| planned -> started | `PUT /api/games/:id/start`   | Admin                  |
| started -> ended   | `PUT /api/games/:id/end`     | Admin                  |
| ended -> processed | `PUT /api/games/:id/process` | Admin                  |
| Sign up            | `POST /api/games/:id/signup` | Any authenticated user |

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

| Role    | Description                                                       |
| ------- | ----------------------------------------------------------------- |
| `user`  | Default role assigned on registration                             |
| `admin` | Full access - create/manage games, process results, view all data |

---

## Auth legend

| Symbol                   | Requirement                                                |
| ------------------------ | ---------------------------------------------------------- |
| (requires user auth)     | Requires valid `accessToken` cookie                        |
| (requires refresh token) | Requires valid `refreshToken` cookie                       |
| (admin required)         | Requires valid `accessToken` cookie **and** `role = admin` |
