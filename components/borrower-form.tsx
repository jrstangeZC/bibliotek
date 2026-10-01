"use client";

import Link from "next/link";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  registerBorrowerAction,
  updateBorrowerAction,
  updateOwnProfileAction,
} from "@/lib/actions";
import { emptyBorrowerDraft, toBorrowerDraft } from "@/lib/borrowers";
import { emptyBorrowerFormState } from "@/lib/forms";
import type { Borrower } from "@/lib/types";

/**
 * - `create`: the desk signs a new person up.
 * - `edit`: the desk changes anyone's entry, role included.
 * - `self`: a person changes their own — everything but the role.
 */
export type BorrowerFormMode = "create" | "edit" | "self";

const actions = {
  create: registerBorrowerAction,
  edit: updateBorrowerAction,
  self: updateOwnProfileAction,
};

const copy: Record<BorrowerFormMode, { title: string; description: string; submit: string }> = {
  create: {
    title: "Ny bruker",
    description:
      "Registrer en person i brukerregisteret. De kan låne bøker med én gang, og dukker opp i listen over hvem du kan bruke systemet som.",
    submit: "Registrer bruker",
  },
  edit: {
    title: "Opplysninger",
    description:
      "Endre hvem personen er, hva de har lov til, og om de får e-post når en reservert bok er klar.",
    submit: "Lagre",
  },
  self: {
    title: "Opplysningene dine",
    description:
      "Navnet og adressen biblioteket bruker om deg, og om du vil ha e-post når en bok du har reservert er klar.",
    submit: "Lagre",
  },
};

/**
 * One form for a person's entry, in all three places it is filled in. On
 * rejection the action hands back which field was wrong and what was typed, so
 * nothing is retyped.
 */
export function BorrowerForm({
  mode,
  borrower,
}: {
  mode: BorrowerFormMode;
  /** The entry being changed; omitted when enrolling. */
  borrower?: Borrower;
}) {
  const [state, action, pending] = useActionState(actions[mode], emptyBorrowerFormState);
  const invalid = state.error?.field;
  const values = state.values ?? (borrower ? toBorrowerDraft(borrower) : emptyBorrowerDraft);
  const text = copy[mode];

  return (
    // noValidate: the server checks every field and answers in Norwegian, in
    // the same place as every other message.
    <form action={action} noValidate>
      {mode === "edit" && borrower ? (
        <input type="hidden" name="id" value={borrower.id} />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-7 sm:grid-cols-2">
              <Field data-invalid={invalid === "name" ? "true" : undefined}>
                <FieldLabel htmlFor="borrower-name">Navn</FieldLabel>
                <Input
                  id="borrower-name"
                  name="name"
                  defaultValue={values.name}
                  placeholder="Fornavn Etternavn"
                  aria-invalid={invalid === "name" || undefined}
                  autoComplete={mode === "self" ? "name" : "off"}
                />
                {invalid === "name" ? <FieldError>{state.error?.message}</FieldError> : null}
              </Field>

              <Field data-invalid={invalid === "email" ? "true" : undefined}>
                <FieldLabel htmlFor="borrower-email">E-post</FieldLabel>
                <Input
                  id="borrower-email"
                  name="email"
                  type="email"
                  defaultValue={values.email}
                  placeholder="navn@example.no"
                  aria-invalid={invalid === "email" || undefined}
                  autoComplete={mode === "self" ? "email" : "off"}
                />
                {invalid === "email" ? (
                  <FieldError>{state.error?.message}</FieldError>
                ) : (
                  <FieldDescription>
                    Varsler sendes hit. Må være unik i registeret.
                  </FieldDescription>
                )}
              </Field>
            </div>

            {mode === "self" ? null : (
              <Field
                className="sm:max-w-xs"
                data-invalid={invalid === "role" ? "true" : undefined}
              >
                <FieldLabel htmlFor="borrower-role">Rolle</FieldLabel>
                <Select name="role" defaultValue={values.role}>
                  <SelectTrigger
                    id="borrower-role"
                    className="w-full"
                    aria-invalid={invalid === "role" || undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrower">Låner</SelectItem>
                    <SelectItem value="librarian">Bibliotekar</SelectItem>
                  </SelectContent>
                </Select>
                {invalid === "role" ? (
                  <FieldError>{state.error?.message}</FieldError>
                ) : (
                  <FieldDescription>
                    Bibliotekarer ser administrasjonen og kan registrere retur.
                  </FieldDescription>
                )}
              </Field>
            )}

            <Field orientation="horizontal">
              <Checkbox
                id="borrower-notify"
                name="notifyByEmail"
                defaultChecked={values.notifyByEmail}
              />
              <FieldContent>
                <FieldLabel htmlFor="borrower-notify">
                  Send e-post når en reservert bok er klar
                </FieldLabel>
                <FieldDescription>
                  {mode === "self"
                    ? "Du ser det uansett på Mine lån, men med e-post går du ikke glipp av fristen."
                    : "Personen ser det uansett på Mine lån. E-posten gjør det vanskeligere å gå glipp av fristen."}
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="gap-3">
          <Button type="submit" disabled={pending}>
            <HugeiconsIcon icon={mode === "create" ? UserAdd01Icon : Tick02Icon} strokeWidth={2} />
            {pending ? "Lagrer …" : text.submit}
          </Button>
          <Link
            href={mode === "self" ? "/mine-laan" : "/admin/brukere"}
            className={buttonVariants({ variant: "outline" })}
          >
            Avbryt
          </Link>
        </CardFooter>
      </Card>
    </form>
  );
}
