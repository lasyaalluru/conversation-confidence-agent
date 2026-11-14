"use client";

import { useProgress } from "@/components/providers/ProgressProvider";
import { ButtonLink } from "@/components/ui/Button";

/** "Start Speaking" — goes to onboarding for new visitors, the dashboard for returning ones. */
export function StartCta({
  label = "Start Speaking",
  size = "lg",
  className = "",
}: {
  label?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const { ready, profile } = useProgress();
  const href = ready && profile?.onboardedAt ? "/dashboard" : "/onboarding";
  return (
    <ButtonLink href={href} variant="glow" size={size} className={className} data-sculpture-focus>
      {label}
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
        <path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </ButtonLink>
  );
}
