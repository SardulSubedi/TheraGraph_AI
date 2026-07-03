import Link from "next/link";
import { CausalChain } from "./CausalChain";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-16 pt-28 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <p className="micro-label mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Clinical memory graph · powered by Cognee
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-text sm:text-6xl lg:text-7xl">
          Medical AI that never
          <br className="hidden sm:block" />{" "}
          <span className="bg-gradient-to-r from-accent to-cyan-300 bg-clip-text text-transparent">
            forgets a patient
          </span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
          Most medical AI has amnesia — it treats every patient like a stranger.
          In personalized medicine, forgetting one genetic marker can be fatal.
          TheraGraph gives AI a permanent, evolving clinical memory, turning
          static prescribing into an adaptive healing loop.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Get started — it&apos;s free
          </Link>
          <a
            href="#problem"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-text transition-colors hover:border-accent/50 hover:text-accent"
          >
            See how it works
          </a>
        </div>
        <p className="mt-4 text-xs text-text-secondary">
          Or explore the live demo — sign in with{" "}
          <span className="text-text">demo@gmail.com</span> /{" "}
          <span className="text-text">Demo123</span>
        </p>

        <CausalChain />
      </div>
    </section>
  );
}
