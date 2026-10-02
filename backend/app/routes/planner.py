from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Dict, List, Optional

from app.database import get_database
from app.models import (
    PlannerConfig,
    PlannerResponse,
    FixedExpenseItem,
    ApplyBudgetRequest,
    CategoryEnum,
)

router = APIRouter(prefix="/api/planner", tags=["planner"])

DEFAULT_FIXED_ITEMS: List[dict] = []

DEFAULT_VARIABLE_LIMITS = {
    "Food": 0.0,
    "Transport": 0.0,
    "Entertainment": 0.0,
    "Others": 0.0,
}


def compute_metrics(config: PlannerConfig) -> PlannerResponse:
    total_fixed = round(sum(item.amount for item in config.fixed_items), 2)
    total_variable = round(sum(config.variable_limits.values()), 2)
    total_needed_to_spend = round(total_fixed + total_variable, 2)

    pct = max(0.0, min(config.savings_target_pct, 95.0))
    if pct > 0:
        target_monthly_income = round(total_needed_to_spend / (1.0 - (pct / 100.0)), 2)
        target_savings_amount = round(target_monthly_income - total_needed_to_spend, 2)
    else:
        target_monthly_income = total_needed_to_spend
        target_savings_amount = 0.0

    if config.monthly_income > 0:
        safe_to_spend_monthly = round(max(config.monthly_income - total_fixed, 0.0), 2)
    else:
        safe_to_spend_monthly = total_variable

    safe_to_spend_daily = round(safe_to_spend_monthly / 30.0, 2)

    return PlannerResponse(
        monthly_income=config.monthly_income,
        savings_target_pct=config.savings_target_pct,
        fixed_items=config.fixed_items,
        variable_limits=config.variable_limits,
        total_fixed=total_fixed,
        total_variable=total_variable,
        total_needed_to_spend=total_needed_to_spend,
        target_monthly_income=target_monthly_income,
        target_savings_amount=target_savings_amount,
        safe_to_spend_monthly=safe_to_spend_monthly,
        safe_to_spend_daily=safe_to_spend_daily,
    )


async def load_from_budget(db, month_year: Optional[str] = None) -> Optional[PlannerConfig]:
    query = {"month_year": month_year} if month_year else {}
    budget = await db.budgets.find_one(query, sort=[("month_year", -1)])
    if not budget:
        return None

    cat_limits = budget.get("category_limits", {})
    if not cat_limits and not budget.get("overall_limit"):
        return None

    fixed_items = []
    rent_amt = float(cat_limits.get("Rent", 0.0))
    if rent_amt > 0:
        fixed_items.append(FixedExpenseItem(id="fix-rent", name="House Rent", amount=rent_amt, category="Rent"))

    util_amt = float(cat_limits.get("Utilities", 0.0))
    if util_amt > 0:
        fixed_items.append(FixedExpenseItem(id="fix-util", name="Utilities & Bills", amount=util_amt, category="Utilities"))

    variable_limits = {
        "Food": float(cat_limits.get("Food", 0.0)),
        "Transport": float(cat_limits.get("Transport", 0.0)),
        "Entertainment": float(cat_limits.get("Entertainment", 0.0)),
        "Others": float(cat_limits.get("Others", 0.0)),
    }

    if not fixed_items and sum(variable_limits.values()) == 0:
        return None

    return PlannerConfig(
        monthly_income=0.0,
        savings_target_pct=20.0,
        fixed_items=fixed_items,
        variable_limits=variable_limits,
    )


@router.get("", response_model=PlannerResponse)
@router.get("/", response_model=PlannerResponse, include_in_schema=False)
async def get_planner_settings():
    try:
        db = get_database()
        doc = await db.planner_settings.find_one({"user_id": "default"})

        if not doc:
            # Check if an existing budget has values to import
            budget_cfg = await load_from_budget(db)
            if budget_cfg:
                return compute_metrics(budget_cfg)

            cfg = PlannerConfig(
                monthly_income=0.0,
                savings_target_pct=20.0,
                fixed_items=[],
                variable_limits=DEFAULT_VARIABLE_LIMITS,
            )
            return compute_metrics(cfg)

        items = []
        for raw in doc.get("fixed_items", []):
            try:
                items.append(FixedExpenseItem(**raw))
            except Exception:
                continue

        var_limits = doc.get("variable_limits") or DEFAULT_VARIABLE_LIMITS

        cfg = PlannerConfig(
            monthly_income=float(doc.get("monthly_income") or 0.0),
            savings_target_pct=float(doc.get("savings_target_pct") or 20.0),
            fixed_items=items,
            variable_limits=var_limits,
        )
        return compute_metrics(cfg)
    except Exception:
        cfg = PlannerConfig(
            monthly_income=0.0,
            savings_target_pct=20.0,
            fixed_items=[],
            variable_limits=DEFAULT_VARIABLE_LIMITS,
        )
        return compute_metrics(cfg)


@router.post("/import-budget", response_model=PlannerResponse)
async def import_budget_to_planner(body: ApplyBudgetRequest):
    db = get_database()
    budget_cfg = await load_from_budget(db, body.month_year)
    doc = await db.planner_settings.find_one({"user_id": "default"})

    if not budget_cfg:
        # Fall back to current settings or empty
        if doc:
            items = []
            for raw in doc.get("fixed_items", []):
                try:
                    items.append(FixedExpenseItem(**raw))
                except Exception:
                    continue
            cfg = PlannerConfig(
                monthly_income=float(doc.get("monthly_income") or 0.0),
                savings_target_pct=float(doc.get("savings_target_pct") or 20.0),
                fixed_items=items,
                variable_limits=doc.get("variable_limits") or DEFAULT_VARIABLE_LIMITS,
            )
            return compute_metrics(cfg)
        return compute_metrics(PlannerConfig(
            monthly_income=0.0,
            savings_target_pct=20.0,
            fixed_items=[],
            variable_limits=DEFAULT_VARIABLE_LIMITS,
        ))

    # Preserve user's current income / savings % if set
    if doc:
        budget_cfg.monthly_income = float(doc.get("monthly_income") or 0.0)
        budget_cfg.savings_target_pct = float(doc.get("savings_target_pct") or 20.0)

    # Save to MongoDB so it persists
    data = {
        "user_id": "default",
        "monthly_income": budget_cfg.monthly_income,
        "savings_target_pct": budget_cfg.savings_target_pct,
        "fixed_items": [item.model_dump() for item in budget_cfg.fixed_items],
        "variable_limits": budget_cfg.variable_limits,
        "updated_at": datetime.utcnow(),
    }
    await db.planner_settings.find_one_and_update(
        {"user_id": "default"},
        {"$set": data},
        upsert=True,
    )
    return compute_metrics(budget_cfg)


@router.post("", response_model=PlannerResponse)
@router.post("/", response_model=PlannerResponse, include_in_schema=False)
async def save_planner_settings(body: PlannerConfig):
    try:
        db = get_database()
        data = {
            "user_id": "default",
            "monthly_income": float(body.monthly_income or 0.0),
            "savings_target_pct": float(body.savings_target_pct or 20.0),
            "fixed_items": [item.model_dump() for item in body.fixed_items],
            "variable_limits": body.variable_limits,
            "updated_at": datetime.utcnow(),
        }
        await db.planner_settings.find_one_and_update(
            {"user_id": "default"},
            {"$set": data},
            upsert=True,
        )
        return compute_metrics(body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-budget")
async def apply_planner_to_budget(body: ApplyBudgetRequest):
    db = get_database()
    doc = await db.planner_settings.find_one({"user_id": "default"})

    if doc:
        cfg = PlannerConfig(
            monthly_income=doc.get("monthly_income", 0.0),
            savings_target_pct=doc.get("savings_target_pct", 20.0),
            fixed_items=[FixedExpenseItem(**item) for item in doc.get("fixed_items", [])],
            variable_limits=doc.get("variable_limits", {}),
        )
    else:
        cfg = PlannerConfig(
            monthly_income=0.0,
            savings_target_pct=20.0,
            fixed_items=[],
            variable_limits=DEFAULT_VARIABLE_LIMITS,
        )

    metrics = compute_metrics(cfg)

    # Consolidate category limits
    category_limits: Dict[str, float] = {k: float(v) for k, v in cfg.variable_limits.items()}

    # Add fixed items into category limits
    for item in cfg.fixed_items:
        cat = item.category if item.category in [c.value for c in CategoryEnum] else "Others"
        category_limits[cat] = round(category_limits.get(cat, 0.0) + item.amount, 2)

    # Ensure all primary categories have an entry
    for c in CategoryEnum:
        if c.value not in category_limits:
            category_limits[c.value] = 0.0

    budget_doc = {
        "month_year": body.month_year,
        "overall_limit": metrics.total_needed_to_spend,
        "category_limits": category_limits,
        "updated_at": datetime.utcnow(),
    }

    result = await db.budgets.find_one_and_update(
        {"month_year": body.month_year},
        {"$set": budget_doc},
        upsert=True,
        return_document=True,
    )

    return {
        "success": True,
        "message": f"Successfully applied {metrics.total_needed_to_spend:,.2f} ETB budget to {body.month_year}",
        "overall_limit": metrics.total_needed_to_spend,
        "category_limits": category_limits,
        "budget_id": str(result["_id"]),
    }
