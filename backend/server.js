// ─────────────────────────────────────────────────────────────
// server.js  –  Express app entry point
//
// This file:
//   1. Loads environment variables (.env)
//   2. Creates the Express app
//   3. Registers global middleware (CORS, JSON parsing)
//   4. Mounts the route modules under /api/...
//   5. Starts listening on a port
// ─────────────────────────────────────────────────────────────

require("dotenv").config();              // load .env variables (e.g. JWT_SECRET, PORT)

const express = require("express");
const cors    = require("cors");

const authRouter         = require("./routes/auth");
const portfolioRouter    = require("./routes/portfolio");
const transactionsRouter = require("./routes/transactions");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global middleware ─────────────────────────────────────────

// Allow requests from the React frontend (different port in dev)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// ── Route mounting ────────────────────────────────────────────

app.use("/api/auth",         authRouter);         // /api/auth/register, /login, /me
app.use("/api/portfolio",    portfolioRouter);     // /api/portfolio  (CRUD investments)
app.use("/api/transactions", transactionsRouter);  // /api/transactions

// Health check – useful to confirm the container is running
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});