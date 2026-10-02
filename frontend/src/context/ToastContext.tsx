"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      timers.current[id] = setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} style={{ color: "#10b981" }} />,
    error: <AlertCircle size={16} style={{ color: "#f43f5e" }} />,
    info: <Info size={16} style={{ color: "#3b82f6" }} />,
  };

  const colorMap: Record<ToastType, { bg: string; border: string }> = {
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" },
    error: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)" },
    info: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)" },
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "360px",
        width: "calc(100vw - 48px)",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "14px",
            background: colorMap[toast.type].bg,
            border: `1px solid ${colorMap[toast.type].border}`,
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            animation: "fadeInUp 0.3s ease-out",
          }}
        >
          <span style={{ flexShrink: 0 }}>{iconMap[toast.type]}</span>
          <span
            style={{
              flex: 1,
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: "1.4",
            }}
          >
            {toast.message}
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "2px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
