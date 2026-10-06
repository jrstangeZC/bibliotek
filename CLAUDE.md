# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

A demo lending system for a small library: Next.js 16 App Router, React 19,
TypeScript, Tailwind 4. No database and no real login. `README.md` (Norwegian)
holds the business rules, the page and API map, and the cookie table — read it
before changing loan, fee, renewal or reservation behaviour.

## Commands

```bash
npm run dev                         # http://localhost:3000
npm run build
npm run lint                        # eslint (next core-web-vitals + typescript)
npx tsc --noEmit                    # typecheck — there is no script for it
npm test                            # vitest run, every lib/**/*.test.ts
npx vitest run lib/fees.test.ts     # one file
npx vitest run -t "cap"             # tests whose name matches
npm run reset-data                  # delete data/db.json; rebuilt from seed on next read
```

Env: `CRON_SECRET` enables `POST /api/jobs/reservasjoner` (it 404s without it);
`ALLOW_DEMO_RESET=true` allows the reset button in production.

## Architecture

Layers, top to bottom:

- **`app/`**: server-component pages and a few JSON route handlers. The
  `(app)` route group carries the shared shell (header and held-copy banner);
  `/stil` sits outside it. Pages are `force-dynamic`, and they use Next 16's
  global `PageProps<"/route">` / `RouteContext<...>` helpers, where `params`
  and `searchParams` are promises.
- **`lib/actions.ts`**: every server action. Each one checks who is acting
  itself (`requireLibrarianForAction` or `getCurrentBorrower`), because an
  action is a public endpoint whether or not a page links to it. Whose loan or
  reservation it is comes from the session, never from a form field. After a
  write, call the matching `revalidateLoanViews` / `revalidateCatalogue`. They
  include the layout, because the banner shows held copies.
- **`lib/loans.ts`**: orchestration and view models (`BookView`, `LoanView`,
  `ReservationView`). Pages read through these, not through `lib/db.ts` directly.
- **`lib/db.ts`**: the only module that touches disk. `data/seed.json` is
  committed and never written; `data/db.json` is the git-ignored working copy.
  Every read and write runs through one promise queue (`enqueue`). A write that
  depends on current state (for example, a copy must still be free) checks it
  inside the same queued operation.
- **Pure rule modules**: `fees`, `availability`, `renewals`, `reservations`,
  `dates`, `mail`, `search` (the one text matcher behind every search field),
  plus form parsing and validation in `books` and `borrowers`.
  They do no I/O and take `now`/`today` as a parameter rather than reading the
  clock; tests pass fixed dates.

Invariants that span several files:

- **Reading never writes.** `settleReservations` expires holds and passes
  copies on; given `now` it always gives the same answer, so reads settle in
  memory and the next write stores it. A write that can change holds should
  `load(now)` and `save(database, now)` (not bare `write`), because `save` is
  where `queueHoldNotices` puts «ready» emails into the outbox.
- **Adding a field to the `Database` types** means adding a `??=` default in
  `read()` in `lib/db.ts`, because existing `data/db.json` files predate it.
  Update `data/seed.json` too.
- **Dates** are full ISO 8601 UTC strings. Day arithmetic counts whole UTC days
  (`lib/dates.ts`).
- **Errors** are result unions (`{ ok: false, error: "kebab-code" }`). A server
  action turns one into a Norwegian slug (`lib/errors.ts`) and redirects to
  `?feil=<slug>`; the page renders `describeError(feil)` as an `Alert`. Success
  travels the same way (`?holdt=`, `?lagret=`, `?ny=`, …). Forms built on
  `useActionState` return `BookFormState` / `BorrowerFormState`
  (`lib/forms.ts`), which carry the failing field and the values as typed.
- **Auth** has one seam, `lib/auth.ts`. A librarian-only page shown to a
  borrower renders `<LibrarianRequired>` instead of 404-ing.
- **URLs and new ids are Norwegian**: `bok-`, `laaner-` and `reservasjon-`
  prefixes, and route segments like `/mine-laan`. Seed records keep their
  English ids (`book-1`, `borrower-1`, `loan-1`).

### Tests

Vitest runs in the node environment and only picks up `lib/**/*.test.ts`. Tests
that touch storage (`db.*.test.ts`, `jobs.route.test.ts`) copy the seed into a
temp dir, `process.chdir` into it, call `vi.resetModules()`, and only then
`import("@/lib/db")`. `lib/db.ts` resolves `data/` from `process.cwd()` when it
loads, and this keeps the real `data/db.json` untouched. Follow that pattern for
any new storage test. The tests name seed records (`book-5`, `borrower-1`,
`loan-1`), so editing `data/seed.json` can break them.

# UI and UX

Before building or changing any UI, read @docs/design/README.md — the design
language (palette, typography, shape, component and state conventions) for this
app.

Two reference screenshots define the look. Open them when the written rules
don't settle a question — layout density, spacing rhythm, how a pattern reads
in context:

- `docs/design/inspiration/maia-app-surfaces.png` — the language applied to real
  screens: stat blocks, transaction lists, forms, nav, breadcrumbs, danger zone
- `docs/design/inspiration/maia-components.png` — the component gallery and
  palette swatches: buttons, badges, inputs, charts, empty states, skeletons

They are the current `base-maia` style, so shape and elevation can be read
straight off them. `docs/design/inspiration/README.md` indexes what each sheet
shows and lists the two places the app deviates from them on purpose.

The app uses shadcn (`base-maia` preset, Base UI primitives, hugeicons). Add
components with `npx shadcn@latest add <name>` rather than hand-rolling them.
`/stil` is the living style guide — keep it in sync when the language changes.

Interface copy is Norwegian; code and identifiers are English.
