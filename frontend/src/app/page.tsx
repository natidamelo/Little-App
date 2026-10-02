"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Banknote,
  Wallet,
  TrendingDown,
  Calendar,
  Star,
  Plus,
  Calculator,
  TrendingUp,
  Car,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pencil,
  X,
} from "lucide-react";
import { api, AnalyticsSummary, TransactionCreate } from "@/lib/api";
import StatCard from "@/components/StatCard";
import SpendingTrendChart from "@/components/SpendingTrendChart";
import CategoryPieChart from "@/components/CategoryPieChart";
import ExpenseForm from "@/components/ExpenseForm";
import { getCurrentMonth, formatMonthYear } from "@/lib/dateUtils";
import { formatETB } from "@/lib/currency";

export default function DashboardPage() {
  const [currentMonth] = useState(getCurrentMonth);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<TransactionCreate>>({ type: "Expense" });

  // Starting balance quick edit
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [editBalanceInput, setEditBalanceInput] = useState<string>("");
  const [savingBalance, setSavingBalance] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getSummary(currentMonth);
      setSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleAddTransaction = async (data: TransactionCreate) => {
    await api.createTransaction(data);
    await fetchSummary();
  };

  const openExpenseModal = () => {
    setFormInitial({ type: "Expense", category: "Food" });
    setShowForm(true);
  };

  const openRideModal = () => {
    setFormInitial({ type: "Income", category: "Ride Income" });
    setShowForm(true);
  };

  const openStartingBalanceModal = () => {
    if (summary) {
      setEditBalanceInput(String(summary.starting_balance));
    }
    setShowBalanceModal(true);
  };

  const handleSaveStartingBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(editBalanceInput);
    if (isNaN(val) || val < 0) return;
    try {
      setSavingBalance(true);
      await api.updateStartingBalance(currentMonth, val);
      await fetchSummary();
      setShowBalanceModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBalance(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchSummary} />;
  if (!summary) return null;

  const budgetPct = summary.overall_limit > 0
    ? (summary.total_spent / summary.overall_limit) * 100
    : 0;

  const isProfit = summary.net_cashflow >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 fade-in">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {formatMonthYear(currentMonth)} · Spending & Ride Cash Flow
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/planner"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--accent-purple)",
            }}
          >
            <Calculator size={15} /> Planner
          </Link>

          {/* Quick Ride Income Button */}
          <button
            id="add-ride-btn"
            onClick={openRideModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.97] shadow-md cursor-pointer"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }}
          >
            <Car size={16} />
            + Ride Income
          </button>

          {/* Quick Expense Button */}
          <button
            id="add-expense-btn"
            onClick={openExpenseModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.97] shadow-md cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
          >
            <Plus size={16} />
            + Expense
          </button>
        </div>
      </div>

      {/* Cash Flow & Ride Performance Diagnostic Banner */}
      <div
        className="glass-card p-5 mb-6 fade-in relative overflow-hidden"
        style={{
          border: summary.cashflow_status === "profitable"
            ? "1px solid rgba(16,185,129,0.3)"
            : summary.cashflow_status === "deficit"
            ? "1px solid rgba(244,63,94,0.3)"
            : "1px solid rgba(59,130,246,0.3)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: summary.cashflow_status === "profitable"
                  ? "rgba(16,185,129,0.15)"
                  : summary.cashflow_status === "deficit"
                  ? "rgba(244,63,94,0.15)"
                  : "rgba(59,130,246,0.15)",
              }}
            >
              {summary.cashflow_status === "profitable" ? (
                <CheckCircle2 size={22} style={{ color: "#10b981" }} />
              ) : summary.cashflow_status === "deficit" ? (
                <AlertCircle size={22} style={{ color: "#f43f5e" }} />
              ) : (
                <Clock size={22} style={{ color: "#3b82f6" }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  Cash Status:
                </span>
                <span
                  className="text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    background: summary.available_cash >= 0
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(244,63,94,0.15)",
                    color: summary.available_cash >= 0
                      ? "#10b981"
                      : "#f43f5e",
                  }}
                >
                  {summary.available_cash >= 0 ? "Cash In Hand: " + formatETB(summary.available_cash) : "Deficit: " + formatETB(summary.available_cash)}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Started with {formatETB(summary.starting_balance)} · Spent {formatETB(summary.total_spent)} · Earned {formatETB(summary.total_income)} · You currently have <strong>{formatETB(summary.available_cash)}</strong> available.
              </p>
            </div>
          </div>

          {/* Quick Target Reminder */}
          {summary.daily_ride_target > 0 ? (
            <div
              className="px-3.5 py-2 rounded-xl text-right flex flex-col justify-center"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
            >
              <span className="text-[11px] font-semibold text-blue-400">Daily Ride Target</span>
              <span className="text-base font-extrabold text-blue-500">
                {formatETB(summary.daily_ride_target)}/day
              </span>
            </div>
          ) : (
            <div
              className="px-3.5 py-2 rounded-xl text-right flex flex-col justify-center"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="text-[11px] font-semibold text-emerald-400">Target Status</span>
              <span className="text-sm font-extrabold text-emerald-500">Goal Met! 🎉</span>
            </div>
          )}
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Daily Ride Target */}
          <div
            className="p-3.5 rounded-xl flex items-center gap-3.5"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.12)" }}>
              <Car size={20} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Daily Ride Target
              </p>
              <p className="text-lg font-extrabold" style={{ color: "#3b82f6" }}>
                {formatETB(summary.daily_ride_target)}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {summary.days_remaining} days left this month
              </p>
            </div>
          </div>

          {/* Total Income */}
          <div
            className="p-3.5 rounded-xl flex items-center gap-3.5"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
              <TrendingUp size={20} style={{ color: "#10b981" }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Total Income Logged
              </p>
              <p className="text-lg font-extrabold" style={{ color: "#10b981" }}>
                {formatETB(summary.total_income)}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Ride: {formatETB(summary.ride_income_total)} {summary.income_by_category["Salary"] ? `· Salary: ${formatETB(summary.income_by_category["Salary"])}` : ""}
              </p>
            </div>
          </div>

          {/* Net Cashflow */}
          <div
            className="p-3.5 rounded-xl flex items-center gap-3.5"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isProfit ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)" }}
            >
              {isProfit
                ? <ArrowUpRight size={20} style={{ color: "#10b981" }} />
                : <ArrowDownRight size={20} style={{ color: "#f43f5e" }} />}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Monthly Net Cashflow
              </p>
              <p className="text-lg font-extrabold" style={{ color: isProfit ? "#10b981" : "#f43f5e" }}>
                {isProfit ? "+" : ""}{formatETB(summary.net_cashflow)}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Income vs Spending this month
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Plan Breakdown Box */}
        <div
          className="mt-4 p-3.5 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px dashed rgba(124,58,237,0.25)" }}
        >
          <div className="flex items-center gap-2 flex-wrap" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold text-purple-400">Monthly Coverage:</span>
            <span>Starting: <strong style={{ color: "var(--text-primary)" }}>{formatETB(summary.starting_balance)}</strong></span>
            <span>+ Salary: <strong style={{ color: "var(--text-primary)" }}>{formatETB(summary.expected_salary)}</strong></span>
            <span>+ Ride Needed: <strong className="text-blue-400">{formatETB(Math.max(0, summary.overall_limit - summary.starting_balance - summary.expected_salary))}</strong></span>
            <span>= Budget: <strong style={{ color: "var(--text-primary)" }}>{formatETB(summary.overall_limit)}</strong></span>
          </div>

          {!summary.income_by_category["Salary"] && (
            <button
              onClick={() => {
                setFormInitial({ type: "Income", category: "Salary", amount: summary.expected_salary });
                setShowForm(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }}
            >
              + Log Salary Received ({formatETB(summary.expected_salary)})
            </button>
          )}
        </div>
      </div>

      {/* Planned Living Costs ceiling bar */}
      {summary.overall_limit > 0 && (
        <div className="glass-card p-5 mb-6 fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Planned Monthly Spending Plan
              </span>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Living expense limits (Rent: 35k, Food: 15k, Utilities: 3k, etc.) ·{" "}
                <Link href="/budgets" className="text-purple-400 hover:underline">
                  Edit in Budgets
                </Link>
              </p>
            </div>
            <span className="text-sm font-bold" style={{
              color: budgetPct >= 100 ? "#f43f5e" : budgetPct >= 80 ? "#f59e0b" : "#10b981"
            }}>
              {formatETB(summary.total_spent)} spent of {formatETB(summary.overall_limit)} planned
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--progress-track)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(budgetPct, 100)}%`,
                background: budgetPct >= 100
                  ? "linear-gradient(to right, #f43f5e, #fb7185)"
                  : budgetPct >= 80
                  ? "linear-gradient(to right, #f59e0b, #fbbf24)"
                  : "linear-gradient(to right, #7c3aed, #3b82f6, #06b6d4)",
              }}
            />
          </div>
          {budgetPct >= 80 && (
            <p className="text-xs mt-2" style={{ color: budgetPct >= 100 ? "#f43f5e" : "#f59e0b" }}>
              {budgetPct >= 100
                ? `⚠ Planned limits exceeded by ${formatETB(summary.total_spent - summary.overall_limit)}!`
                : `⚠ You've reached ${budgetPct.toFixed(0)}% of your planned monthly expenses`}
            </p>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard
          title="Total Spent"
          value={formatETB(summary.total_spent)}
          subtitle="This month"
          icon={<Banknote size={20} />}
          accentColor="#7c3aed"
        />

        {/* Real Cash In Hand - NOT the confusing 70,000 remaining */}
        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Cash In Hand
            </span>
            <button
              onClick={openStartingBalanceModal}
              title="Edit Starting Cash"
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <Pencil size={13} />
            </button>
          </div>
          <div className="text-2xl font-extrabold" style={{ color: summary.available_cash < 0 ? "#f43f5e" : "#10b981" }}>
            {formatETB(summary.available_cash)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 text-[11px]" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
            <span>Started with: {formatETB(summary.starting_balance)}</span>
            <span
              onClick={openStartingBalanceModal}
              className="text-purple-400 font-semibold cursor-pointer hover:underline"
            >
              Edit
            </span>
          </div>
        </div>

        <StatCard
          title="Daily Average Spend"
          value={formatETB(summary.daily_average)}
          subtitle="Per day this month"
          icon={<Calendar size={20} />}
          accentColor="#3b82f6"
        />

        <StatCard
          title="Top Category"
          value={summary.top_category ?? "—"}
          subtitle={summary.top_category ? `${formatETB(summary.top_category_amount)} spent` : "No data"}
          icon={<Star size={20} />}
          accentColor="#f59e0b"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <SpendingTrendChart
            data={summary.daily_trend}
            currentMonth={currentMonth}
            dailyTarget={summary.overall_limit > 0 ? Math.round(summary.overall_limit / summary.days_in_month) : undefined}
            dailyRideTarget={summary.daily_ride_target}
          />
        </div>
        <div className="lg:col-span-2">
          {Object.keys(summary.category_breakdown).length > 0 ? (
            <CategoryPieChart data={summary.category_breakdown} />
          ) : (
            <div className="glass-card p-6 flex items-center justify-center h-full min-h-[280px]">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No expense categories yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Unified Transaction Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-md fade-in">
            <ExpenseForm
              onSubmit={handleAddTransaction}
              onClose={() => setShowForm(false)}
              initial={formInitial}
            />
          </div>
        </div>
      )}

      {/* Starting Balance Modal */}
      {showBalanceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-sm fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Edit Starting Balance
              </h3>
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStartingBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Starting Cash for {formatMonthYear(currentMonth)} (ETB)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={editBalanceInput}
                  onChange={(e) => setEditBalanceInput(e.target.value)}
                  placeholder="10000"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                  autoFocus
                />
                <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  This is the money you had in your pocket/bank at the beginning of the month.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingBalance}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-md cursor-pointer"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
              >
                {savingBalance ? "Saving..." : "Save Starting Cash"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 rounded-xl w-48" style={{ background: "var(--border-subtle)" }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 h-72 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
          <div className="lg:col-span-2 h-72 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="glass-card p-8 max-w-md mx-auto">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Unable to load dashboard</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:opacity-90 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
