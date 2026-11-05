# Vekstskiftehjelpen – vekstskifte.no

Et gratis nettverktøy som lager en vekstskifteplan for kjøkkenhager og markedshager, og forklarer hvorfor vekstskifte er viktig og hva forskningen sier.

- **Planen** lages av faste regler fra en kunnskapsbase med norske fagkilder (`public/kb.js` og `public/engine.js`). Kunnskapsbasen er et utkast og er ikke gjennomgått av fagfolk ennå.
- **Claude** (Anthropic) brukes bare til to ting: å lese brukerens beskrivelse av dyrkningsarealene og å forklare den ferdige planen i vanlig språk. Resten av verktøyet virker også uten KI.

Ansvarlig: Grønt arbeid Nordvik, org.nr. 936 885 403. Laget med Claude (Anthropic).

## Slik er det bygd

| Mappe / fil | Hva |
|---|---|
| `public/` | Selve nettsiden: HTML, skript, bilder, fonter. Alt hentes fra vekstskifte.no, ingenting fra andre tjenester. |
| `public/kb.js` | Kunnskapsbasen: plantefamilier, pauser, grønnsaker og kilder. |
| `public/engine.js` | Regelmotoren som lager planen. |
| `public/prompter.js` | Instruksene til Claude. |
| `src/worker.js` | Serverfunksjonen (Cloudflare Worker) som snakker med Claude. Har API-nøkkelen. |
| `kilde/mal.html` | Malen for siden. `public/index.html` og `public/app.js` lages fra den. |
| `kilde/bygg.py` | Bygger `public/index.html` og `public/app.js` fra malen. |
| `wrangler.jsonc` | Oppsettet hos Cloudflare. |

Nettsiden kjører på **Cloudflare Workers** (gratisplanen). Hver gang det kommer en endring i dette repoet, bygger og publiserer Cloudflare siden på nytt av seg selv.

## Oppsett hos Cloudflare (gjøres én gang)

1. **Domenet:** vekstskifte.no er lagt til i Cloudflare (Free), og navnetjenerne hos Webhuset peker til Cloudflare.
2. **Koble repoet:** I Cloudflare: *Workers & Pages → Create → Import a repository → GitHub*, gi tilgang til dette repoet og velg det. Navnet på prosjektet skal være `vekstskifte` (samme som `name` i `wrangler.jsonc`). Trykk *Deploy*.
3. **API-nøkkelen:** Lag en nøkkel i [Claude Console](https://platform.claude.com) og legg den inn hos Cloudflare: *Workers & Pages → vekstskifte → Settings → Variables and Secrets → Add*, type **Secret**, navn `ANTHROPIC_API_KEY`. Nøkkelen skal aldri stå i koden eller i dette repoet.
4. **Domenet på siden:** Når domenet er aktivt i Cloudflare: *vekstskifte → Settings → Domains & Routes → Add → Custom domain → vekstskifte.no*.

Uten API-nøkkel virker alt unntatt KI-hjelpen, og siden sier fra om det.

## Kostnader og grenser

- Cloudflare Workers Free: 100 000 forespørsler til serverfunksjonen per dag. Selve sidene og bildene er gratis og uten grense.
- Claude API (Sonnet 5.5): omtrent 2 cent per plan med forklaring. Max-abonnementet gir 100 dollar i API-kreditt i måneden når Console-organisasjonen er koblet til abonnementet. Er kreditten brukt opp, stopper KI-hjelpen til neste måned (med mindre det er kjøpt ekstra kreditt eller slått på automatisk påfylling).
- Serverfunksjonen tar bare imot forespørsler fra selve nettsiden, begrenser lengden på teksten og tillater høyst 20 KI-forespørsler i minuttet fra samme adresse og 200 i minuttet til sammen (`ratelimits` i `wrangler.jsonc`).
- Modellen kan byttes i `wrangler.jsonc` (`MODELL`).

## Endre innholdet

- Fagstoff, grønnsaker og kilder: rediger `public/kb.js`.
- Tekster og utseende: rediger `kilde/mal.html`, og kjør `python3 kilde/bygg.py` for å lage `public/index.html` og `public/app.js` på nytt.
- Instruksene til Claude: rediger `public/prompter.js`.

## Teste lokalt

```sh
npm install
python3 kilde/bygg.py
# Lag filen .dev.vars med ANTHROPIC_API_KEY=... (brukes bare lokalt, ligger ikke i repoet)
npm run dev
```

Siden kjører da på http://localhost:8787.

## Personvern

Siden bruker ingen informasjonskapsler og lagrer ikke det brukerne skriver. Når noen ber om KI-hjelp, sendes beskrivelsen av arealene eller planen til Claude hos Anthropic. Anthropic bruker ikke data fra API-et til å trene modeller og sletter dem innen 30 dager.

## Lisenser for tredjepartsinnhold

- Bilder: [Unsplash](https://unsplash.com) (Unsplash-lisensen). Fotografene er kreditert på siden.
- Fonter: Fraunces, Schibsted Grotesk og IBM Plex Mono via [Fontsource](https://fontsource.org), SIL Open Font License (se `public/fonter/`).
- PDF: [jsPDF](https://github.com/parallax/jsPDF) 2.5.1, MIT-lisens (se `public/vendor/`).
