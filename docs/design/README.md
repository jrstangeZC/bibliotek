# Design language — Bibliotek

The visual language of this app. Read this before building or changing any UI.

The source of truth for values is `app/globals.css` (written by the shadcn
preset). This document explains **how to use** those values. If the two ever
disagree, `globals.css` wins and this file should be corrected.

Live reference implementation: [`/stil`](../../app/stil/page.tsx) — every
component and state on one page.

Visual reference: [`inspiration/`](inspiration/) holds the two `base-maia`
screenshots this language is drawn from — `maia-app-surfaces.png` and
`maia-components.png`. Open them when the rules below don't settle a question.
They show the current style, so shape and elevation can be measured off them;
[`inspiration/README.md`](inspiration/README.md) notes where we deviate.

---

## Origin

Installed with:

```
npx shadcn@latest init --preset b5HDJiNMsq --template next --pointer
```

Re-running `init` on an already-configured project needs `-f --reinstall`,
otherwise it only prompts and exits without regenerating the components.

- Style: `base-maia` · base color `taupe` · Base UI primitives (`@base-ui/react`)
- Icons: **hugeicons** (`@hugeicons/react` + `@hugeicons/core-free-icons`)
- `--pointer` is on: buttons get `cursor: pointer`

Add components with `npx shadcn@latest add <name>`. Do not hand-roll a
component that exists in the registry, and do not restyle the generated
primitives in `components/ui/` unless the change belongs to every usage.

> **Note:** this style supersedes the earlier flat brief (grayscale, no
> animation, `rounded-md` cap). Those constraints no longer apply — the preset
> is intentionally rounded and warm. One of them survives by coincidence: Maia's
> cards carry a ring and **no shadow**, so elevation comes from the
> ground-to-card colour step alone.

## Logo

The mark is **three book spines on a shelf** — the middle one upright in
terracotta, the right one leaning into the gap. Not a single book: a shelf is
the library, and it stays legible down to 20 px where an open book turns to
mush.

Use the components in [`components/logo.tsx`](../../components/logo.tsx), never
a hand-rolled copy:

- `<Logo />` — the mark alone. Neutrals are `currentColor`, so it takes the text
  colour of its container and dark mode is free; only the middle spine is pinned
  to `primary`. Size it with `size-*` (default `size-6`, minimum `size-5`).
- `<Wordmark />` — mark plus "Bibliotek" in `font-heading`. Use this wherever the
  app names itself, so the mark-to-word spacing never drifts between screens.

Static files: [`public/logo-mark.svg`](../../public/logo-mark.svg) for `<img>`
and external use (it flips its neutral for `prefers-color-scheme: dark`), and
`app/icon.svg` for the browser tab — a cream silhouette on a terracotta rounded
square, the one place the mark is a solid block of accent.

Never recolour the mark beyond this, never outline it, and never set it on a
busy ground. The accent spine is the only colour it gets.

## Palette

Warm neutrals plus **one** terracotta accent. Never introduce a new hue.

| Token | Light | Role |
| --- | --- | --- |
| `background` | `#f3f1f1` | Page ground — warm off-white, never pure white |
| `foreground` | `#0c0a09` | Primary text (warm near-black, not pure black) |
| `card` | `#ffffff` | Raised surfaces — white, so they lift off the ground |
| `primary` | `#bb4d00` | The accent. Primary buttons, active nav, key icons, progress fill |
| `primary-foreground` | `#fffbeb` | Text on primary |
| `secondary` | `#f4f4f5` | Quiet button fill |
| `accent` | `#b75000` | **Same terracotta as `primary`** — selected and focused rows |
| `muted` | `#f3f1f1` | Hover fills, icon tiles, chart tracks |
| `muted-foreground` | `#7c6d67` | Secondary text, labels, units |
| `border` | `#e8e4e3` | Hairlines and dividers |
| `destructive` | `#e7000b` | Errors and irreversible actions only |
| `chart-1` … `chart-5` | `#d8d2d0` → `#2b2422` | Taupe ramp, light to dark |

Rules:

- **The ground is never white.** `background` is the warm off-white `#f3f1f1`
  (sampled from both reference screenshots) and `card` is pure white. That one
  step of contrast is what makes surfaces read as raised — since Maia's cards
  have no shadow, it is doing most of the work. Anything meant to look like a
  surface gets `bg-card`, including the app header.
  This is a **local override**: every preset ships `--background` as pure white,
  so `shadcn init` resets it. Re-apply it afterwards — `globals.css` carries a
  comment saying so.
- **`accent` is not a neutral here.** Maia points `--accent` at the same
  terracotta as `--primary` (Luma used a light gray). Anything styled
  `bg-accent` — focused select items, highlighted rows — comes out solid
  terracotta with light text. Don't reach for `accent` expecting a subtle
  tint; use `muted` for that.
- **Charts are taupe, not terracotta.** Use the `chart-*` ramp for bars, and
  reserve `primary` for the one series or value being emphasised.
- **`destructive` is not decoration.** Errors, delete, and overdue states only.
- Green is permitted for one thing: a positive money delta (`+4 200 kr`).
  Nothing else earns a new colour.
- Dark mode ships with the preset (`.dark` tokens in `globals.css`). Style with
  tokens, never hardcoded hex, and dark mode stays correct for free.

## Typography

Two loaded families, both set up in `app/layout.tsx`:

- **Noto Serif** → `font-heading`. All headings, `CardTitle`, `EmptyTitle`,
  and display figures.
- **DM Sans** → `font-sans`, the default. All body, labels, controls, tables.

| Use | Classes |
| --- | --- |
| Page title (h1) | `font-heading text-3xl font-medium tracking-tight` |
| Section title (h2) | `font-heading text-xl font-medium tracking-tight` |
| Card title | `CardTitle` (already `font-heading`) |
| Body | `text-sm/relaxed` |
| Secondary body | `text-sm/relaxed text-muted-foreground` |
| Micro label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Any number | add `tabular-nums` |

Headings use `font-medium`, not bold — the serif carries the weight. Cap body
copy at `max-w-2xl` so lines stay readable.

## Shape and elevation

Radii come from `--radius: 0.625rem`, scaled by the `rounded-*` utilities:
`sm` 6px · `md` 8px · `lg` 10px · `xl` 14px · `2xl` 18px · `3xl` 22px ·
`4xl` 26px. Use the utilities, never a hardcoded pixel radius — the whole scale
moves with the token.

- Buttons, badges, inputs, select triggers: `rounded-4xl`
- Cards and popovers: `rounded-2xl`
- Textareas and icon tiles: `rounded-xl`
- Alerts and empty states: `rounded-lg`

Surfaces are separated by a **hairline ring, with no shadow**:
`bg-card ring-1 ring-foreground/10`. `Card` does this for you — prefer it over
rebuilding the recipe. Because nothing is floating on a shadow, the
ground-to-card colour step above is what creates the sense of elevation; don't
flatten it.

**Every card opens with a `CardHeader` holding a `CardTitle` and a
`CardDescription`.** The title names the surface in two or three words; the
description is one plain sentence saying what the card is for or what will
happen here ("Oppdater opplysningene om tittelen i katalogen."). A card that
starts straight into its content leaves the reader to infer its purpose from
the controls — don't ship one. The description is a sentence, not a repeated
label: it must say something the title and the field labels do not.

**Cards have no internal dividers.** No `border-b` under the header, no
`border-t` above the footer — not on form cards, not on table cards. Spacing
alone separates header, content and footer. The card's own ring already says
where the surface begins and ends; a rule inside it just chops the surface up.

## Controls

- **Buttons** — `default` = solid terracotta, one per screen. `outline` for the
  neighbouring action, `ghost` for table-row and toolbar actions, `secondary`
  for quiet fills. `destructive` is a **soft tint** (`bg-destructive/10
  text-destructive`), not a solid red block. Sizes: `xs` in table rows, `sm` in
  dense toolbars, `default` elsewhere.
- **Inputs** — filled (`bg-input/30`) with a **visible** `border-input` hairline
  that turns into a ring on focus and red when invalid. Never add your own
  border on top.
- **Fields** — always `Field` + `FieldLabel` + `FieldDescription` / `FieldError`.
  Every control gets a real `<label htmlFor>`. Mark errors with
  `aria-invalid` on the control **and** `data-invalid="true"` on the `Field`.
- **Search** — `InputGroup` with a leading `Search01Icon` addon and a trailing
  `InputGroupButton`. **One exception:** the search field in the header
  (`HeaderSearch` in `components/site-search.tsx`) has no button. It only
  starts a search, Enter sends it, and the full recipe with the button is on
  `/sok`, where the search is adjusted.
- **Icons** — `<HugeiconsIcon icon={SomeIcon} strokeWidth={2} />`. The button and
  badge primitives size icons automatically; don't set `size-*` unless you mean
  to override.

## Layout

- Content column: `mx-auto w-full max-w-225 px-6` (900 px). Header and main
  share the same column so their edges line up.
- Vertical rhythm: `py-10`–`py-12` between sections, `Separator` between them.
- Header is a single row: mark + name on the left, then the search field, nav
  and the current user's menu grouped together on the right, one `border-b`.
  The search field is the group's first item, `w-56` from `sm` up and a
  full-width row of its own below `sm`. It is left out on `/sok`, whose own
  field holds the search. The user menu is a `DropdownMenuTrigger` styled with
  `buttonVariants({ variant: "outline", size: "sm" })`, showing the name and a
  chevron, opening a `DropdownMenu` that repeats name, email and role before
  the account actions.
- Navigation only lists what the current user may open — a plain borrower never
  sees the administration link. A page they reach anyway explains why, and
  offers the way across, rather than 404-ing.

## Data display

- **Records go in a `Table`, never in a grid of cards.** One card may *contain*
  the table — that is the reference pattern — but a card per record is wrong.
- Wrap the table in a `Card`: a `CardHeader` with the title, a one-line
  description, and a `CardAction` holding an outline "Vis alle" button; then
  `CardContent className="px-0"` so rows run edge to edge. Give
  first and last cells `pl-(--card-spacing)` / `pr-(--card-spacing)` so they
  line up with the header text above.
- The identity column carries a **leading `size-9 rounded-xl bg-muted` icon
  tile** and stacks two lines: the record name in `font-medium` over its
  qualifier in `text-muted-foreground`. Fold secondary attributes into that
  second line rather than giving each one its own column.
- **A table must not scroll horizontally on desktop.** Horizontal scroll is
  fine below the `sm` breakpoint and expected there; inside the 900 px column it
  means the table is carrying a column it doesn't need. Two rules keep it out:
  every `TableCell` is `whitespace-nowrap`, so (1) give the identity cell
  `IDENTITY_CELL` (`w-full max-w-0 min-w-64`) and let `RecordCell` truncate — it
  then absorbs the slack instead of setting a minimum width — and (2) keep the
  fixed columns few and short. Prefer folding a column into the identity line
  over widening the page.
  The `min-w-64` floor matters: the identity column is the one that gives, so
  without it a narrow screen squeezes it to a few characters while the fixed
  columns keep their width. Below the floor the table scrolls sideways instead,
  which is the correct behaviour on a phone.
- A person's name on a librarian's screen links to their edit form:
  `href={borrowerEditHref(id)}` on the `RecordCell` (from `lib/borrowers.ts`).
  Never hand-build the URL; the form's anchor is `BORROWER_FORM_ID`, beside it.
- Right-align numeric columns and add `tabular-nums`; left-align text. The
  headline value on the right gets `font-medium`; supporting columns stay muted.
- Column headers are quiet: `h-9 text-xs font-medium uppercase tracking-wide
  text-muted-foreground`, no fill.
- Row actions live in **one overflow menu**, not as a button per action: a
  `DropdownMenuTrigger` carrying `buttonVariants({ variant: "ghost", size:
  "icon-sm" })` with `MoreVerticalIcon`, and a `DropdownMenuContent
  align="end"`.
  Style the trigger with `buttonVariants`, **never** `render={<Button/>}`. The
  nested render makes Base UI merge two `data-slot` values, and it does not pick
  the same winner on the server as on the client — the result is a hydration
  mismatch that varies row by row. The class string is identical either way.
- A menu item that **submits** needs its `<form>` rendered *outside* the
  `DropdownMenuContent`, with the item pointing at it via the native `form`
  attribute (`<button type="submit" form="...">`, plus `nativeButton` on the
  item). The popup unmounts the instant an item is pressed, and a form torn out
  of the tree mid-submit never completes. A `<button>` shrinks to its content
  even as a flex box, so `DropdownMenuItem` carries `w-full` — that keeps the
  hover fill on a submitting item as wide as on a link item. Re-apply it if
  `shadcn` regenerates the primitive. The trigger needs
  an `aria-label` naming the record — "Handlinger for «Sult»" — because the icon
  alone says nothing about which row it belongs to. Order the menu with the
  everyday action first, then the edit and history items, then a
  `DropdownMenuSeparator` and the `variant="destructive"` item last. Never put a
  destructive item next to a routine one without that separator.
- Detail views: `Card` with `CardHeader` (title, description, `CardAction` for a
  status `Badge`), a `<dl>` of label/value rows in `CardContent`, and actions in
  a `CardFooter`.

Two recurring patterns from the reference screenshots:

- **Stat block** — uppercase micro-label, then a large `font-heading` figure,
  then a progress bar, then a caption row splitting percentage and absolute
  value. Use for a single headline number, never for a list.
- **Record row** — leading icon tile, two-line title over muted subtitle,
  right-aligned `tabular-nums` value, trailing `ghost` overflow action. This is
  the shape for activity and history; reach for it before inventing a card grid.
- **Destructive entry points** are quiet: an inset row with an alert icon and a
  chevron (a "Danger Zone"), not a red button sitting in the layout.

## States

Never leave these to chance — every list and every fetch needs all three.

- **Empty** — `Empty` with an `EmptyMedia variant="icon"` tile, a serif
  `EmptyTitle`, a muted `EmptyDescription` that says what to try next, and one
  action. Add `className="border bg-card"` (the primitive sets `border-dashed`
  but no border width).
- **Error** — `Alert variant="destructive"` with a leading icon, an
  `AlertTitle` naming what failed, and a description covering what it means for
  unsaved work plus a recovery action.
- **Status** — `Badge`: `default` for positive/available, `secondary` for
  neutral/in-progress, `destructive` for overdue/failed. Badges always sit
  beside explanatory text; colour is never the only signal.
- **Role** — also a `Badge`, but `outline`. A role is a fixed fact about an
  account, not a state that moves, so it stays out of the status colours.

## Language

Interface copy is **Norwegian**, code and identifiers are **English**. Norwegian
sentence case for headings and buttons ("Lån ut", not "Lån Ut"). Use « » quotes
and non-breaking-friendly number spacing (`1 248`).
