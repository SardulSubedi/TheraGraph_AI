import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <p className="micro-label mb-6 text-accent">Clinical memory graph</p>
        <h1 className="text-5xl font-bold tracking-tight text-text sm:text-6xl lg:text-7xl">
          TheraGraph AI
        </h1>
        <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-text-secondary sm:text-xl">
          Most medical AI has amnesia — it treats every patient like a
          stranger. In personalized medicine, forgetting one genetic marker can
          be fatal. TheraGraph gives AI a permanent, evolving clinical memory
          built on Cognee, turning static prescribing into an adaptive healing
          loop.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/vault"
            className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Enter the console
          </Link>
          <a
            href="#problem"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-text transition-colors hover:border-accent/50 hover:text-accent"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
