"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { FieldGroup } from "@/components/ui/field";

/**
 * The `FieldGroup` of a form whose uncontrolled fields take their defaults
 * from the action state — what was typed, handed back on a rejection.
 *
 * Base UI will not move a mounted field's default, so when `defaults` change
 * the group mounts afresh with them. A remount drops whatever had focus inside
 * it; the field the server rejected takes it instead, which is where the
 * reader needs to be anyway.
 */
export function FormFields({
  defaults,
  children,
}: {
  defaults: object;
  children: ReactNode;
}) {
  const key = JSON.stringify(defaults);
  const group = useRef<HTMLDivElement>(null);

  useEffect(() => {
    group.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [key]);

  return (
    <FieldGroup key={key} ref={group}>
      {children}
    </FieldGroup>
  );
}
