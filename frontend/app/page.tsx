import { LandingNav } from "@/app/components/landing/Nav";
import { Hero } from "@/app/components/landing/Hero";
import { Section } from "@/app/components/landing/Section";
import { LifecycleSection } from "@/app/components/landing/LifecycleSection";
import { Footer } from "@/app/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <main>
        <Hero />

        <Section
          id="problem"
          label="The problem"
          title="Medical AI forgets"
        >
          <p className="text-lg leading-relaxed text-text-secondary">
            Every session starts from zero. LLMs treat each encounter as
            isolated — no persistent model of the patient&apos;s genetics,
            comorbidities, or medication history. In personalized medicine,
            forgetting a single pharmacogenomic marker can mean the wrong dose,
            a dangerous interaction, or a missed contraindication.
          </p>
        </Section>

        <Section
          id="insight"
          label="The insight"
          title="Clinical facts are a causal web"
        >
          <p className="text-lg leading-relaxed text-text-secondary">
            Medicine isn&apos;t a bag of facts — it&apos;s a graph of cause and
            effect. A variant in <em className="text-text">CYP2D6</em> affects
            enzyme activity, which changes drug clearance, which determines
            whether a standard dose is therapeutic or toxic. Chunk-based vector
            RAG shreds these long-range links. Retrieve the wrong chunk and the
            causal chain breaks.
          </p>
        </Section>

        <Section
          id="solution"
          label="The solution"
          title="Permanent, evolving clinical memory"
        >
          <p className="text-lg leading-relaxed text-text-secondary">
            TheraGraph builds a knowledge graph on{" "}
            <span className="text-accent">Cognee</span> — a clinical memory
            layer that preserves causal relationships across the full patient
            timeline. Facts connect to facts. New evidence updates existing
            nodes instead of appending disconnected snippets. The result: AI
            that remembers, reasons, and adapts.
          </p>
        </Section>

        <LifecycleSection />

        <Section
          id="regulatory"
          label="Regulatory path"
          title="Modular building blocks, not novel molecules"
        >
          <p className="text-lg leading-relaxed text-text-secondary">
            Personalized formulations use{" "}
            <span className="text-text">pre-approved</span> active
            pharmaceutical ingredients and excipients — assembled by licensed
            CDMOs and compounding partners, not synthesized from scratch. The
            innovation is in the decision engine: which modules, at what ratios,
            for which patient graph state. Regulatory credibility comes from
            the supply chain, not from claiming a new drug entity.
          </p>
        </Section>

        <Footer />
      </main>
    </div>
  );
}
