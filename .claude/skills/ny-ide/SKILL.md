---
name: ny-ide
description: Legger en ny idé inn i idébanken under docs/ideas/, i samme format som de eksisterende ideene. Brukes når brukeren vil notere, lagre eller foreslå en idé, eller skriver «ny idé» eller «legg til i idébanken».
argument-hint: <kort beskrivelse av ideen>
---

# Ny idé i idébanken

Ideen fra brukeren: $ARGUMENTS

Hvis ideen mangler eller er uklar, spør brukeren om den før du gjør noe annet.

**Alt i idébanken skrives på norsk**, også når brukeren skriver ideen på et
annet språk. Det gjelder hver idé, hver fil og oversikten: titler, overskrifter,
brødtekst, åpne spørsmål og filnavn. Filnavn er norske ord i kebab-case, med
`ae`, `oe` og `aa` i stedet for `æ`, `ø` og `å` (for eksempel
`leveringsfrist-ved-utlaan.md`). Kode, ruter og identifikatorer du viser til,
som `/boker/[id]`, står som de er.

1. **Les instruksjonene.** Les hele `docs/ideas/README.md`. Den bestemmer
   hvordan filene navngis, hvilken mal ideene følger og hvor oversikten ligger.
   Hvis filen mangler, stopper du og spør brukeren. Ikke finn på en struktur
   selv.
2. **Finn riktig sted.** Se gjennom de eksisterende ideene i `docs/ideas/`.
   Hvis en av dem allerede dekker det samme, utvider du den i stedet for å lage
   en dublett, og sier fra om det. Ellers lager du en ny fil. Hvis det ennå
   ikke finnes noen ideer, følger du malen i README-filen.
3. **Skriv ideen.** Bruk samme mal, overskrifter, felt og tone som de
   eksisterende ideene. Fyll bare inn det brukeren faktisk har
   sagt. Felt du ikke kan fylle, lar du stå åpne slik malen sier, eller du
   spør.
4. **Oppdater oversikten.** Hvis instruksjonene beskriver en oversikt eller et
   register, legger du inn den nye ideen der i samme format og rekkefølge.
5. **Rapporter.** Fortell kort hvilke filer du opprettet eller endret. Ikke
   endre noe utenfor `docs/ideas/`.
