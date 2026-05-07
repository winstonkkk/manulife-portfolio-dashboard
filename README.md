# Portfolio Management Dashboard

A full-stack investment portfolio management app.

- **Frontend**: React 18, Recharts
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Infra**: Docker Compose + Nginx

## Quick Start

```bash
docker compose up --build
```

Open http://localhost:3000

## Features
- Register / Login / Logout with JWT
- Portfolio dashboard with pie chart and summary
- Add, edit, delete investments (stocks, bonds, mutual funds)
- Transaction history (buy / sell)

## Stop
```bash
docker compose down
```