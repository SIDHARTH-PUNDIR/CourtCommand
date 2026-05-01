import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from "bcrypt";

import pool from "./config/db.js";
import configurePassport from "./config/password.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

app.set("view engine", "ejs");

app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super_secret_court_key",
    resave: false,
    saveUninitialized: false,
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.originalUrl.includes("tournaments")) {
      cb(null, "public/assets/tournaments/");
    } else if (req.originalUrl.includes("add-player")) {
      cb(null, "public/assets/players/");
    } else {
      cb(null, "public/assets/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); 
  }
});
const upload = multer({ storage });

app.use(async (req, res, next) => {
  res.locals.user = req.user;
  try {
    const { rows: matches } = await pool.query(`
      SELECT * FROM tournament_matches
      ORDER BY 
        CASE 
          WHEN status = 'LIVE' THEN 1
          WHEN match_date = CURRENT_DATE THEN 2
          WHEN match_date > CURRENT_DATE THEN 3
          ELSE 4
        END,
        match_date ASC
      LIMIT 4
    `);
    res.locals.matches = matches; 
  } catch (err) {
    console.log("MATCH LOAD ERROR:", err);
    res.locals.matches = [];
  }
  next();
});

// Public Routes
app.get("/", async (req, res) => {
  res.render("pages/index"); 
});

app.get("/news", (req, res) => {
  const news = [{
    _id: "1", title: "Final Match Announced", date: "March 18, 2026", author: "Admin",
    description: "The final match will be held this Sunday...", image: "/assets/news/match.jpg"
  }];
  res.render("pages/news", { news });
});

//Authentication
app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post("/register", async (req, res) => {
  const { name, email, team, password, admin_code } = req.body;

  try {
    // 1. Prevent Duplicate Emails
    const { rows: checkEmail } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (checkEmail.length > 0) return res.send("Email already in use. Please log in.");

    // 2. Prevent Team Hijacking
    const { rows: checkTeam } = await pool.query("SELECT * FROM users WHERE LOWER(team)=LOWER($1)", [team]);
    if (checkTeam.length > 0) return res.send("That Team name is already claimed! Please choose another.");

    // 3. The Secret Admin Upgrade
    const isAdmin = (admin_code === process.env.ADMIN_SECRET) ? true : false;

    // 4. Secure & Insert
    const hash = await bcrypt.hash(password, 10);
    const { rows: result } = await pool.query(
      "INSERT INTO users(name, email, team, password, is_admin) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [name, email, team, hash, isAdmin]
    );

    const newUser = result[0];

    // 5. Login & Redirect based on role
    req.login(newUser, (err) => {
      if (err) console.log(err);
      return res.redirect("/team-dashboard");
    });

  } catch (err) {
    console.log("REGISTRATION ERROR:", err);
    res.status(500).send("Server Error during registration.");
  }
});

app.post("/login", passport.authenticate("local", {
  failureRedirect: "/login"
}), (req, res) => {
  // ROLE-BASED REDIRECT
  if (req.user.is_admin) {
    return res.redirect("/team-dashboard");
  } else {
    return res.redirect("/team-dashboard");
  }
});

app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

// MAIN TEAM DASHBOARD 
app.get("/team-dashboard", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  try {
    const { rows: players } = await pool.query("SELECT * FROM players WHERE LOWER(team)=LOWER($1)", [req.user.team]);
    const { rows: tournaments } = await pool.query("SELECT * FROM tournaments ORDER BY start_date ASC");
    const { rows: registered } = await pool.query("SELECT tournament_id FROM tournament_teams WHERE LOWER(team_name)=LOWER($1)", [req.user.team]);

    const { rows: teamStatsRows } = await pool.query(
      `SELECT COALESCE(SUM(wins), 0) AS wins, COALESCE(SUM(losses), 0) AS losses, COALESCE(SUM(points), 0) AS points
       FROM tournament_teams WHERE LOWER(team_name) = LOWER($1)`, [req.user.team]
    );
    const teamStats = teamStatsRows[0] || { wins: 0, losses: 0, points: 0 };

    const { rows: playerStatsRows } = await pool.query(
      `SELECT p.id AS player_id, COALESCE(SUM(pms.points), 0) AS points, COALESCE(SUM(pms.assists), 0) AS assists,
       COALESCE(SUM(pms.rebounds), 0) AS rebounds, COALESCE(SUM(pms.steals), 0) AS steals, 
       COALESCE(SUM(pms.blocks), 0) AS blocks, COALESCE(SUM(pms.fouls), 0) AS fouls,
       COALESCE(SUM(pms.seconds_played), 0) AS seconds_played,
       COUNT(DISTINCT pms.match_id) AS matches_played
       FROM players p LEFT JOIN player_match_stats pms ON p.id = pms.player_id
       WHERE LOWER(p.team) = LOWER($1) GROUP BY p.id`, [req.user.team]
    );

    const statsMap = new Map(playerStatsRows.map(s => [s.player_id, s]));
    const enrichedPlayers = players.map(p => ({
      ...p,
      points: statsMap.get(p.id)?.points ?? 0,
      assists: statsMap.get(p.id)?.assists ?? 0,
      rebounds: statsMap.get(p.id)?.rebounds ?? 0,
      steals: statsMap.get(p.id)?.steals ?? 0,
      blocks: statsMap.get(p.id)?.blocks ?? 0,
      fouls: statsMap.get(p.id)?.fouls ?? 0,
      seconds_played: statsMap.get(p.id)?.seconds_played ?? 0,
      matches_played: statsMap.get(p.id)?.matches_played ?? 0,
    }));

    res.render("pages/team-dashboard", { user: req.user, players: enrichedPlayers, tournaments, registered, teamStats });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.redirect("/");
  }
});

// DEDICATED STATS PAGE (Heavyweight)
app.get("/stats", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  try {
    const { rows: teamStatsRows } = await pool.query(
      `SELECT COALESCE(SUM(wins), 0) AS wins, COALESCE(SUM(losses), 0) AS losses, COALESCE(SUM(points), 0) AS points
       FROM tournament_teams WHERE LOWER(team_name) = LOWER($1)`, [req.user.team]
    );
    const teamStats = teamStatsRows[0] || { wins: 0, losses: 0, points: 0 };

    const [
      { rows: teamMatchRows }, 
      { rows: matchStatRows }, 
      { rows: gameEventRows }
    ] = await Promise.all([
      pool.query(`SELECT m.*, t.name AS tournament_name FROM tournament_matches m LEFT JOIN tournaments t ON m.tournament_id = t.id WHERE m.teama = $1 OR m.teamb = $2 ORDER BY m.match_date DESC`, [req.user.team, req.user.team]),
      pool.query(`SELECT pms.*, p.name FROM player_match_stats pms JOIN players p ON pms.player_id = p.id WHERE p.team = $1`, [req.user.team]),
      pool.query(`SELECT e.*, p.name as player_name FROM game_events e LEFT JOIN players p ON e.player_id = p.id WHERE e.match_id IN (SELECT id FROM tournament_matches WHERE teama = $1 OR teamb = $2) ORDER BY e.created_at DESC`, [req.user.team, req.user.team])
    ]);

    teamMatchRows.forEach(m => {
      m.boxScore = matchStatRows.filter(s => s.match_id === m.id);
      m.events = gameEventRows.filter(e => e.match_id === m.id);
    });

    const { rows: opponentTeamsRows } = await pool.query("SELECT DISTINCT team FROM players WHERE team != $1 AND team IS NOT NULL", [req.user.team]);
    const opponentTeams = opponentTeamsRows.map(r => r.team);

    res.render("pages/stats", { user: req.user, teamMatches: teamMatchRows, teamStats, opponentTeams });
  } catch (err) {
    console.error("STATS ERROR:", err);
    res.redirect("/team-dashboard");
  }
});

// API BRIDGE FOR ML BUTTONS
app.post("/api/ask-ai", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const myTeam = req.user.team;
    const oppTeam = req.body.opponent_team;

    const getApproximations = (pts, ast) => {
      let base_fg = 0.45;
      let base_ft = 0.75;
      let base_tp = 0.35;
      let multiplier = 1 + ((pts - 70) / 700) + ((ast - 15) / 150);
      return {
        fg: Math.min(0.60, Math.max(0.35, base_fg * multiplier)),
        ft: Math.min(0.95, Math.max(0.50, base_ft * multiplier)),
        tp: Math.min(0.50, Math.max(0.20, base_tp * multiplier))
      };
    };

    const matchCondition = `((LOWER(tm.teama) = LOWER($2) AND LOWER(tm.teamb) = LOWER($3)) OR (LOWER(tm.teama) = LOWER($4) AND LOWER(tm.teamb) = LOWER($5)))`;
    const matchParams = [oppTeam, oppTeam, myTeam];

    const { rows: h2hMyTeamRows } = await pool.query(
      `SELECT AVG(team_pts) as avg_pts, AVG(team_ast) as avg_ast, AVG(team_reb) as avg_reb
       FROM (
         SELECT SUM(pms.points) as team_pts, SUM(pms.assists) as team_ast, SUM(pms.rebounds) as team_reb
         FROM player_match_stats pms 
         JOIN players p ON pms.player_id = p.id
         JOIN tournament_matches tm ON pms.match_id = tm.id
         WHERE LOWER(p.team) = LOWER($1) AND ${matchCondition} AND tm.status = 'FINAL'
         GROUP BY tm.id
       ) as match_sums`,
      [myTeam, myTeam, oppTeam, oppTeam, myTeam]
    );

    const { rows: h2hOppTeamRows } = await pool.query(
      `SELECT AVG(team_pts) as avg_pts, AVG(team_ast) as avg_ast, AVG(team_reb) as avg_reb
       FROM (
         SELECT SUM(pms.points) as team_pts, SUM(pms.assists) as team_ast, SUM(pms.rebounds) as team_reb
         FROM player_match_stats pms 
         JOIN players p ON pms.player_id = p.id
         JOIN tournament_matches tm ON pms.match_id = tm.id
         WHERE LOWER(p.team) = LOWER($1) AND ${matchCondition} AND tm.status = 'FINAL'
         GROUP BY tm.id
       ) as match_sums`,
      [oppTeam, myTeam, oppTeam, oppTeam, myTeam]
    );

    let myH2H = h2hMyTeamRows[0];
    let oppH2H = h2hOppTeamRows[0];

    if (!myH2H || myH2H.avg_pts == null) {
      const { rows: fallbackMy } = await pool.query(`SELECT AVG(team_pts) as avg_pts, AVG(team_ast) as avg_ast, AVG(team_reb) as avg_reb FROM (SELECT SUM(pms.points) as team_pts, SUM(pms.assists) as team_ast, SUM(pms.rebounds) as team_reb FROM player_match_stats pms JOIN players p ON pms.player_id = p.id JOIN tournament_matches tm ON pms.match_id = tm.id WHERE LOWER(p.team) = LOWER($1) AND tm.status = 'FINAL' GROUP BY tm.id) as match_sums`, [myTeam]);
      myH2H = fallbackMy[0];
    }
    if (!oppH2H || oppH2H.avg_pts == null) {
      const { rows: fallbackOpp } = await pool.query(`SELECT AVG(team_pts) as avg_pts, AVG(team_ast) as avg_ast, AVG(team_reb) as avg_reb FROM (SELECT SUM(pms.points) as team_pts, SUM(pms.assists) as team_ast, SUM(pms.rebounds) as team_reb FROM player_match_stats pms JOIN players p ON pms.player_id = p.id JOIN tournament_matches tm ON pms.match_id = tm.id WHERE LOWER(p.team) = LOWER($1) AND tm.status = 'FINAL' GROUP BY tm.id) as match_sums`, [oppTeam]);
      oppH2H = fallbackOpp[0];
    }

    const myPts = myH2H && myH2H.avg_pts != null ? parseFloat(myH2H.avg_pts) : 70;
    const myAst = myH2H && myH2H.avg_ast != null ? parseFloat(myH2H.avg_ast) : 15;
    const myReb = myH2H && myH2H.avg_reb != null ? parseFloat(myH2H.avg_reb) : 30;

    const oppPts = oppH2H && oppH2H.avg_pts != null ? parseFloat(oppH2H.avg_pts) : 70;
    const oppAst = oppH2H && oppH2H.avg_ast != null ? parseFloat(oppH2H.avg_ast) : 15;
    const oppReb = oppH2H && oppH2H.avg_reb != null ? parseFloat(oppH2H.avg_reb) : 30;

    const homeStats = [getApproximations(myPts, myAst).fg, getApproximations(myPts, myAst).ft, getApproximations(myPts, myAst).tp, myAst, myReb];
    const awayStats = [getApproximations(oppPts, oppAst).fg, getApproximations(oppPts, oppAst).ft, getApproximations(oppPts, oppAst).tp, oppAst, oppReb];

    const { rows: recentRows } = await pool.query(
      `SELECT pms.match_id, SUM(pms.points) as pts, SUM(pms.assists) as ast, SUM(pms.rebounds) as reb
       FROM player_match_stats pms 
       JOIN players p ON pms.player_id = p.id
       JOIN tournament_matches tm ON pms.match_id = tm.id
       WHERE LOWER(p.team) = LOWER($1) AND tm.status = 'FINAL'
       GROUP BY pms.match_id, tm.match_date
       ORDER BY tm.match_date DESC
       LIMIT 5`,
      [myTeam]
    );

    let recentStatsArray = homeStats; 
    if (recentRows.length > 0) {
      let totalPts = 0, totalAst = 0, totalReb = 0;
      recentRows.forEach(r => { totalPts += parseFloat(r.pts); totalAst += parseFloat(r.ast); totalReb += parseFloat(r.reb); });
      let avgPts = totalPts / recentRows.length;
      let avgAst = totalAst / recentRows.length;
      let avgReb = totalReb / recentRows.length;
      let recentApprox = getApproximations(avgPts, avgAst);
      recentStatsArray = [recentApprox.fg, recentApprox.ft, recentApprox.tp, avgAst, avgReb];
    }

    const payload = {
      home: homeStats,
      away: awayStats,
      recent_stats: recentStatsArray
    };

    const mlResponse = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await mlResponse.json();

    res.json({
      my_team: myTeam,
      my_team_prob: data.home_prob,
      opp_team: oppTeam,
      opp_team_prob: data.away_prob,
      drills: data.drills
    });
  } catch (err) {
    console.error("ML ENGINE ERROR:", err);
    res.status(500).json({ status: "error", message: "AI Engine Offline or Error" });
  }
});

app.get("/api/player-scout/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const playerId = req.params.id;
    
    const { rows: statsRows } = await pool.query(
      `SELECT AVG(points) as avg_pts, AVG(assists) as avg_ast, AVG(rebounds) as avg_reb, AVG(seconds_played) as avg_sec 
       FROM player_match_stats WHERE player_id = $1`, 
      [playerId]
    );
    
    const stats = statsRows[0];
    const pts = stats && stats.avg_pts != null ? parseFloat(stats.avg_pts) : 0;
    const ast = stats && stats.avg_ast != null ? parseFloat(stats.avg_ast) : 0;
    const reb = stats && stats.avg_reb != null ? parseFloat(stats.avg_reb) : 0;
    
    const avgSec = stats && stats.avg_sec != null ? parseFloat(stats.avg_sec) : 0;
    const actualMinutes = (avgSec / 60).toFixed(1);
    
    const fg_pct = Math.min(0.60, Math.max(0.35, 0.45 * (1 + ((pts - 15) / 150))));
    
    const payload = {
      PTS: pts,
      AST: ast,
      REB: reb,
      FG_PCT: fg_pct,
      MIN: parseFloat(actualMinutes) > 0 ? parseFloat(actualMinutes) : 24
    };
    
    const mlResponse = await fetch("http://127.0.0.1:5000/api/analyze-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await mlResponse.json();
    res.json(data);
  } catch (err) {
    console.error("PLAYER SCOUT ERROR:", err);
    res.status(500).json({ error: "AI Engine Offline or Error" });
  }
});

app.post("/assign-position", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
  const { playerId, position } = req.body;

  try {
    await pool.query("UPDATE players SET position=$1 WHERE id=$2 AND LOWER(team)=LOWER($3)", [position, playerId, req.user.team]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get("/add-player", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.render("pages/add-player");
});

app.post("/add-player", upload.single("image"), async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  if (!req.file) return res.send("Image upload failed");

  const { name, role, position } = req.body;
  const team = req.user.team;
  const image = "/assets/players/" + req.file.filename;

  try {
    await pool.query(
      "INSERT INTO players (name,role,team,image,position) VALUES ($1,$2,$3,$4,$5)",
      [name, role, team, image, position]
    );
    res.redirect("/team-dashboard");
  } catch (err) {
    console.log(err);
  }
});

app.post("/remove-player/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM players WHERE id=$1 AND team=$2", [req.params.id, req.user.team]);
    res.redirect("/team-dashboard");
  } catch (err) {
    console.log(err);
  }
});

app.post("/team/edit", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const newTeamName = req.body.team_name.trim();
  const oldTeamName = req.user.team;

  if (!newTeamName || newTeamName === oldTeamName) {
    return res.redirect("/team-dashboard");
  }

  try {
    const { rows: check } = await pool.query("SELECT id FROM users WHERE LOWER(team)=LOWER($1)", [newTeamName]);
    if (check.length > 0) return res.send("Team name already taken!");

    await pool.query("UPDATE users SET team=$1 WHERE id=$2", [newTeamName, req.user.id]);
    await pool.query("UPDATE players SET team=$1 WHERE team=$2", [newTeamName, oldTeamName]);
    await pool.query("UPDATE tournament_teams SET team_name=$1 WHERE team_name=$2", [newTeamName, oldTeamName]);
    await pool.query("UPDATE tournament_matches SET teama=$1 WHERE teama=$2", [newTeamName, oldTeamName]);
    await pool.query("UPDATE tournament_matches SET teamb=$1 WHERE teamb=$2", [newTeamName, oldTeamName]);
    await pool.query("UPDATE game_events SET team_name=$1 WHERE team_name=$2", [newTeamName, oldTeamName]);

    req.user.team = newTeamName;
    res.redirect("/team-dashboard");
  } catch (err) {
    console.error("TEAM EDIT CASCADE ERROR:", err);
    res.redirect("/team-dashboard");
  }
});

app.post("/player/:id/edit", upload.single("image"), async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { id } = req.params;
  const { name, role, position } = req.body; 

  try {
    if (req.file) {
      const imagePath = "/assets/players/" + req.file.filename;
      await pool.query(
        "UPDATE players SET name=$1, role=$2, position=$3, image=$4 WHERE id=$5 AND team=$6",
        [name, role, position, imagePath, id, req.user.team]
      );
    } else {
      await pool.query(
        "UPDATE players SET name=$1, role=$2, position=$3 WHERE id=$4 AND team=$5",
        [name, role, position, id, req.user.team]
      );
    }
    res.redirect("/team-dashboard");
  } catch (err) {
    console.error("EDIT PLAYER ERROR:", err);
    res.redirect("/team-dashboard");
  }
});

app.get("/api/match/:id/players", async (req, res) => {
  const matchId = req.params.id;
  try {
    const { rows: matchResult } = await pool.query("SELECT * FROM tournament_matches WHERE id=$1", [matchId]);
    if (matchResult.length === 0) return res.json([]);
    const match = matchResult[0];

    const { rows: players } = await pool.query(
      "SELECT id, name, position, team FROM players WHERE LOWER(team) = LOWER($1) OR LOWER(team) = LOWER($2) ORDER BY team, id ASC",
      [match.teama, match.teamb]
    );
    res.json(players);
  } catch (err) {
    res.json([]);
  }
});

//  Tournament Administration 
app.get("/manage-tournaments", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  try {
    let myTournaments = [];

    if (req.user.is_admin) {
      const { rows: allTourneys } = await pool.query("SELECT * FROM tournaments ORDER BY start_date DESC");
      myTournaments = allTourneys;
    } else {
      const { rows: userTourneys } = await pool.query(
        "SELECT * FROM tournaments WHERE created_by = $1 ORDER BY start_date DESC",
        [req.user.id]
      );
      myTournaments = userTourneys;
    }

    res.render("pages/manage-tournaments", {
      user: req.user,
      myTournaments
    });

  } catch (err) {
    console.error("ORGANIZER DASHBOARD ERROR:", err);
    res.redirect("/");
  }
});

app.get("/manage-tournaments/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const { rows: tourn } = await pool.query("SELECT * FROM tournaments WHERE id=$1", [id]);
    if (tourn.length === 0) return res.redirect("/admin");

    if (tourn[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    const { rows: teams } = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=$1", [id]);
    const { rows: matches } = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=$1 ORDER BY id ASC", [id]);
    const { rows: users } = await pool.query("SELECT id, team FROM users WHERE team IS NOT NULL AND team != 'ADMIN'");
    const { rows: leaderboard } = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=$1 ORDER BY points DESC, wins DESC", [id]);

    res.render("pages/manage-tournament-detail", {
      user: req.user, tournament: tourn[0], teams, matches, users, leaderboard, isRegistered: false
    });
  } catch (err) {
    console.error("ADMIN TOURNAMENT HUB ERROR:", err);
    res.redirect("/admin");
  }
});

app.get("/tournaments/create", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.render("pages/create-tournament", { user: req.user });
});

app.post("/tournaments/create", upload.single("image"), async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { name, location, start_date, end_date, max_teams } = req.body;
  const imagePath = req.file ? "/assets/tournaments/" + req.file.filename : "/assets/tournaments/default.png";

  try {
    await pool.query(
      `INSERT INTO tournaments (name, location, start_date, end_date, max_teams, status, image, created_by) VALUES ($1,$2,$3,$4,$5,'UPCOMING',$6,$7)`,
      [name, location, start_date, end_date, max_teams, imagePath, req.user.id]
    );
    res.redirect("/tournaments");
  } catch (err) {
    console.log("CREATE TOURNAMENT ERROR:", err);
    res.redirect("/tournaments");
  }
});

app.post("/tournaments/:id/edit", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { name, location, start_date, end_date, max_teams, image } = req.body;

  try {
    const { rows: tourn } = await pool.query("SELECT created_by FROM tournaments WHERE id=$1", [id]);
    if (tourn[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    await pool.query(
      "UPDATE tournaments SET name=$1, location=$2, start_date=$3, end_date=$4, max_teams=$5, image=$6 WHERE id=$7",
      [name, location, start_date, end_date, max_teams, image, id]
    );

    res.redirect(`/manage-tournaments/${id}`);
  } catch (err) {
    console.error("EDIT TOURNAMENT ERROR:", err);
    res.redirect(`/manage-tournaments/${id}`);
  }
});

app.post("/tournaments/:id/delete", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const { rows: result } = await pool.query("SELECT created_by FROM tournaments WHERE id=$1", [id]);
    if (result.length === 0) return res.redirect("/tournaments");

    if (result[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    await pool.query("DELETE FROM tournament_teams WHERE tournament_id=$1", [id]);
    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=$1", [id]);
    await pool.query("DELETE FROM tournaments WHERE id=$1", [id]);

    res.redirect("/manage-tournaments");
  } catch (err) {
    console.log("DELETE TOURNAMENT ERROR:", err);
    res.redirect("/tournaments");
  }
});

app.post("/tournaments/:id/add-team", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { team_id } = req.body;

  try {
    const { rows: tournamentResult } = await pool.query("SELECT created_by FROM tournaments WHERE id=$1", [id]);
    if (tournamentResult.length === 0) return res.redirect("/tournaments");

    if (tournamentResult[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    const { rows: teamData } = await pool.query("SELECT team FROM users WHERE id=$1", [team_id]);
    if (teamData.length === 0) return res.redirect(`/tournaments/${id}`);

    const teamName = teamData[0].team;

    const { rows: check } = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=$1 AND LOWER(team_name)=LOWER($2)", [id, teamName]);
    if (check.length === 0) {
      await pool.query("INSERT INTO tournament_teams (tournament_id, team_name) VALUES ($1,$2)", [id, teamName]);
    }

    res.redirect(`/tournaments/${id}`);
  } catch (err) {
    console.log("ADD TEAM ERROR:", err);
    res.redirect(`/tournaments/${id}`);
  }
});

app.post("/tournaments/:tid/remove-team/:teamId", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { tid, teamId } = req.params;

  try {
    const { rows: tournamentResult } = await pool.query("SELECT created_by FROM tournaments WHERE id=$1", [tid]);
    if (tournamentResult.length === 0) return res.redirect("/tournaments");

    if (tournamentResult[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    await pool.query("DELETE FROM tournament_teams WHERE id=$1 AND tournament_id=$2", [teamId, tid]);

    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=$1 AND (teama=(SELECT team_name FROM tournament_teams WHERE id=$2) OR teamb=(SELECT team_name FROM tournament_teams WHERE id=$3))", [tid, teamId, teamId]);

    res.redirect(`/tournaments/${tid}`);
  } catch (err) {
    console.error("REMOVE TEAM ERROR:", err);
    res.redirect(`/tournaments/${tid}`);
  }
});

app.post("/tournaments/:id/finalize", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const { rows: tournCheck } = await pool.query("SELECT created_by FROM tournaments WHERE id=$1", [id]);
    if (tournCheck.length === 0) return res.redirect("/manage-tournaments");

    if (tournCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    const { rows: allMatches } = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=$1 ORDER BY id ASC", [id]);
    const finalMatch = allMatches.find(m => m.round === "FINAL");

    let champ = null, ru = null, sru = null;

    if (finalMatch && finalMatch.status === "FINAL") {
      champ = finalMatch.winner;
      ru = finalMatch.winner === finalMatch.teama ? finalMatch.teamb : finalMatch.teama;

      const semiMatches = allMatches.filter(m => m.round === "SEMI FINAL" && m.status === "FINAL");
      if (semiMatches.length === 2) {
        const loser1 = semiMatches[0].winner === semiMatches[0].teama ? semiMatches[0].teamb : semiMatches[0].teama;
        const loser2 = semiMatches[1].winner === semiMatches[1].teama ? semiMatches[1].teamb : semiMatches[1].teama;

        const { rows: stats } = await pool.query("SELECT team_name FROM tournament_teams WHERE tournament_id=$1 AND team_name IN ($2, $3) ORDER BY points DESC, wins DESC LIMIT 1", [id, loser1, loser2]);
        if (stats.length > 0) sru = stats[0].team_name;
      }
    } else {
      const { rows: leaderboard } = await pool.query("SELECT team_name FROM tournament_teams WHERE tournament_id=$1 ORDER BY points DESC, wins DESC LIMIT 3", [id]);
      if (leaderboard.length > 0) champ = leaderboard[0].team_name;
      if (leaderboard.length > 1) ru = leaderboard[1].team_name;
      if (leaderboard.length > 2) sru = leaderboard[2].team_name;
    }

    await pool.query("UPDATE tournaments SET status='COMPLETED', champion=$1, runner_up=$2, second_runner_up=$3 WHERE id=$4", [champ, ru, sru, id]);

    res.redirect(`/manage-tournaments/${id}`);
  } catch (err) {
    console.error("FINALIZE ERROR:", err);
    res.redirect(`/manage-tournaments/${id}`);
  }
});

app.post("/tournaments/:id/reset", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const { rows: tournCheck } = await pool.query("SELECT created_by FROM tournaments WHERE id=$1", [id]);
    if (tournCheck.length === 0) return res.redirect("/manage-tournaments");

    if (tournCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=$1", [id]);
    await pool.query("UPDATE tournament_teams SET matches_played=0, wins=0, losses=0, ties=0, points=0 WHERE tournament_id=$1", [id]);
    await pool.query("UPDATE tournaments SET status='ACTIVE', champion=NULL, runner_up=NULL, second_runner_up=NULL WHERE id=$1", [id]);

    res.redirect(`/manage-tournaments/${id}`);
  } catch (err) {
    console.error("RESET ERROR:", err);
    res.redirect(`/manage-tournaments/${id}`);
  }
});

app.post("/admin/generate-fixtures/:tournamentId", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { tournamentId } = req.params;
  const { type } = req.body;

  try {
    const { rows: tournamentCheck } = await pool.query("SELECT created_by FROM tournaments WHERE id=$1", [tournamentId]);
    if (tournamentCheck.length === 0) return res.redirect("/tournaments");

    if (tournamentCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized: You do not own this tournament.");
    }

    const { rows: teamList } = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=$1", [tournamentId]);

    await pool.query("DELETE FROM tournament_matches WHERE tournament_id=$1", [tournamentId]);

    if (type === "round") {
      for (let i = 0; i < teamList.length; i++) {
        for (let j = i + 1; j < teamList.length; j++) {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES ($1, $2, $3, 'UPCOMING', 'GROUP STAGE')`,
            [tournamentId, teamList[i].team_name, teamList[j].team_name]
          );
        }
      }
    } else if (type === "knockout") {
      if (teamList.length < 2) return res.redirect(`/tournaments/${tournamentId}`);

      const shuffled = teamList.sort(() => 0.5 - Math.random());
      const totalTeams = shuffled.length;

      let P = 1;
      while (P < totalTeams) P *= 2;
      const byesCount = P - totalTeams;

      const byePositions = [];
      let topStart = 0; let topEnd = (P / 2) - 1;
      let bottomStart = P / 2; let bottomEnd = P - 1;

      while (byePositions.length < P) {
        if (bottomEnd >= bottomStart) byePositions.push(bottomEnd--);
        if (topStart <= topEnd) byePositions.push(topStart++);
        if (bottomStart <= bottomEnd) byePositions.push(bottomStart++);
        if (topEnd >= topStart) byePositions.push(topEnd--);
      }

      const bracketSlots = new Array(P).fill(null);
      for (let i = 0; i < byesCount; i++) bracketSlots[byePositions[i]] = 'BYE';

      let teamIndex = 0;
      for (let i = 0; i < P; i++) {
        if (bracketSlots[i] === null) bracketSlots[i] = shuffled[teamIndex++].team_name;
      }

      for (let i = 0; i < P; i += 2) {
        const teamA = bracketSlots[i];
        const teamB = bracketSlots[i + 1];

        if (teamA === 'BYE' || teamB === 'BYE') {
          const actualTeam = teamA === 'BYE' ? teamB : teamA;
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES ($1, $2, 'BYE', 'UPCOMING', 'ROUND 1')`,
            [tournamentId, actualTeam]
          );
        } else {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES ($1, $2, $3, 'UPCOMING', 'ROUND 1')`,
            [tournamentId, teamA, teamB]
          );
        }
      }

      let nextRoundMatches = P / 4;
      while (nextRoundMatches >= 1) {
        let roundName = "NEXT ROUND";
        if (nextRoundMatches === 4) roundName = "QUARTER FINAL";
        else if (nextRoundMatches === 2) roundName = "SEMI FINAL";
        else if (nextRoundMatches === 1) roundName = "FINAL";

        for (let i = 0; i < nextRoundMatches; i++) {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES ($1, 'TBD', 'TBD', 'UPCOMING', $2)`,
            [tournamentId, roundName]
          );
        }
        nextRoundMatches /= 2;
      }
    } else if (type === "hybrid") {
      const groupsCount = parseInt(req.body.group_count) || 2;
      const advancingCount = parseInt(req.body.advancing_count) || 2;

      if (teamList.length < groupsCount) return res.redirect(`/tournaments/${tournamentId}`);

      const shuffled = teamList.sort(() => 0.5 - Math.random());
      const groups = Array.from({ length: groupsCount }, () => []);

      shuffled.forEach((team, index) => {
        groups[index % groupsCount].push(team.team_name);
      });

      for (let g = 0; g < groupsCount; g++) {
        const groupLetter = String.fromCharCode(65 + g);
        const groupTeams = groups[g];
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            await pool.query(
              `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES ($1, $2, $3, 'UPCOMING', 'GROUP ${groupLetter} STAGE')`,
              [tournamentId, groupTeams[i], groupTeams[j]]
            );
          }
        }
      }

      const totalKnockoutTeams = groupsCount * advancingCount;
      let P = 1;
      while (P < totalKnockoutTeams) P *= 2;
      let nextRoundMatches = P / 2;

      while (nextRoundMatches >= 1) {
        let roundName = "KNOCKOUT ROUND";
        if (nextRoundMatches === 4) roundName = "QUARTER FINAL";
        else if (nextRoundMatches === 2) roundName = "SEMI FINAL";
        else if (nextRoundMatches === 1) roundName = "FINAL";

        for (let i = 0; i < nextRoundMatches; i++) {
          await pool.query(
            `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES ($1, 'TBD', 'TBD', 'UPCOMING', $2)`,
            [tournamentId, roundName]
          );
        }
        nextRoundMatches /= 2;
      }
    } else if (type === "custom") {
      await pool.query(
        `INSERT INTO tournament_matches (tournament_id, teama, teamb, status, round) VALUES ($1,'TBD','TBD','UPCOMING','CUSTOM MATCH')`,
        [tournamentId]
      );
    }

    res.redirect(`/tournaments/${tournamentId}`);
  } catch (err) {
    console.error("GENERATE FIXTURES ERROR:", err);
    res.redirect(`/tournaments/${tournamentId}`);
  }
});

// Tournament Views & Standings (Public)
app.get("/tournaments", async (req, res) => {
  try {
    const { rows: tournaments } = await pool.query("SELECT * FROM tournaments ORDER BY start_date ASC");
    res.render("pages/tournaments", { tournaments, user: req.user });
  } catch (err) {
    console.log(err);
  }
});

app.get("/tournaments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: tournament } = await pool.query("SELECT * FROM tournaments WHERE id=$1", [id]);
    const { rows: teams } = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=$1 ORDER BY registered_at ASC", [id]);
    const { rows: leaderboard } = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=$1 ORDER BY points DESC, wins DESC", [id]);

    let matches = [];
    if (teams.length > 0) {
      const result = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=$1 ORDER BY match_date ASC", [id]);
      matches = result.rows;
    }

    const { rows: users } = await pool.query("SELECT id, team FROM users ORDER BY team ASC");

    let isRegistered = false;
    if (req.isAuthenticated()) {
      const { rows: check } = await pool.query("SELECT * FROM tournament_teams WHERE tournament_id=$1 AND LOWER(team_name)=LOWER($2)", [id, req.user.team]);
      isRegistered = check.length > 0;
    }

    res.render("pages/tournament-detail", {
      tournament: tournament[0],
      teams,
      matches,
      isRegistered,
      user: req.user,
      users,
      leaderboard
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/tournaments/:id/register", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const { rows: playerCount } = await pool.query(
      "SELECT COUNT(*) AS total FROM players WHERE LOWER(team)=LOWER($1)",
      [req.user.team]
    );
    if (playerCount[0].total < 5) {
      return res.redirect('/tournaments/' + id + '?error=roster');
    }

    const { rows: check } = await pool.query(
      "SELECT * FROM tournament_teams WHERE tournament_id=$1 AND LOWER(team_name)=LOWER($2)",
      [id, req.user.team]
    );

    if (check.length === 0) {
      await pool.query(
        "INSERT INTO tournament_teams (tournament_id, team_name) VALUES ($1, $2)",
        [id, req.user.team]
      );
    }
    res.redirect(`/tournaments/${id}`);
  } catch (err) {
    console.log(err);
    res.redirect(`/tournaments/${id}`);
  }
});

app.get("/standings", async (req, res) => {
  try {
    const { rows: tournaments } = await pool.query("SELECT * FROM tournaments ORDER BY id DESC");
    const { rows: allMatches } = await pool.query(`
      SELECT m.*, t.name AS tournament_name 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      ORDER BY m.id ASC
    `);

    const matchesByTournament = {};
    allMatches.forEach(match => {
      if (!matchesByTournament[match.tournament_id]) {
        matchesByTournament[match.tournament_id] = [];
      }
      matchesByTournament[match.tournament_id].push(match);
    });

    const totalMatches = allMatches.length;

    res.render("pages/standings", {
      user: req.user, 
      tournaments,
      allMatches,
      matchesByTournament,
      totalMatches
    });
  } catch (err) {
    console.error("STANDINGS PAGE ERROR:", err);
    res.redirect("/");
  }
});

//Match Operations & Live Scoring 
app.get("/score-match/:matchId", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { matchId } = req.params;

  try {
    const { rows: targetMatch } = await pool.query(`
      SELECT m.tournament_id, t.created_by, t.name AS tournament_name
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [matchId]);

    if (targetMatch.length === 0) return res.redirect("/admin");
    if (targetMatch[0].created_by !== req.user.id && !req.user.is_admin) return res.status(403).send("Unauthorized");

    const tournamentId = targetMatch[0].tournament_id;
    const tournamentName = targetMatch[0].tournament_name;

    const { rows: matches } = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=$1 ORDER BY id ASC", [tournamentId]);

    res.render("pages/live-score", {
      matches,
      selectedMatchId: matchId,
      tournamentName        
    });
  } catch (err) {
    console.error("LIVE SCORE ERROR:", err);
    res.redirect("/admin");
  }
});

app.post("/matches/:id/set-live", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const { rows: matchCheck } = await pool.query(`
      SELECT m.tournament_id, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [id]);

    if (matchCheck.length === 0) return res.redirect("/admin");
    if (matchCheck[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized");
    }

    await pool.query("UPDATE tournament_matches SET status='LIVE' WHERE id=$1", [id]);

    res.redirect(`/manage-tournaments/${matchCheck[0].tournament_id}`);
  } catch (err) {
    console.error("SET LIVE ERROR:", err);
    res.redirect("/admin");
  }
});

app.post("/matches/:id/edit-date", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { match_date } = req.body;

  try {
    const { rows: matchCheck } = await pool.query(`
      SELECT m.tournament_id, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [id]);

    if (matchCheck.length === 0) return res.redirect("/admin");
    if (matchCheck[0].created_by !== req.user.id && !req.user.is_admin) return res.status(403).send("Unauthorized");

    await pool.query("UPDATE tournament_matches SET match_date=$1 WHERE id=$2", [match_date || null, id]);
    res.redirect(`/manage-tournaments/${matchCheck[0].tournament_id}`);
  } catch (err) {
    console.error("EDIT MATCH DATE ERROR:", err);
    res.redirect("/admin");
  }
});

app.post("/matches/:id/edit-teams", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { teamA, teamB } = req.body;

  try {
    const { rows: matchResult } = await pool.query(`
      SELECT m.tournament_id, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [id]);

    if (matchResult.length === 0) return res.redirect("/manage-tournaments");

    if (matchResult[0].created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    await pool.query("UPDATE tournament_matches SET teama=$1, teamb=$2 WHERE id=$3", [teamA, teamB, id]);

    res.redirect(`/manage-tournaments/${matchResult[0].tournament_id}`);
  } catch (err) {
    console.error("EDIT MATCH ERROR:", err);
    res.redirect("/manage-tournaments");
  }
});

app.post("/matches/:id/result", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;
  const { scoreA, scoreB } = req.body;

  try {
    const { rows: matchResult } = await pool.query(`
      SELECT m.*, t.created_by 
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [id]);

    if (matchResult.length === 0) return res.redirect("/tournaments");
    const currentMatch = matchResult[0];

    if (currentMatch.created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    let winner;
    if (parseInt(scoreA) > parseInt(scoreB)) {
      winner = currentMatch.teama;
    } else if (parseInt(scoreB) > parseInt(scoreA)) {
      winner = currentMatch.teamb;
    } else {
      winner = "DRAW";
    }

    await pool.query(
      "UPDATE tournament_matches SET scorea=$1, scoreb=$2, status='FINAL', winner=$3 WHERE id=$4",
      [scoreA, scoreB, winner, id]
    );

    await pool.query(
      "UPDATE tournament_teams SET matches_played=0, wins=0, losses=0, ties=0, points=0 WHERE tournament_id=$1",
      [currentMatch.tournament_id]
    );

    const { rows: completedMatches } = await pool.query(
      "SELECT teama, teamb, winner FROM tournament_matches WHERE tournament_id=$1 AND status='FINAL'",
      [currentMatch.tournament_id]
    );

    const teamStats = {};
    completedMatches.forEach(m => {
      if (!teamStats[m.teama]) teamStats[m.teama] = { mp: 0, w: 0, l: 0, t: 0, pts: 0 };
      if (!teamStats[m.teamb]) teamStats[m.teamb] = { mp: 0, w: 0, l: 0, t: 0, pts: 0 };

      teamStats[m.teama].mp++;
      teamStats[m.teamb].mp++;

      if (m.winner === "DRAW") {
        teamStats[m.teama].t++; teamStats[m.teama].pts += 1;
        teamStats[m.teamb].t++; teamStats[m.teamb].pts += 1;
      } else if (m.winner === m.teama) {
        teamStats[m.teama].w++; teamStats[m.teama].pts += 2;
        teamStats[m.teamb].l++;
      } else if (m.winner === m.teamb) {
        teamStats[m.teamb].w++; teamStats[m.teamb].pts += 2;
        teamStats[m.teama].l++;
      }
    });

    for (const [teamName, stats] of Object.entries(teamStats)) {
      if (teamName !== "BYE" && teamName !== "TBD") {
        await pool.query(
          "UPDATE tournament_teams SET matches_played=$1, wins=$2, losses=$3, ties=$4, points=$5 WHERE tournament_id=$6 AND team_name=$7",
          [stats.mp, stats.w, stats.l, stats.t, stats.pts, currentMatch.tournament_id, teamName]
        );
      }
    }

    if (!currentMatch.round.includes("STAGE") && currentMatch.round !== "CUSTOM MATCH" && winner !== "DRAW" && currentMatch.round !== "FINAL") {
      const { rows: allMatches } = await pool.query("SELECT * FROM tournament_matches WHERE tournament_id=$1 ORDER BY id ASC", [currentMatch.tournament_id]);
      const uniqueRounds = [...new Set(allMatches.map(m => m.round))];
      const currentRoundIndex = uniqueRounds.indexOf(currentMatch.round);

      if (currentRoundIndex !== -1 && currentRoundIndex + 1 < uniqueRounds.length) {
        const nextRoundName = uniqueRounds[currentRoundIndex + 1];
        const currentRoundMatches = allMatches.filter(m => m.round === currentMatch.round);
        const nextRoundMatches = allMatches.filter(m => m.round === nextRoundName);

        const myIndexInRound = currentRoundMatches.findIndex(m => m.id === currentMatch.id);
        const targetNextMatchIndex = Math.floor(myIndexInRound / 2);
        const targetNextMatch = nextRoundMatches[targetNextMatchIndex];

        if (targetNextMatch) {
          if (myIndexInRound % 2 === 0) {
            await pool.query("UPDATE tournament_matches SET teama=$1 WHERE id=$2", [winner, targetNextMatch.id]);
          } else {
            await pool.query("UPDATE tournament_matches SET teamb=$1 WHERE id=$2", [winner, targetNextMatch.id]);
          }
        }
      }
    }

    res.redirect(`/tournaments/${currentMatch.tournament_id}`);
  } catch (err) {
    console.error("SCORE UPDATE ERROR:", err);
    res.redirect("/manage-tournaments");
  }
});

app.post("/matches/:id/revert", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const { id } = req.params;

  try {
    const { rows: matchResult } = await pool.query(`
      SELECT m.*, t.created_by
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [id]);

    if (matchResult.length === 0) return res.redirect("/manage-tournaments");
    const currentMatch = matchResult[0];

    if (currentMatch.created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).send("Unauthorized action.");
    }

    await pool.query(
      "UPDATE tournament_matches SET status='UPCOMING', scorea=0, scoreb=0, winner=NULL WHERE id=$1",
      [id]
    );

    await pool.query(
      "UPDATE tournament_teams SET matches_played=0, wins=0, losses=0, ties=0, points=0 WHERE tournament_id=$1",
      [currentMatch.tournament_id]
    );

    const { rows: completedMatches } = await pool.query(
      "SELECT teama, teamb, winner FROM tournament_matches WHERE tournament_id=$1 AND status='FINAL'",
      [currentMatch.tournament_id]
    );

    const teamStats = {};
    completedMatches.forEach(m => {
      if (!teamStats[m.teama]) teamStats[m.teama] = { mp: 0, w: 0, l: 0, t: 0, pts: 0 };
      if (!teamStats[m.teamb]) teamStats[m.teamb] = { mp: 0, w: 0, l: 0, t: 0, pts: 0 };
      teamStats[m.teama].mp++;
      teamStats[m.teamb].mp++;
      if (m.winner === "DRAW") {
        teamStats[m.teama].t++; teamStats[m.teama].pts += 1;
        teamStats[m.teamb].t++; teamStats[m.teamb].pts += 1;
      } else if (m.winner === m.teama) {
        teamStats[m.teama].w++; teamStats[m.teama].pts += 2;
        teamStats[m.teamb].l++;
      } else if (m.winner === m.teamb) {
        teamStats[m.teamb].w++; teamStats[m.teamb].pts += 2;
        teamStats[m.teama].l++;
      }
    });

    for (const [teamName, stats] of Object.entries(teamStats)) {
      if (teamName !== "BYE" && teamName !== "TBD") {
        await pool.query(
          "UPDATE tournament_teams SET matches_played=$1, wins=$2, losses=$3, ties=$4, points=$5 WHERE tournament_id=$6 AND team_name=$7",
          [stats.mp, stats.w, stats.l, stats.t, stats.pts, currentMatch.tournament_id, teamName]
        );
      }
    }

    res.redirect(`/manage-tournaments/${currentMatch.tournament_id}`);
  } catch (err) {
    console.error("REVERT MATCH ERROR:", err);
    res.redirect("/manage-tournaments");
  }
});

app.get("/live", async (req, res) => {
  try {
    let { rows: result } = await pool.query("SELECT id FROM tournament_matches WHERE status='LIVE' LIMIT 1");
    if (result.length > 0) return res.redirect(`/live/${result[0].id}`);

    const resultTwo = await pool.query("SELECT id FROM tournament_matches WHERE match_date = CURRENT_DATE LIMIT 1");
    result = resultTwo.rows;
    if (result.length > 0) return res.redirect(`/live/${result[0].id}`);

    const resultThree = await pool.query("SELECT id FROM tournament_matches ORDER BY id ASC LIMIT 1");
    result = resultThree.rows;
    if (result.length > 0) return res.redirect(`/live/${result[0].id}`);

    res.send("No matches available");
  } catch (err) {
    console.log(err);
    res.send("Error loading live page");
  }
});

app.get("/live/:matchId", async (req, res) => {
  const matchId = req.params.matchId;
  try {
    const { rows: matchResult } = await pool.query(`
      SELECT m.*, t.name AS tournament_name
      FROM tournament_matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [matchId]);
    if (matchResult.length === 0) return res.send("Match not found");
    const match = matchResult[0];

    const { rows: teamAPlayers } = await pool.query("SELECT * FROM players WHERE LOWER(team)=LOWER($1)", [match.teama]);
    const { rows: teamBPlayers } = await pool.query("SELECT * FROM players WHERE LOWER(team)=LOWER($1)", [match.teamb]);

    res.render("pages/live", {
      matchId,
      match,            
      teamAPlayers,
      teamBPlayers
    });
  } catch (err) {
    console.log("LIVE PAGE ERROR:", err);
    res.send("Error loading live page");
  }
});

/* SOCKET.IO SCORING ENGINE
*/
const httpServer = createServer(app);
const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log("[Socket] Client connected:", socket.id);

  socket.on("update_score", async ({ matchId, scorea, scoreb }) => {
    console.log(`[Socket] update_score received → match:${matchId} A:${scorea} B:${scoreb}`);
    try {
      await pool.query(
        "UPDATE tournament_matches SET scorea=$1, scoreb=$2 WHERE id=$3",
        [scorea, scoreb, matchId]
      );
    } catch (err) {
      console.error("[Socket] update_score DB ERROR:", err.message);
    }
    io.emit(`match_${matchId}`, { scorea, scoreb });
  });

  socket.on("new_event", async ({ matchId, time, text, type, team, quarter }) => {
    console.log(`[Socket] new_event received → match:${matchId} type:${type} team:${team} time:${time} text:"${text}"`);

    try {
      const { rows: matchRows } = await pool.query(
        "SELECT teama, teamb FROM tournament_matches WHERE id=$1",
        [matchId]
      );
      const teamName = matchRows.length
        ? (team === "A" ? matchRows[0].teama : matchRows[0].teamb)
        : null;

      const enumMap = {
        score: "2PT_MAKE", foul: "FOUL", block: "BLOCK",
        steal: "STEAL", assist: "ASSIST", rebound: "REBOUND",
        timeout: "TIMEOUT", turnover: "TURNOVER",
      };
      const dbEventType = enumMap[type] || null;

      if (dbEventType) {
        await pool.query(
          `INSERT INTO game_events (match_id, team_name, event_type, game_clock, quarter)
           VALUES ($1, $2, $3, $4, $5)`,
          [matchId, teamName, dbEventType, time || null, quarter || 1]
        );
        console.log(`[Socket] new_event saved to DB → team_name:${teamName} event_type:${dbEventType}`);
      } else {
        console.warn(`[Socket] new_event skipped DB insert — no ENUM mapping for type:"${type}"`);
      }
    } catch (err) {
      console.error("[Socket] new_event DB ERROR:", err.message);
    }

    io.emit(`event_${matchId}`, { time, text, type });
  });

  socket.on("update_clock", ({ matchId, time, quarter, running }) => {
    io.emit(`clock_${matchId}`, { time, quarter, running });
  });

  socket.on("update_live_minutes", (data) => {
    io.emit('update_live_minutes', data);
  });

  socket.on("update_player_stats", async (data) => {
    const { matchId, playerId, points, fouls, assists, rebounds, steals, blocks, seconds_played } = data;
    console.log(`[Socket] update_player_stats received → match:${matchId} player:${playerId} pts:${points} fls:${fouls} ast:${assists} reb:${rebounds}`);

    try {
      const { rows: statusCheck } = await pool.query(
        "SELECT status FROM tournament_matches WHERE id=$1",
        [matchId]
      );
      if (statusCheck.length > 0 && statusCheck[0].status === "FINAL") {
        console.warn(`[Socket] update_player_stats BLOCKED — match ${matchId} is FINAL`);
        return; 
      }
    } catch (err) {
      console.error("[Socket] update_player_stats status check ERROR:", err.message);
      return; 
    }

    try {
      const sp = seconds_played || 0;
      await pool.query(`
        INSERT INTO player_match_stats (match_id, player_id, points, fouls, assists, rebounds, steals, blocks, seconds_played) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (match_id, player_id) DO UPDATE SET 
          points=EXCLUDED.points, fouls=EXCLUDED.fouls, assists=EXCLUDED.assists, 
          rebounds=EXCLUDED.rebounds, steals=EXCLUDED.steals, blocks=EXCLUDED.blocks,
          seconds_played=EXCLUDED.seconds_played
      `, [matchId, playerId, points, fouls, assists, rebounds, steals || 0, blocks || 0, sp]);
    } catch (dbErr) {
      console.error("[Socket] DB save error:", dbErr.message);
    }

    io.emit(`player_stats_${matchId}`, data);
  });

  socket.on("disconnect", () => {
    console.log("[Socket] Client disconnected:", socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`🏀 CourtCommand Server running on port ${port}`);
});