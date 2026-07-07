// Verifieraren: grinden som gör noll-hallucination till kod i stället för ett löfte.
// Varje tal i narrationen måste gå att härleda till ett extraherat faktum eller en
// beräkning. Ett omatchat tal är ett blockerande fel, oavsett vem som skrev texten.

export function verifiera(text, ex, c) {
  const tillatna = samlaTillatna(ex, c);
  const tokens = hittaTal(text);
  const resultat = [];

  for (const t of tokens) {
    const träff = matcha(t.varde, t.decimaler, tillatna);
    resultat.push({ token: t.rå, varde: t.varde, träff: träff ? träff.kalla : null });
  }

  const omatchade = resultat.filter(r => !r.träff);
  return { ok: omatchade.length === 0, resultat, omatchade };
}

function samlaTillatna(ex, c) {
  const lista = [];
  const lagg = (v, kalla) => { if (typeof v === 'number' && isFinite(v)) lista.push({ v: Math.abs(v), kalla }); };

  for (const [id, f] of Object.entries(ex.fakta)) {
    lagg(f.nu, `fakta:${id}.nu`);
    lagg(f.fjol, `fakta:${id}.fjol`);
  }
  if (ex.guidning) for (const [k, v] of Object.entries(ex.guidning)) lagg(v, `guidning:${k}`);
  for (const [k, v] of Object.entries(c)) lagg(typeof v === 'number' ? v : NaN, `beräknat:${k}`);

  const år = (ex.period || '').match(/\d{4}/);
  if (år) lagg(parseInt(år[0]), 'period:år');

  return lista;
}

function hittaTal(text) {
  const ut = [];
  const re = /(?<![A-Za-zÅÄÖåäö\d])(-?\d{1,3}(?: \d{3})+|-?\d+)(?:,(\d+))?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const heltal = m[1].replace(/\s/g, '');
    const dec = m[2] || '';
    const varde = Math.abs(parseFloat(heltal + (dec ? '.' + dec : '')));
    ut.push({ rå: m[0], varde, decimaler: dec.length });
  }
  return ut;
}

// Exakt likhet, med flyttalsepsilon. Ingen avrundningstolerans: v0 släppte igenom
// ett påhittat "23%" för att verkliga 22,6 avrundade dit. Vill narrationen avrunda
// ett tal ska avrundningen ske i compute-steget och bli ett eget tillåtet värde.
function matcha(varde, decimaler, tillatna) {
  for (const t of tillatna) {
    if (Math.abs(t.v - varde) < 1e-9) return t;
  }
  return null;
}
