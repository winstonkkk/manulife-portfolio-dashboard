from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Investment, User, PortfolioSnapshot
from security import get_current_user
from pydantic import BaseModel
from typing import Optional
import datetime

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class InvestmentCreate(BaseModel):
    name:          str
    ticker:        str
    quantity:      float
    purchase_price:float
    current_price: float
    asset_class:   Optional[str] = "Equity"
    target_weight: Optional[float] = 0

class InvestmentUpdate(BaseModel):
    name:          Optional[str]
    ticker:        Optional[str]
    quantity:      Optional[float]
    purchase_price:Optional[float]
    current_price: Optional[float]
    asset_class:   Optional[str]
    target_weight: Optional[float]

def _snapshot(db, user_id, investments):
    total = sum(i.quantity * i.current_price for i in investments)
    snap  = PortfolioSnapshot(user_id=user_id, total_value=total)
    db.add(snap); db.commit()

@router.get("")
def get_portfolio(db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    total_value = sum(i.quantity * i.current_price for i in investments)
    total_cost  = sum(i.quantity * i.purchase_price for i in investments)
    gain_loss   = total_value - total_cost
    gain_pct    = (gain_loss / total_cost * 100) if total_cost else 0

    # allocation actual vs target
    allocation = {}
    for inv in investments:
        cls = inv.asset_class or "Other"
        allocation[cls] = allocation.get(cls, 0) + inv.quantity * inv.current_price

    return {
        "total_value":  round(total_value, 2),
        "total_cost":   round(total_cost,  2),
        "gain_loss":    round(gain_loss,   2),
        "gain_loss_pct":round(gain_pct,    2),
        "allocation":   {k: round(v, 2) for k, v in allocation.items()},
        "investments": [{
            "id":            i.id,
            "name":          i.name,
            "ticker":        i.ticker,
            "quantity":      i.quantity,
            "purchase_price":i.purchase_price,
            "current_price": i.current_price,
            "asset_class":   i.asset_class,
            "target_weight": i.target_weight,
            "value":         round(i.quantity * i.current_price, 2),
            "gain_loss":     round(i.quantity*(i.current_price - i.purchase_price), 2),
            "gain_loss_pct": round((i.current_price - i.purchase_price)/i.purchase_price*100, 2) if i.purchase_price else 0,
        } for i in investments]
    }

@router.post("")
def add_investment(data: InvestmentCreate,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    inv = Investment(**data.dict(), user_id=current_user.id)
    db.add(inv); db.commit(); db.refresh(inv)
    _snapshot(db, current_user.id,
              db.query(Investment).filter(Investment.user_id==current_user.id).all())
    return {"message": "Investment added", "id": inv.id}

@router.put("/{inv_id}")
def update_investment(inv_id: int, data: InvestmentUpdate,
                      db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    inv = db.query(Investment).filter(Investment.id==inv_id,
                                      Investment.user_id==current_user.id).first()
    if not inv: raise HTTPException(404, "Investment not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(inv, k, v)
    db.commit()
    _snapshot(db, current_user.id,
              db.query(Investment).filter(Investment.user_id==current_user.id).all())
    return {"message": "Updated"}

@router.delete("/{inv_id}")
def delete_investment(inv_id: int,
                      db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    inv = db.query(Investment).filter(Investment.id==inv_id,
                                      Investment.user_id==current_user.id).first()
    if not inv: raise HTTPException(404, "Not found")
    db.delete(inv); db.commit()
    return {"message": "Deleted"}

@router.get("/history")
def get_history(db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    snaps = db.query(PortfolioSnapshot)\
              .filter(PortfolioSnapshot.user_id==current_user.id)\
              .order_by(PortfolioSnapshot.timestamp).all()
    return [{"timestamp": s.timestamp.isoformat(), "total_value": s.total_value}
            for s in snaps]
