from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
import calendar

from app.database import get_database
from app.models import AnalyticsSummary

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

INCOME_CATEGORIES = {"Salary", "Ride Income", "Freelance", "Other Income"}


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(month: str = Query(..., description="Month in YYYY-MM format")):
    db = get_database()

    try:
        year, mon = month.split("-")
        year, mon = int(year), int(mon)
        start = datetime(year, mon, 1)
        end = datetime(year + 1, 1, 1) if mon == 12 else datetime(year, mon + 1, 1)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    days_in_month = calendar.monthrange(year, mon)[1]

    # --- All transactions this month ---
    all_tx = await db.transactions.find({"date": {"$gte": start, "$lt": end}}).to_list(length=5000)

    # --- Separate income vs expense ---
    income_by_cat: dict[str, float] = {}
    expense_by_cat: dict[str, float] = {}
    daily_expense: dict[str, float] = {}
    daily_income: dict[str, float] = {}
    all_dates: set[str] = set()

    for tx in all_tx:
        tx_type = tx.get("type", "Expense")
        cat = tx.get("category", "Others")
        amt = float(tx.get("amount", 0.0))

        # Auto-classify by category if type field is missing or ambiguous
        if cat in INCOME_CATEGORIES:
            tx_type = "Income"

        raw_date = tx.get("date")
        if raw_date:
            day_str = raw_date.strftime("%Y-%m-%d") if hasattr(raw_date, "strftime") else str(raw_date)[:10]
            all_dates.add(day_str)
            if tx_type == "Income":
                daily_income[day_str] = daily_income.get(day_str, 0.0) + amt
            else:
                daily_expense[day_str] = daily_expense.get(day_str, 0.0) + amt

        if tx_type == "Income":
            income_by_cat[cat] = income_by_cat.get(cat, 0.0) + amt
        else:
            expense_by_cat[cat] = expense_by_cat.get(cat, 0.0) + amt

    total_income = round(sum(income_by_cat.values()), 2)
    total_spent = round(sum(expense_by_cat.values()), 2)
    net_cashflow = round(total_income - total_spent, 2)
    ride_income_total = round(income_by_cat.get("Ride Income", 0.0), 2)

    # Round income_by_cat values
    income_by_cat = {k: round(v, 2) for k, v in income_by_cat.items()}

    # Top expense category
    top_category = None
    top_amount = 0.0
    if expense_by_cat:
        top_category = max(expense_by_cat, key=expense_by_cat.get)  # type: ignore
        top_amount = expense_by_cat[top_category]

    # --- Daily trend (with both expense, income, and net for rich charting) ---
    daily_trend = sorted(
        [
            {
                "date": d,
                "amount": round(daily_expense.get(d, 0.0), 2),
                "income": round(daily_income.get(d, 0.0), 2),
                "net": round(daily_income.get(d, 0.0) - daily_expense.get(d, 0.0), 2),
            }
            for d in all_dates
        ],
        key=lambda x: x["date"],
    )

    # --- Budget & Starting Balance ---
    budget = await db.budgets.find_one({"month_year": month})
    overall_limit = budget["overall_limit"] if budget else 0.0
    starting_balance = float(budget.get("starting_balance", 10000.0)) if budget else 10000.0
    remaining_budget = round(overall_limit - total_spent, 2)
    # What you ACTUALLY have in your pocket/bank right now:
    available_cash = round(starting_balance + total_income - total_spent, 2)

    planner_doc = await db.planner_settings.find_one({"user_id": "default"})
    base_salary_logged = income_by_cat.get("Salary", 0.0)

    # User earns 30,000 ETB salary monthly
    expected_salary = 30000.0
    if planner_doc and planner_doc.get("monthly_income"):
        expected_salary = float(planner_doc["monthly_income"])

    # If salary was not logged as a transaction yet, treat expected salary as upcoming baseline
    unlogged_salary = expected_salary if base_salary_logged == 0 else 0.0

    target_budget = overall_limit
    if target_budget == 0 and planner_doc:
        total_fixed = sum(item.get("amount", 0.0) for item in planner_doc.get("fixed_items", []))
        total_variable = sum(planner_doc.get("variable_limits", {}).values())
        target_budget = total_fixed + total_variable

    # --- Daily averages & targets ---
    today = datetime.utcnow()
    days_elapsed = min((today - start).days + 1, days_in_month)
    daily_average = round(total_spent / days_elapsed, 2) if days_elapsed > 0 else 0.0
    days_remaining = max(1, days_in_month - days_elapsed + 1)

    # Daily Ride Target: how much Ride income is needed per remaining day to cover budget
    target_need = max(target_budget, total_spent)
    # Available base includes starting cash (10k) + base salary (30k) + already earned income
    total_available_funds = starting_balance + unlogged_salary + total_income
    remaining_gap = max(0.0, target_need - total_available_funds)
    daily_ride_target = round(remaining_gap / days_remaining, 2) if target_need > 0 else 0.0

    # Diagnostic status
    if total_available_funds >= target_need and target_need > 0:
        cashflow_status = "profitable"
    elif available_cash < 0:
        cashflow_status = "deficit"
    else:
        cashflow_status = "on_track"

    return {
        "total_spent": total_spent,
        "remaining_budget": remaining_budget,
        "starting_balance": starting_balance,
        "available_cash": available_cash,
        "daily_average": daily_average,
        "top_category": top_category,
        "top_category_amount": round(top_amount, 2),
        "category_breakdown": {k: round(v, 2) for k, v in expense_by_cat.items()},
        "daily_trend": daily_trend,
        "days_in_month": days_in_month,
        "overall_limit": overall_limit,
        "total_income": total_income,
        "net_cashflow": net_cashflow,
        "daily_ride_target": daily_ride_target,
        "income_by_category": income_by_cat,
        "ride_income_total": ride_income_total,
        "expected_salary": expected_salary,
        "cashflow_status": cashflow_status,
        "days_remaining": days_remaining,
    }
