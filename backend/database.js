const Database = require("better-sqlite3");
const path     = require("path");

const db = new Database(path.join(__dirname, "portfolio.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS investments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    name           TEXT NOT NULL,
    ticker         TEXT NOT NULL,
    asset_type     TEXT NOT NULL DEFAULT 'other',
    quantity       REAL NOT NULL,
    purchase_price REAL NOT NULL,
    current_price  REAL NOT NULL,
    target_weight  REAL NOT NULL DEFAULT 0,
    purchase_date  TEXT DEFAULT (date('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    investment_id    INTEGER NOT NULL REFERENCES investments(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy','sell')),
    quantity         REAL NOT NULL,
    price            REAL NOT NULL,
    timestamp        TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;