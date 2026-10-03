import Link from "next/link";
import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * A card section with nothing to list — the card stays, so the page keeps its
 * shape. Goes where the table would; give that `CardContent` its normal
 * padding while this shows (`px-0` belongs to the table alone).
 */
export function EmptySection({
  icon,
  title,
  action,
  children,
}: {
  icon: IconSvgElement;
  title: string;
  /** Where to go next. */
  action: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <Empty className="border bg-card py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={icon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href={action.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {action.label}
        </Link>
      </EmptyContent>
    </Empty>
  );
}
