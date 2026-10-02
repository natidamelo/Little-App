"use client";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  accentColor: string;
  trend?: { value: number; label: string };
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  trend,
}: StatCardProps) {
  return (
    <div
      className="glass-card p-6 flex flex-col gap-3 transition-all duration-300 hover:scale-[1.02] cursor-default fade-in"
      style={{ borderColor: `${accentColor}25` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
          {title}
        </span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: trend.value >= 0 ? "#10b98118" : "#f43f5e18",
              color: trend.value >= 0 ? "#10b981" : "#f43f5e",
            }}
          >
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {trend.label}
          </span>
        </div>
      )}

      {/* Accent bar */}
      <div
        className="h-0.5 w-full rounded-full mt-1"
        style={{ background: `linear-gradient(to right, ${accentColor}, transparent)` }}
      />
    </div>
  );
}
