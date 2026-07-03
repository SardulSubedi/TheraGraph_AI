import type {
  ChatMessage,
  ChatResponse,
  DeleteResponse,
  FeedbackEntry,
  FeedbackResponse,
  Formulation,
  GraphData,
  IngestResult,
  Patient,
  PatientIn,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError("Backend unreachable. Is FastAPI running on port 8000?");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(
      detail || `Request failed (${res.status})`,
      res.status,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function listPatients(): Promise<Patient[]> {
  try {
    return await request<Patient[]>("/api/patients");
  } catch {
    return [];
  }
}

export async function createPatient(data: PatientIn): Promise<Patient> {
  return request<Patient>("/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getPatient(id: string): Promise<Patient | null> {
  try {
    return await request<Patient>(`/api/patients/${id}`);
  } catch {
    return null;
  }
}

export async function deletePatient(id: string): Promise<DeleteResponse> {
  return request<DeleteResponse>(`/api/patients/${id}`, { method: "DELETE" });
}

export async function ingest(
  patientId: string,
  files: File[],
): Promise<IngestResult> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  return request<IngestResult>(`/api/patients/${patientId}/ingest`, {
    method: "POST",
    body: form,
  });
}

export async function getGraph(patientId: string): Promise<GraphData> {
  try {
    return await request<GraphData>(`/api/patients/${patientId}/graph`);
  } catch {
    return { nodes: [], edges: [] };
  }
}

export async function formulate(
  patientId: string,
  indication: string,
): Promise<Formulation> {
  return request<Formulation>(`/api/patients/${patientId}/formulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indication }),
  });
}

export async function chatWithPatient(
  patientId: string,
  message: string,
  history: ChatMessage[],
  indication?: string,
): Promise<ChatResponse> {
  return request<ChatResponse>(`/api/patients/${patientId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, indication }),
  });
}

export async function sendFeedback(
  patientId: string,
  observation: string,
): Promise<FeedbackResponse> {
  return request<FeedbackResponse>(`/api/patients/${patientId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observation }),
  });
}

export async function getTimeline(
  patientId: string,
): Promise<FeedbackEntry[]> {
  try {
    return await request<FeedbackEntry[]>(
      `/api/patients/${patientId}/timeline`,
    );
  } catch {
    return [];
  }
}
