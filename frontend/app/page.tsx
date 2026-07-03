import { LandingNav } from "@/app/components/landing/Nav";
import { Hero } from "@/app/components/landing/Hero";
import { Reveal } from "@/app/components/landing/Reveal";
import { Footer } from "@/app/components/landing/Footer";

const LIFECYCLE = [
  { phase: "Remember", copy: "Genome, labs, and history become one living graph." },
  { phase: "Recall", copy: "Causal chains surface the right therapy, safely." },
  { phase: "Improve", copy: "Outcomes refine the memory over time." },
  { phase: "Forget", copy: "Consent-driven erasure, built in." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <LandingNav />
      <main>
        <Hero />

        <section className="border-t border-white/5 px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="micro-label text-accent">The lifecycle</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                Memory that becomes medicine
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
              {LIFECYCLE.map((item, i) => (
                <Reveal key={item.phase} delay={i * 70}>
                  <div className="h-full bg-bg p-6">
                    <span className="micro-label text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-3 text-lg font-medium text-text">
                      {item.phase}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {item.copy}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
