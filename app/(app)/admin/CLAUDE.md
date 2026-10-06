# Admin area (`/admin`)

Desk work for librarians: active loans, reservations, the catalogue, people,
the outbox and demo settings. Every file here is a server-component page. The
reusable pieces live in `components/` and `lib/`, so a new admin screen is
mostly assembly. Reach for what is listed below before writing markup.

## Page skeleton

Every page opens the same way. Start a new one from this:

```tsx
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservasjoner – Bibliotek",
  description: "One sentence on what the page holds",
};

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/admin/reservasjoner">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Reservasjoner" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const [reservations, { feil, avbestilt }] = await Promise.all([
    listOpenReservations(),
    searchParams,
  ]);
  const error = describeError(feil);

  return (
    <>
      <PageHeading title="Reservasjoner">One muted sentence.</PageHeading>
      <AdminNav />
      {/* error Alert, then success Alerts, then the content */}
    </>
  );
}
```

- Each page carries its own guard; there is no admin layout. The guard
  branch's `PageHeading` uses the same title as the real page.
- **Top-level view** (one of the tabs): `PageHeading`, then `<AdminNav />`. A
  new tab is a new entry in `views` in `components/admin-nav.tsx`.
- **Sub-page** (`ny`, `[id]`, `[id]/slett`, `utboks/[id]`): `<AdminBreadcrumbs
  parents={[…]} current="…" />` above `PageHeading`, in place of `AdminNav`.
  `AdminNav` highlights by exact path, so it has nothing to mark on a sub-page.
- Unknown id: `notFound()`, after the guard.
- Per-record titles come from `generateMetadata`, which runs before the page's
  guard. When the title would show a borrower something they may not see (a
  person's name), check `getCurrentBorrower()` + `isLibrarian` inside it and
  fall back to a generic title. Share the record load with the page through
  `cache()`. Both are in `brukere/[id]/page.tsx`.

## Feedback through the URL

Actions redirect back with a marker. The page turns it into an `Alert` with
`className="mb-6"`: the error first, then the successes.

- **Error**: `?feil=<slug>` → `describeError(feil)` → `<Alert
  variant="destructive">` with `AlertCircleIcon`. A new failure gets a slug and
  a message in `lib/errors.ts`. Its description says what failed, that nothing
  was changed, and what to do next, like the messages already there.
- **Success**: a default `Alert` with `CheckmarkCircle02Icon`. Markers in use:
  `ny`, `lagret`, `slettet`, `holdt`, `avbestilt`, `handtert`, `tilbakestilt`.
  A marker that carries an id gets looked up so the title can name the record
  («Sult» er lagt til). The books register also marks that row with
  `data-state="selected"` and `className="data-[state=selected]:bg-muted/60"`.
  A marker with no record to name carries `1`.

## Components to reuse

| Need | Reuse |
| --- | --- |
| Page title and its sentence | `PageHeading` |
| Tabs between top-level views | `AdminNav` |
| Trail on a sub-page | `AdminBreadcrumbs` |
| A borrower who reaches an admin page | `LibrarianRequired` |
| Column header | `ColumnHead` |
| Identity cell (tile, name, muted second line) | `RecordCell` inside a `TableCell` carrying `IDENTITY_CELL` |
| The book a loan or reservation is about | `BookRecordCell`. Covers a deleted book; pass `icon={Bookmark01Icon}` for reservations |
| A second two-line column (borrower beside a book) | `RecordCell` without `icon`, in a cell carrying `SECONDARY_CELL` |
| Loan status, due date | `LoanStatusCell`, `LoanDueCell` |
| Reservation status | `ReservationStatusCell` |
| Book availability | `BookStatusBadge` |
| Role | `RoleBadge`; `roleLabels` for the wording alone |
| An empty table inside a card that stays | `EmptySection` |
| Label/value rows in a card | `DetailRow` in `<dl className="divide-y divide-border text-sm">` |
| Searching titles | `CatalogueSearch` + `NoCatalogueMatches`, filtered by `searchBooks` from `lib/search.ts` (the same matcher as the global search at `/sok`) |
| Create or edit a book | `BookForm`; pass `book` and `onLoan` to edit |
| Create or edit a person | `BorrowerForm` with `mode="create"` or `mode="edit"` |
| Fields of a new form | `FormFields defaults={values}` |
| Kroner, dates, day counts | `formatKroner`, `formatDate`, `formatDays` from `lib/format.ts` |

Empty states: a page with one list swaps the whole card for `<Empty
className="border bg-card">` (`page.tsx`, `utboks/page.tsx`). A page with
several sections keeps every card and shows `EmptySection` in the empty ones,
with `px-0` dropped from that `CardContent` while it shows (`brukere/[id]`).

Some pieces are still local to one page: `Fact` (a micro-label over a value)
and the danger-zone inset row in `boker/[id]/page.tsx`, plus `BookActions` and
`circulation()` in `boker/page.tsx`. When a second page needs one, move it into
`components/` and point the first page at the shared copy too.

## Pages to copy from

- `page.tsx`: table in a card, count badge in `CardAction`, a row menu whose
  item submits a form.
- `reservasjoner/page.tsx`: two table cards on one page; a menu ending in a
  destructive submit behind a separator.
- `boker/page.tsx`: a register with search, «Ny bok» in `CardAction`, success
  alerts naming the record, and a delete item disabled with its reason.
- `boker/[id]/page.tsx`: edit page with a facts strip, the form, and a
  danger-zone row leading to the confirmation page.
- `boker/[id]/slett/page.tsx`: destructive confirmation. It says what will
  happen, and a blocked delete shows as a destructive `Alert` plus a disabled
  button.
- `brukere/[id]/page.tsx`: record page with a `DetailRow` summary, several
  table cards, and the edit form at the foot under `BORROWER_FORM_ID`.
- `utboks/[id]/page.tsx`: read-only detail.

## Tables and row menus

`docs/design/README.md` (Data display) has the table and menu mechanics. The
admin conventions on top of it:

- Header row `<TableRow className="hover:bg-transparent">`, body cells `py-3`,
  and a right-aligned last column headed «Handling» holding the menu.
- `CardAction` holds one of two things. On a register it is the create link,
  `buttonVariants({ size: "sm" })` with an icon («Ny bok», «Ny bruker»). On any
  other table it is a count `Badge`: `destructive` when something needs
  attention («2 forfalt», «1 å flytte»), `default` when something is ready
  («1 klar til henting»), `secondary` for a plain count («5 ute»).
- A submitting menu item's hidden form gets ``id={`<verb>-${record.id}`}``
  (`retur-`, `avbestill-`, `handtert-`) and `className="hidden"`, with the
  record id in a hidden input named for what the action reads (`loanId`,
  `reservationId`).
- The trigger's `aria-label` names the record: `Handlinger for «${title}»`.
- A destructive action that is unavailable right now stays in the menu as a
  disabled item with the reason on a second line (`BookActions`).
- Deleting happens on a page of its own. The menu item and the danger-zone row
  both link to `<record>/slett`, which explains, confirms and submits.

## Forms and actions

- Every admin action in `lib/actions.ts` opens with the librarian check
  (`requireLibrarianForAction()`), the same as the actions already there. On
  failure it redirects to its admin page with `?feil=`.
- A form action (`useActionState`) answers a rejection with `{ values, error:
  { field, message } }`, so nothing is retyped, and on success redirects to the
  register with `?ny=<id>` or `?lagret=<id>`. A form that sits on the page it
  would redirect to returns `{ saved: true }` instead (`BorrowerForm` in edit
  mode; `lib/forms.ts` says why).
- A new form follows `BookForm`: `"use client"`, `<form action={action}
  noValidate>`, a hidden `id` input when editing, the fields inside
  `FormFields`, `data-invalid` on each `Field` and `aria-invalid` on its
  control, `FieldError` in place of the `FieldDescription` when that field
  failed, and a footer with the submit button (icon, «Lagrer …» while pending)
  beside an outline «Avbryt» link back to the register. Its state type and empty
  state go in `lib/forms.ts`.
- Revalidation: `revalidateLoanViews` refreshes `/admin` and
  `/admin/reservasjoner`; `revalidateCatalogue` refreshes `/admin` and
  `/admin/boker`; the borrower actions refresh their own paths. A new admin page
  that shows loan or catalogue data gets added to the matching helper.

## Data and links

- Read through the view models in `lib/loans.ts`: `listActiveLoans`,
  `listBooks`, `findBook`, `listOpenReservations`, `listHoldsToHandle`,
  `findOpenReservation`, `findBorrowerOverview`. Plain lists with no view model
  (`getBorrowers`, `getLoans`, `getOutbox`) come from `lib/db`. Anything
  derived (status, fees, availability, queue place) belongs in `lib/loans.ts`
  beside the others.
- A deleted book or borrower comes through as `null`. Show «Ukjent tittel» or
  «Ukjent låner».
- Link a person with `borrowerEditHref(id)`. Link a book to its public page
  `/boker/${id}`, which is what `BookRecordCell` does. The catalogue register is
  the exception: there the title opens `/admin/boker/${id}`, and «Vis slik
  lånerne ser den» is a menu item.
