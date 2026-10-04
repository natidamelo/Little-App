"use client";

import React, { useMemo } from "react";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { AnalyticsSummary } from "@/lib/api";
import { formatETB } from "@/lib/currency";

interface FinancialHealthCardProps {
  summary: AnalyticsSummary | null;
  targetMonthlyIncome: number;
  totalNeededToSpend: number;
  totalFixed: number;
  totalVariable: number;
  targetSavingsAmount: number;
  fixedRatioPct: number;
  monthlyIncome: number;
}

export default function FinancialHealthCard({
  summary,
  targetMonthlyIncome,
  totalNeededToSpend,
  totalFixed,
  totalVariable,
  targetSavingsAmount,
  fixedRatioPct,
  monthlyIncome,
}: FinancialHealthCardProps) {
  // If no summary data, show placeholder
  if (!summary) {
    return (
      <div className="glass-card p-6 mb-8 text-center" style={{ color: "var(--text-muted)" }}>
        <p className="text-sm">Log income and expenses to unlock your Financial Health Score.</p>
      </div>
    );
  }

  const {
    total_income,
    total_spent,
    days_in_month,
    days_remaining,
    daily_average,
  } = summary;

  const currentDay = Math.max(1, days_in_month - days_remaining);
  const monthProgressPct = Math.min(100, Math.round((currentDay / days_in_month) * 100));

  // ─── Score Calculation (0 - 100) ───
  const { score, criteria, verdict, verdictColor } = useMemo(() => {
    // 1. Income Coverage (30 pts max)
    // Compare actual income to target
    const effectiveTarget = targetMonthlyIncome > 0 ? targetMonthlyIncome : totalNeededToSpend;
    let incomeScore = 0;
    if (effectiveTarget > 0) {
      const expectedSoFar = (effectiveTarget / days_in_month) * currentDay;
      const ratio = total_income / Math.max(1, expectedSoFar);
      incomeScore = Math.min(30, Math.round(ratio * 30));
    } else {
      incomeScore = 20;
    }

    // 2. Spending Pace / Budget Discipline (25 pts max)
    // Spending pace relative to expected budget pace
    let spendingScore = 0;
    if (totalNeededToSpend > 0) {
      const budgetSoFar = (totalNeededToSpend / days_in_month) * currentDay;
      if (total_spent <= budgetSoFar) {
        spendingScore = 25; // on track or under
      } else {
        const overspendRatio = (total_spent - budgetSoFar) / Math.max(1, budgetSoFar);
        spendingScore = Math.max(0, Math.round(25 - overspendRatio * 35));
      }
    } else {
      spendingScore = 20;
    }

    // 3. Fixed Cost Burden (15 pts max)
    // 50% or less = 15 pts, 51-65% = 10 pts, >65% = 5 pts
    let fixedScore = 15;
    if (fixedRatioPct > 70) fixedScore = 5;
    else if (fixedRatioPct > 50) fixedScore = 10;

    // 4. Savings / Surplus (20 pts max)
    const netCashflow = total_income - total_spent;
    let savingsScore = 0;
    if (netCashflow > 0) {
      const targetSavingsSoFar = (targetSavingsAmount / days_in_month) * currentDay;
      if (targetSavingsSoFar > 0) {
        savingsScore = Math.min(20, Math.round((netCashflow / targetSavingsSoFar) * 20));
      } else {
        savingsScore = 15;
      }
    }

    // 5. Daily Consistency (10 pts max)
    // If daily average is reasonable relative to target
    const dailyTarget = totalNeededToSpend > 0 ? totalNeededToSpend / days_in_month : 0;
    let consistencyScore = 10;
    if (dailyTarget > 0 && daily_average > dailyTarget * 1.3) {
      consistencyScore = 5;
    }

    const totalScore = Math.min(100, Math.max(0, incomeScore + spendingScore + fixedScore + savingsScore + consistencyScore));

    let v = "Excellent";
    let vc = "#10b981";
    if (totalScore < 40) {
      v = "Needs Attention";
      vc = "#f43f5e";
    } else if (totalScore < 60) {
      v = "Fair";
      vc = "#f59e0b";
    } else if (totalScore < 80) {
      v = "Good";
      vc = "#3b82f6";
    }

    return {
      score: totalScore,
      verdict: v,
      verdictColor: vc,
      criteria: [
        { label: "Income Pace", score: incomeScore, max: 30, ok: incomeScore >= 20 },
        { label: "Budget Discipline", score: spendingScore, max: 25, ok: spendingScore >= 18 },
        { label: "Fixed Cost Ratio", score: fixedScore, max: 15, ok: fixedScore >= 10 },
        { label: "Savings Growth", score: savingsScore, max: 20, ok: savingsScore >= 12 },
        { label: "Daily Spending Pace", score: consistencyScore, max: 10, ok: consistencyScore >= 7 },
      ],
    };
  }, [
    total_income,
    total_spent,
    targetMonthlyIncome,
    totalNeededToSpend,
    days_in_month,
    currentDay,
    fixedRatioPct,
    targetSavingsAmount,
    daily_average,
  ]);

  // ─── Month-end projections ───
  const projectedSpending = Math.round(daily_average * days_in_month);
  const projectedIncome = total_income > 0 ? Math.round((total_income / currentDay) * days_in_month) : monthlyIncome;
  const projectedSavings = projectedIncome - projectedSpending;

  // ─── Dynamic Smart Tips ───
  const tips = useMemo(() => {
    const list: { text: string; type: "good" | "warning" | "info" }[] = [];

    if (fixedRatioPct > 60) {
      list.push({
        text: `Fixed costs take up ${fixedRatioPct}% of your income. Look for ways to trim subscriptions or utility bills.`,
        type: "warning",
      });
    }

    if (total_spent > (totalNeededToSpend / days_in_month) * currentDay * 1.15) {
      list.push({
        text: `Spending pace is faster than budgeted. You're averaging ${formatETB(daily_average)}/day vs ${formatETB(totalNeededToSpend / days_in_month)}/day target.`,
        type: "warning",
      });
    } else {
      list.push({
        text: `Great budget discipline! Daily average of ${formatETB(daily_average)} is within safe limits.`,
        type: "good",
      });
    }

    if (projectedSavings > 0) {
      list.push({
        text: `At your current pace, you're projected to save ~${formatETB(projectedSavings)} by the end of the month!`,
        type: "good",
      });
    } else if (projectedSavings < 0) {
      list.push({
        text: `Projected month-end deficit of ${formatETB(Math.abs(projectedSavings))}. Consider logging extra ride income or pausing discretionary spending.`,
        type: "warning",
      });
    }

    return list;
  }, [fixedRatioPct, total_spent, totalNeededToSpend, days_in_month, currentDay, daily_average, projectedSavings]);

  return (
    <div
      className="glass-card p-5 sm:p-6 mb-8 fade-in relative overflow-hidden"
      style={{
        borderTop: `4px solid ${verdictColor}`,
      }}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
        {/* Left: Score Circle + Verdict */}
        <div className="flex items-center gap-5 w-full lg:w-auto">
          {/* Conic score circle */}
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center relative shrink-0 shadow-lg"
            style={{
              background: `conic-gradient(${verdictColor} ${score * 3.6}deg, rgba(100,116,139,0.15) 0deg)`,
            }}
          >
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center"
              style={{ background: "var(--bg-card)" }}
            >
              <span className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                {score}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
                Score
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  background: `${verdictColor}18`,
                  color: verdictColor,
                  border: `1px solid ${verdictColor}40`,
                }}
              >
                {verdict}
              </span>
            </div>
            <h3 className="text-lg font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>
              Financial Health Score
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Based on your income, spending pace, savings rate, and fixed costs.
            </p>
          </div>
        </div>

        {/* Center: Criteria breakdown */}
        <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {criteria.map((c) => (
            <div
              key={c.label}
              className="p-2.5 rounded-xl"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                  {c.label}
                </span>
                <span className="font-bold text-[11px]" style={{ color: c.ok ? "#10b981" : "#f59e0b" }}>
                  {c.score}/{c.max}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--progress-track)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(c.score / c.max) * 100}%`,
                    background: c.ok ? "#10b981" : "#f59e0b",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Projections & Smart Tips */}
      <div
        className="mt-5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {/* Month-end Projection */}
        <div
          className="p-3.5 rounded-xl"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-xs font-bold flex items-center gap-1.5 mb-2" style={{ color: "var(--accent-purple)" }}>
            <Sparkles size={14} /> Month-End Projection (Pace Analysis)
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Projected Spend</p>
              <p className="text-xs sm:text-sm font-bold text-rose-500 mt-0.5">{formatETB(projectedSpending)}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Projected Income</p>
              <p className="text-xs sm:text-sm font-bold text-emerald-500 mt-0.5">{formatETB(projectedIncome)}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Projected Net</p>
              <p
                className={`text-xs sm:text-sm font-bold mt-0.5 ${
                  projectedSavings >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {projectedSavings >= 0 ? "+" : ""}{formatETB(projectedSavings)}
              </p>
            </div>
          </div>
        </div>

        {/* Smart Tips */}
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl text-xs flex items-start gap-2"
              style={{
                background:
                  tip.type === "good"
                    ? "rgba(16, 185, 129, 0.08)"
                    : tip.type === "warning"
                    ? "rgba(245, 158, 11, 0.08)"
                    : "var(--input-bg)",
                border: `1px solid ${
                  tip.type === "good"
                    ? "rgba(16, 185, 129, 0.2)"
                    : tip.type === "warning"
                    ? "rgba(245, 158, 11, 0.25)"
                    : "var(--border-subtle)"
                }`,
                color: "var(--text-secondary)",
              }}
            >
              {tip.type === "good" ? (
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
