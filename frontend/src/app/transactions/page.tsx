"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Trash2,
  Pencil,
  Plus,
  X,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  Table as TableIcon,
  Tag,
  Wallet,
  Car,
  Home,
  Utensils,
  Wifi,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Landmark,
  Smartphone,
  ChevronDown,
} from "lucide-react";
import { api, Transaction, TransactionCreate } from "@/lib/api";
import ExpenseForm from "@/components/ExpenseForm";
import { getCurrentMonth, getAvailableMonths, formatMonthYear } from "@/lib/dateUtils";
import { formatETB } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";

const BASE_CATEGORIES = [
  "All",
  "Rent",
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Others",
  "Salary",
  "Ride Income",
  "Freelance",
  "Other Income",
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#e11d48",
  Food: "#10b981",
  Transport: "#3b82f6",
  Utilities: "#f59e0b",
  Entertainment: "#a78bfa",
  Others: "#64748b",
  Salary: "#10b981",
  "Ride Income": "#06b6d4",
  Freelance: "#f59e0b",
  "Other Income": "#a855f7",
};

const PM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Cash: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  Bank: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", border: "rgba(59,130,246,0.3)" },
  "Mobile Money": { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  CBE: { bg: "rgba(168,85,247,0.12)", text: "#a855f7", border: "rgba(168,85,247,0.3)" },
  Abyssinia: { bg: "rgba(234,179,8,0.12)", text: "#eab308", border: "rgba(234,179,8,0.3)" },
  Telebirr: { bg: "rgba(6,182,212,0.12)", text: "#06b6d4", border: "rgba(6,182,212,0.3)" },
  TeleBirr: { bg: "rgba(6,182,212,0.12)", text: "#06b6d4", border: "rgba(6,182,212,0.3)" },
  "CBE Birr": { bg: "rgba(168,85,247,0.12)", text: "#a855f7", border: "rgba(168,85,247,0.3)" },
};

type TypeFilter = "All" | "Expense" | "Income";
type SortKey = "date" | "amount" | "category";
type SortDir = "desc" | "asc";
type ViewMode = "grouped" | "table";

export default function TransactionsPage() {
  const { showToast } = useToast();
  const availableMonths = useMemo(() => getAvailableMonths(6), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormInitial, setAddFormInitial] = useState<Partial<TransactionCreate>>({ type: "Expense" });
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic categories including custom user categories
  const allFilterCategories = useMemo(() => {
    let custom: string[] = [];
    if (typeof window !== "undefined") {
      try {
        custom = JSON.parse(localStorage.getItem("spendpulse_custom_categories") || "[]");
      } catch {}
    }
    const fromTx = transactions.map((t) => t.category).filter(Boolean);
    const set = new Set<string>([...BASE_CATEGORIES, ...custom, ...fromTx]);
    return Array.from(set);
  }, [transactions]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions({ month: monthFilter });
      setTransactions(data);
    } catch (e) {
      console.error(e);
      showToast("Failed to load transactions", "error");
    } finally {
      setLoading(false);
    }
  }, [monthFilter, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAdd = async (data: TransactionCreate) => {
    await api.createTransaction(data);
    await fetchTransactions();
    setShowAddForm(false);
    showToast(
      `${data.type === "Income" ? "Income" : "Expense"} logged — ${formatETB(data.amount)}`,
      "success"
    );
  };

  const handleUpdate = async (data: TransactionCreate) => {
    if (!editTx) return;
    await api.updateTransaction(editTx.id, data);
    await fetchTransactions();
    setEditTx(null);
    showToast("Transaction updated successfully", "success");
  };

  const handleDelete = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showToast(
        `Deleted ${tx?.category ?? "transaction"} — ${formatETB(tx?.amount ?? 0)}`,
        "info"
      );
    } catch {
      showToast("Failed to delete transaction", "error");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Filter & sort
  const filtered = useMemo(() => {
    let list = transactions.filter((t) => {
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (typeFilter !== "All" && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.note?.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q) &&
          !t.payment_method?.toLowerCase().includes(q) &&
          !t.amount.toString().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [transactions, categoryFilter, typeFilter, search, sortKey, sortDir]);

  // Grouped by Date structure
  const groupedByDate = useMemo(() => {
    const groups: { date: string; displayDate: string; items: Transaction[]; dayTotalExpense: number; dayTotalIncome: number }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    const sortedForGrouping = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

    sortedForGrouping.forEach((tx) => {
      const existing = dateMap.get(tx.date) || [];
      existing.push(tx);
      dateMap.set(tx.date, existing);
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    dateMap.forEach((items, dateStr) => {
      let displayDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      if (dateStr === todayStr) {
        displayDate = `Today · ${displayDate}`;
      } else if (dateStr === yesterdayStr) {
        displayDate = `Yesterday · ${displayDate}`;
      }

      const dayTotalExpense = items
        .filter((t) => t.type !== "Income")
        .reduce((sum, t) => sum + t.amount, 0);

      const dayTotalIncome = items
        .filter((t) => t.type === "Income")
        .reduce((sum, t) => sum + t.amount, 0);

      groups.push({
        date: dateStr,
        displayDate,
        items,
        dayTotalExpense,
        dayTotalIncome,
      });
    });

    return groups;
  }, [filtered]);

  // Summary totals
  const totalExpense = useMemo(
    () => filtered.filter((t) => t.type !== "Income").reduce((s, t) => s + t.amount, 0),
    [filtered]
  );
  const totalIncome = useMemo(
    () => filtered.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0),
    [filtered]
  );
  const netBalance = totalIncome - totalExpense;
  const avgExpense = useMemo(() => {
    const expenses = filtered.filter((t) => t.type !== "Income");
    return expenses.length > 0 ? Math.round(totalExpense / expenses.length) : 0;
  }, [filtered, totalExpense]);

  // CSV Export
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast("No transactions to export", "info");
      return;
    }

    const headers = ["Date", "Type", "Category", "Amount (ETB)", "Payment Method", "Note"];
    const rows = filtered.map((t) => [
      t.date,
      t.type,
      `"${t.category.replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.payment_method || "").replace(/"/g, '""')}"`,
      `"${(t.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SpendPulse_Transactions_${monthFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Downloaded transactions CSV!", "success");
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "rent":
        return Home;
      case "food":
        return Utensils;
      case "transport":
      case "ride income":
        return Car;
      case "utilities":
        return Wifi;
      case "entertainment":
        return Sparkles;
      case "salary":
        return Landmark;
      default:
        return ShoppingBag;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* ═══════════ Header ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold gradient-text">Transactions Ledger</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} entries for {formatMonthYear(monthFilter)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            title="Download CSV export"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Quick Ride Income */}
          <button
            onClick={() => {
              setAddFormInitial({ type: "Income", category: "Ride Income" });
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:opacity-90 active:scale-95 shadow-md cursor-pointer"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }}
          >
            <Car size={15} />
            <span className="hidden sm:inline">+ Ride</span>
            <span className="sm:hidden">Ride</span>
          </button>

          {/* Add Expense Button */}
          <button
            onClick={() => {
              setAddFormInitial({ type: "Expense", category: "Food" });
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:opacity-90 active:scale-95 shadow-md cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">+ Add Transaction</span>
            <span className="sm:hidden">+ Add</span>
          </button>
        </div>
      </div>

      {/* ═══════════ Summary Analytics Strip ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 stagger">
        {/* Total Expenses */}
        <div
          className="glass-card p-4 relative overflow-hidden flex flex-col justify-between"
          style={{ borderColor: "rgba(244,63,94,0.25)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Total Expenses
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,63,94,0.12)" }}>
              <TrendingDown size={15} style={{ color: "#f43f5e" }} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold" style={{ color: "#f43f5e" }}>
            {formatETB(totalExpense, 0)}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Avg {formatETB(avgExpense, 0)} per expense
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "#f43f5e" }} />
        </div>

        {/* Total Income */}
        <div
          className="glass-card p-4 relative overflow-hidden flex flex-col justify-between"
          style={{ borderColor: "rgba(16,185,129,0.25)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Total Income
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
              <TrendingUp size={15} style={{ color: "#10b981" }} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold" style={{ color: "#10b981" }}>
            +{formatETB(totalIncome, 0)}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Earned this period
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "#10b981" }} />
        </div>

        {/* Net Flow */}
        <div
          className="glass-card p-4 relative overflow-hidden flex flex-col justify-between"
          style={{ borderColor: netBalance >= 0 ? "rgba(59,130,246,0.25)" : "rgba(244,63,94,0.25)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Net Balance
            </span>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: netBalance >= 0 ? "rgba(59,130,246,0.12)" : "rgba(244,63,94,0.12)" }}
            >
              <ArrowUpDown size={15} style={{ color: netBalance >= 0 ? "#3b82f6" : "#f43f5e" }} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold" style={{ color: netBalance >= 0 ? "#3b82f6" : "#f43f5e" }}>
            {netBalance >= 0 ? "+" : ""}{formatETB(netBalance, 0)}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {netBalance >= 0 ? "Net Surplus" : "Net Deficit"}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: netBalance >= 0 ? "#3b82f6" : "#f43f5e" }} />
        </div>

        {/* Transaction Count */}
        <div className="glass-card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Volume
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)" }}>
              <Layers size={15} style={{ color: "#7c3aed" }} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            {filtered.length}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {filtered.filter((t) => t.type === "Income").length} in · {filtered.filter((t) => t.type !== "Income").length} out
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "#7c3aed" }} />
        </div>
      </div>

      {/* ═══════════ Filter & Search Controls ═══════════ */}
      <div className="glass-card p-4 mb-6 space-y-3 fade-in">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search bar */}
          <div
            className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl transition-all"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          >
            <Search size={15} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by note, category, payment method, or amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none flex-1"
              style={{ color: "var(--text-primary)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="cursor-pointer">
                <X size={14} style={{ color: "var(--text-muted)" }} />
              </button>
            )}
          </div>

          {/* Month selector dropdown */}
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          >
            <Calendar size={15} style={{ color: "var(--text-muted)" }} />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {availableMonths.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                  style={{ backgroundColor: "var(--select-option-bg)", color: "var(--select-option-color)" }}
                >
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter pills */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl shrink-0"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          >
            {(["All", "Expense", "Income"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background:
                    typeFilter === t
                      ? t === "Income"
                        ? "rgba(16,185,129,0.2)"
                        : t === "Expense"
                        ? "rgba(244,63,94,0.15)"
                        : "rgba(124,58,237,0.18)"
                      : "transparent",
                  color:
                    typeFilter === t
                      ? t === "Income"
                        ? "#10b981"
                        : t === "Expense"
                        ? "#f43f5e"
                        : "var(--accent-purple)"
                      : "var(--text-muted)",
                  border:
                    typeFilter === t
                      ? t === "Income"
                        ? "1px solid rgba(16,185,129,0.4)"
                        : t === "Expense"
                        ? "1px solid rgba(244,63,94,0.35)"
                        : "1px solid rgba(124,58,237,0.4)"
                      : "1px solid transparent",
                }}
              >
                {t === "Expense" ? "⬇ Expense" : t === "Income" ? "⬆ Income" : "All"}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Grouped vs Table */}
          <div
            className="hidden sm:flex items-center gap-1 p-1 rounded-xl shrink-0"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          >
            <button
              onClick={() => setViewMode("grouped")}
              title="Grouped by date"
              className="p-1.5 rounded-lg transition-all cursor-pointer"
              style={{
                background: viewMode === "grouped" ? "rgba(124,58,237,0.18)" : "transparent",
                color: viewMode === "grouped" ? "var(--accent-purple)" : "var(--text-muted)",
              }}
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Classic table"
              className="p-1.5 rounded-lg transition-all cursor-pointer"
              style={{
                background: viewMode === "table" ? "rgba(124,58,237,0.18)" : "transparent",
                color: viewMode === "table" ? "var(--accent-purple)" : "var(--text-muted)",
              }}
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>

        {/* Category chips filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span className="text-[11px] font-semibold mr-1" style={{ color: "var(--text-muted)" }}>
            Filter Category:
          </span>
          {allFilterCategories.map((cat) => {
            const color = CATEGORY_COLORS[cat] || "#8b5cf6";
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer hover:scale-105"
                style={{
                  background: isSelected
                    ? cat === "All"
                      ? "rgba(124,58,237,0.2)"
                      : `${color}25`
                    : "var(--input-bg)",
                  border: isSelected
                    ? cat === "All"
                      ? "1px solid rgba(124,58,237,0.5)"
                      : `1.5px solid ${color}`
                    : "1px solid var(--border-subtle)",
                  color: isSelected
                    ? cat === "All"
                      ? "var(--accent-purple)"
                      : color
                    : "var(--text-secondary)",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════ Transactions Content ═══════════ */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center fade-in">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            No transactions found
          </p>
          <p className="text-xs mt-1 mb-5" style={{ color: "var(--text-muted)" }}>
            Try clearing filters or add your first transaction for this period
          </p>
          <button
            onClick={() => {
              setAddFormInitial({ type: "Expense", category: "Food" });
              setShowAddForm(true);
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
          >
            + Add Transaction
          </button>
        </div>
      ) : viewMode === "grouped" ? (
        /* ═══════════ MODERN DATE-GROUPED VIEW ═══════════ */
        <div className="space-y-5 fade-in">
          {groupedByDate.map((group) => (
            <div key={group.date} className="glass-card overflow-hidden">
              {/* Day header banner */}
              <div
                className="flex items-center justify-between px-4 sm:px-5 py-2.5"
                style={{
                  background: "var(--input-bg)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-purple-400" />
                  <span className="text-xs sm:text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {group.displayDate}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                    {group.items.length} {group.items.length === 1 ? "tx" : "txs"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  {group.dayTotalIncome > 0 && (
                    <span className="text-emerald-500">+{formatETB(group.dayTotalIncome, 0)}</span>
                  )}
                  {group.dayTotalExpense > 0 && (
                    <span className="text-rose-500">−{formatETB(group.dayTotalExpense, 0)}</span>
                  )}
                </div>
              </div>

              {/* Transactions in this day */}
              <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {group.items.map((tx) => {
                  const isIncome = tx.type === "Income";
                  const color = CATEGORY_COLORS[tx.category] ?? "#8b5cf6";
                  const pmStyle = PM_COLORS[tx.payment_method] || {
                    bg: "rgba(100,116,139,0.1)",
                    text: "var(--text-secondary)",
                    border: "var(--border-subtle)",
                  };
                  const IconComp = getCategoryIcon(tx.category);

                  return (
                    <div
                      key={tx.id}
                      className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
                    >
                      {/* Left: Icon + Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: isIncome ? "rgba(16,185,129,0.15)" : `${color}18`,
                            color: isIncome ? "#10b981" : color,
                          }}
                        >
                          <IconComp size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                              {tx.category}
                            </span>
                            {isIncome ? (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                              >
                                ↑ INCOME
                              </span>
                            ) : null}
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: pmStyle.bg,
                                color: pmStyle.text,
                                border: `1px solid ${pmStyle.border}`,
                              }}
                            >
                              {tx.payment_method}
                            </span>
                          </div>

                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                            {tx.note ? tx.note : "No note provided"}
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount + Quick Actions */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className="text-base font-black tracking-tight"
                          style={{ color: isIncome ? "#10b981" : "var(--text-primary)" }}
                        >
                          {isIncome ? "+" : "−"}{formatETB(tx.amount)}
                        </span>

                        {confirmDeleteId === tx.id ? (
                          <div
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
                            style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)" }}
                          >
                            <span className="text-[10px] font-bold text-rose-500">Delete?</span>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              disabled={deletingId === tx.id}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white disabled:opacity-50 cursor-pointer"
                              style={{ background: "#f43f5e" }}
                            >
                              {deletingId === tx.id ? "…" : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md cursor-pointer"
                              style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 sm:opacity-75 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTx(tx)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/10 cursor-pointer"
                              style={{ color: "#3b82f6" }}
                              title="Edit transaction"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(tx.id)}
                              disabled={deletingId === tx.id}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40 cursor-pointer"
                              style={{ color: "#f43f5e" }}
                              title="Delete transaction"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ═══════════ CLASSIC TABLE VIEW ═══════════ */
        <div className="glass-card overflow-hidden fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {(["Date", "Category", "Amount (ETB)", "Payment", "Note", "Actions"] as const).map((h) => {
                    const key =
                      h === "Date" ? "date" : h === "Category" ? "category" : h === "Amount (ETB)" ? "amount" : null;
                    return (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{
                          color: "var(--text-muted)",
                          cursor: key ? "pointer" : "default",
                          userSelect: "none",
                        }}
                        onClick={() => key && toggleSort(key as SortKey)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {h}
                          {key && (
                            <ArrowUpDown
                              size={11}
                              style={{
                                opacity: sortKey === key ? 1 : 0.35,
                                color: sortKey === key ? "var(--accent-purple)" : "inherit",
                              }}
                            />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, i) => (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {new Date(tx.date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: CATEGORY_COLORS[tx.category] ?? "#8b5cf6" }}
                        />
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          {tx.category}
                        </span>
                        {tx.type === "Income" && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                          >
                            INCOME
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-5 py-3.5 text-sm font-extrabold"
                      style={{ color: tx.type === "Income" ? "#10b981" : "var(--text-primary)" }}
                    >
                      {tx.type === "Income" ? "+" : "−"}{formatETB(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
                        style={{
                          background: PM_COLORS[tx.payment_method]?.bg || "var(--input-bg)",
                          border: `1px solid ${PM_COLORS[tx.payment_method]?.border || "var(--border-subtle)"}`,
                          color: PM_COLORS[tx.payment_method]?.text || "var(--text-secondary)",
                        }}
                      >
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm max-w-[200px] truncate" style={{ color: "var(--text-secondary)" }}>
                      {tx.note || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {confirmDeleteId === tx.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            disabled={deletingId === tx.id}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50 cursor-pointer"
                            style={{ background: "#f43f5e" }}
                          >
                            {deletingId === tx.id ? "…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] font-semibold px-2 py-1 rounded-md cursor-pointer"
                            style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditTx(tx)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/10 cursor-pointer"
                            style={{ color: "#3b82f6" }}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(tx.id)}
                            disabled={deletingId === tx.id}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40 cursor-pointer"
                            style={{ color: "#f43f5e" }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ Add Transaction Modal ═══════════ */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-md fade-in">
            <ExpenseForm
              onSubmit={handleAdd}
              onClose={() => setShowAddForm(false)}
              initial={addFormInitial}
            />
          </div>
        </div>
      )}

      {/* ═══════════ Edit Transaction Modal ═══════════ */}
      {editTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-md fade-in">
            <ExpenseForm
              onSubmit={handleUpdate}
              onClose={() => setEditTx(null)}
              submitLabel={editTx.type === "Income" ? "Update Income" : "Update Expense"}
              initial={{
                amount: editTx.amount,
                type: editTx.type,
                category: editTx.category,
                date: editTx.date,
                payment_method: editTx.payment_method,
                note: editTx.note ?? "",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
