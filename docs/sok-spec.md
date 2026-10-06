# Globalt søk – spesifikasjon

Ett søkefelt i headeren og en søkeside, `/sok?q=…`, med treff på tvers av bøker,
personer, lån og reservasjoner. Hva du får treff i, avhenger av hvem du er.

Status: bygget 6. oktober 2026. Koden ligger i `lib/search.ts`,
`searchLibrary` i `lib/loans.ts`, `components/site-search.tsx` og
`app/(app)/sok/page.tsx`. Avsnittet «Utgangspunktet i dag» beskriver
tilstanden før søket ble bygget. Les `README.md` (forretningsreglene) og
`docs/design/README.md` (designspråket) før du endrer søket, som `CLAUDE.md`
sier.

## Utgangspunktet i dag

Appen har et **katalogsøk**, men ingenting som søker på tvers:

- `CatalogueSearch` og `NoCatalogueMatches` i `components/catalogue-search.tsx`,
  brukt på `/` og `/admin/boker`. Det er et GET-skjema med `q` i URL-en.
- `matchesBookQuery` og `searchBooks` i `lib/books.ts` filtrerer på tittel,
  forfatter, år og ISBN.

Matcheren har fire svakheter. Alle er kontrollert mot seed-dataene:

| Søk | Burde finne | Dagens resultat |
| --- | --- | --- |
| `saether` | Ingrid Sæther | Ingenting. NFD gjør å til a, men ikke æ og ø, så de tre bokstavene behandles ulikt |
| `978 0 618 64015 7` | «The Lord of the Rings» | Ingenting. Mellomrom deler ISBN-en i ord, og `0` og `7` er for korte til å treffe ISBN-en |
| `jk rowling` | «Harry Potter …» | Ingenting. `J.K.` blir ikke til `jk` |
| `0-618-64015-0` (ISBN-10) | Samme bok, lagret som ISBN-13 | Ingenting |

Det globale søket og katalogsøket skal bruke **samme matcher**, så alle fire
rettes for begge. To søkefelt som er uenige om samme bok, er verre enn ett som
tar feil.

## Hva som er søkbart

| Gruppe | Hva som er med | Feltene søket leser | Hvem som får treff her |
| --- | --- | --- | --- |
| Bøker | Alle titler i katalogen | Tittel, forfatter, år, ISBN | Alle, også uten innlogging |
| Brukere | Alle i registeret, begge roller | Navn, e-post | Bare bibliotekarer |
| Lån | Aktive lån: ute nå, forfalte medregnet | Bokens felter, og for bibliotekaren lånerens navn og e-post | Bibliotekaren ser alle. En låner ser bare sine egne |
| Reservasjoner | Åpne reservasjoner: i kø eller klar til henting | Som for lån | Som for lån |

Et lån eller en reservasjon har ingen tekst av sitt eget. Posten passer når
boken passer, eller, for bibliotekaren, når personen passer. Alle ordene i et
søk må passe på **samme post** (se «Flere ord»). Derfor finner `marit tolkien`
Marits lån av «The Lord of the Rings» og ingenting annet.

Dette er ikke søkbart:

- **Leverte lån.** Søket svarer på «hvor er den nå?». Historikken står på
  personsiden (`/admin/brukere/[id]`) og under `/mine-laan`, ett klikk unna.
- **Lukkede reservasjoner**, også hold som er utløpt og venter på at noen
  flytter eksemplaret. Skranken har dem under `/admin/reservasjoner`.
- **Utboksen.** Hver melding gjelder en reservasjon og en person som søket
  allerede finner.
- **Id-er og rolle.** Ingen skriver `book-5` eller «bibliotekar» i et søkefelt.

## Hvem som får se hva

Hvem du er, bestemmer **omfanget** av søket:

| Omfang | Hvem | Grupper |
| --- | --- | --- |
| `public` | Ikke innlogget (cookien er `none`) | Bøker |
| `own` | Låner | Bøker, dine lån, dine reservasjoner |
| `desk` | Bibliotekar | Bøker, brukere, alle lån, alle reservasjoner |

Reglene:

- **Omfanget avgjøres i `lib/`, ikke i siden.** `searchLibrary` (se
  Arkitektur) tar imot den innloggede personen, eller `null`, og avgjør
  omfanget selv. Siden får aldri data den ikke skal vise, så den kan heller
  ikke vise dem ved en feil. Det følger samme regel som serverhandlingene, som
  sjekker hvem som handler hver gang.
- **En låner kan ikke søke opp andre.** Med omfanget `own` søkes det ikke i
  brukerregisteret, og andres lån og reservasjoner er filtrert bort før
  matchingen. Null treff skal se likt ut enten personen finnes eller ikke:
  `marit` gir nøyaktig samme side som `xyz`. Sidetekstene nevner aldri
  personer for noen andre enn bibliotekaren.
- **Dine egne poster matcher bare på bokens felter**, ikke på ditt eget navn
  eller din egen e-post. Ellers ville et søk på eget navn gitt alle dine lån.
- **En bibliotekar er også låner.** Med `desk` er bibliotekarens egne lån med
  på lik linje med alle andres, og det finnes ingen egen «Dine lån»-gruppe.
- **Uten innlogging fungerer siden.** Den viser bare bøker og sender ingen
  videre til `/logg-inn`. Katalogen er allerede åpen på `/`. Merk at en
  manglende cookie betyr den første låneren i seed (`lib/auth.ts`), så
  «ikke innlogget» betyr cookien `none`.
- **Fanetittelen er fast**: «Søk – Bibliotek». Den viser ikke søket.
- **Lenker**: en bok går til `/boker/[id]`, slik `BookRecordCell` gjør. En
  person går til `borrowerEditHref(id)`, slik alle navn på bibliotekarens
  skjermer gjør, og vises bare med `desk`.

## Hvor smart søket er

### Normalisering

`fold()` kjøres på både søket og teksten som søkes i, i denne rekkefølgen:

1. NFD, og diakritiske tegn fjernes: é → e, ö → o, å → a. Slik gjør koden det i dag.
2. Små bokstaver med `toLocaleLowerCase("nb")`.
3. **æ → ae, ø → o, aa → a.** NFD lar æ og ø stå urørt, og det er dagens feil.
   Med `aa → a` finner `Haakon` også «Håkon», og `Aasen` finner «Åsen».
4. Alt som ikke er bokstav, siffer eller mellomrom, fjernes:
   `J.K.` → `jk`, `Philosopher's` → `philosophers`,
   `marit.hoel@example.no` → `marithoelexampleno`.

Søket skal heller gi treff for mye enn for lite. I et lite bibliotek koster
noen ekstra treff mindre enn et søk som bommer, og tastaturet er ikke alltid
norsk. Prisen er at `har` også finner «hår». Det godtar vi. Sorteringen
påvirkes ikke: `byTitle` sorterer fortsatt æ, ø og å etter z. `fold` brukes
bare til å finne treff.

### Delord

Et ord treffer hvor som helst i et felt, også midt i et ord: `ling` finner
«Rowling». Det er slik katalogsøket virker i dag, og med en samling på denne
størrelsen hjelper det mer enn det støyer.

### Flere ord

Søket deles på mellomrom. **Alle ordene må passe på samme post**, i hvilket som
helst av postens felter og i hvilken som helst rekkefølge. Et nytt ord snevrer
inn søket i stedet for å utvide det: `tolkien 1954`, `marit tolkien`.

### ISBN

- **Søk som bare består av sifre, mellomrom og bindestreker**, eventuelt med X
  til slutt, og som har minst tre sifre, prøves i tillegg som ett ISBN-fragment
  uten skilletegn. Det treffer når bokens ISBN, normalisert med
  `normalizeIsbn`, inneholder fragmentet. Da finner `978 0 618 64015 7` boken.
- **Et komplett ISBN** (10 eller 13 tegn etter normalisering, samme mønster som
  `ISBN_PATTERN` i `lib/books.ts`) sammenligner i tillegg ISBN-10 og 978-ISBN-13
  på de ni kjernesifrene. For ISBN-10 er det sifrene 1–9, for ISBN-13 sifrene
  4–12. Kontrollsifferet sammenlignes ikke. `0-618-64015-0` finner da boken som
  er lagret som `978-0-618-64015-7`. Eldre bøker har ISBN-10 på baksiden, og
  katalogen lagrer det som ble skrevet inn. Kontrollsifferet kan vi ikke stole
  på, fordi `validateBook` ikke sjekker det.
- **Et ord inne i et søk med flere ord** fungerer som i dag: minst tre sifre
  treffer en del av ISBN-en. Grensen på tre sifre hindrer at `9` treffer alle
  ISBN-er i katalogen.

### Rekkefølge og antall

Søket har ingen relevansrangering. Hver gruppe har samme rekkefølge som
registeret den kommer fra:

- **Bøker**: `byTitle`.
- **Brukere**: navn, med `localeCompare(…, "nb")`.
- **Lån**: `dueAt` stigende, så de forfalte kommer øverst.
- **Reservasjoner**: som i `listOpenReservations`.

Gruppene er korte, og en kjent rekkefølge er lettere å lese enn en poengsum
ingen ser.

Alle treff vises. Søket har ingen grense og ingen sider: hele datagrunnlaget
ligger uansett i minnet, og en grense ville trengt et sted å vise resten. Det
stedet finnes ikke. Vurder det på nytt hvis en gruppe ofte passerer 50 rader.

### Dette er ikke med

- Toleranse for skrivefeil. Et kortere ord treffer, og null treff-teksten sier
  det.
- Utheving av treffet. `fold` endrer lengden på teksten, så posisjonene stemmer
  ikke med originalen.
- Forslag mens du skriver. Søket er et GET-skjema med server-rendrede treff,
  slik katalogsøket er, og virker uten JavaScript.
- Hurtigtast og et JSON-API. Ingen trenger dem ennå.

## Tilstander

**Tomt søk.** Gjelder når `q` mangler, er blank, er en liste (`?q=a&q=b`,
som i `searchBooks`) eller bare består av tegnsetting (`---` blir ingenting
etter `fold`). Siden viser overskrift og søkefelt. Feltet får `autoFocus` og
beholder det som ble skrevet. Under feltet står en `Empty`:

- ikonet `Search01Icon`
- tittelen «Hva leter du etter?»
- en beskrivelse av hva søket ser i for dette omfanget (se Sidetekster), med
  et eksempel
- handlingen «Se hele samlingen» → `/`

Siden sender deg ikke videre og viser ikke «Ingen treff», for ingenting er
søkt. Headerfeltet kan sendes tomt. Det har ikke `required`, fordi nettleserens
egen boble er på nettleserens språk og uten design. Denne siden forklarer i
stedet.

**Null treff.** En `Empty` med:

- ikonet `Search01Icon`
- tittelen «Ingen treff på «q»»
- en beskrivelse av hva søket så i for omfanget, og et råd: «Prøv et kortere
  ord, bare etternavnet eller sifrene i ISBN-en.» Har søket flere ord, kommer
  i tillegg: «Alle ordene må passe på samme treff, så prøv med færre.»
- handlingen «Se hele samlingen» → `/`

Ingen gruppekort vises.

**Ett treff.** Siden vises som vanlig, med én rad. **Unntak**: når søket er et
komplett ISBN og hele resultatet er nøyaktig ett treff, nemlig boken, sender
siden deg rett til `/boker/[id]` med `redirect()`. I en side bruker
`redirect()` `replace`, så tilbakeknappen hopper over søket. Et helt ISBN er
en identifikator som er skannet eller limt inn, og hensikten er å åpne boken.
Et ord som tilfeldigvis gir ett treff, er fortsatt et søk, og et hopp videre
ville skjult hvor smalt søket var. For en bibliotekar gir et ISBN med aktive
lån flere treff. Da blir siden stående, og det er det skranken vil se: hvem
som har eksemplarene.

**Treff.** Under feltet står en linje med antallet, for eksempel «7 treff på
«tolkien»». Deretter kommer ett kort per gruppe med treff, i fast rekkefølge:
Bøker, Brukere, Lån, Reservasjoner. Grupper uten treff vises ikke. Fire tomme
kort ville gjemt det ene som har noe i seg.

**Feil.** Søket har ingen feil av sine egne, for det filtrerer i minnet. En
lesefeil i datalaget oppfører seg som på alle andre sider. Siden bruker ikke
`?feil=`.

## Grensesnitt

### Søkefeltet i headeren

I `components/site-header.tsx`:

- **Plassering**: det første elementet i gruppen til høyre, foran menyen. Fra
  `sm` og opp har feltet fast bredde (`w-56`). Under `sm` ligger det på en egen
  rad i full bredde. Headeren har allerede `flex-wrap`.
- **Skjema**: `next/form` `<Form action="/sok" role="search">`. Feltet har
  `name="q"`, `type="search"`, `enterKeyHint="search"`, `autoComplete="off"`,
  plassholderen «Søk …» og en `sr-only`-etikett, «Søk i biblioteket». Feltet er
  tomt på alle sider og husker ikke forrige søk.
- **Utseende**: `InputGroup` med `Search01Icon` foran. **Det har ingen knapp.**
  Det er et bevisst unntak fra regelen om søkefelt i `docs/design/README.md`
  (Controls → Search). Headerfeltet starter bare et søk, Enter sender det, og
  hele oppskriften med knapp står på `/sok`. Skriv unntaket inn i
  designdokumentet.
- **Det vises ikke på `/sok`.** `usePathname` finnes allerede i komponenten. To
  felt med samme søk på samme skjerm er ett for mye, og det er feltet på siden
  som brukes til å justere søket. Dermed trenger ikke layouten
  `useSearchParams`.
- Feltet vises for alle: uten innlogging, for lånere og bibliotekarer, og på
  `/logg-inn`. Ingen menypunkter markeres som aktive på `/sok`.

### Søkesiden, `app/(app)/sok/page.tsx`

En serverside med `force-dynamic` og `PageProps<"/sok">`. Den leser
`getCurrentBorrower()`, ikke `requireBorrower()`, fordi den også skal virke uten
innlogging. Deretter kaller den `searchLibrary`.

Rekkefølgen på siden:

1. `PageHeading` med tittelen «Søk» og én setning som avhenger av omfanget.
2. **Søkefeltet**: samme oppskrift som `CatalogueSearch`, med `Search01Icon`
   foran og en `InputGroupButton` «Søk» bak. Det står rett under overskriften,
   ikke i et kort, fordi et kort ville trengt en tittel som gjentar h1-en.
   `defaultValue` er søket. Gi skjemaet `key={query}`, ellers viser feltet feil
   tekst når tilbake- eller fremknappen bytter søk. `autoFocus` brukes bare når
   søket er tomt. Plassholderen er «Tittel, forfatter, år eller ISBN» for
   `public` og `own`, og «Tittel, person, e-post eller ISBN» for `desk`.
3. Antallslinjen (`text-sm text-muted-foreground`), eller tom- eller null
   treff-tilstanden.
4. Gruppekortene, med `flex flex-col gap-8` mellom dem.

**Gruppekortene** følger tabellmønsteret i designdokumentet:

- `CardHeader` med `CardTitle`, `CardDescription` og en `CardAction` med
  `Badge variant="secondary"`, for eksempel «3 treff».
- `CardContent className="px-0"` med en `Table`.
- `IDENTITY_CELL` på identitetscellen og `SECONDARY_CELL` på lånercellen.
  Kolonneoverskriftene er `ColumnHead`.

| Gruppe | Kolonner | Merknad |
| --- | --- | --- |
| Bøker | Tittel · Eksemplarer · Status | Som raden på `/`, uten Handling: `RecordCell` med `Book02Icon`/`BookOpen01Icon`, linje 2 er «forfatter · år». «x av y» står høyrejustert, og status er `BookStatusBadge` |
| Brukere (`desk`) | Navn · Rolle · Ute nå | `RecordCell` med `UserIcon`, `href={borrowerEditHref(id)}` og e-posten på linje 2. `RoleBadge`. «Ute nå» er høyrejustert med `tabular-nums` |
| Lån (`desk`) | Tittel · Låner · Frist · Status | Som `/admin`: `BookRecordCell`, låneren som `RecordCell` uten ikon (navn → `borrowerEditHref`, e-post under), `LoanDueCell`, `LoanStatusCell` |
| Dine lån (`own`) | Tittel · Frist · Status | Som `/mine-laan`, uten Handling |
| Reservasjoner (`desk`) | Tittel · Låner · Reservert · Status | `BookRecordCell` med `Bookmark01Icon`, låneren som over, `formatDate(reservedAt)`, `ReservationStatusCell` |
| Dine reservasjoner (`own`) | Tittel · Status | Som `/mine-laan`, uten Handling |

En slettet bok eller låner vises som «Ukjent tittel» eller «Ukjent låner».
Posten kan da bare treffe via den siden som fortsatt finnes.

**Radene har ingen handlingsmenyer.** Hver handling sender deg tilbake til sin
egen side med `?feil=` eller `?lagret=`. Skulle handlingene fungere fra
søkesiden, måtte hver av dem lære en ny returvei. Boksiden og personsiden er ett
klikk unna og har handlingene.

### Sidetekster

Teksten under overskriften (`PageHeading`):

- `public`: «Søk i hele samlingen etter tittel, forfatter, år eller ISBN. Logg
  inn for å søke i dine egne lån også.»
- `own`: «Søk i samlingen og i dine egne lån og reservasjoner, etter tittel,
  forfatter, år eller ISBN.»
- `desk`: «Søk i samlingen, brukerregisteret, aktive lån og åpne
  reservasjoner. Et lån eller en reservasjon passer når boken eller personen
  gjør det.»

Hva søket så i, brukt i tom- og null treff-tilstanden:

- `public`: «Søket ser i titler, forfattere, år og ISBN.»
- `own`: «Søket ser i titler, forfattere, år og ISBN, og i lånene og
  reservasjonene dine.»
- `desk`: «Søket ser i bøker, i navn og e-post i brukerregisteret, og i aktive
  lån og åpne reservasjoner.»

Kortbeskrivelsene:

| Kort | `CardDescription` |
| --- | --- |
| Bøker | Åpne en tittel for å låne den, eller reserver den hvis alle eksemplarene er ute. |
| Brukere | Åpne en person for å se lånene og endre opplysningene. |
| Lån | Bøker som er ute nå. Returen registreres under Administrasjon. |
| Dine lån | Bøker du har ute nå. Du forlenger dem under Mine lån. |
| Reservasjoner | Åpne reservasjoner, i kø eller klare til henting. |
| Dine reservasjoner | Titler du står i kø for, eller som er holdt av til deg. |

Metadata: tittelen er «Søk – Bibliotek», og beskrivelsen er «Søk på tvers av
samlingen og lånene dine».

## Arkitektur

### `lib/search.ts` (ny og ren, uten I/O)

All matching samles her:

- `fold(text)` flyttes fra `lib/books.ts` og får reglene fra Normalisering.
- `parseQuery(q: string | string[] | undefined): ParsedQuery | null`. Den gir
  ord, ISBN-fragment og komplett ISBN, eller `null` for et tomt søk.
- `matchesQuery(query: ParsedQuery, haystack: { text: string[]; isbn?: string }): boolean`.
- `matchesBookQuery` og `searchBooks` flyttes hit fra `lib/books.ts` med samme
  signatur. Importene på `/` og `/admin/boker` oppdateres.

`lib/search.ts` importerer `normalizeIsbn` og `ISBN_PATTERN` fra
`lib/books.ts`. `ISBN_PATTERN` må eksporteres derfra i stedet for å kopieres.
Når `matchesBookQuery` flyttes ut, unngår vi en sirkulær import mellom de to
modulene.

### `searchLibrary` i `lib/loans.ts`

```ts
export type SearchScope = "public" | "own" | "desk";

export type BorrowerHit = Borrower & { onLoan: number };

export type SearchResults = {
  /** Søket slik det ble skrevet, trimmet. "" når det mangler. */
  query: string;
  scope: SearchScope;
  /** false for et tomt søk, også ett som bare var tegnsetting. */
  searched: boolean;
  books: BookView[];
  /** Alltid tom utenfor "desk". */
  borrowers: BorrowerHit[];
  /** Bare aktive lån, og bare personens egne utenfor "desk". */
  loans: LoanView[];
  /** Bare åpne reservasjoner, og bare personens egne utenfor "desk". */
  reservations: ReservationView[];
  total: number;
  /** Bokens id når søket er et komplett ISBN og boken er det eneste treffet. */
  isbnTarget: string | null;
};

export async function searchLibrary(
  q: string | string[] | undefined,
  viewer: Borrower | null,
  today: DateInput = new Date()
): Promise<SearchResults>;
```

Funksjonen hører hjemme i `lib/loans.ts`, fordi `toBookView`, `toLoanView` og
`toReservationView` er private der, og fordi alt som er avledet (status, gebyr,
plass i køen) skal ligge der. Den leser én gang med `db.getSettled(today)`,
som `findBorrowerOverview` gjør. `BookView` bygges med `viewerId` lik `null`,
fordi radene ikke har handlinger. Omfanget avgjøres av `viewer` og
`isLibrarian`.

Siden gjør dette:

```ts
const results = await searchLibrary(q, viewer);
if (results.isbnTarget) redirect(`/boker/${results.isbnTarget}`);
```

### Revalidering

Søkesiden viser katalog-, lån- og persondata. `revalidateLoanViews`,
`updateBorrowerAction` og `updateOwnProfileAction` dekker den allerede med
`revalidatePath("/", "layout")`. Legg `revalidatePath("/sok")` til i
`revalidateCatalogue` og i `registerBorrowerAction` i `lib/actions.ts`.

### Komponenter

Lag `components/site-search.tsx` med to eksporter:

- `HeaderSearch`: det kompakte feltet uten knapp.
- `SearchField`: feltet på siden, med knapp, og med `query`, `placeholder` og
  `autoFocus` som props.

Begge bruker `next/form` og har `action="/sok"`. `CatalogueSearch` blir
stående som den er.

## Dokumentasjon som skal oppdateres

- `README.md`: en rad for `/sok` i sidetabellen.
- `docs/design/README.md`: under Layout skal header-punktet nevne søkefeltet,
  og under Controls → Search skal unntaket for headerfeltet stå.
- `app/stil/page.tsx`: header-eksempelet skal ha søkefeltet.
- `app/(app)/admin/CLAUDE.md`: raden «Searching titles» skal vise til
  `lib/search.ts`.
- `CLAUDE.md`: legg `search` til i listen over rene regelmoduler.

## Tester

**`lib/search.test.ts`** (ren). Flytt testene for `matchesBookQuery` hit fra
`lib/books.test.ts`, og legg til:

- `fold`: `Sæther` → `saether`, `Bjørnson` → `bjornson`, `Haakon` og `Håkon` →
  `hakon`, `J.K.` → `jk`
- `parseQuery`: `"   "`, `"---"` og `["a", "b"]` gir `null`
- flere ord: alle må passe, i vilkårlig rekkefølge
- ISBN: `978 0 618 64015 7` og `0-618-64015-0` treffer `978-0-618-64015-7`.
  `1984` treffer tittelen «1984», og gir ikke `isbnTarget`

**`lib/db.search.test.ts`** bruker samme oppsett som `lib/db.reservations.test.ts`:
en kopi av seed i en midlertidig mappe, `chdir`, `vi.resetModules()` og deretter
import. Seed har ingen reservasjoner, så testen lager én: `borrower-2`
reserverer `book-5`. Radene uten reservasjon er kontrollert mot en prototype av
reglene på seed-dataene.

| Hvem | Søk | Forventet |
| --- | --- | --- |
| `borrower-4` (bibliotekar) | `marit` | Brukere: `borrower-1`. Lån: `loan-1`, `loan-2` (`loan-3` er levert). Bøker: ingen |
| `borrower-4` | `marit tolkien` | Bare `loan-2` |
| `borrower-4` | `saether`, `Sæther`, `sather` | `borrower-4`. Den siste treffer via e-posten `ingrid.sather@…` |
| `borrower-4` | `0-618-64015-0` | `book-2` og `loan-2`. `isbnTarget` er `null` |
| `borrower-4` | `jonas prince` | Reservasjonen til `borrower-2` |
| `borrower-2` (låner) | `marit` | Ingenting, omfanget er `own` |
| `borrower-2` | `prince` | `book-5` og egen reservasjon. Ikke `loan-1`, som er Marits |
| `borrower-1` | `prince` | `book-5` og `loan-1`. Ikke reservasjonen til `borrower-2` |
| `borrower-1` | `harry` | `book-1`. Ingen lån, fordi `loan-3` er levert |
| `null` | `marit` | Ingenting, omfanget er `public` |
| `null` | `978 0 618 64015 7` | `book-2`. `isbnTarget` er `book-2` |
| `null` | `---` | `searched` er `false` |

## Ferdig når

- `npm test`, `npx tsc --noEmit` og `npm run lint` går gjennom.
- `/sok` er prøvd i nettleseren som utlogget, som låner (`borrower-1`) og som
  bibliotekar (`borrower-4`). Sjekk tomt søk, null treff, ett treff, ISBN som
  sender deg videre, og visningen på mobilbredde. Ingen tabell skal rulle
  sideveis på desktop.
- Katalogsøket på `/` og `/admin/boker` finner `jk rowling` og
  `978 0 618 64015 7`.
- Dokumentasjonen i listen over er oppdatert.
