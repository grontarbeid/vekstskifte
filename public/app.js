/* Generert fra kilde/mal.html med kilde/bygg.py – rediger malen, ikke denne filen. */
(function () {
  "use strict";
  const KB = window.VEKSTSKIFTE_KB;
  const V = window.Vekstskifte;
  const PR = window.VEKSTSKIFTE_PROMPTER;
  const MODELL = PR.MODELL;
  // NETT er sann på vekstskifte.no (Claude via serverfunksjonen), usann i prototypen som kjører inne i Claude
  const NETT = true;
  const I_DAG = new Date();
  const DATO = I_DAG.toISOString().slice(0, 10);
  const SESONG_OVER = I_DAG.getMonth() >= 7; // august eller senere
  const DETTE_AAR = I_DAG.getFullYear();
  const START_AAR = SESONG_OVER ? DETTE_AAR + 1 : DETTE_AAR;
  const I_AAR = START_AAR - 1;
  // «Sist sesong» stemmer hele året: fra august er det årets sesong, fra januar til juli fjorårets (I_AAR)
  const SESONG_ORD = "sist sesong";
  const MAKS_SKIFTER = 12;
  const MIN_PAUSE = Math.min(...Object.values(window.VEKSTSKIFTE_KB.familier).filter((f) => f.klasse > 0).map((f) => f.minPause));
  const vekstAv = Object.assign(Object.create(null), Object.fromEntries(KB.vekster.map((v) => [v.id, v])));
  const ETTAARIGE = KB.vekster.filter((v) => !v.flerarig);
  const FLERARIGE = KB.vekster.filter((v) => v.flerarig);
  const FAMILIER = Object.values(KB.familier).filter((f) => f.klasse > 0).sort((a, b) => a.rekkefolge - b.rekkefolge);
  const TYPER = [
    { id: "aker", navn: "Åker eller bed i bakken" },
    { id: "karm", navn: "Pallekarm eller oppbygd bed" },
    { id: "drivhus", navn: "Drivhus eller potter" }
  ];
  const $ = (id) => document.getElementById(id);

  /* ---------- Eksempel ---------- */
  const EKS_FORKLARING = "Planen flytter grønnsakene til et nytt skifte hvert år. Da får ikke sykdommer og skadedyr som hører til hver plantefamilie, samle seg i jorda.\n- Neste år ({A1}) får skifte 1 på åkeren erter, skifte 2 løk og gulrot, skifte 3 salat og skifte 4 hodekål.\n- Hodekålen kommer etter ertene i skifte 4. Næringskrevende vekster får godt utbytte av erter og bønner året før.\n- Potetene flytter til pallekarmen, der salaten sto {SIST}. Salat er en god forgrøde for potet, men i en pallekarm får du plass til færre planter.\n- Løk og gulrot deler skifte, fordi du har flere plantefamilier enn skifter.\n- Jordbærdelen i enden av åkeren står fast og er ikke med i omgangen.\nStemmer noe ikke, kan du endre valgene over og lage planen på nytt.";
  const eksForklaring = () => EKS_FORKLARING.split("{A1}").join(String(START_AAR)).split("{SIST}").join(SESONG_ORD);
  const EKS_JEVNT = "Her ser du eksempelet med et jevnt mønster: hver gruppe flytter ett skifte videre hvert år. Det er lettere å huske, men gir litt dårligere vekstskifte enn den vanlige planen i dette eksempelet. Se merknadene ved planen.\nNår du lager din egen plan, skriver Claude en forklaring som passer til den.";
  function eksempel() {
    return {
      eksempel: true, fraEksempel: true,
      arealTekst: "Jeg har en grønnsaksåker på 8 × 2 meter bak garasjen. I den ene enden, på ca. 2 meter av lengden, står jordbærplantene. I tillegg har jeg en pallekarm ved terrassen.",
      forstaelse: "Du har to dyrkningsarealer: en grønnsaksåker på 8 × 2 meter bak garasjen, der jordbærene står fast på ca. 2 meter i den ene enden, og en pallekarm ved terrassen.",
      sporsmal: [],
      arealer: [
        { id: "a1", navn: "Åkeren", type: "aker", lengde: 8, bredde: 2, skifter: 4, fast: [{ vekst: "jordbaer", lengde: 2 }], skifteLengder: null },
        { id: "a2", navn: "Pallekarmen", type: "karm", lengde: null, bredde: null, skifter: 1, fast: [], skifteLengder: null }
      ],
      onsker: ["potet", "hodekal", "gulrot", "kepalok", "ert", "salat"],
      iAar: {
        "a1-1": { status: "vekster", vekster: ["potet"], fast: [] },
        "a1-2": { status: "vekster", vekster: ["hodekal"], fast: [] },
        "a1-3": { status: "vekster", vekster: ["gulrot", "kepalok"], fast: [] },
        "a1-4": { status: "vekster", vekster: ["ert"], fast: [] },
        "a2": { status: "vekster", vekster: ["salat"], fast: [] }
      },
      visAlle: {}, plan: null, forklaring: "", valgt: null, opptatt: false
    };
  }
  function tom() {
    return { eksempel: false, fraEksempel: false, arealTekst: "", forstaelse: "", sporsmal: [], arealer: [], onsker: [], iAar: {}, visAlle: {}, plan: null, forklaring: "", valgt: null, opptatt: false };
  }

  let S = eksempel();
  let ki = null;          // kontakten med Claude, eller null når KI-delen ikke er tilgjengelig
  let ctl = null;
  let regner = false;
  let nesteId = 1;

  /* ---------- Hjelpere ---------- */
  function el(tag, attrs, ...barn) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v;
      else if (k === "style") { if (v) e.style.cssText = v; }
      else if (k === "value") e.value = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
    }
    for (const b of barn.flat()) if (b != null && b !== "") e.append(b.nodeType ? b : document.createTextNode(String(b)));
    return e;
  }
  const famFarge = (fid) => `var(--f-${fid}, var(--f-fyll))`;
  const vekstNavn = (ids) => ids.map((v) => vekstAv[v] ? vekstAv[v].navn : v).join(", ");
  const tall = (x) => (Math.round(x * 10) / 10).toLocaleString("nb-NO");
  function velgKnapp(tekst, pa, onclick, ekstraKlasse, ekstra) {
    return el("button", Object.assign({ class: "velg" + (ekstraKlasse ? " " + ekstraKlasse : ""), "aria-pressed": pa ? "true" : "false", onclick, type: "button" }, ekstra || {}), tekst);
  }
  function iAarFor(id) {
    if (!S.iAar[id]) S.iAar[id] = { status: "ukjent", vekster: [], fast: [] };
    return S.iAar[id];
  }
  let forklarer = false;
  function endret() {
    if (forklarer && ctl) ctl.abort(); // forklaringen gjelder ikke lenger
    if (S.eksempel) S.eksempel = false;
    S.plan = null; S.forklaring = ""; S.valgt = null;
  }

  /* ---------- Arealer og skifter ---------- */
  function delbar(a) { return a.type === "aker"; }
  function maalAv(a) { return a.lengde && a.bredde ? { lang: Math.max(a.lengde, a.bredde), kort: Math.min(a.lengde, a.bredde) } : null; }
  function fastMeter(a) { return (a.fast || []).reduce((s, f) => s + (f.lengde || 0), 0); }
  // Lengden som er igjen til skifter som går på omgang. Ukjent (null) hvis mål eller lengden på en fast del mangler.
  function ledigLengde(a) {
    const m = maalAv(a);
    if (!m || (a.fast || []).some((f) => !f.lengde)) return null;
    return m.lang - fastMeter(a);
  }
  const forLang = (a) => delbar(a) && (a.fast || []).length > 0 && ledigLengde(a) !== null && ledigLengde(a) <= 0.05;
  function skifteLengderFor(a) {
    const n = a.skifter || 0, L = ledigLengde(a);
    if (!n || L == null || L <= 0.05) return null;
    if (a.skifteLengder && a.skifteLengder.length === n) return a.skifteLengder;
    return Array(n).fill(L / n);
  }
  // Fordel N karmer på T skifter så jevnt som mulig (4 på 2 gir 2 + 2, 5 på 2 gir 3 + 2)
  function karmGrupper(N, T) {
    const base = Math.floor(N / T), ekstra = N % T;
    return Array.from({ length: T }, (_, g) => base + (g < ekstra ? 1 : 0));
  }
  const karmOrd = (a, n) => /bed/i.test(a.navn) ? "bed" : (n === 1 ? "karm" : "karmer");
  const storrelseAvM2 = (m2) => m2 < 4 ? "liten" : m2 <= 10 ? "middels" : "stor";
  function anbefaltSkifter(a) {
    if (!delbar(a)) return 1;
    const m = maalAv(a), L = ledigLengde(a);
    const m2 = m ? L * m.kort : null;
    if (m2 !== null && m2 < 2) return 1;
    if (m2 !== null && m2 < 4) return 2;
    return 4;
  }
  /* Stedene regelmotoren planlegger for: ett per skifte */
  function steder() {
    const ut = [];
    for (const a of S.arealer) {
      if (a.type === "drivhus") { ut.push({ id: a.id, navn: a.navn, storrelse: "ukjent", iVekstskifte: false, grunn: "drivhus eller potter", areal: a.id, maal: "" }); continue; }
      const m = maalAv(a);
      if (a.type === "aker") (a.fast || []).forEach((f, i) => {
        const vn = vekstAv[f.vekst].navn;
        ut.push({ id: `${a.id}-f${i + 1}`, navn: `${a.navn}, ${vn.toLowerCase()}`, storrelse: "ukjent", iVekstskifte: false, grunn: vn.toLowerCase() + " står fast", areal: a.id, fastVekst: f.vekst, maal: m && f.lengde ? `ca. ${tall(f.lengde)} × ${tall(m.kort)} m` : "" });
      });
      const n = a.skifter || 0;
      if (!n) continue;
      if (a.type === "karm") {
        // a.skifter er antall skifter karmene utgjør til sammen: 1..N (karmer slås sammen), N (én per karm) eller 2N (hver delt i to)
        const N = Math.max(1, a.antall || 1), T = n;
        if (T === 2 * N) {
          for (let i = 1; i <= N; i++) {
            const base = N > 1 ? `${a.navn}, nr. ${i}` : a.navn, idb = N > 1 ? `${a.id}-k${i}` : a.id;
            for (let k = 1; k <= 2; k++) ut.push({ id: `${idb}-${k}`, navn: `${base}, del ${k}`, storrelse: m ? storrelseAvM2((m.lang / 2) * m.kort) : "liten", iVekstskifte: true, grunn: "", areal: a.id, maal: m ? `ca. ${tall(m.lang / 2)} × ${tall(m.kort)} m` : "" });
          }
        } else if (T >= N) {
          for (let i = 1; i <= N; i++) ut.push({ id: N > 1 ? `${a.id}-k${i}` : a.id, navn: N > 1 ? `${a.navn}, nr. ${i}` : a.navn, storrelse: m ? storrelseAvM2(m.lang * m.kort) : "liten", iVekstskifte: true, grunn: "", areal: a.id, maal: m ? `${tall(m.lang)} × ${tall(m.kort)} m` : "" });
        } else {
          karmGrupper(N, T).forEach((cnt, g) => {
            const m2 = m ? cnt * m.lang * m.kort : null;
            ut.push({ id: T === 1 ? a.id : `${a.id}-g${g + 1}`, navn: T === 1 ? a.navn : `${a.navn}, skifte ${g + 1}`, storrelse: m2 != null ? storrelseAvM2(m2) : "liten", iVekstskifte: true, grunn: "", areal: a.id,
              maal: m ? `${cnt} ${karmOrd(a, cnt)} à ${tall(m.lang)} × ${tall(m.kort)} m = ${tall(m2)} m²` : `${cnt} ${karmOrd(a, cnt)}` });
          });
        }
        continue;
      }
      const L = skifteLengderFor(a);
      for (let k = 1; k <= n; k++) {
        const len = L ? L[k - 1] : null;
        const storrelse = len != null ? storrelseAvM2(len * m.kort) : "ukjent";
        const maal = len != null ? `ca. ${tall(len)} × ${tall(m.kort)} m` : "";
        const navn = n === 1 ? ((a.fast || []).length ? `${a.navn}, grønnsaksdelen` : a.navn) : `${a.navn}, skifte ${k}`;
        ut.push({ id: n === 1 ? a.id : `${a.id}-${k}`, navn, storrelse, iVekstskifte: true, grunn: "", areal: a.id, maal });
      }
    }
    return ut;
  }
  function settSkifter(a, n) {
    if (a.skifter === n) return;
    endret();
    // Glem valg i steg 4 for skiftene som forsvinner eller endrer betydning
    for (const id of Object.keys(S.iAar)) if (id === a.id || id.startsWith(a.id + "-")) delete S.iAar[id];
    a.skifter = n;
    a.skifteLengder = null;
    visAlt();
  }
  function settType(a, t) {
    if (a.type === t) return;
    endret();
    a.type = t;
    for (const id of Object.keys(S.iAar)) if (id === a.id || id.startsWith(a.id + "-")) delete S.iAar[id];
    if (t !== "aker") { a.fast = []; a.skifteLengder = null; } // faste deler finnes bare på åker
    a.skifter = t === "drivhus" ? 0 : t === "karm" ? Math.max(1, a.antall || 1) : null;
    visAlt();
  }

  function tilstand() {
    const st = steder();
    const rot = st.filter((s) => s.iVekstskifte && !(S.iAar[s.id] && S.iAar[s.id].fast.length));
    const uvalgte = S.arealer.filter((a) => delbar(a) && !a.skifter);
    const forLange = S.arealer.filter(forLang);
    const rot2 = st.filter((s) => s.iVekstskifte).length; // skifter fra steg 2 (før noe merkes som fast i steg 4)
    const skifterKlare = S.arealer.length > 0 && uvalgte.length === 0;
    // Hva som eventuelt er galt med skifteinndelingen i steg 2
    const steg2Feil = !S.arealer.length ? null : uvalgte.length ? `Velg antall skifter for ${uvalgte.map((a) => "«" + a.navn + "»").join(" og ")}.`
      : forLange.length ? `De faste delene tar hele lengden av ${forLange.map((a) => "«" + a.navn + "»").join(" og ")}. Gjør dem kortere, eller rett målene i steg 1.`
      : rot2 === 0 ? "Minst ett skifte må være med i vekstskiftet. Drivhus og potter teller ikke."
      : rot2 > MAKS_SKIFTER ? `Verktøyet klarer opptil ${MAKS_SKIFTER} skifter, og nå er det ${rot2}. Velg færre skifter.` : null;
    return { st, rot, uvalgte, forLange, rot2, steg2Feil, harArealer: S.arealer.length > 0, skifterKlare, skifterOk: skifterKlare && !steg2Feil, harOnsker: S.onsker.length > 0 };
  }

  /* ---------- Navigasjon og steg ---------- */
  function gaaTil(id) {
    const m = $(id);
    if (!m) return;
    // Ligger målet i den andre fanen, bytt fane først
    const fane = m.closest("#fane-plan, #fane-laer");
    if (fane && fane.hidden) visFane(fane.id === "fane-laer" ? "laer" : "plan");
    if (m.hidden) return;
    if (id === "kb-panel") $("kb").open = true;
    m.scrollIntoView({ behavior: "smooth", block: "start" });
    const h = m.querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function manglerBoks(tekst, knappTekst, til) {
    return el("div", { class: "mangler" }, el("span", { text: tekst }), el("button", { type: "button", onclick: () => gaaTil(til) }, knappTekst));
  }

  function oppdaterSteg() {
    const T = tilstand();
    const steg = S.plan ? 5 : !T.harArealer ? 1 : !T.skifterOk ? 2 : !T.harOnsker ? 3 : 4;
    ["steg1", "steg2", "steg3", "steg4", "steg5"].forEach((id, i) => { $(id).className = i + 1 < steg ? "ferdig" : i + 1 === steg ? "aktiv" : ""; });
    document.querySelectorAll(".eks-merke").forEach((b) => { b.hidden = !S.eksempel; });
    $("eks-banner").hidden = !S.fraEksempel;
    $("iaar-tekst").textContent = SESONG_ORD + " (" + I_AAR + ")";
    $("finn").disabled = S.opptatt || !ki;
    $("videre-1").hidden = !T.harArealer;

    // Steg 2: videre
    const v2 = $("videre-2");
    if (!T.harArealer) v2.replaceChildren(manglerBoks("Beskriv dyrkningsarealene dine i steg 1 først.", "Gå til steg 1", "sek-1"));
    else if (T.steg2Feil) v2.replaceChildren(el("span", { class: "hint" + (T.uvalgte.length ? "" : " varsel"), text: T.steg2Feil }));
    else v2.replaceChildren(el("button", { class: "primar", type: "button", onclick: () => gaaTil("sek-3") }, "Videre til grønnsakene"));

    // Steg 3: videre
    const v3 = $("videre-3");
    if (!T.harArealer) v3.replaceChildren(manglerBoks("Du må også beskrive dyrkningsarealene dine i steg 1.", "Gå til steg 1", "sek-1"));
    else if (!T.skifterOk) v3.replaceChildren(manglerBoks(T.uvalgte.length ? "Du må også velge hvor mange skifter arealene skal deles i." : "Skifteinndelingen i steg 2 må rettes først.", "Gå til steg 2", "sek-2"));
    else v3.replaceChildren(el("button", { class: "primar", type: "button", disabled: !T.harOnsker, onclick: () => gaaTil("sek-4") }, "Videre: hva sto hvor " + SESONG_ORD), T.harOnsker ? "" : el("span", { class: "hint", text: "Velg minst én grønnsak først." }));

    // Steg 4: lag planen
    const kan = T.skifterOk && T.rot.length > 0 && T.harOnsker && !S.opptatt && !regner && T.rot.length <= MAKS_SKIFTER;
    $("lagplan").disabled = !kan;
    $("lagplan-hint").textContent = regner ? "Regner ut planen …" : !T.harArealer ? "" : !T.skifterOk ? "" : !T.rot.length ? "Minst ett skifte må være med i vekstskiftet." : T.rot.length > MAKS_SKIFTER ? `Verktøyet klarer opptil ${MAKS_SKIFTER} skifter. Del arealene i færre skifter.` : !T.harOnsker ? "" : S.plan ? "" : "Planen lages med en gang. Forklaringen tar litt lenger tid.";
    $("lagplan-mangler").replaceChildren(
      !T.harArealer ? manglerBoks("Beskriv dyrkningsarealene dine i steg 1 først.", "Gå til steg 1", "sek-1") :
      !T.skifterOk ? manglerBoks(T.uvalgte.length ? "Velg hvor mange skifter arealene skal deles i." : "Skifteinndelingen i steg 2 må rettes først.", "Gå til steg 2", "sek-2") :
      !T.harOnsker ? manglerBoks("Velg minst én grønnsak.", "Gå til steg 3", "sek-3") : "");
  }

  /* ---------- Steg 1: arealer ---------- */
  function visArealer() {
    $("forstod").hidden = !S.forstaelse;
    $("forstod-tekst").textContent = S.forstaelse;
    $("forstod-sporsmal").replaceChildren(...S.sporsmal.map((q) => el("li", { text: q })));
    $("forstod-sporsmal").hidden = !S.sporsmal.length;
    const boks = $("arealer");
    boks.replaceChildren();
    $("arealer-boks").hidden = !S.arealer.length;
    $("arealer-tittel").textContent = S.arealer.length === 1 ? "Arealet ditt" : `Arealene dine (${S.arealer.length})`;
    for (const a of S.arealer) {
      const maal = (felt, etikett) => el("input", { type: "number", min: "0", step: "0.1", inputmode: "decimal", value: a[felt] != null ? String(a[felt]) : "", "aria-label": etikett + " i meter", id: felt + "-" + a.id,
        onchange: (e) => { const v = parseFloat(String(e.target.value).replace(",", ".")); const ny = Number.isFinite(v) && v > 0 ? Math.min(v, 999) : null; if (ny === a[felt]) { visAlt(); return; } a[felt] = ny; a.skifteLengder = null; endret(); visAlt(); } });
      boks.append(el("div", { class: "sted-kort" + (a.type === "drivhus" ? " av" : "") },
        el("input", { type: "text", value: a.navn, "aria-label": "Navn på arealet", id: "navn-" + a.id,
          onchange: (e) => { a.navn = e.target.value.trim() || a.navn; endret(); visAlt(); } }),
        el("div", { class: "smaa" }, TYPER.map((t) => velgKnapp(t.navn, a.type === t.id, () => settType(a, t.id), "liten"))),
        a.type === "drivhus" ? el("span", { class: "under", text: "Ikke med i vekstskiftet." }) :
          el("div", { class: "smaa" }, el("span", { class: "lab", text: a.type === "karm" && (a.antall || 1) > 1 ? "Mål på hver (valgfritt):" : "Mål (valgfritt):" }), maal("lengde", "Lengde"), "×", maal("bredde", "Bredde"), el("span", { class: "lab", text: "m" })),
        a.type === "karm" ? el("div", { class: "smaa" }, el("span", { class: "lab", text: "Antall:" }),
          el("input", { type: "number", min: "1", max: "20", step: "1", inputmode: "numeric", id: "antall-" + a.id, "aria-label": "Antall karmer eller bed", value: String(a.antall || 1),
            onchange: (e) => { const v = Math.round(Number(e.target.value)); const ny = Number.isFinite(v) && v >= 1 ? Math.min(20, v) : 1; if (ny === (a.antall || 1)) { visAlt(); return; } a.antall = ny; a.skifter = a.antall; endret(); for (const id of Object.keys(S.iAar)) if (id === a.id || id.startsWith(a.id + "-")) delete S.iAar[id]; visAlt(); } })) : "",
        el("div", { class: "smaa" }, el("button", { class: "fjern", type: "button", onclick: () => { endret(); S.arealer = S.arealer.filter((x) => x !== a); for (const id of Object.keys(S.iAar)) if (id === a.id || id.startsWith(a.id + "-")) delete S.iAar[id]; visAlt(); } }, "Fjern"))));
    }
  }
  function leggTilAreal() {
    endret();
    let id = "m" + (nesteId++);
    while (S.arealer.some((x) => x.id === id)) id = "m" + (nesteId++);
    S.arealer.push({ id, navn: "Areal " + (S.arealer.length + 1), type: "aker", lengde: null, bredde: null, skifter: null, fast: [], skifteLengder: null });
    visAlt();
    const inp = $("navn-" + id);
    if (inp) { inp.focus(); inp.select(); }
  }

  /* ---------- Steg 2: skifter ---------- */
  function nullstillAreal(a) { for (const id of Object.keys(S.iAar)) if (id === a.id || id.startsWith(a.id + "-")) delete S.iAar[id]; }
  function tallInput(id, verdi, etikett, onchange) {
    return el("input", { type: "number", min: "0", step: "0.1", inputmode: "decimal", id, "aria-label": etikett, value: verdi != null ? String(Math.round(verdi * 10) / 10) : "",
      onchange: (e) => { const v = parseFloat(String(e.target.value).replace(",", ".")); onchange(Number.isFinite(v) && v > 0 ? v : null); } });
  }
  function visSkifter() {
    const boks = $("skifter");
    boks.replaceChildren();
    if (!S.arealer.length) { boks.append(manglerBoks("Arealene dine dukker opp her når du har beskrevet dem i steg 1.", "Gå til steg 1", "sek-1")); $("skifte-sum").textContent = ""; return; }
    const rotTotal = steder().filter((s) => s.iVekstskifte).length;
    for (const a of S.arealer) {
      const m = maalAv(a);
      const kort = el("div", { class: "skifte-kort" + (delbar(a) && !a.skifter ? " mangler-valg" : "") });
      kort.append(el("span", { class: "navn", text: a.navn + (m ? ` (${tall(m.lang)} × ${tall(m.kort)} m)` : "") }));
      if (a.type === "drivhus") { kort.append(el("span", { class: "under", text: "Drivhus og potter er ikke med i vekstskiftet." })); boks.append(kort); continue; }
      if (a.type === "karm") {
        const antall = Math.max(1, a.antall || 1);
        const erBed = /bed/i.test(a.navn);
        if (antall > 1) {
          const valg = [...Array.from({ length: antall }, (_, i) => i + 1), 2 * antall];
          kort.append(el("p", { class: "sporsmal-t", text: `Dette er ${antall} ${erBed ? "oppbygde bed" : "pallekarmer"}. Hvor mange skifter skal de være til sammen? Vanligvis er hver av dem ett skifte, men du kan slå flere sammen eller dele hver i to.` }),
            el("div", { class: "smaa" }, valg.map((t) => velgKnapp(t === antall ? `${t} (én per ${erBed ? "bed" : "karm"})` : t === 2 * antall ? `${t} (hver delt i to)` : t === 1 ? "1 (alle sammen)" : String(t), a.skifter === t, () => settSkifter(a, t), "tall"))));
        } else {
          kort.append(el("p", { class: "sporsmal-t", text: erBed ? "Et oppbygd bed er ett skifte. Vil du heller dele det i to, velger du 2." : "En pallekarm er ett skifte. Vil du heller dele den i to, velger du 2." }),
            el("div", { class: "smaa" }, [1, 2].map((n) => velgKnapp(String(n), a.skifter === n, () => settSkifter(a, n), "tall"))));
        }
      } else {
        // Faste deler
        kort.append(el("p", { class: "sporsmal-t", text: "Står noe fast på en del av arealet, som jordbær eller rabarbra?" }),
          el("div", { class: "smaa" }, velgKnapp("Nei", !a.fast.length, () => { if (!a.fast.length) return; endret(); a.fast = []; a.skifteLengder = null; visAlt(); }, "liten stille"),
            FLERARIGE.map((v) => velgKnapp(v.navn, a.fast.some((f) => f.vekst === v.id), () => {
              endret();
              a.fast = a.fast.some((f) => f.vekst === v.id) ? a.fast.filter((f) => f.vekst !== v.id) : [...a.fast, { vekst: v.id, lengde: null }];
              a.skifteLengder = null; visAlt();
            }, "liten"))));
        if (a.fast.length) {
          kort.append(el("div", { class: "lengder" }, a.fast.map((f) => el("label", null, `${vekstAv[f.vekst].navn} tar ca.`,
            tallInput(`fast-${a.id}-${f.vekst}`, f.lengde, `Hvor mange meter av lengden ${vekstAv[f.vekst].navn.toLowerCase()} tar`, (v) => { endret(); f.lengde = v; a.skifteLengder = null; visAlt(); }),
            m ? `m av de ${tall(m.lang)} meterne` : "m av lengden"))));
          const L = ledigLengde(a);
          const navn = a.fast.map((f) => vekstAv[f.vekst].navn.toLowerCase());
          if (forLang(a)) kort.append(el("span", { class: "under varsel", text: `De faste delene tar ${tall(fastMeter(a))} m, men arealet er bare ${tall(m.lang)} m langt. Da er det ingenting igjen til skifter som går på omgang. Gjør de faste delene kortere, eller rett målene i steg 1.` }));
          else kort.append(el("span", { class: "under", text: `Delen med ${navn.join(" og ")} er et eget skifte som står fast. ${L != null ? `Det som er igjen, ca. ${tall(L)} × ${tall(m.kort)} m, deler du i skifter som går på omgang.` : "Resten deler du i skifter som går på omgang."}` }));
          // Fagtekst bare for de egne flerårige familiene (jordbær o.l.), ikke familietekst for ettårige slektninger
          const fagtekster = [...new Set(a.fast.map((f) => KB.familier[vekstAv[f.vekst].familie]).filter((F) => F.klasse === 0 && F.grunn).map((F) => F.grunn))];
          for (const g of fagtekster) kort.append(el("span", { class: "under", text: g }));
        }
        // Antall skifter
        const anb = anbefaltSkifter(a);
        const hva = a.fast.length ? "resten" : (/^(åker|bed)/i.test(a.navn) ? a.navn.toLowerCase() : "«" + a.navn + "»");
        kort.append(el("p", { class: "sporsmal-t", text: `Hvor mange skifter vil du dele ${hva} i?` }),
          el("div", { class: "smaa" }, [1, 2, 3, 4, 5, 6].map((n) => velgKnapp(n === anb ? `${n} (vanlig)` : String(n), a.skifter === n, () => settSkifter(a, n), "tall"))));
      }
      if (a.skifter && a.type === "karm") {
        const T = a.skifter, N = Math.max(1, a.antall || 1);
        const erBed = /bed/i.test(a.navn);
        const fl = erBed ? "bed" : "karmer";
        const m = maalAv(a);
        const grupper = [];
        if (T === 2 * N) for (let i = 1; i <= N; i++) { grupper.push(el("div", { class: "gr", style: "flex-grow:1" }, el("span", { text: N === 1 ? "1" : `${i}a` }))); grupper.push(el("div", { class: "gr", style: "flex-grow:1" }, el("span", { text: N === 1 ? "2" : `${i}b` }))); }
        else if (T >= N) for (let i = 1; i <= N; i++) grupper.push(el("div", { class: "gr", style: "flex-grow:1" }, el("span", { text: N === 1 ? "1 skifte" : String(i) })));
        else karmGrupper(N, T).forEach((cnt, g) => grupper.push(el("div", { class: "gr", style: `flex-grow:${cnt}` }, Array.from({ length: cnt }, () => el("span", { text: String(g + 1) })))));
        kort.append(el("div", { class: "strip karm", "aria-hidden": "true" }, grupper));
        let tekst;
        if (T === 2 * N) {
          tekst = N === 1 ? `${erBed ? "Bedet" : "Karmen"} deles i to skifter${m ? ` på ca. ${tall(m.lang / 2)} × ${tall(m.kort)} m` : ""}.`
                          : `${N} ${fl} gir ${2 * N} skifter${m ? `, hvert på ca. ${tall(m.lang / 2)} × ${tall(m.kort)} m` : ""}.`;
        } else if (T >= N) {
          tekst = N === 1 ? `Hele ${erBed ? "bedet" : "karmen"} er ett skifte${m ? ` (${tall(m.lang)} × ${tall(m.kort)} m)` : ""}.`
                          : `${N} ${fl} gir ${N} skifter${m ? `, hvert på ${tall(m.lang)} × ${tall(m.kort)} m` : ""}.`;
        } else {
          const gr = karmGrupper(N, T);
          const m2 = (c) => m ? tall(c * m.lang * m.kort) : null;
          if (T === 1) tekst = `${N} ${fl}${m ? ` à ${tall(m.lang)} × ${tall(m.kort)} m` : ""} blir ett skifte${m ? ` på til sammen ${m2(N)} m²` : ""}.`;
          else if (gr.every((c) => c === gr[0])) tekst = `${N} ${fl} blir ${T} skifter med ${gr[0]} ${karmOrd(a, gr[0])} i hvert${m ? `, ${m2(gr[0])} m² per skifte` : ""}.`;
          else tekst = `${N} ${fl} blir ${T} skifter: ${gr.map((c, g) => `skifte ${g + 1} med ${c}${m ? ` (${m2(c)} m²)` : ""}`).join(", ")}. Det året en gruppe står på det minste skiftet, får du mindre av de grønnsakene.`;
          if (!m) tekst += " Oppgi målene i steg 1, så regnes størrelsen ut.";
        }
        kort.append(el("span", { class: "under", text: tekst }));
      } else if (a.skifter) {
        const n = a.skifter, L = skifteLengderFor(a);
        const deler = [
          ...(a.fast || []).map((f) => el("span", { class: "fast", style: `flex-grow:${f.lengde || 1}`, text: vekstAv[f.vekst].navn })),
          ...Array.from({ length: n }, (_, k) => el("span", { style: `flex-grow:${L ? Math.max(0.2, L[k]) : 1}`, text: n === 1 ? "1 skifte" : String(k + 1) }))
        ];
        kort.append(el("div", { class: "strip", "aria-hidden": "true" }, deler));
        if (n === 1) kort.append(el("span", { class: "under", text: `${a.fast.length ? "Resten" : "Hele arealet"} er ett skifte${L ? ` (ca. ${tall(L[0])} × ${tall(m.kort)} m)` : ""}. ${rotTotal === 1 ? "Da står samme grønnsaker der hvert år, så del gjerne opp mer." : "Det går på omgang med de andre skiftene dine."}` }));
        else {
          if (L) {
            const ledig = ledigLengde(a);
            if (!a.skifteLengder) {
              kort.append(el("div", { class: "smaa" }, el("span", { class: "under", text: `Like store skifter blir ca. ${tall(ledig / n)} × ${tall(m.kort)} m hver.` }),
                el("button", { class: "lenke", type: "button", onclick: () => { endret(); a.skifteLengder = Array(n).fill(Math.round((ledig / n) * 10) / 10); visAlt(); } }, "Gi skiftene ulik størrelse")));
            } else {
              kort.append(el("div", { class: "lengder" }, a.skifteLengder.map((len, k) => el("label", null, `Skifte ${k + 1}:`,
                tallInput(`len-${a.id}-${k}`, len, `Lengde på skifte ${k + 1} i meter`, (v) => { endret(); a.skifteLengder[k] = v || 0.1; visAlt(); }), "m"))));
              const sum = a.skifteLengder.reduce((s, x) => s + x, 0);
              const avvik = Math.abs(sum - ledig) > 0.05;
              kort.append(el("div", { class: "smaa" }, el("span", { class: "under" + (avvik ? " varsel" : ""), text: `Til sammen ${tall(sum)} m av ${tall(ledig)} m${avvik ? ". Juster så det går opp." : "."}` }),
                el("button", { class: "lenke", type: "button", onclick: () => { endret(); a.skifteLengder = null; visAlt(); } }, "Gjør dem like store igjen")));
            }
          }
          kort.append(el("span", { class: "under", text: "Skiftene kan være av ulik størrelse. Det året en gruppe står på det minste skiftet, får du mindre av de grønnsakene. Nummerer skiftene fra den ene enden, så du vet hvilket som er hvilket." }));
        }
      }
      boks.append(kort);
    }
    const T = tilstand();
    const antall = T.rot.length;
    const sum = $("skifte-sum");
    sum.className = "sum" + (T.skifterKlare && antall > 0 && antall <= MIN_PAUSE ? " tynn" : "");
    sum.textContent = !T.skifterKlare ? "" :
      antall === 0 ? "Ingen skifter er med i vekstskiftet ennå." :
      antall === 1 ? "Til sammen 1 skifte. Da står de samme grønnsakene på samme sted hvert år. Fagkildene anbefaler minst " + MIN_PAUSE + " års pause, så " + (MIN_PAUSE + 1) + " skifter eller flere er bedre. Del gjerne opp mer." :
      antall <= MIN_PAUSE ? `Til sammen ${antall} skifter som går på omgang. Da kommer hver gruppe tilbake til samme skifte etter bare ${antall - 1} års pause. Fagkildene anbefaler minst ${MIN_PAUSE} års pause, så ${MIN_PAUSE + 1} skifter eller flere er bedre. Del gjerne opp mer.` :
      antall > MAKS_SKIFTER ? `Til sammen ${antall} skifter. Verktøyet klarer opptil ${MAKS_SKIFTER}.` :
      `Til sammen ${antall} skifter som går på omgang. Planen blir da ${antall} år lang, en hel runde, og hver gruppe grønnsaker kommer tilbake til samme skifte hvert ${antall}. år.`;
  }

  /* ---------- Steg 3: grønnsaksvelger ---------- */
  function visFamilier() {
    const boks = $("familier");
    boks.replaceChildren();
    for (const f of FAMILIER) {
      const vekster = ETTAARIGE.filter((v) => v.familie === f.id);
      if (!vekster.length) continue;
      boks.append(el("div", { class: "familie", style: `background:${famFarge(f.id)}` },
        el("h3", null, f.kortnavn),
        el("div", { class: "chips" }, vekster.map((v) => velgKnapp(v.navn, S.onsker.includes(v.id), () => {
          endret();
          S.onskerEndret = true;
          S.onsker = S.onsker.includes(v.id) ? S.onsker.filter((x) => x !== v.id) : [...S.onsker, v.id];
          visAlt();
        })))));
    }
    $("teller").textContent = S.onsker.length ? `${S.onsker.length} valgt.` : "";
  }

  /* ---------- Steg 4: hva sto hvor i år ---------- */
  function visHistorikk() {
    const liste = $("hist-liste");
    liste.replaceChildren();
    const T = tilstand();
    if (!T.harArealer) { liste.append(manglerBoks("Du har ikke lagt inn noen dyrkningsarealer ennå.", "Gå til steg 1", "sek-1")); return; }
    if (!T.skifterOk) { liste.append(manglerBoks(T.uvalgte.length ? "Velg først hvor mange skifter arealene skal deles i." : "Skifteinndelingen i steg 2 må rettes først.", "Gå til steg 2", "sek-2")); return; }
    let forrigeAreal = null;
    for (const s of T.st) {
      const a = S.arealer.find((x) => x.id === s.areal);
      if (a && (a.skifter > 1 || (a.fast || []).length || (a.antall || 1) > 1) && forrigeAreal !== a.id) liste.append(el("div", { class: "gruppe-tittel", text: a.navn }));
      forrigeAreal = s.areal;
      const h = iAarFor(s.id);
      const kort = el("div", { class: "hist-kort" }, el("span", { class: "navn", text: s.navn }), s.maal ? el("span", { class: "under", text: s.maal }) : "");
      if (!s.iVekstskifte) { kort.append(el("span", { class: "under", text: s.fastVekst ? `${vekstAv[s.fastVekst].navn} står fast her. Dette skiftet flytter ikke.` : "Ikke med i vekstskiftet (drivhus eller potter)." })); liste.append(kort); continue; }
      const sett = (status, vekster) => { endret(); h.status = status; h.vekster = vekster; visAlt(); };
      kort.append(el("div", { class: "chips" },
        velgKnapp("Husker ikke", h.status === "ukjent", () => sett("ukjent", []), "stille"),
        velgKnapp("Sto tomt", h.status === "tomt", () => sett(h.status === "tomt" ? "ukjent" : "tomt", []), "stille")));
      const vis = S.visAlle[s.id] ? ETTAARIGE.map((v) => v.id) : [...new Set([...S.onsker, ...h.vekster])];
      const ordnet = ETTAARIGE.map((v) => v.id).filter((id) => vis.includes(id));
      kort.append(el("div", { class: "chips" }, ordnet.map((id) => velgKnapp(vekstAv[id].navn, h.vekster.includes(id), () => {
        const ny = h.vekster.includes(id) ? h.vekster.filter((x) => x !== id) : [...h.vekster, id];
        sett(ny.length ? "vekster" : "ukjent", ny);
      }))));
      kort.append(el("div", { class: "smaa" },
        el("button", { class: "lenke", type: "button", onclick: () => { S.visAlle[s.id] = !S.visAlle[s.id]; visHistorikk(); } }, S.visAlle[s.id] ? "Vis bare grønnsakene du valgte" : "Vis alle grønnsaker"),
        el("span", { class: "lab", text: "Står fast her:" }),
        FLERARIGE.map((v) => velgKnapp(v.navn, h.fast.includes(v.id), () => { endret(); h.fast = h.fast.includes(v.id) ? h.fast.filter((x) => x !== v.id) : [...h.fast, v.id]; visAlt(); }, "liten"))));
      if (h.fast.length) kort.append(el("span", { class: "under", text: `${vekstNavn(h.fast)} står fast her, så dette holdes utenfor vekstskiftet.` }));
      liste.append(kort);
    }
  }

  /* ---------- Til regelmotoren ---------- */
  function inndata() {
    const st = steder();
    const historikk = [], flerarige = [];
    for (const s of st) {
      if (s.fastVekst) { flerarige.push({ sted: s.id, vekst: s.fastVekst }); continue; }
      const h = S.iAar[s.id];
      if (!h || !s.iVekstskifte) continue;
      if (h.status === "tomt") historikk.push({ sted: s.id, aar: I_AAR, vekster: [] });
      else if (h.status === "vekster" && h.vekster.length) historikk.push({ sted: s.id, aar: I_AAR, vekster: h.vekster.slice() });
      for (const f of h.fast) flerarige.push({ sted: s.id, vekst: f });
    }
    return { steder: st, historikk, flerarige, onsker: S.onsker.slice(), startAar: START_AAR, monster: S.monster || "auto" };
  }

  /* ---------- Plan ---------- */
  function cellStatus(grunner) {
    if (grunner.some((g) => g.type === "feil")) return "feil";
    if (grunner.some((g) => g.type === "advarsel")) return "advarsel";
    return null;
  }
  function visPlan() {
    const P = S.plan;
    $("panel-plan").hidden = !P;
    $("panel-forklaring").hidden = !P;
    visPdfKnapp();
    if (!P) return;
    const inn = S.planInndata;
    const tab = $("plan");
    tab.replaceChildren();
    if (!P.ok) {
      $("sammendrag").replaceChildren(); $("legend").replaceChildren(); $("detalj").replaceChildren();
      $("meldinger-boks").replaceChildren(el("ul", { class: "meldinger" }, P.advarsler.map((m) => el("li", null, el("span", { class: "t feil", text: "Feil" }), el("span", { text: m.tekst })))));
      return;
    }
    const gruppe = Object.fromEntries(P.grupper.map((g) => [g.id, g]));
    tab.append(el("thead", null, el("tr", null, el("th", { scope: "col", text: "Skifte" }),
      el("th", { scope: "col", class: "hist-kol" }, String(I_AAR), el("br"), el("span", { class: "under-kol", text: SESONG_ORD })),
      P.aar.map((y) => el("th", { scope: "col", text: String(y) })))));
    const tb = el("tbody");
    const rot = P.steder.filter((s) => P.rotasjonssteder.includes(s.id));
    const utenfor = P.steder.filter((s) => !P.rotasjonssteder.includes(s.id));
    let antAdv = 0;
    const maalAvSted = Object.fromEntries(inn.steder.map((x) => [x.id, x.maal || ""]));
    const radNavn = (s) => el("th", { scope: "row" }, s.navn, maalAvSted[s.id] ? [el("br"), el("span", { class: "fam", text: maalAvSted[s.id] })] : "");
    for (const s of rot) {
      const tr = el("tr", null, radNavn(s));
      const hh = inn.historikk.find((x) => x.sted === s.id);
      tr.append(el("td", null, el("div", { class: "celle historisk" }, el("span", { class: "vek", text: hh ? (hh.vekster.length ? vekstNavn(hh.vekster) : "Tomt") : "–" }), el("span", { class: "fam", text: hh ? "sto her" : "husker ikke" }))));
      for (const y of P.aar) {
        const g = gruppe[P.plan[y][s.id]];
        const grunner = P.grunner[y][s.id];
        const st = cellStatus(grunner);
        if (st) antAdv++;
        const valgt = S.valgt && S.valgt.sted === s.id && S.valgt.aar === y;
        tr.append(el("td", null, el("button", {
          class: "celle" + (g.fyll ? " fyll" : "") + (valgt ? " valgt" : ""), type: "button",
          style: g.fyll ? null : `background:${famFarge(g.familier[0])}`,
          "aria-pressed": valgt ? "true" : "false",
          "aria-label": `${s.navn}, ${y}: ${g.fyll ? "ledig" : vekstNavn(g.vekster)}${st === "feil" ? ", feil" : st === "advarsel" ? ", kort pause" : ""}`,
          onclick: () => { S.valgt = { sted: s.id, aar: y }; visPlan(); $("detalj").scrollIntoView({ block: "nearest", behavior: "smooth" }); }
        },
          el("span", { class: "vek", text: g.fyll ? "Ledig" : vekstNavn(g.vekster) }),
          el("span", { class: "fam", text: g.fyll ? "grønngjødsel eller blomster" : g.familier.map((f) => KB.familier[f].kortnavn).join(" + ") }),
          g.familier.length > 1 ? el("span", { class: "prikker", "aria-hidden": "true" }, g.familier.map((f) => el("i", { style: `background:${famFarge(f)}` }))) : null,
          st ? el("span", { class: "pill " + st, text: st === "feil" ? "Samme som året før" : "Kort pause" }) : null)));
      }
      tb.append(tr);
    }
    for (const s of utenfor) {
      const fast = inn.flerarige.filter((x) => x.sted === s.id).map((x) => x.vekst);
      const tr = el("tr", null, radNavn(s));
      for (let i = 0; i < 1 + P.aar.length; i++) tr.append(el("td", null, el("div", { class: "celle fast" }, el("span", { class: "vek", text: fast.length ? vekstNavn(fast) : "–" }), el("span", { class: "fam", text: fast.length ? "står fast" : "ikke med" }))));
      tb.append(tr);
    }
    tab.append(tb);

    $("sammendrag").replaceChildren(
      el("span", { class: "chip", text: `${rot.length} ${rot.length === 1 ? "skifte" : "skifter"} i vekstskiftet` }),
      el("span", { class: "chip", text: P.aar.length === 1 ? `${P.aar[0]} · 1 år` : `${P.aar[0]}–${P.aar[P.aar.length - 1]} · ${P.aar.length} år, én hel runde` }),
      el("span", { class: "chip", text: antAdv ? `${antAdv} ${antAdv === 1 ? "rute" : "ruter"} å passe på` : P.advarsler.some((m) => m.kode === "kort_syklus") ? "For få skifter på lang sikt" : "Ingen ruter med kort pause" }));
    const gruppeTekst = (g) => g.fyll ? "Ledig (grønngjødsel eller blomster)" : vekstNavn(g.vekster);
    $("rekkefolge").replaceChildren(...(P.rekkefolge && P.rekkefolge.length > 1 ? [
      el("span", { class: "rad-label", text: "Rekkefølgen i hvert skifte:" }),
      el("ol", { class: "runde" }, P.rekkefolge.map((gid) => el("li", { style: gruppe[gid].fyll ? null : `background:${famFarge(gruppe[gid].familier[0])}` }, gruppeTekst(gruppe[gid])))),
      el("span", { class: "under", text: "Etter den siste begynner runden på nytt." }),
      P.monster && P.monster.type === "diagonal" ? el("p", { class: "monster-tekst", text: P.monster.retning === 1
        ? "Mønsteret er jevnt: hvert år flytter hver gruppe til skiftet under i tabellen. Fra det nederste skiftet går den til det øverste."
        : "Mønsteret er jevnt: hvert år flytter hver gruppe til skiftet over i tabellen. Fra det øverste skiftet går den til det nederste." }) : "",
      P.monster && P.monster.type === "fritt" && P.monster.jevntMulig ? el("div", { class: "smaa" }, el("button", { type: "button", onclick: () => byttMonster("jevnt") }, "Vis et jevnt mønster likevel")) : "",
      P.monster && P.monster.tvungen ? el("div", { class: "smaa" }, el("button", { type: "button", onclick: () => byttMonster("auto") }, "Tilbake til den beste planen")) : ""] : []));
    const brukte = [...new Set(P.grupper.flatMap((g) => g.familier))];
    $("legend").replaceChildren(...brukte.map((f) => el("span", null, el("i", { style: `background:${famFarge(f)}` }), KB.familier[f].kortnavn)),
      P.grupper.some((g) => g.fyll) ? el("span", null, el("i", { style: "background:var(--f-fyll);border-style:dashed" }), "Ledig") : "");

    if (!S.valgt || !P.grunner[S.valgt.aar] || !P.grunner[S.valgt.aar][S.valgt.sted]) {
      let forste = null;
      for (const y of P.aar) for (const s of rot) if (!forste && cellStatus(P.grunner[y][s.id])) forste = { sted: s.id, aar: y };
      S.valgt = forste || { sted: rot[0].id, aar: P.aar[0] };
      return visPlan();
    }
    const vs = P.steder.find((s) => s.id === S.valgt.sted);
    const vg = gruppe[P.plan[S.valgt.aar][S.valgt.sted]];
    const grunner = P.grunner[S.valgt.aar][S.valgt.sted];
    const etikett = { bra: "Bra", info: "Info", merk: "Merk", advarsel: "Pass på", feil: "Feil" };
    $("detalj").replaceChildren(
      el("h3", { text: `${vs.navn}, ${S.valgt.aar}: ${vg.fyll ? "ledig" : vekstNavn(vg.vekster).toLowerCase()}` }),
      grunner.length ? el("ul", { class: "grunner" }, grunner.map((g) => el("li", null, el("span", { class: "t " + g.type, text: etikett[g.type] || g.type }), el("span", { text: g.tekst })))) :
        el("p", { class: "hint", text: "Ingen spesielle hensyn her. Ingen av disse familiene har stått her de siste årene, så langt verktøyet vet." }));
    const mb = $("meldinger-boks");
    mb.replaceChildren();
    const alle = [...P.advarsler, ...P.merknader];
    if (alle.length) mb.append(el("h3", { text: "Verdt å vite" }), el("ul", { class: "meldinger" }, alle.map((m) => el("li", null, el("span", { class: "t " + m.type, text: etikett[m.type] || "Info" }), el("span", { text: m.tekst })))));
  }

  /* ---------- Forklaring ---------- */
  function visForklaring(tekst) {
    const f = $("forklaring");
    f.replaceChildren();
    let ul = null;
    for (const l of (tekst || "").split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
      if (/^[-•*]\s+/.test(l)) { if (!ul) { ul = el("ul"); f.append(ul); } ul.append(el("li", { text: l.replace(/^[-•*]\s+/, "") })); }
      else { ul = null; f.append(el("p", { text: l })); }
    }
  }

  /* ---------- AI 1: finn arealene i beskrivelsen ---------- */
  // Arealene som allerede er registrert, så Claude kan beholde id-ene
  function arealForrige() {
    return S.arealer.length && !S.fraEksempel ? S.arealer.map((a) => ({ id: a.id, navn: a.navn, type: a.type, lengde: a.lengde, bredde: a.bredde })) : [];
  }

  /* ---------- Kontakt med Claude ----------
     To utgaver med samme grensesnitt:
       arealer({ tekst, forrige }, signal) -> objekt med arealene
       forklaring({ plan, antallAar, forsteAar }, signal, vedTekst) -> { text }
     Feil kastes som { code } (og { text } hvis noe av forklaringen rakk å komme). */
  // Prototypen inne i Claude: instruksene settes sammen i nettleseren
  function claudeKI(sample) {
    return {
      arealer: (inn, signal) => sample.json(
        PR.arealInstruks(KB, { dato: DATO, startAar: START_AAR, sesongOver: SESONG_OVER }) + "\n\n" +
        PR.arealMelding({ forrige: inn.forrige.length ? JSON.stringify(inn.forrige) : "(ingen ennå)", tekst: inn.tekst }),
        { model: MODELL, modelTier: "default", signal }),
      forklaring: (inn, signal, vedTekst) => sample(PR.forklarInstruks(inn) + "\n\n" + inn.plan,
        { model: MODELL, modelTier: "default", signal, onText: ({ text }) => vedTekst(text) })
    };
  }
  // vekstskifte.no: serverfunksjonen setter sammen instruksene og har API-nøkkelen
  function nettKI() {
    async function post(sti, data, signal) {
      try {
        return await fetch(sti, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data), signal });
      } catch (e) {
        throw { code: signal && signal.aborted ? "cancelled" : "nett" };
      }
    }
    async function feilFra(r) {
      const j = await r.json().catch(() => ({}));
      return { code: (j && j.feil) || "ukjent" };
    }
    return {
      async arealer(inn, signal) {
        const r = await post("/api/arealer", { tekst: inn.tekst, forrige: inn.forrige, startAar: START_AAR }, signal);
        if (!r.ok) throw await feilFra(r);
        const j = await r.json().catch(() => null);
        if (!j || !j.svar || typeof j.svar !== "object") throw { code: "invalid_json" };
        return j.svar;
      },
      async forklaring(inn, signal, vedTekst) {
        const r = await post("/api/forklaring", { plan: inn.plan, antallAar: inn.antallAar, forsteAar: inn.forsteAar }, signal);
        if (!r.ok) throw await feilFra(r);
        // Svaret er strømmen fra Claude API (server-sent events), sendt rett gjennom serverfunksjonen.
        // Hver hendelse er en blokk med linjene «event: …» og «data: {json}», skilt med en tom linje.
        const leser = r.body.getReader(), dek = new TextDecoder();
        let tekst = "", rest = "", brudd = false;
        try {
          for (;;) {
            const { done, value } = await leser.read();
            if (done) break;
            rest += dek.decode(value, { stream: true }).replace(/\r\n/g, "\n");
            const deler = rest.split("\n\n");
            rest = deler.pop();
            for (const d of deler) {
              const linje = d.split("\n").find((l) => l.startsWith("data:"));
              if (!linje) continue;
              let h;
              try { h = JSON.parse(linje.slice(5)); } catch (e) { continue; }
              if (h.type === "content_block_delta" && h.delta && h.delta.type === "text_delta") tekst += h.delta.text;
              else if (h.type === "error") brudd = true;
            }
            if (tekst) vedTekst(tekst); // «Tenker …» står til den første teksten kommer
          }
        } catch (e) {
          throw { code: signal && signal.aborted ? "cancelled" : "brudd", text: tekst };
        }
        if (brudd) throw { code: "brudd", text: tekst };
        if (!tekst.trim()) throw { code: "tom" };
        return { text: tekst };
      }
    };
  }

  function brukArealSvar(r) {
    const gamle = Object.fromEntries(S.arealer.map((a) => [a.id, a]));
    const nye = [];
    const sett = new Set();
    // Typen kan komme med stor forbokstav eller som et lengre ord («Pallekarm», «oppbygde bed med karm»)
    const typeAv = (t) => {
      const s = t.toLowerCase();
      if (/drivhus|veksthus|potte|krukke|balkong/.test(s)) return "drivhus";
      if (/karm|kasse|høybed|oppbygd/.test(s)) return "karm";
      return "aker";
    };
    const maal = (x) => { const v = Number(String(x).replace(",", ".")); return Number.isFinite(v) && v > 0 && v < 1000 ? v : null; };
    const rens = (x) => String(x || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12); // bindestrek brukes internt som skilletegn
    const unik = (forslag) => { let id = forslag || "a"; for (let k = 2; sett.has(id); k++) id = (forslag || "a").slice(0, 8) + "z" + k; sett.add(id); return id; };
    const glem = (id) => { for (const k of Object.keys(S.iAar)) if (k === id || k.startsWith(id + "-")) delete S.iAar[k]; };
    const idAv = {}, navnAv = {};
    let nr = 0;
    const liste = (x) => (Array.isArray(x) ? x : []).filter((v) => v && typeof v === "object");
    for (const a of liste(r.arealer)) {
      nr++;
      const raa = String(a.id || "");
      const navn = String(a.navn || "").trim().slice(0, 60) || "Areal " + nr;
      // Samme id og samme navn to ganger er en gjentakelse. Samme id med nytt navn er et annet areal og får ny id.
      if (raa && idAv[raa] && navnAv[raa] === navn.toLowerCase()) continue;
      const id = unik(rens(raa) || "a" + nr);
      if (raa && !idAv[raa]) { idAv[raa] = id; navnAv[raa] = navn.toLowerCase(); }
      const type = typeAv(String(a.type || "aker"));
      let antall = Math.min(20, Math.max(1, Math.round(Number(a.antall)) || 1));
      // Reserve: står antallet bare i navnet («3 pallekarmer foran huset»), bruk det
      if (antall === 1) {
        const ORD = { to: 2, tre: 3, fire: 4, fem: 5, seks: 6, sju: 7, syv: 7, "åtte": 8, ni: 9, ti: 10 };
        const t = navn.toLowerCase().match(/^(\d+|to|tre|fire|fem|seks|sju|syv|åtte|ni|ti)\s+(pallekarm|karm|oppbygd|høybed|plantekass|kass|bed)/);
        if (t) antall = Math.min(20, Number(t[1]) || ORD[t[1]] || 1);
      }
      const lengde = maal(a.lengde), bredde = maal(a.bredde);
      if (type === "aker" && antall > 1) {
        // Flere like bed i bakken: ett areal for hvert, siden hvert skal deles inn for seg.
        // Fantes de fra før med samme navn, beholdes valgene brukeren har gjort for dem.
        for (let i = 1; i <= antall; i++) {
          const nid = i === 1 ? id : unik(`${id}x${i}`);
          const nnavn = `${navn} ${i}`;
          const g = gamle[nid];
          const behold = g && g.type === "aker" && g.navn.toLowerCase() === nnavn.toLowerCase();
          if (!behold) glem(nid);
          const likeMaal = behold && g.lengde === lengde && g.bredde === bredde;
          nye.push({ id: nid, navn: nnavn, type, antall: 1, lengde, bredde, skifter: behold ? g.skifter : null, fast: behold ? g.fast : [], skifteLengder: likeMaal ? g.skifteLengder : null });
        }
        continue;
      }
      const gammel = gamle[id];
      const samme = gammel && gammel.navn.toLowerCase() === navn.toLowerCase() && gammel.type === type && (gammel.antall || 1) === antall;
      let karmT = antall;
      if (type === "karm") {
        const s = Math.round(Number(a.skifter));
        if (a.sammen === true) karmT = 1;
        else if (Number.isFinite(s) && ((s >= 1 && s <= antall) || s === 2 * antall)) karmT = s;
      }
      const skifter = type === "drivhus" ? 0 : type === "karm" ? (karmT !== antall || !samme ? karmT : gammel.skifter) : (samme ? gammel.skifter : null);
      const likeMaal = samme && gammel.lengde === lengde && gammel.bredde === bredde;
      nye.push({ id, navn, type, antall: type === "karm" ? antall : 1, lengde, bredde, skifter, fast: samme && type === "aker" ? gammel.fast : [], skifteLengder: likeMaal ? gammel.skifteLengder : null });
      if (!samme || (type === "karm" && skifter !== gammel.skifter)) glem(id);
    }
    // Arealer brukeren la inn selv, og som svaret ikke nevner, beholdes
    for (const a of Object.values(gamle)) if (/^m\d+$/.test(a.id) && !sett.has(a.id)) { sett.add(a.id); nye.push(a); }
    for (const k of Object.keys(S.iAar)) { const aid = k.split("-")[0]; if (!sett.has(aid)) delete S.iAar[k]; }
    S.arealer = nye;
    S.forstaelse = typeof r.forstaelse === "string" ? r.forstaelse.trim().slice(0, 600) : "";
    S.sporsmal = (Array.isArray(r.sporsmal) ? r.sporsmal : []).filter((x) => typeof x === "string" && x.trim()).map((x) => x.slice(0, 200)).slice(0, 2);
    // Forhåndsutfyll der arealet er ett skifte (pallekarmer o.l.)
    for (const h of liste(r.historikk)) {
      const a = S.arealer.find((x) => x.id === idAv[String(h.areal)]);
      if (!a || a.skifter !== 1 || (a.antall || 1) > 1) continue;
      const v = (Array.isArray(h.vekster) ? h.vekster : []).map(String).filter((x) => vekstAv[x] && !vekstAv[x].flerarig);
      const rad = iAarFor(a.id);
      if (rad.status === "ukjent" && v.length) { rad.status = "vekster"; rad.vekster = v; }
    }
    for (const f of liste(r.flerarige)) {
      const a = S.arealer.find((x) => x.id === idAv[String(f.areal)]);
      if (!a || !vekstAv[f.vekst] || !vekstAv[f.vekst].flerarig) continue;
      if (a.type === "aker" && f.hele === false) {
        // Fast på en del av åkeren: eget skifte som står fast
        if (!a.fast.some((x) => x.vekst === f.vekst)) a.fast.push({ vekst: f.vekst, lengde: maal(f.lengde) });
        continue;
      }
      if (a.type === "aker" && !a.skifter) a.skifter = 1;
      if (a.skifter !== 1 || (a.antall || 1) > 1) continue;
      const rad = iAarFor(a.id);
      if (!rad.fast.includes(f.vekst)) rad.fast.push(f.vekst);
    }
    const onsker = (Array.isArray(r.onsker) ? r.onsker : []).map(String).filter((x) => vekstAv[x] && !vekstAv[x].flerarig);
    S.onsker = [...new Set([...S.onsker, ...onsker])];
  }

  function feiltekst(e) {
    const k = e && e.code;
    if (k === "not_granted" || k === "sampling_disabled" || k === "not_declared" || k === "capability_disabled") return "Verktøyet har ikke lov til å bruke Claude her. Du kan legge inn arealene selv med «Legg til et areal selv».";
    if (k === "rate_limited") return "Du har brukt mye av Claude-kvoten din akkurat nå. Vent litt og prøv igjen, eller legg inn arealene selv.";
    if (k === "session_expired") return "Du må logge inn i Claude på nytt.";
    if (k === "invalid_json") return "Svaret kom i feil format. Trykk på knappen en gang til.";
    if (k === "refused" || k === "avvist") return "Claude ville ikke svare på dette. Prøv å beskrive arealene på en annen måte.";
    // Kodene under kommer fra serverfunksjonen på vekstskifte.no
    const SELV = " Du kan likevel legge inn arealene selv og få en plan.";
    if (k === "format") return "Svaret kom i feil format. Trykk på knappen en gang til.";
    if (k === "for_mange") return "Du har bedt om mye KI-hjelp på kort tid. Vent et minutt og prøv igjen, eller legg inn arealene selv.";
    if (k === "travelt") return "Mange bruker KI-hjelpen akkurat nå. Vent litt og prøv igjen, eller legg inn arealene selv.";
    if (k === "tom_kvote") return "KI-hjelpen har brukt opp kvoten for denne måneden." + SELV;
    if (k === "ikke_satt_opp" || k === "nokkel") return "KI-hjelpen er ikke slått på ennå." + SELV;
    if (k === "claude_nede") return "Claude svarer ikke akkurat nå. Prøv igjen om litt, eller legg inn arealene selv.";
    if (k === "for_langt") return "Beskrivelsen ble for lang å lese inn på én gang. Del den opp, eller legg inn noen av arealene selv.";
    if (k === "nett") return "Fikk ikke kontakt med nettsiden. Sjekk nettforbindelsen og prøv igjen.";
    if (k === "brudd") return "Forbindelsen ble brutt underveis. Trykk på knappen en gang til.";
    return "Noe gikk galt hos Claude. Prøv igjen.";
  }
  let klokke = null;
  function settOpptatt(on, tekst) {
    S.opptatt = on;
    $("stopp").hidden = !on;
    $("forklar").disabled = on || !ki;
    clearInterval(klokke);
    if (on) {
      const start = Date.now();
      const tegn = () => { const sek = Math.round((Date.now() - start) / 1000); $("status").replaceChildren(el("span", { class: "prikk", "aria-hidden": "true" }), `${tekst} ${sek} s. Det kan ta opptil et minutt.`); };
      tegn(); klokke = setInterval(tegn, 1000);
    } else $("status").replaceChildren();
    oppdaterSteg();
  }
  function visFeil(t) { $("feil").textContent = t || ""; $("feil").hidden = !t; }

  async function finnArealer() {
    const tekst = $("areal").value.trim();
    if (!tekst || !ki || S.opptatt) return;
    visFeil("");
    if (S.fraEksempel) { const behold = S.onskerEndret ? S.onsker.slice() : []; S = tom(); S.onsker = behold; S.onskerEndret = behold.length > 0; }
    endret();
    S.arealTekst = tekst;
    visAlt();
    ctl = new AbortController();
    settOpptatt(true, "Leser beskrivelsen …");
    try {
      let svar, fikkSvar = false;
      try {
        svar = await ki.arealer({ tekst: S.arealTekst, forrige: arealForrige() }, ctl.signal);
        fikkSvar = true;
      } catch (e) {
        if (!e || e.code !== "cancelled") visFeil(feiltekst(e));
      }
      if (fikkSvar) {
        // Går noe galt mens svaret leses inn, settes alt tilbake slik det var
        const for_ = JSON.stringify({ arealer: S.arealer, iAar: S.iAar, onsker: S.onsker, forstaelse: S.forstaelse, sporsmal: S.sporsmal });
        try {
          brukArealSvar(svar && typeof svar === "object" ? svar : {});
          if (!S.arealer.length) visFeil("Fant ingen dyrkningsarealer i teksten. Skriv for eksempel hvor stor åkeren er eller hvor mange pallekarmer du har, eller trykk «Legg til et areal selv».");
        } catch (e) {
          Object.assign(S, JSON.parse(for_));
          visFeil("Klarte ikke å lese svaret. Trykk på knappen en gang til, eller legg inn arealene selv.");
        }
      }
    } finally {
      settOpptatt(false);
      visAlt();
      if (S.arealer.length) setTimeout(() => $("arealer-boks").scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  /* ---------- AI 2: forklar planen ---------- */
  // Planen som tekst til Claude. Instruksene ligger i prompter.js.
  function forklarData() {
    const P = S.plan, inn = S.planInndata;
    const gruppe = Object.fromEntries(P.grupper.map((g) => [g.id, g]));
    const navn = Object.fromEntries(P.steder.map((s) => [s.id, s.navn]));
    const hist = P.steder.map((s) => {
      const h = inn.historikk.find((x) => x.sted === s.id);
      const fast = inn.flerarige.filter((x) => x.sted === s.id).map((x) => x.vekst);
      return `${s.navn}: ${fast.length ? vekstNavn(fast) + " står fast" : !s.iVekstskifte ? "ikke med (drivhus eller potter)" : h ? (h.vekster.length ? vekstNavn(h.vekster) + " i " + I_AAR : "tomt i " + I_AAR) : "husker ikke hva som sto her"}`;
    }).join("\n");
    const rekke = (P.rekkefolge || []).map((gid) => gruppe[gid].fyll ? "ledig (grønngjødsel eller blomster)" : vekstNavn(gruppe[gid].vekster)).join(" → ");
    const plan = P.aar.map((y) => `${y}:\n` + P.rotasjonssteder.map((sid) => {
      const g = gruppe[P.plan[y][sid]];
      const gr = P.grunner[y][sid].filter((x) => x.type !== "info" || x.kode === "fyll").map((x) => `    (${x.type}) ${x.tekst}`).join("\n");
      return `  ${navn[sid]}: ${g.fyll ? "ledig (grønngjødsel eller blomster)" : vekstNavn(g.vekster)}${gr ? "\n" + gr : ""}`;
    }).join("\n")).join("\n");
    const meld = [...P.advarsler, ...P.merknader].map((m) => `- (${m.type}) ${m.tekst}`).join("\n") || "(ingen)";
    const fakta = [...new Set(P.grupper.flatMap((g) => g.familier))].map((f) => { const F = KB.familier[f]; return `- ${F.navn}: minst ${F.minPause} års pause, helst ${F.anbefaltPause}. ${F.grunn}`; }).join("\n");
    return `SKIFTENE OG HVA SOM STO DER I ${I_AAR}:
${hist}

REKKEFØLGEN I HVERT SKIFTE (starter på nytt etter siste):
${rekke}

PLANEN:
${plan}

ADVARSLER OG MERKNADER:
${meld}

FAKTA DU KAN BRUKE:
${fakta}`;
  }

  async function forklar() {
    if (!ki || !S.plan || !S.plan.ok || S.opptatt) return;
    visFeil("");
    ctl = new AbortController();
    forklarer = true;
    settOpptatt(true, "Skriver forklaringen …");
    $("forklaring").replaceChildren(el("p", { class: "hint", text: "Tenker …" }));
    try {
      const r = await ki.forklaring({ plan: forklarData(), antallAar: S.plan.aar.length, forsteAar: S.plan.aar[0] }, ctl.signal, visForklaring);
      S.forklaring = r.text;
      visForklaring(r.text);
    } catch (e) {
      if (e && e.text) visForklaring(e.text);
      else $("forklaring").replaceChildren(el("p", { class: "hint", text: "Ingen forklaring ennå." }));
      if (!e || e.code !== "cancelled") visFeil(feiltekst(e));
    } finally {
      forklarer = false;
      settOpptatt(false);
      $("forklar").hidden = !(ki && S.plan && !S.eksempel);
    }
  }

  // Kjør en tung utregning etter at siden har rukket å vise «Regner ut …»
  function beregn(fn) {
    if (regner) return;
    regner = true;
    oppdaterSteg();
    requestAnimationFrame(() => setTimeout(() => { try { fn(); } finally { regner = false; oppdaterSteg(); } }, 0));
  }
  function lagPlan() {
    if (S.opptatt || regner) return;
    beregn(lagPlanNa);
  }
  function lagPlanNa() {
    const inn = inndata();
    S.planInndata = inn;
    S.plan = V.lagPlan(inn, KB);
    S.valgt = null;
    if (!S.eksempel) S.forklaring = "";
    visAlt();
    $("panel-plan").scrollIntoView({ behavior: "smooth", block: "start" });
    if (!S.eksempel && S.plan.ok) forklar();
  }

  function byttMonster(m) {
    if (S.opptatt || regner) return;
    S.monster = m;
    if (S.eksempel) {
      // Eksempelet forblir et eksempel: ingen kall til Claude, bare en ny utregning
      beregn(() => {
        S.planInndata = inndata();
        S.plan = V.lagPlan(S.planInndata, KB);
        S.valgt = null;
        S.forklaring = m === "jevnt" ? EKS_JEVNT : eksForklaring();
        visAlt();
      });
      return;
    }
    endret();
    beregn(lagPlanNa);
  }

  function begynnSelv() {
    if (ctl) ctl.abort();
    S = tom();
    $("areal").value = "";
    visFeil("");
    visAlt();
    gaaTil("sek-1");
    $("areal").focus({ preventScroll: true });
  }

  /* ---------- Faner ---------- */
  function visFane(navn, valg) {
    const laer = navn === "laer";
    $("fane-plan").hidden = laer;
    $("fane-laer").hidden = !laer;
    [["fane-plan-knapp", !laer], ["fane-laer-knapp", laer]].forEach(([id, aktiv]) => {
      const b = $(id); b.setAttribute("aria-selected", aktiv ? "true" : "false"); b.tabIndex = aktiv ? 0 : -1;
    });
    if (!(valg && valg.stille)) { try { const h = laer ? "#laer" : "#plan"; if (location.hash !== h) history.replaceState(null, "", h); } catch (e) { /* ingen adresselinje */ } }
    if (valg && valg.rull) { const a = $("faner-anker"); if (window.scrollY > a.offsetTop) window.scrollTo({ top: a.offsetTop }); }
    if (valg && valg.fokus) $(laer ? "fane-laer-knapp" : "fane-plan-knapp").focus();
  }
  $("fane-plan-knapp").addEventListener("click", () => visFane("plan", { rull: true }));
  $("fane-laer-knapp").addEventListener("click", () => visFane("laer", { rull: true }));
  $("faner").addEventListener("keydown", (e) => {
    const laerNa = !$("fane-laer").hidden;
    let ny = null;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") ny = laerNa ? "plan" : "laer";
    else if (e.key === "Home") ny = "plan";
    else if (e.key === "End") ny = "laer";
    if (ny) { e.preventDefault(); visFane(ny, { fokus: true }); }
  });
  window.addEventListener("hashchange", () => { if (location.hash === "#laer") visFane("laer", { stille: true }); else if (location.hash === "#plan") visFane("plan", { stille: true }); });

  /* ---------- Bilder (Unsplash, Unsplash-lisens) ---------- */
  const FOTO = {
    hero: { navn: "Bernd Dittrich", lenke: "https://unsplash.com/photos/4DUS-fpak78" },
    salatrader: { navn: "Joao Vitor Marcilio", lenke: "https://unsplash.com/photos/aDyI7BnFWow" },
    rodbete: { navn: "Rasa Kasparaviciene", lenke: "https://unsplash.com/photos/kmaHZV6MNQI" },
    gard: { navn: "Ilse Orsel", lenke: "https://unsplash.com/photos/_StUofS3o6c" },
    kalrader: { navn: "Bernd Dittrich", lenke: "https://unsplash.com/photos/Vg21Ddmd3kU", fil: "kalrader", alt: "Rader med hodekål og svartkål sett ovenfra" },
    kjokkenhage: { navn: "Bob Jenkin", lenke: "https://unsplash.com/photos/9SfZVI9-WGE", fil: "kjokkenhage", alt: "Kjøkkenhage med rødkål, ringblomst og trillebår" },
    aker: { navn: "Rural Explorer", lenke: "https://unsplash.com/photos/Xix_ygaZZpY", fil: "aker", alt: "Kornåker med skogkant og gårdshus i det fjerne" },
    kurv: { navn: "Markus Spiske", lenke: "https://unsplash.com/photos/ZKNsVqbRSPE", fil: "kurv", alt: "Kurv med nyhøstet gulrot og løk på gamle bord" },
    bedsalat: { navn: "Kenan Kitchen", lenke: "https://unsplash.com/photos/Bbq3H7eGids", fil: "bed-salat", alt: "Oppbygde bed med salat og løk i morgentåke" },
    poteter: { navn: "Markus Spiske", lenke: "https://unsplash.com/photos/484GsKrL5r8", fil: "poteter", alt: "Nyoppgravde poteter i mørk jord" }
  };
  // Hvilket bilde som åpner hvert tema i kunnskapsfanen
  const TEMA_BILDE = { hva: "kalrader", hvorfor: "kjokkenhage", forskning: "aker", familier: "kurv", tips: "bedsalat", grenser: "poteter" };
  const fotoTekst = (f) => `Foto: ${f.navn} / Unsplash`;
  function banner(nokkel) {
    const f = FOTO[nokkel];
    if (!f) return null;
    return el("figure", { class: "banner" },
      el("img", { src: `bilder/${f.fil}.webp`, alt: f.alt, loading: "lazy", decoding: "async" }),
      el("figcaption", { class: "kreditt" }, el("a", { href: f.lenke, target: "_blank", rel: "noopener", text: fotoTekst(f) })));
  }
  function visFotoliste() {
    const sett = new Map();
    for (const f of Object.values(FOTO)) if (!sett.has(f.navn)) sett.set(f.navn, f);
    $("foto-liste").replaceChildren(...[...sett.values()].flatMap((f, i) => [i ? ", " : "", el("a", { href: f.lenke, target: "_blank", rel: "noopener", text: f.navn })]));
  }
  // Fanelinja får bakgrunn når den ligger klebet øverst
  try {
    new IntersectionObserver(([e]) => { document.querySelector(".faner").classList.toggle("klebet", !e.isIntersecting && e.boundingClientRect.top < 60); }, { rootMargin: "-48px 0px 0px 0px" }).observe($("faner-anker"));
  } catch (e) { /* eldre nettleser: fanene virker uten bakgrunnsskifte */ }

  /* ---------- Lær om vekstskifte ---------- */
  function kildeRef(ids) {
    if (!ids || !ids.length) return "";
    return el("span", { class: "kref" }, "(", ids.map((id, i) => [i ? ", " : "", el("a", { href: KB.kilder[id].url, target: "_blank", rel: "noopener", text: KB.kilder[id].kort || id })]).flat(), ")");
  }
  const kildeLenke = (id, tekst) => el("a", { href: KB.kilder[id].url, target: "_blank", rel: "noopener", text: tekst || KB.kilder[id].tittel });

  // Figur: fire skifter i fire år, gruppene flytter ett skifte til høyre hvert år
  function figurRunde() {
    const G = [
      { navn: "Erter og bønner", fam: "belg" },
      { navn: "Kål", fam: "korsblomst" },
      { navn: "Gulrot og løk", fam: "skjerm" },
      { navn: "Potet", fam: "sotvier" }
    ];
    const tab = el("table", { class: "runde" },
      el("thead", null, el("tr", null, el("th", { scope: "col" }, ""), [1, 2, 3, 4].map((k) => el("th", { scope: "col", text: "Skifte " + k })))),
      el("tbody", null, [0, 1, 2, 3].map((y) => el("tr", null, el("th", { scope: "row", text: "År " + (y + 1) }),
        [0, 1, 2, 3].map((k) => { const g = G[((y - k) % 4 + 4) % 4]; return el("td", { style: `background:${famFarge(g.fam)}`, text: g.navn }); })))));
    return el("figure", { class: "fig" },
      el("div", { class: "fig-tittel", text: "Eksempel: fire skifter i fire år" }),
      el("div", { class: "tabell-boks" }, tab),
      el("figcaption", { text: "Hver gruppe flytter ett skifte til høyre hvert år, og fra skifte 4 tilbake til skifte 1. Året etter år 4 er alt tilbake der det startet. Følg en farge på skrå nedover for å se hvordan gruppen flytter. Rekkefølgen i hvert skifte blir erter og bønner, kål, gulrot og løk, potet." }));
  }

  // Figur: hvor mye klumprotsmitte som er igjen etter x år uten kålvekster, med halveringstid 3 og 6 år
  const KLUMP = { maks: 12, hl: [3, 6] };
  const igjen = (aar, hl) => Math.pow(0.5, aar / hl);
  const pst = (x) => Math.round(x * 100) + " %";
  function figurKlumprot() {
    const graf = el("div", { class: "graf", tabindex: "0", role: "img", "aria-label": "Linjediagram: andel klumprotsmitte igjen i jorda etter 0 til 12 år uten kålvekster. Med halveringstid 3 år er 50 % igjen etter 3 år og 25 % etter 6 år. Med halveringstid 6 år er 71 % igjen etter 3 år og 50 % etter 6 år. Bruk piltastene for å se hvert år." });
    const tabell = el("table", null,
      el("thead", null, el("tr", null, el("th", { text: "År uten kålvekster" }), el("th", { text: "Halveringstid 3 år" }), el("th", { text: "Halveringstid 6 år" }))),
      el("tbody", null, Array.from({ length: KLUMP.maks + 1 }, (_, x) => el("tr", null, el("td", { text: String(x) }), el("td", { text: pst(igjen(x, 3)) }), el("td", { text: pst(igjen(x, 6)) })))));
    const fig = el("figure", { class: "fig" },
      el("div", { class: "fig-tittel", text: "Hvor mye klumprotsmitte er igjen i jorda?" }),
      graf,
      el("figcaption", null, "Andel av hvilesporene som er igjen etter et visst antall år uten kålvekster. Regnet ut fra halveringstiden på 3–6 år som oppgis for klumprot, og forutsatt at det ikke kommer ny smitte, for eksempel fra ugras i kålfamilien. ", kildeRef(["pnw_klumprot"])),
      el("details", { class: "tall-visning" }, el("summary", { text: "Vis tallene" }), tabell));
    let valgt = null;
    function tegn() {
      const B = graf.clientWidth;
      if (!B) return;
      const H = Math.round(Math.min(300, Math.max(220, B * 0.5)));
      const m = { v: 44, h: 16, o: 26, u: 40 };
      const bx = B - m.v - m.h, by = H - m.o - m.u;
      const X = (x) => m.v + (x / KLUMP.maks) * bx, Y = (v) => m.o + (1 - v) * by;
      const ns = "http://www.w3.org/2000/svg";
      const s = (tag, a, tekst) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(a || {})) n.setAttribute(k, v); if (tekst != null) n.textContent = tekst; return n; };
      const svg = s("svg", { viewBox: `0 0 ${B} ${H}`, width: B, height: H, "aria-hidden": "true" });
      for (const v of [0, 0.25, 0.5, 0.75, 1]) {
        svg.append(s("line", { x1: m.v, x2: B - m.h, y1: Y(v), y2: Y(v), stroke: "var(--line)", "stroke-width": 1 }));
        svg.append(s("text", { x: m.v - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)", "font-family": "var(--font-mono)" }, Math.round(v * 100) + " %"));
      }
      for (let x = 0; x <= KLUMP.maks; x += 2) svg.append(s("text", { x: X(x), y: H - m.u + 18, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)", "font-family": "var(--font-mono)" }, String(x)));
      svg.append(s("text", { x: m.v + bx / 2, y: H - 4, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)" }, "År uten kålvekster"));
      // Referanselinjer for 3 og 6 års pause
      for (const x of [3, 6]) {
        svg.append(s("line", { x1: X(x), x2: X(x), y1: m.o, y2: H - m.u, stroke: "var(--muted)", "stroke-width": 1, "stroke-opacity": 0.5 }));
        svg.append(s("text", { x: X(x) + 4, y: m.o - 8, "font-size": 11, fill: "var(--muted)" }, x + " år"));
      }
      const pkt = (hl) => Array.from({ length: KLUMP.maks * 4 + 1 }, (_, i) => i / 4).map((x) => [X(x), Y(igjen(x, hl))]);
      const p3 = pkt(3), p6 = pkt(6);
      const sti = (p) => p.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
      svg.append(s("path", { d: sti(p6) + " " + p3.slice().reverse().map((q) => "L" + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ") + " Z", fill: "var(--accent)", "fill-opacity": 0.1, stroke: "none" }));
      for (const p of [p3, p6]) svg.append(s("path", { d: sti(p), fill: "none", stroke: "var(--accent)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      // Direkte etiketter ved enden av linjene
      svg.append(s("text", { x: B - m.h, y: Y(igjen(KLUMP.maks, 6)) - 8, "text-anchor": "end", "font-size": 12, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 4, "paint-order": "stroke" }, "Halveringstid 6 år"));
      svg.append(s("text", { x: B - m.h, y: Y(igjen(KLUMP.maks, 3)) - 8, "text-anchor": "end", "font-size": 12, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 4, "paint-order": "stroke" }, "Halveringstid 3 år"));
      // Hover-lag
      const kryss = s("line", { y1: m.o, y2: H - m.u, stroke: "var(--ink)", "stroke-width": 1, "stroke-opacity": 0.5, visibility: "hidden" });
      const prikker = [3, 6].map(() => s("circle", { r: 4.5, fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 2, visibility: "hidden" }));
      svg.append(kryss, ...prikker);
      const tips = el("div", { class: "tips", hidden: true });
      function vis(x) {
        valgt = x;
        if (x == null) { kryss.setAttribute("visibility", "hidden"); prikker.forEach((p) => p.setAttribute("visibility", "hidden")); tips.hidden = true; return; }
        kryss.setAttribute("x1", X(x)); kryss.setAttribute("x2", X(x)); kryss.setAttribute("visibility", "visible");
        [3, 6].forEach((hl, i) => { prikker[i].setAttribute("cx", X(x)); prikker[i].setAttribute("cy", Y(igjen(x, hl))); prikker[i].setAttribute("visibility", "visible"); });
        tips.replaceChildren(el("strong", { text: x === 0 ? "Året kålen sto der" : `Etter ${x} år uten kålvekster` }),
          el("div", { class: "rad" }, el("i"), "Halveringstid 6 år", el("b", { text: pst(igjen(x, 6)) + " igjen" })),
          el("div", { class: "rad" }, el("i"), "Halveringstid 3 år", el("b", { text: pst(igjen(x, 3)) + " igjen" })));
        tips.hidden = false;
        const tb = tips.offsetWidth || 190;
        tips.style.left = Math.max(0, Math.min(B - tb, X(x) + 12 + tb > B ? X(x) - tb - 12 : X(x) + 12)) + "px";
        tips.style.top = Math.max(0, Y(igjen(x, 6)) - 70) + "px";
      }
      const flate = s("rect", { x: m.v, y: m.o, width: bx, height: by, fill: "transparent" });
      flate.addEventListener("pointermove", (e) => { const r = svg.getBoundingClientRect(); const x = Math.round(((e.clientX - r.left) - m.v) / bx * KLUMP.maks); vis(Math.max(0, Math.min(KLUMP.maks, x))); });
      flate.addEventListener("pointerleave", () => vis(null));
      svg.append(flate);
      graf.replaceChildren(svg, tips);
      if (valgt != null) vis(valgt);
      graf.onkeydown = (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const x = valgt == null ? 0 : valgt + (e.key === "ArrowRight" ? 1 : -1); vis(Math.max(0, Math.min(KLUMP.maks, x))); }
        else if (e.key === "Escape") vis(null);
      };
      graf.onblur = () => vis(null);
    }
    try { new ResizeObserver(() => tegn()).observe(graf); } catch (e) { window.addEventListener("resize", tegn); }
    return fig;
  }

  function blokk(d) {
    const ut = [];
    if (d.undertittel) ut.push(el("h3", { text: d.undertittel }));
    if (d.tekst) ut.push(el("p", null, d.tekst, " ", kildeRef(d.kilder)));
    if (d.liste) ut.push(el("ul", null, d.liste.map((x) => el("li", null, x.tekst, " ", kildeRef(x.kilder)))));
    if (d.figur === "runde") ut.push(figurRunde());
    if (d.figur === "klumprot") ut.push(figurKlumprot());
    if (d.nokkeltall) ut.push(el("div", { class: "nokkeltall" }, d.nokkeltall.map((n) => el("div", null,
      el("span", { class: "etikett", text: n.etikett }), el("span", { class: "verdi", text: n.verdi }), el("span", { class: "forkl" }, n.forklaring, " ", kildeRef(n.kilder))))));
    if (d.studier) ut.push(el("div", { class: "studier" }, d.studier.map((st) => {
      const k = KB.kilder[st.kilde];
      return el("article", { class: "studie" },
        el("span", { class: "hvem", text: k.kort }),
        el("h3", { text: st.tittel }),
        el("p", { text: st.tekst }),
        el("div", { class: "lenke-rad" }, kildeLenke(st.kilde, "Les studien (engelsk)"), st.ekstra && st.ekstra.length ? [" ", kildeRef(st.ekstra)] : ""));
    })));
    if (d.boks) ut.push(el("aside", { class: "faktaboks" }, el("h3", { text: d.boks.tittel }), el("ul", null, d.boks.liste.map((x) => el("li", null, x.tekst, " ", kildeRef(x.kilder))))));
    return ut;
  }

  function visOm() {
    const O = KB.omVekstskifte;
    $("om-ingress").textContent = O.ingress;
    $("kort-fortalt").replaceChildren(...O.kortFortalt.map((x) => el("li", null, x.tekst, " ", kildeRef(x.kilder))));
    $("innhold-lenker").replaceChildren(
      ...O.temaer.map((tm) => el("button", { type: "button", "data-til": "tema-" + tm.id, text: tm.tittel })),
      el("button", { type: "button", "data-til": "les-mer-panel", text: "Les mer" }),
      el("button", { type: "button", "data-til": "kb-panel", text: "Kunnskapsbasen bak planen" }));
    $("laer-temaer").replaceChildren(...O.temaer.map((tm) => {
      const innhold = el("div", { class: "tema-innhold" }, tm.innhold.flatMap(blokk));
      if (tm.familiekort) innhold.append(el("div", { class: "famkort" }, FAMILIER.map((f) => {
        const vekster = ETTAARIGE.filter((v) => v.familie === f.id).map((v) => v.navn);
        return vekster.length ? el("div", { style: `background:${famFarge(f.id)}` },
          el("strong", { text: f.kortnavn }),
          el("span", { class: "vek", text: vekster.join(", ") }),
          el("span", { class: "ar", text: `Minst ${f.minPause} år · helst ${f.anbefaltPause} år` })) : null;
      })));
      return el("section", { class: "panel laer-tema", id: "tema-" + tm.id, "aria-labelledby": "h-tema-" + tm.id },
        TEMA_BILDE[tm.id] ? banner(TEMA_BILDE[tm.id]) : null,
        el("h2", { id: "h-tema-" + tm.id, text: tm.tittel }), innhold);
    }));
    $("les-mer").replaceChildren(...O.lesMer.map((g) => el("div", null,
      el("h4", { text: g.gruppe }),
      el("ul", null, g.lenker.map((l) => el("li", null, kildeLenke(l.kilde), el("span", { text: l.om })))),
      g.merknad ? el("p", { class: "merknad", text: g.merknad }) : "")));
    $("les-mer-merknad").textContent = O.lesMerMerknad || "";
  }

  /* ---------- Last ned planen som PDF ---------- */
  let nedlasting = null;
  function visPdfKnapp() { $("pdf-rad").hidden = !(nedlasting && S.plan && S.plan.ok); }
  function lastJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise((ok, feil) => {
      const s = document.createElement("script");
      s.src = NETT ? "vendor/jspdf.umd.min.js" : "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => ok(); s.onerror = () => feil(new Error("lasting"));
      document.head.append(s);
    });
  }
  // Standardfontene i PDF dekker vesteuropeiske tegn (æ, ø, å, ×, «»), men ikke alt
  const pdfTekst = (x) => String(x == null ? "" : x).replace(/[\u2013\u2014\u2212]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2026/g, "...").replace(/\u2192/g, "->").replace(/[^\x00-\xff]/g, "");
  function lagPdf() {
    const P = S.plan, inn = S.planInndata;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210, M = 14, BUNN = H - 14;
    const F = { gronn: [35, 96, 58], skog: [14, 42, 27], ink: [19, 34, 26], muted: [79, 94, 83], line: [212, 220, 206], flate: [243, 246, 239], bad: [161, 48, 42], warn: [138, 83, 0], hvit: [255, 255, 255] };
    const FAM = { belg: "#d6e8c2", korsblomst: "#cde2d6", lok: "#e7dfcd", skjerm: "#f7d9b6", amarant: "#efd3c6", kurv: "#e7efc6", sotvier: "#e8d8c1", gresskar: "#f4e3a3", gras: "#ebe3c9" };
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const farge = (f) => FAM[f] ? rgb(FAM[f]) : F.flate;
    const settF = (stil, str, c) => { doc.setFont("helvetica", stil); doc.setFontSize(str); doc.setTextColor(...(c || F.ink)); };
    const gruppe = Object.fromEntries(P.grupper.map((g) => [g.id, g]));
    const rot = P.steder.filter((s) => P.rotasjonssteder.includes(s.id));
    const utenfor = P.steder.filter((s) => !P.rotasjonssteder.includes(s.id));
    const maal = Object.fromEntries(inn.steder.map((x) => [x.id, x.maal || ""]));
    const dato = new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
    let side = 1;
    function topp(undertittel) {
      doc.setFillColor(...F.skog); doc.rect(0, 0, W, 20, "F");
      doc.setFillColor(220, 174, 56); doc.rect(M, 13.2, 10, 0.8, "F");
      settF("bold", 16, F.hvit); doc.text("Vekstskifteplan", M, 10.5);
      settF("normal", 8.5, [211, 223, 209]); doc.text(pdfTekst(undertittel), M + 13, 14.2);
      settF("normal", 8.5, [211, 223, 209]); doc.text(pdfTekst("Vekstskiftehjelpen · " + dato), W - M, 10.5, { align: "right" });
    }
    function bunntekst() {
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setDrawColor(...F.line); doc.setLineWidth(0.2); doc.line(M, H - 10, W - M, H - 10);
        settF("normal", 7, F.muted);
        doc.text(pdfTekst((NETT ? "Testversjon" : "Prototype") + ". Planen er laget av faste regler fra en kunnskapsbase med norske fagkilder (" + KB.versjon + "), ikke gjennomgått av fagfolk ennå. Forklaringen er skrevet av Claude (KI)."), M, H - 6);
        doc.text("Side " + i + " av " + n, W - M, H - 6, { align: "right" });
      }
    }
    const ny = (undertittel) => { doc.addPage(); side++; topp(undertittel); return 28; };
    const aarTekst = P.aar.length === 1 ? String(P.aar[0]) : P.aar[0] + "-" + P.aar[P.aar.length - 1];
    topp((S.eksempel ? "Eksempel · " : "") + rot.length + (rot.length === 1 ? " skifte" : " skifter") + " · " + aarTekst + " · en hel runde");
    let y = 28;

    // Rekkefølgen
    if (P.rekkefolge && P.rekkefolge.length > 1) {
      settF("bold", 9.5); doc.text("Rekkefølgen i hvert skifte:", M, y);
      let x = M + doc.getTextWidth("Rekkefølgen i hvert skifte:") + 3;
      settF("normal", 9);
      P.rekkefolge.forEach((gid, i) => {
        const g = gruppe[gid];
        const tekst = pdfTekst((i + 1) + ". " + (g.fyll ? "Ledig (grønngjødsel eller blomster)" : vekstNavn(g.vekster)));
        const b = doc.getTextWidth(tekst) + 5;
        if (x + b > W - M) { x = M; y += 7; }
        doc.setFillColor(...(g.fyll ? F.flate : farge(g.familier[0]))); doc.roundedRect(x, y - 4, b, 6, 1.5, 1.5, "F");
        doc.setTextColor(...F.ink); doc.text(tekst, x + 2.5, y);
        x += b + 2.5;
      });
      y += 5;
      settF("normal", 8, F.muted); doc.text("Etter den siste begynner runden på nytt.", M, y + 1.5);
      y += 7;
    }

    // Tabellen
    const navnB = 50, kol = 1 + P.aar.length;
    const kolB = (W - 2 * M - navnB) / kol;
    const fs = kolB < 20 ? 6.6 : kolB < 26 ? 7.4 : 8.2;
    const pad = 1.6, linjeH = fs * 0.42;
    function hode() {
      settF("bold", 7.5, F.muted);
      doc.text("Skifte", M, y);
      doc.text(String(I_AAR), M + navnB + pad, y);
      settF("normal", 6.5, F.muted); doc.text("sist sesong", M + navnB + pad, y + 3);
      settF("bold", 7.5, F.muted);
      P.aar.forEach((a, i) => doc.text(String(a), M + navnB + (i + 1) * kolB + pad, y));
      y += 5.5;
    }
    function celle(x, yy, b, h, fyllF, linjer) {
      doc.setFillColor(...fyllF); doc.roundedRect(x + 0.6, yy, b - 1.2, h, 1.4, 1.4, "F");
      let ty = yy + pad + linjeH * 0.9;
      for (const l of linjer) {
        settF(l.stil || "normal", l.str || fs, l.c || F.ink);
        for (const del of doc.splitTextToSize(pdfTekst(l.tekst), b - 2 * pad - 1.2)) { doc.text(del, x + 0.6 + pad, ty); ty += linjeH * (l.str ? l.str / fs : 1) + 0.4; }
      }
    }
    function hoyde(b, celler) {
      let maks = 0;
      for (const linjer of celler) {
        let h = 2 * pad;
        for (const l of linjer) { settF(l.stil || "normal", l.str || fs); h += doc.splitTextToSize(pdfTekst(l.tekst), b - 2 * pad - 1.2).length * (linjeH * (l.str ? l.str / fs : 1) + 0.4); }
        maks = Math.max(maks, h);
      }
      return Math.max(11, maks + 0.6);
    }
    hode();
    const rader = rot.map((s) => {
      const hh = inn.historikk.find((x) => x.sted === s.id);
      const celler = [{ fyll: F.flate, linjer: [{ tekst: hh ? (hh.vekster.length ? vekstNavn(hh.vekster) : "Tomt") : "-", stil: "bold" }, { tekst: hh ? "sto her" : "husker ikke", str: fs - 1, c: F.muted }] }];
      for (const a of P.aar) {
        const g = gruppe[P.plan[a][s.id]];
        const st = cellStatus(P.grunner[a][s.id]);
        const linjer = [{ tekst: g.fyll ? "Ledig" : vekstNavn(g.vekster), stil: "bold" },
          { tekst: g.fyll ? "grønngjødsel eller blomster" : g.familier.map((f) => KB.familier[f].kortnavn).join(" + "), str: fs - 1, c: F.muted }];
        if (st) linjer.push({ tekst: st === "feil" ? "Samme familie som året før" : "Kort pause", stil: "bold", str: fs - 1, c: st === "feil" ? F.bad : F.warn });
        celler.push({ fyll: g.fyll ? F.flate : farge(g.familier[0]), linjer });
      }
      return { s, celler };
    });
    for (const r of rader) {
      const navnLinjer = [{ tekst: r.s.navn, stil: "bold" }].concat(maal[r.s.id] ? [{ tekst: maal[r.s.id], str: fs - 1, c: F.muted }] : []);
      const h = Math.max(hoyde(kolB, r.celler.map((c) => c.linjer)), hoyde(navnB, [navnLinjer]));
      if (y + h > BUNN - 12) { y = ny("forts. planen"); hode(); }
      celle(M - 0.6, y, navnB, h, F.hvit, navnLinjer);
      r.celler.forEach((c, i) => celle(M + navnB + i * kolB, y, kolB, h, c.fyll, c.linjer));
      y += h + 1.2;
    }
    for (const s of utenfor) {
      const fast = inn.flerarige.filter((x) => x.sted === s.id).map((x) => x.vekst);
      const h = 9;
      if (y + h > BUNN - 12) { y = ny("forts. planen"); hode(); }
      celle(M - 0.6, y, navnB, h, F.hvit, [{ tekst: s.navn, stil: "bold" }]);
      celle(M + navnB, y, kolB * kol, h, F.flate, [{ tekst: (fast.length ? vekstNavn(fast) + " står fast her" : "Ikke med i vekstskiftet (drivhus eller potter)"), c: F.muted }]);
      y += h + 1.2;
    }

    // Fargeforklaring
    const brukte = [...new Set(P.grupper.flatMap((g) => g.familier))];
    if (y + 8 > BUNN) y = ny("forts. planen");
    y += 3; let x = M; settF("normal", 7.5, F.muted);
    for (const f of brukte) {
      const t2 = pdfTekst(KB.familier[f].kortnavn); const b = doc.getTextWidth(t2) + 7;
      if (x + b > W - M) { x = M; y += 5; }
      doc.setFillColor(...farge(f)); doc.roundedRect(x, y - 3, 4, 4, 0.8, 0.8, "F"); doc.text(t2, x + 5.5, y); x += b + 4;
    }

    // Side 2: forklaring og merknader
    y = ny("forklaring og merknader");
    const tekstB = 175;
    function avsnitt(tekst, stil, str, c, innrykk) {
      settF(stil, str, c);
      for (const l of doc.splitTextToSize(pdfTekst(tekst), tekstB - (innrykk || 0))) {
        if (y > BUNN - 4) y = ny("forts.");
        settF(stil, str, c); doc.text(l, M + (innrykk || 0), y); y += str * 0.48;
      }
    }
    if (S.forklaring) {
      avsnitt("Forklaring", "bold", 13, F.gronn); y += 1;
      avsnitt(S.eksempel ? "Eksempel på forklaring." : "Skrevet av Claude (KI) ut fra planen og kunnskapsbasen.", "italic", 8.5, F.muted); y += 2;
      for (const l of S.forklaring.split(/\n+/).map((s) => s.trim()).filter(Boolean)) {
        if (/^[-•*]\s+/.test(l)) { settF("normal", 10); if (y > BUNN - 4) y = ny("forts."); doc.text("-", M + 1, y); avsnitt(l.replace(/^[-•*]\s+/, ""), "normal", 10, F.ink, 5); }
        else avsnitt(l, "normal", 10, F.ink);
        y += 1.6;
      }
      y += 4;
    }
    const meld = [...P.advarsler, ...P.merknader];
    if (meld.length) {
      avsnitt("Verdt å vite", "bold", 13, F.gronn); y += 2;
      const etikett = { feil: "FEIL", advarsel: "PASS PÅ", merk: "MERK", info: "INFO", bra: "BRA" };
      for (const m of meld) {
        if (y > BUNN - 8) y = ny("forts.");
        const c = m.type === "feil" ? F.bad : m.type === "advarsel" || m.type === "merk" ? F.warn : F.muted;
        settF("bold", 7, c); doc.text(etikett[m.type] || "INFO", M, y);
        avsnitt(m.tekst, "normal", 9.5, F.ink, 18); y += 1.8;
      }
    }
    // Henvisning til kunnskapsdelen, bare hvis den får plass på siden
    if (y + 8 < BUNN) { y += 3; avsnitt("Les hvorfor vekstskifte er viktig, og hvilke kilder planen bygger på, under «Lær om vekstskifte» i Vekstskiftehjelpen.", "italic", 8.5, F.muted); }
    bunntekst();
    return doc.output("blob");
  }
  async function lastNedPdf() {
    if (!nedlasting || !S.plan || !S.plan.ok) return;
    const knapp = $("last-ned-pdf"), status = $("pdf-status");
    knapp.disabled = true; status.textContent = "Lager PDF …";
    try {
      await lastJsPdf();
      const blob = lagPdf();
      const navn = "vekstskifteplan-" + (S.eksempel ? "eksempel-" : "") + S.plan.aar[0] + (S.plan.aar.length > 1 ? "-" + S.plan.aar[S.plan.aar.length - 1] : "") + ".pdf";
      status.textContent = "";
      await nedlasting.save({ filename: navn, data: blob });
      status.textContent = NETT ? "PDF-en er lastet ned." : "PDF-en er lagret.";
    } catch (e) {
      const k = e && e.code;
      if (k === "declined") status.textContent = "";
      else if (k === "rate_limited") status.textContent = "Et lagringsvindu er allerede åpent. Vent litt og prøv igjen.";
      else if (k === "unavailable" || k === "not_granted" || k === "capability_disabled" || k === "capability_removed") { status.textContent = "Nedlasting er ikke tilgjengelig her."; nedlasting = null; visPdfKnapp(); }
      else if (e && e.message === "lasting") status.textContent = "Klarte ikke å hente verktøyet som lager PDF-en. Sjekk nettforbindelsen og prøv igjen.";
      else status.textContent = "Klarte ikke å lage PDF-en. Prøv igjen.";
    } finally { knapp.disabled = false; }
  }

  /* ---------- Kunnskapsbase ---------- */
  function visKB() {
    const k = $("kb-innhold");
    const kildeLenker = (ids) => ids.map((id, i) => [i ? ", " : "", el("a", { href: KB.kilder[id].url, target: "_blank", rel: "noopener", text: KB.kilder[id].kort || id })]).flat();
    const famTabell = el("table", { class: "kbt" },
      el("thead", null, el("tr", null, ["Familie", "Grønnsaker", "Minst", "Helst", "Hvorfor", "Kilder"].map((h) => el("th", { scope: "col", text: h })))),
      el("tbody", null, FAMILIER.map((f) => el("tr", null,
        el("td", null, el("strong", { text: f.kortnavn }), el("br"), el("span", { class: "hint", text: f.botanisk || "" })),
        el("td", { text: ETTAARIGE.filter((v) => v.familie === f.id).map((v) => v.navn).join(", ") }),
        el("td", { class: "tall", text: f.minPause + " år" }),
        el("td", { class: "tall", text: f.anbefaltPause + " år" }),
        el("td", { text: f.grunn || "Generelt råd om å flytte grønnsakene hvert år." }),
        el("td", null, kildeLenker(f.kilder))))));
    const behovTabell = el("table", { class: "kbt" },
      el("thead", null, el("tr", null, ["Grønnsak", "Familie", "Næringsbehov", "Plass"].map((h) => el("th", { scope: "col", text: h })))),
      el("tbody", null, ETTAARIGE.map((v) => el("tr", null,
        el("td", { text: v.navn }),
        el("td", { text: KB.familier[v.familie].kortnavn }),
        el("td", null, { hoy: "Høyt", middels: "Middels", lav: "Lavt", tilforer: "Tilfører nitrogen" }[v.behov], v.behovKilde === "antatt" ? el("span", { class: "antatt", text: " (antatt)" }) : "", v.behovMerknad ? [el("br"), el("span", { class: "hint", text: v.behovMerknad })] : ""),
        el("td", null, { liten: "Liten", middels: "Middels", stor: "Stor" }[v.plass], el("span", { class: "antatt", text: " (antatt)" }))))));
    k.replaceChildren(
      el("p", { class: "hint", text: "Dette er reglene planen bygger på. Pause betyr hvor mange hele år det bør gå før samme plantefamilie står i samme skifte igjen. «Minst» er Hageselskapets minimum for kjøkkenhagen. «Helst» er det fagkildene for yrkesdyrkere anbefaler. Planen prøver å nå «helst» og varsler når den ikke klarer «minst». Verdier merket «antatt» står ikke i kildene og må sjekkes av fagfolk." }),
      el("div", { class: "tabell-boks" }, famTabell),
      el("h3", { text: "Næringsbehov" }),
      el("p", { class: "hint", text: "Brukes til å velge rekkefølge: næringskrevende vekster etter erter og bønner, mindre næringskrevende etter næringskrevende." }),
      el("div", { class: "tabell-boks" }, behovTabell),
      el("h3", { text: "Forgrøder" }),
      el("p", { class: "hint", text: "Hva som passer eller ikke passer året før. Dette teller mindre enn pausene." }),
      el("ul", { class: "kilder" }, KB.forgroder.map((r) => el("li", null, r.tekst + " ", el("a", { href: KB.kilder[r.kilde].url, target: "_blank", rel: "noopener", text: "(" + KB.kilder[r.kilde].kort + ")" })))),
      el("h3", { text: "Kilder" }),
      el("ol", { class: "kilder" }, Object.values(KB.kilder).map((s) => el("li", null, el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.tittel })))));
    $("kb-versjon").textContent = "Kunnskapsbase: " + KB.versjon + ".";
  }

  function visAlt() {
    if ($("areal").value !== S.arealTekst && document.activeElement !== $("areal")) $("areal").value = S.arealTekst;
    oppdaterSteg();
    visArealer();
    visSkifter();
    visFamilier();
    visHistorikk();
    visPlan();
    if (S.plan && S.plan.ok) {
      if (S.forklaring) visForklaring(S.forklaring);
      else if (!S.opptatt) $("forklaring").replaceChildren(el("p", { class: "hint", text: ki ? "Forklaringen kommer når planen er laget." : NETT ? "KI-hjelpen er ikke tilgjengelig akkurat nå, så det blir ingen forklaring denne gangen." : "Forklaringen krever at siden er åpnet i Claude." }));
    }
    $("forklar").hidden = !(ki && S.plan && S.plan.ok && !S.eksempel);
  }

  /* ---------- Oppstart ---------- */
  S.planInndata = inndata();
  S.plan = V.lagPlan(S.planInndata, KB);
  S.forklaring = eksForklaring();
  visOm();
  visFotoliste();
  visKB();
  if (location.hash === "#laer") visFane("laer", { stille: true });
  visAlt();
  $("finn").addEventListener("click", finnArealer);
  $("areal").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) finnArealer(); });
  $("areal").addEventListener("input", () => { S.arealTekst = $("areal").value; });
  $("stopp").addEventListener("click", () => { if (ctl) ctl.abort(); });
  $("leggtil").addEventListener("click", () => { if (S.fraEksempel) { S = tom(); $("areal").value = ""; } leggTilAreal(); });
  $("lagplan").addEventListener("click", lagPlan);
  $("forklar").addEventListener("click", forklar);
  $("egen").addEventListener("click", begynnSelv);
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-til]"); if (b) gaaTil(b.getAttribute("data-til")); });
  $("last-ned-pdf").addEventListener("click", lastNedPdf);

  // Bunnteksten: kontaktadressen settes sammen i nettleseren, så den ikke står i klartekst der programmer leter etter e-postadresser
  document.querySelectorAll(".epost[data-a][data-b]").forEach((sp) => {
    const snu = (x) => x.split("").reverse().join("");
    const adresse = snu(sp.getAttribute("data-a")) + String.fromCharCode(64) + snu(sp.getAttribute("data-b"));
    sp.replaceChildren(el("a", { href: "mai" + "lto:" + adresse, text: adresse }));
  });
  $("personvern").hidden = !NETT;

  if (NETT) {
    // PDF-en lastes ned som en vanlig fil
    nedlasting = {
      async save({ filename, data }) {
        const a = el("a", { href: URL.createObjectURL(data), download: filename });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        return { status: "saved" };
      }
    };
    visPdfKnapp();
    ki = nettKI();
    visAlt();
    fetch("/api/status", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (j && j.ki) return;
      ki = null;
      visFeil("KI-hjelpen er ikke slått på ennå. Du kan likevel legge inn arealene selv med «Legg til et areal selv», dele dem i skifter, velge grønnsaker og få en plan.");
      visAlt();
    }).catch(() => { /* prøver likevel når brukeren trykker */ });
  } else {
    $("status").textContent = "Kobler til Claude …";
    const c = window.claude;
    (c && c.use ? c.use("downloads") : Promise.resolve(null)).then((d) => { nedlasting = d; visPdfKnapp(); }).catch(() => { nedlasting = null; visPdfKnapp(); });
    (c && c.use ? c.use("sample") : Promise.resolve(null)).then((s) => {
      ki = s ? claudeKI(s) : null;
      $("status").textContent = "";
      if (!s) visFeil("AI-delen virker bare når siden er åpnet i Claude. Du kan likevel legge inn arealene selv med «Legg til et areal selv», dele dem i skifter, velge grønnsaker og få en plan.");
      visAlt();
    }).catch(() => { ki = null; $("status").textContent = ""; visFeil("AI-delen er ikke tilgjengelig her. Du kan likevel legge inn arealene selv og få en plan."); visAlt(); });
  }
})();
