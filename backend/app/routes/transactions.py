from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.models import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def serialize_transaction(t: dict) -> dict:
    return {
        "id": str(t["_id"]),
        "amount": t["amount"],
        "type": t.get("type", "Expense"),
        "category": t["category"],
        "date": t["date"].strftime("%Y-%m-%d") if hasattr(t["date"], "strftime") else str(t["date"]),
        "payment_method": t["payment_method"],
        "note": t.get("note"),
        "created_at": t["created_at"].isoformat() if hasattr(t["created_at"], "isoformat") else str(t["created_at"]),
    }


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(body: TransactionCreate):
    db = get_database()
    pm_val = body.payment_method.value if hasattr(body.payment_method, "value") else str(body.payment_method)
    cat_val = body.category.value if hasattr(body.category, "value") else str(body.category)
    doc = {
        "amount": body.amount,
        "type": body.type,
        "category": cat_val,
        "date": datetime.combine(body.date, datetime.min.time()),
        "payment_method": pm_val,
        "note": body.note,
        "created_at": datetime.utcnow(),
    }
    result = await db.transactions.insert_one(doc)
    created = await db.transactions.find_one({"_id": result.inserted_id})
    return serialize_transaction(created)


@router.get("/", response_model=list[TransactionResponse])
async def get_transactions(
    month: Optional[str] = Query(None, description="Filter by month YYYY-MM"),
    category: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
):
    db = get_database()
    query = {}

    if month:
        try:
            year, mon = month.split("-")
            start = datetime(int(year), int(mon), 1)
            if int(mon) == 12:
                end = datetime(int(year) + 1, 1, 1)
            else:
                end = datetime(int(year), int(mon) + 1, 1)
            query["date"] = {"$gte": start, "$lt": end}
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    if category:
        query["category"] = category

    cursor = db.transactions.find(query).sort("date", -1).limit(limit)
    transactions = await cursor.to_list(length=limit)
    return [serialize_transaction(t) for t in transactions]


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(transaction_id: str, body: TransactionUpdate):
    db = get_database()
    try:
        oid = ObjectId(transaction_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    update_data = {}
    if body.amount is not None:
        update_data["amount"] = body.amount
    if body.type is not None:
        update_data["type"] = body.type
    if body.category is not None:
        update_data["category"] = body.category.value if hasattr(body.category, "value") else str(body.category)
    if body.date is not None:
        update_data["date"] = datetime.combine(body.date, datetime.min.time())
    if body.payment_method is not None:
        update_data["payment_method"] = (
            body.payment_method.value if hasattr(body.payment_method, "value") else str(body.payment_method)
        )
    if body.note is not None:
        update_data["note"] = body.note

    if not update_data:
        raise HTTPException(status_code=400, detail="No update fields provided")

    result = await db.transactions.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")

    updated = await db.transactions.find_one({"_id": oid})
    return serialize_transaction(updated)


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(transaction_id: str):
    db = get_database()
    try:
        oid = ObjectId(transaction_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    result = await db.transactions.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
