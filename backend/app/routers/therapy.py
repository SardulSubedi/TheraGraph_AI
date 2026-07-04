import logging

from fastapi import APIRouter, HTTPException

from app.schemas import CustomTherapy, CustomTherapyIn
from app.services import supabase_client as sb
from app.services.therapy_designer import design_custom_therapy

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/patients/{patient_id}/custom-therapy", response_model=CustomTherapy)
async def custom_therapy(patient_id: str, body: CustomTherapyIn) -> CustomTherapy:
    try:
        payload = await design_custom_therapy(
            patient_id,
            body.goal,
            target_hint=body.target_hint,
            preferred_modality=body.preferred_modality,
        )
    except Exception as exc:
        logger.exception("Custom therapy design failed for %s", patient_id)
        raise HTTPException(status_code=502, detail=f"Design failed: {exc}") from exc

    # Persist the design brief alongside the formulation history (best-effort — reuses the
    # `formulations` table with an "n-of-1:" indication prefix so nothing new is required in
    # Supabase for the prototype).
    try:
        record_payload = {**payload, "generated_at": payload["generated_at"].isoformat()}
        sb.record_formulation(patient_id, f"n-of-1: {body.goal}", record_payload)
    except sb.SupabaseError as exc:
        logger.warning("record custom therapy failed (best-effort): %s", exc)

    return payload
