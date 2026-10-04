"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search, Filter, Trash2, Pencil, Plus, X,
  TrendingDown, TrendingUp, ArrowUpDown, AlertTriangle,
} from "lucide-react";
import { api, Transaction, TransactionCreate } from "@/lib/api";
import ExpenseForm from "@/components/ExpenseForm";
import { getCurrentMonth, getAvailableMonths } from "@/lib/dateUtils";
import { formatETB } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";

const CATEGORIES = ["All", "Rent", "Food", "Transport", "Utilities", "Entertainment", "Others", "Salary", "Ride Income", "Freelance", "Other Income"];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#e11d48", Food: "#10b981", Transport: "#3b82f6", Utilities: "#f59e0b",
  Entertainment: "#a78bfa", Others: "#64748b",
  Salary: "#10b981", "Ride Income": "#06b6d4", Freelance: "#f59e0b", "Other Income": "#a855f7",
};

const PM_COLORS: Record<string, string> = {
  Cash: "#10b981",
  Bank: "#3b82f6",
  "Mobile Money": "#f59e0b",
  CBE: "#a855f7",
  Abyssinia: "#eab308",
  Telebirr: "#06b6d4",
  TeleBirr: "#06b6d4",
  "CBE Birr": "#a855f7",
};

type TypeFilter = "All" | "Expense" | "Income";
type SortKey = "date" | "amount" | "category";
type SortDir = "desc" | "asc";

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
  const [showAddForm, setShowAddForm] = useState(false);
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
    const set = new Set<string>([...CATEGORIES, ...custom, ...fromTx]);
    return Array.from(set);
  }, [transactions]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions({
        month: monthFilter,
        // Don't pre-filter by category on server — do client-side for better UX
      });
      setTransactions(data);
    } catch (e) {
      console.error(e);
      showToast("Failed to load transactions", "error");
    } finally {
      setLoading(false);
    }
  }, [monthFilter, showToast]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleAdd = async (data: TransactionCreate) => {
    await api.createTransaction(data);
    await fetchTransactions();
    setShowAddForm(false);
    showToast(`${data.type === "Income" ? "Income" : "Expense"} added — ${formatETB(data.amount)}`, "success");
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
      showToast(`Deleted ${tx?.category ?? "transaction"} — ${formatETB(tx?.amount ?? 0)}`, "info");
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

  // Apply filters + sort client-side
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
        ) return false;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-in">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text">Transactions</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} entries this period
          </p>
        </div>
        <button
          id="add-transaction-btn"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 shadow-md"
          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* ── Feature 2: Income / Expense / Net summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 stagger">
        {/* Total Expenses */}
        <div
          className="glass-card p-4 flex items-center gap-3"
          style={{ borderColor: "rgba(244,63,94,0.2)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(244,63,94,0.12)" }}
          >
            <TrendingDown size={18} style={{ color: "#f43f5e" }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Total Expenses
            </p>
            <p className="text-lg font-extrabold" style={{ color: "#f43f5e" }}>
              {formatETB(totalExpense)}
            </p>
          </div>
        </div>

        {/* Total Income */}
        <div
          className="glass-card p-4 flex items-center gap-3"
          style={{ borderColor: "rgba(16,185,129,0.2)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(16,185,129,0.12)" }}
          >
            <TrendingUp size={18} style={{ color: "#10b981" }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Total Income
            </p>
            <p className="text-lg font-extrabold" style={{ color: "#10b981" }}>
              +{formatETB(totalIncome)}
            </p>
          </div>
        </div>

        {/* Net */}
        <div
          className="glass-card p-4 flex items-center gap-3"
          style={{ borderColor: netBalance >= 0 ? "rgba(59,130,246,0.2)" : "rgba(244,63,94,0.2)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: netBalance >= 0 ? "rgba(59,130,246,0.12)" : "rgba(244,63,94,0.12)" }}
          >
            <ArrowUpDown size={18} style={{ color: netBalance >= 0 ? "#3b82f6" : "#f43f5e" }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Net Balance
            </p>
            <p className="text-lg font-extrabold" style={{ color: netBalance >= 0 ? "#3b82f6" : "#f43f5e" }}>
              {netBalance >= 0 ? "+" : ""}{formatETB(netBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-4 flex flex-wrap gap-3 items-center fade-in">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 min-w-[180px] px-4 py-2.5 rounded-xl"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
        >
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by note, category, amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none flex-1"
            style={{ color: "var(--text-primary)" }}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={12} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>

        {/* Month filter - styled dropdown */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
        >
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-transparent text-sm outline-none cursor-pointer"
            style={{ color: "var(--text-primary)" }}
          >
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value} style={{ backgroundColor: "var(--select-option-bg)", color: "var(--select-option-color)" }}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Feature 4: Type filter pills ── */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}>
          {(["All", "Expense", "Income"] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
              style={{
                background: typeFilter === t
                  ? t === "Income" ? "rgba(16,185,129,0.2)" : t === "Expense" ? "rgba(244,63,94,0.15)" : "rgba(124,58,237,0.18)"
                  : "transparent",
                color: typeFilter === t
                  ? t === "Income" ? "#10b981" : t === "Expense" ? "#f43f5e" : "var(--accent-purple)"
                  : "var(--text-muted)",
                border: typeFilter === t
                  ? t === "Income" ? "1px solid rgba(16,185,129,0.4)" : t === "Expense" ? "1px solid rgba(244,63,94,0.35)" : "1px solid rgba(124,58,237,0.4)"
                  : "1px solid transparent",
              }}
            >
              {t === "Expense" ? "⬇ Expense" : t === "Income" ? "⬆ Income" : "All"}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-2 flex-wrap w-full">
          {allFilterCategories.map((cat) => {
            const color = CATEGORY_COLORS[cat] || "#8b5cf6";
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: categoryFilter === cat
                    ? cat === "All" ? "rgba(124,58,237,0.18)" : `${color}20`
                    : "var(--input-bg)",
                  border: categoryFilter === cat
                    ? cat === "All" ? "1px solid rgba(124,58,237,0.5)" : `1px solid ${color}50`
                    : "1px solid var(--border-subtle)",
                  color: categoryFilter === cat
                    ? cat === "All" ? "var(--accent-purple)" : color
                    : "var(--text-secondary)",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden fade-in">
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl" style={{ background: "var(--border-subtle)" }} />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No transactions found</p>
            <p className="text-xs mt-1 mb-5" style={{ color: "var(--text-muted)" }}>Try adjusting your filters or add a new transaction</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
            >
              + Add Transaction
            </button>
          </div>
        ) : (
          <>
            {/* ── Mobile card list (< sm) ── */}
            <div className="sm:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {filtered.map((tx) => {
                const isIncome = tx.type === "Income";
                const color = CATEGORY_COLORS[tx.category] ?? "#64748b";
                return (
                  <div key={tx.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      {isIncome
                        ? <TrendingUp size={16} style={{ color: "#10b981" }} />
                        : <TrendingDown size={16} style={{ color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {tx.category}
                        </span>
                        {isIncome && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                            INCOME
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {new Date(tx.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" · "}{tx.payment_method}
                        {tx.note ? ` · ${tx.note}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-sm font-extrabold" style={{ color: isIncome ? "#10b981" : "var(--text-primary)" }}>
                        {isIncome ? "+" : "−"}{formatETB(tx.amount)}
                      </span>
                      {confirmDeleteId === tx.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            disabled={deletingId === tx.id}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white disabled:opacity-50"
                            style={{ background: "#f43f5e" }}
                          >
                            {deletingId === tx.id ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditTx(tx)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/10"
                            style={{ color: "#3b82f6" }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(tx.id)}
                            disabled={deletingId === tx.id}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                            style={{ color: "#f43f5e" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table (sm+) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {(["Date", "Category", "Amount (ETB)", "Payment", "Note", "Actions"] as const).map((h) => {
                      const key = h === "Date" ? "date" : h === "Category" ? "category" : h === "Amount (ETB)" ? "amount" : null;
                      return (
                        <th
                          key={h}
                          className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-muted)", cursor: key ? "pointer" : "default", userSelect: "none" }}
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
                      className="transition-colors duration-150 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    >
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {new Date(tx.date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{
                              background: `${CATEGORY_COLORS[tx.category] ?? "#64748b"}18`,
                              color: CATEGORY_COLORS[tx.category] ?? "#64748b",
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: CATEGORY_COLORS[tx.category] ?? "#64748b" }}
                            />
                            {tx.category}
                          </span>
                          {tx.type === "Income" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded w-fit" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                              ↑ INCOME
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold" style={{ color: tx.type === "Income" ? "#10b981" : "var(--text-primary)" }}>
                        {tx.type === "Income" ? "+" : "−"}{formatETB(tx.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
                          style={{
                            background: `${PM_COLORS[tx.payment_method] ?? "#64748b"}18`,
                            border: `1px solid ${PM_COLORS[tx.payment_method] ?? "#64748b"}40`,
                            color: PM_COLORS[tx.payment_method] ?? "#64748b",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: PM_COLORS[tx.payment_method] ?? "#64748b" }}
                          />
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm max-w-[160px] truncate" style={{ color: "var(--text-secondary)" }}>
                        {tx.note ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {confirmDeleteId === tx.id ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)" }}>
                            <AlertTriangle size={13} style={{ color: "#f43f5e", flexShrink: 0 }} />
                            <span className="text-[11px] font-semibold" style={{ color: "#f43f5e", whiteSpace: "nowrap" }}>
                              Sure?
                            </span>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              disabled={deletingId === tx.id}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white disabled:opacity-50"
                              style={{ background: "#f43f5e" }}
                            >
                              {deletingId === tx.id ? "…" : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                              style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              id={`edit-tx-${tx.id}`}
                              onClick={() => setEditTx(tx)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/10"
                              style={{ color: "#3b82f6" }}
                              title="Edit transaction"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              id={`delete-tx-${tx.id}`}
                              onClick={() => setConfirmDeleteId(tx.id)}
                              disabled={deletingId === tx.id}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                              style={{ color: "#f43f5e" }}
                              title="Delete transaction"
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
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-md fade-in">
            <ExpenseForm onSubmit={handleAdd} onClose={() => setShowAddForm(false)} />
          </div>
        </div>
      )}

      {/* Edit Modal */}
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
