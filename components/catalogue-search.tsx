import Form from "next/form";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { EmptySection } from "@/components/empty-section";
import { CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * The search field over a list of titles, and the line saying how many matched,
 * as the card section above the table.
 * A GET form: the search lives in the URL, so it survives a reload and comes
 * back with the back button from wherever a row leads.
 */
export function CatalogueSearch({
  action,
  inputId,
  label,
  query,
  matches,
  total,
}: {
  /** The page the list is on; also where «Vis alle» goes. */
  action: string;
  inputId: string;
  /** Read out for the field, which has no visible label. */
  label: string;
  query: string;
  matches: number;
  total: number;
}) {
  return (
    <CardContent className="flex flex-col gap-3">
      <Form action={action} role="search">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <InputGroup>
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </InputGroupAddon>
          <InputGroupInput
            id={inputId}
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Tittel, forfatter, år eller ISBN"
            autoComplete="off"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit" variant="secondary" size="sm">
              Søk
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Form>
      {query && matches > 0 ? (
        <p className="text-sm text-muted-foreground">
          {matches} av {total} titler passer med «{query}».{" "}
          <Link
            href={action}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Vis alle
          </Link>
        </p>
      ) : null}
    </CardContent>
  );
}

/** What a search that matched nothing shows in place of the table. */
export function NoCatalogueMatches({ query, href }: { query: string; href: string }) {
  return (
    <EmptySection
      icon={Search01Icon}
      title="Ingen treff"
      action={{ label: "Vis alle bøker", href }}
    >
      Ingen titler passer med «{query}». Prøv et kortere ord, bare etternavnet til
      forfatteren eller sifrene i ISBN-en.
    </EmptySection>
  );
}
