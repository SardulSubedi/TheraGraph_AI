import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <Link
          href="/vault"
          className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Enter the console
        </Link>
        <p className="micro-label text-text-secondary">
          Prototype — not for clinical use
        </p>
        <p className="text-xs text-text-secondary/60">
          © {new Date().getFullYear()} TheraGraph AI
        </p>
      </div>
    </footer>
  );
}
