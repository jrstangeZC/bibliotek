import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookmarkCheck01Icon } from "@hugeicons/core-free-icons";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import type { ReservationView } from "@/lib/loans";

/**
 * Tells a borrower, on every screen, that a copy is waiting for them. A hold
 * runs out after a week, so this cannot wait for them to open «Mine lån».
 *
 * `role="status"`, not the alert default: it is standing news, and a screen
 * reader should not interrupt with it on every page.
 */
export function HoldReadyBanner({ holds }: { holds: ReservationView[] }) {
  if (holds.length === 0) return null;

  // Sorted soonest first, and a ready hold always has a deadline.
  const [first] = holds;
  const deadline = first.deadline ? formatDate(first.deadline) : "";
  const title =
    holds.length === 1
      ? "Du har en bok klar til henting"
      : `Du har ${holds.length} bøker klare til henting`;

  return (
    <Alert role="status" className="mb-8">
      <HugeiconsIcon icon={BookmarkCheck01Icon} strokeWidth={2} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>
          {holds.length === 1
            ? `«${first.book?.title ?? "Ukjent tittel"}» er holdt av til deg til ${deadline}.`
            : `Den første må hentes innen ${deadline}.`}{" "}
          <Link href="/mine-laan" className="font-medium underline underline-offset-4">
            Se Mine lån
          </Link>
        </p>
      </AlertDescription>
    </Alert>
  );
}
