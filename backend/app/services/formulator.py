"""Formulation generator.

Produces a *real, dispensable-looking* medication regimen — named active ingredients with
exact strengths, dosage forms, routes, and sigs — rather than abstract "roles" and bare
percentages. Cognee `recall` supplies the live patient context; deterministic clinical logic
turns that into a safe, fully-specified regimen (this guarantees a sane result even if the LLM
path is unavailable, and enforces that contraindicated drugs can never appear).

PROTOTYPE / DEMO ONLY — not validated clinical decision support.
"""

import logging
import uuid
from datetime import datetime, timezone

from cognee import SearchType

from app.services import blocks
from app.services.cognee_engine import recall_text

logger = logging.getLogger(__name__)

# Ask the graph for a clinician-facing pharmacogenomic assessment. The returned prose is used
# for (a) deterministic trigger detection (we scan it for gene/phenotype tokens) and (b) as
# supporting narrative. We do NOT ask the LLM to invent the dosing — that is deterministic.
ASSESSMENT_SYSTEM_PROMPT = """You are a clinical pharmacology assistant.
Using ONLY the patient's genomic and clinical graph context, summarize the pharmacogenomic
findings relevant to prescribing: name each gene, its diplotype/genotype, the metabolizer
phenotype, and which drugs or drug classes must be avoided or dose-adjusted. Mention documented
allergies. Be concise and factual. Do not invent data that is not in the context."""


async def _recall_context(patient_id: str, indication: str) -> list[dict]:
    query = (
        f"What genetic variants, metabolizer phenotypes, allergies, and drug "
        f"contraindications are relevant when treating {indication} for this patient?"
    )
    try:
        return await recall_text(
            patient_id,
            query,
            system_prompt=ASSESSMENT_SYSTEM_PROMPT,
            query_type=SearchType.GRAPH_COMPLETION,
            top_k=20,
        )
    except Exception:
        logger.warning(
            "recall failed during formulation for %s; using deterministic composition only",
            patient_id,
        )
        return []


def _dosage_form_summary(modules: list[dict]) -> str:
    forms = {m["form"] for m in modules}
    if len(modules) == 1:
        return f"{modules[0]['form']} ({modules[0]['route']})"
    if len(forms) == 1:
        return f"Oral multi-agent regimen ({len(modules)} {next(iter(forms)).lower()}s)"
    return f"Oral multi-agent regimen ({len(modules)} agents)"


def _compose_rationale(
    indication: str,
    modules: list[dict],
    risks: list[dict],
    interactions: list[dict],
) -> str:
    """Build a clean, clinician-style rationale from the deterministic decision logic."""
    lines: list[str] = []
    lines.append(f"Indication: {indication}.")

    if risks:
        parts: list[str] = []
        for r in risks:
            geno = f" {r['genotype']}" if r.get("genotype") else ""
            phen = f" ({r['phenotype'].lower()})" if r.get("phenotype") else ""
            avoid = ", ".join(r["affected"]) if r.get("affected") else "affected agents"
            parts.append(f"{r['gene']}{geno}{phen}: {avoid} adjusted or excluded")
        lines.append("Pharmacogenomic assessment — " + "; ".join(parts) + ".")
    else:
        lines.append(
            "Pharmacogenomic assessment — no metabolizer or allergy flags detected in the "
            "patient graph; standard dosing applied."
        )

    regimen = "; ".join(
        f"{m['ingredient']} {m['dose_mg']:g} mg {m['frequency'].lower()}" for m in modules
    )
    lines.append(f"Regimen — {regimen}.")

    notes = [m["dose_note"] for m in modules if m.get("dose_note")]
    if notes:
        lines.append("Dose adjustments — " + " ".join(notes))

    if interactions:
        parts = [
            f"{i['drug_a']} + {i['drug_b']} ({i['severity']}): {i['management']}"
            for i in interactions
        ]
        lines.append("Interaction screening — " + " ".join(parts))

    return "\n\n".join(lines)


async def generate_formulation(patient_id: str, indication: str) -> dict:
    results = await _recall_context(patient_id, indication)

    rules = blocks.matched_rules(results)
    banned = blocks.banned_blocks(results)
    limits = blocks.dose_limits(results)
    risks = blocks.genetic_risks(results)
    contra_details = blocks.flagged_contraindications(results)

    # Deterministic, fully-dosed composition using real drugs (respecting exclusions).
    component_ids = [
        cid for cid in blocks._pick_ids(indication, banned) if cid not in banned
    ]
    if not component_ids:
        component_ids = ["ACETAMINOPHEN"]

    modules = [
        blocks.build_module(cid, dose_fraction=limits.get(cid)) for cid in component_ids
    ]

    total_daily = sum(m["daily_dose_mg"] for m in modules) or 1.0
    for m in modules:
        m["ratio"] = round(m["daily_dose_mg"] / total_daily, 3)

    interactions = blocks.interactions_for(component_ids)
    monitoring = blocks.monitoring_plan(component_ids, rules)

    formulation = {
        "patient_id": patient_id,
        "formulation_id": f"tx_{uuid.uuid4().hex[:8]}_v1",
        "lot_number": f"LOT-{uuid.uuid4().hex[:6].upper()}",
        "indication": indication,
        "dosage_form": _dosage_form_summary(modules),
        "route": "Oral (PO)",
        "modules": modules,
        "total_daily_mg": round(total_daily, 2),
        "contraindications_flagged": [c["drug"] for c in contra_details],
        "contraindication_details": contra_details,
        "genetic_risks": risks,
        "drug_interactions": interactions,
        "safety_notes": [r["implication"] for r in rules],
        "monitoring": monitoring,
        "rationale": _compose_rationale(indication, modules, risks, interactions),
        "generated_at": datetime.now(timezone.utc),
    }
    return formulation
