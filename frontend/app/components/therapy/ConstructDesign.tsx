"use client";

import type { ConstructBlock } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";

interface ConstructDesignProps {
  blocks: ConstructBlock[];
  delivery?: string | null;
  route?: string | null;
  deliveryRationale?: string | null;
}

function isSequence(label: string) {
  return /sequence|spacer|antisense|guide strand/i.test(label);
}

export function ConstructDesign({
  blocks,
  delivery,
  route,
  deliveryRationale,
}: ConstructDesignProps) {
  if (blocks.length === 0) return null;

  return (
    <Card>
      <p className="micro-label text-text-secondary">Construct design</p>
      <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700">
        Illustrative scaffold — sequences are placeholders, not designed or orderable molecules.
      </div>

      <dl className="mt-4 space-y-3">
        {blocks.map((b) => (
          <div
            key={b.label}
            className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
          >
            <dt className="text-[11px] uppercase tracking-wide text-text-secondary/60">
              {b.label}
            </dt>
            <dd
              className={`mt-1 text-sm text-text ${
                isSequence(b.label)
                  ? "break-all rounded bg-bg px-2 py-1.5 font-mono text-accent"
                  : ""
              }`}
            >
              {b.value}
            </dd>
            {b.note && (
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {b.note}
              </p>
            )}
          </div>
        ))}
      </dl>

      {delivery && (
        <div className="mt-4 rounded-lg border border-border bg-bg/40 p-3">
          <p className="micro-label text-text-secondary">Delivery vector</p>
          <p className="mt-1 text-sm font-medium text-text">
            {delivery}
            {route && (
              <span className="ml-1.5 text-xs font-normal text-text-secondary">
                · {route}
              </span>
            )}
          </p>
          {deliveryRationale && (
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {deliveryRationale}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
