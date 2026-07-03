"use client";

import { useCallback, useEffect, useState } from "react";

type ToastType = "default" | "success" | "danger";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (items: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 0;

function emit() {
  const snapshot = [...toasts];
  listeners.forEach((fn) => fn(snapshot));
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(
  message: string,
  options?: { type?: ToastType; duration?: number },
) {
  const id = ++nextId;
  const type = options?.type ?? "default";
  const duration = options?.duration ?? 3000;

  toasts = [...toasts, { id, message, type }];
  emit();

  window.setTimeout(() => dismiss(id), duration);
  return id;
}

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  const dismissToast = useCallback((id: number) => dismiss(id), []);

  return { toast, toasts: items, dismiss: dismissToast };
}

const typeStyles: Record<ToastType, string> = {
  default: "border-border bg-surface text-text",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function Toaster() {
  const { toasts: items, dismiss } = useToast();

  if (items.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-3 rounded border px-4 py-2 text-sm shadow-lg transition-all duration-150 motion-reduce:transition-none ${typeStyles[item.type]}`}
        >
          <span className="flex-1">{item.message}</span>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="rounded px-1 text-text-secondary transition-colors duration-150 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
