// Uttalsnormaliseraren: gör verifierad narrationstext uppläsbar. Siffror skrivs ut
// som ord så att uppläsningen blir densamma oavsett TTS-motor, kronbelopp med
// decimaler blir kronor och öre, procenttecken blir ordet procent, och parenteser
// blir pauskommatering. Körs EFTER noll-hallucinationsgrinden: grinden granskar
// siffertexten, normaliseringen är deterministisk och ändrar aldrig ett värde.

const ENTAL=['noll','ett','två','tre','fyra','fem','sex','sju','åtta','nio','tio','elva','tolv','tretton','fjorton','femton','sexton','sjutton','arton','nitton'];
const TIOTAL=['','','tjugo','trettio','fyrtio','femtio','sextio','sjuttio','åttio','nittio'];
const ORDINAL={1:'första',2:'andra',3:'tredje',4:'fjärde',5:'femte',6:'sjätte',7:'sjunde',8:'åttonde',9:'nionde',10:'tionde',
  11:'elfte',12:'tolfte',13:'trettonde',14:'fjortonde',15:'femtonde',16:'sextonde',17:'sjuttonde',18:'artonde',19:'nittonde',
  20:'tjugonde',21:'tjugoförsta',22:'tjugoandra',23:'tjugotredje',24:'tjugofjärde',25:'tjugofemte',26:'tjugosjätte',
  27:'tjugosjunde',28:'tjugoåttonde',29:'tjugonionde',30:'trettionde',31:'trettioförsta'};

export function talTillOrd(n){
  n=Math.round(n);
  if(n<0)return 'minus '+talTillOrd(-n);
  if(n<20)return ENTAL[n];
  if(n<100){const t=TIOTAL[Math.floor(n/10)],e=n%10;return t+(e?ENTAL[e]:'');}
  if(n<1000){const h=Math.floor(n/100),r=n%100;return ENTAL[h]+'hundra'+(r?talTillOrd(r):'');}
  if(n<1000000){const t=Math.floor(n/1000),r=n%1000;return (t===1?'et':talTillOrd(t))+'tusen'+(r?talTillOrd(r):'');}
  return String(n); // utanför v0:s behov
}

export function ordinal(n){return ORDINAL[n]||talTillOrd(n);}

// Årtal: 2026 -> tjugohundratjugosex (talspråk), 1900-tal -> nittonhundra...
export function arTillOrd(n){
  if(n>=2000&&n<2100){const r=n%100;return 'tjugohundra'+(r?talTillOrd(r):'');}
  if(n>=1900&&n<2000){const r=n%100;return 'nittonhundra'+(r?talTillOrd(r):'');}
  return talTillOrd(n);
}

function decTillOrd(heltal,dec){
  // "9,4" -> nio komma fyra · "1,15" -> ett komma femton · "11,0" -> elva komma noll
  return talTillOrd(parseInt(heltal.replace(/\s/g,'')))+' komma '+talTillOrd(parseInt(dec));
}

export function normaliseraTal(text){
  let t=text;

  // Parenteser blir pauskommatering: "(2 203 miljoner)" -> ", 2 203 miljoner,"
  t=t.replace(/\s*\(([^)]*)\)/g,', $1,');
  t=t.replace(/,\s*([.,])/g,'$1');

  // Kronbelopp med två decimaler: "1,15 kronor" -> "en krona och femton öre"
  t=t.replace(/(\d+),(\d{2}) kronor/g,(m,kr,ore)=>{
    const k=parseInt(kr),o=parseInt(ore);
    const kdel=k===1?'en krona':talTillOrd(k)+' kronor';
    return o===0?kdel:kdel+' och '+talTillOrd(o)+' öre';
  });

  // Kvoter med snedstreck: "nettoskuld/EBITDA" -> "nettoskuld mot EBITDA"
  t=t.replace(/([a-zA-ZåäöÅÄÖ])\/([a-zA-ZåäöÅÄÖ])/g,'$1 mot $2');

  // Multipel-x: "1,4x" -> "1,4 gånger"
  t=t.replace(/(\d+(?:,\d+)?)x\b/g,'$1 gånger');

  // Datum: "den 2 juli" -> "den andra juli"
  t=t.replace(/\bden (\d{1,2}) (januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)/g,
    (m,d,man)=>'den '+ordinal(parseInt(d))+' '+man);

  // Årtal
  t=t.replace(/\b(19|20)(\d{2})\b/g,(m)=>arTillOrd(parseInt(m)));

  // Procent med decimal: "9,4%" -> "nio komma fyra procent"
  t=t.replace(/(\d[\d ]*),(\d+)\s*%/g,(m,h,d)=>decTillOrd(h,d)+' procent');
  // Procent utan decimal: "18%" -> "arton procent"
  t=t.replace(/(\d[\d ]*)\s*%/g,(m,h)=>talTillOrd(parseInt(h.replace(/\s/g,'')))+' procent');

  // Kvarvarande decimaltal: "1,2 procentenheter" -> "ett komma två procentenheter"
  t=t.replace(/(\d[\d ]*),(\d+)/g,(m,h,d)=>decTillOrd(h,d));

  // Kvarvarande heltal, inklusive tusentalsmellanslag: "2 410" -> ord
  t=t.replace(/\d[\d ]*\d|\d/g,(m)=>{
    const v=parseInt(m.replace(/\s/g,''));
    return v<1000000?talTillOrd(v):m;
  });

  // Städning
  t=t.replace(/ {2,}/g,' ').replace(/ ,/g,',');
  return t;
}
