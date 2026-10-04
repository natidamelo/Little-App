"use client";

import React, { useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Receipt,
  Home,
  Wifi,
  Zap,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { FixedExpenseItem, Transaction } from "@/lib/api";
import { formatETB } from "@/lib/currency";

interface BillsTrackerProps {
  fixedItems: FixedExpenseItem[];
  monthTransactions: Transaction[];
  onPayBill: (item: FixedExpenseItem) => void;
}

export default function BillsTracker({
  fixedItems,
  monthTransactions,
  onPayBill,
}: BillsTrackerProps) {
  const today = new Date();
  const currentDay = today.getDate();

  // Calculate payment status for each item
  const billsWithStatus = useMemo(() => {
    return fixedItems.map((item) => {
      const matching = monthTransactions.filter((t) => {
        const isCat = t.category.toLowerCase() === item.category.toLowerCase();
        const isNote = t.note && t.note.toLowerCase().includes(item.name.toLowerCase());
        return (isCat || isNote) && t.type !== "Income";
      });
      const totalPaid = matching.reduce((sum, t) => sum + t.amount, 0);
      const isPaid = totalPaid >= item.amount && item.amount > 0;
      const isPartial = totalPaid > 0 && totalPaid < item.amount;
      const remaining = Math.max(0, item.amount - totalPaid);

      // Due date logic
      let dueStatus: "overdue" | "today" | "upcoming" | "none" = "none";
      let dueText = "";
      if (item.due_day) {
        const diff = item.due_day - currentDay;
        if (diff < 0) {
          dueStatus = "overdue";
          dueText = `${Math.abs(diff)}d overdue`;
        } else if (diff === 0) {
          dueStatus = "today";
          dueText = "Due today!";
        } else {
          dueStatus = "upcoming";
          dueText = `Due in ${diff}d (${item.due_day}th)`;
        }
      }

      return {
        ...item,
        totalPaid,
        isPaid,
        isPartial,
        remaining,
        dueStatus,
        dueText,
      };
    });
  }, [fixedItems, monthTransactions, currentDay]);

  const totalFixedAmount = useMemo(
    () => fixedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0),
    [fixedItems]
  );

  const totalPaidAmount = useMemo(
    () => billsWithStatus.reduce((sum, b) => sum + Math.min(b.totalPaid, b.amount), 0),
    [billsWithStatus]
  );

  const paidCount = billsWithStatus.filter((b) => b.isPaid).length;
  const totalCount = fixedItems.length;
  const progressPct = totalFixedAmount > 0 ? Math.round((totalPaidAmount / totalFixedAmount) * 100) : 0;
  const remainingTotal = Math.max(0, totalFixedAmount - totalPaidAmount);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "rent":
        return Home;
      case "utilities":
        return Wifi;
      default:
        return Zap;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "rent":
        return "#f43f5e";
      case "utilities":
        return "#10b981";
      case "transport":
        return "#3b82f6";
      default:
        return "#7c3aed";
    }
  };

  return (
    <div className="glass-card p-5 sm:p-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(124, 58, 237, 0.15)", color: "#7c3aed" }}
            >
              <Receipt size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Bills & Obligations Checklist
              </h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {paidCount} of {totalCount} bills paid this month ({progressPct}%)
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar + Amount */}
        <div className="flex items-center gap-3 sm:text-right">
          <div className="w-32 sm:w-40">
            <div className="flex justify-between text-[11px] mb-1 font-semibold">
              <span style={{ color: "#10b981" }}>{formatETB(totalPaidAmount)}</span>
              <span style={{ color: "var(--text-muted)" }}>of {formatETB(totalFixedAmount)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--progress-track)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: progressPct === 100
                    ? "#10b981"
                    : "linear-gradient(to right, #7c3aed, #10b981)",
                }}
              />
            </div>
          </div>
          {progressPct === 100 && (
            <span
              className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
            >
              <ShieldCheck size={13} /> All Paid!
            </span>
          )}
        </div>
      </div>

      {/* Bill Items Grid / List */}
      <div className="space-y-2.5">
        {billsWithStatus.map((bill) => {
          const IconComp = getCategoryIcon(bill.category);
          const catColor = getCategoryColor(bill.category);

          // Status colors
          const statusBorderColor = bill.isPaid
            ? "#10b981"
            : bill.isPartial
            ? "#f59e0b"
            : bill.dueStatus === "overdue"
            ? "#f43f5e"
            : "var(--border-subtle)";

          return (
            <div
              key={bill.id}
              className="p-3.5 rounded-xl transition-all duration-200 flex items-center justify-between gap-3 hover:translate-x-0.5"
              style={{
                background: bill.isPaid
                  ? "rgba(16, 185, 129, 0.04)"
                  : "var(--input-bg)",
                border: "1px solid var(--border-subtle)",
                borderLeft: `4px solid ${statusBorderColor}`,
              }}
            >
              {/* Left: Icon + Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: bill.isPaid ? "rgba(16, 185, 129, 0.15)" : `${catColor}15`,
                    color: bill.isPaid ? "#10b981" : catColor,
                  }}
                >
                  <IconComp size={16} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-bold truncate ${bill.isPaid ? "line-through opacity-70" : ""}`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {bill.name}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        background: `${catColor}15`,
                        color: catColor,
                      }}
                    >
                      {bill.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    {/* Due badge */}
                    {bill.due_day && (
                      <span
                        className="text-[10px] font-semibold flex items-center gap-0.5 px-1.5 py-0.2 rounded"
                        style={{
                          background:
                            bill.isPaid
                              ? "transparent"
                              : bill.dueStatus === "overdue"
                              ? "rgba(244, 63, 94, 0.15)"
                              : bill.dueStatus === "today"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(100, 116, 139, 0.1)",
                          color:
                            bill.isPaid
                              ? "var(--text-muted)"
                              : bill.dueStatus === "overdue"
                              ? "#f43f5e"
                              : bill.dueStatus === "today"
                              ? "#f59e0b"
                              : "var(--text-muted)",
                        }}
                      >
                        <Clock size={10} />
                        {bill.isPaid ? `Due ${bill.due_day}th` : bill.dueText}
                      </span>
                    )}

                    {bill.isPartial && (
                      <span className="text-[10px] font-semibold text-amber-500">
                        {formatETB(bill.totalPaid)} of {formatETB(bill.amount)} paid
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Amount + Action */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right">
                  <p
                    className="text-sm font-extrabold"
                    style={{
                      color: bill.isPaid ? "#10b981" : "var(--text-primary)",
                    }}
                  >
                    {formatETB(bill.amount)}
                  </p>
                  {bill.isPartial && (
                    <p className="text-[10px] text-amber-500 font-semibold">
                      {formatETB(bill.remaining)} left
                    </p>
                  )}
                </div>

                {bill.isPaid ? (
                  <div
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span className="hidden sm:inline">Paid</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onPayBill(bill)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      background:
                        bill.dueStatus === "overdue"
                          ? "linear-gradient(135deg, #f43f5e, #e11d48)"
                          : "linear-gradient(135deg, #10b981, #059669)",
                    }}
                  >
                    <Receipt size={13} />
                    <span>Pay</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div
        className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
        style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        <span>
          Fixed Obligations: <strong>{formatETB(totalFixedAmount)}</strong>
        </span>
        <div className="flex items-center gap-3">
          <span>
            Paid: <strong className="text-emerald-500">{formatETB(totalPaidAmount)}</strong>
          </span>
          <span>
            Remaining: <strong style={{ color: remainingTotal > 0 ? "#f43f5e" : "#10b981" }}>{formatETB(remainingTotal)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
