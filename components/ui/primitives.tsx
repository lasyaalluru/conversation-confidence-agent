import type { ComponentProps, ReactNode } from "react";

export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-3xl border border-line bg-paper shadow-soft ${className}`} {...props} />;
}

export function Eyebrow({ className = "", children }: { className?: string; children: ReactNode }) {
  return <p className={`text-xs font-medium uppercase tracking-[0.18em] text-slate ${className}`}>{children}</p>;
}

type Tone = "neutral" | "lavender" | "sage" | "champagne" | "danger" | "dark";
const TONES: Record<Tone, string> = {
  neutral: "bg-ink/5 text-slate",
  lavender: "bg-lavender-soft text-lavender-ink",
  sage: "bg-sage-soft text-sage-ink",
  champagne: "bg-champagne-soft text-champagne-ink",
  danger: "bg-danger-soft text-danger",
  dark: "bg-white/10 text-ivory",
};

export function Badge({ tone = "neutral", className = "", children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h2>
        {description && <p className="text-slate leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Small "Demo Mode" label. Demo content must never look like live AI. */
export function DemoBadge({ className = "", label = "Demo Mode · scripted, not live AI" }: { className?: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-champagne-ink/30 bg-champagne-soft px-2.5 py-1 text-xs font-medium text-champagne-ink ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-champagne-ink" />
      {label}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
