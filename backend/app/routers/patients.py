import logging

from fastapi import APIRouter, HTTPException

from app.schemas import Patient, PatientIn
from app.services import cognee_engine
from app.services.supabase_client import SupabaseError, create_patient, delete_patient, get_patient, list_patients

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/patients", response_model=list[Patient])
async def get_patients():
    try:
        return list_patients()
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/api/patients", response_model=Patient)
async def post_patient(body: PatientIn):
    try:
        return create_patient(body.name, body.dob, body.mrn)
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/api/patients/{patient_id}", response_model=Patient)
async def get_one_patient(patient_id: str):
    try:
        return get_patient(patient_id)
    except SupabaseError as exc:
        if "not found" in str(exc).lower():
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.delete("/api/patients/{patient_id}")
async def remove_patient(patient_id: str):
    try:
        delete_patient(patient_id)
    except SupabaseError as exc:
        if "not found" in str(exc).lower():
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    try:
        await cognee_engine.forget_patient(patient_id)
    except Exception as exc:
        logger.warning("forget_patient failed for %s: %s", patient_id, exc)

    return {"status": "deleted"}
