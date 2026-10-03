import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/types";

/** What each role is called in the interface. */
export const roleLabels: Record<Role, string> = {
  borrower: "Låner",
  librarian: "Bibliotekar",
};

/**
 * What a person is allowed to do. Quiet on purpose — a role is a fact about the
 * account, not a status that needs the accent colour.
 */
export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={className}>
      {roleLabels[role]}
    </Badge>
  );
}
