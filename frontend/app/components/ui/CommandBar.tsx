"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Patient } from "@/app/lib/types";

interface CommandBarProps {
  patients: Patient[];
  onNewPatient?: () => void;
}

export function CommandBar({ patients, onNewPatient }: CommandBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const go = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/patients/${id}/intake`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-md items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm text-text-secondary transition-colors hover:border-accent/40"
      >
        <span className="flex-1 text-left">Search patients…</span>
        <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-bg/80 pt-[20vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to patient…"
              className="w-full border-b border-border bg-transparent px-4 py-3 text-text outline-none placeholder:text-text-secondary"
            />
            <div className="max-h-64 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-2 py-4 text-sm text-text-secondary">
                  No patients found
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => go(p.id)}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-bg"
                  >
                    <span>{p.name}</span>
                    {p.mrn && (
                      <span className="text-xs text-text-secondary">
                        {p.mrn}
                      </span>
                    )}
                  </button>
                ))
              )}
              {onNewPatient && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onNewPatient();
                  }}
                  className="mt-1 w-full rounded border border-dashed border-border px-3 py-2 text-left text-sm text-accent hover:border-accent/50"
                >
                  + New Patient
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
