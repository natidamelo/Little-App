"use client";
import { useState } from "react";
import { X, Banknote, Tag, Calendar, CreditCard, FileText, Landmark, Smartphone, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { TransactionCreate } from "@/lib/api";

const EXPENSE_CATEGORIES = ["Rent", "Food", "Transport", "Utilities", "Entertainment", "Others"];
const INCOME_CATEGORIES = ["Salary", "Ride Income", "Freelance", "Other Income"];

const PAYMENT_MODES = [
  { id: "Cash", label: "Cash", icon: Wallet },
  { id: "Bank", label: "Bank", icon: Landmark },
  { id: "Mobile Money", label: "Mobile Money", icon: Smartphone },
];

const BANK_OPTIONS = [
  { id: "CBE", label: "CBE", fullName: "Commercial Bank", color: "#a855f7" },
  { id: "Abyssinia", label: "Abyssinia", fullName: "Bank of Abyssinia", color: "#eab308" },
  { id: "Telebirr", label: "Telebirr", fullName: "Ethio Telecom", color: "#06b6d4" },
  { id: "Other", label: "Other", fullName: "Custom Bank", color: "#94a3b8" },
];

const MOBILE_MONEY_OPTIONS = [
  { id: "Telebirr", label: "Telebirr", fullName: "Ethio Telecom", color: "#06b6d4" },
  { id: "CBE Birr", label: "CBE Birr", fullName: "Commercial Bank", color: "#a855f7" },
  { id: "Other", label: "Other", fullName: "Custom Provider", color: "#94a3b8" },
];

interface ExpenseFormProps {
  onSubmit: (data: TransactionCreate) => Promise<void>;
  onClose?: () => void;
  initial?: Partial<TransactionCreate>;
  submitLabel?: string;
}

export default function ExpenseForm({
  onSubmit,
  onClose,
  initial,
  submitLabel,
}: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const parseInitialMethod = (pm?: string) => {
    if (!pm || pm === "Cash") {
      return { mode: "Cash", bank: "CBE", mobile: "Telebirr", otherBank: "", otherMobile: "", resolved: "Cash" };
    }
    if (pm === "CBE" || pm === "Abyssinia") {
      return { mode: "Bank", bank: pm, mobile: "Telebirr", otherBank: "", otherMobile: "", resolved: pm };
    }
    if (pm === "Telebirr" || pm === "TeleBirr") {
      return { mode: "Bank", bank: "Telebirr", mobile: "Telebirr", otherBank: "", otherMobile: "", resolved: "Telebirr" };
    }
    if (pm === "CBE Birr") {
      return { mode: "Mobile Money", bank: "CBE", mobile: "CBE Birr", otherBank: "", otherMobile: "", resolved: "CBE Birr" };
    }
    if (pm === "Bank") {
      return { mode: "Bank", bank: "CBE", mobile: "Telebirr", otherBank: "", otherMobile: "", resolved: "CBE" };
    }
    if (pm === "Mobile Money") {
      return { mode: "Mobile Money", bank: "CBE", mobile: "Telebirr", otherBank: "", otherMobile: "", resolved: "Telebirr" };
    }
    return { mode: "Bank", bank: "Other", mobile: "Telebirr", otherBank: pm, otherMobile: "", resolved: pm };
  };

  const initialType = initial?.type ?? "Expense";
  const parsed = parseInitialMethod(initial?.payment_method);

  const [txType, setTxType] = useState<"Expense" | "Income">(initialType as "Expense" | "Income");
  const [paymentMode, setPaymentMode] = useState<string>(parsed.mode);
  const [selectedBank, setSelectedBank] = useState<string>(parsed.bank);
  const [otherBankName, setOtherBankName] = useState<string>(parsed.otherBank);
  const [selectedMobile, setSelectedMobile] = useState<string>(parsed.mobile);
  const [otherMobileName, setOtherMobileName] = useState<string>(parsed.otherMobile);

  const defaultCategory = initialType === "Income" ? "Ride Income" : "Food";

  const [form, setForm] = useState<TransactionCreate>({
    amount: initial?.amount ?? 0,
    type: initialType,
    category: initial?.category ?? defaultCategory,
    date: initial?.date ?? today,
    payment_method: parsed.resolved,
    note: initial?.note ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof TransactionCreate, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleTypeToggle = (type: "Expense" | "Income") => {
    setTxType(type);
    const newCategory = type === "Income" ? "Ride Income" : "Food";
    setForm((f) => ({ ...f, type, category: newCategory }));
  };

  const handleModeChange = (mode: string) => {
    setPaymentMode(mode);
    if (mode === "Cash") {
      set("payment_method", "Cash");
    } else if (mode === "Bank") {
      const bankVal = selectedBank === "Other" ? (otherBankName.trim() || "Other Bank") : selectedBank;
      set("payment_method", bankVal);
    } else if (mode === "Mobile Money") {
      const mobVal = selectedMobile === "Other" ? (otherMobileName.trim() || "Mobile Money") : selectedMobile;
      set("payment_method", mobVal);
    }
  };

  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId);
    if (bankId === "Other") {
      set("payment_method", otherBankName.trim() || "Other Bank");
    } else {
      set("payment_method", bankId);
    }
  };

  const handleOtherBankChange = (name: string) => {
    setOtherBankName(name);
    set("payment_method", name.trim() || "Other Bank");
  };

  const handleMobileSelect = (serviceId: string) => {
    setSelectedMobile(serviceId);
    if (serviceId === "Other") {
      set("payment_method", otherMobileName.trim() || "Mobile Money");
    } else {
      set("payment_method", serviceId);
    }
  };

  const handleOtherMobileChange = (name: string) => {
    setOtherMobileName(name);
    set("payment_method", name.trim() || "Mobile Money");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) { setError("Amount must be greater than 0"); return; }
    setError("");
    setLoading(true);
    try {
      await onSubmit({ ...form, amount: Number(form.amount) });
      onClose?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-purple-500/50";
  const inputStyle = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    color: "var(--text-primary)",
  };

  // Custom categories state
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
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const isIncome = txType === "Income";
  const accentColor = isIncome ? "#10b981" : "#7c3aed";
  const baseCategories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categories = Array.from(new Set([...baseCategories, ...customCategories]));
  const dynamicLabel = submitLabel ?? (isIncome ? "Add Income" : "Add Expense");

  const handleCreateCategory = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!categories.includes(formatted)) {
      const updated = [...customCategories, formatted];
      setCustomCategories(updated);
      try {
        localStorage.setItem("spendpulse_custom_categories", JSON.stringify(updated));
      } catch {}
    }
    set("category", formatted);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {onClose && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {dynamicLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Income / Expense Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}>
        <button
          type="button"
          onClick={() => handleTypeToggle("Expense")}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
          style={{
            background: !isIncome ? "rgba(124,58,237,0.2)" : "transparent",
            border: !isIncome ? "1.5px solid rgba(124,58,237,0.5)" : "1.5px solid transparent",
            color: !isIncome ? "#7c3aed" : "var(--text-muted)",
          }}
        >
          <TrendingDown size={15} />
          Expense
        </button>
        <button
          type="button"
          onClick={() => handleTypeToggle("Income")}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
          style={{
            background: isIncome ? "rgba(16,185,129,0.2)" : "transparent",
            border: isIncome ? "1.5px solid rgba(16,185,129,0.5)" : "1.5px solid transparent",
            color: isIncome ? "#10b981" : "var(--text-muted)",
          }}
        >
          <TrendingUp size={15} />
          Income
        </button>
      </div>

      {/* Income type hint */}
      {isIncome && (
        <div className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>
          🚗 Log your Ride earnings or Salary — tracked separately from expenses
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#f43f5e" }}
        >
          {error}
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          <Banknote size={13} className="inline mr-1" />Amount (ETB)
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={form.amount || ""}
          onChange={(e) => set("amount", e.target.value)}
          placeholder="0.00 ETB"
          className={inputClass}
          style={{
            ...inputStyle,
            borderColor: form.amount > 0 ? `${accentColor}80` : "var(--input-border)",
          }}
        />
      </div>

      {/* Category + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              <Tag size={12} className="inline mr-1" />Category
            </label>
            <button
              type="button"
              onClick={() => setIsAddingCategory((v) => !v)}
              className="text-[10px] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              style={{ color: "var(--accent-purple)" }}
            >
              {isAddingCategory ? "Cancel" : "+ New"}
            </button>
          </div>

          {isAddingCategory ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                className={inputClass}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-3 py-3 rounded-xl text-xs font-bold text-white shrink-0 shadow-md cursor-pointer hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
              >
                Add
              </button>
            </div>
          ) : (
            <select
              id="expense-category-select"
              value={form.category}
              onChange={(e) => {
                if (e.target.value === "__NEW__") {
                  setIsAddingCategory(true);
                } else {
                  set("category", e.target.value);
                }
              }}
              className={inputClass}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {categories.map((c) => (
                <option
                  key={c}
                  value={c}
                  style={{
                    backgroundColor: "var(--select-option-bg)",
                    color: "var(--select-option-color)",
                  }}
                >
                  {c}
                </option>
              ))}
              <option value="__NEW__" style={{ color: "#7c3aed", fontWeight: "bold" }}>
                ✨ + Add New Category...
              </option>
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            <Calendar size={12} className="inline mr-1" />Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            <CreditCard size={12} className="inline mr-1" />Payment Method
          </label>
          <span
            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              background: form.payment_method === "Cash" ? "rgba(16,185,129,0.15)"
                : form.payment_method === "CBE" ? "rgba(168,85,247,0.15)"
                : form.payment_method === "Abyssinia" ? "rgba(234,179,8,0.15)"
                : form.payment_method === "Telebirr" ? "rgba(6,182,212,0.15)"
                : "rgba(124,58,237,0.15)",
              color: form.payment_method === "Cash" ? "#10b981"
                : form.payment_method === "CBE" ? "#a855f7"
                : form.payment_method === "Abyssinia" ? "#d97706"
                : form.payment_method === "Telebirr" ? "#0284c7"
                : "#7c3aed",
              border: "1px solid currentColor",
            }}
          >
            {form.payment_method}
          </span>
        </div>

        {/* Primary Modes: Cash, Bank, Mobile Money */}
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = paymentMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id)}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
                style={{
                  background: isSelected ? "rgba(124,58,237,0.18)" : "var(--input-bg)",
                  border: isSelected ? "1.5px solid rgba(124,58,237,0.6)" : "1px solid var(--border-subtle)",
                  color: isSelected ? "var(--accent-purple)" : "var(--text-secondary)",
                }}
              >
                <Icon size={14} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* What Bank? Options (When Bank is selected) */}
        {paymentMode === "Bank" && (
          <div
            className="mt-3 p-3.5 rounded-xl transition-all"
            style={{
              background: "var(--bank-panel-bg)",
              border: "1px solid var(--bank-panel-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--accent-purple)" }}>
                <Landmark size={13} />
                What Bank?
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                CBE, Abyssinia, or Telebirr
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {BANK_OPTIONS.map((b) => {
                const isSelected = selectedBank === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBankSelect(b.id)}
                    className="py-2 px-2 rounded-xl text-center transition-all duration-200 flex flex-col items-center justify-center gap-0.5 hover:scale-[1.02]"
                    style={{
                      background: isSelected ? `${b.color}25` : "var(--input-bg)",
                      border: isSelected ? `1.5px solid ${b.color}` : "1px solid var(--border-subtle)",
                      boxShadow: isSelected ? `0 0 10px ${b.color}30` : "none",
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color: isSelected ? b.color : "var(--text-primary)" }}>
                      {b.label}
                    </span>
                    <span className="text-[9px] truncate max-w-full" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {b.fullName}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedBank === "Other" && (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={otherBankName}
                  onChange={(e) => handleOtherBankChange(e.target.value)}
                  placeholder="Enter bank name (e.g. Awash Bank, Dashen Bank)"
                  className={inputClass}
                  style={inputStyle}
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {/* Mobile Money Provider Options (When Mobile Money is selected) */}
        {paymentMode === "Mobile Money" && (
          <div
            className="mt-3 p-3.5 rounded-xl transition-all"
            style={{
              background: "var(--mobile-panel-bg)",
              border: "1px solid var(--mobile-panel-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--accent-cyan)" }}>
                <Smartphone size={13} />
                Provider / Service
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Ethio Telecom / CBE Birr
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {MOBILE_MONEY_OPTIONS.map((m) => {
                const isSelected = selectedMobile === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMobileSelect(m.id)}
                    className="py-2 px-2 rounded-xl text-center transition-all duration-200 flex flex-col items-center justify-center gap-0.5 hover:scale-[1.02]"
                    style={{
                      background: isSelected ? `${m.color}25` : "var(--input-bg)",
                      border: isSelected ? `1.5px solid ${m.color}` : "1px solid var(--border-subtle)",
                      boxShadow: isSelected ? `0 0 10px ${m.color}30` : "none",
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color: isSelected ? m.color : "var(--text-primary)" }}>
                      {m.label}
                    </span>
                    <span className="text-[9px] truncate max-w-full" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {m.fullName}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMobile === "Other" && (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={otherMobileName}
                  onChange={(e) => handleOtherMobileChange(e.target.value)}
                  placeholder="Enter provider name (e.g. Chapa, E-Birr)"
                  className={inputClass}
                  style={inputStyle}
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          <FileText size={12} className="inline mr-1" />Note (optional)
        </label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder={isIncome ? "e.g. 3 trips today, 450 ETB each" : "e.g. Grocery run"}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-md"
        style={{
          background: isIncome
            ? "linear-gradient(135deg, #10b981, #059669)"
            : "linear-gradient(135deg, #7c3aed, #3b82f6)",
          color: "#fff",
        }}
      >
        {loading ? "Saving..." : dynamicLabel}
      </button>
    </form>
  );
}
