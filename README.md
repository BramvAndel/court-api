# King of Court API

A RESTful Express.js API for managing court games, player ELO ratings, and match history — with cookie-based JWT authentication.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# → Edit .env with your MySQL credentials and JWT secrets

# 3. Create database & tables
npm run setup:db

# 4. Start development server
npm run dev
# → http://localhost:3000
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with auto-reload (`node --watch`) |
| `npm start` | Start in production mode |
| `npm run setup:db` | Create database schema and load dummy data |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. Key variables:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=courts_db

JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-in-production
```

See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for full database setup options including remote/cloud providers.

---

## Project Structure

```
court-api/
├── index.js                    # Entry point — starts server
├── src/
│   ├── app.js                  # Express app, middleware stack
│   ├── config/
│   │   ├── database.js         # MySQL connection pool + helpers
│   │   └── logger.js           # Winston logger configuration
│   ├── controllers/            # HTTP request/response handlers
│   │   ├── authController.js
│   │   ├── gameController.js
│   │   ├── historyController.js
│   │   ├── playerController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT auth + admin guard
│   │   └── logger.js           # HTTP logging middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── games.js
│   │   ├── history.js
│   │   ├── player.js
│   │   └── users.js
│   ├── services/               # Business logic
│   │   ├── authService.js
│   │   ├── gameService.js      # Includes ELO calculation
│   │   └── historyService.js
│   └── utils/
│       ├── seedAdmin.js
│       └── tokenUtils.js
├── scripts/
│   └── setupDatabase.js
├── courts_db.sql               # Database schema
├── dummy_data.sql              # Sample data
├── .env.example
└── docs/                       # Full documentation
    ├── API.md                  # Complete API reference ← start here
    ├── DATABASE_SETUP.md
    ├── LOGGING.md
    ├── LOGGING_QUICKSTART.md
    ├── API_TESTING.md
    ├── API_CONTRACT.md
    └── API_IMPROVEMENTS.md
```

---

## API Overview

Full reference: **[docs/API.md](docs/API.md)**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/register` | — | Register a new account |
| `POST` | `/api/auth/login` | — | Login, receive session cookies |
| `POST` | `/api/auth/refresh` | Cookie | Refresh access token |
| `POST` | `/api/auth/logout` | Cookie | Invalidate session |
| `GET` | `/api/auth/profile` | 🔒 | Own profile |
| `GET` | `/api/users/:id` | 🔒 | User by ID (own or admin) |
| `PUT` | `/api/users/:id` | 🔒 | Update user (own or admin) |
| `DELETE` | `/api/users/:id` | 🔒 | Delete user (own or admin) |
| `GET` | `/api/player/search/:username` | — | Search players |
| `GET` | `/api/player/profile/:id` | — | Public player profile |
| `GET` | `/api/games` | — | List all games |
| `GET` | `/api/games/:id` | — | Game details + participants |
| `POST` | `/api/games` | 🔒 Admin | Create game |
| `POST` | `/api/games/:id/signup` | 🔒 | Sign up for a game |
| `PUT` | `/api/games/:id/start` | 🔒 Admin | Start game |
| `PUT` | `/api/games/:id/end` | 🔒 Admin | End game |
| `PUT` | `/api/games/:id/process` | 🔒 Admin | Record scores + calculate ELO |
| `GET` | `/api/history/games` | 🔒 | Own game history |
| `GET` | `/api/history/games/:id` | 🔒 | Single game from own history |
| `GET` | `/api/history/elo` | 🔒 | Own ELO history |
| `GET` | `/api/history/elo/:userId` | 🔒 | ELO history (own or admin) |
| `GET` | `/health` | — | Server + DB health check |

---

## Authentication

HTTP-only cookie-based JWT. The frontend must pass `credentials: 'include'` on every request.

| Cookie | Lifetime |
|--------|----------|
| `accessToken` | 15 minutes |
| `refreshToken` | 7 days |

When the access token expires the server returns **401** — call `POST /api/auth/refresh` to get a new one silently.

---

## Game Lifecycle & ELO

Games follow a strict state machine:

```
planned → started → ended → processed
```

When a game is processed (`PUT /api/games/:id/process`) the API:
1. Records final scores per participant
2. Calculates ELO changes using the standard formula (K = 32)
3. Writes a `historical_elo` record for every participant
4. A database trigger automatically keeps `users.elo` in sync

Every player starts at **ELO 1000**.

---

## Documentation

| File | Contents |
|------|----------|
| [docs/API.md](docs/API.md) | Full endpoint reference with request/response examples |
| [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) | Local and remote MySQL setup |
| [docs/LOGGING.md](docs/LOGGING.md) | Logging system deep-dive |
| [docs/LOGGING_QUICKSTART.md](docs/LOGGING_QUICKSTART.md) | Logging quick-start guide |
| [docs/API_TESTING.md](docs/API_TESTING.md) | Manual testing guide |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | API contract definition |
| [docs/API_IMPROVEMENTS.md](docs/API_IMPROVEMENTS.md) | Planned improvements |
