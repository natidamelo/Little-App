"use client";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  BarChart3,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react";
import { formatETB, formatETBShort } from "@/lib/currency";

interface TrendDataPoint {
  date: string;
  amount: number;
  income?: number;
  net?: number;
}

interface SpendingTrendChartProps {
  data: TrendDataPoint[];
  currentMonth?: string;
  dailyTarget?: number;
  dailyRideTarget?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
    payload?: {
      date: string;
      label: string;
      amount: number;
      income: number;
      net: number;
    };
  }>;
  dailyTarget?: number;
}

const CustomTooltip = ({ active, payload, dailyTarget }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const raw = payload[0]?.payload;
    if (!raw) return null;

    const expense = raw.amount || 0;
    const income = raw.income || 0;
    const net = raw.net ?? (income - expense);
    const label = raw.label || "";

    const hasIncome = income > 0;
    const isAboveTarget = dailyTarget && dailyTarget > 0 && expense > dailyTarget;
    const isBelowTarget = dailyTarget && dailyTarget > 0 && expense <= dailyTarget && expense > 0;

    return (
      <div
        className="px-4 py-3 rounded-2xl shadow-2xl transition-all"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          backdropFilter: "blur(12px)",
          minWidth: "185px",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          <Calendar size={13} className="text-purple-400" />
          <span>{label}</span>
        </div>

        {/* Expense */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Spent:
          </span>
          <span className="font-extrabold" style={{ color: "var(--text-primary)" }}>
            {formatETB(expense)}
          </span>
        </div>

        {/* Income (if present) */}
        {hasIncome && (
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Earned:
            </span>
            <span className="font-extrabold text-emerald-500">
              +{formatETB(income)}
            </span>
          </div>
        )}

        {/* Net Cashflow for the day */}
        {(hasIncome || expense > 0) && (
          <div className="mt-1.5 pt-1.5 flex items-center justify-between text-[11px]" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Daily Net:</span>
            <span
              className="font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: net >= 0 ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                color: net >= 0 ? "#10b981" : "#f43f5e",
              }}
            >
              {net >= 0 ? `+${formatETB(net)}` : formatETB(net)}
            </span>
          </div>
        )}

        {/* Daily Target check */}
        {dailyTarget && dailyTarget > 0 && expense > 0 && (
          <div className="mt-1 pt-1 flex items-center justify-between text-[10px]" style={{ borderTop: "1px dashed var(--border-subtle)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Budget Target:</span>
            <span
              className="font-bold px-1 rounded"
              style={{
                color: isAboveTarget ? "#f43f5e" : isBelowTarget ? "#10b981" : "var(--text-muted)",
              }}
            >
              {isAboveTarget ? "Over Target" : isBelowTarget ? "Under Target" : "On Track"}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function SpendingTrendChart({
  data,
  currentMonth,
  dailyTarget,
  dailyRideTarget,
}: SpendingTrendChartProps) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [viewFilter, setViewFilter] = useState<"all" | "expense" | "income">("all");
  const [showTarget, setShowTarget] = useState<boolean>(true);

  // Check if any income data exists in the month
  const hasAnyIncome = useMemo(() => {
    return data.some((d) => (d.income || 0) > 0);
  }, [data]);

  // Parse current month (e.g. "2026-10")
  const { year, month, daysInMonth } = useMemo(() => {
    const raw = currentMonth || (data.length > 0 ? data[0].date.slice(0, 7) : new Date().toISOString().slice(0, 7));
    const [yStr, mStr] = raw.split("-");
    const y = parseInt(yStr) || new Date().getFullYear();
    const m = parseInt(mStr) || new Date().getMonth() + 1;
    const days = new Date(y, m, 0).getDate();
    return { year: y, month: m, daysInMonth: days };
  }, [currentMonth, data]);

  // Build full 31-day timeline
  const { timeline, maxAmount, peakSpendDay, peakIncomeDay, totalSpent, totalEarned } = useMemo(() => {
    const expenseMap = new Map<string, number>();
    const incomeMap = new Map<string, number>();
    let spentSum = 0;
    let earnedSum = 0;

    data.forEach((d) => {
      const exp = d.amount || 0;
      const inc = d.income || 0;
      expenseMap.set(d.date, exp);
      incomeMap.set(d.date, inc);
      spentSum += exp;
      earnedSum += inc;
    });

    let peakSpend = { date: "", amount: 0, label: "" };
    let peakIncome = { date: "", amount: 0, label: "" };
    const list = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const mStr = String(month).padStart(2, "0");
      const dateKey = `${year}-${mStr}-${dayStr}`;
      const amount = expenseMap.get(dateKey) || 0;
      const income = incomeMap.get(dateKey) || 0;
      const net = income - amount;
      const dateObj = new Date(year, month - 1, day);
      const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      if (amount > peakSpend.amount) {
        peakSpend = { date: dateKey, amount, label };
      }
      if (income > peakIncome.amount) {
        peakIncome = { date: dateKey, amount: income, label };
      }

      list.push({
        date: dateKey,
        day,
        label,
        shortLabel: `${day}`,
        amount,
        income,
        net,
      });
    }

    const maxVal = Math.max(
      ...list.map((d) => Math.max(d.amount, d.income)),
      dailyTarget || 0,
      dailyRideTarget || 0,
      100
    );

    return {
      timeline: list,
      maxAmount: maxVal,
      peakSpendDay: peakSpend.amount > 0 ? peakSpend : null,
      peakIncomeDay: peakIncome.amount > 0 ? peakIncome : null,
      totalSpent: spentSum,
      totalEarned: earnedSum,
    };
  }, [data, daysInMonth, year, month, dailyTarget, dailyRideTarget]);

  return (
    <div className="glass-card p-6 relative overflow-hidden flex flex-col justify-between">
      {/* Header with Title and Mode Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Daily Cash Flow & Trend
            </h3>
            {peakSpendDay && viewFilter !== "income" && (
              <span
                className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  color: "var(--accent-purple)",
                }}
              >
                <Sparkles size={11} /> Peak Spend: {peakSpendDay.label} ({formatETBShort(peakSpendDay.amount)})
              </span>
            )}
            {peakIncomeDay && viewFilter === "income" && (
              <span
                className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "#10b981",
                }}
              >
                <TrendingUp size={11} /> Peak Earned: {peakIncomeDay.label} ({formatETBShort(peakIncomeDay.amount)})
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Track daily ride earnings vs. living expenses
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Filter Toggle (if income exists) */}
          {hasAnyIncome && (
            <div
              className="p-1 rounded-xl flex items-center gap-0.5"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => setViewFilter("all")}
                className="px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background: viewFilter === "all" ? "var(--bg-card)" : "transparent",
                  color: viewFilter === "all" ? "var(--accent-purple)" : "var(--text-secondary)",
                  boxShadow: viewFilter === "all" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => setViewFilter("expense")}
                className="px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background: viewFilter === "expense" ? "var(--bg-card)" : "transparent",
                  color: viewFilter === "expense" ? "#a855f7" : "var(--text-secondary)",
                  boxShadow: viewFilter === "expense" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Spend
              </button>
              <button
                type="button"
                onClick={() => setViewFilter("income")}
                className="px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background: viewFilter === "income" ? "var(--bg-card)" : "transparent",
                  color: viewFilter === "income" ? "#10b981" : "var(--text-secondary)",
                  boxShadow: viewFilter === "income" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Earned
              </button>
            </div>
          )}

          {/* Target Reference Line Button */}
          {dailyTarget && dailyTarget > 0 && (
            <button
              type="button"
              onClick={() => setShowTarget(!showTarget)}
              title="Toggle budget benchmark line"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: showTarget ? "rgba(16,185,129,0.15)" : "var(--input-bg)",
                border: showTarget ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--border-subtle)",
                color: showTarget ? "#10b981" : "var(--text-secondary)",
              }}
            >
              <Target size={13} />
              <span className="hidden sm:inline">Target</span> ({formatETBShort(dailyTarget)}/d)
            </button>
          )}

          {/* Area / Bar Mode Toggle */}
          <div
            className="p-1 rounded-xl flex items-center gap-1"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={() => setChartType("area")}
              title="Smooth Wave Area Graph"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
              style={{
                background: chartType === "area" ? "var(--bg-card)" : "transparent",
                color: chartType === "area" ? "var(--accent-purple)" : "var(--text-secondary)",
                boxShadow: chartType === "area" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Activity size={13} />
              <span>Wave</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType("bar")}
              title="Daily Bar Columns"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
              style={{
                background: chartType === "bar" ? "var(--bg-card)" : "transparent",
                color: chartType === "bar" ? "var(--accent-purple)" : "var(--text-secondary)",
                boxShadow: chartType === "bar" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <BarChart3 size={13} />
              <span>Bars</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={timeline} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradientSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="areaGradientIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="60%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.12)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={Math.ceil(daysInMonth / 6)}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatETBShort(v)}
                domain={[0, Math.ceil(maxAmount * 1.15)]}
              />
              <Tooltip content={<CustomTooltip dailyTarget={showTarget ? dailyTarget : undefined} />} />

              {/* Target Line */}
              {showTarget && dailyTarget && dailyTarget > 0 && (
                <ReferenceLine
                  y={dailyTarget}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              )}

              {/* Income Area (Green Wave) */}
              {(viewFilter === "all" || viewFilter === "income") && (
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#areaGradientIncome)"
                  dot={(props: { cx?: number; cy?: number; payload?: { income: number } }) => {
                    const { cx, cy, payload } = props;
                    if (!payload || !payload.income || cx === undefined || cy === undefined) return <circle key={`dot-inc-empty-${cx}-${cy}`} r={0} />;
                    return (
                      <circle
                        key={`dot-inc-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{
                    fill: "#10b981",
                    stroke: "#ffffff",
                    strokeWidth: 2.5,
                    r: 6,
                  }}
                />
              )}

              {/* Spend Area (Purple Wave) */}
              {(viewFilter === "all" || viewFilter === "expense") && (
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#areaGradientSpend)"
                  dot={(props: { cx?: number; cy?: number; payload?: { amount: number } }) => {
                    const { cx, cy, payload } = props;
                    if (!payload || payload.amount === 0 || cx === undefined || cy === undefined) return <circle key={`dot-spend-empty-${cx}-${cy}`} r={0} />;
                    return (
                      <circle
                        key={`dot-spend-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#7c3aed"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{
                    fill: "#38bdf8",
                    stroke: "#ffffff",
                    strokeWidth: 2.5,
                    r: 7,
                  }}
                />
              )}
            </AreaChart>
          ) : (
            <BarChart data={timeline} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradientSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="barGradientIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.12)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={Math.ceil(daysInMonth / 6)}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatETBShort(v)}
                domain={[0, Math.ceil(maxAmount * 1.15)]}
              />
              <Tooltip content={<CustomTooltip dailyTarget={showTarget ? dailyTarget : undefined} />} />

              {/* Target Line */}
              {showTarget && dailyTarget && dailyTarget > 0 && (
                <ReferenceLine
                  y={dailyTarget}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              )}

              {/* Income Bars */}
              {(viewFilter === "all" || viewFilter === "income") && (
                <Bar
                  dataKey="income"
                  radius={[5, 5, 0, 0]}
                  fill="url(#barGradientIncome)"
                  maxBarSize={16}
                />
              )}

              {/* Spend Bars */}
              {(viewFilter === "all" || viewFilter === "expense") && (
                <Bar
                  dataKey="amount"
                  radius={[5, 5, 0, 0]}
                  fill="url(#barGradientSpend)"
                  maxBarSize={16}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer stats bar */}
      <div
        className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-medium"
        style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        <div className="flex items-center gap-3">
          <span>
            Spent: <strong style={{ color: "var(--text-primary)" }}>{formatETB(totalSpent)}</strong>
          </span>
          {hasAnyIncome && (
            <span>
              Earned: <strong className="text-emerald-500">+{formatETB(totalEarned)}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {dailyTarget && dailyTarget > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded bg-emerald-500 inline-block" />
              <span>Target: {formatETBShort(dailyTarget)}/d</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span>Spend</span>
          </span>
          {hasAnyIncome && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Earned</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
