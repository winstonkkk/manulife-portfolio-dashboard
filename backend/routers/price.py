"""
Real-time price endpoint using Yahoo Finance (yfinance) — free, no API key needed.
Falls back gracefully if ticker not found.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Investment, PortfolioSnapshot
from security import get_current_user
from models import User
import yfinance as yf

router = APIRouter(prefix="/price", tags=["price"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.get("/{ticker}")
def fetch_price(ticker: str):
    try:
        t    = yf.Ticker(ticker.upper())
        info = t.fast_info
        price = round(float(info.last_price), 4)
        return {"ticker": ticker.upper(), "price": price}
    except Exception:
        raise HTTPException(404, f"Could not fetch price for {ticker}")

@router.post("/refresh-all")
def refresh_all_prices(db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    investments = db.query(Investment).filter(Investment.user_id==current_user.id).all()
    updated = []
    for inv in investments:
        try:
            t     = yf.Ticker(inv.ticker.upper())
            price = round(float(t.fast_info.last_price), 4)
            inv.current_price = price
            updated.append({"ticker": inv.ticker, "price": price})
        except Exception:
            pass
    db.commit()
    # save snapshot after refresh
    total = sum(i.quantity * i.current_price for i in investments)
    db.add(PortfolioSnapshot(user_id=current_user.id, total_value=total))
    db.commit()
    return {"updated": updated, "count": len(updated)}
