const express = require("express");
const db      = require("../database");
const verify  = require("../middleware/auth");

const router = express.Router();

router.use(verify);

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// GET /api/portfolio
router.get("/", (req, res) => {
  const investments = db.prepare(
    "SELECT * FROM investments WHERE user_id = ? ORDER BY id DESC"
  ).all(req.user.id);

  const enriched = investments.map((inv) => {
    const value       = round(inv.current_price * inv.quantity);
    const totalCost   = round(inv.purchase_price * inv.quantity);
    const gainLoss    = round(value - totalCost);
    const gainLossPct = totalCost > 0 ? round((gainLoss / totalCost) * 100) : 0;
    return {
      ...inv,
      asset_class:   inv.asset_type,
      value,
      total_cost:    totalCost,
      gain_loss:     gainLoss,
      gain_loss_pct: gainLossPct,
    };
  });

  const totalValue = enriched.reduce((sum, i) => sum + i.value,     0);
  const totalCost  = enriched.reduce((sum, i) => sum + i.total_cost, 0);
  const gainLoss   = round(totalValue - totalCost);
  const returnPct  = totalCost > 0 ? round((gainLoss / totalCost) * 100) : 0;

  res.json({
    summary: {
      total_value: round(totalValue),
      total_cost:  round(totalCost),
      gain_loss:   gainLoss,
      return_pct:  returnPct,
    },
    investments: enriched,
  });
});

// GET /api/portfolio/history
router.get("/history", (req, res) => {
  const investments = db.prepare(
    "SELECT current_price, quantity FROM investments WHERE user_id = ?"
  ).all(req.user.id);

  if (investments.length === 0) return res.json([]);

  const totalValue = investments.reduce(
    (sum, inv) => sum + inv.current_price * inv.quantity, 0
  );

  res.json([{
    timestamp:   new Date().toISOString(),
    total_value: round(totalValue),
  }]);
});

// POST /api/portfolio
router.post("/", (req, res) => {
  const {
    name,
    ticker,
    quantity,
    purchase_price,
    current_price,
    asset_type,
    asset_class,
    target_weight,
  } = req.body;


  const finalAssetType = asset_type || asset_class || "other";

  if (!name || !ticker || !quantity || !purchase_price || !current_price) {
    return res.status(400).json({ error: "All fields are required" });
  }


  let result;
  try {
    result = db.prepare(`
      INSERT INTO investments (user_id, name, ticker, asset_type, quantity, purchase_price, current_price, target_weight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name, ticker, finalAssetType, quantity, purchase_price, current_price, target_weight || 0);
  } catch {
    result = db.prepare(`
      INSERT INTO investments (user_id, name, ticker, asset_type, quantity, purchase_price, current_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name, ticker, finalAssetType, quantity, purchase_price, current_price);
  }

  db.prepare(`
    INSERT INTO transactions (user_id, investment_id, transaction_type, quantity, price)
    VALUES (?, ?, 'buy', ?, ?)
  `).run(req.user.id, result.lastInsertRowid, quantity, purchase_price);

  const created = db.prepare("SELECT * FROM investments WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/portfolio/:id
router.put("/:id", (req, res) => {
  const inv = db.prepare(
    "SELECT * FROM investments WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!inv) return res.status(404).json({ error: "Investment not found" });

  const name          = req.body.name          ?? inv.name;
  const ticker        = req.body.ticker        ?? inv.ticker;
  const quantity      = req.body.quantity      ?? inv.quantity;
  const current_price = req.body.current_price ?? inv.current_price;
  const asset_type    = req.body.asset_type || req.body.asset_class || inv.asset_type;
  const target_weight = req.body.target_weight ?? inv.target_weight;

  try {
    db.prepare(`
      UPDATE investments SET name=?, ticker=?, asset_type=?, quantity=?, current_price=?, target_weight=?
      WHERE id=? AND user_id=?
    `).run(name, ticker, asset_type, quantity, current_price, target_weight || 0, req.params.id, req.user.id);
  } catch {
    db.prepare(`
      UPDATE investments SET name=?, ticker=?, asset_type=?, quantity=?, current_price=?
      WHERE id=? AND user_id=?
    `).run(name, ticker, asset_type, quantity, current_price, req.params.id, req.user.id);
  }

  res.json(db.prepare("SELECT * FROM investments WHERE id=?").get(req.params.id));
});

// DELETE /api/portfolio/:id
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