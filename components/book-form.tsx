"use client";

import Link from "next/link";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { buttonVariants, Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createBookAction, updateBookAction } from "@/lib/actions";
import { emptyBookDraft, MAX_COPIES, toDraft, type BookField } from "@/lib/books";
import { emptyBookFormState } from "@/lib/forms";
import type { Book } from "@/lib/types";

/**
 * One form for both directions: with a `book` it edits that title, without it
 * it adds a new one. On rejection the action hands back which field was wrong
 * and what was typed, so nothing is retyped.
 *
 * `onLoan` is how many copies are out right now — the floor for the stock count,
 * which the action enforces and the form only explains.
 */
export function BookForm({ book, onLoan = 0 }: { book?: Book; onLoan?: number }) {
  const [state, action, pending] = useActionState(
    book ? updateBookAction : createBookAction,
    emptyBookFormState
  );
  const invalid = state.error?.field;
  const values = state.values ?? (book ? toDraft(book) : emptyBookDraft);

  /** Props shared by every field: value, and the two ways an error is marked. */
  function field(name: BookField) {
    return {
      id: `book-${name}`,
      name,
      defaultValue: values[name],
      "aria-invalid": invalid === name || undefined,
    };
  }

  function error(name: BookField) {
    return invalid === name ? <FieldError>{state.error?.message}</FieldError> : null;
  }

  return (
    // noValidate: the server checks every field and answers in Norwegian, in
    // the same place as every other message. The browser's own bubbles would
    // speak the browser's language instead.
    <form action={action} noValidate>
      {book ? <input type="hidden" name="id" value={book.id} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>{book ? "Katalogopplysninger" : "Ny bok"}</CardTitle>
          <CardDescription>
            {book
              ? "Oppdater opplysningene om tittelen i katalogen."
              : "Legg en tittel inn i katalogen. Den kan lånes ut med én gang."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={invalid === "title" ? "true" : undefined}>
              <FieldLabel htmlFor="book-title">Tittel</FieldLabel>
              <Input {...field("title")} autoComplete="off" />
              {error("title")}
            </Field>

            <Field data-invalid={invalid === "author" ? "true" : undefined}>
              <FieldLabel htmlFor="book-author">Forfatter</FieldLabel>
              <Input {...field("author")} placeholder="Fornavn Etternavn" autoComplete="off" />
              {error("author")}
            </Field>

            <Field data-invalid={invalid === "isbn" ? "true" : undefined}>
              <FieldLabel htmlFor="book-isbn">ISBN</FieldLabel>
              <Input
                {...field("isbn")}
                placeholder="978-82-05-39001-4"
                autoComplete="off"
                className="tabular-nums sm:max-w-xs"
              />
              {invalid === "isbn" ? (
                <FieldError>{state.error?.message}</FieldError>
              ) : (
                <FieldDescription>
                  10 eller 13 sifre. Må være unikt i katalogen.
                </FieldDescription>
              )}
            </Field>

            <div className="grid gap-7 sm:grid-cols-2">
              <Field data-invalid={invalid === "year" ? "true" : undefined}>
                <FieldLabel htmlFor="book-year">Utgivelsesår</FieldLabel>
                <Input
                  {...field("year")}
                  type="number"
                  inputMode="numeric"
                  placeholder="1890"
                  className="tabular-nums"
                />
                {error("year")}
              </Field>

              <Field data-invalid={invalid === "copies" ? "true" : undefined}>
                <FieldLabel htmlFor="book-copies">Eksemplarer</FieldLabel>
                <Input
                  {...field("copies")}
                  type="number"
                  inputMode="numeric"
                  min={Math.max(1, onLoan)}
                  max={MAX_COPIES}
                  className="tabular-nums"
                />
                {invalid === "copies" ? (
                  <FieldError>{state.error?.message}</FieldError>
                ) : (
                  <FieldDescription>
                    {onLoan > 0
                      ? `Minst ${onLoan}, så mange er ute på lån nå.`
                      : "Hvor mange som står i hyllen totalt."}
                  </FieldDescription>
                )}
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="gap-3">
          <Button type="submit" disabled={pending}>
            <HugeiconsIcon icon={book ? Tick02Icon : Add01Icon} strokeWidth={2} />
            {pending ? "Lagrer …" : book ? "Lagre endringer" : "Legg til bok"}
          </Button>
          <Link href="/admin/boker" className={buttonVariants({ variant: "outline" })}>
            Avbryt
          </Link>
        </CardFooter>
      </Card>
    </form>
  );
}
