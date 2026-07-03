"use client";

import { Breadcrumb, screenFromPathname } from "@/app/components/PatientNav";
import { usePathname } from "next/navigation";

interface PatientScreenLabelProps {
  patientName: string;
}

export function PatientScreenLabel({ patientName }: PatientScreenLabelProps) {
  const pathname = usePathname();
  const screen = screenFromPathname(pathname);

  return <Breadcrumb patientName={patientName} screen={screen} />;
}
