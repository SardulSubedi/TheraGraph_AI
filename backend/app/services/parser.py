from io import BytesIO

from pypdf import PdfReader


def extract_text(filename: str, raw_bytes: bytes) -> str:
    """Extract plain text from pdf, vcf, txt, or unknown file types."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        reader = PdfReader(BytesIO(raw_bytes))
        parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
        return "\n".join(parts)
    if lower.endswith((".vcf", ".txt")):
        return raw_bytes.decode("utf-8", errors="ignore")
    return raw_bytes.decode("utf-8", errors="ignore")
