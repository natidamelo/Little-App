import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "SpendPulse — Personal Budget & Expense Tracker",
  description:
    "Track daily expenses, set monthly budgets, and visualize your spending with SpendPulse — a modern personal finance dashboard.",
};

const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('spendpulse-theme');
      var theme = saved === 'light' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.style.colorScheme = 'dark';
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen transition-colors duration-200" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <ThemeProvider>
          <ToastProvider>
            <Navbar />
            <main className="pt-16">{children}</main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
