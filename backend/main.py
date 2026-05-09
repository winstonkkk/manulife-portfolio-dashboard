from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routers import auth, portfolio, transactions, price

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Manulife Portfolio Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api")
app.include_router(portfolio.router,    prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(price.router,        prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}
