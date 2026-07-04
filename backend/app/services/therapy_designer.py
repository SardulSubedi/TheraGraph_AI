"""n-of-1 Custom Therapy design agent (§19.3).

Reads the patient's molecular profile from the Cognee graph and drafts a bespoke, single-patient
therapeutic candidate (ASO / siRNA / mRNA / AAV / base or prime editing) with an explicit,
step-by-step reasoning trace.

Design philosophy (mirrors the formulator): Cognee `recall` supplies the *live patient context*;
deterministic clinical/engineering logic turns that into the modality, construct, delivery, safety,
and regulatory plan. The LLM does not invent sequences or doses — it only surfaces the molecular
target from the graph.

PROTOTYPE / DEMO ONLY — not a validated therapeutic. Sequence fields are illustrative scaffolds,
never orderable or clinically usable. See §19.2 honesty guardrails and §19.8 for the specialized
tooling a production system would require.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone

from cognee import SearchType

from app.services import modalities as mod
from app.services.cognee_engine import recall_text

logger = logging.getLogger(__name__)

TARGET_ANALYSIS_SYSTEM_PROMPT = """You are a molecular-genetics analyst for a personalized-therapeutics
team. Using ONLY the patient's genomic and clinical knowledge graph, determine whether there is a
SINGLE-GENE (monogenic) disease-causing variant that could be addressed by an individualized
therapeutic. If there is, state: the gene, the specific variant, the molecular consequence, the
mechanism (loss-of-function, gain-of-function, a splicing defect, or a toxic gain), the inheritance
pattern, and the affected tissue. If the patient's issues are pharmacogenomic (drug-metabolism)
rather than a single disease-causing gene, say clearly that there is NO monogenic n-of-1 target.
Be concise and factual; do not invent variants that are not in the context."""

_BASES = "ACGU"
_DNA = "ACGT"


def _illustrative_sequence(seed: str, alphabet: str, length: int) -> str:
    """Deterministic, obviously-illustrative nucleotide string derived from a seed.

    NOT a real or designed sequence — a stable placeholder so the UI has something concrete to
    show while making clear (in labels) that real sequence design requires the tools in §19.8.
    """
    h = abs(hash(f"{seed}:{length}:{alphabet}"))
    out = []
    for _ in range(length):
        out.append(alphabet[h % len(alphabet)])
        h //= 7
        if h == 0:
            h = abs(hash("".join(out) + seed)) or 1
    return "".join(out)


async def _recall_target(patient_id: str, goal: str) -> list[dict]:
    query = (
        f"For the therapeutic goal '{goal}', identify any monogenic disease-causing variant in "
        f"this patient: gene, variant, molecular consequence, mechanism, inheritance, and affected "
        f"tissue. If only pharmacogenomic findings exist, say there is no monogenic target."
    )
    try:
        return await recall_text(
            patient_id,
            query,
            system_prompt=TARGET_ANALYSIS_SYSTEM_PROMPT,
            query_type=SearchType.GRAPH_COMPLETION,
            top_k=20,
        )
    except Exception:
        logger.warning("target recall failed for %s; using hint-only extraction", patient_id)
        return []


def _corpus(results: list[dict]) -> str:
    return " ".join(r.get("text", "") for r in results)


def _detect_gene(corpus_upper: str, hint: str | None) -> str | None:
    """Find a known monogenic gene by symbol or disease token (hint takes priority)."""
    if hint:
        hint_u = hint.upper()
        for gene, meta in mod.MONOGENIC_TARGETS.items():
            if gene in hint_u or any(tok in hint_u for tok in meta["disease_tokens"]):
                return gene
    for gene, meta in mod.MONOGENIC_TARGETS.items():
        if re.search(rf"\b{re.escape(gene)}\b", corpus_upper):
            return gene
        if any(tok in corpus_upper for tok in meta["disease_tokens"]):
            return gene
    return None


def _has_pgx_only_signal(corpus_upper: str) -> bool:
    """Heuristic: the graph talks about drug metabolism, not a disease-causing gene."""
    pgx = ("METABOLIZER" in corpus_upper or "PHARMACOGEN" in corpus_upper
           or "NO MONOGENIC" in corpus_upper)
    return pgx


def _infer_mechanism(corpus_upper: str, meta: dict) -> tuple[str, str]:
    """Return (mechanism, consequence), preferring corpus evidence then the hint-table default."""
    if any(k in corpus_upper for k in ("SPLICE", "CRYPTIC", "PSEUDOEXON")):
        return "splice", "Aberrant splicing (cryptic splice-site / pseudoexon inclusion)"
    if any(k in corpus_upper for k in ("GAIN-OF-FUNCTION", "GAIN OF FUNCTION", "TOXIC", "AGGREGAT", "MISFOLD")):
        return "gain_of_function", "Toxic gain-of-function product"
    if any(k in corpus_upper for k in ("MISSENSE", "POINT MUTATION", "SUBSTITUTION")):
        return "loss_of_function", "Pathogenic missense reducing protein function"
    if any(k in corpus_upper for k in ("LOSS-OF-FUNCTION", "LOSS OF FUNCTION", "NULL", "DEFICIENC", "FRAMESHIFT")):
        return "loss_of_function", "Loss-of-function (reduced/absent functional protein)"
    return meta["default_mechanism"], meta["default_consequence"]


def _find_variant(corpus: str, gene: str) -> str | None:
    """Best-effort variant extraction near the gene (HGVS-ish tokens)."""
    patterns = [
        rf"{gene}[^.\n]{{0,80}}?(c\.[\w>+\-*]+)",
        rf"{gene}[^.\n]{{0,80}}?(p\.[A-Za-z0-9*]+)",
        rf"{gene}[^.\n]{{0,60}}?(rs\d+)",
    ]
    for pat in patterns:
        m = re.search(pat, corpus, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _extract_target(results: list[dict], hint: str | None) -> dict:
    corpus = _corpus(results)
    corpus_upper = corpus.upper()
    gene = _detect_gene(corpus_upper, hint)

    if not gene:
        return {
            "identified": False,
            "summary": (
                "No monogenic (single-gene) disease-causing variant was found in this patient's "
                "graph. "
                + (
                    "The graph describes pharmacogenomic (drug-metabolism) findings, which are "
                    "handled on the Formulation tab, not by an n-of-1 custom therapeutic."
                    if _has_pgx_only_signal(corpus_upper)
                    else "Ingest genomic data describing a disease-causing variant to design an "
                    "individualized therapy."
                )
            ),
        }

    meta = mod.MONOGENIC_TARGETS[gene]
    mechanism, consequence = _infer_mechanism(corpus_upper, meta)
    variant = _find_variant(corpus, gene)
    grounded = gene in corpus_upper or any(t in corpus_upper for t in meta["disease_tokens"])

    return {
        "identified": True,
        "gene": gene,
        "variant": variant,
        "consequence": consequence,
        "mechanism": mechanism,
        "inheritance": meta["inheritance"],
        "tissue": meta["tissue"],
        "disease": meta["disease"],
        "summary": (
            f"{gene} — {meta['disease']}. "
            f"{consequence}. Mechanism: {mechanism.replace('_', ' ')}; "
            f"{meta['inheritance'].lower()}; primary tissue: {meta['tissue']}."
        ),
        "_grounded": grounded,
    }


def _build_construct(modality_id: str, target: dict) -> list[dict]:
    """Modality-specific, clearly-illustrative construct scaffold."""
    gene = target.get("gene") or "TARGET"
    tissue = target.get("tissue") or "target tissue"
    m = mod.MODALITY_LIBRARY[modality_id]
    blocks: list[dict] = [
        {"label": "Modality", "value": m["name"], "note": m["modality_class"]},
        {"label": "Chemistry / format", "value": m["chemistry"], "note": None},
        {"label": "Size", "value": m["typical_length"], "note": None},
    ]

    if modality_id in ("ASO_SPLICE", "ASO_GAPMER"):
        seq = _illustrative_sequence(gene + modality_id, _BASES, 20)
        action = "mask the aberrant splice site" if modality_id == "ASO_SPLICE" else "recruit RNase-H1 to cleave the transcript"
        blocks += [
            {"label": "Target region", "value": f"{gene} pre-mRNA ({tissue})",
             "note": f"Antisense complementary to {action}."},
            {"label": "Illustrative antisense (5'→3')", "value": seq,
             "note": "PLACEHOLDER — not a designed sequence. Real design needs genome-wide off-target screening (§19.8)."},
        ]
    elif modality_id == "SIRNA":
        guide = _illustrative_sequence(gene + "GUIDE", _BASES, 21)
        blocks += [
            {"label": "Target transcript", "value": f"{gene} mRNA",
             "note": "Guide (antisense) strand loads RISC for catalytic knockdown."},
            {"label": "Illustrative guide strand (5'→3')", "value": guide,
             "note": "PLACEHOLDER — seed-region + off-target optimization required (§19.8)."},
            {"label": "Conjugate", "value": "Triantennary GalNAc (ASGPR-mediated hepatocyte uptake)", "note": None},
        ]
    elif modality_id == "MRNA_LNP":
        blocks += [
            {"label": "ORF", "value": f"Codon-optimized {gene} coding sequence",
             "note": "Supplies the functional protein the patient cannot make."},
            {"label": "Cap / UTRs / tail", "value": "Cap1 · optimized 5'UTR · ORF · optimized 3'UTR · poly(A)", "note": None},
            {"label": "Nucleoside modification", "value": "N1-methylpseudouridine (reduced innate immunogenicity)", "note": None},
        ]
    elif modality_id == "AAV_GENE_ADDITION":
        blocks += [
            {"label": "Transgene cassette", "value": f"Promoter · codon-optimized {gene} · polyA",
             "note": "Must fit the ~4.7 kb AAV packaging limit."},
            {"label": "Capsid", "value": "Tissue-tropic AAV serotype (selected in delivery)", "note": None},
        ]
    elif modality_id in ("BASE_EDITOR", "PRIME_EDITOR"):
        spacer = _illustrative_sequence(gene + "SPACER", _DNA, 20)
        editor = "Adenine/Cytosine base editor (ABE/CBE)" if modality_id == "BASE_EDITOR" else "Prime editor (nCas9–RT)"
        guide_kind = "sgRNA spacer" if modality_id == "BASE_EDITOR" else "pegRNA spacer"
        blocks += [
            {"label": "Editor", "value": editor, "note": "Delivered transiently as mRNA."},
            {"label": f"Illustrative {guide_kind} (5'→3')", "value": spacer,
             "note": "PLACEHOLDER — PAM selection, edit-window and off-target nomination required (§19.8)."},
            {"label": "Edit", "value": f"Correct the pathogenic {gene} variant"
             + (f" ({target['variant']})" if target.get("variant") else ""),
             "note": "Precise correction within the edit window; verify by amplicon sequencing."},
        ]
    return blocks


def _safety_items(modality_id: str) -> list[dict]:
    return [
        {"risk": risk, "severity": severity, "mitigation": mitigation}
        for (risk, severity, mitigation) in mod.MODALITY_LIBRARY[modality_id]["safety"]
    ]


def _manufacturing_steps(modality_id: str) -> list[str]:
    common_tail = [
        "GMP manufacture of a single-patient lot at a specialized CDMO.",
        "Release testing: identity, purity, potency, endotoxin, sterility.",
        "IND-enabling package + individual-patient IND / expanded-access submission.",
    ]
    head = {
        "ASO_SPLICE": ["Solid-phase oligonucleotide synthesis (2'-MOE phosphorothioate).",
                       "Purification (HPLC), annealing QC, sterile CSF-grade fill-finish."],
        "ASO_GAPMER": ["Solid-phase oligonucleotide synthesis (gapmer chemistry).",
                       "Purification and hepatotoxicity/impurity profiling."],
        "SIRNA": ["Synthesis + annealing of the guide/passenger duplex; GalNAc conjugation.",
                  "Duplex QC and impurity profiling."],
        "MRNA_LNP": ["In-vitro transcription of nucleoside-modified mRNA; dsRNA removal.",
                     "LNP formulation and encapsulation-efficiency QC."],
        "AAV_GENE_ADDITION": ["Plasmid + AAV production (triple transfection or producer line).",
                              "Capsid/genome-titer QC; empty-capsid removal."],
        "BASE_EDITOR": ["Manufacture editor mRNA + synthetic guide RNA; LNP co-formulation.",
                        "On-/off-target editing characterization in relevant cells."],
        "PRIME_EDITOR": ["Manufacture prime-editor mRNA + pegRNA; LNP co-formulation.",
                         "Editing efficiency/precision characterization."],
    }.get(modality_id, [])
    return head + common_tail


def _regulatory(target: dict, modality_id: str) -> tuple[str, list[dict], str]:
    framework = "FDA Plausible Mechanism Framework (draft guidance, Feb 2026 — Docket FDA-2026-D-1256)"
    gene = target.get("gene") or "the target gene"
    mechanism = (target.get("mechanism") or "").replace("_", " ")
    criteria = [
        {
            "criterion": "1. Identify the disease-causing abnormality",
            "status": "addressed" if target.get("variant") else "partial",
            "detail": (
                f"{gene} variant "
                + (f"({target['variant']}) " if target.get("variant") else "(specific variant to be confirmed by ClinVar/gnomAD/VEP) ")
                + "linked to the patient's phenotype in the knowledge graph."
            ),
        },
        {
            "criterion": "2. Therapy targets the root cause / proximate pathway",
            "status": "addressed",
            "detail": f"The chosen {mod.MODALITY_LIBRARY[modality_id]['modality_class'].lower()} acts directly on the {mechanism} mechanism.",
        },
        {
            "criterion": "3. Well-characterized natural-history data",
            "status": "pending",
            "detail": f"Assemble natural-history data for {target.get('disease') or 'the disorder'} to serve as the efficacy comparator.",
        },
        {
            "criterion": "4. Confirm target engagement / successful editing",
            "status": "pending",
            "detail": "Define the biomarker of target engagement (e.g. corrected splicing, restored enzyme activity, on-target edit fraction).",
        },
        {
            "criterion": "5. Clinical or validated-biomarker outcome",
            "status": "pending",
            "detail": "Pre-specify the clinical endpoint or a biomarker established to predict clinical benefit.",
        },
    ]
    precedent = mod.MODALITY_LIBRARY[modality_id]["precedent"]
    return framework, criteria, precedent


def _no_target_result(patient_id: str, goal: str, target: dict) -> dict:
    return {
        "patient_id": patient_id,
        "design_id": f"nof1_{uuid.uuid4().hex[:8]}",
        "goal": goal,
        "target": target,
        "modality_id": None,
        "modality_name": None,
        "modality_class": None,
        "modality_rationale": None,
        "alternatives_considered": [],
        "construct_blocks": [],
        "delivery_vector": None,
        "delivery_route": None,
        "delivery_rationale": None,
        "reasoning": [
            {
                "step": 1,
                "title": "Analyze the patient's molecular profile",
                "detail": "Queried the patient's Cognee graph for a monogenic disease-causing variant.",
                "grounded": True,
            },
            {
                "step": 2,
                "title": "No n-of-1 target identified",
                "detail": target["summary"],
                "grounded": True,
            },
        ],
        "safety": [],
        "manufacturing": [],
        "regulatory_framework": None,
        "regulatory_criteria": [],
        "precedent": None,
        "confidence": "no_target",
        "disclaimers": [
            "No individualized therapeutic was designed because no single-gene target was found.",
            "This does not mean the patient has no actionable findings — see the Formulation tab for "
            "pharmacogenomic, drug-based recommendations.",
        ],
        "generated_at": datetime.now(timezone.utc),
    }


async def design_custom_therapy(
    patient_id: str,
    goal: str,
    *,
    target_hint: str | None = None,
    preferred_modality: str | None = None,
) -> dict:
    results = await _recall_target(patient_id, goal)
    grounded_recall = bool(results)
    target = _extract_target(results, target_hint)

    if not target.get("identified"):
        return _no_target_result(patient_id, goal, target)

    target_grounded = bool(target.pop("_grounded", False)) and grounded_recall

    modality_id, modality_rationale, alternatives = mod.select_modality(
        target.get("mechanism"),
        target.get("consequence"),
        target.get("tissue"),
        preferred=preferred_modality,
    )
    m = mod.MODALITY_LIBRARY[modality_id]

    delivery_id = mod.select_delivery(modality_id, target.get("tissue"))
    delivery = mod.DELIVERY_VECTORS[delivery_id]

    construct = _build_construct(modality_id, target)
    safety = _safety_items(modality_id)
    manufacturing = _manufacturing_steps(modality_id)
    framework, criteria, precedent = _regulatory(target, modality_id)

    reasoning = [
        {
            "step": 1,
            "title": "Analyze the patient's molecular profile",
            "detail": (
                "Recalled the patient's genomic graph and identified "
                f"{target['gene']} ({target.get('disease')}) as the disease driver."
            ),
            "grounded": target_grounded,
        },
        {
            "step": 2,
            "title": "Characterize the target",
            "detail": (
                f"Consequence: {target.get('consequence')}. Mechanism: "
                f"{(target.get('mechanism') or '').replace('_', ' ')}. Affected tissue: "
                f"{target.get('tissue')}."
            ),
            "grounded": target_grounded,
        },
        {
            "step": 3,
            "title": "Select the therapeutic modality",
            "detail": f"{m['name']} — {modality_rationale}",
            "grounded": False,
        },
        {
            "step": 4,
            "title": "Scaffold the construct",
            "detail": f"{m['chemistry']} ({m['typical_length']}). {m['mechanism']}",
            "grounded": False,
        },
        {
            "step": 5,
            "title": "Choose a delivery vector",
            "detail": f"{delivery['name']} via {delivery['route']} — {delivery['rationale']}",
            "grounded": False,
        },
        {
            "step": 6,
            "title": "Assess safety & off-target risk",
            "detail": (
                f"{len(safety)} modality-specific risks enumerated; the dominant concern is "
                f"{safety[0]['risk'].lower()}." if safety else "No safety profile available."
            ),
            "grounded": False,
        },
        {
            "step": 7,
            "title": "Map manufacturing & regulatory path",
            "detail": (
                f"Single-patient GMP lot; regulatory route via the {framework.split('(')[0].strip()}. "
                f"Precedent: {precedent}"
            ),
            "grounded": False,
        },
    ]

    disclaimers = [
        "Research prototype — not a validated therapeutic and not for clinical use.",
        "Construct sequences are illustrative placeholders, NOT designed or orderable sequences.",
        "Real n-of-1 design requires variant confirmation (ClinVar/gnomAD/VEP), genome-wide "
        "off-target screening, structure/immunogenicity prediction, and expert review (see §19.8).",
    ]

    return {
        "patient_id": patient_id,
        "design_id": f"nof1_{uuid.uuid4().hex[:8]}",
        "goal": goal,
        "target": target,
        "modality_id": modality_id,
        "modality_name": m["name"],
        "modality_class": m["modality_class"],
        "modality_rationale": modality_rationale,
        "alternatives_considered": alternatives,
        "construct_blocks": construct,
        "delivery_vector": delivery["name"],
        "delivery_route": delivery["route"],
        "delivery_rationale": delivery["rationale"],
        "reasoning": reasoning,
        "safety": safety,
        "manufacturing": manufacturing,
        "regulatory_framework": framework,
        "regulatory_criteria": criteria,
        "precedent": precedent,
        "confidence": "illustrative",
        "disclaimers": disclaimers,
        "generated_at": datetime.now(timezone.utc),
    }
