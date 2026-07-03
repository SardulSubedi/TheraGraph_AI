import type { ReactNode } from "react";

type Tone = "default" | "accent" | "danger" | "success" | "warning";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const tones: Record<Tone, string> = {
  default: "bg-surface text-text-secondary border-border",
  accent: "bg-accent/10 text-accent border-accent/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
