/* functions/api/upptack-insyn.js  —  serverar Upptäcks insynsdata ur KV.

   Datan skrivs dagligen av den schemalagda Workern "upptack-cron"
   (worker-upptack/) till KV-nyckeln "upptack-insyn". Här läses den och
   serveras till Upptäck-sidan. Publik data (FI:s insynsregister), så svaret
   får cachas. Ingen ombyggnad av sajten behövs när datan uppdateras.
*/
const KV_KEY = "upptack-insyn";

export async function onRequestGet(context) {
  const { env } = context;
  const H = {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  };

  if (!env.DATA) return new Response(JSON.stringify({ fel: "KV ej bunden." }), { status: 501, headers: H });

  const cur = await env.DATA.get(KV_KEY);
  if (!cur) return new Response(JSON.stringify({ fel: "Ingen insynsdata ännu." }), { status: 404, headers: H });
  return new Response(cur, { headers: H });
}
