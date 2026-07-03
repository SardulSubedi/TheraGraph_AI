BLOCK_LIBRARY = {
    "MOD_ALPHA_BASE": {
        "name": "Non-opioid analgesic base",
        "total_dose_mg": 450,
        "pathway": "COX-independent central analgesia",
    },
    "MOD_BETA_ADJUVANT": {
        "name": "Anti-inflammatory adjuvant",
        "total_dose_mg": 450,
        "pathway": "cytokine modulation",
    },
    "MOD_GAMMA_IMMUNO": {
        "name": "Immunomodulator core",
        "total_dose_mg": 50,
        "pathway": "thiopurine-class",
    },
    "MOD_DELTA_ANTICOAG": {
        "name": "Vitamin-K antagonist core",
        "total_dose_mg": 5,
        "pathway": "VKORC1",
    },
    "MOD_EPSILON_GI": {
        "name": "GI-protective adjuvant",
        "total_dose_mg": 20,
        "pathway": "acid suppression",
    },
}

CONTRA_RULES = [
    {
        "trigger": ["CYP2D6", "Poor Metabolizer"],
        "avoid_drugs": ["CODEINE", "TRAMADOL"],
        "avoid_blocks": [],
    },
    {
        "trigger": ["TPMT", "Poor Metabolizer"],
        "avoid_drugs": ["STANDARD_THIOPURINE_DOSE"],
        "dose_limit_blocks": {"MOD_GAMMA_IMMUNO": 0.1},
    },
    {
        "trigger": ["CYP2C9", "Poor Metabolizer"],
        "avoid_drugs": ["STANDARD_WARFARIN_DOSE"],
        "dose_limit_blocks": {"MOD_DELTA_ANTICOAG": 0.35},
    },
    {
        "trigger": ["sulfonamides"],
        "avoid_drugs": ["SULFONAMIDES"],
        "avoid_blocks": [],
    },
]


async def contraindicated_blocks(patient_id: str, recall_results: list[dict]) -> set[str]:
    """Deterministic: scan recalled text for trigger tokens -> banned drugs/blocks."""
    del patient_id  # reserved for future per-patient rule extensions
    corpus = " ".join(r.get("text", "") for r in recall_results).upper()
    banned: set[str] = set()
    for rule in CONTRA_RULES:
        if all(tok.upper() in corpus for tok in rule["trigger"]):
            banned.update(rule.get("avoid_drugs", []))
            banned.update(rule.get("avoid_blocks", []))
    return banned


def rule_based_formulation(indication: str, banned: set[str]) -> dict:
    """Fallback composition if the LLM path fails. Maps indication -> sensible blocks."""
    ind = indication.lower()
    if "inflam" in ind or "pain" in ind:
        modules = [
            {"component_id": "MOD_ALPHA_BASE", "ratio": 0.75},
            {"component_id": "MOD_BETA_ADJUVANT", "ratio": 0.25},
        ]
    elif "immun" in ind or "ibd" in ind or "autoimmune" in ind:
        modules = [
            {"component_id": "MOD_GAMMA_IMMUNO", "ratio": 0.8},
            {"component_id": "MOD_EPSILON_GI", "ratio": 0.2},
        ]
    elif "anticoag" in ind or "fib" in ind:
        modules = [{"component_id": "MOD_DELTA_ANTICOAG", "ratio": 1.0}]
    else:
        modules = [{"component_id": "MOD_ALPHA_BASE", "ratio": 1.0}]
    return {
        "indication": indication,
        "modules": modules,
        "contraindications_flagged": sorted(banned),
        "rationale": "Rule-based composition (LLM path unavailable).",
    }
