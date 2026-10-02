"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Calculator,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  ArrowRight,
  Sparkles,
  PieChart,
  Home,
  Wifi,
  Zap,
  TrendingUp,
  Receipt,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import {
  api,
  FixedExpenseItem,
  PlannerConfig,
  PlannerResponse,
  Transaction,
  TransactionCreate,
} from "@/lib/api";
import { formatETB } from "@/lib/currency";
import { getCurrentMonth, formatMonthYear } from "@/lib/dateUtils";
import ExpenseForm from "@/components/ExpenseForm";

const PRESET_SAVINGS = [0, 10, 15, 20, 25, 30];
const FIXED_CATEGORIES = ["Rent", "Utilities", "Transport", "Others"];

export default function PlannerPage() {
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Planner state
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [savingsPct, setSavingsPct] = useState<number>(20);
  const [fixedItems, setFixedItems] = useState<FixedExpenseItem[]>([]);
  const [variableLimits, setVariableLimits] = useState<Record<string, number>>({
    Food: 0,
    Transport: 0,
    Entertainment: 0,
    Others: 0,
  });

  // Recorded transactions this month to track paid bills
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);

  // New fixed item draft
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemCat, setNewItemCat] = useState("Rent");

  // Log expense modal
  const [logExpenseInitial, setLogExpenseInitial] = useState<Partial<TransactionCreate> | null>(null);

  // Fetch planner on mount
  useEffect(() => {
    async function load() {
      try {
        let data: PlannerResponse = await api.getPlanner();

        setMonthlyIncome(data.monthly_income || 0);
        setSavingsPct(data.savings_target_pct || 20);
        setFixedItems(data.fixed_items || []);
        setVariableLimits({
          Food: Number(data.variable_limits?.Food) || 0,
          Transport: Number(data.variable_limits?.Transport) || 0,
          Entertainment: Number(data.variable_limits?.Entertainment) || 0,
          Others: Number(data.variable_limits?.Others) || 0,
        });

        // Load recorded transactions to check what bills are already paid
        try {
          const txs = await api.getTransactions({ month: currentMonth });
          setMonthTransactions(txs);
        } catch {
          // ignore
        }
      } catch (e) {
        console.error("Failed to load planner settings", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentMonth]);

  // Check payment status of a fixed commitment
  const getItemPaymentStatus = (item: FixedExpenseItem) => {
    const matching = monthTransactions.filter((t) => {
      const isCatMatch = t.category.toLowerCase() === item.category.toLowerCase();
      const isNoteMatch = t.note && t.note.toLowerCase().includes(item.name.toLowerCase());
      return (isCatMatch || isNoteMatch) && t.type !== "Income";
    });
    const totalPaid = matching.reduce((sum, t) => sum + t.amount, 0);
    return {
      isPaid: totalPaid >= item.amount && item.amount > 0,
      totalPaid,
      remaining: Math.max(0, item.amount - totalPaid),
    };
  };

  // Real-time calculations
  const totalFixed = useMemo(() => {
    return Math.round(fixedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0));
  }, [fixedItems]);

  const totalVariable = useMemo(() => {
    return Math.round(
      Object.values(variableLimits).reduce((acc, val) => acc + (Number(val) || 0), 0)
    );
  }, [variableLimits]);

  const totalNeededToSpend = useMemo(() => {
    return totalFixed + totalVariable;
  }, [totalFixed, totalVariable]);

  const targetMonthlyIncome = useMemo(() => {
    const pct = Math.max(0, Math.min(savingsPct, 95));
    if (pct === 0) return totalNeededToSpend;
    return Math.round(totalNeededToSpend / (1 - pct / 100));
  }, [totalNeededToSpend, savingsPct]);

  const targetSavingsAmount = useMemo(() => {
    return Math.max(0, targetMonthlyIncome - totalNeededToSpend);
  }, [targetMonthlyIncome, totalNeededToSpend]);

  const discretionaryMonthly = useMemo(() => {
    if (monthlyIncome > 0) {
      return Math.max(monthlyIncome - totalFixed, 0);
    }
    return totalVariable;
  }, [monthlyIncome, totalFixed, totalVariable]);

  const safeToSpendDaily = useMemo(() => {
    return Math.round(discretionaryMonthly / 30);
  }, [discretionaryMonthly]);

  const incomeVsNeedsDiff = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    return monthlyIncome - totalNeededToSpend;
  }, [monthlyIncome, totalNeededToSpend]);

  const fixedRatioPct = useMemo(() => {
    const base = monthlyIncome > 0 ? monthlyIncome : targetMonthlyIncome;
    if (base <= 0) return 0;
    return Math.round((totalFixed / base) * 100);
  }, [totalFixed, monthlyIncome, targetMonthlyIncome]);

  // Add fixed item with instant auto-save to MongoDB
  const handleAddFixedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemAmount || Number(newItemAmount) <= 0) return;

    const newItem: FixedExpenseItem = {
      id: `fix-${Date.now()}`,
      name: newItemName.trim(),
      amount: parseFloat(newItemAmount),
      category: newItemCat,
    };
    const updated = [newItem, ...fixedItems];
    setFixedItems(updated);
    setNewItemName("");
    setNewItemAmount("");

    try {
      await api.savePlanner({
        monthly_income: monthlyIncome,
        savings_target_pct: savingsPct,
        fixed_items: updated,
        variable_limits: variableLimits,
      });
      setMessage({ type: "success", text: `Added "${newItem.name}" to fixed obligations!` });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "Failed to save to database." });
    }
  };

  // Inline update of fixed item amount
  const handleUpdateFixedAmount = (id: string, amount: number) => {
    setFixedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: Math.max(0, amount) } : item))
    );
  };

  // Auto-save on blur after editing amount
  const handleBlurFixedAmount = async () => {
    try {
      await api.savePlanner({
        monthly_income: monthlyIncome,
        savings_target_pct: savingsPct,
        fixed_items: fixedItems,
        variable_limits: variableLimits,
      });
    } catch {
      // ignore
    }
  };

  // Remove fixed item with instant auto-save to MongoDB
  const handleRemoveFixedItem = async (id: string) => {
    const itemToRemove = fixedItems.find((it) => it.id === id);
    const updated = fixedItems.filter((it) => it.id !== id);
    setFixedItems(updated);

    try {
      await api.savePlanner({
        monthly_income: monthlyIncome,
        savings_target_pct: savingsPct,
        fixed_items: updated,
        variable_limits: variableLimits,
      });
      setMessage({
        type: "success",
        text: itemToRemove ? `Removed "${itemToRemove.name}".` : "Removed fixed obligation.",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "Failed to update database." });
    }
  };

  // Update variable category limit
  const handleUpdateVariable = (cat: string, val: number) => {
    setVariableLimits((prev) => ({ ...prev, [cat]: Math.max(0, val) }));
  };

  // Import from active month's budget
  const handleImportBudget = async () => {
    setImporting(true);
    setMessage(null);
    try {
      const data = await api.importBudgetToPlanner(currentMonth);
      setMonthlyIncome(data.monthly_income || 0);
      setSavingsPct(data.savings_target_pct || 20);
      setFixedItems(data.fixed_items || []);
      setVariableLimits({
        Food: Number(data.variable_limits?.Food) || 0,
        Transport: Number(data.variable_limits?.Transport) || 0,
        Entertainment: Number(data.variable_limits?.Entertainment) || 0,
        Others: Number(data.variable_limits?.Others) || 0,
      });
      setMessage({
        type: "success",
        text: `Successfully imported ${formatMonthYear(currentMonth)} budget! Total: ${formatETB(data.total_needed_to_spend)}`,
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to import from active budget." });
    } finally {
      setImporting(false);
    }
  };

  // Save settings to database
  const handleSavePlanner = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: PlannerConfig = {
        monthly_income: monthlyIncome,
        savings_target_pct: savingsPct,
        fixed_items: fixedItems,
        variable_limits: variableLimits,
      };
      await api.savePlanner(payload);
      setMessage({ type: "success", text: "Planner configuration saved successfully!" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save planner settings." });
    } finally {
      setSaving(false);
    }
  };

  // Apply to current month budget
  const handleApplyBudget = async () => {
    setApplying(true);
    setMessage(null);
    try {
      const payload: PlannerConfig = {
        monthly_income: monthlyIncome,
        savings_target_pct: savingsPct,
        fixed_items: fixedItems,
        variable_limits: variableLimits,
      };
      await api.savePlanner(payload);
      const res = await api.applyPlannerBudget(currentMonth);
      setMessage({
        type: "success",
        text: `Applied! Total budget of ${formatETB(res.overall_limit)} set for ${formatMonthYear(currentMonth)}.`,
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to apply budget to this month." });
    } finally {
      setApplying(false);
    }
  };

  // Quick log expense modal
  const handleQuickLog = (item: FixedExpenseItem) => {
    setLogExpenseInitial({
      amount: item.amount,
      category: item.category,
      note: `${item.name} payment`,
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 fade-in">
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2"
            style={{
              background: "rgba(124,58,237,0.12)",
              color: "var(--accent-purple)",
              border: "1px solid rgba(124,58,237,0.25)",
            }}
          >
            <Calculator size={13} /> Monthly Financial Planner
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text">
            Fixed Obligations & Target Income
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Calculate your total monthly spending needs (Rent + Bills + Living) and discover your target monthly earnings.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleImportBudget}
            disabled={importing || loading}
            title="Import all limits from your active monthly budget"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            style={{
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#3b82f6",
            }}
          >
            <Download size={15} />
            {importing ? "Importing..." : `Import ${formatMonthYear(currentMonth)} Budget`}
          </button>

          <button
            onClick={handleSavePlanner}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Plan"}
          </button>

          <button
            onClick={handleApplyBudget}
            disabled={applying || loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-purple-500/20 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
          >
            <Upload size={15} />
            {applying ? "Applying..." : "Apply to Budget"}
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between gap-3 fade-in shadow-md"
          style={{
            background: message.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
            border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
            color: message.type === "success" ? "#10b981" : "#f43f5e",
          }}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <Link
            href="/budgets"
            className="text-xs font-bold underline flex items-center gap-1 hover:opacity-80"
          >
            View Budgets Page <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* 3 Core Highlight Answer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 stagger">
        {/* Card 1: How Much You Need to Spend */}
        <div
          className="glass-card p-6 relative overflow-hidden flex flex-col justify-between"
          style={{ borderTop: "4px solid #f43f5e" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Question 1: Total Need
              </span>
              <div className="p-2 rounded-xl" style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e" }}>
                <Receipt size={18} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              How much you need to spend monthly
            </p>
            <div className="text-3xl font-black mt-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
              {formatETB(totalNeededToSpend)}
            </div>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span style={{ color: "#f43f5e" }}>Fixed: {formatETB(totalFixed)}</span>
              <span style={{ color: "#3b82f6" }}>Flexible: {formatETB(totalVariable)}</span>
            </div>
            {/* Visual ratio bar */}
            <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(100,116,139,0.15)" }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${totalNeededToSpend > 0 ? (totalFixed / totalNeededToSpend) * 100 : 50}%`,
                  background: "#f43f5e",
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${totalNeededToSpend > 0 ? (totalVariable / totalNeededToSpend) * 100 : 50}%`,
                  background: "#3b82f6",
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: How Much You Should Get Monthly */}
        <div
          className="glass-card p-6 relative overflow-hidden flex flex-col justify-between"
          style={{ borderTop: "4px solid #10b981" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Question 2: Target Income
              </span>
              <div className="p-2 rounded-xl" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              How much you should get monthly
            </p>
            <div className="text-3xl font-black mt-2 tracking-tight" style={{ color: "#10b981" }}>
              {formatETB(targetMonthlyIncome)}
            </div>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Includes <span className="font-bold text-emerald-400">{formatETB(targetSavingsAmount)}</span> savings ({savingsPct}% goal)
            </p>
            {/* Savings target selector chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_SAVINGS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setSavingsPct(pct)}
                  className="px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  style={{
                    background: savingsPct === pct ? "#10b981" : "var(--input-bg)",
                    color: savingsPct === pct ? "#fff" : "var(--text-secondary)",
                    border: savingsPct === pct ? "1px solid #10b981" : "1px solid var(--border-subtle)",
                  }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Safe-to-Spend Allowance */}
        <div
          className="glass-card p-6 relative overflow-hidden flex flex-col justify-between"
          style={{ borderTop: "4px solid #7c3aed" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Daily Safe-to-Spend
              </span>
              <div className="p-2 rounded-xl" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                <ShieldCheck size={18} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Daily allowance after fixed rent & bills
            </p>
            <div className="text-3xl font-black mt-2 tracking-tight" style={{ color: "var(--accent-purple)" }}>
              {formatETB(safeToSpendDaily)} <span className="text-sm font-semibold">/ day</span>
            </div>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>Fixed Cost Burden:</span>
              <span
                className="px-2 py-0.5 rounded-full font-bold text-xs"
                style={{
                  background:
                    fixedRatioPct <= 50
                      ? "rgba(16,185,129,0.15)"
                      : fixedRatioPct <= 65
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(244,63,94,0.15)",
                  color: fixedRatioPct <= 50 ? "#10b981" : fixedRatioPct <= 65 ? "#f59e0b" : "#f43f5e",
                }}
              >
                {fixedRatioPct}% of income
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              {formatETB(discretionaryMonthly)} monthly flexible pool remaining
            </p>
          </div>
        </div>
      </div>

      {/* Actual Monthly Income Checker Card */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-md">
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Your Actual Monthly Income / Salary
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Enter what you currently earn to see if it covers your fixed commitments and lifestyle spending.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={monthlyIncome || ""}
                onChange={(e) => setMonthlyIncome(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 50000 ETB"
                className="w-48 px-4 py-2.5 rounded-xl text-base font-bold outline-none transition-all"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
              <span className="absolute right-3 top-3 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                ETB
              </span>
            </div>

            {monthlyIncome > 0 && (
              <div
                className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{
                  background: incomeVsNeedsDiff >= 0 ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                  border: `1px solid ${incomeVsNeedsDiff >= 0 ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
                  color: incomeVsNeedsDiff >= 0 ? "#10b981" : "#f43f5e",
                }}
              >
                {incomeVsNeedsDiff >= 0 ? (
                  <>
                    <CheckCircle size={15} />
                    <span>+{formatETB(incomeVsNeedsDiff)} monthly surplus for extra savings!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={15} />
                    <span>-{formatETB(Math.abs(incomeVsNeedsDiff))} monthly deficit</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Section 1 (Fixed Expenses) & Section 2 (Variable Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Section 1: Fixed Commitments (Rent, Bills, WiFi, etc.) */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Home size={18} className="text-rose-500" /> Fixed Obligations (Rent & Bills)
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Mandatory expenses you pay every month. Type any amount below to edit directly.
                </p>
              </div>
              <span
                className="text-sm font-extrabold px-3 py-1 rounded-xl"
                style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e" }}
              >
                Total: {formatETB(totalFixed)}
              </span>
            </div>

            {/* ADD FIXED COMMITMENT FORM - PROMINENT AT TOP OF CARD */}
            <form
              onSubmit={handleAddFixedItem}
              className="p-4 rounded-xl mb-5"
              style={{
                background: "var(--input-bg)",
                border: "1.5px dashed var(--border-subtle)",
              }}
            >
              <p className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                <Plus size={14} className="text-rose-500" /> Add New Fixed Bill (Rent, WiFi, etc.)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
                <input
                  type="text"
                  required
                  placeholder="Name (e.g. Rent, WiFi)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-medium outline-none"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="Amount (ETB)"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-medium outline-none"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
                <select
                  value={newItemCat}
                  onChange={(e) => setNewItemCat(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  {FIXED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 cursor-pointer shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #f43f5e, #e11d48)",
                  color: "#fff",
                }}
              >
                <Plus size={14} /> Add Fixed Obligation
              </button>
            </form>

            {/* List of Fixed Items with INLINE DIRECT AMOUNT EDITING */}
            <div className="space-y-2.5 mb-4">
              {fixedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl transition-all"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background:
                          item.category === "Rent"
                            ? "rgba(244,63,94,0.15)"
                            : item.category === "Utilities"
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(124,58,237,0.15)",
                        color:
                          item.category === "Rent"
                            ? "#f43f5e"
                            : item.category === "Utilities"
                            ? "#10b981"
                            : "#7c3aed",
                      }}
                    >
                      {item.category === "Rent" ? <Home size={16} /> : item.category === "Utilities" ? <Wifi size={16} /> : <Zap size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {item.name}
                      </p>
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Inline direct amount editor & payment status */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.amount || ""}
                        onChange={(e) => handleUpdateFixedAmount(item.id, parseFloat(e.target.value) || 0)}
                        onBlur={handleBlurFixedAmount}
                        title="Click to edit amount directly"
                        className="w-28 text-right pr-10 pl-2 py-1.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/40 transition-all"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <span className="absolute right-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                        ETB
                      </span>
                    </div>

                    {(() => {
                      const { isPaid, totalPaid } = getItemPaymentStatus(item);
                      if (isPaid) {
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                            style={{
                              background: "rgba(16,185,129,0.15)",
                              color: "#10b981",
                              border: "1px solid rgba(16,185,129,0.3)",
                            }}
                            title={`Paid in full (${formatETB(totalPaid)})`}
                          >
                            <CheckCircle size={13} /> Paid
                          </span>
                        );
                      }
                      return (
                        <button
                          onClick={() => handleQuickLog(item)}
                          title={`Log payment for ${item.name}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                          style={{
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "#fff",
                          }}
                        >
                          <Receipt size={13} /> Pay Bill
                        </button>
                      );
                    })()}

                    <button
                      onClick={() => handleRemoveFixedItem(item.id)}
                      title="Remove item"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}

              {fixedItems.length === 0 && (
                <div
                  className="text-center py-6 px-4 rounded-xl text-xs font-medium"
                  style={{
                    background: "rgba(244,63,94,0.05)",
                    border: "1px dashed rgba(244,63,94,0.2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <p className="font-semibold" style={{ color: "#f43f5e" }}>
                    No fixed obligations added yet.
                  </p>
                  <p className="mt-1">
                    Use the form above to add your <strong>Rent</strong>, <strong>WiFi</strong>, or <strong>Bills</strong>, or click <strong>&quot;Import Budget&quot;</strong> at the top!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Flexible Living Budget */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <PieChart size={18} className="text-blue-500" /> Flexible Living Budget
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Day-to-day variable expenses. Type directly into any box below to set or edit.
                </p>
              </div>
              <span
                className="text-sm font-extrabold px-3 py-1 rounded-xl"
                style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
              >
                Total: {formatETB(totalVariable)}
              </span>
            </div>

            {/* Variable Category Inputs with direct editing */}
            <div className="space-y-3.5 mb-6">
              {Object.entries(variableLimits).map(([cat, amount]) => (
                <div
                  key={cat}
                  className="p-3.5 rounded-xl"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {cat}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Quick increment buttons */}
                      <button
                        type="button"
                        onClick={() => handleUpdateVariable(cat, amount + 500)}
                        title="Add 500 ETB"
                        className="px-2 py-1 rounded text-[11px] font-bold transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        +500
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateVariable(cat, amount + 1000)}
                        title="Add 1,000 ETB"
                        className="px-2 py-1 rounded text-[11px] font-bold transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        +1K
                      </button>

                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={amount || ""}
                          onChange={(e) => handleUpdateVariable(cat, parseFloat(e.target.value) || 0)}
                          className="w-32 text-right pr-11 pl-2 py-1.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <span className="absolute right-2.5 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                          ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Share indicator */}
                  <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <span>Monthly budget for {cat}</span>
                    <span>
                      {totalVariable > 0 ? ((amount / totalVariable) * 100).toFixed(0) : 0}% of flexible budget
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info Box */}
          <div
            className="p-4 rounded-xl text-xs space-y-1.5"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.18)",
              color: "var(--text-secondary)",
            }}
          >
            <p className="font-bold flex items-center gap-1" style={{ color: "var(--accent-purple)" }}>
              <Sparkles size={14} /> Recommended 50/30/20 Rule:
            </p>
            <p>
              • <strong>50% Needs:</strong> Fixed obligations like Rent ({formatETB(totalFixed)}) & basic utilities.
            </p>
            <p>
              • <strong>30% Wants:</strong> Flexible food, lifestyle, and outings ({formatETB(totalVariable)}).
            </p>
            <p>
              • <strong>20% Savings:</strong> Target savings ({formatETB(targetSavingsAmount)}) to build wealth and security.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Log Modal with Backdrop */}
      {logExpenseInitial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--modal-overlay)", backdropFilter: "blur(6px)" }}
        >
          <div className="glass-card p-6 w-full max-w-md fade-in">
            <ExpenseForm
              initial={logExpenseInitial}
              submitLabel={`Record ${logExpenseInitial.note || "Payment"}`}
              onClose={() => setLogExpenseInitial(null)}
              onSubmit={async (data) => {
                await api.createTransaction(data);
                try {
                  const txs = await api.getTransactions({ month: currentMonth });
                  setMonthTransactions(txs);
                } catch {
                  // ignore
                }
                setLogExpenseInitial(null);
                setMessage({ type: "success", text: `Payment of ${formatETB(data.amount)} recorded in transactions!` });
                setTimeout(() => setMessage(null), 4000);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
