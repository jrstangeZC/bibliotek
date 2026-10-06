import Form from "next/form";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * The two ways into the global search at `/sok`. Both are GET forms, like the
 * catalogue search: the search lives in the URL, works without JavaScript and
 * comes back with the back button.
 */

/**
 * The compact field in the header, on every page but `/sok`. It has no button
 * on purpose — an exception to the search recipe in `docs/design/README.md`:
 * it only starts a search, Enter sends it, and the full recipe is on `/sok`.
 *
 * Not `required`: the browser's own bubble is in the browser's language and
 * outside the design. An empty search lands on `/sok`, which explains instead.
 */
export function HeaderSearch() {
  return (
    <Form action="/sok" role="search" className="w-full sm:w-56">
      <label htmlFor="hurtigsok" className="sr-only">
        Søk i biblioteket
      </label>
      <InputGroup>
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </InputGroupAddon>
        <InputGroupInput
          id="hurtigsok"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Søk …"
        />
      </InputGroup>
    </Form>
  );
}

/**
 * The field on `/sok` itself, for adjusting the search. Keyed on `query`, so
 * the back and forward buttons, which swap the search without remounting the
 * page, swap the text in the field too.
 */
export function SearchField({
  query,
  placeholder,
  autoFocus = false,
}: {
  query: string;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <Form key={query} action="/sok" role="search">
      <label htmlFor="sokefelt" className="sr-only">
        Søk i biblioteket
      </label>
      <InputGroup>
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </InputGroupAddon>
        <InputGroupInput
          id="sokefelt"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          defaultValue={query}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="secondary" size="sm">
            Søk
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Form>
  );
}
