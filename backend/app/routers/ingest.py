import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services import cognee_engine
from app.services.parser import extract_text
from app.services import supabase_client as sb

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/patients/{patient_id}/ingest")
async def ingest(patient_id: str, files: list[UploadFile] = File(...)):
    out = []
    for f in files:
        filename = f.filename or "upload"
        # Supabase (storage + parse) is our own infra: a failure here is a hard error.
        try:
            raw = await f.read()
            storage_path = sb.upload_document(patient_id, filename, raw)
            text = extract_text(filename, raw)
        except sb.SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("Ingest read/upload failed for %s", filename)
            raise HTTPException(status_code=502, detail=f"Ingest failed: {exc}") from exc

        # Cognee (remember) may be down/misconfigured (Blocker A): degrade per-file
        # instead of failing the whole batch, so the file is still stored + tracked.
        framed = f"Patient {patient_id} clinical record ({filename}):\n{text}"
        try:
            result = await cognee_engine.remember_text(patient_id, framed)
            status = str(getattr(result, "status", "ok"))
        except Exception as exc:
            logger.warning("Cognee remember failed for %s: %s", filename, exc)
            status = "remember_failed"

        try:
            sb.record_document(patient_id, filename, storage_path, status)
        except sb.SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        out.append({"name": filename, "status": status})
    return {"ingested": out}
