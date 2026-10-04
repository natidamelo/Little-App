"use client";

import React, { useMemo } from "react";
import { Calendar, TrendingUp, Wallet, Target } from "lucide-react";
import { AnalyticsSummary } from "@/lib/api";
import { formatETB } from "@/lib/currency";
import { formatMonthYear } from "@/lib/dateUtils";

interface MonthProgressDashboardProps {
  summary: AnalyticsSummary | null;
  targetMonthlyIncome: number;
  totalNeededToSpend: number;
  totalFixed: number;
  totalVariable: number;
  targetSavingsAmount: number;
  savingsPct: number;
  currentMonth: string;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg"
          style={{ background: "var(--border-subtle)" }}
        />
        <div
          className="h-4 w-24 rounded"
          style={{ background: "var(--border-subtle)" }}
        />
      </div>
      <div
        className="h-6 w-20 rounded mb-2"
        style={{ background: "var(--border-subtle)" }}
      />
      <div
        className="h-2 w-full rounded-full"
        style={{ background: "var(--border-subtle)" }}
      />
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color,
  bgColor,
}: {
  value: number;
  max: number;
  color: string;
  bgColor?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ background: bgColor || "rgba(255,255,255,0.08)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
    </div>
  );
}

export default function MonthProgressDashboard({
  summary,
  targetMonthlyIncome,
  totalNeededToSpend,
  totalFixed,
  totalVariable,
  targetSavingsAmount,
  savingsPct,
  currentMonth,
}: MonthProgressDashboardProps) {
  const monthProgress = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getDate();
    const pct = Math.round((currentDay / daysInMonth) * 100);
    return { currentDay, daysInMonth, pct };
  }, []);

  const incomeData = useMemo(() => {
    if (!summary) return null;
    const actual = summary.total_income ?? 0;
    const pct = targetMonthlyIncome > 0 ? (actual / targetMonthlyIncome) * 100 : 0;
    const expectedPct = monthProgress.pct;
    let status: "green" | "amber" | "red" = "green";
    if (pct < expectedPct * 0.5) status = "red";
    else if (pct < expectedPct * 0.85) status = "amber";
    return { actual, pct, status };
  }, [summary, targetMonthlyIncome, monthProgress.pct]);

  const spendingData = useMemo(() => {
    if (!summary) return null;
    const actual = summary.total_spent ?? 0;
    const pct = totalNeededToSpend > 0 ? (actual / totalNeededToSpend) * 100 : 0;
    const isFast = pct > monthProgress.pct;
    const dailyAvg = summary.daily_average ?? 0;
    return { actual, pct, isFast, dailyAvg };
  }, [summary, totalNeededToSpend, monthProgress.pct]);

  const savingsData = useMemo(() => {
    if (!summary) return null;
    const income = summary.total_income ?? 0;
    const spent = summary.total_spent ?? 0;
    const actual = income - spent;
    const pct = targetSavingsAmount > 0 ? (actual / targetSavingsAmount) * 100 : 0;
    const onTrack = pct >= monthProgress.pct * 0.8;
    return { actual, pct, onTrack };
  }, [summary, targetSavingsAmount, monthProgress.pct]);

  const statusColors = {
    green: "#10b981",
    amber: "#f59e0b",
    red: "#f43f5e",
  };

  if (!summary) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-5 w-40 rounded animate-pulse"
            style={{ background: "var(--border-subtle)" }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const ringSize = 68;
  const ringStroke = 6;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (monthProgress.pct / 100) * ringCircumference;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          Month Progress — {formatMonthYear(currentMonth)}
        </h3>
      </div>

      <div
        className="rounded-2xl p-[1px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2), rgba(16,185,129,0.2))",
        }}
      >
        <div
          className="rounded-2xl p-3"
          style={{
            background: "var(--bg-primary)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Month Progress */}
            <div
              className="glass-card rounded-xl p-4 flex items-center gap-4"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
                <svg
                  width={ringSize}
                  height={ringSize}
                  className="-rotate-90"
                  style={{ display: "block" }}
                >
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(124,58,237,0.15)"
                    strokeWidth={ringStroke}
                  />
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth={ringStroke}
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {monthProgress.pct}%
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={14} style={{ color: "#7c3aed" }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Month
                  </span>
                </div>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Day {monthProgress.currentDay}
                  <span
                    className="font-normal ml-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    of {monthProgress.daysInMonth}
                  </span>
                </p>
              </div>
            </div>

            {/* 2. Income Tracker */}
            <div
              className="glass-card rounded-xl p-4"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${statusColors[incomeData?.status ?? "green"]}18`,
                  }}
                >
                  <TrendingUp
                    size={14}
                    style={{ color: statusColors[incomeData?.status ?? "green"] }}
                  />
                </div>
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Income
                </span>
              </div>
              <p
                className="text-base font-bold mb-0.5"
                style={{ color: statusColors[incomeData?.status ?? "green"] }}
              >
                {formatETB(incomeData?.actual ?? 0)}
              </p>
              <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                of {formatETB(targetMonthlyIncome)} target
              </p>
              <ProgressBar
                value={incomeData?.actual ?? 0}
                max={targetMonthlyIncome}
                color={statusColors[incomeData?.status ?? "green"]}
              />
            </div>

            {/* 3. Spending Pace */}
            <div
              className="glass-card rounded-xl p-4"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: spendingData?.isFast
                        ? "rgba(245,158,11,0.12)"
                        : "rgba(16,185,129,0.12)",
                    }}
                  >
                    <Wallet
                      size={14}
                      style={{
                        color: spendingData?.isFast ? "#f59e0b" : "#10b981",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Spending
                  </span>
                </div>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: spendingData?.isFast
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(16,185,129,0.15)",
                    color: spendingData?.isFast ? "#f59e0b" : "#10b981",
                  }}
                >
                  {spendingData?.isFast ? "Too fast" : "On track"}
                </span>
              </div>
              <p
                className="text-base font-bold mb-0.5"
                style={{
                  color: spendingData?.isFast ? "#f59e0b" : "var(--text-primary)",
                }}
              >
                {formatETB(spendingData?.actual ?? 0)}
              </p>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  of {formatETB(totalNeededToSpend)} budget
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  ~{formatETB(spendingData?.dailyAvg ?? 0)}/day
                </p>
              </div>
              <ProgressBar
                value={spendingData?.actual ?? 0}
                max={totalNeededToSpend}
                color={spendingData?.isFast ? "#f59e0b" : "#3b82f6"}
              />
            </div>

            {/* 4. Savings Progress */}
            <div
              className="glass-card rounded-xl p-4"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: savingsData?.onTrack
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(245,158,11,0.12)",
                    }}
                  >
                    <Target
                      size={14}
                      style={{
                        color: savingsData?.onTrack ? "#10b981" : "#f59e0b",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Savings
                  </span>
                </div>
                <span className="text-sm">
                  {savingsData?.onTrack ? "🎯" : "⚠️"}
                </span>
              </div>
              <p
                className="text-base font-bold mb-0.5"
                style={{
                  color: savingsData?.onTrack ? "#10b981" : "#f59e0b",
                }}
              >
                {formatETB(savingsData?.actual ?? 0)}
              </p>
              <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                of {formatETB(targetSavingsAmount)} goal ({savingsPct}%)
              </p>
              <ProgressBar
                value={Math.max(savingsData?.actual ?? 0, 0)}
                max={targetSavingsAmount}
                color={savingsData?.onTrack ? "#10b981" : "#f59e0b"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
