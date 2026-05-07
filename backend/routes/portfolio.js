const express = require("express");
const db      = require("../database");
const verify  = require("../middleware/auth");

const router = express.Router();

// All routes require a valid JWT
router.use(verify);

// Helper: round to 2 decimal places
function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// GET /api/portfolio
// Returns all investments + portfolio-level summary for the logged-in user.
router.get("/", (req, res) => {
  const investments = db.prepare(
    "SELECT * FROM investments WHERE user_id = ? ORDER BY id DESC"
  ).all(req.user.id);

  // Calculate per-investment performance metrics
  const enriched = investments.map((inv) => {
    const totalValue  = inv.current_price  * inv.quantity;
    const totalCost   = inv.purchase_price * inv.quantity;
    const gainLoss    = totalValue - totalCost;
    const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
    return {
      ...inv,
      total_value:   round(totalValue),
      total_cost:    round(totalCost),
      gain_loss:     round(gainLoss),
      gain_loss_pct: round(gainLossPct),
    };
  });

  // Portfolio-level summary
  const totalValue = enriched.reduce((sum, i) => sum + i.total_value, 0);
  const totalCost  = enriched.reduce((sum, i) => sum + i.total_cost,  0);
  const gainLoss   = totalValue - totalCost;
  const returnPct  = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  res.json({
    summary: {
      total_value: round(totalValue),
      total_cost:  round(totalCost),
      gain_loss:   round(gainLoss),
      return_pct:  round(returnPct),
    },
    investments: enriched,
  });
});

// POST /api/portfolio
// Adds a new investment and records an initial "buy" transaction.
router.post("/", (req, res) => {
  const { name, ticker, asset_type, quantity, purchase_price, current_price } = req.body;

  if (!name || !ticker || !asset_type || !quantity || !purchase_price || !current_price) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!["stock", "bond", "mutual_fund"].includes(asset_type)) {
    return res.status(400).json({ error: "asset_type must be stock, bond or mutual_fund" });
  }

  const result = db.prepare(`
    INSERT INTO investments (user_id, name, ticker, asset_type, quantity, purchase_price, current_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, ticker, asset_type, quantity, purchase_price, current_price);

  // Record the initial buy as a transaction for the audit trail
  db.prepare(`
    INSERT INTO transactions (user_id, investment_id, transaction_type, quantity, price)
    VALUES (?, ?, 'buy', ?, ?)
  `).run(req.user.id, result.lastInsertRowid, quantity, purchase_price);

  const created = db.prepare("SELECT * FROM investments WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/portfolio/:id
// Updates name, ticker, quantity, or current_price of an investment.
router.put("/:id", (req, res) => {
  const inv = db.prepare(
    "SELECT * FROM investments WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!inv) return res.status(404).json({ error: "Investment not found" });

  const name          = req.body.name          ?? inv.name;
  const ticker        = req.body.ticker        ?? inv.ticker;
  const quantity      = req.body.quantity      ?? inv.quantity;
  const current_price = req.body.current_price ?? inv.current_price;

  db.prepare(`
    UPDATE investments SET name=?, ticker=?, quantity=?, current_price=?
    WHERE id=? AND user_id=?
  `).run(name, ticker, quantity, current_price, req.params.id, req.user.id);

  res.json(db.prepare("SELECT * FROM investments WHERE id=?").get(req.params.id));
});

// DELETE /api/portfolio/:id
// Removes an investment and its related transactions.
router.delete("/:id", (req, res) => {
  const inv = db.prepare(
    "SELECT * FROM investments WHERE id=? AND user_id=?"
  ).get(req.params.id, req.user.id);

  if (!inv) return res.status(404).json({ error: "Investment not found" });

  db.prepare("DELETE FROM transactions WHERE investment_id=?").run(req.params.id);
  db.prepare("DELETE FROM investments  WHERE id=?").run(req.params.id);

  res.status(204).send();
});

module.exports = router;