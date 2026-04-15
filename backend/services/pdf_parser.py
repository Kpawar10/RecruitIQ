"""PDF text extraction — handles both PyPDF2 and pdfplumber for better accuracy."""

import io
from typing import BinaryIO


def extract_text_from_pdf(file_obj: BinaryIO) -> str:
    """Extract text from a PDF file object. Tries pdfplumber first, falls back to PyPDF2."""
    text = ""

    # Try pdfplumber (better for complex layouts)
    try:
        import pdfplumber
        with pdfplumber.open(file_obj) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        if text.strip():
            return text.strip()
    except Exception:
        pass

    # Fallback to PyPDF2
    try:
        import PyPDF2
        file_obj.seek(0)
        reader = PyPDF2.PdfReader(file_obj)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    except Exception as e:
        raise ValueError(f"Could not parse PDF: {e}")

    return text.strip()