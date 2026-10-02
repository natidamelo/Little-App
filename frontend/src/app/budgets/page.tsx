"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Save, AlertTriangle, CheckCircle, Settings, Calculator, Plus } from "lucide-react";
import { api, BudgetWithSpending, BudgetCreate } from "@/lib/api";
import BudgetProgressCard, { getCategoryColor } from "@/components/BudgetProgressCard";
import { getCurrentMonth, formatMonthYear, getAvailableMonths } from "@/lib/dateUtils";
import { formatETB } from "@/lib/currency";

const BASE_CATEGORIES = ["Rent", "Food", "Transport", "Utilities", "Entertainment", "Others"];

export default function BudgetsPage() {
  const availableMonths = useMemo(() => getAvailableMonths(6), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [budget, setBudget] = useState<BudgetWithSpending | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editorError, setEditorError] = useState("");

  // Custom categories from localStorage
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("spendpulse_custom_categories");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [newCatInput, setNewCatInput] = useState("");
  const [showAddCatInput, setShowAddCatInput] = useState(false);

  // Form state
  const [overallLimit, setOverallLimit] = useState(0);
  const [startingBalance, setStartingBalance] = useState(10000);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(() =>
    Object.fromEntries(BASE_CATEGORIES.map((c) => [c, 0]))
  );

  const allCategories = useMemo(() => {
    const fromBudgetLimits = budget ? Object.keys(budget.category_limits || {}) : [];
    const fromBudgetSpent = budget ? Object.keys(budget.category_spent || {}) : [];
    const set = new Set<string>([...BASE_CATEGORIES, ...customCategories, ...fromBudgetLimits, ...fromBudgetSpent]);
    return Array.from(set);
  }, [budget, customCategories]);

  const fetchBudget = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBudget(selectedMonth);
      setBudget(data);
      setOverallLimit(data.overall_limit);
      setStartingBalance(data.starting_balance ?? 10000);

      let custom: string[] = [];
      if (typeof window !== "undefined") {
        try {
          custom = JSON.parse(localStorage.getItem("spendpulse_custom_categories") || "[]");
        } catch {}
      }
      const allCats = Array.from(new Set<string>([
        ...BASE_CATEGORIES,
        ...custom,
        ...Object.keys(data.category_limits || {}),
        ...Object.keys(data.category_spent || {}),
      ]));
      const limits = Object.fromEntries(allCats.map((c) => [c, data.category_limits[c] ?? 0]));
      setCategoryLimits(limits);
    } catch {
      setBudget(null);
      setOverallLimit(0);
      setStartingBalance(10000);
      let custom: string[] = [];
      if (typeof window !== "undefined") {
        try {
          custom = JSON.parse(localStorage.getItem("spendpulse_custom_categories") || "[]");
        } catch {}
      }
      const allCats = Array.from(new Set<string>([...BASE_CATEGORIES, ...custom]));
      setCategoryLimits(Object.fromEntries(allCats.map((c) => [c, 0])));
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!allCategories.includes(formatted)) {
      const updated = [...customCategories, formatted];
      setCustomCategories(updated);
      try {
        localStorage.setItem("spendpulse_custom_categories", JSON.stringify(updated));
      } catch {}
    }
    setCategoryLimits((prev) => ({ ...prev, [formatted]: prev[formatted] ?? 0 }));
    setNewCatInput("");
    setShowAddCatInput(false);
  };

  useEffect(() => { fetchBudget(); }, [fetchBudget]);

  const handleSave = async () => {
    const sumCategories = Object.values(categoryLimits).reduce((a, b) => a + (Number(b) || 0), 0);
    const effectiveOverallLimit = overallLimit > 0 ? overallLimit : sumCategories;

    if (effectiveOverallLimit <= 0) {
      setEditorError("Please enter an overall monthly limit or set category budgets.");
      return;
    }

    setEditorError("");
    setSaving(true);
    try {
      const payload: BudgetCreate = {
        month_year: selectedMonth,
        overall_limit: effectiveOverallLimit,
        starting_balance: startingBalance,
        category_limits: Object.fromEntries(
          Object.entries(categoryLimits).filter(([, v]) => v > 0)
        ),
      };
      await api.createBudget(payload);
      await fetchBudget();
      setSaveSuccess(true);
      setShowEditor(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setEditorError(e instanceof Error ? e.message : "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const overallSpent = budget?.overall_spent ?? 0;
  const overallPct = overallLimit > 0 ? (overallSpent / overallLimit) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-in">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text">Budget Control</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Set and monitor your monthly spending limits
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium outline-none transition-all cursor-pointer"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            {availableMonths.map((m) => (
              <option
                key={m.value}
                value={m.value}
                style={{
                  backgroundColor: "var(--select-option-bg)",
                  color: "var(--select-option-color)",
                }}
              >
                {m.label}
              </option>
            ))}
          </select>
          <Link
            href="/planner"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--accent-purple)",
            }}
          >
            <Calculator size={15} /> Planner
          </Link>
          <button
            id="edit-budget-btn"
            onClick={() => {
              setEditorError("");
              setShowEditor(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 shadow-md cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
          >
            <Settings size={15} /> Set Limits
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-xl mb-4 fade-in"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          <CheckCircle size={16} style={{ color: "#10b981" }} />
          <span className="text-sm font-semibold" style={{ color: "#10b981" }}>
            Budget saved successfully!
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl animate-pulse"
              style={{ background: "var(--border-subtle)" }}
            />
          ))}
        </div>
      ) : !budget ? (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No budget set</h3>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Set a budget for {formatMonthYear(selectedMonth)} to start tracking limits
          </p>
          <button
            onClick={() => setShowEditor(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
          >
            Create Budget
          </button>
        </div>
      ) : (
        <>
          {/* Overall budget summary card */}
          <div className="glass-card p-6 mb-6 fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {formatMonthYear(selectedMonth)} Overview
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Overall monthly budget
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold" style={{
                  color: overallPct >= 100 ? "#f43f5e" : overallPct >= 80 ? "#f59e0b" : "#10b981"
                }}>
                  {formatETB(overallSpent)}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  of {formatETB(overallLimit)} budget
                </p>
              </div>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: "var(--progress-track)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(overallPct, 100)}%`,
                  background: overallPct >= 100
                    ? "linear-gradient(to right, #f43f5e, #fb7185)"
                    : overallPct >= 80
                    ? "linear-gradient(to right, #f59e0b, #fbbf24)"
                    : "linear-gradient(to right, #7c3aed, #3b82f6, #06b6d4)",
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {formatETB(Math.max(overallLimit - overallSpent, 0))} remaining
              </span>
              <span className="text-xs font-bold" style={{
                color: overallPct >= 100 ? "#f43f5e" : "var(--text-secondary)"
              }}>
                {overallPct.toFixed(1)}%
              </span>
            </div>
            {overallPct >= 80 && (
              <div
                className="flex items-center gap-2 mt-3 px-3.5 py-2.5 rounded-lg"
                style={{
                  background: overallPct >= 100 ? "rgba(244,63,94,0.1)" : "rgba(245,158,11,0.1)",
                  border: `1px solid ${overallPct >= 100 ? "rgba(244,63,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                }}
              >
                <AlertTriangle size={14} style={{ color: overallPct >= 100 ? "#f43f5e" : "#f59e0b" }} />
                <span className="text-xs font-semibold" style={{ color: overallPct >= 100 ? "#f43f5e" : "#f59e0b" }}>
                  {overallPct >= 100
                    ? `Budget exceeded by ${formatETB(overallSpent - overallLimit)}`
                    : `Warning: ${overallPct.toFixed(0)}% of monthly budget used`}
                </span>
              </div>
            )}
          </div>

          {/* Category progress cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {allCategories.filter((c) => (budget.category_limits[c] ?? 0) > 0).map((category) => (
              <BudgetProgressCard
                key={category}
                category={category}
                limit={budget.category_limits[category] ?? 0}
                spent={budget.category_spent[category] ?? 0}
              />
            ))}
          </div>

          {/* Categories without limits */}
          {allCategories.some((c) => !budget.category_limits[c] && (budget.category_spent[c] ?? 0) > 0) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                Spending without set limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCategories.filter((c) => !budget.category_limits[c] && (budget.category_spent[c] ?? 0) > 0).map((c) => (
                  <div key={c} className="glass-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: getCategoryColor(c) }} />
                      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{c}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>
                      {formatETB(budget.category_spent[c] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Budget Editor Modal */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Set Budget — {formatMonthYear(selectedMonth)}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {editorError && (
              <div
                className="mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{
                  background: "rgba(244,63,94,0.12)",
                  color: "#f43f5e",
                  border: "1px solid rgba(244,63,94,0.3)",
                }}
              >
                <AlertTriangle size={15} />
                <span>{editorError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Starting Cash Balance */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Starting Cash in Pocket / Bank (ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={startingBalance || ""}
                  onChange={(e) => setStartingBalance(Number(e.target.value) || 0)}
                  placeholder="e.g. 10000 ETB"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/50"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Money you started the month with (used to calculate your real cash in hand).
                </p>
              </div>

              {/* Overall limit */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Planned Monthly Spending Limit (ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={overallLimit || ""}
                  onChange={(e) => setOverallLimit(Number(e.target.value) || 0)}
                  placeholder="e.g. 25000 ETB"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="h-px" style={{ background: "var(--border-subtle)" }} />
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Category Limits
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddCatInput((v) => !v)}
                  className="text-xs font-bold hover:underline cursor-pointer flex items-center gap-1"
                  style={{ color: "var(--accent-purple)" }}
                >
                  <Plus size={13} /> {showAddCatInput ? "Cancel" : "Add Category"}
                </button>
              </div>

              {showAddCatInput && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <input
                    type="text"
                    placeholder="New category name"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
                  >
                    Add
                  </button>
                </div>
              )}

              {allCategories.map((cat) => (
                <div key={cat} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-36">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: getCategoryColor(cat) }}
                    />
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{cat}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={categoryLimits[cat] ?? ""}
                    placeholder="0 = no limit"
                    onChange={(e) => setCategoryLimits((prev) => ({ ...prev, [cat]: Number(e.target.value) }))}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              ))}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 shadow-md"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#fff" }}
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save Budget"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
