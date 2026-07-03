import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface SectionProps {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
}

export function Section({ id, label, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="micro-label text-accent">{label}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {title}
          </h2>
        </Reveal>
        <Reveal delay={100} className="mt-8">
          {children}
        </Reveal>
      </div>
    </section>
  );
}
