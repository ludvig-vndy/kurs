# -*- coding: utf-8 -*-
"""Genererar svensk narration for Fokus kapitel 0-1 med Supertonic (on-device).
Output: WAV per lektion + rost-jamforelse, konverteras till MP3 av anroparen."""
import json, os, sys, time
import numpy as np
from supertonic import TTS

ROOT = "content/fundamental-aktieanalys"
OUT = ".venv-tts/out"
os.makedirs(OUT, exist_ok=True)
SR = 44100

LESSONS = [
    "0.1-oddsen.json", "0.2-varfor-de-flesta-misslyckas.json", "0.3-vad-kursen-lovar.json",
    "1.1-aga-en-aktie.json", "1.2-pris-mot-varde.json",
    "1.3-tidshorisont-och-avkastningskallor.json", "1.4-filosofi-och-kompetenscirkel.json",
]

def parts_of(d):
    out = []
    for step in d.get("steg", []):
        t = step.get("typ")
        if t == "intro" and step.get("ingress"):
            out.append(step["ingress"])
        elif t == "reading":
            if step.get("lead"): out.append(step["lead"])
            out += [p for p in step.get("brodtext", []) if p]
            if step.get("takeaway"): out.append(step["takeaway"])
        elif t == "concept":
            if step.get("titel"): out.append(step["titel"] + ".")
            if step.get("forklaring"): out.append(step["forklaring"])
        elif t == "dataviz":
            if step.get("titel"): out.append(step["titel"] + ".")
            if step.get("underrubrik"): out.append(step["underrubrik"])
            if step.get("slutsats"): out.append(step["slutsats"])
    return out

tts = TTS(auto_download=True)
VOICE = os.environ.get("VOICE", "M3")
style = tts.get_voice_style(voice_name=VOICE)
gap = np.zeros(int(0.35 * SR), dtype=np.float32)

def synth_join(texts):
    chunks = []
    for tx in texts:
        wav, _ = tts.synthesize(text=tx, lang="sv", voice_style=style, total_steps=8, speed=1.02)
        chunks.append(np.asarray(wav, dtype=np.float32).reshape(-1))
        chunks.append(gap)
    return np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)

t0 = time.time()
manifest = []
for fn in LESSONS:
    d = json.load(open(os.path.join(ROOT, fn), encoding="utf-8"))
    texts = [d.get("titel", "") + "."] + parts_of(d)
    wav = synth_join(texts)
    base = fn.replace(".json", "")
    tts.save_audio(wav, os.path.join(OUT, base + ".wav"))
    secs = round(len(wav) / SR, 1)
    manifest.append({"lektion": d.get("lektion"), "titel": d.get("titel"), "fil": base + ".mp3", "sek": secs})
    print(f"[{VOICE}] {base}  {secs}s  (elapsed {round(time.time()-t0)}s)", flush=True)

json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("KLART narration", round(time.time() - t0), "s")

# Rost-jamforelse: samma stycke i alla fem manliga preset-roster.
CMP = ("Ett bra bolag har hog avkastning pa kapitalet och en vallgrav som skyddar den. "
       "Men aven ett fantastiskt bolag ar inget kop utan en felmarginal mot priset.")
for v in ["M1", "M2", "M3", "M4", "M5"]:
    s = tts.get_voice_style(voice_name=v)
    wav, _ = tts.synthesize(text=CMP, lang="sv", voice_style=s, total_steps=8, speed=1.02)
    tts.save_audio(np.asarray(wav, dtype=np.float32).reshape(-1), os.path.join(OUT, f"cmp-{v}.wav"))
    print("cmp", v, flush=True)
print("KLART allt", round(time.time() - t0), "s")
