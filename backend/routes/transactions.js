const express = require("express");
const db      = require("../database");
const verify  = require("../middleware/auth");

const router = express.Router();

router.use(verify);

// GET /api/transactions
// Returns all transactions for the current user, newest first.
router.get("/", (req, res) => {
  const rows = db.prepare(`
    SELECT
      t.id,
      t.transaction_type,
      t.quantity,
      t.price,
      ROUND(t.quantity * t.price, 2) AS total,
      t.timestamp,
      i.name   AS investment_name,
      i.ticker AS ticker
    FROM transactions t
    LEFT JOIN investments i ON t.investment_id = i.id
    WHERE t.user_id = ?
    ORDER BY t.timestamp DESC
  `).all(req.user.id);

  res.json(rows);
});

// POST /api/transactions
// Records a buy or sell, then updates the investment quantity.
router.post("/", (req, res) => {
  const { investment_id, transaction_type, quantity, price } = req.body;

  if (!investment_id || !transaction_type || !quantity || !price) {
    return res.status(400).json({ error: "investment_id, transaction_type, quantity and price are required" });
  }

  const inv = db.prepare(
    "SELECT * FROM investments WHERE id=? AND user_id=?"
  ).get(investment_id, req.user.id);

  if (!inv) return res.status(404).json({ error: "Investment not found" });

  if (transaction_type === "sell" && inv.quantity < quantity) {
    return res.status(400).json({ error: "Insufficient quantity to sell" });
  }

  const result = db.prepare(`
    INSERT INTO transactions (user_id, investment_id, transaction_type, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, investment_id, transaction_type, quantity, price);

  // Update holding quantity
  const newQty = transaction_type === "buy"
    ? inv.quantity + quantity
    : inv.quantity - quantity;

  db.prepare("UPDATE investments SET quantity=? WHERE id=?").run(newQty, investment_id);

  res.status(201).json({ id: result.lastInsertRowid, message: "Transaction recorded" });
});

module.exports = router;