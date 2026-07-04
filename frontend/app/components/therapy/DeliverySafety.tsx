"use client";

import type { SafetyItem } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";

interface DeliverySafetyProps {
  safety: SafetyItem[];
}

const SEVERITY: Record<string, { chip: string; bar: string; label: string }> = {
  high: { chip: "bg-danger/10 text-danger border-danger/30", bar: "bg-danger", label: "High" },
  moderate: {
    chip: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    bar: "bg-amber-500",
    label: "Moderate",
  },
  low: { chip: "bg-accent/10 text-accent border-accent/30", bar: "bg-accent", label: "Low" },
};

function sev(level: string) {
  return SEVERITY[level] ?? SEVERITY.moderate;
}

export function DeliverySafety({ safety }: DeliverySafetyProps) {
  if (safety.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="micro-label text-text-secondary">
          Safety &amp; off-target profile
        </p>
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
          {safety.length} risks
        </span>
      </div>

      <ul className="mt-3 space-y-2.5">
        {safety.map((s) => {
          const style = sev(s.severity);
          return (
            <li
              key={s.risk}
              className="relative overflow-hidden rounded-lg border border-border bg-bg/50 p-3 pl-4"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} aria-hidden />
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text">{s.risk}</p>
                <span
                  className={`flex-none rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.chip}`}
                >
                  {style.label}
                </span>
              </div>
              <p className="mt-1.5 flex gap-1.5 text-xs leading-relaxed text-text-secondary">
                <span className="font-semibold text-accent">Mitigate</span>
                <span>{s.mitigation}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
