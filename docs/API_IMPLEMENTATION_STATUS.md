# API Implementation Status vs docs/API.md

Last verified: 2026-06-18

This file tracks what is implemented in the codebase compared to the contract in docs/API.md.

## Implemented recently in this update

- Added full Organizations route module: /api/orgs/\*.
- Added full Platform Admin route module: /api/admin/\*.
- Wired new route modules into app startup.
- Added org/admin controllers and services for org lifecycle and manager/admin account management.
- Added inactive-org read-only write guard middleware.
- Added manager role middleware and shifted game/user management routes toward manager semantics.
- Added org-aware JWT payload support (orgId in session token).
- Kept compatibility fallbacks so existing unit/integration tests still pass.

## Implemented endpoint groups

- Health:
  - GET /api/health
- Auth:
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/admin/login
  - POST /api/auth/refresh
  - POST /api/auth/logout
  - GET /api/auth/profile
- Users:
  - POST /api/users
  - GET /api/users
  - GET /api/users/:id
  - PUT /api/users/:id
  - DELETE /api/users/:id
- Players:
  - GET /api/player/leaderboard
  - GET /api/player/search/:username
  - GET /api/player/profile/:id
- Games:
  - GET /api/games
  - GET /api/games/:id
  - GET /api/games/:id/schedule
  - POST /api/games/create
  - POST /api/games/:id/signup
  - POST /api/games/:id/signup/:userId
  - POST /api/games/:id/leave
  - POST /api/games/:id/leave/:userId
  - GET /api/games/:id/current-round
  - PUT /api/games/:id/current-round
  - POST /api/games/:id/match-request
  - GET /api/games/match-requests/incoming
  - PUT /api/games/match-requests/:requestId/respond
  - PUT /api/games/:id/start
  - PUT /api/games/:id/end
  - PUT /api/games/:id/process
- History:
  - GET /api/history/games
  - GET /api/history/games/:id
  - GET /api/history/elo
  - GET /api/history/elo/:userId
- Organizations:
  - POST /api/orgs
  - POST /api/orgs/:id/payment/simulate
  - GET /api/orgs
  - GET /api/orgs/search
  - GET /api/orgs/me
  - PUT /api/orgs/me
  - POST /api/orgs/me/reactivate
- Admin:
  - GET /api/admin/orgs
  - GET /api/admin/orgs/:id
  - PUT /api/admin/orgs/:id
  - POST /api/admin/orgs/:id/deactivate
  - POST /api/admin/orgs/:id/reactivate
  - DELETE /api/admin/orgs/:id
  - GET /api/admin/orgs/:id/managers
  - POST /api/admin/orgs/:id/managers
  - PUT /api/admin/orgs/:id/managers/:managerId
  - DELETE /api/admin/orgs/:id/managers/:managerId
  - GET /api/admin/admins
  - POST /api/admin/admins
  - DELETE /api/admin/admins/:id

## Major gaps vs docs/API.md

1. Database schema dependency:

- New org/admin endpoints assume organizations and organization_payments tables.
- Schema migration scripts still need to be added/verified in this repository.

2. Full org scoping still needs tightening in older service paths:

- Completed in this pass: history/game/profile paths now enforce org-scoped checks.

3. Contract-hardening pending:

- Some controller-level compatibility fallbacks remain for tests; route-level validation enforces the new contract.

## Recommendation

To fully match docs/API.md, this project needs a dedicated multi-tenant migration:

- Add or update SQL migration files for organizations, organization_payments, and org foreign keys.
- Add integration tests that exercise tenant isolation and org status transitions against a real database schema.
