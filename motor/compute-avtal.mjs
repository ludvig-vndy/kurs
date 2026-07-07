// Avtalsklassificeraren, beräkningssteget: proportioner och tidsavstånd i kod.
// Det mest avslöjande talet: hur stort det marknadsförda potentiella värdet är
// i förhållande till de bindande order som faktiskt finns.

export function beraknaAvtal(ex){
  const c={},korskontroll=[];
  const r=(v,d)=>{const k=Math.pow(10,d);return Math.round(v*k)/k;};

  c.antal_besked=ex.pm.length;
  c.antal_bindande=ex.pm.filter(p=>p.klass==='bindande order').length;
  c.antal_loften=ex.pm.filter(p=>p.klass==='ramavtal'||p.klass==='avsiktsförklaring').length;

  const order=ex.pm.find(p=>p.order_varde_mkr!=null);
  const pot=ex.pm.find(p=>p.potential_mkr!=null);
  if(order&&pot)c.potential_mot_order=r(pot.potential_mkr/order.order_varde_mkr,0);

  const loi=ex.pm.find(p=>p.klass==='avsiktsförklaring');
  const sista=ex.pm[ex.pm.length-1];
  if(loi&&loi.datum&&sista&&sista.datum)
    c.manader_sedan_loi=(sista.datum.ar-loi.datum.ar)*12+(sista.datum.manad-loi.datum.manad);

  return {c,korskontroll:null};
}
