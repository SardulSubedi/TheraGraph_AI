export interface Patient {
  id: string;
  name: string;
  dob?: string | null;
  mrn?: string | null;
  created_at?: string | null;
}

export interface PatientIn {
  name: string;
  dob?: string | null;
  mrn?: string | null;
}

export interface Module {
  component_id: string;
  ratio: number;
  mass_mg?: number | null;
  name?: string | null;
  drug_class?: string | null;
  pathway?: string | null;
  route?: string | null;
  mechanism?: string | null;
}

export interface Formulation {
  patient_id: string;
  formulation_id: string;
  indication: string;
  modules: Module[];
  contraindications_flagged: string[];
  safety_notes?: string[];
  rationale: string;
  generated_at: string;
}

export interface FeedbackEntry {
  id?: string;
  patient_id?: string;
  observation: string;
  created_at?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type?: string;
  source_text?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface IngestResult {
  ingested: { name: string; status: string }[];
}

export interface FeedbackResponse {
  status: string;
  updated: boolean;
}

export interface DeleteResponse {
  status: string;
}
