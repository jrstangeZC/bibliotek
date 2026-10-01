import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { ReservationView } from "@/lib/loans";

/**
 * Where a reservation stands: a badge with the wording beside it, never colour
 * alone. Waiting shows the place in the queue; ready shows the last day to
 * collect.
 */
export function ReservationStatusCell({ reservation }: { reservation: ReservationView }) {
  return (
    <div className="flex flex-col items-start gap-1.5 leading-snug">
      {reservation.status === "ready" ? (
        <Badge>Klar til henting</Badge>
      ) : (
        <Badge variant="secondary">Venter</Badge>
      )}
      <span className="text-muted-foreground tabular-nums">
        {reservation.status === "ready" && reservation.deadline
          ? `Hent innen ${formatDate(reservation.deadline)}`
          : `Nr. ${reservation.position} i køen`}
      </span>
    </div>
  );
}
