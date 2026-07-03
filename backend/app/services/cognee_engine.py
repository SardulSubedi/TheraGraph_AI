import logging

import cognee
from cognee import SearchType

from app.config import settings

logger = logging.getLogger(__name__)

_connected = False


def dataset_for(patient_id: str) -> str:
    return f"patient_{patient_id}"


def normalize_recall_item(item) -> dict:
    """Convert a recall result (dict or pydantic object) to a plain dict."""
    if isinstance(item, dict):
        return {
            "text": item.get("text") or "",
            "source": item.get("source") or "",
            "score": item.get("score"),
        }
    return {
        "text": getattr(item, "text", None) or "",
        "source": getattr(item, "source", None) or "",
        "score": getattr(item, "score", None),
    }


def normalize_recall_results(results) -> list[dict]:
    if not results:
        return []
    return [normalize_recall_item(item) for item in results]


async def connect() -> None:
    """Route the cognee SDK at the Cloud tenant. Idempotent."""
    global _connected
    if _connected:
        return
    await cognee.serve(
        url=settings.cognee_service_url,
        api_key=settings.cognee_api_key,
    )
    _connected = True


async def remember_text(patient_id: str, text: str, *, background: bool = False):
    """Ingest a block of clinical text into the patient's graph."""
    return await cognee.remember(
        text,
        dataset_name=dataset_for(patient_id),
        run_in_background=background,
    )


async def recall_text(
    patient_id: str,
    query: str,
    *,
    system_prompt: str | None = None,
    query_type: SearchType | None = None,
    top_k: int = 15,
) -> list[dict]:
    """Query the patient's graph; returns normalized list of dicts."""
    raw = await cognee.recall(
        query,
        query_type=query_type or SearchType.GRAPH_COMPLETION,
        datasets=[dataset_for(patient_id)],
        top_k=top_k,
        system_prompt=system_prompt,
    )
    return normalize_recall_results(raw)


async def improve_patient(patient_id: str):
    """Re-enrich the patient's graph after new feedback."""
    return await cognee.improve(dataset=dataset_for(patient_id))


async def forget_patient(patient_id: str):
    """HIPAA right-to-be-forgotten: drop the entire patient dataset."""
    return await cognee.forget(dataset=dataset_for(patient_id))
