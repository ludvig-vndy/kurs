#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
granska_rost.py

Röst- och AI-tell-flagga för kurstexten. Komplement till granska_kurs.py
(som äger integritet, referenser och streck). Det här skriptet tittar på
prosan och hjälper dig rikta röst-passet.

Hård grind: "hen" måste vara 0 (exit 1 annars).
Rådgivande (smak, inte fakta): täthet av antites, metaprat-fraser,
fyllnadsord, tretal, grammatik-kandidater (verka/kännas utan som/vara),
och överlånga meningar. Lektionerna rangordnas efter tell-poäng så att de
värsta syns först.

Användning:
    python3 granska_rost.py KURS-EXPORT.md      # en fil, delas på ### N.M-rubriker
    python3 granska_rost.py path/till/lektioner  # en katalog med .md-filer
"""

import sys, os, re, glob, argparse

# --- konfiguration (lätt att redigera) ---------------------------------------
SIGNPOSTS = [
    "det fina är", "poängen är", "lägg märke till", "lärdomen är",
    "det är hela spänningen", "det leder till", "kom ihåg att",
    "det viktiga är", "notera att", "som vi ska se", "det säger oss",
]
INTENSIFIERS = ["genuint", "faktiskt", "just", "själva", "precis", "verkligen"]
LONG_WORDS = 35   # mening över så här många ord: överväg att dela

HEN = re.compile(r"(?i)\b(hen|hens|henom)\b")
DET_AR_INTE = re.compile(r"(?i)\bdet är inte\b")
TRIAD = re.compile(r",[^,.!?]+,[^,.!?]+\soch\s")
# verka/kännas/ter sig som INTE följs av som/vara/att (fångar "verka självmål"-familjen,
# men flaggar även "verkar dumt", alltså adjektiv, så kandidaterna måste läsas av en människa)
GRAMMAR = re.compile(r"(?i)\b(verkar|verkade|verka|känns|kändes|kännas|ter sig|tedde sig)\b(?!\s+(som|vara|att)\b)")

# --- hjälpare ----------------------------------------------------------------
def sentences(text):
    t = re.sub(r"(?m)^\s*[#\-*>|].*$", " ", text)   # bort med rubriker, listor, tabeller
    t = re.sub(r"`[^`]*`", " ", t)                   # bort med kodspann
    t = t.replace("\n", " ")
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", t) if s.strip()]

def wc(s):
    return len(re.findall(r"\S+", s))

def antithesis_count(sents):
    n = 0
    for s in sents:
        if re.search(r"(?i)\binte\b", s) and re.search(r"(?i)\butan\b", s):
            n += 1
    return n

def count_list(text, items):
    low = text.lower()
    return sum(low.count(x) for x in items)

def count_words(text, words):
    low = text.lower()
    return sum(len(re.findall(r"\b%s\b" % re.escape(w), low)) for w in words)

# --- inläsning: fil (dela på rubriker) eller katalog -------------------------
def load_lessons(path):
    lessons = []
    if os.path.isfile(path):
        text = open(path, encoding="utf-8", errors="replace").read()
        parts = re.split(r"(?m)^###\s+(\d+\.\d+)\s+(.*)$", text)
        # parts: [pre, num, title, body, num, title, body, ...]
        for i in range(1, len(parts), 3):
            num, title, body = parts[i], parts[i+1], parts[i+2]
            lessons.append((f"{num} {title.strip()}", body))
    else:
        for p in sorted(glob.glob(os.path.join(path, "**", "*.md"), recursive=True)):
            raw = open(p, encoding="utf-8", errors="replace").read()
            body = raw
            lines = raw.split("\n")
            if lines and lines[0].strip() == "---":          # klipp frontmatter
                j = 1
                while j < len(lines) and lines[j].strip() != "---":
                    j += 1
                body = "\n".join(lines[j+1:])
            lessons.append((os.path.basename(p), body))
    return lessons

# --- huvud -------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="en .md-fil (delas på ### N.M) eller en katalog med .md")
    args = ap.parse_args()

    lessons = load_lessons(args.path)
    print("=" * 78)
    print(f"RÖST-GRANSKNING av {os.path.abspath(args.path)}  ({len(lessons)} lektioner)")
    print("=" * 78)

    rows = []
    hen_total = 0
    details = {}
    for label, body in lessons:
        sents = sentences(body)
        hen = len(HEN.findall(body)); hen_total += hen
        anti = antithesis_count(sents) + len(DET_AR_INTE.findall(body))
        sign = count_list(body, SIGNPOSTS)
        inten = count_words(body, INTENSIFIERS)
        triad = len(TRIAD.findall(body))
        gram = [(m.group(0), body[max(0, m.start()-25):m.start()+35].replace("\n", " ")) for m in GRAMMAR.finditer(body)]
        longs = [(wc(s), s) for s in sents if wc(s) > LONG_WORDS]
        score = anti + sign + inten + triad        # tell-poäng (smak)
        rows.append((score, label, hen, anti, sign, inten, triad, len(gram), len(longs)))
        details[label] = {"gram": gram, "longs": sorted(longs, reverse=True)}

    rows.sort(reverse=True)

    print(f"\n{'poäng':>5} {'hen':>4} {'anti':>5} {'meta':>5} {'fyll':>5} {'tre':>4} {'gram':>5} {'lång':>5}  lektion")
    print("-" * 78)
    for score, label, hen, anti, sign, inten, triad, gram, longs in rows:
        flag = "  <== HEN" if hen else ""
        print(f"{score:>5} {hen:>4} {anti:>5} {sign:>5} {inten:>5} {triad:>4} {gram:>5} {longs:>5}  {label[:34]}{flag}")

    # detaljer för de fem värsta
    print("\n" + "=" * 78)
    print("DETALJER, fem värsta lektionerna (kandidater att läsa, inte automatfix)")
    print("=" * 78)
    for score, label, *_ in rows[:5]:
        d = details[label]
        print(f"\n### {label}  (tell-poäng {score})")
        if d["longs"]:
            print(f"  Långa meningar (>{LONG_WORDS} ord):")
            for n, s in d["longs"][:3]:
                print(f"    [{n} ord] {s[:130]}...")
        if d["gram"]:
            print("  Grammatik-kandidater (verka/kännas utan som/vara, kan vara falska positiva):")
            for hit, ctx in d["gram"][:3]:
                print(f"    ...{ctx}...")

    print("\n" + "=" * 78)
    print(f"hen totalt: {hen_total}   (kolumner: anti=antites, meta=metaprat, fyll=fyllnadsord, tre=tretal, gram=grammatik-kandidater, lång=meningar över {LONG_WORDS} ord)")
    if hen_total:
        print("HÅRD GRIND UNDERKÄND: hen måste vara 0.")
    else:
        print("Hen-grinden grön. Övriga kolumner är rådgivande, rikta röst-passet mot de översta raderna.")
    print("=" * 78)
    sys.exit(1 if hen_total else 0)

if __name__ == "__main__":
    main()
