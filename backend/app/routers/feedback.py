import logging

from fastapi import APIRouter, HTTPException

from app.schemas import FeedbackEntry, FeedbackIn
from app.services import cognee_engine
from app.services import supabase_client as sb

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/patients/{patient_id}/feedback")
async def feedback(patient_id: str, body: FeedbackIn):
    # The memory update is the `remember` of the new observation — it runs add+cognify on the
    # Cloud tenant, so the observation becomes part of the graph and shifts future recall.
    # `improve` is a best-effort extra enrichment pass: this Cloud tenant returns 404 for it
    # (route not deployed), so it must NOT gate the "updated" signal or fail the request.
    memory_updated = False
    framed = f"Patient {patient_id} outcome observation: {body.observation}"
    try:
        await cognee_engine.remember_text(patient_id, framed)
        memory_updated = True
    except Exception as exc:
        logger.warning("Cognee remember failed for %s: %s", patient_id, exc)

    if memory_updated:
        try:
            await cognee_engine.improve_patient(patient_id)
        except Exception as exc:
            # e.g. Cloud tenant without the /api/v1/improve route (404) — the remembered
            # observation already enriched the graph, so this is non-fatal.
            logger.info("Cognee improve unavailable for %s (non-fatal): %s", patient_id, exc)

    try:
        sb.record_feedback(patient_id, body.observation)
    except sb.SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"status": "optimized" if memory_updated else "recorded", "updated": memory_updated}


@router.get("/api/patients/{patient_id}/timeline", response_model=list[FeedbackEntry])
async def timeline(patient_id: str):
    try:
        return sb.list_feedback(patient_id)
    except sb.SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
