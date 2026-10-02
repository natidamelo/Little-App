"use client";
import { formatETB } from "@/lib/currency";

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#e11d48",
  Food: "#10b981",
  Transport: "#3b82f6",
  Utilities: "#f59e0b",
  Entertainment: "#a78bfa",
  Others: "#64748b",
};

const PALETTE = ["#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

export function getCategoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface BudgetProgressCardProps {
  category: string;
  limit: number;
  spent: number;
}

export default function BudgetProgressCard({
  category,
  limit,
  spent,
}: BudgetProgressCardProps) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - spent, 0);
  const color = getCategoryColor(category);

  let statusColor = color;
  let statusLabel = `${formatETB(remaining)} left`;
  let warningBg = "transparent";
  let warningBorder = "transparent";

  if (pct >= 100) {
    statusColor = "#f43f5e";
    statusLabel = `Over by ${formatETB(spent - limit)}`;
    warningBg = "rgba(244,63,94,0.08)";
    warningBorder = "rgba(244,63,94,0.25)";
  } else if (pct >= 80) {
    statusColor = "#f59e0b";
    statusLabel = `⚠ Only ${formatETB(remaining)} left`;
    warningBg = "rgba(245,158,11,0.08)";
    warningBorder = "rgba(245,158,11,0.25)";
  }

  return (
    <div
      className="glass-card p-5 transition-all duration-300 hover:scale-[1.01]"
      style={{
        borderColor: warningBorder !== "transparent" ? warningBorder : `${color}25`,
        background: warningBg !== "transparent" ? warningBg : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {category}
          </span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold" style={{ color }}>
            {formatETB(spent, 0)}
          </span>
          <span className="text-xs ml-1" style={{ color: "var(--text-secondary)" }}>
            / {formatETB(limit, 0)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full mb-3 overflow-hidden"
        style={{ background: "var(--progress-track)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? "linear-gradient(to right, #f43f5e, #fb7185)"
              : pct >= 80
              ? "linear-gradient(to right, #f59e0b, #fbbf24)"
              : `linear-gradient(to right, ${color}, ${color}88)`,
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: statusColor }}>
          {statusLabel}
        </span>
        <span className="text-xs font-bold" style={{ color: pct >= 100 ? "#f43f5e" : "var(--text-secondary)" }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
