"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, PieChart, Calculator, Zap, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getCurrentMonth, formatShortMonthYear } from "@/lib/dateUtils";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/planner", label: "Planner", icon: Calculator },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 transition-colors duration-200"
      style={{
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-1">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 group flex-shrink-0">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
          >
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold gradient-text hidden xs:inline sm:inline">SpendPulse</span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-2 sm:px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  color: active ? "var(--accent-purple)" : "var(--text-secondary)",
                  background: active ? "rgba(124,58,237,0.12)" : "transparent",
                  border: active ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right side controls: Theme Toggle + Month Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Theme Toggle Button */}
          {mounted && (
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Normal (Light)" : "Dark"} mode`}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              {theme === "dark" ? (
                <>
                  <Moon size={14} className="text-purple-400" />
                  <span className="hidden md:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-500" />
                  <span className="hidden md:inline">Normal</span>
                </>
              )}
            </button>
          )}

          {/* Month badge — hidden on very small screens */}
          <div
            className="hidden sm:flex text-xs font-semibold px-2.5 py-1.5 rounded-full"
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "#3b82f6",
            }}
          >
            {formatShortMonthYear(getCurrentMonth())}
          </div>
        </div>
      </div>
    </nav>
  );
}
