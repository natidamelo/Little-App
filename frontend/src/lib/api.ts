// API base URL: directly connects to Render backend in production, or uses Next.js rewrites in local dev
const BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
  : "";

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  payment_method: string;
  note?: string;
  created_at: string;
}

export interface TransactionCreate {
  amount: number;
  type: string;
  category: string;
  date: string;
  payment_method: string;
  note?: string;
}

export interface BudgetWithSpending {
  id: string;
  month_year: string;
  overall_limit: number;
  starting_balance: number;
  overall_spent: number;
  category_limits: Record<string, number>;
  category_spent: Record<string, number>;
}

export interface BudgetCreate {
  month_year: string;
  overall_limit: number;
  starting_balance?: number;
  category_limits: Record<string, number>;
}

export interface AnalyticsSummary {
  total_spent: number;
  remaining_budget: number;
  starting_balance: number;
  available_cash: number;
  daily_average: number;
  top_category: string | null;
  top_category_amount: number;
  category_breakdown: Record<string, number>;
  daily_trend: { date: string; amount: number; income?: number; net?: number }[];
  days_in_month: number;
  overall_limit: number;
  total_income: number;
  net_cashflow: number;
  daily_ride_target: number;
  income_by_category: Record<string, number>;
  ride_income_total: number;
  expected_salary: number;
  cashflow_status: string;
  days_remaining: number;
}

export interface FixedExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_day?: number;
}

export interface PlannerConfig {
  monthly_income: number;
  savings_target_pct: number;
  fixed_items: FixedExpenseItem[];
  variable_limits: Record<string, number>;
}

export interface PlannerResponse extends PlannerConfig {
  total_fixed: number;
  total_variable: number;
  total_needed_to_spend: number;
  target_monthly_income: number;
  target_savings_amount: number;
  safe_to_spend_monthly: number;
  safe_to_spend_daily: number;
}

export interface ApplyBudgetResult {
  success: boolean;
  message: string;
  overall_limit: number;
  category_limits: Record<string, number>;
  budget_id: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text();
    let message = errText;
    try {
      const parsed = JSON.parse(errText);
      if (typeof parsed.detail === "string") {
        message = parsed.detail;
      } else if (Array.isArray(parsed.detail)) {
        message = parsed.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ");
      }
    } catch {}
    throw new Error(message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Transactions ---
export const api = {
  getTransactions: (params?: { month?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.month) qs.set("month", params.month);
    if (params?.category) qs.set("category", params.category);
    return request<Transaction[]>(`/api/transactions/?${qs}`);
  },

  createTransaction: (data: TransactionCreate) =>
    request<Transaction>("/api/transactions/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTransaction: (id: string, data: Partial<TransactionCreate>) =>
    request<Transaction>(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: string) =>
    request<void>(`/api/transactions/${id}`, { method: "DELETE" }),

  // --- Budgets ---
  getBudget: (monthYear: string) =>
    request<BudgetWithSpending>(`/api/budgets/${monthYear}`),

  createBudget: (data: BudgetCreate) =>
    request<BudgetWithSpending>("/api/budgets/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStartingBalance: (monthYear: string, startingBalance: number) =>
    request<BudgetWithSpending>(`/api/budgets/${monthYear}/starting-balance`, {
      method: "PATCH",
      body: JSON.stringify({ starting_balance: startingBalance }),
    }),

  // --- Analytics ---
  getSummary: (month: string) =>
    request<AnalyticsSummary>(`/api/analytics/summary?month=${month}`),

  // --- Monthly Planner ---
  getPlanner: () =>
    request<PlannerResponse>("/api/planner/"),

  savePlanner: (data: PlannerConfig) =>
    request<PlannerResponse>("/api/planner/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  applyPlannerBudget: (monthYear: string) =>
    request<ApplyBudgetResult>("/api/planner/apply-budget", {
      method: "POST",
      body: JSON.stringify({ month_year: monthYear }),
    }),

  importBudgetToPlanner: (monthYear: string) =>
    request<PlannerResponse>("/api/planner/import-budget", {
      method: "POST",
      body: JSON.stringify({ month_year: monthYear }),
    }),
};
