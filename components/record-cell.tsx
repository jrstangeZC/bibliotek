import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Book02Icon } from "@hugeicons/core-free-icons";

import { TableHead } from "@/components/ui/table";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * For the `TableCell` wrapping a `RecordCell`. `w-full` hands it every pixel the
 * fixed columns don't need; `max-w-0` stops its content from voting on the
 * table's width, which is what lets the text truncate instead of overflowing.
 *
 * `min-w-64` is the floor. Without it the column collapses to a few characters
 * on a narrow screen — the fixed columns still demand their full width, and all
 * the squeeze lands here. Below that floor the table scrolls sideways instead,
 * which is the right trade on a phone: scrolling is recoverable, a title cut to
 * "Ha…" is not.
 */
export const IDENTITY_CELL = "w-full max-w-0 min-w-64";

/**
 * For a *second* two-line column in the same table — a borrower beside a book,
 * say. It gets a smaller floor and no share of the slack, because a table has
 * one identity column and this is not it. Two cells at the full
 * `IDENTITY_CELL` floor overflow the 900 px column on their own.
 */
export const SECONDARY_CELL = "max-w-0 min-w-40";

/** A quiet column header. Same recipe on every table in the app. */
export function ColumnHead({
  className,
  ...props
}: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "h-9 text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  );
}

/**
 * The identity cell of a record row: an icon tile, the name, and its qualifier
 * on a second muted line. `href` turns the name into a link.
 *
 * Both lines truncate. Table cells are `whitespace-nowrap`, so without this a
 * long title sets the column's minimum width and pushes the whole table into a
 * horizontal scroll. Pair it with `IDENTITY_CELL` on the `TableCell`.
 */
export function RecordCell({
  icon,
  name,
  href,
  children,
}: {
  /** Omit for a secondary column — the tile belongs to the identity column. */
  icon?: IconSvgElement;
  name: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className="size-4 text-muted-foreground"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col leading-snug">
        {href ? (
          <Link
            href={href}
            title={name}
            className="truncate font-medium hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="truncate font-medium" title={name}>
            {name}
          </span>
        )}
        {children ? (
          <span className="truncate text-muted-foreground">{children}</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A `RecordCell` for the book a loan or reservation is about: title linking to
 * the book, author beneath. A deleted book keeps its row as «Ukjent tittel».
 */
export function BookRecordCell({
  book,
  icon = Book02Icon,
}: {
  book: Book | null;
  icon?: IconSvgElement;
}) {
  return (
    <RecordCell
      icon={icon}
      name={book?.title ?? "Ukjent tittel"}
      href={book ? `/boker/${book.id}` : undefined}
    >
      {book?.author}
    </RecordCell>
  );
}
