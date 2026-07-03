import logging

from fastapi import APIRouter, HTTPException

from app.schemas import FormulateIn, Formulation
from app.services import supabase_client as sb
from app.services.formulator import generate_formulation

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/patients/{patient_id}/formulate", response_model=Formulation)
async def formulate(patient_id: str, body: FormulateIn):
    try:
        payload = await generate_formulation(patient_id, body.indication)
    except Exception as exc:
        logger.exception("Formulation generation failed for %s", patient_id)
        raise HTTPException(status_code=502, detail=f"Formulation failed: {exc}") from exc

    try:
        record_payload = {
            **payload,
            "generated_at": payload["generated_at"].isoformat(),
            "modules": [
                {**m, "mass_mg": m.get("mass_mg")} for m in payload["modules"]
            ],
        }
        sb.record_formulation(patient_id, body.indication, record_payload)
    except sb.SupabaseError as exc:
        logger.warning("record_formulation failed (best-effort): %s", exc)

    return payload
