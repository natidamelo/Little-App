import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_to_mongo, close_mongo_connection
from app.routes import transactions, budgets, analytics, planner


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="SpendPulse API",
    description="Personal Expense & Budget Control API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local development and deployed frontend (Vercel)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env.strip() == "*":
    origins = ["*"]
    allow_credentials = False
elif allowed_origins_env.strip():
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
    allow_credentials = True
else:
    # Default to localhost and allow all Vercel deployments via regex
    origins = ["http://localhost:3000"]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:.*" if origins != ["*"] else None,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(analytics.router)
app.include_router(planner.router)


@app.get("/")
async def root():
    return {"message": "SpendPulse API is running", "docs": "/docs"}


@app.get("/api/health")
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SpendPulse API"}
