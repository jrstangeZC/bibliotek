---
name: check-interface
description: Kontrollerer teksten i endrede TSX-filer under app/ og components/. Sjekker at alt brukeren ser er på norsk, tydelig formulert og uten placeholder- eller testtekst. Rapporterer bare, endrer ingenting. Brukes etter endringer i grensesnittet, eller når brukeren skriver «check-interface», «sjekk grensesnittet» eller «kontroller teksten».
argument-hint: <valgfrie filer eller mapper, ellers sjekkes endringene>
---

# Kontroller grensesnittet

Valgfrie filer eller mapper fra brukeren: $ARGUMENTS

Du kontrollerer og rapporterer. Du endrer ingen filer, heller ikke for å rette
det du finner. Det gjør du først hvis brukeren ber om det etterpå.

## Arbeidsgang

1. **Finn filene.** Er det oppgitt filer eller mapper, sjekker du dem. Ellers
   kjører du `git status --short -- app components` og beholder `.tsx`-filene.
   Bruk `git diff HEAD -- <filer>` for å se hva som er endret, og les nye filer
   i sin helhet. Er det ingen endrede TSX-filer, si det og stopp.
2. **Les teksten brukeren ser.** Det er innhold i JSX og strengene som havner i
   grensesnittet: overskrifter, brødtekst, knapper og lenker, skjemaetiketter,
   `placeholder`, beskrivelser, feil- og tomtilstander, merker (badges),
   `aria-label`, `title`, `alt` og sidemetadata. Hopp over klassenavn,
   identifikatorer, kommentarer, ruter og importer. Fokuser på det som er
   endret, men les nok rundt til å vurdere teksten i sammenheng.
3. **Kontroller tre ting:**
   - **Norsk.** All synlig tekst er bokmål, med norsk setningsstruktur
     («Lån ut», ikke «Lån Ut»), « » som anførselstegn og mellomrom som
     tusenskille (`1 248`). Engelsk i synlig tekst er en feil, også i
     `aria-label` og `alt`.
   - **Tydelig og naturlig.** Teksten leses som noe en norsk bruker ville ha
     skrevet. Se etter ordrett oversatt engelsk, uklare knapper («OK», «Klikk
     her»), feilmeldinger som ikke sier hva brukeren kan gjøre, og tydelige
     skrivefeil.
   - **Ferdig.** Ingen `Lorem ipsum`, `TODO`, `FIXME`, `TBD`, `test`, `asdf`,
     `foo`, «Tittel her», «Skriv inn tekst» eller lignende rester, og ingen
     tomme eller halvferdige strenger.
4. **Rapporter.**
   - Er alt i orden, skriv tydelig **«Kontroll godkjent»** og nevn kort hvilke
     filer som ble sjekket.
   - Ellers skriv **«Kontroll ikke godkjent»** og list hvert funn som
     `fil:linje`, teksten det gjelder, hva som er galt og et kort forslag til
     bedre formulering. Samle funnene per fil.
