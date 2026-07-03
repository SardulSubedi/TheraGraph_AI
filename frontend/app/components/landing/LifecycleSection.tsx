import { Reveal } from "./Reveal";

const STEPS = [
  {
    phase: "Remember",
    feature: "Ingest",
    description:
      "Clinical notes, labs, genomics, and medication history flow into a structured knowledge graph — not a flat document pile.",
  },
  {
    phase: "Recall",
    feature: "Formulate",
    description:
      "When prescribing, the graph surfaces causal chains: gene → enzyme phenotype → drug clearance → contraindication.",
  },
  {
    phase: "Improve",
    feature: "Feedback loop",
    description:
      "Outcomes and clinician corrections refine the graph over time. Memory evolves with the patient.",
  },
  {
    phase: "Forget",
    feature: "Right to be forgotten",
    description:
      "Granular erasure when patients withdraw consent. Compliance built into the architecture, not bolted on.",
  },
] as const;

export function LifecycleSection() {
  return (
    <section id="lifecycle" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="micro-label text-accent">The lifecycle</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            From memory to medicine
          </h2>
          <p className="mt-4 max-w-2xl text-text-secondary">
            Four phases map directly to product capabilities — a closed loop
            from intake to adaptive formulation.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <Reveal key={step.phase} delay={i * 80}>
              <div className="rounded-lg border border-border bg-surface p-6">
                <div className="flex items-baseline gap-3">
                  <span className="micro-label text-accent">{step.phase}</span>
                  <span className="text-xs text-text-secondary">→</span>
                  <span className="text-sm font-medium text-text">
                    {step.feature}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
