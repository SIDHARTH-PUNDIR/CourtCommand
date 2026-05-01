# CourtCommand Project Status

This document provides a comprehensive overview of the **CourtCommand** project in its current state. It is designed to update any AI assistant or developer on the exact status of the codebase, the architecture, and discrepancies between the documentation and the actual implementation.

## 1. Project Overview
**CourtCommand** is a realtime tournament administration and predictive strategic analysis system primarily designed for basketball tournaments. 
It aims to digitize match scoring, live spectator updates, and tournament management. 

## 2. Directory Structure
The repository is a separated monorepo architecture:
- `backend/`: Node.js, Express, Socket.io server and EJS frontend views.
- `database/`: Database schema and seed data.
- `ml_service/`: Intended for the Python AI/ML microservice.
- `README.md`: High-level documentation.

## 3. Tech Stack (Actual Implementation)
- **Frontend**: EJS templates (stored in `backend/views`), HTML/CSS/JS (served from `backend/public`).
- **Backend Server**: Node.js + Express.js.
- **Authentication**: Passport.js (Local Strategy, using `bcrypt` for password hashing).
- **Real-Time Communication**: Socket.io (events for `update_score`, `new_event`, `update_clock`, `update_player_stats`).
- **Database**: PostgreSQL (connected via the `pg` package).
- **File Uploads**: `multer` used for storing tournament and player images.

## 4. Current Implementation Level

### A. Backend (`backend/src/server.js`) - **Highly Functional**
- **User Authentication**: Login and registration logic is fully implemented with roles (`is_admin` boolean).
- **Tournaments Module**: Features to create, view, delete, and register teams for tournaments. 
- **Fixtures Generation**: Automated generation of matches implemented for both **Round Robin** and **Knockout** formats.
- **Live Scoring & GameCast**: Socket.io events are actively updating score, time, play-by-play events, and player statistics in real time. Routes like `/live/:matchId` load team rosters dynamically.
- **Player Management**: Features to add players (with image upload) and remove players from teams.

### B. Database (`database/`) - **Schema Defined & Seeded**
- Contains 5 core tables:
  1. `users` (id, name, email, team, password, is_admin)
  2. `tournaments` (id, name, location, start_date, end_date, max_teams, status, image, created_by)
  3. `tournament_teams` (id, tournament_id, team_name, stats like wins/losses/points)
  4. `tournament_matches` (id, tournament_id, teama, teamb, scorea, scoreb, status, match_date, round)
  5. `players` (id, name, role, team, image, position)
- The state contains seeded data for graphics, tournaments, and sample players.

### C. ML Service (`ml_service/`) - **Not Started**
- The AI / Machine learning service that constitutes the "Virtual Assistant Coach" is completely empty (`app.py` is 0 bytes).

## 5. Critical Discrepancies & Issues to Note
1. **Database Mismatch**: The `README.md` explicitly lists **MySQL** (`mysql2/promise`) as the database. However, the codebase strictly uses **PostgreSQL** (`pg` library), and the existing dump (`database/database.sql`) is a `pg_dump`. 
2. **Incorrect SQL Setup Instructions**: The documentation instructs running `database/schema.sql`; however, this file is empty (0 bytes). The actual populated schema and seed data is found in `database/database.sql`.
3. **Incomplete `package.json`**: The `backend/package.json` file is essentially uninitialized (only 282 bytes). It lacks the `"dependencies"` mapping for core libraries used in `server.js` (like `express`, `pg`, `bcrypt`, `socket.io`, `multer`, `passport`). These dependencies might be installed locally in `node_modules` but aren't tracked correctly, risking breaks on a fresh install.
4. **AI Features Absent**: All tactical insights, training recommendations, and player performance evaluations mentioned in the README are non-existent in the actual codebase at this time.
