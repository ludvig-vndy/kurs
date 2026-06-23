#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
granska_kurs.py

Mekanisk granskning av kursen i fundamental analys.
Kor de objektiva kontrollerna sa att en manniska (eller en oberoende
granskare) bara behover lagga omdomeslagret ovanpa.

Anvandning:
    python3 granska_kurs.py [katalog] [--manifest _MANIFEST.txt]

Default katalog ar ".". Om en manifestfil finns (eller anges) jamfors
uppsattningen lektioner mot den, sa saknade filer fangas.

Hard FAIL (exit 1): saknade/extra lektioner, ofullstandig frontmatter,
ogiltig niva, dubbel eller icke-stigande ordning, inkonsekvent del-gruppering,
trasiga slugs, doda referenser eller punkt-decimaler, em-dash/en-dash,
forbjudna strangar (regressioner).
WARN (exit 0): svengelska, overlanga meningar, uppblasta lektioner,
DCF-canary, oppna korrekthetspunkter.
"""

import sys, os, re, glob, argparse, unicodedata

# ---------------------------------------------------------------- konfiguration
REQUIRED_FIELDS = ["del", "modul", "modulTitel", "lektion", "titel", "niva", "ordning", "fardighet"]
VALID_NIVA = {"Nybörjare", "Mellan", "Avancerad"}

VALID_DEL_NUMBERS = set(range(1, 7))          # texten refererar Del 1..6
# giltiga modulnummer harleds fran de filer som finns

EM_DASH = "\u2014"
EN_DASH = "\u2013"

# Regressionsvakter: strangar som inte far forekomma (redan atgardade, far ej smyga tillbaka)
FORBIDDEN_SUBSTRINGS = [
    "höggmarginal",      # stavfel, rattat
    "\\u2014", "\\u2013" # escapeade langstreck i ev. HTML
]

# Svengelska att flagga (WARN). "moat" och dess substantivbojningar (moaten, moats)
# ar kursens valda term, sa de flaggas inte. Verbformen ("moatad" = "moated") ar
# den genuint klumpiga svengelskan.
SWENGLISH_PATTERNS = [r"\bmoatad\b", r"\bmoatade\b", r"\bmoatar\b", r"\bmoata\b"]

# Oppna korrekthetspunkter som gar att soka efter (WARN-hint). De ovriga ar begreppsliga.
CORRECTNESS_HINTS = [
    (r"EBIT\s*minus\s*skatt", "9.1 NOPAT: skriv som EBIT x (1 - skattesats), inte EBIT minus skatt"),
    (r"NOPAT\s*=\s*EBIT\s*-\s*", "9.1 NOPAT: anvand EBIT x (1 - skattesats)"),
]

# 8-punkters begreppschecklista (paminnelse, kraver omdome att verifiera)
OPEN_CORRECTNESS_CHECKLIST = [
    "6.3  FCFF vs FCFE konsekvent (OCF - capex ~ FCFF; matcha rantan)",
    "9.1  NOPAT = EBIT x (1 - skattesats)",
    "8.3/9.1  DuPont: separera ROE-nedbrytning och ROIC-nedbrytning, blanda inte baser",
    "8.2  Regeln om 40 = tillvaxt + FCF-/rorelsemarginal (ej nettovinstmarginal)",
    "17.3/17.5/19.5  LTV churn-baserad och diskonterad",
    "17.5  Scenariovarde justerat for framtida utspadning, per aktie",
    "19.4  Operating leverage = fasta kostnader (FoU/G&A), ej S&M",
    "3.4  Svenska revisionstermer (modifierat uttalande vs anmarkning)",
]

LONG_SENTENCE_WORDS = 50
BLOAT_WORDS = 2500
TARGET_TOTAL_WORDS = 100000

# DCF-canary: distinkta nyckeltal som ska finnas nagonstans i DCF-traden (modul 14)
DCF_LESSON_PREFIXES = ("14.",)
DCF_EXPECTED_FIGURES = ["473", "1342", "1816"]

LESSON_RE = re.compile(r"^(\d{1,2})\.(\d{1,2})-.*\.md$")
SLUG_RE = re.compile(r"^\d{1,2}\.\d{1,2}-[a-z0-9-]+\.md$")
NM_TOKEN_RE = re.compile(r"\b\d{1,2}\.\d{1,2}\b")

# ---------------------------------------------------------------- hjalpfunktioner
class Result:
    def __init__(self):
        self.fails = 0
        self.warns = 0
    def fail(self, title, lines):
        self.fails += 1
        print(f"[FAIL] {title}")
        for l in lines: print(f"        {l}")
    def warn(self, title, lines):
        self.warns += 1
        print(f"[WARN] {title}")
        for l in lines: print(f"        {l}")
    def ok(self, title):
        print(f"[OK]   {title}")
    def info(self, title, lines=None):
        print(f"[INFO] {title}")
        for l in (lines or []): print(f"        {l}")

def lesson_number(fname):
    m = LESSON_RE.match(fname)
    return f"{int(m.group(1))}.{int(m.group(2))}" if m else None

def num_key(lnum):
    a, b = lnum.split(".")
    return (int(a), int(b))

def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

def split_frontmatter(text):
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return None, text
    fm = {}
    i = 1
    while i < len(lines) and lines[i].strip() != "---":
        line = lines[i]
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip().strip('"').strip("'")
        i += 1
    body = "\n".join(lines[i+1:]) if i < len(lines) else ""
    return fm, body

def word_count(text):
    return len(re.findall(r"\S+", text))

def sentences(text):
    # naiv mening-split, raderar rubriker/listmarkorer forst
    t = re.sub(r"(?m)^\s*[#\-*>].*$", " ", text)
    t = t.replace("\n", " ")
    parts = re.split(r"(?<=[.!?])\s+", t)
    return [p.strip() for p in parts if p.strip()]

# ---------------------------------------------------------------- huvud
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("directory", nargs="?", default=".")
    ap.add_argument("--manifest", default=None)
    args = ap.parse_args()
    d = args.directory

    files = sorted(
        [os.path.basename(p) for p in glob.glob(os.path.join(d, "*.md"))
         if LESSON_RE.match(os.path.basename(p))],
        key=lambda f: num_key(lesson_number(f))
    )
    html_files = sorted(os.path.basename(p) for p in glob.glob(os.path.join(d, "*.html")))

    print("=" * 70)
    print(f"GRANSKNING av {os.path.abspath(d)}")
    print(f"Hittade {len(files)} lektionsfiler, {len(html_files)} HTML-filer")
    print("=" * 70)

    R = Result()
    present = [lesson_number(f) for f in files]
    present_set = set(present)

    # parsa allt en gang
    parsed = {}
    for f in files:
        fm, body = split_frontmatter(read(os.path.join(d, f)))
        parsed[f] = (fm or {}, body or "")

    # 1) KOMPLETTHET ----------------------------------------------------------
    manifest_path = args.manifest or os.path.join(d, "_MANIFEST.txt")
    expected = None
    if os.path.exists(manifest_path):
        exp = set()
        for line in read(manifest_path).split("\n"):
            ln = lesson_number(line.strip())
            if ln: exp.add(ln)
        expected = exp
    if expected:
        missing = sorted(expected - present_set, key=num_key)
        extra = sorted(present_set - expected, key=num_key)
        if missing or extra:
            lines = []
            if missing: lines.append("SAKNAS: " + ", ".join(missing))
            if extra:   lines.append("EXTRA (ej i manifest): " + ", ".join(extra))
            R.fail("Komplett uppsattning (mot manifest)", lines)
        else:
            R.ok(f"Komplett uppsattning: alla {len(expected)} lektioner finns")
    else:
        R.info("Kompletthet: inget manifest hittat, hoppar over saknat-koll (kollar bara intern konsistens)")

    # 2) FRONTMATTER ----------------------------------------------------------
    fm_problems = []
    for f in files:
        fm, _ = parsed[f]
        miss = [k for k in REQUIRED_FIELDS if k not in fm]
        if miss:
            fm_problems.append(f"{f}: saknar {', '.join(miss)}")
        if "niva" in fm and fm["niva"] not in VALID_NIVA:
            fm_problems.append(f"{f}: ogiltig niva '{fm['niva']}'")
        if "lektion" in fm and fm["lektion"] != lesson_number(f):
            fm_problems.append(f"{f}: lektion '{fm.get('lektion')}' matchar inte filnamnet")
        if "ordning" in fm and not re.fullmatch(r"\d+", fm["ordning"]):
            fm_problems.append(f"{f}: ordning '{fm.get('ordning')}' ar inte ett heltal")
    if fm_problems:
        R.fail("Frontmatter-integritet", fm_problems)
    else:
        R.ok("Frontmatter: alla falt finns, niva giltig, lektion matchar filnamn")

    # 3) ORDNING --------------------------------------------------------------
    ord_pairs = []
    for f in files:
        fm, _ = parsed[f]
        if re.fullmatch(r"\d+", fm.get("ordning", "")):
            ord_pairs.append((lesson_number(f), int(fm["ordning"])))
    vals = [o for _, o in ord_pairs]
    dups = sorted({v for v in vals if vals.count(v) > 1})
    inversions = []
    for i in range(1, len(ord_pairs)):
        if ord_pairs[i][1] <= ord_pairs[i-1][1]:
            inversions.append(f"{ord_pairs[i-1][0]} (ordning {ord_pairs[i-1][1]}) -> {ord_pairs[i][0]} (ordning {ord_pairs[i][1]})")
    if dups or inversions:
        lines = []
        if dups: lines.append("DUBBLETTER: " + ", ".join(map(str, dups)))
        lines += [f"EJ STIGANDE: {x}" for x in inversions]
        R.fail("ordning unik och stigande", lines)
    else:
        R.ok("ordning: unik och monotont stigande")

    # 4) DEL-GRUPPERING -------------------------------------------------------
    mod_del = {}
    mod_order = []
    inconsist = []
    for f in files:
        fm, _ = parsed[f]
        mod = fm.get("modul"); dl = fm.get("del")
        if mod is None: continue
        if mod not in mod_del:
            mod_del[mod] = set(); mod_order.append(mod)
        mod_del[mod].add(dl)
    for mod in mod_order:
        if len(mod_del[mod]) > 1:
            inconsist.append(f"Modul {mod} har flera del-varden: {sorted(mod_del[mod])}")
    # kontinuitet: en del far inte aterkomma efter att en annan borjat
    seq = [next(iter(mod_del[m])) for m in mod_order]
    seen_runs = []
    for dl in seq:
        if not seen_runs or seen_runs[-1] != dl:
            if dl in seen_runs:
                inconsist.append(f"del '{dl}' ar inte sammanhangande (aterkommer)")
            seen_runs.append(dl)
    if inconsist:
        R.fail("del-gruppering", inconsist)
    else:
        R.ok("del-gruppering: konsekvent per modul och sammanhangande")

    # 5) SLUGS ----------------------------------------------------------------
    slug_problems = []
    for f in files:
        if any(ord(c) > 127 for c in f):
            slug_problems.append(f"{f}: icke-ASCII i filnamnet")
        elif not SLUG_RE.match(f):
            slug_problems.append(f"{f}: matchar inte monstret N.M-slug.md (gemener, bindestreck)")
    if slug_problems:
        R.fail("Filnamn och slugs", slug_problems)
    else:
        R.ok("Filnamn: ren ASCII och korrekt slug-monster")

    # 6) KORSREFERENSER -------------------------------------------------------
    dead = {}        # token -> filer
    delmod_bad = []
    valid_modules = {int(num_key(l)[0]) for l in present}
    for f in files:
        _, body = parsed[f]
        for tok in set(NM_TOKEN_RE.findall(body)):
            if tok not in present_set:
                dead.setdefault(tok, []).append(f)
        for n in re.findall(r"\bDel (\d+)\b", body):
            if int(n) not in VALID_DEL_NUMBERS:
                delmod_bad.append(f"{f}: 'Del {n}' utanfor 1..6")
        for n in re.findall(r"\bModul (\d+)\b", body):
            if int(n) not in valid_modules:
                delmod_bad.append(f"{f}: 'Modul {n}' finns inte")
    if dead or delmod_bad:
        lines = []
        for tok in sorted(dead, key=lambda t: num_key(t)):
            lines.append(f"'{tok}' (dod referens eller punkt-decimal, anvand komma) i: {', '.join(sorted(set(dead[tok])))}")
        lines += sorted(set(delmod_bad))
        R.fail("Korsreferenser (N.M, Del N, Modul N)", lines)
    else:
        R.ok("Korsreferenser: alla pekar pa befintliga lektioner och giltiga delar/moduler")

    # 7) LANGSTRECK -----------------------------------------------------------
    dash_hits = []
    for f in files:
        txt = read(os.path.join(d, f))
        if EM_DASH in txt: dash_hits.append(f"{f}: em-dash x {txt.count(EM_DASH)}")
        if EN_DASH in txt: dash_hits.append(f"{f}: en-dash x {txt.count(EN_DASH)}")
    for h in html_files:
        txt = read(os.path.join(d, h))
        if EM_DASH in txt: dash_hits.append(f"{h}: em-dash x {txt.count(EM_DASH)}")
        if EN_DASH in txt: dash_hits.append(f"{h}: en-dash x {txt.count(EN_DASH)}")
        for esc in ("\\u2014", "\\u2013"):
            if esc in txt: dash_hits.append(f"{h}: escapeat {esc} x {txt.count(esc)}")
    if dash_hits:
        R.fail("Inga langstreck (em-dash/en-dash)", dash_hits)
    else:
        R.ok("Langstreck: inga em-dash eller en-dash")

    # 8) FORBJUDNA STRANGAR (regressionsvakter) -------------------------------
    forb = []
    for f in files:
        txt = read(os.path.join(d, f))
        for s in FORBIDDEN_SUBSTRINGS:
            if s in txt:
                forb.append(f"{f}: '{s}' x {txt.count(s)}")
    for h in html_files:
        txt = read(os.path.join(d, h))
        for s in FORBIDDEN_SUBSTRINGS:
            if s in txt:
                forb.append(f"{h}: '{s}' x {txt.count(s)}")
    if forb:
        R.fail("Forbjudna strangar (regression)", forb)
    else:
        R.ok("Regressionsvakter: inga forbjudna strangar")

    # 9) SVENGELSKA (WARN) ----------------------------------------------------
    sw = []
    for f in files:
        _, body = parsed[f]
        for pat in SWENGLISH_PATTERNS:
            n = len(re.findall(pat, body))
            if n: sw.append(f"{f}: {pat} x {n}")
    if sw:
        R.warn("Svengelska att stada", sw)
    else:
        R.ok("Svengelska: inga traffar")

    # 10) OPPNA KORREKTHETSPUNKTER (WARN-hint + paminnelse) -------------------
    hint_hits = []
    for f in files:
        _, body = parsed[f]
        for pat, msg in CORRECTNESS_HINTS:
            if re.search(pat, body):
                hint_hits.append(f"{f}: {msg}")
    if hint_hits:
        R.warn("Mojliga korrekthetsproblem (sokbara)", hint_hits)
    R.info("Begreppschecklista att verifiera manuellt (kraver omdome):", OPEN_CORRECTNESS_CHECKLIST)

    # 11) OVERLANGA MENINGAR (WARN) -------------------------------------------
    long_counts = []
    for f in files:
        _, body = parsed[f]
        n = sum(1 for s in sentences(body) if word_count(s) > LONG_SENTENCE_WORDS)
        if n: long_counts.append((n, f))
    long_counts.sort(reverse=True)
    if long_counts:
        total_long = sum(n for n, _ in long_counts)
        lines = [f"{f}: {n} meningar over {LONG_SENTENCE_WORDS} ord" for n, f in long_counts[:10]]
        if len(long_counts) > 10: lines.append(f"... och {len(long_counts)-10} fler filer")
        R.warn(f"Overlanga meningar ({total_long} totalt, gransvarde {LONG_SENTENCE_WORDS} ord)", lines)
    else:
        R.ok(f"Meningslangd: inga meningar over {LONG_SENTENCE_WORDS} ord")

    # 12) LANGD (INFO/WARN) ---------------------------------------------------
    total_words = 0
    bloat = []
    for f in files:
        _, body = parsed[f]
        w = word_count(body); total_words += w
        if w > BLOAT_WORDS: bloat.append(f"{f}: {w} ord")
    avg = total_words // max(1, len(files))
    R.info(f"Langd: {total_words} ord totalt over {len(files)} lektioner (snitt {avg}). Malbild ~{TARGET_TOTAL_WORDS}.")
    if bloat:
        R.warn(f"Uppblasta lektioner (over {BLOAT_WORDS} ord)", bloat)

    # 13) DCF-CANARY ----------------------------------------------------------
    # skriptets egen DCF som sanity-check
    def dcf(fcf, g, r, term, nd, sh):
        g/=100; r/=100; term/=100; pv=0; last=fcf
        for t in range(1,6):
            last = fcf*(1+g)**t; pv += last/(1+r)**t
        tv = last*(1+term)/(r-term)
        return ((pv + tv/(1+r)**5) - nd)/sh
    val = dcf(100,8,10,3,300,100)
    if abs(val - 15.16) < 0.05:
        R.ok(f"DCF-canary (skriptets egen): {val:.2f} kr, stammer med kursexemplet ~15 kr")
    else:
        R.warn("DCF-canary", [f"skriptets DCF gav {val:.2f}, forvantat ~15.16"])
    # finns forvantade siffror kvar nagonstans i DCF-traden (modul 14)?
    dcf_blob = "".join(parsed[f][1] for f in files if f.startswith(DCF_LESSON_PREFIXES)).replace(" ", "")
    saknas = [fig for fig in DCF_EXPECTED_FIGURES if fig not in dcf_blob]
    if saknas:
        R.warn("DCF-tradens nyckeltal saknas i modul 14 (kontrollera efter omskrivning)", [", ".join(saknas)])
    else:
        R.ok("DCF-tradens nyckeltal (473, 1342, 1816) finns kvar i modul 14")

    # ---------------------------------------------------------------- summering
    print("=" * 70)
    print(f"RESULTAT: {R.fails} FAIL, {R.warns} WARN")
    if R.fails == 0:
        print("Alla harda kontroller gick igenom. Granska omdomeslagret ovanpa.")
    else:
        print("Atgarda FAIL innan leverans.")
    print("=" * 70)
    sys.exit(1 if R.fails else 0)

if __name__ == "__main__":
    main()
