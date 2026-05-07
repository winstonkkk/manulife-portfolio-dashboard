const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const db      = require("../database");
const verify  = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
// Creates a new user. Password is hashed with bcrypt before storage.
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }

  const existing = db.prepare(
    "SELECT id FROM users WHERE username = ? OR email = ?"
  ).get(username, email);

  if (existing) {
    return res.status(409).json({ error: "Username or email already in use" });
  }

  // Hash the password – never store plain text
  const hashedPassword = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
  ).run(username, email, hashedPassword);

  res.status(201).json({ message: "Account created", userId: result.lastInsertRowid });
});

// POST /api/auth/login
// Validates credentials and returns a signed JWT (valid 24 hours).
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  // Same error message for both cases to avoid leaking which usernames exist
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({ token, username: user.username });
});

// GET /api/auth/me  (protected)
// Returns the currently logged-in user's public info.
router.get("/me", verify, (req, res) => {
  const user = db.prepare(
    "SELECT id, username, email, created_at FROM users WHERE id = ?"
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

module.exports = router;