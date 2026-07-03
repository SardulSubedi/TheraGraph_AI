BLOCK_LIBRARY = {
    "MOD_ALPHA_BASE": {
        "name": "Non-opioid analgesic base",
        "total_dose_mg": 450,
        "pathway": "COX-independent central analgesia",
        "drug_class": "Central analgesic",
        "route": "Oral, modified-release",
        "mechanism": "Descending inhibitory pathway modulation without CYP2D6 prodrug activation.",
    },
    "MOD_BETA_ADJUVANT": {
        "name": "Anti-inflammatory adjuvant",
        "total_dose_mg": 450,
        "pathway": "cytokine modulation",
        "drug_class": "Immunologic adjuvant",
        "route": "Oral, modified-release",
        "mechanism": "Down-regulates pro-inflammatory cytokine cascade (TNF-α / IL-6).",
    },
    "MOD_GAMMA_IMMUNO": {
        "name": "Immunomodulator core",
        "total_dose_mg": 50,
        "pathway": "thiopurine-class",
        "drug_class": "Thiopurine immunomodulator",
        "route": "Oral",
        "mechanism": "Purine antimetabolite; dose is TPMT-activity dependent.",
    },
    "MOD_DELTA_ANTICOAG": {
        "name": "Vitamin-K antagonist core",
        "total_dose_mg": 5,
        "pathway": "VKORC1",
        "drug_class": "Anticoagulant",
        "route": "Oral",
        "mechanism": "Inhibits vitamin-K epoxide reductase; dose sensitive to CYP2C9/VKORC1.",
    },
    "MOD_EPSILON_GI": {
        "name": "GI-protective adjuvant",
        "total_dose_mg": 20,
        "pathway": "acid suppression",
        "drug_class": "Proton-pump inhibitor",
        "route": "Oral",
        "mechanism": "Reduces gastric acid to protect against mucosal injury from the active mix.",
    },
}

# Gene/phenotype -> drugs/blocks to avoid, plus dose ceilings for blocks that
# are still usable but must be reduced for the patient's metabolism.
CONTRA_RULES = [
    {
        "trigger": ["CYP2D6", "Poor Metabolizer"],
        "avoid_drugs": ["CODEINE", "TRAMADOL"],
        "avoid_blocks": [],
        "reason": "CYP2D6 poor metabolizers cannot convert codeine/tramadol prodrugs to their active form — no analgesia plus toxic parent-drug accumulation.",
    },
    {
        "trigger": ["TPMT", "Poor Metabolizer"],
        "avoid_drugs": ["STANDARD_THIOPURINE_DOSE"],
        "dose_limit_blocks": {"MOD_GAMMA_IMMUNO": 0.1},
        "reason": "TPMT deficiency causes toxic thiopurine metabolite accumulation — cap the immunomodulator at ~10% of standard.",
    },
    {
        "trigger": ["CYP2C9", "Poor Metabolizer"],
        "avoid_drugs": ["STANDARD_WARFARIN_DOSE"],
        "dose_limit_blocks": {"MOD_DELTA_ANTICOAG": 0.35},
        "reason": "CYP2C9 poor metabolizer / VKORC1 sensitivity markedly lowers the warfarin dose requirement — start low to avoid bleeding.",
    },
    {
        "trigger": ["sulfonamides"],
        "avoid_drugs": ["SULFONAMIDES"],
        "avoid_blocks": [],
        "reason": "Documented sulfonamide allergy — exclude sulfonamide-class agents.",
    },
]


def block_meta(component_id: str) -> dict:
    """Return display-friendly metadata for a block (empty dict if unknown)."""
    return BLOCK_LIBRARY.get(component_id, {})


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


def matched_rules(recall_results: list[dict]) -> list[dict]:
    """Return the CONTRA_RULES whose triggers are present in the recalled corpus."""
    corpus = " ".join(r.get("text", "") for r in recall_results).upper()
    return [
        rule
        for rule in CONTRA_RULES
        if all(tok.upper() in corpus for tok in rule["trigger"])
    ]


def dose_limits(recall_results: list[dict]) -> dict[str, float]:
    """Max allowed ratio per block, driven by the patient's pharmacogenomics."""
    limits: dict[str, float] = {}
    for rule in matched_rules(recall_results):
        for block, ceiling in rule.get("dose_limit_blocks", {}).items():
            limits[block] = min(ceiling, limits.get(block, 1.0))
    return limits


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
