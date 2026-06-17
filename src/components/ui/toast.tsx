"use client";

import { useState, useCallback, useEffect } from "react";

export interface ToastData {
  id: string;
  message: string;
  status: "success" | "error";
}

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  const show = useCallback((message: string, status: "success" | "error" = "success") => {
    setToast({ id: crypto.randomUUID(), message, status });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, show } as const;
}

export function Toast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6">
      <div
        className={`animate-in fade-in slide-in-from-bottom-4 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg ${
          toast.status === "success"
            ? "bg-success/90 text-success-foreground"
            : "bg-danger/90 text-danger-foreground"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
