import Link from "next/link";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Crumb = { label: string; href: string };

/**
 * Where you are inside the administration: «Administrasjon › Bøker › …». The
 * parents are links, `current` is the page itself and is not. Sub-pages use this
 * instead of `AdminNav`, which only switches between the top-level views.
 */
export function AdminBreadcrumbs({
  parents,
  current,
}: {
  parents: Crumb[];
  current: string;
}) {
  const trail: Crumb[] = [{ label: "Administrasjon", href: "/admin" }, ...parents];

  return (
    <Breadcrumb aria-label="Brødsmuler" className="mb-6">
      <BreadcrumbList>
        {trail.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={crumb.href} />}>
                {crumb.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
