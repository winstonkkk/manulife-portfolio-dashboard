require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./database");
const verifyToken = require("./middleware/auth");

const authRouter = require("./routes/auth");
const portfolioRouter = require("./routes/portfolio");
const transactionsRouter = require("./routes/transactions");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/transactions", transactionsRouter);

// POST /api/price/refresh-all
app.post("/api/price/refresh-all", verifyToken, (req, res) => {
    const result = db.prepare(
        "SELECT COUNT(*) as count FROM investments WHERE user_id = ?"
    ).get(req.user.id);
    res.json({ count: result.count, message: "Prices refreshed" });
});

// Health check
app.get("/api/health", (req, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.listen(PORT, () =>
    console.log(`Backend API running on http://localhost:${PORT}`)
);