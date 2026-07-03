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
    mass_mg: float | None = None
    name: str | None = None
    drug_class: str | None = None
    pathway: str | None = None
    route: str | None = None
    mechanism: str | None = None


class Formulation(BaseModel):
    patient_id: str
    formulation_id: str
    indication: str
    modules: list[Module]
    contraindications_flagged: list[str]
    safety_notes: list[str] = []
    rationale: str
    generated_at: datetime
