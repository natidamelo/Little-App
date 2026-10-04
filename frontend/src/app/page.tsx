"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
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
  ArrowRight,
  Trash2,
  Activity,
  Target,
  PiggyBank,
  Zap,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from "lucide-react";
import { api, AnalyticsSummary, Transaction, TransactionCreate } from "@/lib/api";
import StatCard from "@/components/StatCard";
import SpendingTrendChart from "@/components/SpendingTrendChart";
import CategoryPieChart from "@/components/CategoryPieChart";
import ExpenseForm from "@/components/ExpenseForm";
import { getCurrentMonth, formatMonthYear } from "@/lib/dateUtils";
import { formatETB } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";

function getGreeting(): { text: string; icon: React.ReactNode } {
  const h = new Date().getHours();
  if (h < 6) return { text: "Good Night", icon: <Moon size={20} className="text-indigo-400" /> };
  if (h < 12) return { text: "Good Morning", icon: <Sunrise size={20} className="text-amber-400" /> };
  if (h < 17) return { text: "Good Afternoon", icon: <Sun size={20} className="text-yellow-400" /> };
  if (h < 21) return { text: "Good Evening", icon: <Sunset size={20} className="text-orange-400" /> };
  return { text: "Good Night", icon: <Moon size={20} className="text-indigo-400" /> };
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [currentMonth] = useState(getCurrentMonth);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<TransactionCreate>>({ type: "Expense" });

  // Starting balance quick edit
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [editBalanceInput, setEditBalanceInput] = useState<string>("");
  const [savingBalance, setSavingBalance] = useState(false);

  // Edit / Delete transaction
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const [data, recent] = await Promise.all([
        api.getSummary(currentMonth),
        api.getTransactions({ month: currentMonth }),
      ]);
      setSummary(data);
      setRecentTransactions(recent.slice(0, 8));
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
    showToast(`${data.type === "Income" ? "Income" : "Expense"} added — ${formatETB(data.amount)}`, "success");
  };

  const handleEditTransaction = async (data: TransactionCreate) => {
    if (!editingTx) return;
    await api.updateTransaction(editingTx.id, data);
    await fetchSummary();
    setEditingTx(null);
    showToast("Transaction updated!", "success");
  };

  const handleDeleteTransaction = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      await fetchSummary();
      showToast("Transaction deleted", "success");
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeletingId(null);
    }
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
    if (summary) setEditBalanceInput(String(summary.starting_balance));
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
      showToast(`Starting balance updated to ${formatETB(val)}`, "success");
    } catch {
      showToast("Failed to update starting balance", "error");
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
  const greeting = getGreeting();

  // Spending velocity: are we spending faster than expected for this point in the month?
  const dayOfMonth = Math.max(1, summary.days_in_month - summary.days_remaining);
  const expectedSpentByNow = summary.overall_limit > 0
    ? (summary.overall_limit / summary.days_in_month) * dayOfMonth
    : 0;
  const spendingVelocity = expectedSpentByNow > 0
    ? Math.round((summary.total_spent / expectedSpentByNow) * 100)
    : 0;

  // Top 3 categories for quick view
  const topCategories = Object.entries(summary.category_breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* ═══════════ Greeting Header ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {greeting.icon}
            <h1 className="text-xl sm:text-2xl font-extrabold gradient-text">{greeting.text}</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {formatMonthYear(currentMonth)} · Day {dayOfMonth} of {summary.days_in_month} · {summary.days_remaining} days left
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/planner"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--accent-purple)",
            }}
          >
            <Calculator size={15} />
            <span className="hidden sm:inline">Planner</span>
          </Link>

          <button
            onClick={openRideModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:opacity-90 active:scale-[0.97] shadow-md cursor-pointer"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }}
          >
            <Car size={15} />
            <span className="hidden sm:inline">+ Ride</span>
            <span className="sm:hidden">Ride</span>
          </button>

          <button
            onClick={openExpenseModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:opacity-90 active:scale-[0.97] shadow-md cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">+ Expense</span>
            <span className="sm:hidden">Expense</span>
          </button>
        </div>
      </div>

      {/* ═══════════ Quick Stats Strip ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 stagger">
        {/* Cash In Hand */}
        <div
          className="glass-card p-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all"
          onClick={openStartingBalanceModal}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Cash In Hand
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
              <Wallet size={16} style={{ color: "#10b981" }} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold" style={{ color: summary.available_cash < 0 ? "#f43f5e" : "#10b981" }}>
            {formatETB(summary.available_cash, 0)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Started: {formatETB(summary.starting_balance, 0)}
          </p>
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: summary.available_cash >= 0 ? "#10b981" : "#f43f5e" }}
          />
        </div>

        {/* Total Spent */}
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Total Spent
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)" }}>
              <Banknote size={16} style={{ color: "#7c3aed" }} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            {formatETB(summary.total_spent, 0)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Avg: {formatETB(summary.daily_average, 0)}/day
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "#7c3aed" }} />
        </div>

        {/* Total Income */}
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Income Earned
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
              <TrendingUp size={16} style={{ color: "#3b82f6" }} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold" style={{ color: "#3b82f6" }}>
            {formatETB(summary.total_income, 0)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Ride: {formatETB(summary.ride_income_total, 0)}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "#3b82f6" }} />
        </div>

        {/* Net Cashflow */}
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Net Cashflow
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isProfit ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)" }}>
              {isProfit ? <ArrowUpRight size={16} style={{ color: "#10b981" }} /> : <ArrowDownRight size={16} style={{ color: "#f43f5e" }} />}
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold" style={{ color: isProfit ? "#10b981" : "#f43f5e" }}>
            {isProfit ? "+" : ""}{formatETB(summary.net_cashflow, 0)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Income vs Expenses
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: isProfit ? "#10b981" : "#f43f5e" }} />
        </div>
      </div>

      {/* ═══════════ Smart Insights Banner ═══════════ */}
      <div
        className="glass-card p-4 sm:p-5 mb-6 fade-in"
        style={{
          borderLeft: `4px solid ${
            summary.cashflow_status === "profitable" ? "#10b981"
            : summary.cashflow_status === "deficit" ? "#f43f5e"
            : "#3b82f6"
          }`,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Status + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: summary.cashflow_status === "profitable" ? "rgba(16,185,129,0.15)"
                  : summary.cashflow_status === "deficit" ? "rgba(244,63,94,0.15)"
                  : "rgba(59,130,246,0.15)",
              }}
            >
              {summary.cashflow_status === "profitable" ? <CheckCircle2 size={20} style={{ color: "#10b981" }} />
                : summary.cashflow_status === "deficit" ? <AlertCircle size={20} style={{ color: "#f43f5e" }} />
                : <Clock size={20} style={{ color: "#3b82f6" }} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Cash Status</span>
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    background: summary.available_cash >= 0 ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
                    color: summary.available_cash >= 0 ? "#10b981" : "#f43f5e",
                  }}
                >
                  {summary.available_cash >= 0 ? formatETB(summary.available_cash, 0) + " available" : "Deficit"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Started with {formatETB(summary.starting_balance, 0)} · Spent {formatETB(summary.total_spent, 0)} · Earned {formatETB(summary.total_income, 0)}
              </p>
            </div>
          </div>

          {/* Right: Quick metrics */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* Spending Velocity */}
            {summary.overall_limit > 0 && (
              <div
                className="px-3 py-2 rounded-xl text-center"
                style={{
                  background: spendingVelocity > 110 ? "rgba(244,63,94,0.1)" : spendingVelocity > 90 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                  border: `1px solid ${spendingVelocity > 110 ? "rgba(244,63,94,0.25)" : spendingVelocity > 90 ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.25)"}`,
                }}
              >
                <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Spend Pace</p>
                <p className="text-sm font-extrabold" style={{
                  color: spendingVelocity > 110 ? "#f43f5e" : spendingVelocity > 90 ? "#f59e0b" : "#10b981"
                }}>
                  {spendingVelocity}%
                </p>
              </div>
            )}

            {/* Ride Target */}
            <div
              className="px-3 py-2 rounded-xl text-center"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}
            >
              <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Ride Target</p>
              <p className="text-sm font-extrabold" style={{ color: "#3b82f6" }}>
                {summary.daily_ride_target > 0 ? `${formatETB(summary.daily_ride_target, 0)}/day` : "Met! 🎉"}
              </p>
            </div>

            {/* Log Salary if not done */}
            {!summary.income_by_category["Salary"] && summary.expected_salary > 0 && (
              <button
                onClick={() => {
                  setFormInitial({ type: "Income", category: "Salary", amount: summary.expected_salary });
                  setShowForm(true);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}
              >
                + Log Salary
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ Budget Progress with Category Bars ═══════════ */}
      {summary.overall_limit > 0 && (
        <div className="glass-card p-4 sm:p-5 mb-6 fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-purple-400" />
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Budget Progress
              </span>
              <Link href="/budgets" className="text-[10px] text-purple-400 hover:underline font-semibold">
                Edit →
              </Link>
            </div>
            <span className="text-xs font-bold" style={{
              color: budgetPct >= 100 ? "#f43f5e" : budgetPct >= 80 ? "#f59e0b" : "#10b981"
            }}>
              {formatETB(summary.total_spent, 0)} / {formatETB(summary.overall_limit, 0)} ({budgetPct.toFixed(0)}%)
            </span>
          </div>

          {/* Main progress bar */}
          <div className="h-3 rounded-full overflow-hidden mb-4" style={{ background: "var(--progress-track)" }}>
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

          {/* Category mini-bars */}
          {topCategories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {topCategories.map(([cat, spent]) => {
                const catColors: Record<string, string> = {
                  Rent: "#e11d48", Food: "#10b981", Transport: "#3b82f6",
                  Utilities: "#f59e0b", Entertainment: "#a78bfa", Others: "#64748b",
                };
                const color = catColors[cat] || "#8b5cf6";
                const catLimit = summary.overall_limit > 0
                  ? (spent / summary.total_spent) * 100
                  : 0;
                return (
                  <div key={cat} className="p-2.5 rounded-xl" style={{ background: "var(--input-bg)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-secondary)" }}>{cat}</span>
                      <span className="text-[10px] font-bold" style={{ color }}>{formatETB(spent, 0)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--progress-track)" }}>
                      <div className="h-full rounded-full" style={{ width: `${catLimit}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {budgetPct >= 80 && (
            <p className="text-xs mt-3" style={{ color: budgetPct >= 100 ? "#f43f5e" : "#f59e0b" }}>
              {budgetPct >= 100
                ? `⚠ Exceeded by ${formatETB(summary.total_spent - summary.overall_limit, 0)}!`
                : `⚠ ${budgetPct.toFixed(0)}% used — ${formatETB(summary.overall_limit - summary.total_spent, 0)} remaining`}
            </p>
          )}
        </div>
      )}

      {/* ═══════════ Charts ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
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

      {/* ═══════════ Recent Transactions ═══════════ */}
      <div className="glass-card overflow-hidden fade-in">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Recent Activity</h2>
            <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Last {recentTransactions.length} transactions · {formatMonthYear(currentMonth)}
            </p>
          </div>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: "var(--accent-purple)" }}
          >
            View All <ArrowRight size={13} />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">💳</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transactions this month yet</p>
            <button
              onClick={openExpenseModal}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:opacity-90 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
            >
              + Add First Expense
            </button>
          </div>
        ) : (
          <div>
            {recentTransactions.map((tx, i) => {
              const isIncome = tx.type === "Income";
              const catColor: Record<string, string> = {
                Rent: "#e11d48", Food: "#10b981", Transport: "#3b82f6", Utilities: "#f59e0b",
                Entertainment: "#a78bfa", Others: "#64748b",
                Salary: "#10b981", "Ride Income": "#06b6d4", Freelance: "#f59e0b", "Other Income": "#a855f7",
              };
              const color = catColor[tx.category] ?? "#8b5cf6";
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 sm:px-5 py-3 transition-colors hover:bg-white/[0.02] group"
                  style={{ borderBottom: i < recentTransactions.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      {isIncome
                        ? <TrendingUp size={15} style={{ color: "#10b981" }} />
                        : <TrendingDown size={15} style={{ color }} />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {tx.category}
                        </span>
                        {isIncome && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                            IN
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {new Date(tx.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {tx.note ? ` · ${tx.note}` : ""}
                        <span className="hidden sm:inline"> · {tx.payment_method}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-sm font-extrabold"
                      style={{ color: isIncome ? "#10b981" : "var(--text-primary)" }}
                    >
                      {isIncome ? "+" : "−"}{formatETB(tx.amount, 0)}
                    </span>

                    {/* Edit/Delete buttons - visible on hover */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingTx(tx);
                        }}
                        className="p-1.5 rounded-lg hover:bg-purple-500/10 transition-colors cursor-pointer"
                        title="Edit"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        disabled={deletingId === tx.id}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ Modals ═══════════ */}
      {/* Add Transaction */}
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

      {/* Edit Transaction */}
      {editingTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-md fade-in">
            <ExpenseForm
              onSubmit={handleEditTransaction}
              onClose={() => setEditingTx(null)}
              initial={{
                amount: editingTx.amount,
                type: editingTx.type,
                category: editingTx.category,
                date: editingTx.date,
                payment_method: editingTx.payment_method,
                note: editingTx.note,
              }}
              submitLabel="Update Transaction"
            />
          </div>
        </div>
      )}

      {/* Starting Balance */}
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
                onClick={() => setShowBalanceModal(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
                  Money you had at the beginning of the month.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingBalance}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-md cursor-pointer"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
          ))}
        </div>
        <div className="h-32 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
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
