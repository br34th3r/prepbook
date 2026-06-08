"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { setActiveHousehold } from "@/app/(app)/household/actions";
import type { Membership } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/recipes", label: "Recipes", icon: BookIcon },
  { href: "/plan", label: "Plan", icon: CalendarIcon },
  { href: "/shops", label: "Shops", icon: CartIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Active-household label, switching to a dropdown when in more than one. */
function HouseholdSwitcher({
  household,
  memberships,
}: {
  household: Membership;
  memberships: Membership[];
}) {
  if (memberships.length <= 1) {
    return (
      <span className="text-sm font-medium text-foreground">
        {household.name}
      </span>
    );
  }
  return (
    <form action={setActiveHousehold}>
      <select
        name="household_id"
        defaultValue={household.household_id}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-sm font-medium text-foreground"
        aria-label="Active household"
      >
        {memberships.map((m) => (
          <option key={m.household_id} value={m.household_id}>
            {m.name}
          </option>
        ))}
      </select>
    </form>
  );
}

function HouseholdLink({ pendingCount }: { pendingCount: number }) {
  return (
    <Link
      href="/household"
      className="relative text-sm text-muted hover:text-foreground"
      aria-label="Household settings"
    >
      Household
      {pendingCount > 0 && (
        <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
          {pendingCount}
        </span>
      )}
    </Link>
  );
}

export function Nav({
  email,
  household,
  memberships,
  pendingCount,
}: {
  email: string | null;
  household: Membership;
  memberships: Membership[];
  pendingCount: number;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar (always visible): brand, household switcher, account */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2">
          <Link href="/" className="mr-3 text-lg font-semibold text-brand-dark">
            Mealplan
          </Link>
          <HouseholdSwitcher household={household} memberships={memberships} />
          {/* Primary links: top bar on desktop, bottom bar on mobile */}
          <div className="ml-3 hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(pathname, link.href)
                    ? "bg-brand-soft text-brand-dark"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <HouseholdLink pendingCount={pendingCount} />
            {email && (
              <span className="hidden text-xs text-muted md:inline">
                {email}
              </span>
            )}
            <form action={logout}>
              <button className="text-sm text-muted hover:text-danger" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      {/* Mobile: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-brand-dark" : "text-muted"
              }`}
            >
              <Icon active={active} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function BookIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
      <path d="M18 17H6" />
    </svg>
  );
}
function CalendarIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function CartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
    </svg>
  );
}
