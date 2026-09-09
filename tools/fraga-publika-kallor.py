"""Hämta daterade offentliga primärkällor; ingen modell eller facit används."""
import hashlib, json, pathlib, sys, io, subprocess
from pypdf import PdfReader

SOURCES = [
    dict(id='volvo', namn='Volvo Group', datum='2025-07-17', rubrik='Volvokoncernen Q2 2025 och första sex månaderna 2025',
         url='https://www.volvogroup.com/content/dam/volvo-group/markets/master/investors/reports-and-presentations/interim-reports/2025/volvo-group-q2-2025-sve.pdf'),
    dict(id='traton', namn='TRATON', datum='2025-07-25', rubrik='TRATON GROUP half-year report H1 2025: increases incoming orders significantly',
         url='https://traton.com/dam/jcr%3A6d54adb9-744d-4bc8-81ed-0b5b46cb5678/pm-traton-group-increases-incoming-orders-significantly-in-a-mixed-first-half-of-2025.pdf'),
]
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
docs = []
for source in SOURCES:
    data = subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                           '--max-time', '60', '--user-agent', 'Mozilla/5.0', source['url']], check=True, capture_output=True).stdout
    if not data.startswith(b'%PDF'): raise ValueError('Inte PDF')
    reader = PdfReader(io.BytesIO(data))
    pages = [page.extract_text(extraction_mode='layout') for page in reader.pages]
    if any(not text.strip() for text in pages): raise ValueError('Tom sida')
    (out / (source['id'] + '.pdf')).write_bytes(data)
    docs.append(dict(source, sha256=hashlib.sha256(data).hexdigest(), pages=pages))
    print(json.dumps(dict(id=source['id'], sha256=docs[-1]['sha256'], pages=len(pages))))
(out / 'sources.json').write_text(json.dumps(docs, ensure_ascii=False), encoding='utf8')
