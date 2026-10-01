"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Logout02Icon,
  UserSwitchIcon,
} from "@hugeicons/core-free-icons";

import { Wordmark } from "@/components/logo";
import { RoleBadge } from "@/components/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions";
import type { Borrower } from "@/lib/types";

const navigation = [
  { href: "/", label: "Bøker", needsUser: false, librarianOnly: false },
  { href: "/mine-laan", label: "Mine lån", needsUser: true, librarianOnly: false },
  { href: "/admin", label: "Administrasjon", needsUser: true, librarianOnly: true },
];

/** A book detail page is still the "Bøker" part of the app. */
function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/boker");
  if (href === "/admin") return pathname.startsWith("/admin");
  return pathname === href;
}

/**
 * The log out form sits here, outside the menu popup. The popup unmounts the
 * instant an item is pressed, and a form torn out of the tree mid-submit never
 * completes — so the menu item points at this one with the native `form`
 * attribute instead of wrapping itself in a copy.
 */
const LOGOUT_FORM = "logout";

/**
 * `readyCount` is how many copies are held for `user` — shown beside «Mine lån»
 * so a hold is hard to miss from anywhere in the app.
 */
export function SiteHeader({
  user,
  readyCount = 0,
}: {
  user: Borrower | null;
  readyCount?: number;
}) {
  const pathname = usePathname();
  const librarian = user?.role === "librarian";

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-225 flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-3">
        <Link href="/" aria-label="Bibliotek — til boklisten">
          <Wordmark />
        </Link>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav aria-label="Hovedmeny">
            <ul className="flex flex-wrap items-center gap-1">
              {navigation
                .filter((item) => (user ? librarian || !item.librarianOnly : !item.needsUser))
                .map((item) => {
                  const current = isCurrent(item.href, pathname);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
                          className: current
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground",
                        })}
                      >
                        {item.label}
                        {item.href === "/mine-laan" && readyCount > 0 ? (
                          <Badge
                            className="ml-0.5 h-4.5 min-w-4.5 px-1 tabular-nums"
                            aria-label={`${readyCount} klar til henting`}
                          >
                            {readyCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>

          {user ? (
            <>
              <form id={LOGOUT_FORM} action={signOutAction} className="hidden" />
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  aria-label={`Innlogget som ${user.name}. Bytt bruker eller logg ut`}
                >
                  {user.name}
                  <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* A plain block, not DropdownMenuLabel — that one is a group
                      label and throws unless it sits inside a Menu.Group. */}
                  <div className="flex flex-col items-start gap-1.5 px-3 py-2.5">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                    <RoleBadge role={user.role} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/logg-inn" />}>
                    <HugeiconsIcon icon={UserSwitchIcon} strokeWidth={2} />
                    Bytt bruker
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    nativeButton
                    render={<button type="submit" form={LOGOUT_FORM} />}
                  >
                    <HugeiconsIcon icon={Logout02Icon} strokeWidth={2} />
                    Logg ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" nativeButton={false} render={<Link href="/logg-inn" />}>
              Logg inn
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
