"""Truthful rewrite guard: flags rewritten lines that contain facts not in the original.

Per line:
  grounded    - every number and tool/name already exists in the original
  jd_added    - new terms come from the job description (candidate must confirm)
  unsupported - new numbers/names found nowhere (most likely fabrications)
Deterministic (no LLM), so it cannot hallucinate and is fully testable.
"""
import re
from difflib import SequenceMatcher

NUMBER_RE = re.compile(r"\$?\d[\d,]*(?:\.\d+)?\s?(?:%|x|k|m|b|\+)?", re.IGNORECASE)
WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9+#./-]*")
SENTENCE_START = {"the", "a", "an", "and", "or", "of", "in", "to", "for", "with", "on", "at"}
MIN_WORDS = 4


def _norm_number(raw):
    return re.sub(r"[\s,]", "", raw.lower()).rstrip(".")


def _numbers(text):
    return {_norm_number(m.group()) for m in NUMBER_RE.finditer(text) if any(c.isdigit() for c in m.group())}


def _stem(word):
    w = word.lower().strip(".-/")
    for suffix in ("ing", "ed", "es", "s"):
        if w.endswith(suffix) and len(w) - len(suffix) >= 3:
            return w[: -len(suffix)]
    return w


def _vocab(text):
    return {_stem(w) for w in WORD_RE.findall(text)}


def _is_techy(word):
    return (
        any(c in word for c in "+#")
        or (any(c.isdigit() for c in word) and any(c.isalpha() for c in word))
        or (word.isupper() and len(word) >= 2)
        or re.search(r"[a-z][A-Z]", word) is not None
        or re.search(r"\w\.\w", word) is not None
    )


def _terms(line):
    """Names and tools in a line: capitalised words mid-sentence, plus technical tokens."""
    found = []
    tokens = WORD_RE.findall(line)
    for idx, token in enumerate(tokens):
        if token.lower() in SENTENCE_START:
            continue
        if _is_techy(token) or (idx > 0 and token[0].isupper()):
            found.append(token)
    return found


def _is_heading(line):
    return line == line.upper() and len(line) < 45 and any(c.isalpha() for c in line)


def _best_match(line, original_lines):
    best, best_ratio = None, 0.0
    for candidate in original_lines:
        matcher = SequenceMatcher(None, line.lower(), candidate.lower())
        if matcher.real_quick_ratio() < best_ratio or matcher.quick_ratio() < best_ratio:
            continue
        ratio = matcher.ratio()
        if ratio > best_ratio:
            best, best_ratio = candidate, ratio
    return best, round(best_ratio, 2)


def check_rewrite(original, improved, job_description=""):
    original_numbers = _numbers(original)
    original_vocab = _vocab(original)
    jd_vocab = _vocab(job_description or "")
    original_lines = [l.strip(" •-*\t") for l in original.splitlines() if l.strip()]

    results = []
    for raw in improved.splitlines():
        line = raw.strip(" •-*\t")
        if not line or _is_heading(line) or "@" in line:
            continue
        if len(line.split()) < MIN_WORDS:
            continue

        new_numbers = sorted(n for n in _numbers(line) if n not in original_numbers)
        new_terms = [t for t in _terms(line) if _stem(t) not in original_vocab]
        jd_terms = [t for t in new_terms if _stem(t) in jd_vocab]
        unknown_terms = [t for t in new_terms if _stem(t) not in jd_vocab]

        if new_numbers or unknown_terms:
            status = "unsupported"
        elif jd_terms:
            status = "jd_added"
        else:
            status = "grounded"

        match, similarity = _best_match(line, original_lines)
        results.append({
            "text": line,
            "status": status,
            "new_numbers": new_numbers,
            "new_terms": unknown_terms,
            "jd_terms": jd_terms,
            "closest_original": match,
            "similarity": similarity,
        })

    total = len(results)
    counts = {s: sum(1 for r in results if r["status"] == s) for s in ("grounded", "jd_added", "unsupported")}
    trust = 100 if total == 0 else round(100 * (counts["grounded"] + 0.5 * counts["jd_added"]) / total)
    return {"trust_score": trust, "total_lines": total, **counts, "lines": results}