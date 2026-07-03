"""Pre-approved active-ingredient library + deterministic pharmacogenomic safety rules.

This is the clinical "source of truth" for formulation. Every entry is a real, recognizable
generic drug with a concrete strength, dosage form, route, and standard sig so the generated
output reads like an actual medication regimen — named active ingredients with exact milligram
amounts, not abstract "roles" and bare percentages.

PROTOTYPE / DEMO ONLY — the doses and rules below are a coherent teaching model, not validated
clinical decision support. Never use for real prescribing.
"""

from __future__ import annotations

import re

# --------------------------------------------------------------------------------------
# Active pharmaceutical ingredient (API) library.
#
# Each entry is a real generic drug. Fields:
#   name            human generic name
#   brand_examples  familiar brand(s), for recognizability
#   drug_class      pharmacologic class
#   strength_mg     strength of one unit (tablet/capsule)
#   form            dosage form
#   route           route of administration
#   frequency       human dosing interval
#   doses_per_day   administrations per day (for daily-dose math; 0 => see sig, e.g. PRN/weekly)
#   default_daily_mg  standard total daily dose used as the starting point
#   max_daily_mg    ceiling
#   mechanism       one-line mechanism of action
#   pathway         metabolic / target pathway (ties to the graph)
#   role            base | adjuvant | protectant | core   (how it composes a regimen)
#   monitoring      key monitoring parameter for this drug
# --------------------------------------------------------------------------------------
BLOCK_LIBRARY: dict[str, dict] = {
    "ACETAMINOPHEN": {
        "name": "Acetaminophen",
        "brand_examples": "Tylenol",
        "drug_class": "Non-opioid analgesic / antipyretic",
        "strength_mg": 500,
        "form": "Tablet",
        "route": "Oral (PO)",
        "frequency": "Every 8 hours as needed",
        "doses_per_day": 3,
        "default_daily_mg": 1500,
        "max_daily_mg": 3000,
        "mechanism": "Central, COX-independent analgesia; requires no CYP2D6 prodrug activation.",
        "pathway": "Central analgesia",
        "role": "base",
        "monitoring": "Hepatic function; keep total acetaminophen from all sources < 3 g/day.",
    },
    "NAPROXEN": {
        "name": "Naproxen",
        "brand_examples": "Aleve, Naprosyn",
        "drug_class": "NSAID (non-selective COX inhibitor)",
        "strength_mg": 250,
        "form": "Tablet",
        "route": "Oral (PO), with food",
        "frequency": "Every 12 hours with food",
        "doses_per_day": 2,
        "default_daily_mg": 500,
        "max_daily_mg": 1000,
        "mechanism": "Inhibits COX-1/COX-2, lowering prostaglandin-mediated inflammation and pain.",
        "pathway": "COX / prostaglandin",
        "role": "adjuvant",
        "monitoring": "Renal function, blood pressure, GI bleeding signs.",
    },
    "CELECOXIB": {
        "name": "Celecoxib",
        "brand_examples": "Celebrex",
        "drug_class": "NSAID (COX-2 selective, sulfonamide)",
        "strength_mg": 200,
        "form": "Capsule",
        "route": "Oral (PO)",
        "frequency": "Once daily",
        "doses_per_day": 1,
        "default_daily_mg": 200,
        "max_daily_mg": 400,
        "mechanism": "Selective COX-2 inhibition with lower GI risk; contains a sulfonamide moiety.",
        "pathway": "COX-2",
        "role": "adjuvant",
        "monitoring": "Cardiovascular risk, renal function, blood pressure.",
    },
    "DULOXETINE": {
        "name": "Duloxetine",
        "brand_examples": "Cymbalta",
        "drug_class": "SNRI (adjuvant analgesic)",
        "strength_mg": 30,
        "form": "Delayed-release capsule",
        "route": "Oral (PO)",
        "frequency": "Once daily",
        "doses_per_day": 1,
        "default_daily_mg": 30,
        "max_daily_mg": 60,
        "mechanism": "Serotonin–norepinephrine reuptake inhibition; central modulation of chronic pain.",
        "pathway": "Descending inhibition (5-HT / NE)",
        "role": "adjuvant",
        "monitoring": "Mood, blood pressure. Active drug (not a prodrug) — effective in CYP2D6 PM.",
    },
    "PANTOPRAZOLE": {
        "name": "Pantoprazole",
        "brand_examples": "Protonix",
        "drug_class": "Proton-pump inhibitor (PPI)",
        "strength_mg": 20,
        "form": "Delayed-release tablet",
        "route": "Oral (PO)",
        "frequency": "Once daily before breakfast",
        "doses_per_day": 1,
        "default_daily_mg": 20,
        "max_daily_mg": 40,
        "mechanism": "Irreversibly inhibits gastric H+/K+ ATPase — gastroprotection during NSAID therapy.",
        "pathway": "Gastric acid suppression",
        "role": "protectant",
        "monitoring": "Reassess need periodically; long-term Mg2+ and B12.",
    },
    "AZATHIOPRINE": {
        "name": "Azathioprine",
        "brand_examples": "Imuran",
        "drug_class": "Thiopurine immunosuppressant",
        "strength_mg": 50,
        "form": "Tablet",
        "route": "Oral (PO)",
        "frequency": "Once daily",
        "doses_per_day": 1,
        "default_daily_mg": 100,
        "max_daily_mg": 150,
        "mechanism": "Purine antimetabolite; converted to 6-thioguanine — TPMT activity governs toxicity.",
        "pathway": "Thiopurine / purine synthesis",
        "role": "core",
        "monitoring": "CBC weekly ×4 then periodically, LFTs; confirm TPMT / NUDT15 status.",
    },
    "WARFARIN": {
        "name": "Warfarin",
        "brand_examples": "Coumadin",
        "drug_class": "Vitamin-K antagonist anticoagulant",
        "strength_mg": 5,
        "form": "Tablet (scored)",
        "route": "Oral (PO)",
        "frequency": "Once daily in the evening, INR-guided",
        "doses_per_day": 1,
        "default_daily_mg": 5,
        "max_daily_mg": 10,
        "mechanism": "Inhibits vitamin-K epoxide reductase (VKORC1); cleared by CYP2C9 — genotype lowers dose.",
        "pathway": "VKORC1 / CYP2C9",
        "role": "core",
        "monitoring": "INR (target 2–3), bleeding signs; genotype-guided starting dose.",
    },
    "APIXABAN": {
        "name": "Apixaban",
        "brand_examples": "Eliquis",
        "drug_class": "Direct oral anticoagulant (factor Xa inhibitor)",
        "strength_mg": 5,
        "form": "Tablet",
        "route": "Oral (PO)",
        "frequency": "Twice daily",
        "doses_per_day": 2,
        "default_daily_mg": 10,
        "max_daily_mg": 10,
        "mechanism": "Direct factor Xa inhibition; fixed dosing, no INR monitoring, no VKORC1/CYP2C9 dependence.",
        "pathway": "Factor Xa",
        "role": "core",
        "monitoring": "Renal function, bleeding signs.",
    },
}


# --------------------------------------------------------------------------------------
# Pharmacogenomic / allergy rules.
#
# Each rule:
#   trigger        ALL tokens must appear in the recalled corpus for the rule to fire
#   gene           marker name (for structured genetic-risk display)
#   phenotype      phenotype label
#   implication    plain-language clinical consequence
#   severity       high | moderate | info
#   avoid_drugs    real drug names to flag as contraindicated (displayed, excluded if present)
#   avoid_blocks   library component_ids to hard-exclude from the regimen
#   dose_limit_blocks  {component_id: fraction-of-standard-dose}  (reduce, don't exclude)
#   alternative    optional safer alternative to suggest
# --------------------------------------------------------------------------------------
CONTRA_RULES: list[dict] = [
    {
        "trigger": ["CYP2D6", "Poor Metabolizer"],
        "gene": "CYP2D6",
        "phenotype": "Poor metabolizer",
        "implication": (
            "Cannot convert prodrug opioids (codeine, tramadol) to their active form — no "
            "analgesia plus accumulation of the parent drug and its side effects."
        ),
        "severity": "high",
        "avoid_drugs": ["Codeine", "Tramadol"],
        "avoid_blocks": [],
        "alternative": "Use non-prodrug analgesics (acetaminophen, an NSAID, or duloxetine).",
    },
    {
        "trigger": ["sulfonamide"],
        "gene": "Allergy",
        "phenotype": "Sulfonamide hypersensitivity",
        "implication": "Sulfonamide cross-reactivity — exclude sulfonamide-containing agents such as celecoxib.",
        "severity": "high",
        "avoid_drugs": ["Sulfamethoxazole"],
        "avoid_blocks": ["CELECOXIB"],
        "alternative": "Use a non-sulfonamide NSAID (naproxen) for the anti-inflammatory component.",
    },
    {
        "trigger": ["TPMT", "Poor Metabolizer"],
        "gene": "TPMT",
        "phenotype": "Poor metabolizer (low activity)",
        "implication": (
            "Thiopurine metabolites accumulate to toxic levels — risk of severe myelosuppression "
            "at standard doses. Requires drastic dose reduction."
        ),
        "severity": "high",
        "avoid_drugs": [],
        "dose_limit_blocks": {"AZATHIOPRINE": 0.1},
        "alternative": "Start azathioprine at ~10% of standard with close CBC monitoring.",
    },
    {
        "trigger": ["CYP2C9", "Poor Metabolizer"],
        "gene": "CYP2C9",
        "phenotype": "Poor metabolizer",
        "implication": (
            "Reduced warfarin clearance (often with VKORC1 sensitivity) markedly lowers the dose "
            "requirement — bleeding risk at a standard starting dose."
        ),
        "severity": "high",
        "avoid_drugs": [],
        "dose_limit_blocks": {"WARFARIN": 0.35},
        "alternative": "Consider a direct oral anticoagulant (apixaban), which is not CYP2C9/VKORC1-dose-dependent.",
    },
]


def block_meta(component_id: str) -> dict:
    """Return the library entry for a component (empty dict if unknown)."""
    return BLOCK_LIBRARY.get(component_id, {})


def _corpus(recall_results: list[dict]) -> str:
    return " ".join(r.get("text", "") for r in recall_results)


def matched_rules(recall_results: list[dict]) -> list[dict]:
    """Rules whose trigger tokens are all present in the recalled corpus."""
    corpus = _corpus(recall_results).upper()
    return [
        rule
        for rule in CONTRA_RULES
        if all(tok.upper() in corpus for tok in rule["trigger"])
    ]


def banned_blocks(recall_results: list[dict]) -> set[str]:
    """Library component_ids that must be hard-excluded from the regimen."""
    banned: set[str] = set()
    for rule in matched_rules(recall_results):
        banned.update(rule.get("avoid_blocks", []))
    return banned


def flagged_contraindications(recall_results: list[dict]) -> list[dict]:
    """Named drugs flagged as contraindicated, with reason + severity (deduplicated)."""
    out: dict[str, dict] = {}
    for rule in matched_rules(recall_results):
        for drug in rule.get("avoid_drugs", []):
            if drug not in out:
                out[drug] = {
                    "drug": drug,
                    "reason": rule["implication"],
                    "severity": rule.get("severity", "high"),
                }
    return list(out.values())


def dose_limits(recall_results: list[dict]) -> dict[str, float]:
    """Max fraction-of-standard dose per component, driven by pharmacogenomics."""
    limits: dict[str, float] = {}
    for rule in matched_rules(recall_results):
        for block, ceiling in rule.get("dose_limit_blocks", {}).items():
            limits[block] = min(ceiling, limits.get(block, 1.0))
    return limits


_DIPLOTYPE_RE = r"(\*\d+[A-Z]?\s*/\s*\*\d+[A-Z]?|rs\d+\s*=\s*[A-Z]{1,2})"


def _find_genotype(corpus: str, gene: str) -> str | None:
    """Best-effort: pull a diplotype/genotype token appearing near the gene name."""
    if gene in ("Allergy",):
        return None
    m = re.search(gene + r"[^\n]{0,60}?" + _DIPLOTYPE_RE, corpus, re.IGNORECASE)
    if m:
        return re.sub(r"\s+", "", m.group(1)).replace("=", " ")
    return None


def genetic_risks(recall_results: list[dict]) -> list[dict]:
    """Structured pharmacogenomic findings for the 'Genetic Risks' panel."""
    corpus = _corpus(recall_results)
    findings: list[dict] = []
    for rule in matched_rules(recall_results):
        affected = list(rule.get("avoid_drugs", []))
        affected += [
            BLOCK_LIBRARY[b]["name"]
            for b in rule.get("avoid_blocks", [])
            if b in BLOCK_LIBRARY
        ]
        affected += [
            BLOCK_LIBRARY[b]["name"]
            for b in rule.get("dose_limit_blocks", {})
            if b in BLOCK_LIBRARY
        ]
        findings.append(
            {
                "gene": rule["gene"],
                "genotype": _find_genotype(corpus, rule["gene"]),
                "phenotype": rule["phenotype"],
                "implication": rule["implication"],
                "severity": rule.get("severity", "info"),
                "affected": affected,
                "recommendation": rule.get("alternative"),
            }
        )
    return findings


# --------------------------------------------------------------------------------------
# Deterministic regimen composition.
# --------------------------------------------------------------------------------------
def _round_to(value: float, step: float) -> float:
    return round(round(value / step) * step, 2)


def _pick_ids(indication: str, banned: set[str]) -> list[str]:
    """Map an indication to a real, ordered set of component_ids (respecting exclusions)."""
    ind = indication.lower()

    if any(k in ind for k in ("inflam", "pain", "arthrit", "rheumat", "joint")):
        chosen = ["ACETAMINOPHEN"]
        # Prefer COX-2 selective (celecoxib) unless excluded (e.g. sulfa allergy) -> naproxen.
        chosen.append("NAPROXEN" if "CELECOXIB" in banned else "CELECOXIB")
        if "chronic" in ind:
            chosen.append("DULOXETINE")
        chosen.append("PANTOPRAZOLE")
        return chosen

    if any(k in ind for k in ("immun", "ibd", "autoimmune", "crohn", "colitis", "inflammatory bowel")):
        return ["AZATHIOPRINE", "PANTOPRAZOLE"]

    if any(k in ind for k in ("anticoag", "fib", "clot", "thromb", "stroke prevention")):
        return ["WARFARIN"]

    return ["ACETAMINOPHEN"]


def build_module(component_id: str, dose_fraction: float | None = None) -> dict:
    """Turn a library entry into a fully-dosed regimen line item (real mg, form, sig)."""
    meta = BLOCK_LIBRARY[component_id]
    strength = float(meta["strength_mg"])
    doses_per_day = int(meta.get("doses_per_day", 1)) or 1
    default_daily = float(meta["default_daily_mg"])

    dose_note: str | None = None
    if dose_fraction is not None and dose_fraction < 1.0:
        step = 5.0 if default_daily >= 25 else 0.5
        target_daily = max(_round_to(default_daily * dose_fraction, step), step)
        daily = target_daily
        dose_note = (
            f"Dose reduced to ~{int(dose_fraction * 100)}% of standard "
            f"({int(default_daily)} mg/day) for this patient's metabolism."
        )
    else:
        daily = default_daily

    per_dose = round(daily / doses_per_day, 2)

    # Express the dose as whole/half units of the available strength when it divides cleanly,
    # otherwise fall back to a plain milligram instruction (avoids nonsense like "0 tablets").
    units_val: float | None = None
    dose_desc = f"{per_dose:g} mg"
    if strength:
        raw_units = per_dose / strength
        half_units = round(raw_units * 2) / 2
        if half_units >= 0.5 and abs(raw_units - half_units) < 0.06:
            units_val = half_units
            form_l = meta["form"].lower()
            plural = "s" if half_units != 1 and "(" not in form_l else ""
            dose_desc = f"{per_dose:g} mg ({half_units:g} {form_l}{plural})"

    name = meta["name"]
    freq_txt = meta["frequency"][:1].lower() + meta["frequency"][1:]
    sig = f"Take {dose_desc} by mouth {freq_txt}"

    return {
        "component_id": component_id,
        "ingredient": name,
        "name": name,
        "brand_examples": meta.get("brand_examples"),
        "drug_class": meta.get("drug_class"),
        "strength_mg": strength,
        "form": meta["form"],
        "route": meta["route"],
        "frequency": meta["frequency"],
        "doses_per_day": doses_per_day,
        "dose_mg": per_dose,
        "daily_dose_mg": round(daily, 2),
        "max_daily_mg": meta.get("max_daily_mg"),
        "units_per_dose": units_val,
        "sig": sig,
        "dose_note": dose_note,
        "mechanism": meta.get("mechanism"),
        "pathway": meta.get("pathway"),
        "role": meta.get("role"),
        # mass_mg / ratio drive the composition donut (relative active mass per dose).
        "mass_mg": per_dose,
        "ratio": 0.0,
    }


def monitoring_plan(component_ids: list[str], rules: list[dict]) -> list[str]:
    """Assemble a de-duplicated monitoring list from chosen drugs + fired rules."""
    plan: list[str] = []
    for cid in component_ids:
        note = BLOCK_LIBRARY.get(cid, {}).get("monitoring")
        if note and note not in plan:
            plan.append(note)
    for rule in rules:
        alt = rule.get("alternative")
        if alt and alt not in plan:
            plan.append(alt)
    return plan


# Backwards-compatible aliases (older call sites) -------------------------------------
async def contraindicated_blocks(patient_id: str, recall_results: list[dict]) -> set[str]:
    del patient_id
    return banned_blocks(recall_results)


def rule_based_formulation(indication: str, banned: set[str]) -> dict:
    ids = _pick_ids(indication, banned)
    return {
        "indication": indication,
        "modules": [{"component_id": cid, "ratio": 0.0} for cid in ids],
    }
