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

## Organizations & multi-tenancy

Every account and every piece of gameplay data belongs to an **Organization (org)**. An
org is a private tenant with its own users, games, leaderboard, and history — data never
crosses org boundaries.

There are three roles across two worlds:

- **`user`** — plays inside exactly one org.
- **`manager`** — runs one org. Has the powers a single-app `admin` used to have, but
  scoped to their own org, plus they own the org's branding (name + accent color). An org
  can have multiple managers.
- **`admin`** — a **platform** operator that belongs to **no** org. Manages orgs from
  above (branding + manager accounts) but cannot reach into an org's gameplay data.

Because the org is carried in the session, **org members never pass an org id on
gameplay requests** — the server scopes everything to the caller's org automatically.

| Login door | Used by | Endpoint |
| ---------- | ------- | -------- |
| Org login  | `user`, `manager` | `POST /api/auth/login` (requires `orgId`) |
| Admin login | `admin` | `POST /api/auth/admin/login` (no org) |

### Org status & read-only mode

An org is always in one of three states:

| Status            | Members can log in? | Behaviour |
| ----------------- | ------------------- | --------- |
| `pending_payment` | ❌ | Just created, never paid. Activate via the public payment simulation. |
| `active`          | ✅ | Normal — full read & write. |
| `inactive`        | ✅ (read-only) | Deactivated. Members can log in and **read** everything, but **all writes are blocked** until the org is reactivated (manager payment or admin override). |

```txt
created (pending_payment) --(simulate payment)--> active
                            active --(deactivate: admin)--> inactive
                            inactive --(manager pays | admin override)--> active
```

- **Deactivation** is **admin-only** (for now): [`POST /api/admin/orgs/:id/deactivate`](#post-apiadminorgsiddeactivate-admin-required).
- **Reactivation** happens two ways:
  - a **manager** of the org pays another (simulated) charge: [`POST /api/orgs/me/reactivate`](#post-apiorgsmereactivate-manager-required), or
  - an **admin** flips it back **without payment**: [`POST /api/admin/orgs/:id/reactivate`](#post-apiadminorgsidreactivate-admin-required).

**Read-only enforcement:** while an org is `inactive`, **every** write request
(`POST`/`PUT`/`DELETE`) from **any** of its members returns **403 Forbidden** with
`{ "message": "Organization is inactive (read-only). A manager must reactivate it." }`.

- **Regular users** are blocked too: no game signups, leaving games, match requests,
  responding to requests, or profile edits.
- **Managers** are equally blocked: their normal powers (creating/managing games, managing
  users, editing org branding, etc.) are **all suspended**. The **only** write a manager
  can perform is the reactivation payment
  ([`POST /api/orgs/me/reactivate`](#post-apiorgsmereactivate-manager-required)).

Once the org is `active` again (via manager payment or admin override), everything works
as normal for everyone.

Always exempt from the read-only block:
- Authentication (`/api/auth/*`) - members can still log in.
- The manager reactivation payment (`POST /api/orgs/me/reactivate`).
- All platform-admin endpoints (`/api/admin/*`), including the admin's no-payment
  reactivation.

`GET` requests are never affected.

See [Organizations](#organizations-apiorgs), [Admin](#admin-apiadmin), and the
[Role reference](#role-reference).

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

Create a new user account inside an existing org.

> Also available as `POST /api/users` (see Users section).

**Body**

```json
{
  "orgId": 7,
  "email": "user@example.com",
  "password": "secret123",
  "username": "optional_username"
}
```

`orgId`, `email`, and `password` are required. The user joins org `orgId` with role
`user`. `username` defaults to the part of the email before `@`. Email/username
uniqueness is enforced **per org** (the same email may exist in different orgs).

**201 Created**

```json
{
  "id": 1,
  "orgId": 7,
  "email": "user@example.com",
  "name": "user",
  "role": "user"
}
```

**404 Not Found** - org does not exist or is not `active`.
**409 Conflict** - email or username already taken in this org.

---

### `POST /api/auth/login` (public)

Authenticate a `user` or `manager` **within an org** and receive session cookies.

The org must be supplied. Use [`GET /api/orgs`](#get-apiorgs-public) or
[`GET /api/orgs/search`](#get-apiorgssearch-public) to let the user pick their org first.

**Body**

```json
{
  "orgId": 7,
  "email": "user@example.com",
  "password": "secret123"
}
```

`orgId`, `email`, and `password` are required.

**200 OK** - sets `accessToken` and `refreshToken` cookies. The session carries the
caller's `orgId` and `role`, so later requests are scoped automatically. The org's
branding is returned so the frontend can theme immediately.

```json
{
  "user": {
    "id": 1,
    "orgId": 7,
    "email": "user@example.com",
    "name": "user",
    "role": "user"
  },
  "org": {
    "id": 7,
    "name": "Downtown Padel Club",
    "accentColor": "#1E88E5"
  }
}
```

**401 Unauthorized** - invalid credentials for this org.
**403 Forbidden** - an `admin` account attempted the org login (admins must use the admin login).
**404 Not Found** - org does not exist or is `pending_payment`.

> Members of an `inactive` org **can** log in — they get a read-only session (see
> [Org status & read-only mode](#org-status--read-only-mode)).

---

### `POST /api/auth/admin/login` (public)

Authenticate a **platform admin**. Admins belong to no org, so there is **no** `orgId`
field. Org `user`/`manager` accounts are rejected here.

**Body**

```json
{
  "email": "platform-admin@kingofcourt.com",
  "password": "rootpassword"
}
```

**200 OK** - sets `accessToken` and `refreshToken` cookies.

```json
{
  "user": {
    "id": 99,
    "email": "platform-admin@kingofcourt.com",
    "name": "platform-admin",
    "role": "admin"
  }
}
```

**401 Unauthorized** - invalid credentials.
**403 Forbidden** - a non-admin (org) account attempted the admin login.

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

> For an org member this includes their `orgId`. A platform `admin` has `orgId: null` and
> no `elo`.

**200 OK**

```json
{
  "id": 1,
  "orgId": 7,
  "email": "user@example.com",
  "name": "user",
  "role": "user",
  "elo": 1000,
  "createdAt": "2026-03-11T08:00:00.000Z"
}
```

---

## Organizations `/api/orgs/*`

Endpoints for creating, discovering, and reading organizations.

### `POST /api/orgs` (public)

Create a new org **and its first manager account** in one call. The org starts in
`pending_payment` and is not usable until payment is simulated (see next endpoint).

**Body**

```json
{
  "name": "Downtown Padel Club",
  "accentColor": "#1E88E5",
  "managerEmail": "owner@downtownpadel.com",
  "managerPassword": "supersecret"
}
```

| Field             | Type   | Required | Description                              |
| ----------------- | ------ | -------- | ---------------------------------------- |
| `name`            | string | ✅       | Display name of the org                  |
| `accentColor`     | string | ✅       | Hex color for branding, e.g. `#1E88E5`   |
| `managerEmail`    | string | ✅       | Email for the first `manager` account    |
| `managerPassword` | string | ✅       | Password for the first `manager` account |

**201 Created** - returns the org (in `pending_payment`) and a **simulated** payment
session. No real payment provider is contacted.

```json
{
  "org": {
    "id": 7,
    "name": "Downtown Padel Club",
    "accentColor": "#1E88E5",
    "status": "pending_payment"
  },
  "payment": {
    "sessionId": "sim_pay_abc123",
    "amount": 4900,
    "currency": "eur",
    "status": "requires_payment"
  }
}
```

**400 Bad Request** - missing/invalid fields (e.g. `accentColor` not a hex color).
**409 Conflict** - org name or manager email already in use.

---

### `POST /api/orgs/:id/payment/simulate` (public)

Simulate paying for an org. **This does not charge anything** - it marks the payment as
paid and flips the org to `active`, after which its managers can log in.

**Body**

```json
{ "sessionId": "sim_pay_abc123" }
```

**200 OK**

```json
{
  "org": { "id": 7, "name": "Downtown Padel Club", "status": "active" },
  "payment": { "sessionId": "sim_pay_abc123", "status": "paid" }
}
```

**404 Not Found** - org or session does not exist.
**409 Conflict** - org is already `active` / already paid.

---

### `GET /api/orgs` (public)

List all **loginable** orgs (`active` and `inactive`) - used to power the org picker on
the login screen. Each entry carries its `status` so the frontend can badge an `inactive`
org as read-only.

> `pending_payment` orgs are excluded (nobody can log into them yet). To see orgs of every
> status, use the admin list [`GET /api/admin/orgs`](#get-apiadminorgs-admin-required).

**200 OK**

```json
[
  { "id": 7, "name": "Downtown Padel Club", "accentColor": "#1E88E5", "status": "active" },
  { "id": 8, "name": "Riverside Tennis",    "accentColor": "#43A047", "status": "inactive" }
]
```

---

### `GET /api/orgs/search` (public)

Search **loginable** orgs (`active` and `inactive`) by name (partial match).

**Query Parameters**

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `q`       | string | ✅       | Partial org name to match |

**200 OK** - same shape as `GET /api/orgs`. Returns an empty array when no matches.

---

### `GET /api/orgs/me` (auth required)

Return the org the caller is currently logged into. The org is read from the session, so
there is no id in the URL and no way to read another org.

**Response depends on role:**

**200 OK** (manager) - full org detail.

```json
{
  "id": 7,
  "name": "Downtown Padel Club",
  "accentColor": "#1E88E5",
  "status": "active",
  "createdAt": "2026-06-18T10:00:00.000Z",
  "memberCount": 42,
  "gameCount": 13,
  "managers": [
    { "id": 12, "email": "owner@downtownpadel.com", "name": "owner" }
  ]
}
```

**200 OK** (user) - branding basics only.

```json
{
  "id": 7,
  "name": "Downtown Padel Club",
  "accentColor": "#1E88E5"
}
```

**403 Forbidden** - a platform `admin` (who has no org) called this.

---

### `PUT /api/orgs/me` (manager required)

Update the **caller's own** org branding. The target org comes from the session, never the
URL, so a manager can only ever edit their own org.

**Body** (all fields optional)

```json
{
  "name": "Downtown Padel & Social",
  "accentColor": "#0D47A1"
}
```

**200 OK** - returns the updated org.

```json
{
  "id": 7,
  "name": "Downtown Padel & Social",
  "accentColor": "#0D47A1",
  "status": "active"
}
```

**400 Bad Request** - invalid `accentColor`.
**403 Forbidden** - caller is not a `manager`.
**409 Conflict** - new name already in use by another org.

> Editing branding is a write, so it is blocked while the org is `inactive` - reactivate
> first via `POST /api/orgs/me/reactivate`.

---

### `POST /api/orgs/me/reactivate` (manager required)

Reactivate the caller's own `inactive` org by making another **simulated** payment. This
is the manager's way back to `active` after an admin deactivated the org. No real payment
is taken.

This endpoint is exempt from the read-only block (it's how a manager lifts that block).

No body required.

**200 OK**

```json
{
  "org": { "id": 7, "name": "Downtown Padel Club", "status": "active" },
  "payment": { "sessionId": "sim_pay_def456", "status": "paid" }
}
```

**403 Forbidden** - caller is not a `manager`.
**409 Conflict** - org is not `inactive` (e.g. already `active`).

---

## Admin `/api/admin/*`

Platform-admin-only endpoints for managing orgs **from above**. All require an
authenticated `admin` (logged in via [`POST /api/auth/admin/login`](#post-apiauthadminlogin-public)).

Admins operate at the org level only: org branding and **manager accounts**. They cannot
create or edit normal users, games, elo, or any gameplay data - that is managers-only.

### `GET /api/admin/orgs` (admin required)

List **every** org, of any status (`pending_payment`, `active`, `inactive`).

**200 OK**

```json
[
  {
    "id": 7,
    "name": "Downtown Padel Club",
    "accentColor": "#1E88E5",
    "status": "active",
    "createdAt": "2026-06-18T10:00:00.000Z",
    "memberCount": 42
  },
  {
    "id": 9,
    "name": "Pending Club",
    "accentColor": "#FB8C00",
    "status": "pending_payment",
    "createdAt": "2026-06-18T11:00:00.000Z",
    "memberCount": 1
  }
]
```

**403 Forbidden** - caller is not an `admin`.

---

### `GET /api/admin/orgs/:id` (admin required)

View a single org's detail.

**200 OK**

```json
{
  "id": 7,
  "name": "Downtown Padel Club",
  "accentColor": "#1E88E5",
  "status": "active",
  "createdAt": "2026-06-18T10:00:00.000Z",
  "memberCount": 42,
  "gameCount": 13,
  "managers": [
    { "id": 12, "email": "owner@downtownpadel.com", "name": "owner" }
  ]
}
```

**404 Not Found**

---

### `PUT /api/admin/orgs/:id` (admin required)

Change any org's name and/or accent color.

**Body** (all fields optional)

```json
{
  "name": "Renamed Club",
  "accentColor": "#6A1B9A"
}
```

**200 OK** - returns the updated org.

**400 Bad Request** - invalid `accentColor`.
**404 Not Found**
**409 Conflict** - new name already in use.

---

### `POST /api/admin/orgs/:id/deactivate` (admin required)

Deactivate an `active` org, putting it into read-only `inactive` mode. Members can still
log in and read, but cannot write until it is reactivated - either by a manager paying via
[`POST /api/orgs/me/reactivate`](#post-apiorgsmereactivate-manager-required) or by an admin
via [`POST /api/admin/orgs/:id/reactivate`](#post-apiadminorgsidreactivate-admin-required).

> Deactivation is **admin-only for now**. Reactivation is done by a **manager** (via
> simulated payment) or by an **admin** (no payment).

No body required.

**200 OK**

```json
{
  "id": 7,
  "name": "Downtown Padel Club",
  "accentColor": "#1E88E5",
  "status": "inactive"
}
```

**404 Not Found** - org does not exist.
**409 Conflict** - org is not `active` (e.g. already `inactive` or `pending_payment`).

---

### `POST /api/admin/orgs/:id/reactivate` (admin required)

Reactivate an `inactive` org **without payment**. This is the admin's override - it does
not create or require a payment (unlike the manager's
[`POST /api/orgs/me/reactivate`](#post-apiorgsmereactivate-manager-required), which goes
through a simulated payment).

No body required.

**200 OK**

```json
{
  "id": 7,
  "name": "Downtown Padel Club",
  "accentColor": "#1E88E5",
  "status": "active"
}
```

**404 Not Found** - org does not exist.
**409 Conflict** - org is not `inactive` (e.g. already `active`).

---

### `DELETE /api/admin/orgs/:id` (admin required)

Remove an org entirely. (This is a permanent delete, distinct from deactivation above.)

**200 OK**

```json
{ "message": "Organization deleted successfully" }
```

**404 Not Found**

---

### `GET /api/admin/orgs/:id/managers` (admin required)

List the manager accounts of an org.

**200 OK**

```json
[
  { "id": 12, "email": "owner@downtownpadel.com", "name": "owner" },
  { "id": 18, "email": "coach@downtownpadel.com", "name": "coach" }
]
```

**404 Not Found** - org does not exist.

---

### `POST /api/admin/orgs/:id/managers` (admin required)

Create a new manager account in an org.

**Body**

```json
{
  "email": "newmanager@downtownpadel.com",
  "password": "secret123",
  "username": "newmanager"
}
```

`email` and `password` are required. `username` defaults to the part of the email before
`@`.

**201 Created**

```json
{
  "id": 21,
  "orgId": 7,
  "email": "newmanager@downtownpadel.com",
  "name": "newmanager",
  "role": "manager"
}
```

**404 Not Found** - org does not exist.
**409 Conflict** - email already taken in this org.

---

### `PUT /api/admin/orgs/:id/managers/:managerId` (admin required)

Change a manager account's email and/or password.

**Body** (all fields optional)

```json
{
  "email": "updated@downtownpadel.com",
  "password": "newpassword"
}
```

**200 OK** - returns the updated manager (without the password).

```json
{
  "id": 12,
  "orgId": 7,
  "email": "updated@downtownpadel.com",
  "name": "owner",
  "role": "manager"
}
```

**404 Not Found** - org or manager does not exist (or the user is not a manager of this org).
**409 Conflict** - email already taken in this org.

---

### `DELETE /api/admin/orgs/:id/managers/:managerId` (admin required)

Remove a manager account from an org.

**200 OK**

```json
{ "message": "Manager deleted successfully" }
```

**404 Not Found** - org or manager does not exist.

> Admins manage **manager** and **admin** accounts only (see admin-account endpoints
> below). They can never create, edit, or delete normal `user` accounts - that is
> managers-only.

---

### `GET /api/admin/admins` (admin required)

List all platform admin accounts. Admins belong to no org, so there is no `orgId`.

**200 OK**

```json
[
  { "id": 99, "email": "platform-admin@kingofcourt.com", "name": "platform-admin", "role": "admin" },
  { "id": 100, "email": "second-admin@kingofcourt.com", "name": "second-admin", "role": "admin" }
]
```

**403 Forbidden** - caller is not an `admin`.

---

### `POST /api/admin/admins` (admin required)

Create another platform admin account.

**Body**

```json
{
  "email": "second-admin@kingofcourt.com",
  "password": "rootpassword2",
  "username": "second-admin"
}
```

`email` and `password` are required. `username` defaults to the part of the email before
`@`. The new account has role `admin` and no org.

**201 Created**

```json
{
  "id": 100,
  "email": "second-admin@kingofcourt.com",
  "name": "second-admin",
  "role": "admin"
}
```

**409 Conflict** - an admin with this email already exists.

---

### `DELETE /api/admin/admins/:id` (admin required)

Delete another platform admin account.

**200 OK**

```json
{ "message": "Admin deleted successfully" }
```

**403 Forbidden** - an admin attempting to delete **their own** account. Admins cannot
delete themselves; another admin must do it.
**404 Not Found** - admin does not exist.

> Self-deletion guard: an `admin` can never delete their own account, ensuring the
> platform always retains at least one operator.

---

## Users `/api/users/*`

> All user endpoints are **org-scoped**: managers operate only on users within their own
> org, and listings only ever contain the caller's org. Platform admins do not use these
> endpoints (they manage manager accounts via [`/api/admin/*`](#admin-apiadmin)).

### `POST /api/users` (public)

Register a new user (alias for `POST /api/auth/register`). Requires `orgId`.

See [Auth -> Register](#post-apiauthregister-public).

---

### `GET /api/users` (manager required)

Fetch all users **in the caller's org**.

Requires an authenticated `manager`. The result only ever contains members of the
manager's own org.

**200 OK**

```json
[
  {
    "id": 1,
    "orgId": 7,
    "email": "manager@example.com",
    "name": "manager",
    "role": "manager",
    "elo": 1200,
    "phone_number": "+31 6 12345678",
    "createdAt": "2026-03-11T08:00:00.000Z"
  },
  {
    "id": 3,
    "orgId": 7,
    "email": "user@example.com",
    "name": "username",
    "role": "user",
    "elo": 1024,
    "phone_number": null,
    "createdAt": "2026-03-11T08:00:00.000Z"
  }
]
```

**403 Forbidden** - authenticated user is not a manager.

---

### `GET /api/users/:id` (auth required)

Fetch a user by ID (within the caller's org).

Users may only fetch their own profile. Managers may fetch any profile in their own org.

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

**403 Forbidden** - requesting another user's profile without manager role, or targeting a user outside the caller's org.
**404 Not Found**

---

### `PUT /api/users/:id` (auth required)

Update a user's profile (within the caller's org).

- **Own ID** - users can update their own email and username.
- **Other ID** - managers can update any user's email, username, role, and elo **in their org**.
- **Role change** - managers only; can set `user` or `manager`. Managers cannot change their own role. The `admin` role can never be granted here (admins are created via [`POST /api/admin/admins`](#post-apiadminadmins-admin-required)).
- **Elo change** - managers only; can change any user's elo in their org.

**Body** (all fields optional)

```json
{
  "email": "new@example.com",
  "username": "newname",
  "role": "manager",
  "elo": 1200
}
```

> `role` and `elo` are manager-only fields. Managers cannot change their own `role`.

**200 OK** - returns the updated user object.

**403 Forbidden** - updating another user without manager role, manager attempting to change their own role, non-manager attempting to change role/elo, attempting to set `role: "admin"`, or targeting a user outside the caller's org.
**404 Not Found**

---

### `DELETE /api/users/:id` (auth required)

Delete a user account (within the caller's org).

- **Own ID** - a `user` can delete their own account. **Managers cannot delete their own account** (a co-manager or platform admin must do it).
- **Other ID** - managers can delete any account in their org.

**200 OK**

```json
{ "message": "User deleted successfully" }
```

**403 Forbidden** - attempting to delete another user's account without manager role, targeting a user outside the caller's org, or a `manager` attempting to delete their own account.
**404 Not Found**

> Self-deletion guard: `manager` and `admin` accounts can never delete themselves. This
> prevents an org or the platform from being left without an operator. Managers are
> removed by a co-manager or by a platform admin via
> [`DELETE /api/admin/orgs/:id/managers/:managerId`](#delete-apiadminorgsidmanagersmanagerid-admin-required);
> admins are removed by another admin via
> [`DELETE /api/admin/admins/:id`](#delete-apiadminadminsid-admin-required).

---

## Players `/api/player/*`

> All player data is **org-scoped** - searches, profiles, and the leaderboard only ever
> contain players from the caller's org.

### `GET /api/player/search/:username` (auth required)

Search for players by username (partial match) within the caller's org.

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

If a `manager` makes the request, the full profile is returned. If a regular user makes the request, only the `id`, `name`, `elo`, and `createdAt` fields are returned. The target must be in the caller's org.

**200 OK** (regular user)

```json
{
  "id": 3,
  "name": "bram",
  "elo": 1024,
  "createdAt": "2026-03-11T08:00:00.000Z"
}
```

**200 OK** (manager)

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

Fetch the top 50 players **of an org** based on their ELO ratings.

Because this is public (no session), the org must be supplied as a query parameter. When
called by a logged-in member, the org defaults to the caller's own org.

**Query Parameters**

| Parameter | Type    | Required | Description                                              |
| --------- | ------- | -------- | -------------------------------------------------------- |
| `orgId`   | integer | ⚠️       | Required when unauthenticated; ignored when logged in (caller's org is used) |

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

> **Org scoping & roles.** All games belong to an org. Authenticated endpoints are scoped
> to the caller's org automatically. Every game-management action below is performed by a
> **`manager`** of the org (these were `admin`-only in the single-tenant app). Platform
> `admin`s have **no** access to games. Where these docs mention "manager" as the actor,
> read it as "the org's privileged operator."

### `GET /api/games` (public)

List an org's **planned** games with signup count and average elo.

> This endpoint only returns games with `planned` status. When unauthenticated, pass
> `?orgId=` to choose the org; when logged in, the caller's org is used.

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

### `POST /api/games/create` (manager required)

Create a new game. The game is created in the manager's own org (no `orgId` in the body).

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
  "orgId": 7,
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

### `POST /api/games/:id/signup/:userId` (manager required)

Sign up any user in the org for a game.

When a manager signs up a user, the user is marked as `added_by_manager` and **cannot leave the game**.

**200 OK**

```json
{
  "message": "Signed up",
  "signup": {
    "id": 5,
    "gameId": 1,
    "userId": 3,
    "addedByManager": true
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
**403 Forbidden** - user was added by a manager and cannot leave.
**409 Conflict** - user is not signed up.

> **Note**: Users added by a manager cannot leave the game. A manager must remove them using the remove endpoint.

---

### `POST /api/games/:id/leave/:userId` (manager required)

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

> **Note**: When a manager removes a user, the user is recorded in `removed_game_participants` and cannot rejoin this game.

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

### `PUT /api/games/:id/current-round` (manager required)

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

### Manager-Added Users

When a manager signs up a user for a game using `POST /api/games/:id/signup/:userId`, the user:
- Is marked with `added_by_manager = true`
- **Cannot leave the game** - attempting to leave will return **403 Forbidden**
- Can only be removed by a manager using `POST /api/games/:id/leave/:userId`

This is useful for mandatory participation or tournament-style events where the org's managers have direct control.

### Removed Users

When a manager removes a user from a game using `POST /api/games/:id/leave/:userId`, the removal is recorded permanently:
- The user is removed from the game's participant list
- The user is recorded in the `removed_game_participants` table
- The user **cannot rejoin this specific game** - attempting to sign up will return **403 Forbidden** with message "You have been removed from this game and cannot rejoin"
- Managers can sign them up again by force using the manager signup endpoint

This prevents accidental rejoinings after removal.

### Current Round Tracking

Games track their current round of play:
- When a game is started, `current_round` is set to **1**
- Managers can update the current round using `PUT /api/games/:id/current-round` to track progress
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

### `PUT /api/games/:id/start` (manager required)

Move the game from `planned` -> `started`. Sets `startedAt` to the current timestamp.

**200 OK** - returns the updated game row.

**404 Not Found**
**409 Conflict** - game is not in `planned` state.

---

### `PUT /api/games/:id/end` (manager required)

Move the game from `started` -> `ended`. Sets `endedAt` to the current timestamp.

**200 OK** - returns the updated game row.

**404 Not Found**
**409 Conflict** - game is not in `started` state.

---

### `PUT /api/games/:id/process` (manager required)

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

All history endpoints require authentication and are **org-scoped** - they only ever
return data from the caller's own org.

### `GET /api/history/games` (auth required)

List all games the authenticated user has participated in.

- **Participated Games** - accessible to the user.
- **Other Games** - manager required role (within the manager's org).

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
- **Other Games** - manager required role (within the manager's org).

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

Get the ELO history for any user **in the caller's org**.

- Any authenticated member of the org can request this for another member of the same org.

**200 OK** - same shape as `GET /api/history/elo`.

**403 Forbidden** - target user is in a different org.
**404 Not Found** - user does not exist.

---

## Game lifecycle

Games follow a strict state machine enforced by the API:

```txt
planned --(start)--> started --(end)--> ended --(process)--> processed
```

All transitions are performed by a **manager** of the game's org.

| Transition         | Endpoint                     | Role                        |
| ------------------ | ---------------------------- | --------------------------- |
| Create             | `POST /api/games/create`     | Manager                     |
| planned -> started | `PUT /api/games/:id/start`   | Manager                     |
| started -> ended   | `PUT /api/games/:id/end`     | Manager                     |
| ended -> processed | `PUT /api/games/:id/process` | Manager                     |
| Sign up            | `POST /api/games/:id/signup` | Any authenticated org member |

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

| Role      | Belongs to an org? | Description                                                                                              |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `user`    | Yes (exactly one)  | Default role assigned on registration. Plays inside their org.                                           |
| `manager` | Yes (one)          | Runs their own org: create/manage games, process results, manage the org's users, and edit org branding. An org can have several. |
| `admin`   | No (platform)      | Platform operator. Manages every org's branding and manager/admin accounts, but **not** gameplay data inside any org. |

Each layer reaches exactly one level down: an admin manages orgs and their managers; a
manager manages everything inside their org; a user plays inside the org.

> **Self-deletion guard:** `manager` and `admin` accounts cannot delete their own account.

---

## Auth legend

| Symbol                   | Requirement                                                  |
| ------------------------ | ------------------------------------------------------------ |
| (public)                 | No authentication required                                   |
| (auth required)          | Requires valid `accessToken` cookie                          |
| (requires refresh token) | Requires valid `refreshToken` cookie                         |
| (manager required)       | Requires valid `accessToken` cookie **and** `role = manager` (scoped to the manager's own org) |
| (admin required)         | Requires valid `accessToken` cookie **and** `role = admin` (platform-level)                    |
