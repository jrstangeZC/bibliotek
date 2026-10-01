import type { LoanError } from "@/lib/loans";
import type { RenewalError } from "@/lib/renewals";
import type { ReservationError } from "@/lib/reservations";

/**
 * A failed borrow or return sends the reader back to the page they came from
 * with a `?feil=` marker, so the message survives the redirect without turning
 * the page into a client component.
 */

const slugs: Record<LoanError, string> = {
  "book-not-found": "ukjent-bok",
  "no-copies-available": "ingen-eksemplarer",
  "loan-not-found": "ukjent-laan",
  "already-returned": "allerede-levert",
};

const messages: Record<string, { title: string; description: string }> = {
  "ukjent-bok": {
    title: "Fant ikke boken",
    description:
      "Tittelen finnes ikke lenger i katalogen. Ingen ting ble registrert. Gå tilbake til boklisten og prøv på nytt.",
  },
  "ingen-eksemplarer": {
    title: "Ingen eksemplarer å låne ut",
    description:
      "Det siste ledige eksemplaret ble lånt ut eller holdt av for noen i kø i mellomtiden. Lånet ble ikke registrert. Reserver boken for å stå i kø.",
  },
  "ukjent-laan": {
    title: "Fant ikke lånet",
    description:
      "Lånet finnes ikke i registeret. Returen ble ikke registrert. Oppdater siden og kontroller listen over aktive lån.",
  },
  "ukjent-laaner": {
    title: "Fant ikke låneren",
    description:
      "Personen står ikke i registeret lenger. Du er ikke logget inn. Velg en annen i listen under.",
  },
  "bok-ikke-funnet": {
    title: "Fant ikke boken",
    description:
      "Tittelen er allerede fjernet fra katalogen, kanskje av en annen bibliotekar. Ingen ting ble endret. Kontroller listen under.",
  },
  "bok-utlant": {
    title: "Boken kan ikke slettes nå",
    description:
      "Minst ett eksemplar er ute på lån. Sletting ble ikke gjennomført. Registrer retur under Aktive lån, og prøv igjen.",
  },
  "allerede-levert": {
    title: "Lånet er allerede levert",
    description:
      "Boken ble registrert som levert av noen andre. Ingen ting er endret, og eksemplaret står i hyllen.",
  },
  "laan-ikke-funnet": {
    title: "Fant ikke lånet",
    description:
      "Lånet finnes ikke blant dine lån. Fristen er uendret. Oppdater siden og kontroller listen under.",
  },
  "allerede-forlenget": {
    title: "Lånet er allerede forlenget",
    description:
      "Et lån kan bare forlenges én gang. Fristen er uendret, så lever boken innen datoen som står i listen.",
  },
  "andre-venter": {
    title: "Andre venter på boken",
    description:
      "Noen står i kø for tittelen, så lånet kan ikke forlenges. Fristen er uendret. Lever boken innen datoen som står i listen, så går den videre til neste.",
  },
  "bok-ledig": {
    title: "Boken står i hyllen",
    description:
      "Et eksemplar er ledig nå, så det er ingen kø å stå i. Ingen reservasjon ble registrert. Lån boken i stedet.",
  },
  "allerede-reservert": {
    title: "Du står allerede i køen",
    description:
      "Du har en reservasjon på denne tittelen fra før. Ingen ny ble registrert. Se plassen din under Mine lån.",
  },
  "har-boken-allerede": {
    title: "Du har allerede boken",
    description:
      "Et eksemplar av tittelen er lånt ut til deg. Ingen reservasjon ble registrert. Se fristen under Mine lån.",
  },
  "for-mange-reservasjoner": {
    title: "Du har nådd grensen for reservasjoner",
    description:
      "Du kan ha tre reservasjoner om gangen. Ingen ny ble registrert. Avbestill en under Mine lån for å reservere denne.",
  },
  "ukjent-reservasjon": {
    title: "Fant ikke reservasjonen",
    description:
      "Reservasjonen er allerede avsluttet, kanskje fordi boken ble lånt eller hentefristen gikk ut. Ingen ting ble endret. Oppdater siden og kontroller listen.",
  },
  "hold-handtert": {
    title: "Eksemplaret er allerede håndtert",
    description:
      "Noen har allerede kvittert for dette eksemplaret. Ingen ting ble endret. Kontroller listen under.",
  },
  "laan-forfalt": {
    title: "Lånet er forfalt",
    description:
      "Et forfalt lån kan ikke forlenges. Fristen er uendret, og gebyret løper til boken er levert tilbake.",
  },
};

export function errorSlug(error: LoanError): string {
  return slugs[error];
}

const bookSlugs: Record<"book-not-found" | "book-on-loan", string> = {
  "book-not-found": "bok-ikke-funnet",
  "book-on-loan": "bok-utlant",
};

/** The failures that send you back to the list. The rest are shown on the form. */
export function bookErrorSlug(error: keyof typeof bookSlugs): string {
  return bookSlugs[error];
}

const renewalSlugs: Record<RenewalError, string> = {
  "loan-not-found": "laan-ikke-funnet",
  // Shares its wording with the return screen: the book is back either way.
  "already-returned": "allerede-levert",
  "already-renewed": "allerede-forlenget",
  overdue: "laan-forfalt",
  reserved: "andre-venter",
};

export function renewalErrorSlug(error: RenewalError): string {
  return renewalSlugs[error];
}

export function describeError(slug: string | string[] | undefined) {
  if (typeof slug !== "string") return null;
  return messages[slug] ?? null;
}

const reservationSlugs: Record<ReservationError | "reservation-not-found", string> = {
  "book-not-found": "ukjent-bok",
  "book-available": "bok-ledig",
  "already-reserved": "allerede-reservert",
  "already-borrowed": "har-boken-allerede",
  "limit-reached": "for-mange-reservasjoner",
  "reservation-not-found": "ukjent-reservasjon",
};

export function reservationErrorSlug(
  error: ReservationError | "reservation-not-found"
): string {
  return reservationSlugs[error];
}
