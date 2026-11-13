"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
}

const ICON = "size-4 shrink-0";

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    isActive: (p) => p === "/",
    icon: (
      <svg className={ICON} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="3" width="6" height="8" rx="1.5" />
        <rect x="11" y="3" width="6" height="5" rx="1.5" />
        <rect x="11" y="10" width="6" height="7" rx="1.5" />
        <rect x="3" y="13" width="6" height="4" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/jobs",
    label: "Jobs",
    // Covers the list, job detail pages and /jobs/new.
    isActive: (p) => p === "/jobs" || p.startsWith("/jobs/"),
    icon: (
      <svg className={ICON} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="6" width="14" height="10.5" rx="1.5" />
        <path d="M7.5 6V4.5A1.5 1.5 0 0 1 9 3h2a1.5 1.5 0 0 1 1.5 1.5V6M3 10.5h14" />
      </svg>
    ),
  },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {NAV.map((item) => {
        const active = item.isActive(pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Brand() {
  return (
    <Link href="/" className="text-sm font-semibold tracking-tight">
      Applicant Tracker
    </Link>
  );
}

/** Fixed sidebar on large screens; a top bar with a slide-in drawer below that. */
export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="-ml-1.5 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
        >
          <svg className="size-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
        <Brand />
      </div>

      {/* Backdrop for the mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-zinc-200 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </>
  );
}
