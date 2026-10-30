"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import MobileSettingsMenu from "./mobile-settings-menu";

const navigationItems = [
  { href: "/", label: "Áttekintés" },
  { href: "/naplo", label: "Napló" },
  { href: "/beallitasok", label: "Beállítások" },
  { href: "/beallitasok/fiok", label: "Fiók" },
  { href: "/beallitasok/haztartas", label: "Háztartás" },
  { href: "/beallitasok/tagok", label: "Tagok és meghívók" },
  { href: "/beallitasok/kategoriak", label: "Kiadási kategóriák" },
] as const;

export default function AppShell({
  children,
  mobileContext,
}: {
  children: ReactNode;
  mobileContext?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside aria-label="Alkalmazás navigáció" className="app-sidebar">
        <Link aria-label="Household Finance – áttekintés" className="app-brand" href="/">
          Household Finance
        </Link>
        <nav aria-label="Fő navigáció" className="app-desktop-nav">
          {navigationItems.map((item) => (
            <Link
              aria-current={pathname === item.href ? "page" : undefined}
              className={item.href.startsWith("/beallitasok/") ? "app-desktop-nav-section" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="app-main-column">
        <header className="app-mobile-bar">
          {mobileContext ?? (
            <Link aria-label="Household Finance – áttekintés" className="app-brand" href="/">
              Household Finance
            </Link>
          )}
        </header>
        {children}
      </div>
      <MobileSettingsMenu />
    </div>
  );
}
