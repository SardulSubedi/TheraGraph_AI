import json
import logging
import re
import uuid
from datetime import datetime, timezone

from cognee import SearchType

from app.services.blocks import (
    BLOCK_LIBRARY,
    block_meta,
    contraindicated_blocks,
    dose_limits,
    matched_rules,
    rule_based_formulation,
)
from app.services.cognee_engine import recall_text

logger = logging.getLogger(__name__)

FORMULATION_SYSTEM_PROMPT = """You are a clinical pharmacology assistant for TheraGraph.
Using ONLY the patient's genomic and clinical graph context, design a personalized therapy as a
combination of PRE-APPROVED modular building blocks. You must NOT invent a novel molecule.
Return STRICT JSON only (no prose, no code fences) matching:
{
  "indication": string,
  "modules": [{"component_id": string, "ratio": number}],   // ratios sum to 1.0
  "contraindications_flagged": [string],
  "rationale": string
}
Allowed component_id values: %s
""" % ", ".join(BLOCK_LIBRARY.keys())


def _extract_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


async def generate_formulation(patient_id: str, indication: str) -> dict:
    query = (
        f"Design the safest modular therapy for: {indication}. "
        f"Account for the patient's genetic metabolism and contraindications."
    )
    try:
        results = await recall_text(
            patient_id,
            query,
            system_prompt=FORMULATION_SYSTEM_PROMPT,
            query_type=SearchType.GRAPH_COMPLETION,
            top_k=20,
        )
    except Exception:
        # Cognee unreachable (e.g. bad API key / quota): fall back to deterministic
        # composition instead of failing the request outright. Contraindications are
        # then derived from any recalled context we do have (empty here).
        logger.warning("recall failed during formulation for %s; using rule-based fallback", patient_id)
        results = []
    text = results[0]["text"] if results else ""
    parsed = _extract_json(text)

    banned = await contraindicated_blocks(patient_id, results)

    if not parsed or "modules" not in parsed:
        parsed = rule_based_formulation(indication, banned)

    # Keep only valid, non-contraindicated blocks.
    parsed["modules"] = [
        m
        for m in parsed["modules"]
        if m["component_id"] not in banned and m["component_id"] in BLOCK_LIBRARY
    ]

    # Pharmacogenomic dose ceilings: cap any block whose ratio exceeds the
    # patient-specific limit derived from recalled genetics (e.g. TPMT -> 10%).
    limits = dose_limits(results)
    for m in parsed["modules"]:
        ceiling = limits.get(m["component_id"])
        if ceiling is not None:
            m["ratio"] = min(m.get("ratio", 0), ceiling)

    total = sum(m.get("ratio", 0) for m in parsed["modules"]) or 1.0
    for m in parsed["modules"]:
        meta = block_meta(m["component_id"])
        m["ratio"] = round(m.get("ratio", 0) / total, 3)
        m["mass_mg"] = round(m["ratio"] * meta["total_dose_mg"], 1)
        m["name"] = meta.get("name")
        m["drug_class"] = meta.get("drug_class")
        m["pathway"] = meta.get("pathway")
        m["route"] = meta.get("route")
        m["mechanism"] = meta.get("mechanism")

    parsed["contraindications_flagged"] = sorted(
        set(parsed.get("contraindications_flagged", [])) | banned
    )
    parsed["safety_notes"] = [rule["reason"] for rule in matched_rules(results)]
    parsed["patient_id"] = patient_id
    parsed["formulation_id"] = f"tx_{uuid.uuid4().hex[:8]}_v1"
    parsed["generated_at"] = datetime.now(timezone.utc)
    if "indication" not in parsed:
        parsed["indication"] = indication
    return parsed
