"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ANCHORS = [
  { href: "#problem", label: "Problem" },
  { href: "#lifecycle", label: "Lifecycle" },
  { href: "#real-world", label: "Real world" },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-bg/95 backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-text"
        >
          TheraGraph AI
        </Link>

        <div className="flex items-center gap-5">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="micro-label hidden text-text-secondary transition-colors hover:text-text sm:inline"
            >
              {a.label}
            </a>
          ))}
          <Link
            href="/login"
            className="hidden text-sm font-medium text-text-secondary transition-colors hover:text-text sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
