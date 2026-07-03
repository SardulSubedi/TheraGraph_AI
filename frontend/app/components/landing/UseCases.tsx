import { Reveal } from "./Reveal";

const CASES = [
  {
    title: "Pharmacogenomics-guided prescribing",
    body: "Many adverse drug reactions trace back to genetic variation — CYP2D6, TPMT, CYP2C9, VKORC1. A system that remembers a patient's genotype and links it to drug metabolism helps avoid ineffective prodrugs (codeine in poor CYP2D6 metabolizers), toxic accumulation (thiopurines in TPMT deficiency), and bleeding risk (warfarin in CYP2C9/VKORC1-sensitive patients).",
  },
  {
    title: "Longitudinal adaptation",
    body: "As patients report outcomes, the graph improves over time — closer to how real care actually works than a one-shot LLM consult. Memory compounds instead of resetting every session.",
  },
  {
    title: "Regulatory-credible framing",
    body: "The product doesn't invent new molecules. It outputs a structured spec — modules, ratios, masses — for a compounding pharmacy or CDMO. A plausible path as personalized-therapeutics regulation evolves.",
  },
  {
    title: "Privacy & compliance",
    body: "The forget operation maps directly to the right to be forgotten and data deletion — a first-class requirement under HIPAA and similar regimes, built into the architecture rather than bolted on.",
  },
  {
    title: "Why graph memory beats chunk RAG",
    body: "Medical decisions often need multi-hop reasoning: variant → enzyme → drug → outcome. A knowledge graph preserves those links across sessions; vector RAG can miss them when the facts live in different chunks.",
  },
] as const;

export function UseCases() {
  return (
    <section id="real-world" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="micro-label text-accent">Why it matters</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            How this could be useful in real life
          </h2>
          <p className="mt-4 max-w-2xl text-text-secondary">
            A credible direction, not a production clinical system. Real-world
            value comes from five reinforcing places.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {CASES.map((c, i) => (
            <Reveal
              key={c.title}
              delay={i * 70}
              className={i === CASES.length - 1 ? "sm:col-span-2" : ""}
            >
              <div className="h-full rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent/30">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-medium text-text">{c.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
