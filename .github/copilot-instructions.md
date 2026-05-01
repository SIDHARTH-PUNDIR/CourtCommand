Project: CourtCommand — AI assistant instructions

Goal
- Help an AI coding agent become productive quickly in the CourtCommand repo (Node/Express backend + Flask ML microservice + MySQL).

Quick architecture summary
- Backend: Node.js (ES modules) Express app at `backend/src/server.js`. Uses EJS templates in `backend/views/` and serves static assets from `backend/public/`.
- Database: MySQL connection pool in `backend/src/config/db.js` (uses `mysql2/promise`). Environment variables in `backend/.env` control DB and session secrets.
- Auth: Passport Local strategy configured in `backend/src/config/password.js` (serialize by id, deserialize queries users table).
- Real-time: Socket.io is used (server imported in `server.js`), and front-end JS under `backend/public/js/` interacts with it.
- ML Service: Python Flask app under `ml_service/court_command_ML` (runs on port 5000 by README). Backend calls it via HTTP (examples: `/predict`, `/api/analyze-player`).

Important developer workflows (how to run & debug)
- Install backend deps and run server:
  - cd backend && npm install
  - Create a `.env` file in `backend/` (see README example). Key vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT, SESSION_SECRET, ADMIN_SECRET.
  - Start the backend: `npm start` (runs `node src/server.js`). Default: http://localhost:3000
- ML service:
  - Unzip `player_analyzer.zip` into `ml_service/` if required and then:
  - cd ml_service/court_command_ML
  - Create & activate venv, pip install -r requirements.txt
  - Run `python app.py` (default: http://127.0.0.1:5000). Backend expects this endpoint for predictions.
- Database:
  - The repo contains `database/updatedDatabase.sql`. Use it to create `court_command` schema and seed data.
  - `backend/src/config/db.js` creates a pool and will log success/failure on startup.

Codebase conventions & patterns (important to follow)
- ES Modules: package.json uses "type": "module" — use import/export syntax.
- SQL queries: Use `mysql2/promise` pool.query(...) with `?` placeholders. Query results are arrays: `[rows, fields]`. Many handlers assume `rows` is at index 0 of destructured response.
- Views & static paths: EJS views live at `backend/views/` and server sets views directory to process.cwd() + '/views' (server is launched from `backend/`), and static assets are served from `backend/public/`.
- Authentication: Many routes check `req.isAuthenticated()` and rely on `req.user.team` and `req.user.is_admin`. When editing auth code keep session and passport patterns intact (serialize user id, deserialize user from DB).
- File uploads: Multer diskStorage writes into `public/assets/players` or `public/assets/tournaments` depending on the route. Filenames include a timestamp to avoid collisions.
- Role/ownership checks: Organizer endpoints validate ownership by comparing DB `created_by` to `req.user.id` or checking `req.user.is_admin`. Preserve these authorization checks when changing admin flows.

Key integration points to inspect when changing behavior
- `backend/src/server.js` — single large router file; many features live here (team dashboard, stats, tournament admin, ML bridge). Prefer splitting into route modules for large edits.
- `backend/src/config/db.js` — change DB connection parameters here (affects all queries).
- `backend/src/config/password.js` — Passport Local strategy; changes affect login/registration flows.
- Frontend EJS templates in `backend/views/pages/` — UI markup with forms that map to server endpoints (e.g., `/add-player`, `/tournaments/create`, `/api/ask-ai`). Update both server and view together when changing fields.
- ML endpoints used by backend (examples in server.js):
  - POST http://127.0.0.1:5000/predict (payload: home/away vectors)
  - POST http://127.0.0.1:5000/api/analyze-player (payload: player summary object)

Testing & quick smoke checks
- Basic smoke: start MySQL, start ML service (port 5000), start backend. Visit http://localhost:3000 and log in/register a test user.
- DB connection: startup logs from `db.js` help diagnose credentials or host issues.

Examples of patterns an AI can safely modify
- Simple: Add a new API route under `server.js` that uses `pool.query(...)` and `res.json(...)` following existing patterns (check auth with `req.isAuthenticated()` if it's team-scoped).
- Medium: Extract route groups into new modules (e.g., `routes/tournaments.js`). When doing so, keep `upload` multer config and `passport` initialization in `server.js` and import the router.

What to avoid or be careful with
- Don’t assume async query result shapes other than `[rows, fields]` and that rows may be empty — code frequently checks `.length` before indexing.
- Don’t remove or change authorization/ownership checks; they enforce tournament privacy and admin rights.
- When renaming DB columns or tables, update all SQL strings in `server.js` (there are many raw queries). Prefer small, verified commits.

Files to reference when making changes (examples)
- backend/src/server.js — main app and many route handlers (auth, dashboard, tournaments, ML bridge).
- backend/src/config/db.js — MySQL pool setup and connection test.
- backend/src/config/password.js — Passport local strategy.
- backend/views/pages/*.ejs — forms and UI that bind to server routes (e.g., `add-player.ejs`, `create-tournament.ejs`, `team-dashboard.ejs`).
- ml_service/court_command_ML/app.py — ML endpoints and expected JSON shapes (backend POSTs to `/predict` and `/api/analyze-player`).

If you make changes, run these quick checks
- Start the backend: `cd backend && npm start` — confirm `✅ Successfully connected to the MySQL database!` and no server exceptions.
- Start ML service: `cd ml_service/court_command_ML && python app.py` — confirm it listens on port 5000 and responds to `/predict`.
- Run a minimal curl against the ML endpoint used by backend to confirm shape (optional for debugging).

When unsure, ask the human about
- Real DB credentials or dev data to reproduce issues (do not commit secrets).
- Expected behavior for edge cases in scoring/tournament logic (the `finalize` and `reset` flows are sensitive).

End of file
