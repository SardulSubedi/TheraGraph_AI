"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "intake", label: "Intake" },
  { slug: "graph", label: "Graph" },
  { slug: "formulation", label: "Formulation" },
  { slug: "therapy", label: "Custom Rx" },
  { slug: "timeline", label: "Timeline" },
] as const;

interface PatientNavProps {
  patientId: string;
}

export function PatientNav({ patientId }: PatientNavProps) {
  const pathname = usePathname();
  const base = `/patients/${patientId}`;

  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const href = `${base}/${tab.slug}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`px-4 py-2 text-sm transition-colors ${
              active
                ? "border-b-2 border-accent text-text"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface BreadcrumbProps {
  patientName: string;
  screen: string;
}

export function Breadcrumb({ patientName, screen }: BreadcrumbProps) {
  return (
    <p className="micro-label text-text-secondary">
      <Link href="/vault" className="hover:text-accent">
        Patient
      </Link>
      {" / "}
      <span className="text-text">{patientName}</span>
      {" / "}
      <span className="text-accent">{screen}</span>
    </p>
  );
}

export function screenFromPathname(pathname: string): string {
  const segment = pathname.split("/").pop() ?? "intake";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
