import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-md bg-white px-6 py-3 text-sm font-medium text-bg transition-transform hover:-translate-y-0.5"
          >
            Create your account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/15 px-6 py-3 text-sm font-medium text-text transition-colors hover:border-white/40"
          >
            Sign in
          </Link>
        </div>
        <p className="micro-label text-text-secondary/70">
          Prototype — not for clinical use
        </p>
        <p className="text-xs text-text-secondary/50">
          © {new Date().getFullYear()} TheraGraph AI
        </p>
      </div>
    </footer>
  );
}
