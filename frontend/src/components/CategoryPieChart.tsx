"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatETB } from "@/lib/currency";

const COLORS = ["#e11d48", "#10b981", "#3b82f6", "#f59e0b", "#a78bfa", "#64748b"];

interface CategoryPieChartProps {
  data: Record<string, number>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { fill: string; pct: number };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-4 py-3 rounded-xl shadow-xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          backdropFilter: "blur(8px)",
        }}
      >
        <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          {payload[0].name}
        </p>
        <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>
          {formatETB(payload[0].value)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {payload[0].payload.pct}% of total
        </p>
      </div>
    );
  }
  return null;
};

interface LabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  pct?: number;
}

const renderCustomLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, pct = 0 }: LabelProps) => {
  if (pct < 8) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {pct}%
    </text>
  );
};

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const chartData = Object.entries(data).map(([name, value], i) => ({
    name,
    value: Math.round(value * 100) / 100,
    fill: COLORS[i % COLORS.length],
    pct: total > 0 ? Math.round((value / total) * 100) : 0,
  }));

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Category Breakdown
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Spending distribution by category
          </p>
        </div>
        <div
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            color: "#10b981",
          }}
        >
          {formatETB(total)} total
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
