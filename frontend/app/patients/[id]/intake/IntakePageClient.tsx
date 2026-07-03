"use client";

import Link from "next/link";
import { useState } from "react";
import { Dropzone } from "@/app/components/Dropzone";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

interface IntakePageClientProps {
  patientId: string;
}

export function IntakePageClient({ patientId }: IntakePageClientProps) {
  const [ready, setReady] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card>
        {!hasUploaded && (
          <div className="mb-6 rounded border border-border bg-bg px-4 py-6 text-center">
            <p className="text-lg font-medium text-text">No documents ingested yet</p>
            <p className="mt-2 text-sm text-text-secondary">
              Drop genomic (.vcf), clinical notes (.txt), or lab reports (.pdf)
              to begin building this patient&apos;s knowledge graph.
            </p>
          </div>
        )}
        <Dropzone
          patientId={patientId}
          onComplete={() => {
            setReady(true);
            setHasUploaded(true);
          }}
        />
        <div className="mt-6 flex justify-end">
          <Link href={`/patients/${patientId}/graph`}>
            <Button disabled={!ready} variant={ready ? "primary" : "secondary"}>
              View Graph
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
