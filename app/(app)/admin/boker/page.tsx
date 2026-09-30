import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  Book02Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  MoreVerticalIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { ColumnHead, IDENTITY_CELL, RecordCell } from "@/components/record-cell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { describeError } from "@/lib/errors";
import { listBooks } from "@/lib/loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalogen – Bibliotek",
  description: "Opprett, rediger og slett titler i katalogen",
};

const NewBookLink = ({ className }: { className?: string }) => (
  <Link href="/admin/boker/ny" className={buttonVariants({ size: "sm", className })}>
    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
    Ny bok
  </Link>
);

export default async function AdminBooksPage({
  searchParams,
}: PageProps<"/admin/boker">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Katalogen" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const [books, { feil, ny, lagret, slettet }] = await Promise.all([
    listBooks(),
    searchParams,
  ]);
  const error = describeError(feil);
  const created = typeof ny === "string" ? books.find((book) => book.id === ny) : null;
  const saved = typeof lagret === "string" ? books.find((book) => book.id === lagret) : null;

  return (
    <>
      <PageHeading title="Katalogen">
        Titlene slik lånerne ser dem. Legg til nye bøker, rett opp opplysninger
        og ta ut bøker som ikke lenger er i samlingen.
      </PageHeading>
      <AdminNav />

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      {created ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>«{created.title}» er lagt til</AlertTitle>
          <AlertDescription>
            Boken står i katalogen og kan lånes ut med én gang.
          </AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Endringene i «{saved.title}» er lagret</AlertTitle>
          <AlertDescription>
            Katalogen viser de nye opplysningene overalt.
          </AlertDescription>
        </Alert>
      ) : null}

      {slettet ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Boken er slettet</AlertTitle>
          <AlertDescription>
            Tittelen er tatt ut av katalogen. Gamle lån av den står igjen i
            historikken som «Ukjent tittel».
          </AlertDescription>
        </Alert>
      ) : null}

      {books.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Book02Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen bøker i katalogen</EmptyTitle>
            <EmptyDescription>
              Samlingen er tom. Legg inn den første tittelen, så kan den lånes ut.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewBookLink />
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alle titler</CardTitle>
            <CardDescription>
              {books.length} titler, sortert slik de ble lagt inn.
            </CardDescription>
            <CardAction>
              <NewBookLink />
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                  <ColumnHead>ISBN</ColumnHead>
                  <ColumnHead className="text-right">Eksemplarer</ColumnHead>
                  <ColumnHead className="pr-(--card-spacing) text-right">
                    Handling
                  </ColumnHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell
                      className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                    >
                      <RecordCell
                        icon={Book02Icon}
                        name={book.title}
                        href={`/admin/boker/${book.id}`}
                      >
                        {book.author} · {book.year}
                      </RecordCell>
                    </TableCell>
                    <TableCell className="py-3 tabular-nums text-muted-foreground">
                      {book.isbn}
                    </TableCell>
                    <TableCell className="py-3 text-right tabular-nums">
                      <span className="font-medium">{book.copies}</span>
                      {book.onLoan > 0 ? (
                        <Badge variant="secondary" className="ml-2">
                          {book.onLoan} ute
                        </Badge>
                      ) : null}
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
                          <DropdownMenuItem
                            render={<Link href={`/admin/boker/${book.id}`} />}
                          >
                            <HugeiconsIcon
                              icon={PencilEdit01Icon}
                              strokeWidth={2}
                            />
                            Rediger
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            render={<Link href={`/boker/${book.id}`} />}
                          >
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              strokeWidth={2}
                            />
                            Vis i katalogen
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            render={<Link href={`/admin/boker/${book.id}/slett`} />}
                          >
                            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                            Slett …
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
      )}
    </>
  );
}
