from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.models import BudgetCreate, BudgetResponse, BudgetWithSpending

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


class StartingBalanceUpdate(BaseModel):
    starting_balance: float = Field(..., ge=0)


def serialize_budget(b: dict) -> dict:
    return {
        "id": str(b["_id"]),
        "month_year": b["month_year"],
        "overall_limit": b["overall_limit"],
        "starting_balance": float(b.get("starting_balance", 10000.0)),
        "category_limits": b.get("category_limits", {}),
    }


@router.post("", response_model=BudgetResponse, status_code=201)
@router.post("/", response_model=BudgetResponse, status_code=201, include_in_schema=False)
async def create_or_update_budget(body: BudgetCreate):
    db = get_database()
    cats = {k.value if hasattr(k, "value") else str(k): float(v) for k, v in body.category_limits.items()}
    overall = float(body.overall_limit)
    if overall <= 0 and cats:
        overall = round(sum(cats.values()), 2)

    starting_balance = float(body.starting_balance) if hasattr(body, "starting_balance") and body.starting_balance is not None else 10000.0

    doc = {
        "month_year": body.month_year,
        "overall_limit": overall,
        "starting_balance": starting_balance,
        "category_limits": cats,
        "updated_at": datetime.utcnow(),
    }
    result = await db.budgets.find_one_and_update(
        {"month_year": body.month_year},
        {"$set": doc},
        upsert=True,
        return_document=True,
    )
    return serialize_budget(result)


@router.patch("/{month_year}/starting-balance", response_model=BudgetResponse)
async def update_starting_balance(month_year: str, body: StartingBalanceUpdate):
    db = get_database()
    result = await db.budgets.find_one_and_update(
        {"month_year": month_year},
        {"$set": {"starting_balance": body.starting_balance, "updated_at": datetime.utcnow()}},
        upsert=True,
        return_document=True,
    )
    return serialize_budget(result)


@router.get("/{month_year}", response_model=BudgetWithSpending)
async def get_budget(month_year: str):
    db = get_database()

    budget = await db.budgets.find_one({"month_year": month_year})

    # Calculate spending totals for the month
    try:
        year, mon = month_year.split("-")
        start = datetime(int(year), int(mon), 1)
        end = datetime(int(year) + 1, 1, 1) if int(mon) == 12 else datetime(int(year), int(mon) + 1, 1)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid month_year format. Use YYYY-MM")

    pipeline = [
        {"$match": {"date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
    ]
    category_cursor = db.transactions.aggregate(pipeline)
    category_docs = await category_cursor.to_list(length=100)

    category_spent = {doc["_id"]: round(doc["total"], 2) for doc in category_docs}
    overall_spent = round(sum(category_spent.values()), 2)

    if not budget:
        return {
            "id": "",
            "month_year": month_year,
            "overall_limit": 0.0,
            "starting_balance": 10000.0,
            "overall_spent": overall_spent,
            "category_limits": {},
            "category_spent": category_spent,
        }

    return {
        "id": str(budget["_id"]),
        "month_year": budget["month_year"],
        "overall_limit": budget["overall_limit"],
        "starting_balance": float(budget.get("starting_balance", 10000.0)),
        "overall_spent": overall_spent,
        "category_limits": budget.get("category_limits", {}),
        "category_spent": category_spent,
    }
