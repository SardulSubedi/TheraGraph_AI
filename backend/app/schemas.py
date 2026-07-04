from datetime import datetime

from pydantic import BaseModel


class PatientIn(BaseModel):
    name: str
    dob: str | None = None
    mrn: str | None = None


class Patient(PatientIn):
    id: str
    created_at: datetime | None = None


class FeedbackIn(BaseModel):
    observation: str
    ts: datetime | None = None


class FeedbackEntry(BaseModel):
    id: str
    patient_id: str
    observation: str
    created_at: datetime


class FormulateIn(BaseModel):
    indication: str


class Module(BaseModel):
    component_id: str
    ratio: float
    # Real-drug detail (the "make it a real medication" fields).
    ingredient: str | None = None
    name: str | None = None
    brand_examples: str | None = None
    drug_class: str | None = None
    strength_mg: float | None = None
    form: str | None = None
    route: str | None = None
    frequency: str | None = None
    doses_per_day: int | None = None
    dose_mg: float | None = None
    daily_dose_mg: float | None = None
    max_daily_mg: float | None = None
    units_per_dose: float | None = None
    sig: str | None = None
    dose_note: str | None = None
    mechanism: str | None = None
    pathway: str | None = None
    role: str | None = None
    mass_mg: float | None = None


class ContraindicationDetail(BaseModel):
    drug: str
    reason: str
    severity: str = "high"


class GeneticRisk(BaseModel):
    gene: str
    genotype: str | None = None
    phenotype: str | None = None
    implication: str
    severity: str = "info"
    affected: list[str] = []
    recommendation: str | None = None
    # Provenance / strength of evidence — mirrors real clinical decision support.
    evidence_level: str | None = None
    guideline: str | None = None
    source: str | None = None


class DrugInteraction(BaseModel):
    drug_a: str
    drug_b: str
    severity: str = "moderate"  # major | moderate | minor
    mechanism: str
    effect: str
    management: str


class Formulation(BaseModel):
    patient_id: str
    formulation_id: str
    lot_number: str | None = None
    indication: str
    dosage_form: str | None = None
    route: str | None = None
    modules: list[Module]
    total_daily_mg: float | None = None
    contraindications_flagged: list[str]
    contraindication_details: list[ContraindicationDetail] = []
    genetic_risks: list[GeneticRisk] = []
    drug_interactions: list[DrugInteraction] = []
    safety_notes: list[str] = []
    monitoring: list[str] = []
    rationale: str
    generated_at: datetime


# --------------------------------------------------------------------------------------
# n-of-1 Custom Therapy design agent (§19)
# --------------------------------------------------------------------------------------
class CustomTherapyIn(BaseModel):
    goal: str
    target_hint: str | None = None
    preferred_modality: str | None = None


class MolecularTarget(BaseModel):
    identified: bool = False
    gene: str | None = None
    variant: str | None = None
    consequence: str | None = None
    mechanism: str | None = None  # loss_of_function | gain_of_function | splice | toxic_gain
    inheritance: str | None = None
    tissue: str | None = None
    disease: str | None = None
    summary: str | None = None


class ReasoningStep(BaseModel):
    step: int
    title: str
    detail: str
    grounded: bool = False


class ConstructBlock(BaseModel):
    label: str
    value: str
    note: str | None = None


class SafetyItem(BaseModel):
    risk: str
    severity: str = "moderate"  # high | moderate | low
    mitigation: str


class RegulatoryCriterion(BaseModel):
    criterion: str
    status: str  # addressed | partial | pending
    detail: str


class CustomTherapy(BaseModel):
    patient_id: str
    design_id: str
    goal: str
    target: MolecularTarget
    modality_id: str | None = None
    modality_name: str | None = None
    modality_class: str | None = None
    modality_rationale: str | None = None
    alternatives_considered: list[str] = []
    construct_blocks: list[ConstructBlock] = []
    delivery_vector: str | None = None
    delivery_route: str | None = None
    delivery_rationale: str | None = None
    reasoning: list[ReasoningStep] = []
    safety: list[SafetyItem] = []
    manufacturing: list[str] = []
    regulatory_framework: str | None = None
    regulatory_criteria: list[RegulatoryCriterion] = []
    precedent: str | None = None
    confidence: str = "illustrative"
    disclaimers: list[str] = []
    generated_at: datetime


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatIn(BaseModel):
    message: str
    history: list[ChatMessage] = []
    indication: str | None = None


class ChatOut(BaseModel):
    reply: str
    grounded: bool = False
