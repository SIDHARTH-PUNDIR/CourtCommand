<div align="center">
  <img src="https://img.shields.io/badge/CourtCommand-Basketball_Management-ff7a18?style=for-the-badge&logo=dribbble&logoColor=white" alt="CourtCommand">
  <h1>🏀 CourtCommand</h1>
  <p><b>Real-Time Tournament Administration & Predictive Strategic Analysis System</b></p>
  
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
  [![Flask](https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
</div>

<br/>

> **The Problem:** While professional leagues rely on instant analytics and live digital coverage, most amateur tournaments struggle with paper score sheets and inefficient management.
> 
> **The Solution:** CourtCommand replaces manual chaos with **professional-grade tournament management**, ensuring that every match—regardless of level—benefits from structured data collection, real-time visibility, and intelligent analysis.

---

## ✨ Key Features

### 🏆 1. Admin Dashboard
A centralized administrative interface designed for tournament organizers.
* **Team & Roster Management:** Easily register teams and manage players.
* **Automated Fixtures:** Generate tournament schedules effortlessly.
* **Match Tracking:** Oversee ongoing matches and track results.

### ⏱️ 2. Scorer Interface
A **courtside digital control panel** designed for scorers during live matches.
* **Live Point Logging:** Record 2-pointers, 3-pointers, and free throws.
* **Foul & Violation Tracking:** Maintain accurate discipline records.
* **Minutes Played Tracking:** Track exact time spent on the court.

### 📡 3. Live GameCast (Public Portal)
A **fan-facing live portal** powered by **WebSockets (Socket.io)** for zero-delay updates.
* **Live Scoreboard:** Real-time scores and game clock.
* **Play-by-Play Feed:** Dynamic event tracking (e.g., *SPLASH! 💦 Player hits a huge 3-pointer!*).
* **Live Player Stats:** Check minutes played, points, and fouls live.

### 🤖 4. Virtual Assistant Coach (AI Module)
An intelligent analytics module built in Python to provide **strategic insights**.
* **Player Performance Evaluation:** Grade players on their stats.
* **Predictive Projections:** Forecast future points based on career averages.
* **Actionable Suggestions:** Automated training recommendations for improvement.

---

## 🛠️ Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS, EJS (Embedded JavaScript) |
| **Backend** | Node.js, Express.js |
| **Real-Time** | Socket.io |
| **Database** | PostgreSQL (via `pg` / `node-postgres`) |
| **AI / ML Service** | Python, Flask, Pandas, Scikit-Learn |

---

## 📂 Project Structure

CourtCommand follows a **Separated Monorepo Architecture**, keeping the web app and AI service independent but communicative via REST APIs.

```text
CourtCommand/
├── backend/                  # Node.js & Express server
│   ├── public/               # Static assets (CSS, JS, images)
│   ├── src/                  # Backend logic (routes, database connection)
│   └── views/                # EJS templates
├── database/                 # SQL schema and seed data
└── ml_service/               # Python AI/ML microservice (Flask)
```

---

## 🚀 Local Setup & Installation

### Prerequisites
* Node.js (v16+)
* Python (v3.8+)
* PostgreSQL server (v13+ recommended)

### 1️⃣ Database Setup
1. Open your PostgreSQL client (psql or pgAdmin) and create a new database: `court_command`
```sql
CREATE DATABASE court_command;
```
2. Run the SQL script located in `database/schema.sql` to generate the required tables.

### 2️⃣ Backend Setup (Node.js)
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASS=your_password
DB_NAME=court_command
DB_PORT=5432
PORT=3000
```
Start the server:
```bash
npm start
```
*The app will run at: `http://localhost:3000`*

### 3️⃣ AI Service Setup (Python)
First of all unzip the `player_analyzer.zip` file and place the player_analyzer folder in the ml_service folder.
Open a new terminal and navigate to the ML directory:
```bash
cd ml_service
cd court_command_ML
```
**Create & Activate Virtual Environment:**
* **Windows:** `python -m venv venv` ➔ `venv\Scripts\activate`
* **Mac/Linux:** `python3 -m venv venv` ➔ `source venv/bin/activate`

**Install Dependencies & Run:**
```bash
pip install -r requirements.txt
python app.py
```
*The AI microservice will run at: `http://localhost:5000`*

---

## 📈 Future Improvements
* 📱 **Mobile app integration**
* 📊 **Advanced player analytics dashboards**
* 🏆 **Tournament bracket automation**
* 🏥 **AI-based injury risk prediction**
* 🏅 **Multi-sport support beyond basketball**

---


## 🔗 Original Collaborative Repository

This project was developed collaboratively by all four team members. The original repository, containing the complete commit history and contributions from all developers, can be found here:

👉 **[Astic-x/CourtCommand](https://github.com/Astic-x/CourtCommand)**

> This repository is a personal fork maintained by [@SIDHARTH-PUNDIR](https://github.com/SIDHARTH-PUNDIR) reflecting the PostgreSQL migration and setup changes.


**Project Developers**

<table>
  <tr>
    <td align="center"><a href="https://github.com/Astic-x"><img src="https://github.com/Astic-x.png" width="100px;" alt=""/><br /><sub><b>Ankush Malik</b></sub></a></td>
    <td align="center"><a href="https://github.com/vishalsingh21xyz"><img src="https://github.com/vishalsingh21xyz.png" width="100px;" alt=""/><br /><sub><b>Vishal Vijay Singh</b></sub></a></td>
    <td align="center"><a href="https://github.com/SIDHARTH-PUNDIR"><img src="https://github.com/SIDHARTH-PUNDIR.png" width="100px;" alt=""/><br /><sub><b>Sidharth Pundir</b></sub></a></td>
    <td align="center"><a href="https://github.com/akshatbansal13"><img src="https://github.com/akshatbansal13.png" width="100px;" alt=""/><br /><sub><b>Akshat Bansal</b></sub></a></td>
  </tr>
</table>


<p align="center">
  <br>
  <i>Developed for academic and research purposes.</i>
</p>