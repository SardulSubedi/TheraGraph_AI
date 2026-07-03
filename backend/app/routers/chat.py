import logging

from fastapi import APIRouter

from cognee import SearchType

from app.schemas import ChatIn, ChatOut
from app.services.cognee_engine import recall_text

logger = logging.getLogger(__name__)

router = APIRouter()

CHAT_SYSTEM_PROMPT = """You are TheraGraph's clinical co-pilot, assisting a physician about ONE
specific patient. Ground every answer in the patient's genomic and clinical knowledge graph.
Be concise, factual, and clinically useful: reference the patient's genes, metabolizer
phenotypes, allergies, contraindications, and current therapy where relevant. If the graph does
not contain the answer, say so plainly rather than inventing detail. This is a prototype and not
a substitute for professional clinical judgment."""


def _history_preamble(history: list, indication: str | None) -> str:
    parts: list[str] = []
    if indication:
        parts.append(f"Current working indication: {indication}.")
    for turn in history[-6:]:
        role = "Physician" if turn.role == "user" else "Assistant"
        parts.append(f"{role}: {turn.content}")
    return "\n".join(parts)


@router.post("/api/patients/{patient_id}/chat", response_model=ChatOut)
async def chat(patient_id: str, body: ChatIn) -> ChatOut:
    preamble = _history_preamble(body.history, body.indication)
    query = f"{preamble}\n\nPhysician question: {body.message}" if preamble else body.message

    try:
        results = await recall_text(
            patient_id,
            query,
            system_prompt=CHAT_SYSTEM_PROMPT,
            query_type=SearchType.GRAPH_COMPLETION,
            top_k=15,
        )
    except Exception as exc:
        logger.warning("chat recall failed for %s: %s", patient_id, exc)
        return ChatOut(
            reply=(
                "I couldn't reach the patient's memory graph just now. Once Cognee is "
                "connected and this patient's records are ingested, I can answer grounded in "
                "their genomics, allergies, and current therapy."
            ),
            grounded=False,
        )

    text = ""
    for r in results:
        if r.get("text"):
            text = r["text"].strip()
            break

    if not text:
        return ChatOut(
            reply=(
                "There's nothing in this patient's graph yet that answers that. Ingest their "
                "genomic and clinical files on the Intake tab, then ask again."
            ),
            grounded=False,
        )

    return ChatOut(reply=text, grounded=True)
