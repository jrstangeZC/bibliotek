import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowDown01Icon,
  Book02Icon,
  BookOpen01Icon,
  Calendar03Icon,
  Clock01Icon,
  Delete02Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  Search01Icon,
  SearchRemoveIcon,
} from "@hugeicons/core-free-icons";

import { DetailRow } from "@/components/detail-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Logo, Wordmark } from "@/components/logo";
import { HeaderSearch } from "@/components/site-search";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Stilguide – Bibliotek",
  description: "Det visuelle språket i utlånssystemet",
};

/* -------------------------------------------------------------------------
   Sample data — hardcoded on purpose. This page has no data layer.
   ---------------------------------------------------------------------- */

const books: {
  title: string;
  author: string;
  year: number;
  available: number;
  total: number;
}[] = [
  {
    title: "Sult",
    author: "Knut Hamsun",
    year: 1890,
    available: 3,
    total: 4,
  },
  {
    title: "Kristin Lavransdatter",
    author: "Sigrid Undset",
    year: 1920,
    available: 0,
    total: 2,
  },
  {
    title: "Naiv. Super.",
    author: "Erlend Loe",
    year: 1996,
    available: 2,
    total: 2,
  },
  {
    title: "Beatles",
    author: "Lars Saabye Christensen",
    year: 1984,
    available: 1,
    total: 3,
  },
  {
    title: "Doppler",
    author: "Erlend Loe",
    year: 2004,
    available: 0,
    total: 1,
  },
];

const navigation = [
  { label: "Bøker", current: true },
  { label: "Utlån", current: false },
  { label: "Brukere", current: false },
  { label: "Innstillinger", current: false },
];

const shelves = [
  "Skjønnlitteratur",
  "Fagbøker",
  "Barn og ungdom",
  "Magasin",
];

/* -------------------------------------------------------------------------
   Page scaffolding
   ---------------------------------------------------------------------- */

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="py-10">
      <div className="mb-6 flex items-baseline gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {number}
        </span>
        <h2 className="font-heading text-xl font-medium tracking-tight">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------
   Page
   ---------------------------------------------------------------------- */

export default function StylePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 1 — Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-225 flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-3">
          <Wordmark />
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto">
            {/* Det ekte headerfeltet: uten knapp, Enter sender til /sok. */}
            <HeaderSearch />
            <nav aria-label="Hovedmeny">
              <ul className="flex flex-wrap items-center gap-1">
                {navigation.map((item) => (
                  <li key={item.label}>
                    <a
                      href="#"
                      aria-current={item.current ? "page" : undefined}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        item.current
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {/* Hvem du er, og veien til å bytte bruker eller logge ut. */}
            <Button variant="outline" size="sm">
              Marit Hoel
              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-225 flex-1 px-6 py-12">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">
            Stilguide
          </h1>
          <p className="mt-3 max-w-2xl text-sm/relaxed text-muted-foreground">
            Alle flatene, komponentene og tilstandene utlånssystemet er bygget
            av. Siden er en referanse for videre arbeid — den henter ingen data
            og utfører ingen handlinger.
          </p>
        </div>

        <Separator className="mt-10" />

        {/* 1 — Logo */}
        <Section number="01" title="Logo">
          <Card>
            <CardHeader>
              <CardTitle>Merket</CardTitle>
              <CardDescription>
                Tre bokrygger på en hylle. Nøytralene arver tekstfargen rundt
                merket, bare den midterste ryggen er låst til aksentfargen.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-wrap items-end gap-8 rounded-2xl bg-muted p-6">
                <Logo className="size-16" />
                <Logo className="size-10" />
                <Logo className="size-6" />
                <Logo className="size-5" />
              </div>
              <div className="flex flex-col justify-center gap-4">
                <Wordmark />
                <div className="rounded-2xl bg-foreground p-6 text-background">
                  <Wordmark />
                </div>
                <p className="text-sm/relaxed text-muted-foreground">
                  Bruk <code className="font-mono text-xs">Wordmark</code> der
                  appen navngir seg selv, og <code className="font-mono text-xs">Logo</code>{" "}
                  alene når navnet allerede står ved siden av. Minste brukbare
                  størrelse er <code className="font-mono text-xs">size-5</code>{" "}
                  (20 px).
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* 2 — Typography */}
        <Section number="02" title="Typografi">
          <Card>
            <CardHeader>
              <CardTitle>Tekststiler</CardTitle>
              <CardDescription>
                Overskrifter i Noto Serif, brødtekst og kontroller i DM Sans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <h1 className="font-heading text-3xl font-medium tracking-tight">
                Overskrift nivå 1
              </h1>
              <h2 className="font-heading text-xl font-medium tracking-tight">
                Overskrift nivå 2
              </h2>
              <p className="max-w-2xl text-sm/relaxed">
                Brødtekst settes i DM Sans med romslig linjeavstand. Lengre
                avsnitt begrenses i bredde slik at øyet finner tilbake til neste
                linje. Overskrifter settes i Noto Serif, som gir sidene et
                rolig, boklig preg.
              </p>
              <p className="max-w-2xl text-sm/relaxed text-muted-foreground">
                Sekundær tekst — hjelpetekst, tidsstempler og forklaringer —
                settes i dempet farge, men aldri lysere enn at den kan leses på
                skjerm.
              </p>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* 3 — Buttons */}
        <Section number="03" title="Knapper">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Lån boken</Button>
            <Button variant="outline">Avbryt</Button>
            <Button variant="destructive">
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              Slett bok
            </Button>
            <Button disabled>Ikke tilgjengelig</Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Primærknappen brukes én gang per skjermbilde. Fareknappen er
            forbeholdt handlinger som ikke kan angres.
          </p>
        </Section>

        <Separator />

        {/* 4 — Table */}
        <Section number="04" title="Tabell">
          <Card>
            <CardHeader>
              <CardTitle>Bøker</CardTitle>
              <CardDescription>Alle titler i samlingen.</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm">
                  Vis alle
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 pl-(--card-spacing) text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Tittel
                    </TableHead>
                    <TableHead className="h-9 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      År
                    </TableHead>
                    <TableHead className="h-9 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Tilgjengelige
                    </TableHead>
                    <TableHead className="h-9 pr-(--card-spacing) text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Handling
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.map((book) => (
                    <TableRow key={book.title}>
                      {/* w-full max-w-0 + truncate: the identity column takes
                          the slack and shortens its text, so a long title can
                          never push the table into a horizontal scroll.
                          min-w-64 is the floor below which the table scrolls
                          instead of shrinking the title into nonsense. */}
                      <TableCell className="w-full max-w-0 min-w-64 py-3 pl-(--card-spacing)">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <HugeiconsIcon
                              icon={Book02Icon}
                              strokeWidth={2}
                              className="size-4 text-muted-foreground"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col leading-snug">
                            <span className="truncate font-medium">
                              {book.title}
                            </span>
                            <span className="truncate text-muted-foreground">
                              {book.author}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 tabular-nums text-muted-foreground">
                        {book.year}
                      </TableCell>
                      <TableCell className="py-3 text-right font-medium tabular-nums">
                        {book.available} av {book.total}
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing) text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                            })}
                            aria-label={`Handlinger for «${book.title}»`}
                          >
                            <HugeiconsIcon
                              icon={MoreVerticalIcon}
                              strokeWidth={2}
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem>
                              <HugeiconsIcon
                                icon={BookOpen01Icon}
                                strokeWidth={2}
                              />
                              {book.available > 0 ? "Lån boken" : "Reserver"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <HugeiconsIcon
                                icon={PencilEdit02Icon}
                                strokeWidth={2}
                              />
                              Rediger opplysninger
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <HugeiconsIcon
                                icon={Clock01Icon}
                                strokeWidth={2}
                              />
                              Se lånehistorikk
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive">
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                strokeWidth={2}
                              />
                              Slett tittel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* 5 — Status badges */}
        <Section number="05" title="Statusmerker">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Tilgjengelig</Badge>
            <Badge variant="secondary">Utlånt</Badge>
            <Badge variant="destructive">Forfalt</Badge>
            <Badge variant="outline">Bibliotekar</Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge>Klar til henting</Badge>
            <Badge variant="secondary">Venter</Badge>
            <Badge variant="secondary">Holdt av</Badge>
            <Badge variant="secondary">Ikke hentet</Badge>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Merkene står alltid sammen med tekst som forklarer hva de gjelder,
            og brukes aldri som eneste bærer av informasjon. De tre første er
            tilstander som endrer seg. Det fjerde er{" "}
            <code className="font-mono text-xs">outline</code>, som merker noe
            som ligger fast — en rolle, ikke en status.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Den andre raden er reservasjoner. «Klar til henting» får
            aksentfargen fordi låneren skal gjøre noe; resten er nøytrale.
            «Holdt av» står på en tittel der eksemplaret er i huset, men satt
            av til noen andre. Fristen for henting vises alltid ved siden av,
            som dato.
          </p>
        </Section>

        <Separator />

        {/* 6 — Form fields */}
        <Section number="06" title="Skjemafelt">
          <Card>
            <CardHeader>
              <CardTitle>Rediger bok</CardTitle>
              <CardDescription>
                Oppdater opplysningene om tittelen i katalogen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-7 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="book-title">Tittel</FieldLabel>
                    <Input id="book-title" defaultValue="Naiv. Super." />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="book-author">Forfatter</FieldLabel>
                    <Input
                      id="book-author"
                      placeholder="Etternavn, fornavn"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="book-year">Utgivelsesår</FieldLabel>
                    <Input id="book-year" inputMode="numeric" defaultValue="1996" />
                    <FieldDescription>
                      Fire siffer. La stå tomt hvis året er ukjent.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="book-shelf">Hylle</FieldLabel>
                    <Select defaultValue="Skjønnlitteratur">
                      <SelectTrigger id="book-shelf" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {shelves.map((shelf) => (
                          <SelectItem key={shelf} value={shelf}>
                            {shelf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="book-note">Notat</FieldLabel>
                  <Textarea
                    id="book-note"
                    placeholder="Synlig for ansatte, ikke for lånere."
                  />
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="gap-3">
              <Button>Lagre</Button>
              <Button variant="outline">Avbryt</Button>
            </CardFooter>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Søk i samlingen</CardTitle>
              <CardDescription>
                Finn en tittel på navn, forfatter eller ISBN.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel htmlFor="search">Søkeord</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="search"
                    type="search"
                    placeholder="Tittel, forfatter eller ISBN"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton variant="default" size="sm">
                      Søk
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>
                  Søket treffer på deler av ord. 1 248 titler er indeksert.
                </FieldDescription>
              </Field>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* 7 — Detail view */}
        <Section number="07" title="Detaljvisning">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kristin Lavransdatter</CardTitle>
              <CardDescription>Sigrid Undset · 1920 · Aschehoug</CardDescription>
              <CardAction>
                <Badge variant="secondary">Utlånt</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                <DetailRow label="ISBN">978-82-03-19351-2</DetailRow>
                <DetailRow label="Hylle">Skjønnlitteratur · UND</DetailRow>
                <DetailRow label="Eksemplarer">0 av 2 tilgjengelige</DetailRow>
                <DetailRow label="Utlånt til">
                  Marit Hoel og Jonas Berge
                </DetailRow>
                <DetailRow label="Forfaller">
                  <span className="inline-flex items-center gap-1.5">
                    <HugeiconsIcon
                      icon={Calendar03Icon}
                      strokeWidth={2}
                      className="size-4 text-muted-foreground"
                    />
                    3. september 2026
                  </span>
                </DetailRow>
                <DetailRow label="Reservasjoner">1 i kø</DetailRow>
                <DetailRow label="Notat">
                  <span className="text-muted-foreground">
                    Bind 1–3 samlet i ett bind. Ryggen er svak — håndteres
                    varsomt.
                  </span>
                </DetailRow>
              </dl>
            </CardContent>
            <CardFooter className="flex-wrap gap-3">
              <Button>Registrer retur</Button>
              <Button variant="outline">
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                Rediger
              </Button>
              <Button variant="destructive">
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Slett bok
              </Button>
            </CardFooter>
          </Card>
        </Section>

        <Separator />

        {/* 8 — Empty state and error */}
        <Section number="08" title="Tom tilstand og feilmelding">
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={SearchRemoveIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>Ingen bøker funnet</EmptyTitle>
              <EmptyDescription>
                Søket på «kristin lavransdotter» ga ingen treff. Kontroller
                stavemåten, eller søk på forfatter i stedet.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline">Nullstill søk</Button>
            </EmptyContent>
          </Empty>

          <Alert variant="destructive" className="mt-6">
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
            <AlertTitle>Kunne ikke hente boklisten</AlertTitle>
            <AlertDescription>
              Katalogtjenesten svarte ikke innen 10 sekunder. Endringer du har
              gjort er ikke lagret. Prøv igjen, eller kontakt IT-ansvarlig hvis
              feilen fortsetter.
              <div className="mt-3">
                <Button variant="outline" size="sm">
                  <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
                  Prøv igjen
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Lånevilkår</CardTitle>
              <CardDescription>
                Vilkårene gjelder for alle nye utlån.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field data-invalid="true">
                <FieldLabel htmlFor="loan-days">Lånetid i dager</FieldLabel>
                <Input
                  id="loan-days"
                  defaultValue="90"
                  aria-invalid
                  className="sm:max-w-xs"
                />
                <FieldError>
                  Lånetiden kan ikke overstige 28 dager.
                </FieldError>
              </Field>
            </CardContent>
          </Card>
        </Section>
      </main>
    </div>
  );
}
