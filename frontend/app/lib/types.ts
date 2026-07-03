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
  ingredient?: string | null;
  name?: string | null;
  brand_examples?: string | null;
  drug_class?: string | null;
  strength_mg?: number | null;
  form?: string | null;
  route?: string | null;
  frequency?: string | null;
  doses_per_day?: number | null;
  dose_mg?: number | null;
  daily_dose_mg?: number | null;
  max_daily_mg?: number | null;
  units_per_dose?: number | null;
  sig?: string | null;
  dose_note?: string | null;
  mechanism?: string | null;
  pathway?: string | null;
  role?: string | null;
  mass_mg?: number | null;
}

export interface ContraindicationDetail {
  drug: string;
  reason: string;
  severity: string;
}

export interface GeneticRisk {
  gene: string;
  genotype?: string | null;
  phenotype?: string | null;
  implication: string;
  severity: string;
  affected: string[];
  recommendation?: string | null;
}

export interface Formulation {
  patient_id: string;
  formulation_id: string;
  lot_number?: string | null;
  indication: string;
  dosage_form?: string | null;
  route?: string | null;
  modules: Module[];
  total_daily_mg?: number | null;
  contraindications_flagged: string[];
  contraindication_details?: ContraindicationDetail[];
  genetic_risks?: GeneticRisk[];
  safety_notes?: string[];
  monitoring?: string[];
  rationale: string;
  generated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  grounded: boolean;
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
