---
name: commit
description: Committer endringene i arbeidskopien. Leser diffen, foreslår en commit-melding og venter på OK før noe committes. Brukes når brukeren vil committe, lagre endringene i git, eller skriver «commit», «committ» eller «commit endringene».
argument-hint: <valgfri hint om hva endringene handler om>
---

# Commit

Hint fra brukeren (kan være tom): $ARGUMENTS

Du foreslår en commit-melding og venter på OK. Du committer aldri før brukeren
har sagt ja til meldingen og filene.

## Slik skriver du meldingen

- **Engelsk**, selv om brukeren snakker norsk med deg.
- **Emnelinje:** én kort setning i imperativ («Add reservations desk view»,
  «Cap late fee at book price»). Stor forbokstav, ingen punktum på slutten, helst
  under 50 tegn og aldri over 72. Ingen prefiks som `feat:` eller `fix:`.
- **Kropp bare når det trengs.** Små, selvforklarende endringer får bare
  emnelinjen. Er endringen større, eller er det ikke åpenbart *hvorfor*, legger
  du til en blank linje og en kort forklaring av hvorfor (ikke en gjentakelse av
  diffen). Bryt linjene ved 72 tegn. Flere atskilte poeng kan bli en punktliste.
- Beskriv hva endringen gjør i koden, ikke prosessen («Add search to header»,
  ikke «Worked on search»).
- Hvis sesjonen har egne regler for tillegg i commit-meldinger (for eksempel en
  `Co-Authored-By`-linje), legger du dem sist i kroppen, etter en blank linje.

## Arbeidsgang

1. **Les tilstanden.** Kjør `git status`, `git diff` og `git diff --staged`, og
   `git log -5 --format=%s` for å se tonen i de siste commitene. Er det ingenting
   å committe, si fra og stopp.
2. **Velg filene.** Ta med alt som hører til samme endring. Ta aldri med filer
   som ser ut som hemmeligheter (`.env`, nøkler, tokens) eller genererte filer
   som ikke er sporet med vilje. Si fra hvis du utelater noe. Handler endringene
   tydelig om flere ulike ting, sier du det og spør om brukeren vil dele dem opp.
   Ikke del opp på egen hånd.
3. **Foreslå.** Vis brukeren hvilken gren du står på, hvilke filer som tas med, og
   meldingen i en kodeblokk. Be om OK.
4. **Vent.** Ber brukeren om endringer i meldingen eller filene, justerer du og
   viser forslaget på nytt.
5. **Committ.** Etter OK: legg til filene ved navn (aldri `git add -A` eller
   `git add .`) og committ med meldingen. Bruk en heredoc slik at linjeskift
   og anførselstegn går riktig. Kjør `git status` etterpå for å bekrefte at
   det gikk.
6. **Rapporter.** Si kort hvilken commit som ble laget (hash og emnelinje) og om
   noe ligger igjen urørt.

## Grenser

- Ikke push, ikke amend og ikke bruk `--no-verify`. Gjør brukeren noe av dette
  selv, er det deres valg.
- Feiler en hook, rett opp det den klager på, legg til filene på nytt og lag en
  ny commit. Hvis du ikke kan rette det selv, vis feilen til brukeren.
- Ikke endre filer for å få committen til å gå gjennom, bortsett fra det en
  hook ber om.
