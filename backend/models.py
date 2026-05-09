from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id       = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    investments = relationship("Investment", back_populates="owner", cascade="all, delete")

class Investment(Base):
    __tablename__ = "investments"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String)
    ticker        = Column(String)
    quantity      = Column(Float, default=0)
    purchase_price= Column(Float)
    current_price = Column(Float)
    asset_class   = Column(String, default="Equity")   # NEW: Equity/Bond/Cash/Other
    target_weight = Column(Float, default=0)            # NEW: target allocation %
    user_id       = Column(Integer, ForeignKey("users.id"))
    owner         = relationship("User", back_populates="investments")
    transactions  = relationship("Transaction", back_populates="investment", cascade="all, delete")

class Transaction(Base):
    __tablename__ = "transactions"
    id               = Column(Integer, primary_key=True, index=True)
    investment_id    = Column(Integer, ForeignKey("investments.id"))
    transaction_type = Column(String)   # buy / sell
    quantity         = Column(Float)
    price            = Column(Float)
    total            = Column(Float)
    timestamp        = Column(DateTime, default=datetime.datetime.utcnow)
    investment       = relationship("Investment", back_populates="transactions")

class PortfolioSnapshot(Base):             # NEW: history snapshots
    __tablename__ = "portfolio_snapshots"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"))
    total_value = Column(Float)
    timestamp   = Column(DateTime, default=datetime.datetime.utcnow)
