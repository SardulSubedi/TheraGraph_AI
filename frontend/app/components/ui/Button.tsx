import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-bg hover:bg-accent/90 border border-accent/50 disabled:opacity-40",
  secondary:
    "bg-surface text-text border border-border hover:border-accent/40 disabled:opacity-40",
  ghost:
    "bg-transparent text-text-secondary hover:text-text hover:bg-surface disabled:opacity-40",
  danger:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 disabled:opacity-40",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
