import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label className="block text-sm">
      {label && (
        <span className="micro-label text-text-secondary">{label}</span>
      )}
      <input
        id={inputId}
        className={`${label ? "mt-1 " : ""}w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors duration-150 focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:opacity-40 ${className}`}
        {...props}
      />
    </label>
  );
}
