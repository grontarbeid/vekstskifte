/* Vekstskifte-motor: deterministisk planlegger.
   Samme inndata gir alltid samme plan. Ingen AI her – bare regler fra kunnskapsbasen. */
(function (root) {
  "use strict";

  const BEHOV_TALL = { tilforer: 0, lav: 1, middels: 2, hoy: 3 };
  const PLASS_TALL = { liten: 1, middels: 2, stor: 3 };

  function lagOppslag(KB) {
    const vekst = Object.create(null); // ingen arvede nøkler som «constructor»
    for (const v of KB.vekster) vekst[v.id] = v;
    return { vekst, familie: KB.familier };
  }

  /* ---------- 1. Normaliser inndata ---------- */
  function normaliser(input, KB) {
    const O = lagOppslag(KB);
    const merknader = [];
    const brukt = new Set();
    const steder = (input.steder || []).filter((s) => {
      // Samme id to ganger: behold bare det første stedet
      const id = String((s && s.id) || "");
      if (!id) return true;
      if (brukt.has(id)) return false;
      brukt.add(id); return true;
    }).map((s, i) => ({
      id: String(s.id || "s" + (i + 1)),
      navn: String(s.navn || "Sted " + (i + 1)),
      storrelse: ["liten", "middels", "stor"].includes(s.storrelse) ? s.storrelse : "ukjent",
      iVekstskifte: s.iVekstskifte !== false,
      grunn: s.grunn ? String(s.grunn) : ""
    }));
    const stedIds = new Set(steder.map((s) => s.id));

    const flerarige = (input.flerarige || [])
      .filter((f) => stedIds.has(String(f.sted)) && O.vekst[f.vekst])
      .map((f) => ({ sted: String(f.sted), vekst: f.vekst }));
    for (const f of flerarige) {
      const s = steder.find((x) => x.id === f.sted);
      if (s && s.iVekstskifte) {
        s.iVekstskifte = false;
        s.grunn = s.grunn || (O.vekst[f.vekst].navn + " står her fast");
      }
    }

    const startAar = Number.isFinite(Number(input.startAar)) ? Math.round(Number(input.startAar)) : new Date().getFullYear() + 1;
    const historikk = [];
    for (const h of input.historikk || []) {
      const sted = String(h.sted);
      const aar = Math.round(Number(h.aar));
      // Bare årene før planen, og høyst 20 år tilbake (eldre har ingen betydning for pausene)
      if (!stedIds.has(sted) || !Number.isFinite(aar) || aar >= startAar || aar < startAar - 20) continue;
      const vekster = (h.vekster || []).filter((v) => O.vekst[v]);
      historikk.push({ sted, aar, vekster, usikker: !!h.usikker });
    }

    let onsker = [...new Set((input.onsker || []).filter((v) => O.vekst[v] && !O.vekst[v].flerarig))];
    if (onsker.length === 0) {
      const sisteAar = Math.max(-Infinity, ...historikk.map((h) => h.aar));
      const fraHistorikk = historikk.filter((h) => h.aar === sisteAar).flatMap((h) => h.vekster);
      onsker = [...new Set(fraHistorikk.filter((v) => !O.vekst[v].flerarig))];
      if (onsker.length) merknader.push({ type: "info", tekst: "Du sa ikke hva du vil dyrke framover, så planen bruker det du dyrket sist." });
    }

    const antallAar = Math.min(12, Math.max(1, Number(input.antallAar) || 4));
    return { steder, flerarige, historikk, onsker, startAar, antallAar, merknader };
  }

  /* ---------- 2. Lag skiftegrupper av plantefamilier ---------- */
  function lagGrupper(onsker, antallSteder, KB) {
    const O = lagOppslag(KB);
    const perFamilie = {};
    for (const vid of onsker) {
      const v = O.vekst[vid];
      (perFamilie[v.familie] = perFamilie[v.familie] || []).push(vid);
    }
    let grupper = Object.keys(perFamilie)
      .sort((a, b) => (KB.familier[a].rekkefolge || 99) - (KB.familier[b].rekkefolge || 99))
      .map((fid) => gruppeFra([fid], perFamilie, KB));

    const slatt = [];
    while (grupper.length > antallSteder && grupper.length > 1) {
      let best = null;
      for (let i = 0; i < grupper.length; i++) {
        for (let j = i + 1; j < grupper.length; j++) {
          const sk = sammenslaingsPoeng(grupper[i], grupper[j], KB);
          if (!best || sk > best.sk) best = { i, j, sk };
        }
      }
      const a = grupper[best.i], b = grupper[best.j];
      const ny = gruppeFra([...a.familier, ...b.familier], perFamilie, KB);
      slatt.push([a.navn, b.navn]);
      grupper = grupper.filter((_, k) => k !== best.i && k !== best.j);
      grupper.push(ny);
      grupper.sort((x, y) => x.rekkefolge - y.rekkefolge);
    }
    let n = 1;
    while (grupper.length < antallSteder) {
      grupper.push({
        id: "fri" + n, navn: "Grønngjødsel eller fritt", familier: [], vekster: [],
        behov: -1, plass: 1, fyll: true, klasse: 0, rekkefolge: 100 + n
      });
      n++;
    }
    return { grupper, slatt };
  }

  function gruppeFra(familier, perFamilie, KB) {
    const vekster = familier.flatMap((f) => perFamilie[f]);
    const O = lagOppslag(KB);
    const behov = Math.max(...vekster.map((v) => BEHOV_TALL[O.vekst[v].behov]));
    const plass = Math.max(...vekster.map((v) => PLASS_TALL[O.vekst[v].plass] || 2));
    const klasser = familier.map((f) => KB.familier[f].klasse);
    return {
      id: familier.join("+"),
      navn: familier.map((f) => KB.familier[f].kortnavn).join(" + "),
      familier, vekster, behov, plass,
      klasse: Math.min(...klasser),
      rekkefolge: Math.min(...familier.map((f) => KB.familier[f].rekkefolge || 99)),
      fyll: false
    };
  }

  function sammenslaingsPoeng(a, b, KB) {
    let p = 0;
    // Samme klasse i kjøkkenhage-skiftet (Hageselskapet: belgvekster / næringskrevende / mindre næringskrevende / potetens år)
    const ka = new Set(a.familier.map((f) => KB.familier[f].klasse));
    const kb = new Set(b.familier.map((f) => KB.familier[f].klasse));
    if ([...ka].some((k) => kb.has(k))) p += 10;
    // Unngå å slå sammen to plasskrevende grupper
    if (a.plass === 3 && b.plass === 3) p -= 4;
    // Unngå to næringskrevende i samme bed, men det er bedre enn å bryte familiepausen
    if (a.behov === 3 && b.behov === 3) p -= 2;
    // Små grupper slås heller sammen enn store
    p -= 0.3 * (a.vekster.length + b.vekster.length);
    // Familier med lang anbefalt pause bør helst ikke deles med mange andre
    return p;
  }

  /* ---------- 3. Poeng for å sette gruppe g på sted s i år y ---------- */
  function historikkOppslag(historikk) {
    const m = {};
    for (const h of historikk) {
      m[h.sted] = m[h.sted] || {};
      m[h.sted][h.aar] = (m[h.sted][h.aar] || []).concat(h.vekster);
      if (h.usikker) m[h.sted]["usikker" + h.aar] = true;
    }
    return m;
  }

  function familierPaa(stedId, aar, hist, plan, grupperById, O) {
    const planlagt = plan[aar] && plan[aar][stedId];
    if (planlagt) {
      const g = grupperById[planlagt];
      return { familier: g.familier, behov: g.behov, belg: g.familier.includes("belg"), fyll: g.fyll, vekster: g.vekster, kjent: true };
    }
    const v = (hist[stedId] && hist[stedId][aar]) || null;
    if (!v) return { familier: [], behov: -1, belg: false, fyll: false, vekster: [], kjent: false };
    const fam = [...new Set(v.map((x) => O.vekst[x].familie))];
    const behov = v.length ? Math.max(...v.map((x) => BEHOV_TALL[O.vekst[x].behov])) : -1;
    return { familier: fam, behov, belg: fam.includes("belg"), fyll: false, vekster: v, kjent: true, tomt: v.length === 0 };
  }

  function sisteAarMedFamilie(stedId, fam, foer, hist, plan, grupperById, O, eldste) {
    for (let y = foer - 1; y >= eldste; y--) {
      const f = familierPaa(stedId, y, hist, plan, grupperById, O);
      if (f.familier.includes(fam)) return y;
    }
    return null;
  }

  function poeng(g, sted, aar, ctx) {
    const { hist, plan, grupperById, O, KB, eldste } = ctx;
    let p = 0;
    const grunner = [];
    if (g.fyll) {
      const forrige = familierPaa(sted.id, aar - 1, hist, plan, grupperById, O);
      if (forrige.fyll) { p += 8; grunner.push({ type: "info", kode: "fyll_igjen", tekst: "Dette skiftet var ledig også året før." }); }
      if (forrige.behov === 3) { p -= 3; grunner.push({ type: "bra", kode: "fyll_etter_tung", tekst: "Et år med grønngjødsel eller blomster gir jorda en pause etter næringskrevende vekster." }); }
      else grunner.push({ type: "info", kode: "fyll", tekst: "Ledig plass. Grønngjødsel bygger opp jorda til neste år, eller du kan så blomster." });
      return { p, grunner, plass: 0 };
    }
    for (const fid of g.familier) {
      const fam = KB.familier[fid];
      const sist = sisteAarMedFamilie(sted.id, fid, aar, hist, plan, grupperById, O, eldste);
      if (sist === null) continue;
      const pause = aar - sist - 1;
      if (pause === 0) {
        p += 2000;
        grunner.push({ type: "feil", kode: "rett_etter", familie: fid, pause, sist,
          tekst: `${fam.navn} sto her i ${sist}. Samme familie to år på rad på samme sted gir mer sykdom og skadedyr.` });
      } else if (pause < fam.minPause) {
        p += 150 * Math.pow(fam.minPause - pause, 2);
        grunner.push({ type: "advarsel", kode: "kort_pause", familie: fid, pause, sist,
          tekst: `${fam.navn} sto her sist i ${sist}, altså bare ${pause} år pause. Anbefalt er minst ${fam.minPause}.` });
      } else if (pause < fam.anbefaltPause) {
        p += 20 * (fam.anbefaltPause - pause);
        grunner.push({ type: "merk", kode: "under_anbefalt", familie: fid, pause, sist,
          tekst: `${fam.navn}: ${pause} års pause siden ${sist}. Det holder som minimum, men ${fam.anbefaltPause} år eller mer er bedre.` });
      } else {
        grunner.push({ type: "bra", kode: "god_pause", familie: fid, pause, sist,
          tekst: `${fam.navn}: ${pause} års pause siden ${sist}. Det er godt nok.` });
      }
    }
    const forrige = familierPaa(sted.id, aar - 1, hist, plan, grupperById, O);
    if (forrige.kjent) {
      if (g.behov === 3 && (forrige.belg || forrige.fyll)) {
        p -= 15;
        grunner.push({ type: "bra", kode: "tung_etter_belg", tekst: `Næringskrevende vekster får godt utbytte av ${forrige.belg ? "ertene og bønnene" : "grønngjødselen"} som sto her året før.` });
      } else if (g.behov === 3 && forrige.behov === 3) {
        p += 15;
        grunner.push({ type: "merk", kode: "tung_etter_tung", tekst: "Det sto næringskrevende vekster her også året før. Bland inn ekstra kompost." });
      } else if (g.behov <= 1 && g.behov >= 0 && forrige.behov === 3) {
        p -= 5;
        grunner.push({ type: "bra", kode: "lett_etter_tung", tekst: "Mindre næringskrevende vekster passer godt etter næringskrevende." });
      }
    }
    if (forrige.kjent || forrige.fyll) {
      const treff = (ref) => ref === "fyll" ? forrige.fyll : ref.startsWith("fam:") ? forrige.familier.includes(ref.slice(4)) : forrige.vekster.includes(ref);
      for (const r of KB.forgroder || []) {
        if (!g.vekster.includes(r.vekst)) continue;
        if (r.gode && r.gode.some(treff)) { p -= 4; grunner.push({ type: "bra", kode: "forgrode_god", kilde: r.kilde, tekst: r.tekst }); }
        if (r.darlige && r.darlige.some(treff)) { p += 6; grunner.push({ type: "merk", kode: "forgrode_darlig", kilde: r.kilde, tekst: r.tekst }); }
      }
    }
    let plass = 0;
    if (g.plass === 3 && sted.storrelse === "liten") {
      plass = 25;
      grunner.push({ type: "info", kode: "plass_liten", tekst: "Plasskrevende vekster på et lite skifte. Sett færre planter." });
    } else if (g.plass === 3 && sted.storrelse === "stor") {
      plass = -5;
    } else if (g.plass === 1 && sted.storrelse === "stor") {
      plass = 2;
    }
    return { p: p + plass, grunner, plass };
  }

  /* ---------- 4. Søk: stråle-søk over år, alle permutasjoner per år ---------- */
  function permutasjoner(n) {
    const res = [];
    const a = [...Array(n).keys()];
    const c = new Array(n).fill(0);
    res.push(a.slice());
    let i = 0;
    while (i < n) {
      if (c[i] < i) {
        if (i % 2 === 0) [a[0], a[i]] = [a[i], a[0]]; else [a[c[i]], a[i]] = [a[i], a[c[i]]];
        res.push(a.slice());
        c[i]++; i = 0;
      } else { c[i] = 0; i++; }
    }
    return res;
  }

  function ungarsk(kost) {
    // Klassisk Hungarian, minimerer sum. kost[n][n].
    const n = kost.length, INF = 1e18;
    const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i; let j0 = 0;
      const minv = new Array(n + 1).fill(INF), used = new Array(n + 1).fill(false);
      do {
        used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
        for (let j = 1; j <= n; j++) if (!used[j]) {
          const cur = kost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const tildeling = new Array(n);
    for (let j = 1; j <= n; j++) tildeling[p[j] - 1] = j - 1; // gruppe -> sted
    return tildeling;
  }

  function lagPlan(input, KB) {
    const O = lagOppslag(KB);
    const N = normaliser(input, KB);
    const rot = N.steder.filter((s) => s.iVekstskifte);
    const utenfor = N.steder.filter((s) => !s.iVekstskifte);
    const res = {
      startAar: N.startAar, antallAar: N.antallAar, aar: [], steder: N.steder, rotasjonssteder: rot.map((s) => s.id),
      grupper: [], plan: {}, grunner: {}, merknader: N.merknader.slice(), advarsler: [], ok: true
    };
    for (let k = 0; k < N.antallAar; k++) res.aar.push(N.startAar + k);

    if (rot.length === 0) {
      res.ok = false;
      res.advarsler.push({ type: "feil", tekst: "Fant ingen skifter å lage vekstskifte for. Beskriv bedene, karmene eller feltene du dyrker i." });
      return res;
    }
    if (N.onsker.length === 0) {
      res.ok = false;
      res.advarsler.push({ type: "feil", tekst: "Fant ingen grønnsaker å planlegge for. Si hva du har lyst til å dyrke." });
      return res;
    }
    if (rot.length > 12) {
      res.ok = false;
      res.advarsler.push({ type: "feil", tekst: "Prototypen håndterer opptil 12 skifter i vekstskiftet." });
      return res;
    }

    const { grupper, slatt } = lagGrupper(N.onsker, rot.length, KB);
    res.grupper = grupper;
    const grupperById = {};
    for (const g of grupper) grupperById[g.id] = g;
    const delte = grupper.filter((g) => g.familier.length > 1);
    if (delte.length) {
      const liste = delte.map((g) => g.familier.map((f) => KB.familier[f].kortnavn.toLowerCase()).join(" og ")).join("; ");
      res.merknader.push({ type: "info", kode: "slatt", tekst: rot.length === 1
        ? `Du har flere plantefamilier enn skifter. Disse deler derfor skiftet: ${liste}.`
        : `Du har flere plantefamilier enn skifter. Disse deler derfor skifte og flytter sammen: ${liste}.` });
    }
    const fyll = grupper.filter((g) => g.fyll).length;
    if (fyll) res.merknader.push({ type: "info", kode: "fyll", tekst: fyll === 1
      ? "Du har ett skifte mer enn du trenger. Ett skifte blir derfor ledig hvert år, på omgang. Fint til grønngjødsel, blomster eller mer av det du liker best."
      : `Du har ${fyll} skifter mer enn du trenger. Så mange blir derfor ledige hvert år, på omgang. Fint til grønngjødsel, blomster eller mer av det du liker best.` });

    const hist = historikkOppslag(N.historikk);
    const eldste = Math.min(N.startAar - 1, ...N.historikk.map((h) => h.aar));
    const n = rot.length;
    const helRunde = input.helRunde !== false;
    if (helRunde) {
      // En hel runde: like mange år som skifter, så hver gruppe er innom hvert skifte én gang
      res.aar = [];
      for (let k = 0; k < Math.min(12, Math.max(1, n)); k++) res.aar.push(N.startAar + k);
      res.antallAar = res.aar.length;
    }
    const ctxBase = { hist, grupperById, O, KB, eldste };
    res.plan = helRunde ? syklusPlan() : straalePlan();

    /* Ren rotasjon: alle skifter følger samme rekkefølge av grupper (sigma), forskjøvet.
       For en gitt rekkefølge kan hvert skiftes kostnad regnes for seg, og beste startgruppe per skifte
       finnes med den ungarske metoden. Rekkefølgen søkes ut helt (opptil 7 grupper) eller lokalt. */
    function syklusPlan() {
      const aar0 = res.aar[0], A = res.aar.length;
      // C = total kostnad (fag + plass), F = bare faglig kostnad (pauser, næring, forgrøder)
      function kostMatriser(sigma) {
        const pos = new Array(n); sigma.forEach((gi, p) => { pos[gi] = p; });
        const C = [], F = [];
        grupper.forEach((_, gi) => {
          C[gi] = []; F[gi] = [];
          rot.forEach((s, si) => {
            const plan = {}; let sum = 0, pl = 0;
            for (let k = 0; k < A; k++) {
              const y = aar0 + k;
              const g = grupper[sigma[(pos[gi] + k) % n]];
              const r = poeng(g, s, y, { ...ctxBase, plan });
              sum += r.p; pl += r.plass || 0;
              plan[y] = { [s.id]: g.id };
            }
            C[gi][si] = sum; F[gi][si] = sum - pl;
          });
        });
        return { C, F };
      }
      let bestFri = null, bestDiag = null;
      const E = 1e-9;
      function vurder(sigma) {
        const { C, F } = kostMatriser(sigma);
        // Fritt: beste startgruppe per skifte
        const t = ungarsk(C);
        const startFri = new Array(n);
        let c = 0, f = 0;
        for (let gi = 0; gi < n; gi++) { startFri[t[gi]] = gi; c += C[gi][t[gi]]; f += F[gi][t[gi]]; }
        if (!bestFri || c < bestFri.c - E || (Math.abs(c - bestFri.c) <= E && f < bestFri.f - E)) bestFri = { c, f, start: startFri, sigma: sigma.slice() };
        // Diagonalt: hver gruppe flytter ett skifte videre hvert år (ned eller opp i lista)
        let besteD = null;
        for (const d of [1, -1]) for (let c0 = 0; c0 < n; c0++) {
          const start = new Array(n);
          let dc = 0, df = 0;
          for (let i = 0; i < n; i++) { const gi = sigma[(((c0 - d * i) % n) + n) % n]; start[i] = gi; dc += C[gi][i]; df += F[gi][i]; }
          if (!besteD || df < besteD.f - E || (Math.abs(df - besteD.f) <= E && dc < besteD.c - E)) besteD = { c: dc, f: df, start, retning: d };
        }
        if (!bestDiag || besteD.f < bestDiag.f - E || (Math.abs(besteD.f - bestDiag.f) <= E && besteD.c < bestDiag.c - E)) bestDiag = { ...besteD, sigma: sigma.slice() };
        return { fri: c, diag: besteD.f * 1000 + besteD.c };
      }
      const klasseNokkel = (g) => g.fyll ? 1.5 : g.klasse || 5;
      if (n <= 7) {
        for (const p of permutasjoner(n - 1)) vurder([0, ...p.map((x) => x + 1)]);
      } else {
        for (const mal of ["fri", "diag"]) {
          let sigma = grupper.map((_, i) => i).sort((a, b) => klasseNokkel(grupper[a]) - klasseNokkel(grupper[b]) || a - b);
          let cur = vurder(sigma)[mal];
          for (let pass = 0; pass < 8; pass++) {
            let bedre = false;
            for (let i = 1; i < n; i++) for (let j = i + 1; j < n; j++) {
              const s2 = sigma.slice(); [s2[i], s2[j]] = [s2[j], s2[i]];
              const v = vurder(s2)[mal];
              if (v < cur - E) { sigma = s2; cur = v; bedre = true; }
            }
            if (!bedre) break;
          }
        }
      }
      function byggPlan(v) {
        const pos = new Array(n); v.sigma.forEach((gi, p) => { pos[gi] = p; });
        const plan = {};
        for (let k = 0; k < A; k++) {
          const y = aar0 + k; plan[y] = {};
          for (let i = 0; i < n; i++) plan[y][rot[i].id] = grupper[v.sigma[(pos[v.start[i]] + k) % n]].id;
        }
        return plan;
      }
      // Tell opp hva som skiller to planer faglig (rute = ett skifte ett år). Vektene er de samme som i poeng().
      const REKKE = { tung_etter_belg: -15, lett_etter_tung: -5, forgrode_god: -4, fyll_etter_tung: -3, forgrode_darlig: 6, fyll_igjen: 8, tung_etter_tung: 15 };
      function analyse(plan) {
        const a = { feil: 0, kort: 0, kortKost: 0, under: 0, underKost: 0, rekke: 0 };
        for (const y of res.aar) {
          const tidligere = {};
          for (const yy of res.aar) if (yy < y) tidligere[yy] = plan[yy];
          for (const s of rot) {
            const gr = poeng(grupperById[plan[y][s.id]], s, y, { ...ctxBase, plan: tidligere }).grunner;
            if (gr.some((g) => g.type === "feil")) a.feil++;
            else if (gr.some((g) => g.type === "advarsel")) a.kort++;
            if (gr.some((g) => g.kode === "under_anbefalt")) a.under++;
            for (const g of gr) {
              if (g.kode === "kort_pause") a.kortKost += Math.pow(KB.familier[g.familie].minPause - g.pause, 2);
              if (g.kode === "under_anbefalt") a.underKost += KB.familier[g.familie].anbefaltPause - g.pause;
              if (REKKE[g.kode]) a.rekke += REKKE[g.kode];
            }
          }
        }
        return a;
      }
      const ruter = (x) => `${x} ${x === 1 ? "rute" : "ruter"}`;
      function forskjell(d, f) {
        const verre = [], bedre = [];
        if (d.feil > f.feil) verre.push(`${ruter(d.feil - f.feil)} mer der samme familie står to år på rad`);
        if (d.kort > f.kort) verre.push(`${ruter(d.kort - f.kort)} mer med for kort pause`);
        else if (!verre.length && d.kortKost > f.kortKost) verre.push("enda kortere pause i rutene der pausen er for kort");
        if (!verre.length && d.under > f.under) verre.push(`${ruter(d.under - f.under)} mer der pausen er kortere enn anbefalt`);
        else if (!verre.length && d.underKost > f.underKost) verre.push("kortere pauser enn anbefalt for noen grønnsaker");
        if (verre.length < 2 && d.rekke > f.rekke) verre.push("en rekkefølge der færre grønnsaker kommer etter noe som passer godt foran dem");
        if (!verre.length) verre.push("en litt dårligere rekkefølge");
        // Er det jevne mønsteret bedre på noe, sier vi det også
        if (d.feil < f.feil) bedre.push(`${ruter(f.feil - d.feil)} færre der samme familie står to år på rad`);
        if (d.kort < f.kort) bedre.push(`${ruter(f.kort - d.kort)} færre med for kort pause`);
        return verre.join(" og ") + (bedre.length ? `, men ${bedre.join(" og ")}` : "");
      }
      // Velg det jevne mønsteret når det ikke er faglig dårligere, eller når brukeren ber om det
      const tvungen = input.monster === "jevnt";
      const fagligLik = bestDiag.f <= bestFri.f + E;
      const brukDiag = n > 1 && (fagligLik || tvungen);
      const valgt = brukDiag ? bestDiag : bestFri;
      res.monster = brukDiag ? { type: "diagonal", retning: bestDiag.retning, tvungen: tvungen && !fagligLik } : { type: "fritt", jevntMulig: n > 2 };
      if (n > 2 && !fagligLik) {
        const hva = forskjell(analyse(byggPlan(bestDiag)), analyse(byggPlan(bestFri)));
        res.merknader.push(tvungen
          ? { type: "merk", kode: "jevnt_valgt", tekst: `Du har valgt et jevnt mønster. Sammenlignet med den beste planen gir det ${hva}.` }
          : { type: "info", kode: "ikke_diagonal", tekst: `Planen følger ikke et helt jevnt mønster. Hvis alle gruppene skulle flyttet til naboskiftet hvert år, ville det ut fra det som sto der i ${N.startAar - 1} gitt ${hva}.` });
      }
      res.rekkefolge = valgt.sigma.map((gi) => grupper[gi].id);
      return byggPlan(valgt);
    }

    /* Fritt søk år for år (brukes bare når helRunde er slått av) */
    function straalePlan() {
      const perms = n <= 8 ? permutasjoner(n) : null;
      const BEAM = n <= 4 ? 600 : n <= 6 ? 60 : n <= 7 ? 24 : 12;
      let beams = [{ total: 0, plan: {} }];
      for (const aar of res.aar) {
        const nye = [];
        for (const b of beams) {
          const ctx = { ...ctxBase, plan: b.plan };
          const kost = grupper.map((g) => rot.map((s) => poeng(g, s, aar, ctx).p));
          if (perms) {
            const kandidater = [];
            for (const perm of perms) { let sum = 0; for (let gi = 0; gi < n; gi++) sum += kost[gi][perm[gi]]; kandidater.push({ sum, perm }); }
            kandidater.sort((x, y) => x.sum - y.sum || x.perm.join(",").localeCompare(y.perm.join(",")));
            for (const k of kandidater.slice(0, BEAM)) nye.push(utvid(b, aar, k.perm, k.sum));
          } else {
            const t = ungarsk(kost);
            let sum = 0; for (let gi = 0; gi < n; gi++) sum += kost[gi][t[gi]];
            nye.push(utvid(b, aar, t, sum));
          }
        }
        nye.sort((x, y) => x.total - y.total || x.sign.localeCompare(y.sign));
        const sett = new Set();
        beams = [];
        for (const b of nye) { if (sett.has(b.sign)) continue; sett.add(b.sign); beams.push(b); if (beams.length >= BEAM) break; }
      }
      function utvid(b, aar, perm, sum) {
        const plan = JSON.parse(JSON.stringify(b.plan));
        plan[aar] = {};
        for (let gi = 0; gi < n; gi++) plan[aar][rot[perm[gi]].id] = grupper[gi].id;
        return { total: b.total + sum, plan, sign: (b.sign || "") + "|" + aar + ":" + perm.join(",") };
      }
      return beams[0].plan;
    }
    const best = { plan: res.plan };

    // Begrunnelser for valgt plan
    const ctx = { hist, plan: best.plan, grupperById, O, KB, eldste };
    for (const aar of res.aar) {
      res.grunner[aar] = {};
      for (const s of rot) {
        const g = grupperById[best.plan[aar][s.id]];
        // Bruk planen fram til (men ikke med) dette året for poeng
        const tidligere = {};
        for (const y of res.aar) if (y < aar) tidligere[y] = best.plan[y];
        res.grunner[aar][s.id] = poeng(g, s, aar, { ...ctx, plan: tidligere }).grunner;
      }
    }

    // Overordnede advarsler: korteste pause per familie i planen
    const verst = {};
    for (const aar of res.aar) for (const s of rot) for (const gr of res.grunner[aar][s.id]) {
      if (gr.familie != null && gr.pause != null) {
        if (!verst[gr.familie] || gr.pause < verst[gr.familie].pause) verst[gr.familie] = { pause: gr.pause, aar, sted: s.navn };
      }
    }
    for (const fid of Object.keys(verst)) {
      const fam = KB.familier[fid];
      const v = verst[fid];
      if (v.pause === 0) res.advarsler.push({ type: "feil", familie: fid, tekst: `${fam.navn} må stå to år på rad i «${v.sted}» (${v.aar}). Med disse skiftene og det som sto der i ${N.startAar - 1}, går det ikke å unngå. Vurder å dele opp i flere skifter, eller å dyrke færre familier.` });
      else if (v.pause < fam.minPause) res.advarsler.push({ type: "advarsel", familie: fid, tekst: `${fam.navn} får bare ${v.pause} års pause («${v.sted}», ${v.aar}). Anbefalt er minst ${fam.minPause}. ${fam.grunn}` });
      else if (v.pause < fam.anbefaltPause) res.advarsler.push({ type: "merk", familie: fid, tekst: `${fam.navn} får ${v.pause} års pause. Det holder som minimum, men ${fam.anbefaltPause} år eller mer er bedre. ${fam.grunn}` });
    }
    // Familier som kommer tilbake hvert n. år: merknad om syklusen på lang sikt
    const iBruk = Object.values(KB.familier).filter((f) => grupper.some((g) => g.familier.includes(f.id)));
    const navnListe = (fs) => { const n = fs.map((f) => f.kortnavn.toLowerCase()); return n.length > 1 ? n.slice(0, -1).join(", ") + " og " + n[n.length - 1] : n.join(""); };
    const underMin = iBruk.filter((f) => n - 1 < f.minPause);
    const underAnb = iBruk.filter((f) => n - 1 >= f.minPause && n - 1 < f.anbefaltPause);
    if (underMin.length) {
      // Syklusen er kortere enn minimum: dette blir et brudd på lang sikt, også uten historikk
      const minst = Math.max(...underMin.map((f) => f.minPause));
      res.advarsler.push({ type: "advarsel", kode: "kort_syklus", tekst: n === 1
        ? "Med bare ett skifte står de samme grønnsakene på samme sted hvert år. Del arealet i flere skifter hvis du kan."
        : `Med ${n} skifter kommer hver gruppe tilbake til samme skifte hvert ${n}. år, altså etter ${n - 1} års pause. Det er kortere enn minimum på ${minst} år for ${navnListe(underMin)}. Del arealene i flere skifter hvis du kan.` });
    } else if (underAnb.length && !res.advarsler.length) {
      // Ingen konkrete brudd, men syklusen er kortere enn anbefalt på lang sikt
      res.merknader.push({ type: "info", kode: "kort_syklus", tekst: `Med ${n} skifter kommer hver gruppe tilbake til samme skifte hvert ${n}. år. For ${navnListe(underAnb)} anbefales lengre pause.` });
    }

    for (const s of utenfor) res.merknader.push({ type: "info", kode: "utenfor", tekst: `«${s.navn}» er ikke med i vekstskiftet${s.grunn ? " (" + s.grunn + ")" : ""}.` });
    const usikre = [...new Set(N.historikk.filter((h) => h.usikker).map((h) => h.sted))];
    for (const sid of usikre) {
      const s = N.steder.find((x) => x.id === sid);
      res.merknader.push({ type: "info", kode: "usikker", tekst: `Du var usikker på hva som sto i «${s.navn}» tidligere. Planen bygger på det du husket.` });
    }
    const utenHistorikk = rot.filter((s) => !N.historikk.some((h) => h.sted === s.id));
    if (utenHistorikk.length) res.merknader.push({ type: "info", kode: "ingen_historikk", tekst: (utenHistorikk.length === rot.length ? "Du har ikke sagt hva som sto hvor tidligere" : "Du har ikke sagt hva som sto i " + utenHistorikk.map((s) => "«" + s.navn + "»").join(", ") + " tidligere") + ". Planen kan ikke ta hensyn til det, så sjekk selv at ingenting kommer tilbake for tidlig." });
    // Plasskrevende på små steder – én samlet merknad
    const trangt = new Set();
    for (const aar of res.aar) for (const s of rot) if (res.grunner[aar][s.id].some((g) => g.kode === "plass_liten")) trangt.add(grupperById[res.plan[aar][s.id]].navn.toLowerCase());
    if (trangt.size) res.merknader.push({ type: "info", kode: "plass", tekst: `Noen år havner plasskrevende vekster (${[...trangt].join(", ")}) på små skifter. Da får du plass til færre planter.` });

    return res;
  }

  const api = { lagPlan, normaliser, lagGrupper, _intern: { permutasjoner, ungarsk } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Vekstskifte = api;
})(typeof window !== "undefined" ? window : globalThis);
