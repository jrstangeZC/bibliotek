import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Logout02Icon,
  UserIcon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons";

import { RecordCell } from "@/components/record-cell";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInAction, signOutAction } from "@/lib/actions";
import { getCurrentBorrower } from "@/lib/auth";
import { getBorrowers } from "@/lib/db";
import { describeError } from "@/lib/errors";
import type { Borrower } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Logg inn – Bibliotek",
  description: "Velg rollen du vil bruke systemet som",
};

/** One of the two doors into the demo. */
type QuickPick = {
  person: Borrower;
  title: string;
  label: string;
  icon: IconSvgElement;
  description: string;
  variant: "default" | "outline";
};

export default async function SignInPage({ searchParams }: PageProps<"/logg-inn">) {
  const [people, current, { feil }] = await Promise.all([
    getBorrowers(),
    getCurrentBorrower(),
    searchParams,
  ]);
  const error = describeError(feil);

  // Pinned to whoever holds the role first, so the two buttons always lead
  // somewhere even after the register has been added to.
  const firstBorrower = people.find((person) => person.role === "borrower");
  const firstLibrarian = people.find((person) => person.role === "librarian");

  const quickPicks: QuickPick[] = [];

  if (firstBorrower) {
    quickPicks.push({
      person: firstBorrower,
      title: "Låner",
      label: "Logg inn som låner",
      icon: UserIcon,
      description:
        "Lån bøker fra samlingen, og følg med på egne frister og gebyrer.",
      variant: "default",
    });
  }

  if (firstLibrarian) {
    quickPicks.push({
      person: firstLibrarian,
      title: "Bibliotekar",
      label: "Logg inn som bibliotekar",
      icon: UserShield01Icon,
      description:
        "Alt en låner kan, og i tillegg skranken: se alle aktive lån og registrer retur.",
      variant: "outline",
    });
  }

  return (
    <>
      <PageHeading title="Logg inn">
        Demoen har ingen passord. Velg rollen du vil se systemet gjennom — du
        kan bytte når som helst.
      </PageHeading>

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quickPicks.map((pick) => (
          <Card key={pick.person.id}>
            <CardHeader>
              <CardTitle>{pick.title}</CardTitle>
              <CardDescription>{pick.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <RecordCell icon={pick.icon} name={pick.person.name}>
                {pick.person.email}
              </RecordCell>
              {pick.person.id === current?.id ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Dette er deg akkurat nå.
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="mt-auto">
              <form action={signInAction}>
                <input type="hidden" name="borrowerId" value={pick.person.id} />
                <Button type="submit" variant={pick.variant}>
                  {pick.label}
                </Button>
              </form>
            </CardFooter>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Gjest</CardTitle>
            <CardDescription>
              Bla i samlingen og se hva som er ledig uten å logge inn. For å
              låne eller reservere må du velge en av rollene.
            </CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto">
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Se samlingen
            </Button>
          </CardFooter>
        </Card>
      </div>

      {current ? (
        <form action={signOutAction} className="mt-8">
          <Button type="submit" variant="ghost" size="sm">
            <HugeiconsIcon icon={Logout02Icon} strokeWidth={2} />
            Logg ut av {current.name}
          </Button>
        </form>
      ) : null}
    </>
  );
}
