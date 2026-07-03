"use client";

interface ChainNode {
  label: string;
  kind: string;
  danger?: boolean;
}

const CHAIN: ChainNode[] = [
  { label: "CYP2D6 *4/*4", kind: "Gene variant" },
  { label: "Poor metabolizer", kind: "Enzyme phenotype" },
  { label: "Codeine → no analgesia", kind: "Drug clearance" },
  { label: "Contraindicated", kind: "Safe formulation", danger: true },
];

export function CausalChain() {
  return (
    <div className="mx-auto mt-16 max-w-3xl">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        {CHAIN.map((node, i) => (
          <div
            key={node.label}
            className="flex items-center gap-3 sm:flex-col sm:gap-0"
          >
            <div
              className={`flex-1 rounded-lg border px-4 py-3 text-left backdrop-blur-sm transition-colors sm:min-w-[150px] sm:text-center ${
                node.danger
                  ? "border-danger/40 bg-danger/5"
                  : "border-border bg-surface/70 hover:border-accent/40"
              }`}
            >
              <p
                className={`micro-label ${
                  node.danger ? "text-danger" : "text-accent"
                }`}
              >
                {node.kind}
              </p>
              <p className="mt-1 text-sm font-medium text-text">
                {node.label}
              </p>
            </div>
            {i < CHAIN.length - 1 && (
              <>
                <span
                  aria-hidden
                  className="text-text-secondary sm:hidden"
                >
                  ↓
                </span>
                <span
                  aria-hidden
                  className="hidden h-px w-6 flex-none bg-gradient-to-r from-accent/60 to-accent/20 sm:block"
                />
              </>
            )}
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-text-secondary">
        One causal chain across four facts — the kind of multi-hop link that
        chunk-based vector RAG loses, and a knowledge graph keeps.
      </p>
    </div>
  );
}
