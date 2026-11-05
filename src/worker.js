/* Serverfunksjonen til vekstskifte.no (Cloudflare Worker).
   Nettsiden ligger som vanlige filer i public/. Denne filen svarer bare på /api/…:
     GET  /api/status     – er KI-delen slått på?
     POST /api/arealer    – Claude finner dyrkningsarealene i brukerens beskrivelse (svar som JSON)
     POST /api/forklaring – Claude forklarer planen (strømmen fra Claude sendes rett videre)
   API-nøkkelen ligger som hemmeligheten ANTHROPIC_API_KEY hos Cloudflare og vises aldri i nettleseren.
   Instruksene til Claude settes sammen her (public/prompter.js), så siden ikke kan brukes som en åpen Claude-tjeneste. */
import KB from "../public/kb.js";
import PR from "../public/prompter.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const MAKS_BODY = 40000;     // tegn i forespørselen
const MAKS_TEKST = 4000;     // tegn i brukerens beskrivelse av arealene
const MAKS_PLAN = 16000;     // tegn i planen som skal forklares

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const feil = (kode, status) => json({ feil: kode }, status);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (url.pathname === "/api/status") return json({ ki: Boolean(env.ANTHROPIC_API_KEY) });
    if (url.pathname !== "/api/arealer" && url.pathname !== "/api/forklaring") return feil("ukjent", 404);
    if (request.method !== "POST") return feil("metode", 405);

    // Bare forespørsler fra selve nettsiden
    if (request.headers.get("origin") !== url.origin) return feil("opprinnelse", 403);
    if (!(request.headers.get("content-type") || "").startsWith("application/json")) return feil("ugyldig", 415);
    if (!env.ANTHROPIC_API_KEY) return feil("ikke_satt_opp", 503);

    // Takt: høyst noen forespørsler i minuttet fra samme adresse, og et tak for alle til sammen
    const ip = request.headers.get("cf-connecting-ip") || "ukjent";
    if (env.TAKT && !(await env.TAKT.limit({ key: ip })).success) return feil("for_mange", 429);
    if (env.TAKT_ALLE && !(await env.TAKT_ALLE.limit({ key: "alle" })).success) return feil("travelt", 429);

    let body;
    try {
      const tekst = await request.text();
      if (tekst.length > MAKS_BODY) return feil("for_stor", 413);
      body = JSON.parse(tekst);
      if (!body || typeof body !== "object") throw new Error();
    } catch {
      return feil("ugyldig", 400);
    }

    try {
      return url.pathname === "/api/arealer" ? await arealer(body, env) : await forklaring(body, env);
    } catch (e) {
      console.error("Uventet feil", e && e.message);
      return feil("server", 500);
    }
  }
};

/* ---------- Hjelpere ---------- */
function osloDato() {
  // «ÅÅÅÅ-MM-DD» i norsk tid
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date());
}
function sesong(startAarFraSiden) {
  const dato = osloDato();
  const aar = Number(dato.slice(0, 4)), mnd = Number(dato.slice(5, 7));
  const egen = mnd >= 8 ? aar + 1 : aar;
  // Nettleserens klokke vinner hvis den er innenfor ett år (rundt nyttår og 1. august kan de være uenige)
  const s = Number(startAarFraSiden);
  const startAar = Number.isInteger(s) && Math.abs(s - egen) <= 1 && s >= aar ? s : egen;
  return { dato, startAar, sesongOver: startAar > aar };
}
const tall = (x) => { const v = Number(x); return Number.isFinite(v) && v > 0 && v < 1000 ? v : null; };
const heltall = (x, min, max, standard) => { const v = Number(x); return Number.isInteger(v) && v >= min && v <= max ? v : standard; };

async function kallClaude(env, payload) {
  return fetch(env.ANTHROPIC_URL || API_URL, {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

// Oversetter feil fra Claude API til korte koder som nettsiden viser som vanlig tekst
async function claudeFeil(r) {
  let tekst = "";
  try { tekst = await r.text(); } catch { /* ingen tekst */ }
  console.error("Claude API svarte", r.status, tekst.slice(0, 300));
  if (/credit balance/i.test(tekst)) return feil("tom_kvote", 503);
  if (r.status === 401 || r.status === 403) return feil("nokkel", 503);
  if (r.status === 429) return feil("travelt", 429);
  if (r.status === 529 || r.status >= 500) return feil("claude_nede", 503);
  return feil("claude", 502);
}

/* ---------- POST /api/arealer ---------- */
async function arealer(body, env) {
  const tekst = String(body.tekst || "").trim().slice(0, MAKS_TEKST);
  if (!tekst) return feil("tom", 400);
  const forrige = (Array.isArray(body.forrige) ? body.forrige : []).slice(0, 40)
    .filter((a) => a && typeof a === "object")
    .map((a) => ({
      id: String(a.id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16),
      navn: String(a.navn || "").slice(0, 60),
      type: ["aker", "karm", "drivhus"].includes(a.type) ? a.type : "aker",
      lengde: tall(a.lengde),
      bredde: tall(a.bredde)
    }));

  const r = await kallClaude(env, {
    model: env.MODELL || PR.MODELL,
    max_tokens: 3000,
    system: PR.arealInstruks(KB, sesong(body.startAar)),
    messages: [{ role: "user", content: PR.arealMelding({ forrige: forrige.length ? JSON.stringify(forrige) : "(ingen ennå)", tekst }) }],
    output_config: { format: { type: "json_schema", schema: PR.arealSkjema(KB) } }
  });
  if (!r.ok) return claudeFeil(r);

  const svar = await r.json();
  if (svar.stop_reason === "refusal") return feil("avvist", 422);
  if (svar.stop_reason === "max_tokens") return feil("for_langt", 422);
  const blokk = (svar.content || []).find((b) => b.type === "text");
  try {
    return json({ svar: JSON.parse(blokk && blokk.text) });
  } catch {
    return feil("format", 502);
  }
}

/* ---------- POST /api/forklaring ---------- */
async function forklaring(body, env) {
  const plan = String(body.plan || "").trim().slice(0, MAKS_PLAN);
  if (!plan) return feil("tom", 400);
  const { startAar } = sesong(body.forsteAar);
  const antallAar = heltall(body.antallAar, 1, 13, 4);

  const r = await kallClaude(env, {
    model: env.MODELL || PR.MODELL,
    max_tokens: 1000,
    stream: true,
    system: PR.forklarInstruks({ antallAar, forsteAar: startAar }),
    messages: [{ role: "user", content: plan }]
  });
  if (!r.ok) return claudeFeil(r);

  // Strømmen fra Claude (server-sent events) sendes rett videre til nettleseren, som plukker ut teksten.
  // Serverfunksjonen gjør ingen jobb per bit: gratisplanen hos Cloudflare gir bare 10 ms regnetid per forespørsel,
  // og det rekker ikke til å pakke om hundrevis av små biter (da ble forklaringen kuttet midt i).
  // text/event-stream og no-transform gjør at Cloudflare sender bitene videre med en gang uten å komprimere dem.
  return new Response(r.body, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", "x-content-type-options": "nosniff" }
  });
}
