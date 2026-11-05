#!/usr/bin/env python3
"""Bygger nettsiden fra malen.

    python3 kilde/bygg.py                      # lager public/index.html og public/app.js
    python3 kilde/bygg.py --prototype FIL.html # lager i tillegg prototypen som kjører inne i Claude (én fil)

Malen (kilde/mal.html) er felles for nettsiden og prototypen. Kunnskapsbasen (public/kb.js),
regelmotoren (public/engine.js) og instruksene til Claude (public/prompter.js) redigeres direkte.
"""
import json
import pathlib
import sys

ROT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROT / "public"

EKSEMPEL_FORKLARING = (
    "Planen flytter grønnsakene til et nytt skifte hvert år. Da får ikke sykdommer og skadedyr som hører til hver plantefamilie, samle seg i jorda.\n"
    "- Neste år ({A1}) får skifte 1 på åkeren erter, skifte 2 løk og gulrot, skifte 3 salat og skifte 4 hodekål.\n"
    "- Hodekålen kommer etter ertene i skifte 4. Næringskrevende vekster får godt utbytte av erter og bønner året før.\n"
    "- Potetene flytter til pallekarmen, der salaten sto {SIST}. Salat er en god forgrøde for potet, men i en pallekarm får du plass til færre planter.\n"
    "- Løk og gulrot deler skifte, fordi du har flere plantefamilier enn skifter.\n"
    "- Jordbærdelen i enden av åkeren står fast og er ikke med i omgangen.\n"
    "Stemmer noe ikke, kan du endre valgene over og lage planen på nytt."
)

GOOGLE_FONTER = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">"""

GOATCOUNTER = "https://okologiskitall.goatcounter.com/count"

EGNE_FONTER = """<link rel="preload" href="fonter/fraunces-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonter/schibsted-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="fonter/fonter.css">"""

NETT_HODE = """<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Vekstskiftehjelpen – vekstskifteplan for kjøkkenhagen og markedshagen</title>
<meta name="description" content="Lag en vekstskifteplan for kjøkkenhagen eller markedshagen din, og lær hvorfor vekstskifte er viktig og hva forskningen sier. Gratis verktøy med norske fagkilder.">
<link rel="canonical" href="https://vekstskifte.no/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vekstskiftehjelpen">
<meta property="og:title" content="Vekstskiftehjelpen">
<meta property="og:description" content="Lag en vekstskifteplan for kjøkkenhagen eller markedshagen din, og lær hvorfor vekstskifte er viktig og hva forskningen sier.">
<meta property="og:url" content="https://vekstskifte.no/">
<meta property="og:image" content="https://vekstskifte.no/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Vekstskiftehjelpen – rader med ulike grønnsaker side om side">
<meta property="og:locale" content="nb_NO">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#23603a">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
"""


def les(navn):
    return (ROT / navn).read_text(encoding="utf-8")


def bytt(tekst, gammel, ny, antall=1):
    n = tekst.count(gammel)
    if n != antall:
        sys.exit(f"Fant «{gammel[:60]}» {n} ganger, ventet {antall}")
    return tekst.replace(gammel, ny)


def felles(mal):
    return bytt(mal, '/*__EKSEMPEL_FORKLARING__*/""', json.dumps(EKSEMPEL_FORKLARING, ensure_ascii=False))


def bygg_nett():
    t = felles(les("kilde/mal.html"))
    t = bytt(t, '/*__NETT__*/false', 'true')
    # Tekster som gjelder prototypen inne i Claude
    t = bytt(t, '<title>Vekstskiftehjelpen</title>\n', '')
    t = bytt(t, '<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    t = bytt(t, 'Prototype · Vekstskifte for', 'Testversjon · Vekstskifte for')
    t = bytt(t, ' AI-delen bruker av din egen Claude-kvote.', '')
    t = bytt(t, 'Vekstskiftehjelpen er en prototype.', 'Vekstskiftehjelpen er en testversjon.')
    t = bytt(t, '<!--__FONTER__-->', EGNE_FONTER)
    # Hovedskriptet flyttes til app.js, så siden kan ha en streng innholdssikkerhetsregel (CSP)
    start = t.index('<!--__SKRIPT__-->')
    s1 = t.index('<script>', start) + len('<script>')
    s2 = t.index('</script>', s1)
    app = t[s1:s2].strip() + "\n"
    hoved = t[:start] + '<script src="kb.js"></script>\n<script src="engine.js"></script>\n<script src="prompter.js"></script>\n<script src="app.js"></script>' + t[s2 + len('</script>'):]
    # Besøkstelling uten informasjonskapsler, i samme GoatCounter som okologiskitall.no.
    # Sidene telles som «vekstskifte.no/…», så de skilles fra okologiskitall.no. Se public/goatcounter.js.
    k = hoved.rindex('</script>') + len('</script>')
    hoved = hoved[:k] + '\n<script src="goatcounter.js"></script>\n<script data-goatcounter="' + GOATCOUNTER + '" async src="https://gc.zgo.at/count.js"></script>' + hoved[k:]
    # Alt til og med første </style> hører hjemme i <head>
    k = hoved.index('</style>') + len('</style>')
    html = (NETT_HODE + "<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}[hidden]{display:none!important}</style>\n"
            + hoved[:k].strip() + "\n</head>\n<body>\n" + hoved[k:].strip() + "\n</body>\n</html>\n")
    for rest in ("__", "fonts.googleapis", "cdnjs.cloudflare"):
        # (gc.zgo.at er GoatCounter og skal være med)
        if rest in html.replace("__proto__", ""):
            sys.exit(f"Fant «{rest}» i index.html")
    (PUB / "index.html").write_text(html, encoding="utf-8")
    (PUB / "app.js").write_text("/* Generert fra kilde/mal.html med kilde/bygg.py – rediger malen, ikke denne filen. */\n" + app, encoding="utf-8")
    print("public/index.html", len(html), "tegn, public/app.js", len(app), "tegn")


def bygg_prototype(ut):
    t = felles(les("kilde/mal.html"))
    t = bytt(t, '<!--__FONTER__-->', GOOGLE_FONTER)
    skript = "".join(f"<script>\n{les('public/' + f)}</script>\n" for f in ("kb.js", "engine.js", "prompter.js"))
    t = bytt(t, '<!--__SKRIPT__-->\n', skript)
    pathlib.Path(ut).write_text(t, encoding="utf-8")
    print(ut, len(t), "tegn")


if __name__ == "__main__":
    bygg_nett()
    if "--prototype" in sys.argv:
        bygg_prototype(sys.argv[sys.argv.index("--prototype") + 1])
