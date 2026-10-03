import type { ReactNode } from "react";

/**
 * One label/value row in a detail view's `<dl>`. Stacked on a phone, label
 * beside value from `sm` up. Give the `<dl>` `divide-y divide-border text-sm`.
 */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
