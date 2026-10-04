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
  Clock,
  Target,
  X,
} from "lucide-react";
import {
  api,
  FixedExpenseItem,
  PlannerConfig,
  PlannerResponse,
  Transaction,
  TransactionCreate,
  AnalyticsSummary,
} from "@/lib/api";
import { formatETB } from "@/lib/currency";
import { getCurrentMonth, formatMonthYear } from "@/lib/dateUtils";
import ExpenseForm from "@/components/ExpenseForm";
import BillPaymentModal from "@/components/BillPaymentModal";
import MonthProgressDashboard from "@/components/MonthProgressDashboard";
import BillsTracker from "@/components/BillsTracker";
import FinancialHealthCard from "@/components/FinancialHealthCard";

const PRESET_SAVINGS = [0, 5, 10, 15, 20, 25, 30];
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

  // Recorded transactions & summary
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  // Modals
  const [payingBillItem, setPayingBillItem] = useState<FixedExpenseItem | null>(null);
  const [logExpenseInitial, setLogExpenseInitial] = useState<Partial<TransactionCreate> | null>(null);

  // New fixed item draft
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemCat, setNewItemCat] = useState("Rent");
  const [newItemDueDay, setNewItemDueDay] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch planner & summary on mount
  useEffect(() => {
    async function load() {
      try {
        const [plannerData, summaryData, txs] = await Promise.all([
          api.getPlanner(),
          api.getSummary(currentMonth).catch(() => null),
          api.getTransactions({ month: currentMonth }).catch(() => []),
        ]);

        if (summaryData) setSummary(summaryData);
        setMonthTransactions(txs);
        setMonthlyIncome(plannerData.monthly_income || 0);
        setSavingsPct(plannerData.savings_target_pct || 20);
        setFixedItems(plannerData.fixed_items || []);
        setVariableLimits({
          Food: Number(plannerData.variable_limits?.Food) || 0,
          Transport: Number(plannerData.variable_limits?.Transport) || 0,
          Entertainment: Number(plannerData.variable_limits?.Entertainment) || 0,
          Others: Number(plannerData.variable_limits?.Others) || 0,
        });
      } catch (e) {
        console.error("Failed to load planner settings", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentMonth]);

  // ─── Calculations ───
  const totalFixed = useMemo(() => {
    return Math.round(fixedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0));
  }, [fixedItems]);

  const totalVariable = useMemo(() => {
    return Math.round(
      Object.values(variableLimits).reduce((acc, val) => acc + (Number(val) || 0), 0)
    );
  }, [variableLimits]);

  const totalNeededToSpend = totalFixed + totalVariable;

  const targetMonthlyIncome = useMemo(() => {
    const pct = Math.max(0, Math.min(savingsPct, 95));
    if (pct === 0) return totalNeededToSpend;
    return Math.round(totalNeededToSpend / (1 - pct / 100));
  }, [totalNeededToSpend, savingsPct]);

  const targetSavingsAmount = Math.max(0, targetMonthlyIncome - totalNeededToSpend);

  const discretionaryMonthly = useMemo(() => {
    if (monthlyIncome > 0) return Math.max(monthlyIncome - totalFixed, 0);
    return totalVariable;
  }, [monthlyIncome, totalFixed, totalVariable]);

  const safeToSpendDaily = Math.round(discretionaryMonthly / 30);

  const incomeVsNeedsDiff = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    return monthlyIncome - totalNeededToSpend;
  }, [monthlyIncome, totalNeededToSpend]);

  const fixedRatioPct = useMemo(() => {
    const base = monthlyIncome > 0 ? monthlyIncome : targetMonthlyIncome;
    if (base <= 0) return 0;
    return Math.round((totalFixed / base) * 100);
  }, [totalFixed, monthlyIncome, targetMonthlyIncome]);

  // ─── Auto-save helper ───
  const autoSave = async (
    overrides: Partial<{
      fixed_items: FixedExpenseItem[];
      variable_limits: Record<string, number>;
      monthly_income: number;
      savings_target_pct: number;
    }> = {}
  ) => {
    try {
      await api.savePlanner({
        monthly_income: overrides.monthly_income ?? monthlyIncome,
        savings_target_pct: overrides.savings_target_pct ?? savingsPct,
        fixed_items: overrides.fixed_items ?? fixedItems,
        variable_limits: overrides.variable_limits ?? variableLimits,
      });
    } catch {
      // silent
    }
  };

  // ─── Fixed item handlers ───
  const handleAddFixedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemAmount || Number(newItemAmount) <= 0) return;

    const dueDayNum = newItemDueDay ? parseInt(newItemDueDay) : undefined;
    const newItem: FixedExpenseItem = {
      id: `fix-${Date.now()}`,
      name: newItemName.trim(),
      amount: parseFloat(newItemAmount),
      category: newItemCat,
      due_day: dueDayNum && dueDayNum >= 1 && dueDayNum <= 31 ? dueDayNum : undefined,
    };
    const updated = [newItem, ...fixedItems];
    setFixedItems(updated);
    setNewItemName("");
    setNewItemAmount("");
    setNewItemDueDay("");
    setShowAddForm(false);

    await autoSave({ fixed_items: updated });
    setMessage({ type: "success", text: `Added "${newItem.name}" — ${formatETB(newItem.amount)}` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateFixedAmount = (id: string, amount: number) => {
    setFixedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: Math.max(0, amount) } : item))
    );
  };

  const handleBlurFixedAmount = async () => {
    await autoSave();
  };

  const handleRemoveFixedItem = async (id: string) => {
    const itemToRemove = fixedItems.find((it) => it.id === id);
    const updated = fixedItems.filter((it) => it.id !== id);
    setFixedItems(updated);
    await autoSave({ fixed_items: updated });
    setMessage({
      type: "success",
      text: itemToRemove ? `Removed "${itemToRemove.name}"` : "Removed fixed obligation.",
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateVariable = (cat: string, val: number) => {
    setVariableLimits((prev) => ({ ...prev, [cat]: Math.max(0, val) }));
  };

  // ─── Import / Save / Apply ───
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
      setMessage({ type: "success", text: `Imported ${formatMonthYear(currentMonth)} budget!` });
      setTimeout(() => setMessage(null), 5000);
    } catch {
      setMessage({ type: "error", text: "Failed to import from active budget." });
    } finally {
      setImporting(false);
    }
  };

  const handleSavePlanner = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.savePlanner({
        monthly_income: monthlyIncome,
        savings_target_pct: savingsPct,
        fixed_items: fixedItems,
        variable_limits: variableLimits,
      });
      setMessage({ type: "success", text: "Plan saved successfully!" });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: "error", text: "Failed to save planner settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyBudget = async () => {
    setApplying(true);
    setMessage(null);
    try {
      await api.savePlanner({
        monthly_income: monthlyIncome,
        savings_target_pct: savingsPct,
        fixed_items: fixedItems,
        variable_limits: variableLimits,
      });
      const res = await api.applyPlannerBudget(currentMonth);
      setMessage({
        type: "success",
        text: `Applied! ${formatETB(res.overall_limit)} budget set for ${formatMonthYear(currentMonth)}.`,
      });
      setTimeout(() => setMessage(null), 5000);
    } catch {
      setMessage({ type: "error", text: "Failed to apply budget to this month." });
    } finally {
      setApplying(false);
    }
  };

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 rounded-xl w-64" style={{ background: "var(--border-subtle)" }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-96 rounded-2xl" style={{ background: "var(--border-subtle)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* ═══════════ Header ═══════════ */}
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
            Plan your spending, track bills, and discover your target monthly earnings.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleImportBudget}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            style={{
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#3b82f6",
            }}
          >
            <Download size={15} />
            <span className="hidden sm:inline">{importing ? "Importing..." : `Import ${formatMonthYear(currentMonth)} Budget`}</span>
            <span className="sm:hidden">{importing ? "..." : "Import"}</span>
          </button>

          <button
            onClick={handleSavePlanner}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={handleApplyBudget}
            disabled={applying}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-purple-500/20 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
          >
            <Upload size={15} />
            {applying ? "Applying..." : "Apply to Budget"}
          </button>
        </div>
      </div>

      {/* ═══════════ Notification Toast ═══════════ */}
      {message && (
        <div
          className="mb-6 p-3.5 rounded-xl flex items-center justify-between gap-3 fade-in shadow-md"
          style={{
            background: message.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
            border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
            color: message.type === "success" ? "#10b981" : "#f43f5e",
          }}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══════════ NEW: Month Progress Dashboard ═══════════ */}
      <MonthProgressDashboard
        summary={summary}
        targetMonthlyIncome={targetMonthlyIncome}
        totalNeededToSpend={totalNeededToSpend}
        totalFixed={totalFixed}
        totalVariable={totalVariable}
        targetSavingsAmount={targetSavingsAmount}
        savingsPct={savingsPct}
        currentMonth={currentMonth}
      />

      {/* ═══════════ 3 Core Answer Cards ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8 stagger">
        {/* Card 1: How Much You Need to Spend */}
        <div
          className="glass-card p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between"
          style={{ borderTop: "4px solid #f43f5e" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Q1: Total Need
              </span>
              <div className="p-2 rounded-xl" style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e" }}>
                <Receipt size={18} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Monthly spending requirement
            </p>
            <div className="text-3xl font-black mt-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
              {formatETB(totalNeededToSpend)}
            </div>
          </div>

          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span style={{ color: "#f43f5e" }}>Fixed: {formatETB(totalFixed)}</span>
              <span style={{ color: "#3b82f6" }}>Flexible: {formatETB(totalVariable)}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden flex" style={{ background: "rgba(100,116,139,0.15)" }}>
              <div
                className="h-full rounded-l-full transition-all duration-700"
                style={{
                  width: `${totalNeededToSpend > 0 ? (totalFixed / totalNeededToSpend) * 100 : 50}%`,
                  background: "linear-gradient(to right, #f43f5e, #fb7185)",
                }}
              />
              <div
                className="h-full rounded-r-full transition-all duration-700"
                style={{
                  width: `${totalNeededToSpend > 0 ? (totalVariable / totalNeededToSpend) * 100 : 50}%`,
                  background: "linear-gradient(to right, #3b82f6, #60a5fa)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Target Monthly Income */}
        <div
          className="glass-card p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between"
          style={{ borderTop: "4px solid #10b981" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Q2: Target Income
              </span>
              <div className="p-2 rounded-xl" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              How much you should earn monthly
            </p>
            <div className="text-3xl font-black mt-2 tracking-tight" style={{ color: "#10b981" }}>
              {formatETB(targetMonthlyIncome)}
            </div>
          </div>

          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Includes <span className="font-bold text-emerald-400">{formatETB(targetSavingsAmount)}</span> savings ({savingsPct}% goal)
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {PRESET_SAVINGS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setSavingsPct(pct)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
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

        {/* Card 3: Daily Safe-to-Spend */}
        <div
          className="glass-card p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between"
          style={{ borderTop: "4px solid #7c3aed" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Daily Safe-to-Spend
              </span>
              <div className="p-2 rounded-xl" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                <ShieldCheck size={18} />
              </div>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Daily allowance after fixed costs
            </p>
            <div className="text-3xl font-black mt-2 tracking-tight" style={{ color: "var(--accent-purple)" }}>
              {formatETB(safeToSpendDaily)} <span className="text-sm font-semibold">/ day</span>
            </div>
          </div>

          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>Fixed Cost Burden:</span>
              <span
                className="px-2.5 py-0.5 rounded-full font-bold text-xs"
                style={{
                  background:
                    fixedRatioPct <= 50 ? "rgba(16,185,129,0.15)" : fixedRatioPct <= 65 ? "rgba(245,158,11,0.15)" : "rgba(244,63,94,0.15)",
                  color: fixedRatioPct <= 50 ? "#10b981" : fixedRatioPct <= 65 ? "#f59e0b" : "#f43f5e",
                }}
              >
                {fixedRatioPct}% of income
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              {formatETB(discretionaryMonthly)} monthly flexible pool
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ Actual Income Input ═══════════ */}
      <div className="glass-card p-5 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="sm:max-w-md">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Target size={18} className="text-blue-500" />
              Your Actual Monthly Income
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Enter your salary/earnings to check if it covers your planned spending.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={monthlyIncome || ""}
                onChange={(e) => setMonthlyIncome(parseFloat(e.target.value) || 0)}
                onBlur={() => autoSave({ monthly_income: monthlyIncome })}
                placeholder="e.g. 50000"
                className="w-44 px-4 py-2.5 rounded-xl text-base font-bold outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
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
                className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{
                  background: incomeVsNeedsDiff >= 0 ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                  border: `1px solid ${incomeVsNeedsDiff >= 0 ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
                  color: incomeVsNeedsDiff >= 0 ? "#10b981" : "#f43f5e",
                }}
              >
                {incomeVsNeedsDiff >= 0 ? (
                  <><CheckCircle size={14} /> +{formatETB(incomeVsNeedsDiff)} surplus</>
                ) : (
                  <><AlertCircle size={14} /> -{formatETB(Math.abs(incomeVsNeedsDiff))} deficit</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ NEW: Bills Payment Tracker ═══════════ */}
      {fixedItems.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <BillsTracker
            fixedItems={fixedItems}
            monthTransactions={monthTransactions}
            onPayBill={setPayingBillItem}
          />
        </div>
      )}

      {/* ═══════════ Main Grid: Fixed + Variable ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* ── Section 1: Fixed Commitments ── */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Home size={18} className="text-rose-500" /> Fixed Obligations
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Rent, bills, and mandatory monthly expenses.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-xl"
                  style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e" }}
                >
                  {formatETB(totalFixed)}
                </span>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="p-2 rounded-xl transition-all hover:scale-110 cursor-pointer"
                  style={{
                    background: showAddForm ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.08)",
                    color: "#f43f5e",
                    border: "1px solid rgba(244,63,94,0.25)",
                  }}
                  title="Add new fixed bill"
                >
                  {showAddForm ? <X size={16} /> : <Plus size={16} />}
                </button>
              </div>
            </div>

            {/* Add form - collapsible */}
            {showAddForm && (
              <form
                onSubmit={handleAddFixedItem}
                className="p-4 rounded-xl mb-4 fade-in"
                style={{
                  background: "var(--input-bg)",
                  border: "1.5px dashed rgba(244,63,94,0.3)",
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Name (e.g. Rent, WiFi)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="px-3 py-2.5 rounded-xl text-xs font-medium outline-none"
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
                    className="px-3 py-2.5 rounded-xl text-xs font-medium outline-none"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="px-3 py-2.5 rounded-xl text-xs font-medium outline-none cursor-pointer"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {FIXED_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Due Day (1-31)"
                    value={newItemDueDay}
                    onChange={(e) => setNewItemDueDay(e.target.value)}
                    className="px-3 py-2.5 rounded-xl text-xs font-medium outline-none"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 cursor-pointer shadow-sm"
                  style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", color: "#fff" }}
                >
                  <Plus size={14} /> Add Fixed Obligation
                </button>
              </form>
            )}

            {/* Fixed items list */}
            <div className="space-y-2 mb-4">
              {fixedItems.map((item) => {
                const iconColor =
                  item.category === "Rent" ? "#f43f5e" : item.category === "Utilities" ? "#10b981" : "#7c3aed";
                const IconComp = item.category === "Rent" ? Home : item.category === "Utilities" ? Wifi : Zap;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl transition-all"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${iconColor}18`, color: iconColor }}
                      >
                        <IconComp size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                            {item.category}
                          </span>
                          {item.due_day && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                              style={{
                                background: "rgba(245,158,11,0.12)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.25)",
                              }}
                            >
                              <Clock size={8} /> Due {item.due_day}th
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.amount || ""}
                          onChange={(e) => handleUpdateFixedAmount(item.id, parseFloat(e.target.value) || 0)}
                          onBlur={handleBlurFixedAmount}
                          className="w-24 sm:w-28 text-right pr-9 pl-2 py-1.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/40 transition-all"
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <span className="absolute right-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                          ETB
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFixedItem(item.id)}
                        title="Remove"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {fixedItems.length === 0 && (
                <div
                  className="text-center py-8 px-4 rounded-xl text-xs font-medium"
                  style={{
                    background: "rgba(244,63,94,0.05)",
                    border: "1px dashed rgba(244,63,94,0.2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <p className="text-2xl mb-2">🏠</p>
                  <p className="font-semibold" style={{ color: "#f43f5e" }}>No fixed obligations yet.</p>
                  <p className="mt-1">
                    Click <strong>+</strong> above to add Rent, WiFi, or other bills.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Flexible Living Budget ── */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <PieChart size={18} className="text-blue-500" /> Flexible Living Budget
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Day-to-day variable expenses you can control.
                </p>
              </div>
              <span
                className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-xl"
                style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
              >
                {formatETB(totalVariable)}
              </span>
            </div>

            {/* Variable Category Inputs */}
            <div className="space-y-3 mb-6">
              {Object.entries(variableLimits).map(([cat, amount]) => {
                const catColors: Record<string, string> = {
                  Food: "#10b981",
                  Transport: "#3b82f6",
                  Entertainment: "#a78bfa",
                  Others: "#64748b",
                };
                const color = catColors[cat] || "#64748b";
                const pct = totalVariable > 0 ? Math.round((amount / totalVariable) * 100) : 0;

                return (
                  <div
                    key={cat}
                    className="p-3.5 rounded-xl"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          {cat}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color, background: `${color}15` }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateVariable(cat, amount + 500)}
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
                            onBlur={() => autoSave()}
                            className="w-28 sm:w-32 text-right pr-10 pl-2 py-1.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                            style={{
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-primary)",
                            }}
                          />
                          <span className="absolute right-2.5 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                            ETB
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mini progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--progress-track)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 50/30/20 Rule */}
          <div
            className="p-4 rounded-xl text-xs space-y-2"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.18)",
              color: "var(--text-secondary)",
            }}
          >
            <p className="font-bold flex items-center gap-1.5" style={{ color: "var(--accent-purple)" }}>
              <Sparkles size={14} /> Recommended 50/30/20 Rule
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg text-center" style={{ background: "rgba(244,63,94,0.08)" }}>
                <p className="text-lg font-black" style={{ color: "#f43f5e" }}>50%</p>
                <p className="text-[10px] font-semibold">Needs</p>
                <p className="text-[10px]">{formatETB(totalFixed)}</p>
              </div>
              <div className="p-2 rounded-lg text-center" style={{ background: "rgba(59,130,246,0.08)" }}>
                <p className="text-lg font-black" style={{ color: "#3b82f6" }}>30%</p>
                <p className="text-[10px] font-semibold">Wants</p>
                <p className="text-[10px]">{formatETB(totalVariable)}</p>
              </div>
              <div className="p-2 rounded-lg text-center" style={{ background: "rgba(16,185,129,0.08)" }}>
                <p className="text-lg font-black" style={{ color: "#10b981" }}>20%</p>
                <p className="text-[10px] font-semibold">Savings</p>
                <p className="text-[10px]">{formatETB(targetSavingsAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ NEW: Financial Health Score ═══════════ */}
      <FinancialHealthCard
        summary={summary}
        targetMonthlyIncome={targetMonthlyIncome}
        totalNeededToSpend={totalNeededToSpend}
        totalFixed={totalFixed}
        totalVariable={totalVariable}
        targetSavingsAmount={targetSavingsAmount}
        fixedRatioPct={fixedRatioPct}
        monthlyIncome={monthlyIncome}
      />

      {/* ═══════════ Modals ═══════════ */}
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
                  const [s, txs] = await Promise.all([
                    api.getSummary(currentMonth).catch(() => null),
                    api.getTransactions({ month: currentMonth }).catch(() => []),
                  ]);
                  if (s) setSummary(s);
                  setMonthTransactions(txs);
                } catch {}
                setLogExpenseInitial(null);
                setMessage({ type: "success", text: `Payment of ${formatETB(data.amount)} recorded!` });
                setTimeout(() => setMessage(null), 4000);
              }}
            />
          </div>
        </div>
      )}

      {payingBillItem && (
        <BillPaymentModal
          item={payingBillItem}
          summary={summary}
          monthTransactions={monthTransactions}
          onClose={() => setPayingBillItem(null)}
          onPaymentSuccess={async () => {
            const [s, txs] = await Promise.all([
              api.getSummary(currentMonth).catch(() => null),
              api.getTransactions({ month: currentMonth }).catch(() => []),
            ]);
            if (s) setSummary(s);
            setMonthTransactions(txs);
            setMessage({
              type: "success",
              text: `Payment recorded for ${payingBillItem.name}!`,
            });
            setTimeout(() => setMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}
