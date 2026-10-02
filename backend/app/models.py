from pydantic import BaseModel, Field
from typing import Optional, Dict, Union, List
from datetime import date, datetime
from enum import Enum


class CategoryEnum(str, Enum):
    RENT = "Rent"
    FOOD = "Food"
    TRANSPORT = "Transport"
    UTILITIES = "Utilities"
    ENTERTAINMENT = "Entertainment"
    OTHERS = "Others"
    SALARY = "Salary"
    RIDE_INCOME = "Ride Income"
    FREELANCE = "Freelance"
    OTHER_INCOME = "Other Income"


class PaymentMethodEnum(str, Enum):
    CBE = "CBE"
    ABYSSINIA = "Abyssinia"
    TELEBIRR = "Telebirr"
    TELEBIRR_CAP = "TeleBirr"
    CASH = "Cash"
    BANK = "Bank"
    MOBILE_MONEY = "Mobile Money"
    CBE_BIRR = "CBE Birr"
    OTHER = "Other"


# --- Transaction Schemas ---

class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in ETB, must be positive")
    type: str = Field(default="Expense", description="'Expense' or 'Income'")
    category: Union[CategoryEnum, str]
    date: date
    payment_method: Union[PaymentMethodEnum, str] = Field(..., description="Payment method / Bank: CBE, Abyssinia, Telebirr, Cash, etc.")
    note: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    amount: float
    type: str = "Expense"
    category: str
    date: str
    payment_method: str
    note: Optional[str] = None
    created_at: str


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[str] = None
    category: Optional[Union[CategoryEnum, str]] = None
    date: Optional[date] = None
    payment_method: Optional[Union[PaymentMethodEnum, str]] = None
    note: Optional[str] = None


# --- Budget Schemas ---

class BudgetCreate(BaseModel):
    month_year: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Format: YYYY-MM")
    overall_limit: float = Field(default=0.0, ge=0)
    starting_balance: float = Field(default=10000.0, ge=0, description="Cash / bank balance at start of month")
    category_limits: Dict[CategoryEnum, float] = Field(
        default_factory=dict,
        description="Per-category spending limits"
    )


class BudgetResponse(BaseModel):
    id: str
    month_year: str
    overall_limit: float
    starting_balance: float = 10000.0
    category_limits: Dict[str, float]


class BudgetWithSpending(BaseModel):
    id: str
    month_year: str
    overall_limit: float
    starting_balance: float = 10000.0
    overall_spent: float
    category_limits: Dict[str, float]
    category_spent: Dict[str, float]


# --- Analytics Schemas ---

class AnalyticsSummary(BaseModel):
    total_spent: float
    remaining_budget: float
    starting_balance: float = 10000.0
    available_cash: float = 0.0
    daily_average: float
    top_category: Optional[str] = None
    top_category_amount: float = 0.0
    category_breakdown: Dict[str, float]
    daily_trend: list
    days_in_month: int
    overall_limit: float
    # Cashflow / income fields
    total_income: float = 0.0
    net_cashflow: float = 0.0
    daily_ride_target: float = 0.0
    income_by_category: Dict[str, float] = Field(default_factory=dict)
    ride_income_total: float = 0.0
    expected_salary: float = 30000.0
    cashflow_status: str = "on_track"
    days_remaining: int = 0


# --- Planner Schemas ---

class FixedExpenseItem(BaseModel):
    id: str
    name: str
    amount: float = Field(..., ge=0)
    category: str = "Rent"
    due_day: Optional[int] = Field(default=None, ge=1, le=31)


class PlannerConfig(BaseModel):
    monthly_income: float = Field(default=0.0, ge=0)
    savings_target_pct: float = Field(default=20.0, ge=0, le=100)
    fixed_items: List[FixedExpenseItem] = Field(default_factory=list)
    variable_limits: Dict[str, float] = Field(default_factory=dict)


class PlannerResponse(BaseModel):
    monthly_income: float
    savings_target_pct: float
    fixed_items: List[FixedExpenseItem]
    variable_limits: Dict[str, float]
    total_fixed: float
    total_variable: float
    total_needed_to_spend: float
    target_monthly_income: float
    target_savings_amount: float
    safe_to_spend_monthly: float
    safe_to_spend_daily: float


class ApplyBudgetRequest(BaseModel):
    month_year: str = Field(..., pattern=r"^\d{4}-\d{2}$")
