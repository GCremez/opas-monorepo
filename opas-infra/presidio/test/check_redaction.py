"""End-to-end redaction check for the Opas Presidio image.

Runs the analyzer in-process with the image's own config and language models, sending
what the backend sends (PresidioService.java): the letter's language, the entity list,
the never-remove list, the Finnish patterns and the account holder's name. Every [[span]]
in the letters must be removed; no removal may touch a {{span}} (dates, amounts,
reference numbers, authority names).

In CI it runs inside the built image (see .github/workflows/infra-ci.yml):

    docker run --rm -v "$PWD/opas-infra/presidio/test:/test:ro" \
      -v "$PWD/opas-backend/src/main/resources/presidio:/opas:ro" \
      opas-presidio-analyzer python /test/check_redaction.py /opas /test/letters.txt

Exit code 1 if anything fails.
"""

import json
import os
import re
import sys

from presidio_analyzer import AnalyzerEngineProvider, Pattern, PatternRecognizer

LETTERS = "A-Za-zÀ-ÖØ-öø-ÿĀ-ž"
WORD_START = f"(?<![{LETTERS}0-9])"
WORD_END = f"(?![{LETTERS}0-9])"

# Same word lists and tie-breaking as PresidioService.detectLanguage.
FI_WORDS = {"ja", "on", "että", "ei", "tai", "sinun", "päätös", "hakemus", "mennessä", "kuluessa", "olemme",
            "voit", "tämä", "sinulle", "lisätietoja", "myös", "asia"}
SV_WORDS = {"och", "att", "är", "inte", "eller", "din", "ditt", "beslut", "ansökan", "senast", "inom", "vi", "du",
            "kan", "för", "med", "på", "har", "om"}
EN_WORDS = {"the", "and", "is", "your", "you", "of", "to", "decision", "application", "by", "within", "was",
            "on", "at"}


def detect_language(text):
    words = re.findall(r"[a-zåäöé]+", text.lower())
    fi = sum(w in FI_WORDS for w in words)
    sv = sum(w in SV_WORDS for w in words)
    en = sum(w in EN_WORDS for w in words)
    if sv > fi and sv >= en:
        return "sv"
    if en > fi and en > sv:
        return "en"
    return "fi"


def known_person(language, name):
    """Same rule as PresidioService.knownPerson: 4+ letters may take Finnish endings."""
    long_names, short_names = [], []
    for token in re.split(r"[\s,]+", name):
        clean = re.sub(f"[^{LETTERS}'-]", "", token)
        letters = sum(c.isalpha() for c in clean)
        if letters >= 4:
            long_names.append(clean)
        elif letters >= 2:
            short_names.append(clean)
    patterns = []
    if long_names:
        patterns.append(Pattern("known_name_inflected",
                                f"{WORD_START}(?:{'|'.join(long_names)})[{LETTERS}]{{0,6}}{WORD_END}", 0.85))
    if short_names:
        patterns.append(Pattern("known_name_exact", f"{WORD_START}(?:{'|'.join(short_names)}){WORD_END}", 0.85))
    return [PatternRecognizer(supported_entity="PERSON", supported_language=language, patterns=patterns,
                              name="Account holder's name")] if patterns else []


def parse_letters(path):
    letters = []
    blocks = re.split(r"(?m)^=== ", open(path, encoding="utf-8").read())
    for block in blocks:
        if not block.strip() or block.startswith("#"):
            continue
        name, body = block.split("\n", 1)
        text, remove, keep, last = "", [], [], 0
        for m in re.finditer(r"\[\[(.+?)]]|\{\{(.+?)}}", body):
            text += body[last:m.start()]
            inner = m.group(1) or m.group(2)
            (remove if m.group(1) else keep).append((len(text), len(text) + len(inner), inner))
            text += inner
            last = m.end()
        text += body[last:]
        letters.append((name.strip(), text, remove, keep))
    return letters


def main():
    shared_dir, letters_path = sys.argv[1], sys.argv[2]
    shared = json.load(open(os.path.join(shared_dir, "patterns.json"), encoding="utf-8"))
    allow_list = [line.strip() for line in open(os.path.join(shared_dir, "allow-list.txt"), encoding="utf-8")
                  if line.strip() and not line.startswith("#")]
    engine = AnalyzerEngineProvider(
        analyzer_engine_conf_file=os.environ.get("ANALYZER_CONF_FILE"),
        nlp_engine_conf_file=os.environ.get("NLP_CONF_FILE"),
        recognizer_registry_conf_file=os.environ.get("RECOGNIZER_REGISTRY_CONF_FILE"),
    ).create_engine()

    failures = 0
    for name, text, remove, keep in parse_letters(letters_path):
        language = detect_language(text)
        recognizers = [PatternRecognizer(supported_entity=r["entity"], supported_language=language, name=r["name"],
                                         patterns=[Pattern(r["pattern"], r["regex"], r["score"])])
                       for r in shared["recognizers"]]
        recognizers += known_person(language, name)
        results = engine.analyze(text=text, language=language, entities=shared["entities"],
                                 ad_hoc_recognizers=recognizers, allow_list=allow_list)
        spans = [(r.start, r.end, r.entity_type) for r in results]
        for start, end, value in remove:
            covered = [False] * (end - start)
            for a, z, _ in spans:
                for i in range(max(a, start), min(z, end)):
                    covered[i - start] = True
            if not all(c or value[i].isspace() or value[i] in ",." for i, c in enumerate(covered)):
                print(f"NOT REMOVED [{language}] {value!r} ({name})")
                failures += 1
        for start, end, value in keep:
            for a, z, entity in spans:
                if a < end and start < z:
                    print(f"REMOVED BUT NEEDED [{language}] {value!r} as {entity} by {text[a:z]!r} ({name})")
                    failures += 1
        print(f"checked [{language}] {name}")
    print("All letters redacted correctly." if failures == 0 else f"{failures} problem(s).")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
