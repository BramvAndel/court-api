# Organizations — Design Reference

> This is the **design / explanation document** for the organizations system — the "why"
> and the human-readable model. The concrete endpoint contract lives in `docs/API.md`;
> this file is kept **in sync** with it. The feature is documented but **not yet
> implemented in code** — that's the next step.

---

## 1. The big idea in one paragraph

Right now the app is a single shared world: one pool of users, one pool of games, one
leaderboard, and `admin` accounts that control all of it. We're turning it into a
**multi-tenant** app. The new top-level concept is the **Organization (org)**. Every
user, every game, every leaderboard, every match — all of it now lives *inside* one org
and never leaks across org boundaries. Think of each org as its own private copy of the
whole current app.

On top of that we get three layers of control instead of two:

- **Users** — play inside exactly one org (same as today's `user`, just org-scoped).
- **Managers** — run one org. A manager has the same powers the current `admin` has,
  but only *within their own org*, plus they can rebrand the org (name + accent color).
- **Admins** — run the *platform*. They are not part of any org. They can manage orgs
  "from above" (rename, recolor, reset the manager's login, create/remove orgs) but they
  **cannot** reach down into the day-to-day stuff inside an org (games, signups, player
  elo, etc.). That stays managers-only.

---

## 2. The new vocabulary

| Term | What it is |
| --- | --- |
| **Organization** | A tenant. Owns its own users, games, leaderboard, history. Has a name and an accent color (for white-label branding). |
| **Accent color** | A hex color string (e.g. `#1E88E5`) the frontend uses to theme that org. |
| **Manager** | A role. Belongs to one org. Full control of that org. |
| **Admin** | A role. Belongs to **no** org. Platform operator. |
| **Payment (simulated)** | A fake checkout step required to activate a new org. No real money moves — we just pretend. |

### Org lifecycle (state machine)

```txt
created (pending_payment) --(simulate payment)--> active
                            active   --(deactivate: admin)-->          inactive (read-only)
                            inactive --(manager pays | admin override)--> active
                            (admin can also permanently delete an org)
```

- **`pending_payment`** — exists but **nobody can log into it yet**; its manager account
  is dormant until payment is simulated and the org flips to `active`.
- **`active`** — normal, full read & write.
- **`inactive`** — an admin deactivated it. Members **can still log in but only read**;
  every write is blocked until it's reactivated. Deactivation is **admin-only for now**.
  Reactivation happens either way: a **manager** pays another (simulated) charge, **or**
  an **admin** flips it back **without payment**.

---

## 3. How creating an org works (with simulated payment)

Anyone (public, no login) can start an org. They provide four things:

- Org **name**
- Org **accent color**
- The **manager account email**
- The **manager account password**

That single request creates **both** the org *and* its first manager account in one go,
but in a not-yet-paid state.

**Step 1 — create the org (public)**

```http
POST /api/orgs
```
```json
{
  "name": "Downtown Padel Club",
  "accentColor": "#1E88E5",
  "managerEmail": "owner@downtownpadel.com",
  "managerPassword": "supersecret"
}
```
Returns the new org in `pending_payment` plus a fake payment session id:

```json
{
  "org": { "id": 7, "name": "Downtown Padel Club", "accentColor": "#1E88E5", "status": "pending_payment" },
  "payment": { "sessionId": "sim_pay_abc123", "amount": 4900, "currency": "eur", "status": "requires_payment" }
}
```

**Step 2 — simulate the payment (public, uses the session id)**

```http
POST /api/orgs/:id/payment/simulate
```
```json
{ "sessionId": "sim_pay_abc123" }
```
We don't talk to any payment provider. We just mark it paid and flip the org to `active`:

```json
{
  "org": { "id": 7, "name": "Downtown Padel Club", "status": "active" },
  "payment": { "sessionId": "sim_pay_abc123", "status": "paid" }
}
```

Now the manager can log in.

> **Why two steps?** It mirrors a real checkout (create order → pay) so swapping the
> simulation for Stripe later is a drop-in change. (Decided: two-step — see
> [§8 Decisions](#8-decisions-locked-in).)

---

## 4. How login changes

### 4.1 Users and managers — login now needs an org

Today login is just email + password. Now a user/manager belongs to a specific org, so
the login has to know *which* org. The frontend flow is:

1. On the login screen, the user **searches for / picks their org** from a list.
2. They then enter email + password for that org.

So we need **public** endpoints to power that org picker:

**Full list of orgs (public)**
```http
GET /api/orgs
```
```json
[
  { "id": 7, "name": "Downtown Padel Club", "accentColor": "#1E88E5", "status": "active" },
  { "id": 8, "name": "Riverside Tennis",    "accentColor": "#43A047", "status": "inactive" }
]
```

**Search orgs by name (public)**
```http
GET /api/orgs/search?q=down
```
Same shape, filtered. These public lists show all **loginable** orgs — both `active` and
`inactive` (each with a `status` field so the frontend can badge an inactive org as
read-only). `pending_payment` orgs are excluded.

**The login itself now carries the org:**
```http
POST /api/auth/login
```
```json
{
  "orgId": 7,
  "email": "owner@downtownpadel.com",
  "password": "supersecret"
}
```
- If the email/password is valid **for that org**, you're in.
- The session (JWT) now remembers your `orgId` and `role`, so every later request is
  automatically scoped to your org — you literally cannot see another org's data.
- A `manager` and a `user` both log in here; the only difference is the `role` you get
  back.

Response also returns the org's branding so the frontend can theme immediately:
```json
{
  "user": { "id": 12, "email": "owner@downtownpadel.com", "name": "owner", "role": "manager", "orgId": 7 },
  "org":  { "id": 7, "name": "Downtown Padel Club", "accentColor": "#1E88E5" }
}
```

### 4.2 Registration also needs an org

A normal user signing themselves up has to join an existing org, so registration takes an
`orgId` too:
```http
POST /api/auth/register
```
```json
{ "orgId": 7, "email": "player@example.com", "password": "secret123", "username": "player" }
```
New users are created with role `user` inside that org.

### 4.3 Admins — a separate login door

Admins are **not** part of any org, so they can't use `/api/auth/login` anymore (it now
requires an org). They get their own endpoint with **no org field**:

```http
POST /api/auth/admin/login
```
```json
{ "email": "platform-admin@kingofcourt.com", "password": "rootpassword" }
```
If someone with an admin account tries the normal org login, it's rejected, and vice
versa. This keeps the two worlds cleanly separated.

### 4.4 After login — "what org am I in?"

Once a user or manager is logged into an org, they can ask for the **full details of the
org they're currently in**. The org is read from the session (their `orgId`), so there's
no id in the URL and no way to peek at another org.

```http
GET /api/orgs/me        (auth required — any logged-in member of the org)
```
Returns everything about the current org:
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

- **Users** and **managers** both use this to load the org's branding/info on app start
  (e.g. after a refresh, when the login response is gone).
- A **manager** sees the full object above (an org can have several managers, hence the
  `managers` array). A plain **user** sees only the branding basics — `id`, `name`, and
  `accentColor`:
  ```json
  { "id": 7, "name": "Downtown Padel Club", "accentColor": "#1E88E5" }
  ```
  Everything else (status, counts, manager details, createdAt) is manager-only.
- This is the read counterpart to `PUT /api/orgs/me` (section 5.2), which managers use to
  *change* the org.

---

## 5. What each role can do

### 5.1 User (unchanged, just org-scoped)
Plays inside their org: sees their org's games, signs up, sends match requests, views the
org leaderboard and their own history. Cannot see anything from other orgs.

### 5.2 Manager = "admin of one org"
A manager has **everything today's `admin` can do, scoped to their own org**:

- Create / start / end / process games (in their org)
- Sign players up / remove players (in their org)
- Set current round, manage match requests
- Manage their org's users: change usernames, emails, **roles** (incl. promoting a user
  to manager), and **elo**
- See all users / all games in their org

**Plus** they own the org's branding and identity:
```http
PUT /api/orgs/me        (manager required)
```
```json
{ "name": "Downtown Padel & Social", "accentColor": "#0D47A1" }
```
A manager can only ever touch **their own** org. `orgId` is taken from their session, not
from the URL, so there's no way to point at someone else's org.

If the org has been deactivated, a manager can bring it back with another (simulated)
payment:
```http
POST /api/orgs/me/reactivate        (manager required)
```

> Concretely: most endpoints that today say **"admin required"** become
> **"manager required"** and are silently filtered to `WHERE org_id = <your org>`.
> While the org is `inactive`, **all** of a manager's writes are blocked except
> `POST /api/orgs/me/reactivate` (see [§8 Decisions](#8-decisions-locked-in)).

### 5.3 Admin = "operator of all orgs, but only at the surface"
An admin works **across every org**, but only at the org level — never the contents.

**Admins CAN:**
- List / view **every** org, regardless of status (`pending_payment`, `active`, `inactive`)
- Change any org's name and accent color
- Full **CRUD on manager accounts** of any org — create a manager, list an org's managers,
  change a manager's email/password, delete a manager
- **Deactivate** an org (→ read-only `inactive`) and **reactivate** it **without payment**
- Create an org outright (and/or delete one)

**Admins CANNOT (managers-only territory):**
- Create or manage games
- Sign players up, process results, touch match requests
- Create, edit, or delete **normal users**, their elo, role, or profile
- See or alter the gameplay data inside an org

Example admin endpoints (note these live under `/api/admin/*`, separate from the org-scoped
manager endpoints):
```http
GET    /api/admin/orgs                          list every org (all statuses)
GET    /api/admin/orgs/:id                       view one org
PUT    /api/admin/orgs/:id                        change name / accent color
POST   /api/admin/orgs/:id/deactivate            deactivate (→ inactive, read-only)
POST   /api/admin/orgs/:id/reactivate            reactivate (no payment)
DELETE /api/admin/orgs/:id                        permanently remove an org

GET    /api/admin/orgs/:id/managers               list an org's managers
POST   /api/admin/orgs/:id/managers               create a manager (email + password)
PUT    /api/admin/orgs/:id/managers/:managerId    change a manager's email / password
DELETE /api/admin/orgs/:id/managers/:managerId    remove a manager

GET    /api/admin/admins                          list platform admins
POST   /api/admin/admins                          create another admin
DELETE /api/admin/admins/:id                      remove an admin (not yourself)
```
> Admins can CRUD **manager** and **admin** accounts. They can never create or touch a
> `user` row.

**Self-deletion guard:** `manager` and `admin` accounts can never delete their own
account — an org or the platform must never be left without an operator. A manager is
removed by a co-manager or by an admin; an admin is removed by another admin.

So the mental model is: **admin manages the org and its manager; the manager manages
everything inside the org; the user plays inside the org.** Each layer can only reach one
level down, never two.

---

## 6. Permission matrix (quick reference)

| Capability | User | Manager | Admin |
| --- | :---: | :---: | :---: |
| Log in via org login | ✅ | ✅ | ❌ |
| Log in via admin login | ❌ | ❌ | ✅ |
| Play games / sign up / match requests (own org) | ✅ | ✅ | ❌ |
| Create / manage / process games (own org) | ❌ | ✅ | ❌ |
| Manage users' elo / role / profile (own org) | ❌ | ✅ | ❌ |
| Change own org name + accent color | ❌ | ✅ | ✅* |
| Create an org | ✅ (public flow) | — | ✅ |
| List / view all orgs (any status) | ❌ | ❌ | ✅ |
| Change **any** org's name + color | ❌ | ❌ | ✅ |
| CRUD **manager accounts** in any org | ❌ | ❌ | ✅ |
| CRUD other **admin accounts** | ❌ | ❌ | ✅ |
| Create / edit / delete **normal users** in any org | ❌ | ✅ (own org) | ❌ |
| Touch a normal user's games/elo in any org | ❌ | ✅ (own org) | ❌ |
| **Deactivate** an org (→ read-only) | ❌ | ❌ | ✅ |
| **Reactivate** an org | ❌ | ✅ (own org, via payment) | ✅ (any, no payment) |
| Write anything while own org is `inactive` | ❌ | ❌ (only reactivate) | n/a |

\* Admin changes org branding via the cross-org `/api/admin/orgs/:id` route; a manager
does it for their own org via `/api/orgs/me`.

---

## 7. What this means for the *existing* endpoints

Almost everything we already documented stays, with two adjustments:

1. **Org scoping.** Games, players, search, leaderboard, and history are all filtered to
   the caller's org automatically (from their session). No URL changes needed for users —
   they just stop seeing other orgs.
2. **"admin required" → "manager required".** Every endpoint currently gated to `admin`
   (create game, start/end/process, admin signup/leave, current-round, user management,
   `GET /api/users`, elo/role edits) becomes **manager**, scoped to the manager's org.
   Platform admins do **not** get these; they only get the new `/api/admin/*` org tools.

Resources now present in `API.md`:
- **Organizations** `/api/orgs/*` — public create + simulate payment, public list/search
  (loginable orgs with `status`), `GET /api/orgs/me` (any logged-in member reads their
  current org; trimmed for users), `PUT /api/orgs/me` (manager branding edit), and
  `POST /api/orgs/me/reactivate` (manager reactivation payment).
- **Admin** `/api/admin/*` — cross-org management: list/view/edit/deactivate/reactivate/
  delete orgs, CRUD manager accounts, and CRUD admin accounts.
- **Auth** — `orgId` added to login + register; new `POST /api/auth/admin/login`;
  `orgId` surfaced in `GET /api/auth/profile`.
- **Existing endpoints** — Users/Players/Games/History are now org-scoped and "admin
  required" → "manager required" (see point 2 above).
- **Role reference** — adds `manager`, redefines `admin`; documents the self-deletion
  guard and read-only mode.

### Data model sketch (for when we implement)
- New `organizations` table: `id, name, accent_color,
  status ('pending_payment' | 'active' | 'inactive'), created_at` (+ a simple `payments`
  row or `payment_status` column for the simulation).
- `users` gets a nullable `org_id` (NULL = platform admin; otherwise the user's org).
  `role` now includes `manager`. Email/username uniqueness becomes **per-org**.
- `games` (and anything else top-level) gets an `org_id`.
- The game-participant flag `added_by_admin` is renamed to `added_by_manager` (response
  field `addedByManager`), since managers now perform that action.
- Migration: existing rows would need to be assigned to a default "legacy" org. We'll
  handle that when we code it.

---

## 8. Decisions (locked in)

1. **Payment: two-step.** `POST /api/orgs` (create, `pending_payment`) → then
   `POST /api/orgs/:id/payment/simulate` (activate). Confirmed.
2. **Multiple managers per org.** An org can have many managers. The creation flow makes
   the first one; managers can promote other users in their org to `manager`, and admins
   can add/remove manager accounts too (see #3).
3. **Admins do full CRUD on *managers*, never on normal users.** Admins can create, read,
   update, and delete **manager accounts** of any org (that's top-level org administration).
   They cannot create/edit/delete normal users, their games, or their elo — that's
   manager-only, one level down.
4. **Org lists by audience:**
   - The **public login list** (`GET /api/orgs`, `GET /api/orgs/search`) shows all
     **loginable** orgs — `active` **and** `inactive` (each with a `status` field), since
     members of an `inactive` org still log in read-only. `pending_payment` is excluded.
   - The **admin list** (`GET /api/admin/orgs`) shows **all** orgs regardless of status
     (`pending_payment`, `active`, `inactive`).
5. **Branding = name + accent color** for now. Confirmed (no logo/secondary color yet).
6. **Admins can create more admins** via `POST /api/admin/admins` (and list/delete them).
7. **Self-deletion guard:** `manager` and `admin` accounts can never delete themselves.
8. **Inactive = read-only (everyone).** An admin deactivates an org
   (`POST /api/admin/orgs/:id/deactivate`); it becomes read-only — **all** member writes
   403. This covers **regular users** (no signups, leaving games, match requests, profile
   edits) **and managers** (no game/user/branding changes). The only write anyone in the
   org can make is the manager reactivation payment. It stays read-only until reactivated
   — either a manager pays another simulated charge (`POST /api/orgs/me/reactivate`) **or**
   an admin flips it back without payment (`POST /api/admin/orgs/:id/reactivate`). Once
   active again, everything works as before. Auth and the reactivation endpoints are
   exempt from the read-only block.

All decisions resolved — these have been merged into `docs/API.md`.
