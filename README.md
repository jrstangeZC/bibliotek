# Bibliotek

Et utlånssystem for et lite bibliotek. Bygget med Next.js (App Router),
TypeScript og Tailwind. Grensesnittet er på norsk, koden på engelsk.

Dette er en demo: det finnes ingen database og ingen ekte innlogging.

## Kom i gang

```bash
npm install
npm run dev        # http://localhost:3000
npm run test       # Vitest — forretningsreglene
npm run reset-data # tilbake til utgangspunktet i data/seed.json
```

## Sider

| Adresse | Hva den gjør |
| --- | --- |
| `/` | Hele samlingen, med hvor mange eksemplarer som er ledige |
| `/boker/[id]` | Detaljer om én tittel, og knappen som låner eller reserverer den |
| `/sok` | Søk på tvers av bøker, personer, lån og reservasjoner. Hva du får treff i, avhenger av hvem du er (se [`docs/sok-spec.md`](docs/sok-spec.md)) |
| `/mine-laan` | Lånene og reservasjonene dine, med frister, status og gebyr — og forlengelse av lån |
| `/admin` | Alle aktive lån, med registrering av retur |
| `/admin/reservasjoner` | Køene, og eksemplarer på hentehylla som må flyttes |
| `/admin/utboks` | E-postene systemet har sendt (`/[id]` viser én) |
| `/admin/boker` | Katalogen — opprett, rediger og slett bøker (`/ny`, `/[id]`, `/[id]/slett`) |
| `/admin/brukere` | Brukerregisteret — alle lånere og bibliotekarer, med redigering (`/[id]`) |
| `/admin/innstillinger` | Innstillinger for demoen, og tilbakestilling av datagrunnlaget |
| `/profil` | Navnet, e-postadressen og e-postvarslene dine |
| `/logg-inn` | Velg hvem du vil bruke systemet som |
| `/stil` | Stilguiden — alle komponenter og tilstander på én side |

## API

```
GET  /api/books              GET  /api/books/[id]
GET  /api/loans/mine         POST /api/loans
POST /api/loans/[id]/return  POST /api/jobs/reservasjoner
```

`POST /api/jobs/reservasjoner` er for en daglig cron (se E-post under). Den krever
`Authorization: Bearer $CRON_SECRET`, og finnes ikke når `CRON_SECRET` mangler.

## E-post

Det finnes ingen e-posttjener. Når et reservert eksemplar holdes av for noen,
legges en e-post i `outbox` i datafila, og bibliotekaren kan lese den under
`/admin/utboks`. Hver bruker velger selv om hen vil ha slike e-poster (`/profil`),
og valget er på som standard.

[`lib/mail.ts`](lib/mail.ts) er det eneste stedet som avgjør hva som sendes. Hvert
hold får én e-post, og den sendes alltid sammen med en skriving, aldri ved
lesing. Et hold som går videre fordi det forrige gikk ut, lagres først ved neste
skriving. Derfor finnes jobbruten: kjør den daglig, så venter ikke e-posten på at
noen låner eller leverer noe. Banneret i appen fungerer uansett med en gang.

For å sende ekte e-post: behold `queueHoldNotices` som den er, og la et
leveringssteg lese nye meldinger fra utboksen og gi dem til en leverandør.

## Datalaget

Ingen database. [`lib/db.ts`](lib/db.ts) er den eneste modulen som rører disk:

- `data/seed.json` er sjekket inn og skrives aldri til
- `data/db.json` er arbeidskopien, lages fra seed ved første lesing, og er
  ignorert av git

Alle operasjoner går gjennom én kø, slik at ingen leser en halvskrevet fil og to
samtidige utlån ikke kan ta samme siste eksemplar.

**Å lese skriver aldri.** Et hold som går ut, skal gå videre til neste i køen
uten at noen trykker på noe. Det skjer ved at reservasjonene gjøres opp
(`settleReservations` i [`lib/reservations.ts`](lib/reservations.ts)) hver gang
noe leses eller skrives. Oppgjøret gir samme svar uansett når det kjøres — neste
persons hold regnes fra det øyeblikket det forrige gikk ut, ikke fra «nå» — så
sidene kan regne det ut i minnet, og den neste skrivingen lagrer nøyaktig det
de viste. Ser du i `data/db.json` og finner et hold som skulle vært utløpt, er
det derfor ingen feil: det står der til neste skriving.

## Roller og innlogging

Det finnes ingen passord. [`lib/auth.ts`](lib/auth.ts) er den ene skjøten hele
appen leser brukeren gjennom — å bytte til ekte autentisering betyr å skrive om
den filen og ingen andre.

En person er enten `borrower` eller `librarian`. Bibliotekarer ser
administrasjonen; alle andre får en forklaring og veien videre i stedet.

En bruker kan endre navn, e-post og varsler for seg selv under `/profil`.
Bibliotekaren kan endre alt for alle, også rollen, men den siste bibliotekaren
kan ikke miste rollen — da ville ingen kommet inn i administrasjonen igjen.

Cookien `borrowerId` avgjør hvem du er:

| Cookie | Hvem du er |
| --- | --- |
| mangler | første låner i seed — så demoen alltid åpner på noe som virker |
| en id | den personen |
| `none` | ingen, satt av en bevisst utlogging |

## Forretningsregler

- Et lån løper i **28 dager** fra utlånsdagen
- En bok kan lånes så lenge det er eksemplarer igjen; aktive lån telles mot
  `Book.copies`
- Gebyret er **10 kr per dag** etter forfall, med tak på **200 kr**. Et innlevert
  lån beholder gebyret det hadde den dagen boken kom tilbake
- En låner kan forlenge sitt eget lån med **28 dager**, **én gang per lån**.
  Fristen flyttes (`dueAt`), og `renewedAt` sier når det skjedde. Et forfalt
  eller innlevert lån kan ikke forlenges — gebyret regnes ut fra fristen, så en
  forlengelse av et forfalt lån ville slettet gebyret det hadde løpt opp

- Er alle eksemplarene ute, kan en låner **reservere** tittelen. Køen er
  først-til-mølla. En låner kan ha **3 åpne reservasjoner** om gangen, og kan
  ikke reservere en bok som står ledig eller som hen allerede har lånt
- Når et eksemplar kommer inn, **holdes det av** for den første i køen i
  **7 dager**, til og med fristdagen. Ingen andre kan låne det. Hentes det
  ikke, går det videre til neste i køen, eller tilbake i hyllen om køen er tom.
  Skranken får beskjed under `/admin/reservasjoner` om eksemplarer som må
  flyttes
- Et lån **kan ikke forlenges** mens noen venter i kø for tittelen

Reglene ligger i [`lib/fees.ts`](lib/fees.ts),
[`lib/availability.ts`](lib/availability.ts),
[`lib/renewals.ts`](lib/renewals.ts) og
[`lib/reservations.ts`](lib/reservations.ts), og er dekket av tester. Dager
telles i hele UTC-døgn, så klokkeslettet aldri gjør en innlevering forsinket.

## Design

Se [`docs/design/README.md`](docs/design/README.md) før du endrer noe visuelt.
[`/stil`](app/stil/page.tsx) er den levende referansen og holdes i takt med
språket.
