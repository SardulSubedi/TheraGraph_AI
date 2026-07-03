"use client";

import { useState } from "react";
import { getTimeline, sendFeedback } from "@/app/lib/api";
import type { FeedbackEntry } from "@/app/lib/types";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

interface TimelineProps {
  patientId: string;
  initialEntries: FeedbackEntry[];
}

export function Timeline({ patientId, initialEntries }: TimelineProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

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
      const data = await getTimeline(patientId);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex h-full min-h-[480px] flex-col gap-4 ${pulse ? "graph-updated-pulse rounded" : ""}`}
    >
      <Card className="flex-1 overflow-hidden">
        <p className="micro-label text-text-secondary">Observation Log</p>
        <ul className="mt-4 max-h-[360px] space-y-3 overflow-y-auto">
          {entries.length === 0 ? (
            <li className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-lg font-medium text-text">No timeline entries yet</p>
              <p className="max-w-sm text-sm text-text-secondary">
                Record patient outcomes below — observations feed back into the
                knowledge graph via improve.
              </p>
            </li>
          ) : (
            entries.map((entry, i) => (
              <li
                key={entry.id ?? i}
                className="border-l-2 border-accent/40 pl-3"
              >
                <time className="micro-label text-text-secondary">
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : "—"}
                </time>
                <p className="mt-1 text-sm">{entry.observation}</p>
              </li>
            ))
          )}
        </ul>
      </Card>

      <div className="rounded border border-border bg-bg p-3 font-mono text-sm">
        <label htmlFor="timeline-input" className="micro-label text-accent">
          Terminal Input
        </label>
        <div className="mt-2 flex gap-2">
          <span className="text-success" aria-hidden>
            &gt;
          </span>
          <input
            id="timeline-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="Day 3: mild nausea, inflammation down 40%"
            disabled={busy}
            className="flex-1 bg-transparent text-text outline-none transition-colors duration-150 placeholder:text-text-secondary/60 focus-visible:ring-2 focus-visible:ring-accent/30"
          />
          <Button
            variant="secondary"
            disabled={busy || !input.trim()}
            onClick={() => void submit()}
          >
            Submit
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        {pulse && (
          <p className="mt-2 text-xs text-accent">Graph updated via improve</p>
        )}
      </div>
    </div>
  );
}
