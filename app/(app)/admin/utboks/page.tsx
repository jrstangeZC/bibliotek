import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, MailSend01Icon, MoreVerticalIcon } from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { ColumnHead, IDENTITY_CELL, RecordCell } from "@/components/record-cell";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
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
import { getOutbox } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Utboks – Bibliotek",
  description: "E-postene systemet har sendt til lånerne",
};

export default async function OutboxPage() {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Utboks" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const messages = await getOutbox();

  return (
    <>
      <PageHeading title="Utboks">
        E-postene systemet har sendt. Demoen har ingen e-posttjener, så meldingene
        havner her i stedet for i innboksen til mottakeren.
      </PageHeading>
      <AdminNav />

      {messages.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={MailSend01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen e-post sendt</EmptyTitle>
            <EmptyDescription>
              Det sendes e-post når et reservert eksemplar holdes av for noen som
              har slått på varsler. Registrer retur av en reservert bok for å se
              den første.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sendt</CardTitle>
            <CardDescription>
              Den nyeste øverst. Åpne en melding for å lese hele teksten.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">{messages.length} meldinger</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <ColumnHead className="pl-(--card-spacing)">Emne</ColumnHead>
                  <ColumnHead className="text-right">Sendt</ColumnHead>
                  <ColumnHead className="pr-(--card-spacing) text-right">
                    Handling
                  </ColumnHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}>
                      <RecordCell
                        icon={Mail01Icon}
                        name={message.subject}
                        href={`/admin/utboks/${message.id}`}
                      >
                        til {message.toName} · {message.to}
                      </RecordCell>
                    </TableCell>
                    <TableCell className="py-3 text-right tabular-nums text-muted-foreground">
                      {formatDate(message.createdAt)}
                    </TableCell>
                    <TableCell className="py-3 pr-(--card-spacing) text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Handlinger for «${message.subject}»`}
                        >
                          <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            render={<Link href={`/admin/utboks/${message.id}`} />}
                          >
                            <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />
                            Les e-posten
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
