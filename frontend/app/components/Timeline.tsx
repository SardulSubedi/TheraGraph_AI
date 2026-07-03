"use client";

import { useMemo, useState } from "react";
import { getTimeline, sendFeedback } from "@/app/lib/api";
import type { FeedbackEntry } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Toaster, toast } from "@/app/components/ui/Toast";

interface TimelineProps {
  patientId: string;
  initialEntries: FeedbackEntry[];
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function Timeline({ patientId, initialEntries }: TimelineProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const ordered = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      ),
    [entries],
  );

  const submit = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setBusy(true);
    setError(null);
    try {
      await sendFeedback(patientId, text);
      setInput("");
      setPulse(true);
      setTimeout(() => setPulse(false), 2400);
      toast("Observation remembered — graph updated", { type: "success" });
      const data = await getTimeline(patientId);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Toaster />
      <div className="flex items-baseline justify-between">
        <div>
          <p className="micro-label text-text-secondary">Longitudinal record</p>
          <h2 className="mt-1 text-lg font-semibold text-text">
            Outcome timeline
          </h2>
        </div>
        <span className="text-xs text-text-secondary">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <Card className={pulse ? "graph-updated-pulse" : ""}>
        <label htmlFor="obs" className="micro-label text-text-secondary">
          Record an observation
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="obs"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="Day 3: mild nausea, inflammation down 40%"
            disabled={busy}
            className="flex-1 rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={busy || !input.trim()}
            onClick={() => void submit()}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Add to memory"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <p className="mt-2 text-xs text-text-secondary">
          Each observation is remembered into the patient graph and reshapes the
          next recommendation.
        </p>
      </Card>

      <Card>
        {ordered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-base font-medium text-text">No observations yet</p>
            <p className="max-w-sm text-sm text-text-secondary">
              Record the first outcome above — it feeds back into the knowledge
              graph and adapts future formulations.
            </p>
          </div>
        ) : (
          <ol className="relative ml-2 border-l border-border">
            {ordered.map((entry, i) => (
              <li key={entry.id ?? i} className="relative py-4 pl-6">
                <span
                  className={`absolute -left-[7px] top-6 h-3 w-3 rounded-full border-2 border-surface ${
                    i === 0 ? "bg-accent" : "bg-border"
                  }`}
                  aria-hidden
                />
                <div className="flex items-center gap-2">
                  <time className="text-xs font-medium text-text-secondary">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleString()
                      : "—"}
                  </time>
                  <span className="text-xs text-text-secondary/60">
                    · {relativeTime(entry.created_at)}
                  </span>
                  {i === 0 && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                      Latest
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-text">
                  {entry.observation}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
