import re
import datetime
import pdfplumber
from docx import Document
from typing import List, Dict, Any

# ── Clean Text (from Parser_final.py) ──
def clean_text(text: str) -> str:
    text = re.sub(r"\(cid:\d+\)", " ", text)
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()

# ── Section Detection ──
def detect_sections(text: str) -> Dict[str, str]:
    section_patterns = {
        "Education": r"\beducation\b",
        "Projects": r"\bprojects?\b",
        "Experience": r"\bexperience|employment|work\b",
        "Skills": r"\btechnical skills|skills\b",
        "Achievements": r"\bachievements?|awards?\b",
        "Positions": r"\bpositions?|responsibility|leadership\b",
    }
    
    matches = []
    for name, pattern in section_patterns.items():
        for m in re.finditer(pattern, text, re.IGNORECASE):
            matches.append((m.start(), name))
    
    matches.sort()
    sections = {}
    if matches:
        first_pos = matches[0][0]
        preamble = text[:first_pos].strip()
        if preamble:
            sections["Contact"] = preamble
            
    for i, (start, name) in enumerate(matches):
        end = matches[i + 1][0] if i+1 < len(matches) else len(text)
        sections[name] = text[start:end].strip()
        
    return sections

# ── Extraction Regexes ──
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"\+?\d[\d\s\-().]{7,}\d")
URL_RE   = re.compile(r"(https?://\S+|(?:linkedin|github|gitlab)\S+)", re.IGNORECASE)
CGPA_RE  = re.compile(r"(?:cgpa|gpa|percentage)[:\s]*([0-9.]+)", re.IGNORECASE)
DATE_RE  = re.compile(r"(\d{4})\s*[-–—]\s*(\d{4}|present|current|now|ongoing)", re.IGNORECASE)
DEGREE_RE = re.compile(r"(b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|mba|phd|bachelor|master)[^,\n]*", re.IGNORECASE)

# ── Field Parsers ──
def extract_contact(text: str) -> Dict[str, Any]:
    result = {"email": None, "phone": None, "links": [], "name": None}
    if m := EMAIL_RE.search(text): result["email"] = m.group()
    if m := PHONE_RE.search(text): result["phone"] = m.group().strip()
    links = URL_RE.findall(text)
    if links: result["links"] = links
    
    for line in text.splitlines():
        line = line.strip()
        if 2 < len(line) < 50 and re.match(r"^[A-Za-z .'-]+$", line):
            result["name"] = line
            break
    return result

def extract_education(text: str) -> List[Dict[str, Any]]:
    entries = []
    blocks = re.split(r"\n(?=[A-Z])", text)
    for block in blocks:
        entry = {}
        if m := DEGREE_RE.search(block): entry["degree"] = m.group().strip()
        if m := CGPA_RE.search(block): entry["cgpa"] = m.group(1)
        if dates := DATE_RE.findall(block):
            start, end = dates[0]
            entry["duration"] = f"{start}-{end.capitalize()}"
        for line in block.splitlines():
            if re.search(r"college|university|institute|school|iit|nit", line, re.I):
                entry["institution"] = line.strip()
                break
        if entry: entries.append(entry)
    return entries

def extract_experience(text: str) -> List[Dict[str, Any]]:
    entries = []
    chunks = text.split("\n\n")
    for chunk in chunks:
        entry = {}
        lines = chunk.splitlines()
        if not lines: continue
        entry["title"] = lines[0].strip()
        if dates := DATE_RE.findall(chunk):
            start, end = dates[0]
            entry["duration"] = f"{start}-{end.capitalize()}"
            if end.lower() in ["present", "current", "ongoing"]:
                years = datetime.date.today().year - int(start)
            else:
                try: years = int(end) - int(start)
                except: years = None
            if years is not None: entry["years"] = f"{years} yrs"
        entries.append(entry)
    return entries

# ── File Handling ──
def extract_raw_text(file_path: str) -> str:
    if file_path.endswith(".pdf"):
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t: text += t + "\n"
        return text
    elif file_path.endswith(".docx"):
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    elif file_path.endswith(".txt"):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        raise ValueError("Unsupported extension")

# ── Main Service Logic ──
def parse_resume(file_path: str) -> Dict[str, Any]:
    raw_text = extract_raw_text(file_path)
    text = clean_text(raw_text)
    sections = detect_sections(text)
    
    extracted = {}
    if "Contact" in sections:
        extracted["contact"] = extract_contact(sections["Contact"])
    if "Education" in sections:
        extracted["education"] = extract_education(sections["Education"])
        
    exp_text = sections.get("Experience") or sections.get("Projects") or sections.get("Positions")
    if exp_text:
        extracted["experience"] = extract_experience(exp_text)
    
    print("SECTIONS:", sections)
    return {
        "full_text": text,
        "sections": sections,
        "extracted_fields": extracted
    }
