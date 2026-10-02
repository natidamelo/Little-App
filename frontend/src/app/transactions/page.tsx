"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Search, Filter, Trash2, Pencil, Plus, X,
} from "lucide-react";
import { api, Transaction, TransactionCreate } from "@/lib/api";
import ExpenseForm from "@/components/ExpenseForm";
import { getCurrentMonth } from "@/lib/dateUtils";
import { formatETB } from "@/lib/currency";

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions({
        month: monthFilter,
        category: categoryFilter !== "All" ? categoryFilter : undefined,
      });
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [monthFilter, categoryFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleAdd = async (data: TransactionCreate) => {
    await api.createTransaction(data);
    await fetchTransactions();
    setShowAddForm(false);
  };

  const handleUpdate = async (data: TransactionCreate) => {
    if (!editTx) return;
    await api.updateTransaction(editTx.id, data);
    await fetchTransactions();
    setEditTx(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = transactions.filter(
    (t) =>
      !search ||
      t.note?.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.payment_method?.toLowerCase().includes(search.toLowerCase()) ||
      t.amount.toString().includes(search)
  );

  const totalFiltered = filtered.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-in">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text">Transactions</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} entries · Total: {formatETB(totalFiltered)}
          </p>
        </div>
        <button
          id="add-transaction-btn"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 shadow-md"
          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-4 flex flex-wrap gap-3 items-center fade-in">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px] px-4 py-2.5 rounded-xl"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
        >
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search expenses, notes, banks..."
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

        {/* Month filter */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
        >
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)", colorScheme: "inherit" }}
          />
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: categoryFilter === cat
                  ? cat === "All" ? "rgba(124,58,237,0.18)" : `${CATEGORY_COLORS[cat]}20`
                  : "var(--input-bg)",
                border: categoryFilter === cat
                  ? cat === "All" ? "1px solid rgba(124,58,237,0.5)" : `1px solid ${CATEGORY_COLORS[cat]}50`
                  : "1px solid var(--border-subtle)",
                color: categoryFilter === cat
                  ? cat === "All" ? "var(--accent-purple)" : CATEGORY_COLORS[cat]
                  : "var(--text-secondary)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden fade-in">
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No transactions found</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Try adjusting your filters or add a new expense</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Date", "Category", "Amount (ETB)", "Payment", "Note", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
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
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: CATEGORY_COLORS[tx.category] ?? "#64748b" }}
                          />
                          {tx.category}
                        </span>
                        {tx.type === "Income" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                            ↑ INCOME
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold" style={{ color: tx.type === "Income" ? "#10b981" : "var(--text-primary)" }}>
                      {tx.type === "Income" ? "+" : ""}{formatETB(tx.amount)}
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
                          onClick={() => handleDelete(tx.id)}
                          disabled={deletingId === tx.id}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                          style={{ color: "#f43f5e" }}
                          title="Delete transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
