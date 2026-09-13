#!/usr/bin/env python3
"""Small JSON-in/JSON-out worker used by the temporary .hybrid command."""
from __future__ import annotations

import json
import math
import sys
from collections import Counter


def analyze(prompt: str) -> dict:
    text = (prompt or "").strip()
    words = [word for word in text.lower().split() if word]
    counts = Counter(words)
    unique = len(counts)
    total = len(words)
    lexical_density = round(unique / total, 2) if total else 0.0
    energy = min(100, 24 + unique * 7 + min(len(text), 180) // 6)
    focus = min(100, 35 + int(lexical_density * 55) + (12 if "build" in words or "create" in words else 0))
    signal = round(math.sqrt(max(len(text), 1)) * 3.2, 1)
    top_terms = [word for word, _ in counts.most_common(4)]
    return {
        "ok": True,
        "engine": "python-hybrid-lab",
        "input": text,
        "metrics": {
            "energy": energy,
            "focus": focus,
            "signal": signal,
            "words": total,
            "unique": unique,
        },
        "top_terms": top_terms,
        "insight": (
            "High creative signal. The next step should be a small executable prototype."
            if energy >= 70 else
            "The idea has a clear starting point. Add one concrete constraint to sharpen it."
        ),
    }


def main() -> None:
    for line in sys.stdin:
        try:
            request = json.loads(line)
            print(json.dumps(analyze(str(request.get("prompt", "")))), flush=True)
        except Exception as exc:
            print(json.dumps({"ok": False, "error": str(exc)}), flush=True)


if __name__ == "__main__":
    main()
