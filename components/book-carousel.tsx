import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Book02Icon,
  BookmarkAdd01Icon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons"

import {
  BookStatusBadge,
  reservationBlockReasons,
} from "@/components/book-status"
import { CoverZoom } from "@/components/cover-zoom"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { borrowBookAction, reserveBookAction } from "@/lib/actions"
import { coverUrl } from "@/lib/covers"
import type { BookView } from "@/lib/loans"

/**
 * The slide's main action, the same choice the table's row menu makes: borrow
 * when a copy is free (or held for the reader), reserve when not, and — when
 * neither is open to them — the reserve button disabled with the reason
 * beneath. No popup here, so each form can hold its own button.
 */
function BorrowOrReserve({ book }: { book: BookView }) {
  const standing = book.viewer

  if (!standing) {
    return (
      <Link
        href="/logg-inn"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
        Logg inn for å låne
      </Link>
    )
  }

  if (standing.canBorrow) {
    return (
      <form action={borrowBookAction}>
        <input type="hidden" name="bookId" value={book.id} />
        <Button type="submit" variant="secondary" size="sm">
          <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
          Lån boken
        </Button>
      </form>
    )
  }

  const block = standing.reservationBlock
  if (block && block !== "book-available") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <Button variant="secondary" size="sm" disabled>
          <HugeiconsIcon icon={BookmarkAdd01Icon} strokeWidth={2} />
          Reserver boken
        </Button>
        <span className="text-xs text-muted-foreground">
          {reservationBlockReasons[block]}
        </span>
      </div>
    )
  }

  return (
    <form action={reserveBookAction}>
      <input type="hidden" name="bookId" value={book.id} />
      <Button type="submit" variant="secondary" size="sm">
        <HugeiconsIcon icon={BookmarkAdd01Icon} strokeWidth={2} />
        Reserver boken
      </Button>
    </form>
  )
}

/**
 * The collection side by side, a few titles at a time, for browsing rather
 * than scanning. The table is still the way to compare; this is the other
 * view of the same list, chosen with the switch in the page heading.
 */
export function BookCarousel({ books }: { books: BookView[] }) {
  return (
    <Carousel
      opts={{ align: "start" }}
      aria-label="Bøkene i samlingen"
      className="flex flex-col gap-4"
    >
      <CarouselContent>
        {books.map((book) => (
          <CarouselItem key={book.id} className="sm:basis-1/2 md:basis-1/3">
            <article className="flex h-full flex-col gap-4 rounded-xl bg-card p-4 inset-ring-1 inset-ring-foreground/10">
              {/* A fixed-height band, so slides line up whatever the cover's
                  proportions — and stay the same height without one. */}
              <div className="flex h-56 items-center justify-center rounded-lg bg-muted py-4">
                <CoverZoom
                  src={coverUrl(book.isbn, "L")}
                  title={book.title}
                  className="h-48 w-auto max-w-full rounded-sm object-contain"
                  fallback={
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-card">
                      <HugeiconsIcon
                        icon={book.available > 0 ? Book02Icon : BookOpen01Icon}
                        strokeWidth={2}
                        className="size-6 text-muted-foreground"
                      />
                    </div>
                  }
                />
              </div>

              <div className="flex min-w-0 flex-col items-start gap-1">
                <BookStatusBadge book={book} />
                <Link
                  href={`/boker/${book.id}`}
                  title={book.title}
                  className="mt-1 line-clamp-2 font-heading text-lg/snug font-medium hover:underline"
                >
                  {book.title}
                </Link>
                <span className="max-w-full truncate text-sm text-muted-foreground">
                  {book.author} · {book.year}
                </span>
              </div>

              <p className="mt-auto text-sm">
                <span className="font-medium tabular-nums">
                  {book.available} av {book.copies}
                </span>{" "}
                <span className="text-muted-foreground">
                  eksemplarer ledige
                </span>
              </p>

              <div className="flex flex-wrap items-start gap-2">
                <BorrowOrReserve book={book} />
                <Link
                  href={`/boker/${book.id}`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Se boken
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Link>
              </div>
            </article>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Below the slides rather than beside them: the primitive puts the
          buttons outside the carousel's edges, which here is outside the card. */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Dra sidelengs eller bruk pilene for å bla.
        </p>
        <div className="flex gap-2">
          <CarouselPrevious className="static my-0" />
          <CarouselNext className="static my-0" />
        </div>
      </div>
    </Carousel>
  )
}
