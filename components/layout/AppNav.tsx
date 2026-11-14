"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProgress } from "@/components/providers/ProgressProvider";
import { Logo } from "./Logo";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z" },
  { href: "/scenarios", label: "Practice", icon: "M10 3a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-5.5 7a5.5 5.5 0 0 0 11 0M10 15.5V18" },
  { href: "/progress", label: "Progress", icon: "M3 16 8 10l3.5 3.5L17 6" },
  { href: "/phrases", label: "Phrases", icon: "M5 4h10a1 1 0 0 1 1 1v12l-6-3.5L4 17V5a1 1 0 0 1 1-1Z" },
  { href: "/settings", label: "Settings", icon: "M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-4v2m0 10v2m7-7h-2M5 10H3m11.95-4.95-1.41 1.41M6.46 13.54l-1.41 1.41m0-9.9 1.41 1.41m7.08 7.08 1.41 1.41" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const { accountEmail, ready } = useProgress();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Logo href="/dashboard" />
          <nav aria-label="App" className="hidden items-center gap-1 md:flex">
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  isActive(item.href) ? "bg-ink text-ivory" : "text-slate hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden min-w-[120px] justify-end text-xs text-slate md:flex">
            {ready && (accountEmail ? <span title={accountEmail}>Signed in</span> : <span>Guest · this device</span>)}
          </div>
        </div>
      </header>

      {/* Mobile: bottom tab bar (thumb-reachable), not a squeezed desktop nav */}
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="grid grid-cols-5">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  isActive(item.href) ? "text-lavender-ink" : "text-slate"
                }`}
              >
                <Icon d={item.icon} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
