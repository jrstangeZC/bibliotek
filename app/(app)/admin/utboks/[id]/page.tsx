import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { getOutboxMessage } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "E-post – Bibliotek",
};

export default async function OutboxMessagePage({
  params,
}: PageProps<"/admin/utboks/[id]">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="E-post" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const message = await getOutboxMessage((await params).id);
  if (!message) notFound();

  return (
    <>
      <AdminBreadcrumbs
        parents={[{ label: "Utboks", href: "/admin/utboks" }]}
        current={message.subject}
      />
      <PageHeading title={message.subject}>
        Sendt {formatDate(message.createdAt)}.
      </PageHeading>

      <Card>
        <CardHeader>
          <CardTitle>Meldingen</CardTitle>
          <CardDescription>
            Til {message.toName} &lt;{message.to}&gt;, slik den ville kommet fram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm/relaxed whitespace-pre-line">{message.body}</p>
        </CardContent>
      </Card>
    </>
  );
}
