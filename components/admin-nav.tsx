"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";

const views = [
  { href: "/admin", label: "Aktive lån" },
  { href: "/admin/reservasjoner", label: "Reservasjoner" },
  { href: "/admin/boker", label: "Bøker" },
  { href: "/admin/brukere", label: "Brukere" },
  { href: "/admin/utboks", label: "Utboks" },
  { href: "/admin/innstillinger", label: "Innstillinger" },
];

/** The parts of the desk work, switched between without leaving the area. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administrasjon" className="mb-8">
      <ul className="flex flex-wrap items-center gap-1">
        {views.map((view) => {
          const current = pathname === view.href;

          return (
            <li key={view.href}>
              <Link
                href={view.href}
                aria-current={current ? "page" : undefined}
                className={buttonVariants({
                  variant: current ? "secondary" : "ghost",
                  size: "sm",
                  className: current ? undefined : "text-muted-foreground",
                })}
              >
                {view.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
