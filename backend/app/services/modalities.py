"""n-of-1 therapeutic modality + delivery-vector knowledge base (§19.4).

This is the design "source of truth" for the Custom Therapy agent. Each modality is a real class
of individualized therapeutic (antisense oligonucleotide, siRNA, mRNA, AAV gene transfer, CRISPR
base/prime editing) with realistic engineering parameters and a real clinical precedent.

PROTOTYPE / DEMO ONLY. The parameters below are a coherent teaching model. Nothing here produces
a real, orderable, or validated therapeutic sequence — construct fields are clearly-labelled
*illustrative* scaffolds. See §19.2 honesty guardrails.
"""

from __future__ import annotations

# --------------------------------------------------------------------------------------
# Modality library.
#
# Fields:
#   name             human name of the modality
#   modality_class   short class tag
#   best_for         mechanism keywords this modality addresses (drives selection)
#   chemistry        realistic chemistry / format description
#   typical_length   size descriptor (nt / kb / etc.)
#   mechanism        one-line mechanism of action
#   delivery_default default delivery-vector id (see DELIVERY_VECTORS)
#   safety           list of (risk, severity, mitigation) tuples — modality risk profile
#   precedent        real-world precedent for credibility
#   maturity         where the field is today (honesty)
# --------------------------------------------------------------------------------------
MODALITY_LIBRARY: dict[str, dict] = {
    "ASO_SPLICE": {
        "name": "Splice-switching antisense oligonucleotide",
        "modality_class": "Antisense oligonucleotide (steric-block)",
        "best_for": ["splice", "cryptic exon", "pseudoexon", "exon skipping"],
        "chemistry": "2'-O-methoxyethyl (MOE), full phosphorothioate backbone, steric-block (no RNase-H recruitment)",
        "typical_length": "18–22 nucleotides",
        "mechanism": (
            "Hybridizes to the aberrant splice signal to mask it, redirecting the spliceosome to "
            "restore the normal mRNA reading frame — corrects the defect without editing DNA."
        ),
        "delivery_default": "INTRATHECAL_ASO",
        "safety": [
            ("Sequence-dependent off-target hybridization to partially complementary transcripts", "moderate",
             "Genome-wide complementarity screen (e.g. BLAST) and transcriptome-wide off-target profiling."),
            ("Pro-inflammatory / injection-site and CSF pleocytosis with intrathecal dosing", "moderate",
             "Dose titration, corticosteroid pre-medication protocol, CSF monitoring."),
            ("Transient effect — requires repeat intrathecal dosing", "low",
             "Scheduled re-dosing; monitor durability of splice correction via biomarker."),
        ],
        "precedent": "milasen (Mila, CLN7 Batten disease; Yu et al., NEJM 2019) — an n-of-1 splice ASO.",
        "maturity": "Clinically demonstrated for individual patients under expanded access.",
    },
    "ASO_GAPMER": {
        "name": "RNase-H1 gapmer antisense oligonucleotide",
        "modality_class": "Antisense oligonucleotide (gapmer, knockdown)",
        "best_for": ["gain_of_function", "toxic_gain", "toxic transcript", "dominant-negative", "knockdown"],
        "chemistry": "MOE/LNA wings flanking a DNA gap, phosphorothioate backbone (recruits RNase-H1)",
        "typical_length": "16–20 nucleotides",
        "mechanism": (
            "Recruits RNase-H1 to cleave the target (often mutant) transcript, lowering the toxic "
            "gene product — allele-selective where a variant SNP is available."
        ),
        "delivery_default": "GALNAC",
        "safety": [
            ("Hepatotoxicity / thrombocytopenia (class effect of gapmers)", "high",
             "LFT and platelet monitoring; chemistry optimization; dose limits."),
            ("Off-target RNase-H cleavage of partially matched transcripts", "moderate",
             "Genome-wide off-target screen; allele-selective design against a heterozygous SNP."),
        ],
        "precedent": "Inotersen / other approved gapmer ASOs; n-Lorem individualized knockdown ASOs.",
        "maturity": "Approved products exist for the class; n-of-1 use under individualized INDs.",
    },
    "SIRNA": {
        "name": "GalNAc-conjugated small interfering RNA",
        "modality_class": "RNA interference (siRNA)",
        "best_for": ["gain_of_function", "toxic_gain", "knockdown", "hepatic"],
        "chemistry": "Chemically stabilized double-stranded siRNA, triantennary GalNAc conjugate (hepatocyte uptake)",
        "typical_length": "21–23 bp duplex",
        "mechanism": (
            "Loads RISC to catalytically degrade the target mRNA; durable knockdown with "
            "infrequent subcutaneous dosing when the target tissue is the liver."
        ),
        "delivery_default": "GALNAC",
        "safety": [
            ("Off-target seed-mediated silencing", "moderate",
             "Seed-region optimization and transcriptome-wide off-target screen."),
            ("Injection-site reactions", "low", "Standard subcutaneous administration monitoring."),
            ("Restricted to hepatic targets with GalNAc delivery", "low",
             "Confirm target tissue is liver; otherwise choose an alternate delivery/modality."),
        ],
        "precedent": "Approved GalNAc-siRNAs (e.g. givosiran, inclisiran) for hepatic targets.",
        "maturity": "Mature for liver-expressed targets; extrahepatic delivery still emerging.",
    },
    "MRNA_LNP": {
        "name": "Nucleoside-modified mRNA (lipid nanoparticle)",
        "modality_class": "mRNA replacement",
        "best_for": ["loss_of_function", "enzyme deficiency", "protein replacement", "transient"],
        "chemistry": "N1-methylpseudouridine-modified, codon-optimized ORF; Cap1; optimized 5'/3' UTRs; poly(A) tail; ionizable-lipid LNP",
        "typical_length": "ORF sized to the target protein (~0.5–5 kb)",
        "mechanism": (
            "Delivers a transient template for the functional protein the patient cannot make — "
            "restores enzyme/protein activity without permanent genomic change."
        ),
        "delivery_default": "LNP_LIVER",
        "safety": [
            ("Innate immune activation from RNA/LNP", "moderate",
             "Nucleoside modification, purification (dsRNA removal), dose titration."),
            ("Transient expression — repeat dosing needed", "moderate",
             "Redosing schedule; monitor protein/biomarker levels."),
            ("LNP-associated hepatotoxicity / infusion reactions", "moderate",
             "LFT monitoring, infusion-reaction premedication."),
        ],
        "precedent": "mRNA-LNP platform (COVID-19 vaccines; mRNA enzyme-replacement programs).",
        "maturity": "Platform is mature; in-vivo protein-replacement programs in trials.",
    },
    "AAV_GENE_ADDITION": {
        "name": "AAV gene-addition therapy",
        "modality_class": "Viral gene transfer",
        "best_for": ["loss_of_function", "durable", "monogenic recessive", "small gene"],
        "chemistry": "Recombinant AAV carrying a codon-optimized transgene under a tissue-appropriate promoter",
        "typical_length": "Transgene cassette ≤ ~4.7 kb packaging limit",
        "mechanism": (
            "Delivers a functional copy of the gene as a largely episomal transgene, giving durable "
            "expression from a single dose — best when the coding sequence fits the AAV capacity."
        ),
        "delivery_default": "AAV9_CNS",
        "safety": [
            ("Pre-existing / treatment-induced anti-AAV immunity", "high",
             "Capsid-antibody screening; immunosuppression protocol; single-dose constraint."),
            ("Dose-dependent hepatotoxicity and (rare) thrombotic microangiopathy", "high",
             "Weight-based dosing limits, LFT and complement monitoring."),
            ("Insertional / genotoxicity risk (low but non-zero)", "moderate",
             "Integration-site assessment; long-term follow-up per FDA gene-therapy guidance."),
            ("Packaging limit (~4.7 kb) excludes large genes", "low",
             "Confirm cassette size; use dual-vector or alternate modality if oversized."),
        ],
        "precedent": "Approved AAV gene therapies (e.g. onasemnogene abeparvovec for SMA).",
        "maturity": "Approved for several monogenic diseases; durable single-dose therapy.",
    },
    "BASE_EDITOR": {
        "name": "In-vivo CRISPR base editing",
        "modality_class": "Genome editing (base editor)",
        "best_for": ["point mutation", "transition", "loss_of_function", "correctable snv"],
        "chemistry": "Adenine or cytosine base editor (ABE/CBE) mRNA + guide RNA, LNP-delivered",
        "typical_length": "20-nt spacer guide RNA; editor delivered as mRNA",
        "mechanism": (
            "Makes a precise single-base change (A•T→G•C or C•G→T•A) within the edit window to "
            "correct the pathogenic point mutation — no double-strand break."
        ),
        "delivery_default": "LNP_LIVER",
        "safety": [
            ("Bystander edits of other bases in the edit window", "high",
             "Guide design to isolate the target base; amplicon sequencing of the window."),
            ("Genome-wide off-target editing", "high",
             "Off-target nomination (e.g. Cas-OFFinder) + experimental off-target sequencing."),
            ("Editor immunogenicity (bacterial-derived protein)", "moderate",
             "Transient mRNA delivery; immunogenicity monitoring."),
        ],
        "precedent": "Baby KJ Muldoon (CPS1 deficiency; CHOP/Penn, Feb 2025) — first personalized base-editing therapy.",
        "maturity": "Demonstrated n-of-1 in vivo (2025); rapidly advancing.",
    },
    "PRIME_EDITOR": {
        "name": "In-vivo prime editing",
        "modality_class": "Genome editing (prime editor)",
        "best_for": ["insertion", "deletion", "complex edit", "small indel", "any substitution"],
        "chemistry": "Prime editor (nCas9-RT fusion) mRNA + prime editing guide RNA (pegRNA), LNP-delivered",
        "typical_length": "pegRNA with primer-binding site + reverse-transcription template",
        "mechanism": (
            "Writes the corrected sequence directly via a reverse-transcriptase-templated edit — "
            "handles insertions, deletions and any base change without a double-strand break."
        ),
        "delivery_default": "LNP_LIVER",
        "safety": [
            ("pegRNA design complexity affecting efficiency/precision", "moderate",
             "Systematic pegRNA optimization; deep-sequencing verification."),
            ("Off-target and unintended edits (lower than nucleases, non-zero)", "moderate",
             "Off-target nomination + sequencing; nicking-strategy optimization."),
            ("Editor immunogenicity + delivery to target tissue", "moderate",
             "Transient mRNA delivery; tissue-appropriate LNP/AAV; immune monitoring."),
        ],
        "precedent": "Personalized in-vivo prime-editing platform for urea cycle disorders (CHOP/Penn, 2026).",
        "maturity": "Preclinical→early clinical for individualized use; leading edge.",
    },
}


# --------------------------------------------------------------------------------------
# Delivery vectors.
# --------------------------------------------------------------------------------------
DELIVERY_VECTORS: dict[str, dict] = {
    "INTRATHECAL_ASO": {
        "name": "Intrathecal injection",
        "route": "Intrathecal (into CSF)",
        "target_tissue": "Central nervous system",
        "rationale": "ASOs do not cross the blood–brain barrier; intrathecal delivery reaches CNS neurons directly.",
        "considerations": "Repeat lumbar-puncture dosing; CSF monitoring; pre-medication for inflammation.",
    },
    "GALNAC": {
        "name": "GalNAc conjugate (subcutaneous)",
        "route": "Subcutaneous",
        "target_tissue": "Hepatocytes (liver)",
        "rationale": "Triantennary GalNAc binds ASGPR for efficient, selective hepatocyte uptake.",
        "considerations": "Hepatic targets only; durable knockdown with infrequent dosing.",
    },
    "LNP_LIVER": {
        "name": "Lipid nanoparticle (IV, hepatotropic)",
        "route": "Intravenous infusion",
        "target_tissue": "Liver (default LNP tropism)",
        "rationale": "Ionizable-lipid LNPs accumulate in hepatocytes after IV dosing — ideal for hepatic enzyme defects.",
        "considerations": "Infusion-reaction premedication; LFT monitoring; extrahepatic targeting is harder.",
    },
    "LNP_IV": {
        "name": "Lipid nanoparticle (IV)",
        "route": "Intravenous infusion",
        "target_tissue": "Systemic / liver-predominant",
        "rationale": "Systemic LNP delivery for transient expression; tunable with targeting ligands.",
        "considerations": "Biodistribution favors liver/spleen; targeted LNPs still maturing.",
    },
    "AAV9_CNS": {
        "name": "AAV9 (CNS-tropic)",
        "route": "Intrathecal or intravenous",
        "target_tissue": "CNS + broad somatic",
        "rationale": "AAV9 crosses the blood–brain barrier and transduces neurons — suited to CNS monogenic disease.",
        "considerations": "Anti-AAV9 immunity screening; single-dose; long-term follow-up.",
    },
    "AAV8_LIVER": {
        "name": "AAV8 (liver-tropic)",
        "route": "Intravenous infusion",
        "target_tissue": "Liver",
        "rationale": "AAV8 has strong hepatocyte tropism — suited to liver-expressed monogenic defects.",
        "considerations": "Capsid-antibody screening; dose-dependent hepatotoxicity monitoring.",
    },
}


# --------------------------------------------------------------------------------------
# Monogenic target hints — a tiny curated table that lets the deterministic parser fill a
# structured target when the recalled corpus mentions a known gene/disease. This is NOT a
# comprehensive variant database (see §19.8 — real systems query ClinVar/gnomAD/VEP); it is a
# demo-scale hint set so the agent produces a grounded target for the mock patients.
#
# Keys are uppercase gene symbols. `disease_tokens` help detect the gene from disease prose.
# --------------------------------------------------------------------------------------
MONOGENIC_TARGETS: dict[str, dict] = {
    "MFSD8": {
        "gene": "MFSD8",
        "disease": "Neuronal ceroid lipofuscinosis type 7 (CLN7 Batten disease)",
        "disease_tokens": ["CLN7", "BATTEN", "NEURONAL CEROID", "LIPOFUSCINOSIS"],
        "default_mechanism": "splice",
        "default_consequence": "Deep-intronic variant creating a cryptic pseudoexon (frameshift)",
        "inheritance": "Autosomal recessive",
        "tissue": "Central nervous system",
    },
    "CPS1": {
        "gene": "CPS1",
        "disease": "Carbamoyl phosphate synthetase 1 deficiency (urea cycle disorder)",
        "disease_tokens": ["CPS1", "UREA CYCLE", "HYPERAMMONEMIA", "CARBAMOYL PHOSPHATE"],
        "default_mechanism": "loss_of_function",
        "default_consequence": "Pathogenic missense reducing enzyme activity (correctable point mutation)",
        "inheritance": "Autosomal recessive",
        "tissue": "Liver",
    },
    "SMN1": {
        "gene": "SMN1",
        "disease": "Spinal muscular atrophy",
        "disease_tokens": ["SPINAL MUSCULAR ATROPHY", "SMA", "SMN"],
        "default_mechanism": "loss_of_function",
        "default_consequence": "Loss of SMN1 function (durable gene addition candidate)",
        "inheritance": "Autosomal recessive",
        "tissue": "Motor neurons (CNS)",
    },
    "TTR": {
        "gene": "TTR",
        "disease": "Hereditary transthyretin amyloidosis",
        "disease_tokens": ["TRANSTHYRETIN", "AMYLOID", "HATTR", "ATTR"],
        "default_mechanism": "gain_of_function",
        "default_consequence": "Misfolded TTR deposition (toxic gain — knockdown candidate)",
        "inheritance": "Autosomal dominant",
        "tissue": "Liver (production site)",
    },
}


# Ordered rules mapping a mechanism (and hints) to a modality id. First match wins.
def select_modality(
    mechanism: str | None,
    consequence: str | None,
    tissue: str | None,
    preferred: str | None = None,
) -> tuple[str, str, list[str]]:
    """Return (modality_id, rationale, alternatives_considered).

    Deterministic decision tree over MODALITY_LIBRARY. `preferred` (if a valid id) is honored but
    the rationale notes it was clinician-requested.
    """
    text = " ".join(filter(None, [mechanism, consequence])).lower()
    tissue_l = (tissue or "").lower()

    if preferred and preferred.upper() in MODALITY_LIBRARY:
        pid = preferred.upper()
        return (
            pid,
            f"Clinician-requested modality ({MODALITY_LIBRARY[pid]['name']}). "
            f"{MODALITY_LIBRARY[pid]['mechanism']}",
            [m for m in _default_alternatives(pid)],
        )

    # Splice defects → splice-switching ASO (milasen class).
    if any(k in text for k in ("splice", "cryptic", "pseudoexon", "exon skip", "exon inclusion")):
        return (
            "ASO_SPLICE",
            "The defect is a splicing error, which a steric-block ASO can correct at the RNA level "
            "without editing DNA — the milasen approach.",
            ["ASO_GAPMER (would knock the transcript down rather than restore splicing)",
             "AAV_GENE_ADDITION (durable but unnecessary if splicing can be corrected)"],
        )

    # Toxic gain-of-function → knockdown (siRNA if hepatic, else gapmer ASO).
    if any(k in text for k in ("gain_of_function", "toxic_gain", "toxic", "dominant", "aggregat", "misfold")):
        if "liver" in tissue_l or "hepat" in tissue_l:
            return (
                "SIRNA",
                "A toxic gain-of-function product expressed in the liver is best lowered with a "
                "durable GalNAc-siRNA knockdown.",
                ["ASO_GAPMER (also knocks down, but siRNA gives more durable hepatic silencing)",
                 "BASE_EDITOR (could correct the allele but is higher-risk than knockdown here)"],
            )
        return (
            "ASO_GAPMER",
            "A toxic transcript outside the liver is best lowered with an RNase-H1 gapmer ASO, "
            "which can be made allele-selective.",
            ["SIRNA (limited by hepatic-restricted GalNAc delivery)",
             "ASO_SPLICE (not applicable — this is a knockdown problem, not a splicing one)"],
        )

    # Correctable point mutation → base editing (KJ class).
    if any(k in text for k in ("point mutation", "missense", "transition", "single-base", "snv", "substitution")):
        return (
            "BASE_EDITOR",
            "A single-base pathogenic change is a candidate for precise base editing (A→G / C→T) "
            "without a double-strand break — the Baby KJ approach.",
            ["PRIME_EDITOR (more flexible but more complex; reserve for edits base editing can't make)",
             "MRNA_LNP (transient protein replacement rather than a permanent fix)"],
        )

    # Complex indel → prime editing.
    if any(k in text for k in ("insertion", "deletion", "indel", "frameshift", "complex")):
        return (
            "PRIME_EDITOR",
            "An insertion/deletion needs prime editing, which can write the corrected sequence "
            "directly.",
            ["BASE_EDITOR (limited to single-base transitions — insufficient here)",
             "AAV_GENE_ADDITION (adds a functional copy instead of repairing the locus)"],
        )

    # Generic loss-of-function → durable gene addition if CNS/small; else mRNA replacement.
    if any(k in text for k in ("loss_of_function", "loss of function", "null", "deficiency", "haploinsufficien")):
        if "liver" in tissue_l or "hepat" in tissue_l:
            return (
                "MRNA_LNP",
                "A hepatic enzyme deficiency can be addressed with nucleoside-modified mRNA that "
                "supplies the missing protein, with LNP delivery to the liver.",
                ["AAV_GENE_ADDITION (durable single dose, but immunogenicity/re-dosing constraints)",
                 "BASE_EDITOR (only if a specific correctable mutation is defined)"],
            )
        return (
            "AAV_GENE_ADDITION",
            "A loss-of-function disorder with a compact coding sequence is a candidate for durable "
            "AAV gene addition.",
            ["MRNA_LNP (transient; needs repeat dosing but avoids viral immunity)",
             "ASO_SPLICE (only if the loss is due to a correctable splicing defect)"],
        )

    # Fallback: mRNA replacement is the most generally applicable.
    return (
        "MRNA_LNP",
        "No sharply-defined mechanism was recovered; nucleoside-modified mRNA replacement is the "
        "most broadly applicable starting point pending a firmer molecular diagnosis.",
        ["AAV_GENE_ADDITION", "ASO_SPLICE", "BASE_EDITOR"],
    )


def _default_alternatives(modality_id: str) -> list[str]:
    names = [
        f"{v['name']}"
        for k, v in MODALITY_LIBRARY.items()
        if k != modality_id
    ]
    return names[:3]


def select_delivery(modality_id: str, tissue: str | None) -> str:
    """Choose a delivery-vector id for the modality + tissue."""
    tissue_l = (tissue or "").lower()
    default = MODALITY_LIBRARY.get(modality_id, {}).get("delivery_default", "LNP_IV")

    # Tissue overrides for editing/gene-addition modalities.
    if modality_id in ("AAV_GENE_ADDITION",):
        if any(k in tissue_l for k in ("cns", "brain", "neuro", "motor neuron")):
            return "AAV9_CNS"
        if any(k in tissue_l for k in ("liver", "hepat")):
            return "AAV8_LIVER"
    if modality_id in ("BASE_EDITOR", "PRIME_EDITOR", "MRNA_LNP"):
        if any(k in tissue_l for k in ("liver", "hepat")):
            return "LNP_LIVER"
        return "LNP_IV"
    if modality_id == "ASO_SPLICE":
        if any(k in tissue_l for k in ("cns", "brain", "neuro", "motor neuron", "retina", "eye")):
            return "INTRATHECAL_ASO"
    return default
