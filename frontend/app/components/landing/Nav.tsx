"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
          ? "border-b border-white/10 bg-bg/80 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-text"
        >
          <span className="h-2 w-2 rounded-full bg-accent" />
          TheraGraph AI
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-bg transition-transform hover:-translate-y-0.5"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
