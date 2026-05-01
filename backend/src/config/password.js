import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import pool from "./db.js";

export default function configurePassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, cb) => {
        try {
          // Changed [rows] to { rows } and ? to $1
          const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

          if (rows.length === 0) return cb(null, false, { message: "User not found." });

          const user = rows[0];
          const valid = await bcrypt.compare(password, user.password);

          return valid ? cb(null, user) : cb(null, false, { message: "Incorrect password." });
        } catch (err) {
          return cb(err);
        }
      }
    )
  );

  passport.serializeUser((user, cb) => cb(null, user.id));

  passport.deserializeUser(async (id, cb) => {
    try {
      // Changed [rows] to { rows } and ? to $1
      const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
      cb(null, rows[0]);
    } catch (err) {
      cb(err);
    }
  });
}