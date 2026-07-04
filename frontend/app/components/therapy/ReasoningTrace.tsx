"use client";

import type { ReasoningStep } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";

interface ReasoningTraceProps {
  steps: ReasoningStep[];
}

export function ReasoningTrace({ steps }: ReasoningTraceProps) {
  if (steps.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent">
          <span className="h-2 w-2 rounded-full bg-accent" />
        </span>
        <div>
          <p className="text-sm font-semibold text-text">
            Design agent — reasoning trace
          </p>
          <p className="text-xs text-text-secondary">
            Each step is grounded in the patient graph or the modality knowledge base.
          </p>
        </div>
      </div>

      <ol className="relative mt-4 ml-3 border-l border-border">
        {steps.map((s) => (
          <li key={s.step} className="relative py-2.5 pl-6">
            <span
              className="absolute -left-[9px] top-3.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-accent text-[9px] font-semibold text-white"
              aria-hidden
            >
              {s.step}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-text">{s.title}</p>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                  s.grounded
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-surface text-text-secondary"
                }`}
              >
                {s.grounded ? "grounded in graph" : "knowledge base"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              {s.detail}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
