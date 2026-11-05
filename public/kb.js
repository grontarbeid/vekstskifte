/* Kunnskapsbase for vekstskifte i norske hobbyhager – UTKAST til faglig gjennomgang.
   Hver opplysning har en kilde. «antatt» betyr at verktøyet har satt en verdi som ikke står i kildene
   og som må kvalitetssikres av fagfolk. */
(function (root) {
  "use strict";
  const KB = {
    versjon: "utkast 0.6 – 05.11.2026",
    kilder: {
      hs: { kort: "Hageselskapet", tittel: "Hageselskapet: Grønnsaker (minibrosjyre)", url: "https://bakhagen.hageselskapet.no/getfile.php/1333007-1677498016/Bakhagen%20-%20filer/Brosjyrer/HS_Mini_Gronnsak_2022_161221-1.pdf" },
      ipv_kalrot: { kort: "IPV kålrot", tittel: "NLR/NIBIO: Kålrot – veileder for integrert plantevern (2026)", url: "https://www.nibio.no/tema/plantehelse/integrert-plantevern/ipv-veiledere-for-viktige-kulturer-2/_/attachment/inline/4c27e8a3-893d-4722-96c8-ec93b83690c0:75e4f23b05912a2ebaff4b53d22e398837f8cc11/K%C3%A5lrot_IPV-veileder.pdf" },
      ap_hodekal: { kort: "Agropub hodekål", tittel: "NORSØK/Agropub: Hodekål", url: "https://www.agropub.no/fagartikler/hodekal" },
      ipv_lok: { kort: "IPV løk", tittel: "NLR/NIBIO: Satt løk – veileder for integrert plantevern (2026)", url: "https://nibio.no/tema/plantehelse/integrert-plantevern/ipv-veiledere-for-viktige-kulturer-2/_/attachment/inline/4c27e8a3-893d-4722-96c8-ec93b83690c0:b475b7f24d967dca0b2f56e36a326945b16e6c76/Loek_IPV_veileder.pdf" },
      ap_purre: { kort: "Agropub purre", tittel: "NORSØK/Agropub: Purre", url: "https://www.agropub.no/fagartikler/purre" },
      sf_lok: { kort: "Bioforsk løk 2014", tittel: "Bioforsk TEMA nr. 16 (2014): Tiltak mot skadegjørere i økologisk produksjon av løkvekster (Serikstad, Bysveen og Holz)", url: "https://orgprints.org/id/eprint/26723/1/TEMA_Serikstad_l%C3%B8kvekster_web.pdf" },
      ap_gulrot: { kort: "Agropub gulrot", tittel: "NORSØK/Agropub: Gulrot", url: "https://www.agropub.no/fagartikler/gulrot" },
      ipv_gulrot: { kort: "IPV gulrot", tittel: "NLR/NIBIO: Gulrot – veileder for integrert plantevern", url: "https://nibio.no/tema/plantehelse/integrert-plantevern/ipv-veiledere-for-viktige-kulturer-2/_/attachment/inline/4c27e8a3-893d-4722-96c8-ec93b83690c0:dddb2b559c6bbf466b43d54fb0946dbc2610564e/Gulrot%20IPV_veileder.pdf" },
      ap_rodbete: { kort: "Agropub rødbete", tittel: "NORSØK/Agropub: Rødbete", url: "https://www.agropub.no/fagartikler/rodbete" },
      ap_spinat: { kort: "Agropub spinat", tittel: "NORSØK/Agropub: Spinat", url: "https://www.agropub.no/fagartikler/spinat" },
      ap_salat: { kort: "Agropub salat", tittel: "NORSØK/Agropub: Salat", url: "https://www.agropub.no/fagartikler/salat" },
      bf_2014: { kort: "Bioforsk 2014", tittel: "Bioforsk TEMA nr. 13 (2014): Plantevern i økologisk dyrking av frilandsgrønnsaker (Serikstad og Bysveen)", url: "https://orgprints.org/id/eprint/26719/1/TEMA_Serikstad_Plantevern_web.pdf" },
      ipv_potet: { kort: "IPV potet", tittel: "NLR/NIBIO: Potet – veileder for integrert plantevern (2023)", url: "https://nibio.no/tema/plantehelse/integrert-plantevern/ipv-veiledere-for-viktige-kulturer-2/_/attachment/inline/4c27e8a3-893d-4722-96c8-ec93b83690c0:5d83797e200825b2aa232dea118899025ddcd638/IPV-veileder_Potet.pdf" },
      ap_tomat: { kort: "Agropub tomat", tittel: "NORSØK/Agropub: Tomat", url: "https://www.agropub.no/fagartikler/tomat" },
      ap_squash: { kort: "Agropub squash", tittel: "NORSØK/Agropub: Squash", url: "https://www.agropub.no/fagartikler/squash" },
      nlr_erter: { kort: "NLR erter", tittel: "NLR Øst: Dyrking av erter og åkerbønner (fagmøte 2022)", url: "https://www.nlr.no/files/documents/Ost/Dyrking-av-erter-erter-og-akerbonner-fagmote-WEB-2022.pdf" },
      ap_bonner: { kort: "Agropub bønner", tittel: "NORSØK/Agropub: Bønner", url: "https://www.agropub.no/fagartikler/bonner" },
      ap_jordbaer: { kort: "Agropub jordbær", tittel: "NORSØK/Agropub: Jordbær", url: "https://www.agropub.no/fagartikler/jordbaer" },
      // Kilder til «Om vekstskifte» og «Les mer» (utkast 0.5)
      ap_vekstskifte: { kort: "Agropub vekstskifte", tittel: "NORSØK/Agropub: Vekstskifte (Ketil Valde, oppdatert 2026)", url: "https://www.agropub.no/fagartikler/vekstskifte" },
      nlr_vekstskifte: { kort: "NLR 2022", tittel: "NLR: Hva er et vekstskifte (Hanne Eliassen, 2022)", url: "https://www.nlr.no/nyhetsarkiv/ostlandet/2022/hva-er-et-vekstskifte" },
      nibio_korn: { kort: "NIBIO korn", tittel: "NIBIO: Vekstskifte (temaside om korn og forgrødeeffekter)", url: "https://www.nibio.no/tema/mat/korn-og-frovekster/korn/vekstskifte" },
      ok_nybegynner: { kort: "Økologisk.no", tittel: "Økologisk.no: Enkelt vekstskifte for nybegynnere", url: "https://www.okologisk.no/artikler/enkel-vekstskifte-for-nybegynnere/" },
      inrae2025: { kort: "INRAE 2025", tittel: "INRAE: Crop rotation – a global lever for yield, nutrition and revenue (pressemelding om Mudare mfl. 2025)", url: "https://www.inrae.fr/en/news/crop-rotation-global-lever-yield-nutrition-and-revenue" },
      bowles2020: { kort: "Bowles mfl. 2020", tittel: "Bowles mfl. (2020): Long-term evidence shows that crop-rotation diversification increases agricultural resilience to adverse growing conditions in North America. One Earth 2(3).", url: "https://doi.org/10.1016/j.oneear.2020.02.007" },
      mcdaniel2014: { kort: "McDaniel mfl. 2014", tittel: "McDaniel, Tiemann og Grandy (2014): Does agricultural crop diversity enhance soil microbial biomass and organic matter dynamics? A meta-analysis. Ecological Applications 24.", url: "https://doi.org/10.1890/13-0616.1" },
      liu2023: { kort: "Liu mfl. 2023", tittel: "Liu mfl. (2023): Changes in soil microbial biomass, diversity, and activity with crop rotation in cropping systems: A global synthesis. Applied Soil Ecology 186.", url: "https://doi.org/10.1016/j.apsoil.2023.104815" },
      pnw_klumprot: { kort: "PNW-håndboka", tittel: "Pacific Northwest Plant Disease Management Handbook: Broccoli – Clubroot (engelsk)", url: "https://pnwhandbooks.org/plantdisease/host-disease/broccoli-brassica-oleracea-clubroot" },
      snl_klumprot: { kort: "SNL klumprot", tittel: "Store norske leksikon: Klumprot (Klaus Høiland, oppdatert 2024)", url: "https://snl.no/klumprot" },
      mt_pcn: { kort: "Mattilsynet PCN", tittel: "Mattilsynet: Potetcystenematode (PCN)", url: "https://mattilsynet.no/planter-og-dyrking/planteskadegjorere/potetcystenematode-pcn" },
      rhs_rotasjon: { kort: "RHS", tittel: "Royal Horticultural Society: Crop rotation (engelsk)", url: "https://www.rhs.org.uk/vegetables/crop-rotation" },
      norsok_2016: { kort: "NORSØK 2016", tittel: "NORSØK Rapport 1(6) 2016: Produsentsamarbeid for økt økologisk grøntproduksjon – utfordringer og tiltak (Grete Lene Serikstad)", url: "https://orgprints.org/31148/1/NORS%C3%98K%20Rapport%20Vol%201%20nr%206%20Utredning%20vekstskifte%20gr%C3%B8nnsaker.pdf" },
      norsok_veksthus: { kort: "NORSØK 2021", tittel: "NORSØK Faginfo 6(2) 2021: Vekstskifte og plantenæring i økologisk veksthusdyrking (Susanne Friis Pedersen)", url: "https://orgprints.org/id/eprint/43359/1/Faginfo%202%20vol%206%20Vekstskifte%20og%20planten%C3%A6ring%202021.pdf" },
      norsok_jorddekke: { kort: "NORSØK 2005", tittel: "NORSØK Småskrift 2/2005: Planter som jorddekke – gjødsling og plantevern (Kirsty McKinnon og Anne-Kristin Løes)", url: "https://orgprints.org/id/eprint/5961/1/Smaskrift_nr2_05.pdf" },
      debio_gronngj: { kort: "Temaark grønngjødsling", tittel: "NLR, Mattilsynet og Debio: Temaark 7 – Grønngjødsling", url: "https://debio.no/dokumenter/temaark-7-gronngjodsling" },
      mudare2025: { kort: "Mudare mfl. 2025", tittel: "Mudare mfl. (2025): Crop rotations synergize yield, nutrition, and revenue: a meta-analysis. Nature Communications 16.", url: "https://doi.org/10.1038/s41467-025-64567-9" },
      zhao2022: { kort: "Zhao mfl. 2022", tittel: "Zhao mfl. (2022): Global systematic review with meta-analysis reveals yield advantage of legume-based rotations and its drivers. Nature Communications 13.", url: "https://doi.org/10.1038/s41467-022-32464-0" },
      tamburini2020: { kort: "Tamburini mfl. 2020", tittel: "Tamburini mfl. (2020): Agricultural diversification promotes multiple ecosystem services without compromising yield. Science Advances 6(45).", url: "https://doi.org/10.1126/sciadv.aba1715" }
    },

    /* Kunnskapsdelen (fanen «Lær om vekstskifte»). Hvert avsnitt har kilder. Familiekortene lages fra familiene nedenfor. */
    omVekstskifte: {
      ingress: "Vekstskifte betyr at grønnsakene flytter til et nytt sted i hagen hvert år, i en fast rekkefølge. Det er plantefamilien som teller: samme familie skal ikke tilbake til samme sted før det har gått noen år. Her kan du lese hvorfor det er viktig, hva forskningen sier, og hvordan du får det til i en liten hage.",
      kortFortalt: [
        { tekst: "Grønnsakene flytter til et nytt skifte hvert år, i en fast rekkefølge.", kilder: [] },
        { tekst: "Det er plantefamilien som teller. Potet og tomat er i samme familie, og det samme er kål, kålrot og reddik.", kilder: [] },
        { tekst: "Hovedgrunnen er sykdommer og skadedyr som lever i jorda og venter på neste plante i samme familie.", kilder: [] },
        { tekst: "Vekstskifte gir også bedre bruk av næringen, mindre ugras og mer liv i jorda.", kilder: [] },
        { tekst: "Store forskningsoversikter finner rundt 20 % høyere avling med vekstskifte enn når det samme dyrkes år etter år.", kilder: ["mudare2025", "zhao2022"] }
      ],
      temaer: [
        { id: "hva", tittel: "Hva er vekstskifte?", innhold: [
          { tekst: "Et vekstskifte er at ulike vekster avløser hverandre på samme stykke jord over tid. Arealet deles i skifter, og hvert år flytter hver gruppe grønnsaker ett skifte videre. Etter noen år er gruppen tilbake der den begynte, og runden starter på nytt.", kilder: ["ap_vekstskifte", "nlr_vekstskifte", "norsok_veksthus"] },
          { figur: "runde" },
          { tekst: "Det er plantefamilien som teller, ikke den enkelte grønnsaken. Potet og tomat er i samme familie. Det samme er hodekål, kålrot og reddik. Grønnsaker i samme familie deler mange av de samme sykdommene og skadedyrene.", kilder: ["rhs_rotasjon", "mt_pcn"] },
          { tekst: "Hageselskapet regner tre til fire år mellom hver runde som et minimum, og flere år er bedre hvis du har plass. For kålvekster og erter anbefales seks år eller mer.", kilder: ["hs"] }
        ] },
        { id: "hvorfor", tittel: "Hvorfor er det viktig?", innhold: [
          { tekst: "Vekstskifte virker på flere måter samtidig. I en kjøkkenhage er det viktigste at sykdommer og skadedyr i jorda holdes nede.", kilder: [] },
          { undertittel: "1. Sykdommer og skadedyr", tekst: "Mange sykdommer og skadedyr holder seg til én plantefamilie og kan overleve i jorda fra år til år. Kommer den samme familien tilbake for tidlig, får de mat igjen og formerer seg. Med lang nok pause blir det færre av dem.", kilder: ["ap_vekstskifte", "nlr_vekstskifte", "norsok_2016"] },
          { liste: [
            { tekst: "Klumprot på kålvekster kan overleve minst 6–8 år i jorda.", kilder: ["snl_klumprot"] },
            { tekst: "Ertesyke har hvilesporer som kan leve 6–8 år i jorda.", kilder: ["nlr_erter"] },
            { tekst: "Gulrotflua overvintrer i jorda.", kilder: ["ap_gulrot"] },
            { tekst: "Potetcystenematoden angriper potet og tomat og kan overleve flere tiår i jorda.", kilder: ["mt_pcn"] }
          ] },
          { tekst: "Smitten forsvinner gradvis. For hvilesporene til klumprot oppgis en halveringstid på 3–6 år: etter så lang tid er halvparten av sporene borte. Figuren viser hva det betyr.", kilder: ["pnw_klumprot"] },
          { figur: "klumprot" },
          { tekst: "Etter tre år uten kålvekster er fortsatt 50–70 % av smitten igjen, og etter seks år 25–50 %. Pausen tar altså ikke bort smitten, men den hindrer at den bygger seg opp år for år. Derfor anbefales lange pauser for kål, og derfor er det viktig å unngå å få smitten inn i hagen.", kilder: ["pnw_klumprot", "hs"] },
          { undertittel: "2. Næring", tekst: "Grønnsakene bruker ulik mengde næring. Kål, purre og selleri krever mye. Erter og bønner binder nitrogen fra lufta med hjelp av bakterier i rotknollene, og noe av det kommer veksten etter til gode. Derfor passer næringskrevende vekster godt etter erter og bønner.", kilder: ["hs", "norsok_veksthus"] },
          { undertittel: "3. Ugras", tekst: "Dyrker du det samme på samme sted år etter år, blir det mer av enkelte ugrasarter. Agropub kaller vekstskifte en nødvendig forutsetning for å få god kontroll med ugraset.", kilder: ["ap_vekstskifte", "norsok_2016"] },
          { undertittel: "4. Jordliv og jordstruktur", tekst: "Vekster med ulik rotdybde henter næring fra ulike lag i jorda. Belgvekster og grønngjødsel bygger opp organisk materiale. Det gir mat til jordlivet og bedre jordstruktur, og jorda holder bedre på vann og næring. Forskningen finner rundt 20 % mer mikroliv i jorda med vekstskifte.", kilder: ["ap_vekstskifte", "nlr_vekstskifte", "mcdaniel2014"] },
          { undertittel: "5. Mer stabile avlinger", tekst: "Med variert vekstskifte svinger avlingen mindre fra år til år. I langvarige forsøk i Nord-Amerika ble avlingstapet i tørkeår 14–90 % mindre enn med ensidig dyrking.", kilder: ["bowles2020", "inrae2025"] }
        ] },
        { id: "forskning", tittel: "Hva sier forskningen?", innhold: [
          { tekst: "Vekstskifte er godt undersøkt i jordbruket. De sterkeste bevisene kommer fra metaanalyser, der forskere slår sammen resultater fra hundrevis av forsøk. Her er de viktigste funnene.", kilder: [] },
          { nokkeltall: [
            { verdi: "+20 %", etikett: "Høyere avling", forklaring: "Snitt i 738 feltforsøk, sammenlignet med å dyrke det samme år etter år.", kilder: ["mudare2025", "inrae2025"] },
            { verdi: "+21 %", etikett: "Mer mikroliv i jorda", forklaring: "Mer mikrobiell biomasse, ifølge 122 studier.", kilder: ["mcdaniel2014"] },
            { verdi: "14–90 %", etikett: "Mindre avlingstap i tørkeår", forklaring: "Mais i 11 langvarige forsøk i USA og Canada.", kilder: ["bowles2020"] },
            { verdi: "+14 %", etikett: "Mer protein i avlingen", forklaring: "Også mer jern, sink og magnesium.", kilder: ["mudare2025", "inrae2025"] }
          ] },
          { studier: [
            { tittel: "Mer mat, og mer næringsrik mat", kilde: "mudare2025", ekstra: ["inrae2025"], tekst: "Sammenstilte 3 663 sammenligninger fra 738 feltforsøk på seks kontinenter, fra 1980 til 2024. Med vekstskifte ble avlingen i snitt 20 % høyere enn ved ensidig dyrking, og 23 % høyere når belgvekster var med. Avlingene ga også 24 % mer energi, 14 % mer protein og mer jern, magnesium og sink, og de svingte mindre fra år til år." },
            { tittel: "Erter og bønner gir neste vekst et løft", kilde: "zhao2022", tekst: "Global gjennomgang av forsøk med belgvekster i vekstskiftet. Når en belgvekst sto året før, ble avlingen av neste vekst i snitt rundt 20 % høyere." },
            { tittel: "Mer robust i dårlige år", kilde: "bowles2020", tekst: "Fulgte 11 langvarige forsøk i USA og Canada, til sammen 347 forsøksår. Mais i variert vekstskifte ga i snitt 28 % høyere avling, og i tørkeår ble avlingstapet 14–90 % mindre." },
            { tittel: "Mer liv i jorda", kilde: "mcdaniel2014", tekst: "Gjennomgikk 122 studier. Vekstskifte økte mengden mikroorganismer i jorda med rundt 21 %, og karbon og nitrogen i jorda med 3,6 og 5,3 %. Med fangvekster i omløpet ble økningen i karbon og nitrogen 8,5 og 12,8 %." },
            { tittel: "Mer mangfold i jordlivet", kilde: "liu2023", tekst: "En nyere gjennomgang av 76 studier fant 13 % mer mikrobiell biomasse og 8 % høyere mangfold av bakterier med vekstskifte enn ved ensidig dyrking. Effekten var størst når belgvekster var med." },
            { tittel: "Bra for naturen, uten å koste avling", kilde: "tamburini2020", tekst: "Sammenlignet variert og ensidig drift i 5 188 studier, blant annet vekstskifte. I 63 % av sammenligningene ble naturgoder som vannkvalitet, pollinering, naturlig skadedyrkontroll og karbonlagring bedre, mens avlingen holdt seg eller økte." }
          ] },
          { tekst: "Også i norsk kornproduksjon regner NIBIO vekstskifte som et viktig tiltak, med positive virkninger på avling, kvalitet og økonomi.", kilder: ["nibio_korn"] },
          { boks: { tittel: "Hvor sikker er kunnskapen?", liste: [
            { tekst: "Metaanalyser gir sikrere svar enn ett enkelt forsøk, men effekten varierer mye mellom steder, jord, klima og vekster. Tallene er gjennomsnitt.", kilder: [] },
            { tekst: "Nesten all forskningen gjelder åkervekster som korn, mais og soya. Det finnes lite forskning på kjøkkenhager, så tallene kan ikke overføres direkte til hagen din.", kilder: [] },
            { tekst: "Rådene om hvor lang pause hver familie trenger, bygger på kunnskap om hvor lenge sykdommer og skadedyr lever i jorda.", kilder: ["hs", "snl_klumprot", "ipv_lok"] }
          ] } }
        ] },
        { id: "familier", tittel: "Plantefamiliene", familiekort: true, innhold: [
          { tekst: "Grønnsakene i verktøyet hører til disse familiene. Tallene er hvor mange hele år det bør gå før familien står på samme sted igjen: «minst» er Hageselskapets minimum, «helst» er det fagkildene anbefaler. Kildene for hver familie står i kunnskapsbasen nederst.", kilder: [] }
        ] },
        { id: "tips", tittel: "Tips for små hager", innhold: [
          { liste: [
            { tekst: "Med fire skifter eller flere får hver familie minst tre års pause, som er Hageselskapets minimum.", kilder: ["hs"] },
            { tekst: "Pallekarmer og oppbygde bed kan være hvert sitt skifte. Da er det lett å se hvor grensene går.", kilder: [] },
            { tekst: "Skriv ned hva som sto hvor hvert år, eller ta bilde av planen. Det er lett å glemme fra en sesong til den neste.", kilder: [] },
            { tekst: "Salat, squash og mais kan stå der det er plass, men ikke for ofte på samme sted.", kilder: ["rhs_rotasjon"] },
            { tekst: "Står et skifte ledig, kan du så grønngjødsel. Velg en blanding med mye belgvekster, som kløver eller erter, og la plantene ligge på jorda eller mold dem grunt ned.", kilder: ["debio_gronngj"] },
            { tekst: "Sennep og oljereddik er i kålfamilien. Så dem ikke som grønngjødsel der du snart skal ha kål eller kålrot.", kilder: ["debio_gronngj", "norsok_veksthus"] },
            { tekst: "Jordbær, rabarbra og asparges står utenfor omgangen. Når du en gang flytter jordbærene, bør det gå minst fire år før nye jordbær plantes på samme sted.", kilder: ["rhs_rotasjon", "ap_jordbaer"] },
            { tekst: "Bruk sertifiserte settepoteter, og vær forsiktig med jord og planter med jord på røttene fra andre hager. Slik kan potetcystenematode følge med.", kilder: ["mt_pcn"] }
          ] }
        ] },
        { id: "grenser", tittel: "Det vekstskifte ikke løser", innhold: [
          { tekst: "Vekstskifte forebygger. Har jorda først fått en alvorlig sykdom, holder ikke en vanlig runde på fire–fem år. Klumprot trenger 6–8 år uten kålvekster, løkhvitråte kan overleve 15–20 år i jorda, og potetcystenematoden kan leve i flere tiår. Mistenker du slik sykdom, bør du spørre en rådgiver, for eksempel i Norsk Landbruksrådgiving.", kilder: ["snl_klumprot", "ipv_lok", "mt_pcn"] },
          { tekst: "Vekstskifte og gjødsling henger sammen og bør planlegges sammen.", kilder: ["norsok_jorddekke"] },
          { tekst: "I drivhus er vekstskifte vanskeligere, fordi tomat, paprika, chili og aubergine alle er i potetfamilien. Derfor er drivhus ikke med i denne planen. NORSØK har en egen faginfo om vekstskifte i veksthus.", kilder: ["norsok_veksthus"] },
          { tekst: "Fagkildene gir ikke alltid de samme tallene. Verktøyet bruker Hageselskapets minimum og fagkildenes anbefaling, og sier fra når en plan bare når minimum.", kilder: ["hs"] }
        ] },
        { id: "verktoy", tittel: "Slik lager verktøyet planen", innhold: [
          { tekst: "Planen regnes ut av faste regler, ikke av KI. Reglene og kildene står i kunnskapsbasen nederst på siden.", kilder: [] },
          { liste: [
            { tekst: "Først unngår verktøyet at samme familie står på samme sted to år på rad.", kilder: [] },
            { tekst: "Så gir det hver familie så lang pause som mulig, helst den anbefalte.", kilder: [] },
            { tekst: "Deretter legger det næringskrevende vekster etter erter og bønner, og tar hensyn til gode og dårlige forgrøder.", kilder: [] },
            { tekst: "Til slutt ser det på om plasskrevende vekster havner på små skifter.", kilder: [] }
          ] },
          { tekst: "Når det ikke gjør planen faglig dårligere, velger verktøyet et jevnt mønster der gruppene flytter til naboskiftet hvert år. Det er lettere å huske.", kilder: [] },
          { tekst: "Claude brukes bare til to ting: å forstå beskrivelsen av arealene dine, og å skrive forklaringen til planen. Claude får beskjed om å holde seg til planen og kunnskapsbasen og ikke legge til egne fakta.", kilder: [] }
        ] }
      ],
      lesMer: [
        { gruppe: "Om vekstskifte generelt", lenker: [
          { kilde: "ap_vekstskifte", om: "Grundig norsk fagartikkel om hvorfor og hvordan, med næring, ugras, sykdom og grønngjødsel. Skrevet for gårdbrukere, men lett å følge." },
          { kilde: "nlr_vekstskifte", om: "Kort innføring fra Norsk Landbruksrådgiving om hva vekstskifte gjør for skadegjørere, jordliv og jordstruktur." },
          { kilde: "nibio_korn", om: "NIBIOs temaside om vekstskifte i korn, med norsk forskning på hvordan forgrøden påvirker avlingen året etter." }
        ] },
        { gruppe: "For hobbydyrkere", lenker: [
          { kilde: "hs", om: "Kort innføring i grønnsaksdyrking, med råd om vekstskifte og næringsbehov." },
          { kilde: "ok_nybegynner", om: "Enkel innføring for nybegynnere, med forslag om seks skifter etter plantefamilie. Bygger på erfaring og oppgir få kilder." },
          { kilde: "rhs_rotasjon", om: "Oversiktlig forklaring av gruppene og omløpet, fra det britiske hageselskapet." },
          { kilde: "snl_klumprot", om: "Om en av sykdommene vekstskifte skal forebygge, og hvorfor kål trenger lang pause." },
          { kilde: "mt_pcn", om: "Hvorfor potet ikke bør stå på samme sted år etter år, og hvordan smitten spres." }
        ] },
        { gruppe: "For markedshager og økologisk dyrking", lenker: [
          { kilde: "norsok_2016", om: "Vekstskifte med eng og grønnsaker, og samarbeid mellom gårder om vekstskiftet." },
          { kilde: "debio_gronngj", om: "Praktisk veileder om grønngjødsel i økologisk drift." },
          { kilde: "norsok_jorddekke", om: "Grønngjødsel og plantehakk som jorddekke, gjødsel og ugrasdemper." },
          { kilde: "norsok_veksthus", om: "Vekstskifte, grønngjødsel og næring i drivhus og veksthus." },
          { kilde: "bf_2014", om: "Fagtema om plantevern i økologisk dyrking av frilandsgrønnsaker." }
        ], merknad: "Fagark om hver grønnsak fra Agropub og veiledere for integrert plantevern fra NLR og NIBIO står i kildelista i kunnskapsbasen." }
      ],
      lesMerMerknad: "Forskningsartiklene står under «Hva sier forskningen?» ovenfor."
    },

    /* klasse = plass i Hageselskapets firedelte kjøkkenhage-skifte:
       1 erter og bønner, 2 næringskrevende, 3 mindre næringskrevende, 4 «potetens år» (potet, mais, gresskar).
       Pause = antall hele år uten familien på samme sted.
       minPause = Hageselskapets minimum for kjøkkenhagen («tre–fire år mellom hver runde er et minimum»).
       anbefaltPause = det fagkildene for yrkesdyrkere anbefaler (laveste tall i spennet de oppgir). */
    familier: {
      belg: { id: "belg", navn: "Erter og bønner", kortnavn: "Erter og bønner", botanisk: "Erteblomstfamilien (belgvekster)", klasse: 1, rekkefolge: 1,
        minPause: 3, anbefaltPause: 6,
        grunn: "Ertesyke (visnesyke) har hvilesporer som kan leve 6–8 år i jorda. For bønner anbefales 4–6 år.",
        kilder: ["hs", "nlr_erter", "ap_bonner"] },
      korsblomst: { id: "korsblomst", navn: "Kålfamilien (all kål, kålrot, reddik)", kortnavn: "Kålfamilien", botanisk: "Korsblomstfamilien", klasse: 2, rekkefolge: 2,
        minPause: 3, anbefaltPause: 6,
        grunn: "Klumprot (kålbrokk) kan overleve minst 7 år i jorda og angriper alle kålvekster, også ugras som pengeurt og gjetertaske.",
        kilder: ["hs", "ipv_kalrot", "ap_hodekal"] },
      lok: { id: "lok", navn: "Løkfamilien (løk, purre, hvitløk)", kortnavn: "Løkfamilien", botanisk: "Løkfamilien (Allium)", klasse: 3, rekkefolge: 3,
        minPause: 3, anbefaltPause: 4,
        grunn: "Løkflue og flere soppsykdommer hoper seg opp. Har du hatt løkhvitråte, bør det gå 10–15 år før løk eller purre dyrkes der igjen.",
        kilder: ["hs", "ap_purre", "ipv_lok", "sf_lok"] },
      skjerm: { id: "skjerm", navn: "Gulrotfamilien (gulrot, persille, selleri, dill)", kortnavn: "Gulrotfamilien", botanisk: "Skjermplantefamilien", klasse: 3, rekkefolge: 4,
        minPause: 3, anbefaltPause: 6,
        grunn: "Gulrotflua overvintrer i jorda, og sopper som gir råte på lager hoper seg opp. Fagkildene anbefaler helst 5–7 år for gulrot.",
        kilder: ["hs", "ap_gulrot", "ipv_gulrot"] },
      amarant: { id: "amarant", navn: "Betefamilien (rødbete, mangold, spinat)", kortnavn: "Betefamilien", botanisk: "Amarantfamilien", klasse: 3, rekkefolge: 5,
        minPause: 3, anbefaltPause: 4,
        grunn: "Skurv og jordboende sopper hoper seg opp. Rødbete bør ikke dyrkes på samme sted oftere enn hvert femte år.",
        kilder: ["hs", "ap_rodbete", "ap_spinat"] },
      kurv: { id: "kurv", navn: "Salatfamilien", kortnavn: "Salatfamilien", botanisk: "Kurvplantefamilien", klasse: 3, rekkefolge: 6,
        minPause: 3, anbefaltPause: 4,
        grunn: "Kildene gir ikke eget tall for salat. Den generelle regelen for grønnsaker er minst fire år.",
        kilder: ["hs", "ap_salat", "bf_2014"] },
      sotvier: { id: "sotvier", navn: "Potetfamilien (potet, tomat, paprika)", kortnavn: "Potetfamilien", botanisk: "Søtvierfamilien", klasse: 4, rekkefolge: 7,
        minPause: 3, anbefaltPause: 4,
        grunn: "Flere soppsykdommer har hvilesporer som lever lenge i jorda. Tomat er nær i slekt med potet og får tørråte.",
        kilder: ["hs", "ipv_potet", "ap_tomat"] },
      gresskar: { id: "gresskar", navn: "Gresskarfamilien (squash, gresskar, agurk)", kortnavn: "Gresskarfamilien", botanisk: "Gresskarfamilien", klasse: 4, rekkefolge: 8,
        minPause: 3, anbefaltPause: 4,
        grunn: "Squash bør ha 4–6 års avstand på samme sted. Den deler ikke sykdommer med andre grønnsaker.",
        kilder: ["hs", "ap_squash"] },
      gras: { id: "gras", navn: "Mais", kortnavn: "Mais", botanisk: "Grasfamilien", klasse: 4, rekkefolge: 9,
        minPause: 3, anbefaltPause: 4,
        grunn: "Kildene gir ikke eget tall for mais. Den generelle regelen for grønnsaker er minst fire år.",
        kilder: ["hs", "bf_2014"] },
      rose: { id: "rose", navn: "Jordbær", kortnavn: "Jordbær", botanisk: "Rosefamilien", klasse: 0, rekkefolge: 20, minPause: 3, anbefaltPause: 4,
        grunn: "Når du en gang flytter jordbærene, bør jorda ha andre vekster i minst fire år før nye jordbær plantes der.", kilder: ["ap_jordbaer"] },
      slirekne: { id: "slirekne", navn: "Rabarbra", kortnavn: "Rabarbra", botanisk: "Slireknefamilien", klasse: 0, rekkefolge: 21, minPause: 3, anbefaltPause: 4, grunn: "", kilder: [] },
      asparges: { id: "asparges", navn: "Asparges", kortnavn: "Asparges", botanisk: "Aspargesfamilien", klasse: 0, rekkefolge: 22, minPause: 3, anbefaltPause: 4, grunn: "", kilder: [] },
      leppeblomst: { id: "leppeblomst", navn: "Krydderurter", kortnavn: "Krydderurter", botanisk: "Leppeblomstfamilien", klasse: 0, rekkefolge: 23, minPause: 3, anbefaltPause: 4, grunn: "", kilder: [] }
    },

    /* Forgrøder: hva som passer eller ikke passer året før en bestemt grønnsak.
       ref er vekst-id-er eller «fam:<familie>». */
    forgroder: [
      { vekst: "potet", gode: ["salat", "gulrot", "rodbete"], tekst: "Salat, gulrot og rødbete er gode forgrøder for potet.", kilde: "hs" },
      { vekst: "gulrot", gode: ["fam:korsblomst", "selleri", "purre"], tekst: "Gulrot passer godt etter kål, purre eller selleri.", kilde: "hs" },
      { vekst: "purre", gode: ["fam:belg", "fyll"], tekst: "Purre passer godt etter erter, bønner eller grønngjødsel.", kilde: "hs" },
      { vekst: "rodbete", darlige: ["potet", "gulrot"], tekst: "Potet og gulrot er mindre egnet året før rødbete.", kilde: "ap_rodbete" },
      { vekst: "kepalok", darlige: ["potet", "selleri"], tekst: "Løk bør ikke settes etter potet eller selleri.", kilde: "hs" },
      { vekst: "salat", darlige: ["fam:korsblomst", "fam:amarant"], tekst: "Kål, bete og spinat er dårlige forgrøder for salat.", kilde: "ap_salat" }
    ],

    /* behov: hoy | middels | lav | tilforer.  behovKilde: "hs" eller "antatt".
       plass: grovt anslag (liten | middels | stor), antatt for alle. */
    vekster: [
      // Belgvekster
      { id: "ert", navn: "Erter", familie: "belg", behov: "tilforer", behovKilde: "hs", plass: "middels", synonymer: ["ert", "erter", "grønne erter", "hageerter", "marg-erter", "tørkeerter"] },
      { id: "sukkerert", navn: "Sukkererter", familie: "belg", behov: "tilforer", behovKilde: "hs", plass: "middels", synonymer: ["sukkerert", "sukkererter", "sukkerertebelger", "sugar snap", "snøerter", "mangetout"] },
      { id: "bonne", navn: "Bønner", familie: "belg", behov: "tilforer", behovKilde: "hs", plass: "middels", synonymer: ["bønne", "bønner", "buskbønner", "stangbønner", "brekkbønner", "aspargesbønner"] },
      { id: "bondebonne", navn: "Bondebønner", familie: "belg", behov: "tilforer", behovKilde: "hs", plass: "middels", synonymer: ["bondebønne", "hestebønne", "åkerbønne"] },
      // Kålvekster
      { id: "hodekal", navn: "Hodekål", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "stor", synonymer: ["kål", "hvitkål", "kvitkål", "rødkål", "savoykål", "spisskål", "hodekål"] },
      { id: "blomkal", navn: "Blomkål", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "middels", synonymer: ["blomkål"] },
      { id: "brokkoli", navn: "Brokkoli", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "middels", synonymer: ["brokkoli", "broccoli"] },
      { id: "rosenkal", navn: "Rosenkål", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "stor", synonymer: ["rosenkål"] },
      { id: "gronnkal", navn: "Grønnkål", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "middels", synonymer: ["grønnkål", "grønkål", "kale", "palmekål"] },
      { id: "kalrot", navn: "Kålrot", familie: "korsblomst", behov: "hoy", behovKilde: "hs", behovMerknad: "Agropub kaller kålrot lite næringskrevende.", plass: "middels", synonymer: ["kålrot", "kålrabi (vestlandsk)", "kålrabi", "swede"] },
      { id: "knutekal", navn: "Knutekål", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "liten", synonymer: ["knutekål", "kålrabi"] },
      { id: "kinakal", navn: "Kinakål og pak choi", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "middels", synonymer: ["kinakål", "pak choi", "pak-choi", "bok choy"] },
      { id: "nepe", navn: "Nepe", familie: "korsblomst", behov: "hoy", behovKilde: "hs", plass: "liten", synonymer: ["nepe", "neper", "mainepe"] },
      { id: "reddik", navn: "Reddik", familie: "korsblomst", behov: "lav", behovKilde: "antatt", plass: "liten", synonymer: ["reddik", "reddiker", "radiser"] },
      { id: "ruccola", navn: "Ruccola", familie: "korsblomst", behov: "lav", behovKilde: "antatt", plass: "liten", synonymer: ["ruccola", "rucola", "rukola", "sennepskål"] },
      // Løkvekster
      { id: "kepalok", navn: "Kepaløk", familie: "lok", behov: "lav", behovKilde: "hs", plass: "liten", synonymer: ["løk", "kepaløk", "gul løk", "rødløk", "matløk", "stikkløk", "setteløk"] },
      { id: "sjalottlok", navn: "Sjalottløk", familie: "lok", behov: "lav", behovKilde: "hs", plass: "liten", synonymer: ["sjalottløk", "sjalott"] },
      { id: "hvitlok", navn: "Hvitløk", familie: "lok", behov: "lav", behovKilde: "antatt", plass: "liten", synonymer: ["hvitløk", "kvitlauk"] },
      { id: "purre", navn: "Purre", familie: "lok", behov: "hoy", behovKilde: "hs", plass: "middels", synonymer: ["purre", "purreløk"] },
      { id: "varlok", navn: "Vårløk", familie: "lok", behov: "lav", behovKilde: "antatt", plass: "liten", synonymer: ["vårløk", "salatløk", "pipeløk"] },
      // Skjermplanter
      { id: "gulrot", navn: "Gulrot", familie: "skjerm", behov: "lav", behovKilde: "hs", plass: "liten", synonymer: ["gulrot", "gulrøtter", "gulerot", "gulerøtter"] },
      { id: "pastinakk", navn: "Pastinakk", familie: "skjerm", behov: "lav", behovKilde: "hs", plass: "middels", synonymer: ["pastinakk"] },
      { id: "persille", navn: "Persille", familie: "skjerm", behov: "lav", behovKilde: "antatt", plass: "liten", synonymer: ["persille", "bladpersille", "rotpersille"] },
      { id: "selleri", navn: "Selleri", familie: "skjerm", behov: "hoy", behovKilde: "hs", plass: "middels", synonymer: ["selleri", "knollselleri", "stangselleri", "bladselleri"] },
      { id: "dill", navn: "Dill og koriander", familie: "skjerm", behov: "lav", behovKilde: "antatt", plass: "liten", synonymer: ["dill", "koriander", "fennikel"] },
      // Amarant
      { id: "rodbete", navn: "Rødbete", familie: "amarant", behov: "lav", behovKilde: "hs", behovMerknad: "Hageselskapets eget rødbeteoppslag og Agropub sier middels.", plass: "liten", synonymer: ["rødbete", "rødbeter", "beter", "gulbete"] },
      { id: "mangold", navn: "Mangold", familie: "amarant", behov: "lav", behovKilde: "hs", plass: "liten", synonymer: ["mangold", "bladbete"] },
      { id: "spinat", navn: "Spinat", familie: "amarant", behov: "lav", behovKilde: "hs", plass: "liten", synonymer: ["spinat", "babyspinat"] },
      // Kurvplanter
      { id: "salat", navn: "Salat", familie: "kurv", behov: "lav", behovKilde: "hs", behovMerknad: "Agropub kaller salat middels næringskrevende.", plass: "liten", synonymer: ["salat", "hjertesalat", "isbergsalat", "plukksalat", "romanosalat", "sikori", "endivie"] },
      { id: "jordskokk", navn: "Jordskokk", familie: "kurv", behov: "lav", behovKilde: "antatt", plass: "stor", flerarig: true, synonymer: ["jordskokk"] },
      // Søtvier
      { id: "potet", navn: "Potet", familie: "sotvier", behov: "middels", behovKilde: "hs", plass: "stor", synonymer: ["potet", "poteter", "potetes", "tidligpotet", "nypoteter", "jordeple"] },
      { id: "tomat", navn: "Tomat", familie: "sotvier", behov: "middels", behovKilde: "antatt", plass: "middels", synonymer: ["tomat", "tomater", "cherrytomat", "busktomat"] },
      { id: "paprika", navn: "Paprika og chili", familie: "sotvier", behov: "middels", behovKilde: "antatt", plass: "liten", synonymer: ["paprika", "chili", "chilli", "aubergine"] },
      // Gresskar
      { id: "squash", navn: "Squash", familie: "gresskar", behov: "middels", behovKilde: "hs", plass: "stor", synonymer: ["squash", "zucchini", "courgette"] },
      { id: "gresskar", navn: "Gresskar", familie: "gresskar", behov: "middels", behovKilde: "hs", plass: "stor", synonymer: ["gresskar", "butternut", "hokkaido"] },
      { id: "agurk", navn: "Agurk", familie: "gresskar", behov: "middels", behovKilde: "antatt", plass: "middels", synonymer: ["agurk", "agurker", "slangeagurk", "frilandsagurk", "sylteagurk"] },
      // Gras
      { id: "mais", navn: "Mais", familie: "gras", behov: "middels", behovKilde: "hs", plass: "stor", synonymer: ["mais", "sukkermais", "maiskolber"] },
      // Flerårige (står fast, ikke med i vekstskiftet)
      { id: "jordbaer", navn: "Jordbær", familie: "rose", behov: "middels", behovKilde: "antatt", plass: "middels", flerarig: true, synonymer: ["jordbær", "jordbærplanter"] },
      { id: "rabarbra", navn: "Rabarbra", familie: "slirekne", behov: "middels", behovKilde: "antatt", plass: "stor", flerarig: true, synonymer: ["rabarbra", "rabarbu"] },
      { id: "asparges", navn: "Asparges", familie: "asparges", behov: "middels", behovKilde: "antatt", plass: "middels", flerarig: true, synonymer: ["asparges"] },
      { id: "urter", navn: "Flerårige krydderurter", familie: "leppeblomst", behov: "lav", behovKilde: "antatt", plass: "liten", flerarig: true, synonymer: ["timian", "oregano", "mynte", "salvie", "sitronmelisse"] },
      { id: "gresslok", navn: "Gressløk", familie: "lok", behov: "lav", behovKilde: "antatt", plass: "liten", flerarig: true, synonymer: ["gressløk", "graslauk"] }
    ]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = KB;
  else root.VEKSTSKIFTE_KB = KB;
})(typeof window !== "undefined" ? window : globalThis);
