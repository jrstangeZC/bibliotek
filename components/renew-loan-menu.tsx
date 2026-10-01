import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, MoreVerticalIcon } from "@hugeicons/core-free-icons";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renewLoanAction } from "@/lib/actions";
import type { LoanView } from "@/lib/loans";
import { RENEWAL_DAYS, type RenewalBlock } from "@/lib/renewals";

/** Said inside the disabled item, so the menu never leaves you guessing why. */
const reasons: Record<RenewalBlock, string> = {
  "already-returned": "Boken er levert",
  "already-renewed": "Allerede forlenget én gang",
  overdue: "Fristen er passert",
};

/**
 * The row action on a borrower's own loan. A returned loan has nothing left to
 * do, so it gets no menu at all; any other loan always gets one, and when
 * renewal is not possible the item is disabled with the reason beside it.
 */
export function RenewLoanMenu({ loan }: { loan: LoanView }) {
  if (loan.status === "returned") return null;

  const formId = `forleng-${loan.id}`;
  const label = `Forleng med ${RENEWAL_DAYS} dager`;

  return (
    <>
      {/* Outside the popup, for the same reason as the return form on the
          admin screen: the menu closes the instant an item is pressed. */}
      <form id={formId} action={renewLoanAction} className="hidden">
        <input type="hidden" name="loanId" value={loan.id} />
      </form>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          aria-label={`Handlinger for «${loan.book?.title ?? "ukjent tittel"}»`}
        >
          <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {loan.renewalBlock ? (
            // The item dims itself when disabled. Only the action should fade:
            // the reason is the one thing in here the reader has to be able to read.
            <DropdownMenuItem disabled className="data-disabled:opacity-100">
              <HugeiconsIcon
                icon={Calendar03Icon}
                strokeWidth={2}
                className="opacity-50"
              />
              <span className="flex flex-col leading-snug">
                <span className="opacity-50">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {reasons[loan.renewalBlock]}
                </span>
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              nativeButton
              render={<button type="submit" form={formId} />}
            >
              <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />
              {label}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
