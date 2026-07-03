import { listPatients } from "@/app/lib/api";
import { ControlVault } from "@/app/components/ControlVault";

export default async function VaultPage() {
  let patients: Awaited<ReturnType<typeof listPatients>> = [];
  let backendOnline = true;

  try {
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      "http://localhost:8000";
    const health = await fetch(`${base}/health`, {
      cache: "no-store",
    }).catch(() => null);
    backendOnline = health?.ok ?? false;
    patients = await listPatients();
  } catch {
    backendOnline = false;
  }

  return (
    <ControlVault initialPatients={patients} backendOnline={backendOnline} />
  );
}
