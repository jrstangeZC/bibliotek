import { Badge } from "@/components/ui/badge";
import { formatDate, formatDays, formatKroner } from "@/lib/format";
import type { LoanView } from "@/lib/loans";

const labels = {
  active: { text: "Utlånt", variant: "secondary" },
  overdue: { text: "Forfalt", variant: "destructive" },
  returned: { text: "Levert", variant: "default" },
} as const;

/**
 * The status of a loan: a badge with the wording beside it, never colour alone.
 *
 * The wording stays short — every table showing this also has a Frist column,
 * so repeating the full date here only widens the table.
 */
export function LoanStatusCell({ loan }: { loan: LoanView }) {
  const { text, variant } = labels[loan.status];

  return (
    <div className="flex flex-col items-start gap-1.5 leading-snug">
      <Badge variant={variant}>{text}</Badge>
      <span className="text-muted-foreground">
        {loan.status === "returned" && loan.returnedAt
          ? formatDate(loan.returnedAt)
          : null}
        {loan.status === "active" ? `${formatDays(loan.daysRemaining)} igjen` : null}
        {loan.status === "overdue"
          ? `${formatDays(loan.daysOverdue)} · ${formatKroner(loan.lateFee)}`
          : null}
      </span>
    </div>
  );
}

/** The due date, with a muted «Forlenget» beneath once the loan has been renewed. */
export function LoanDueCell({ loan }: { loan: LoanView }) {
  return (
    <div className="flex flex-col leading-snug">
      {formatDate(loan.dueAt)}
      {loan.renewedAt ? <span className="text-muted-foreground">Forlenget</span> : null}
    </div>
  );
}
