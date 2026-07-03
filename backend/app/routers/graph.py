import json
import logging
import re

from cognee import SearchType
from fastapi import APIRouter

from app.services.cognee_engine import recall_text

logger = logging.getLogger(__name__)

router = APIRouter()

GRAPH_SYSTEM_PROMPT = """Return STRICT JSON describing this patient's clinical knowledge graph as:
{"nodes":[{"id":str,"label":str,"type":"patient|gene|variant|phenotype|drug|condition"}],
 "edges":[{"source":str,"target":str,"label":str}]}
Only include entities grounded in the patient's data. No prose, no code fences."""


def _extract_graph_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    nodes = data.get("nodes")
    edges = data.get("edges")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        return None
    return {"nodes": nodes, "edges": edges}


@router.get("/api/patients/{patient_id}/graph")
async def get_graph(patient_id: str):
    try:
        results = await recall_text(
            patient_id,
            "Summarize this patient's clinical knowledge graph with all key entities and relationships.",
            system_prompt=GRAPH_SYSTEM_PROMPT,
            query_type=SearchType.GRAPH_COMPLETION,
            top_k=20,
        )
        text = results[0]["text"] if results else ""
        parsed = _extract_graph_json(text)
        if parsed:
            return parsed
    except Exception as exc:
        logger.warning("Graph recall failed for %s: %s", patient_id, exc)
    return {"nodes": [], "edges": []}
