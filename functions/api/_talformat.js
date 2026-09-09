/* Bara presentation. Returnerade strangar far aldrig anvandas som operander. */
export function formateraTal(varde, decimaler) {
  let visat;
  if (decimaler == null) visat = Number(varde.toPrecision(12));
  else {
    visat = Number(varde.toFixed(decimaler));
    // En liten positiv/negativ uppgift ska inte se ut som exakt noll.
    if (visat === 0 && varde !== 0) visat = Number(varde.toPrecision(2));
  }
  return String(visat).replace('.', ',');
}
