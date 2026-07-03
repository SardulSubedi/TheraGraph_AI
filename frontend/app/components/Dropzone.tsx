"use client";

import { useCallback, useState } from "react";
import { ingest } from "@/app/lib/api";
import { Badge } from "@/app/components/ui/Badge";

const ACCEPT = ".vcf,.txt,.pdf";
const STEPS = ["Uploaded", "Extracting", "Remembering", "Done"] as const;

type Step = (typeof STEPS)[number];

interface FileQueueItem {
  name: string;
  step: Step;
  error?: string;
  warning?: string;
}

interface DropzoneProps {
  patientId: string;
  onComplete?: () => void;
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent motion-reduce:animate-none"
      aria-hidden
    />
  );
}

export function Dropzone({ patientId, onComplete }: DropzoneProps) {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) =>
        /\.(vcf|txt|pdf)$/i.test(f.name),
      );
      if (list.length === 0) return;

      setBusy(true);
      setQueue(list.map((f) => ({ name: f.name, step: "Uploaded" as Step })));

      const tick = (names: string[], step: Step) => {
        setQueue((prev) =>
          prev.map((item) =>
            names.includes(item.name) ? { ...item, step } : item,
          ),
        );
      };

      const names = list.map((f) => f.name);
      tick(names, "Extracting");

      try {
        await new Promise((r) => setTimeout(r, 400));
        tick(names, "Remembering");
        const res = await ingest(patientId, list);

        const statusMap = new Map(
          res.ingested.map((item) => [item.name, item.status]),
        );

        setQueue((prev) =>
          prev.map((item) => {
            if (!names.includes(item.name)) return item;
            const status = statusMap.get(item.name);
            const warning =
              status === "remember_failed"
                ? "Stored, memory pending"
                : undefined;
            return { ...item, step: "Done" as Step, warning };
          }),
        );
        onComplete?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setQueue((prev) =>
          prev.map((item) =>
            names.includes(item.name)
              ? { ...item, step: "Done", error: msg }
              : item,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [patientId, onComplete],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const activeStepIndex = (step: Step) => STEPS.indexOf(step);

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-[280px] flex-col items-center justify-center rounded border-2 border-dashed p-8 transition-colors duration-150 motion-reduce:transition-none ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border bg-surface hover:border-accent/40"
        }`}
      >
        <p className="micro-label text-text-secondary">Intake Canvas</p>
        <p className="mt-2 text-lg font-medium">Drop clinical files here</p>
        <p className="mt-1 text-sm text-text-secondary">
          Accepts .vcf, .txt, .pdf
        </p>
        <label className="mt-6 cursor-pointer rounded border border-border bg-bg px-4 py-2 text-sm font-medium transition-colors duration-150 hover:border-accent/40 focus-within:ring-2 focus-within:ring-accent/50">
          <input
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files) void processFiles(e.target.files);
              e.target.value = "";
            }}
          />
          Browse files
        </label>
      </div>

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((item) => {
            const currentIdx = activeStepIndex(item.step);
            const inProgressStep = item.error ? null : item.step;

            return (
              <li
                key={item.name}
                className="flex flex-col gap-2 rounded border border-border bg-bg px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="truncate text-sm">{item.name}</span>
                <div className="flex flex-wrap items-center gap-1">
                  {STEPS.map((step) => {
                    const stepIdx = STEPS.indexOf(step);
                    const isActive = inProgressStep === step;
                    const isComplete = stepIdx < currentIdx;
                    const isCurrent = stepIdx === currentIdx;

                    return (
                      <Badge
                        key={step}
                        tone={
                          item.error && step === "Done"
                            ? "danger"
                            : isComplete || (isCurrent && step === "Done")
                              ? step === "Done"
                                ? "success"
                                : "accent"
                              : isCurrent
                                ? "accent"
                                : "default"
                        }
                        className={
                          stepIdx <= currentIdx ? "opacity-100" : "opacity-30"
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {isActive && <Spinner />}
                          {step}
                        </span>
                      </Badge>
                    );
                  })}
                </div>
                {item.warning && (
                  <Badge tone="warning" className="sm:w-auto">
                    {item.warning}
                  </Badge>
                )}
                {item.error && (
                  <p className="text-xs text-danger sm:w-full">{item.error}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
