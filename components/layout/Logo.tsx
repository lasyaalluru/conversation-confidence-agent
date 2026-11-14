import Link from "next/link";

/** Wordmark + a small mark echoing the sculpture (ring around a core). */
export function Logo({ tone = "dark", href = "/" }: { tone?: "dark" | "light"; href?: string }) {
  const ink = tone === "light" ? "text-ivory" : "text-ink";
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${ink}`} aria-label="ConvoConfidence AI home">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <defs>
          <radialGradient id="logo-core" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="55%" stopColor="#E9D6B8" />
            <stop offset="100%" stopColor="#BAACF7" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="16" rx="13.5" ry="6" fill="none" stroke="#E9D6B8" strokeWidth="1.4" transform="rotate(-18 16 16)" />
        <ellipse cx="16" cy="16" rx="11" ry="11" fill="none" stroke="#BAACF7" strokeWidth="1.4" opacity="0.9" />
        <circle cx="16" cy="16" r="4.6" fill="url(#logo-core)" />
      </svg>
      <span className="text-[17px] font-medium tracking-tight">
        ConvoConfidence<span className="text-slate"> AI</span>
      </span>
    </Link>
  );
}
