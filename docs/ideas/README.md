# Idébank

Her samler vi ideer til appen som ennå ikke er besluttet. En idé som blir valgt,
får en spec og en plan i `docs/` (se `docs/CLAUDE.md`). Idéfilen blir liggende
med status `valgt` og en lenke til specen.

## Filer

- Én idé per fil, med et kort, beskrivende norsk navn i kebab-case, for eksempel
  `venteliste-varsel.md`.
- Hvis en eksisterende idé dekker det samme, utvider du den i stedet for å lage
  en ny fil.

## Mal

```markdown
# <Tittel i norsk setningsform>

- **Status:** ny
- **Dato:** <ÅÅÅÅ-MM-DD>

## Problem

<Hvem har problemet, og hva er vanskelig i dag? To til fire setninger.>

## Forslag

<Hva ideen går ut på, kort og konkret.>

## Åpne spørsmål

- <Det som må avklares før ideen kan bli en spec. Skriv «Ingen ennå» hvis listen er tom.>
```

Status er én av `ny`, `vurderes`, `valgt` eller `forkastet`. Skriv bare det som
faktisk er sagt om ideen. Det som er uavklart, hører hjemme under «Åpne
spørsmål».

## Oversikt

Legg til en rad for hver ny idé, med den nyeste øverst. Oppdater statusen her
når den endres i filen.

| Idé | Status | Dato |
| --- | --- | --- |
| [Bekreftelse med leveringsfrist ved utlån](leveringsfrist-ved-utlaan.md) | ny | 2026-10-07 |
