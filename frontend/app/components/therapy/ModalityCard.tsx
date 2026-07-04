"use client";

import type { CustomTherapy } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";

interface ModalityCardProps {
  therapy: CustomTherapy;
}

export function ModalityCard({ therapy }: ModalityCardProps) {
  if (!therapy.modality_name) return null;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="micro-label text-text-secondary">Selected modality</p>
        <Badge tone="accent">{therapy.modality_class}</Badge>
      </div>

      <h3 className="mt-2 text-lg font-semibold text-text">
        {therapy.modality_name}
      </h3>

      {therapy.modality_rationale && (
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {therapy.modality_rationale}
        </p>
      )}

      {therapy.alternatives_considered.length > 0 && (
        <div className="mt-4">
          <p className="micro-label text-text-secondary">
            Alternatives considered
          </p>
          <ul className="mt-2 space-y-1.5">
            {therapy.alternatives_considered.map((a) => (
              <li
                key={a}
                className="flex gap-2 text-xs leading-relaxed text-text-secondary"
              >
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-text-secondary/50" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {therapy.precedent && (
        <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 p-3">
          <p className="micro-label text-accent">Clinical precedent</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            {therapy.precedent}
          </p>
        </div>
      )}
    </Card>
  );
}
