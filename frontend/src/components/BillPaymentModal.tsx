"use client";
import { useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Wallet,
  Clock,
  Sparkles,
  TrendingUp,
  Receipt,
  CreditCard,
  Landmark,
  Smartphone,
  Info,
  ArrowRight,
} from "lucide-react";
import { FixedExpenseItem, AnalyticsSummary, Transaction, api } from "@/lib/api";
import { formatETB } from "@/lib/currency";

interface BillPaymentModalProps {
  item: FixedExpenseItem;
  summary: AnalyticsSummary | null;
  monthTransactions: Transaction[];
  onClose: () => void;
  onPaymentSuccess: () => Promise<void>;
}

const PAYMENT_METHODS = [
  { id: "Telebirr", label: "Telebirr", icon: Smartphone, color: "#06b6d4" },
  { id: "CBE", label: "CBE", icon: Landmark, color: "#a855f7" },
  { id: "Abyssinia", label: "Abyssinia", icon: Landmark, color: "#eab308" },
  { id: "Cash", label: "Cash", icon: Wallet, color: "#10b981" },
];

export default function BillPaymentModal({
  item,
  summary,
  monthTransactions,
  onClose,
  onPaymentSuccess,
}: BillPaymentModalProps) {
  // 1. Calculate how much has already been paid for this bill this month
  const matchingTx = monthTransactions.filter((t) => {
    const isCat = t.category.toLowerCase() === item.category.toLowerCase();
    const isNote = t.note && t.note.toLowerCase().includes(item.name.toLowerCase());
    return (isCat || isNote) && t.type !== "Income";
  });
  const alreadyPaid = matchingTx.reduce((sum, t) => sum + t.amount, 0);
  const remainingDue = Math.max(0, item.amount - alreadyPaid);

  // 2. Real-time cash reality
  const availableCash = summary ? Math.max(0, summary.available_cash) : 0;
  const hasEnough = availableCash >= remainingDue;
  const shortfall = Math.max(0, remainingDue - availableCash);

  // 3. Due date & timing calculations
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = summary?.days_in_month || 30;
  const daysRemainingInMonth = summary?.days_remaining || Math.max(1, daysInMonth - currentDay);

  let dueDescription = "Due this month";
  let targetDays = daysRemainingInMonth;
  let isOverdue = false;

  if (item.due_day) {
    const diff = item.due_day - currentDay;
    if (diff < 0) {
      dueDescription = `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} (was due on the ${item.due_day}th)`;
      isOverdue = true;
      targetDays = 1;
    } else if (diff === 0) {
      dueDescription = "Due today!";
      targetDays = 1;
    } else {
      dueDescription = `Due on the ${item.due_day}th (${diff} day${diff === 1 ? "" : "s"} left)`;
      targetDays = diff;
    }
  } else {
    dueDescription = `Due by month-end (${daysRemainingInMonth} days left in month)`;
    targetDays = daysRemainingInMonth;
  }

  // Daily earning needed to cover shortfall
  const dailyEarningNeeded = Math.ceil(shortfall / Math.max(1, targetDays));

  // Payment states
  const [step, setStep] = useState<"analysis" | "form">("analysis");
  const [payAmount, setPayAmount] = useState<number>(hasEnough ? remainingDue : Math.min(availableCash, remainingDue));
  const [selectedMethod, setSelectedMethod] = useState<string>("Telebirr");
  const [paymentDate, setPaymentDate] = useState<string>(today.toISOString().split("T")[0]);
  const [note, setNote] = useState<string>(`${item.name} payment`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPayment = (amountToPay: number) => {
    setPayAmount(amountToPay);
    setStep("form");
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createTransaction({
        amount: payAmount,
        type: "Expense",
        category: item.category,
        date: paymentDate,
        payment_method: selectedMethod,
        note: note.trim() || `${item.name} payment`,
      });
      await onPaymentSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="glass-card w-full max-w-lg p-6 my-8 rounded-2xl relative fade-in border shadow-2xl"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-primary)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-rose-500 shrink-0"
            style={{ background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.25)" }}
          >
            <Receipt size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{item.name}</h2>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124, 58, 237, 0.15)", color: "#7c3aed" }}
              >
                {item.category}
              </span>
            </div>
            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-secondary)" }}>
              <Clock size={12} className={isOverdue ? "text-rose-500" : "text-amber-500"} />
              <span className={isOverdue ? "font-bold text-rose-500" : ""}>{dueDescription}</span>
            </p>
          </div>
        </div>

        {/* STEP 1: DETAILED AFFORDABILITY & ADVICE */}
        {step === "analysis" && (
          <div className="space-y-4">
            {/* Live Financial Reality Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-3.5 rounded-xl"
                style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Bill Amount Remaining
                </p>
                <p className="text-lg font-extrabold text-rose-500 mt-1">{formatETB(remainingDue)}</p>
                {alreadyPaid > 0 && (
                  <p className="text-[10px] text-emerald-500 mt-0.5">({formatETB(alreadyPaid)} already paid)</p>
                )}
              </div>

              <div
                className="p-3.5 rounded-xl"
                style={{
                  background: hasEnough ? "rgba(16, 185, 129, 0.08)" : "rgba(244, 63, 94, 0.08)",
                  border: `1px solid ${hasEnough ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)"}`,
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Your Available Cash
                </p>
                <p className={`text-lg font-extrabold mt-1 ${hasEnough ? "text-emerald-500" : "text-amber-500"}`}>
                  {formatETB(availableCash)}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {summary ? `From ${formatETB(summary.total_income)} income` : "Current balance"}
                </p>
              </div>
            </div>

            {/* VERDICT & DETAIL */}
            {hasEnough ? (
              /* SUFFICIENT FUNDS */
              <div
                className="p-4 rounded-xl flex items-start gap-3"
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-500">You have sufficient funds!</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    After paying this bill of <strong>{formatETB(remainingDue)}</strong>, you will still have{" "}
                    <strong className="text-emerald-500">{formatETB(availableCash - remainingDue)}</strong> left in
                    available cash.
                  </p>
                </div>
              </div>
            ) : (
              /* INSUFFICIENT FUNDS ALERT & ADVICE */
              <div
                className="p-4 rounded-xl space-y-3"
                style={{
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-500">
                      Insufficient Funds — You need {formatETB(shortfall)} more
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      You have <strong>{formatETB(availableCash)}</strong> in cash right now, but this bill requires{" "}
                      <strong>{formatETB(remainingDue)}</strong>. Paying it in full right now would cause a deficit!
                    </p>
                  </div>
                </div>

                {/* Practical Advice & Daily Target Breakdown */}
                <div
                  className="p-3 rounded-lg text-xs space-y-1.5"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
                >
                  <p className="font-bold flex items-center gap-1.5" style={{ color: "var(--accent-purple)" }}>
                    <Sparkles size={13} />
                    How to bridge the gap before {dueDescription}:
                  </p>
                  <div className="space-y-1 pl-4" style={{ color: "var(--text-secondary)" }}>
                    <p>
                      • <strong>Shortfall needed:</strong>{" "}
                      <span className="text-rose-500 font-bold">{formatETB(shortfall)}</span>
                    </p>
                    <p>
                      • <strong>Timeline:</strong> {targetDays} day{targetDays === 1 ? "" : "s"} to pay.
                    </p>
                    <p>
                      • <strong>Daily earning goal:</strong> Earn{" "}
                      <span className="text-amber-500 font-bold">{formatETB(dailyEarningNeeded)} / day</span> (e.g. 1–2
                      extra rides or freelance work) to comfortably pay this bill.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="pt-2 space-y-2">
              {hasEnough ? (
                <button
                  type="button"
                  onClick={() => startPayment(remainingDue)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  <span>Proceed to Pay {formatETB(remainingDue)}</span>
                  <ArrowRight size={15} />
                </button>
              ) : (
                <>
                  {availableCash > 0 && (
                    <button
                      type="button"
                      onClick={() => startPayment(availableCash)}
                      className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                        color: "#fff",
                      }}
                    >
                      <Wallet size={15} />
                      <span>Pay Partial with Available Cash ({formatETB(availableCash)})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => startPayment(remainingDue)}
                    className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Proceed with Full Amount Anyway ({formatETB(remainingDue)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-xs font-medium transition-colors hover:underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cancel / Wait Until I Have Enough Funds
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT RECORD FORM */}
        {step === "form" && (
          <form onSubmit={handleConfirmPay} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                Confirming Payment for {item.name}
              </span>
              <button
                type="button"
                onClick={() => setStep("analysis")}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-semibold"
              >
                ← Back to Analysis
              </button>
            </div>

            {error && (
              <div
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-rose-500"
                style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)" }}
              >
                {error}
              </div>
            )}

            {/* Amount to Pay */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Amount You Are Paying Now (ETB)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount || ""}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl text-base font-extrabold outline-none focus:ring-2 focus:ring-emerald-500/50"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
                <span className="absolute right-4 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  ETB
                </span>
              </div>
              {payAmount < remainingDue && (
                <p className="text-[11px] text-amber-500 mt-1 font-medium">
                  Partial payment: {formatETB(remainingDue - payAmount)} will remain unpaid for this month.
                </p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Paid From / Payment Method
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className="py-2.5 px-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                      style={{
                        background: isSelected ? `${m.color}25` : "var(--input-bg)",
                        border: isSelected ? `1.5px solid ${m.color}` : "1px solid var(--border-subtle)",
                        color: isSelected ? m.color : "var(--text-primary)",
                      }}
                    >
                      <Icon size={16} />
                      <span className="text-[11px] font-bold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-medium outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Note / Reference
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Paid via CBE app"
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-medium outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {loading ? (
                "Recording payment..."
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Confirm & Log {formatETB(payAmount)} Payment</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
