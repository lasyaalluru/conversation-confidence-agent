"use client";

import { useState } from "react";
import { useProgress } from "@/components/providers/ProgressProvider";
import { Button } from "@/components/ui/Button";
import { nowIso } from "@/lib/database/store";
import type { Mission, MissionStatus } from "@/types/domain";

const STATUS_LABEL: Record<MissionStatus, string> = {
  pending: "Not started",
  tried: "I tried it",
  not_yet: "Not yet",
  try_again: "I want to try again",
};

/**
 * A real-world mission. Status is USER-REPORTED — we never claim to verify it.
 * `variant="checkin"` asks "How did it go?" (dashboard, on return).
 */
export function MissionCard({ mission, variant = "assigned" }: { mission: Mission; variant?: "assigned" | "checkin" }) {
  const { saveMission } = useProgress();
  const [reflection, setReflection] = useState(mission.reflection);
  const [editing, setEditing] = useState(false);

  const update = (patch: Partial<Mission>) => void saveMission({ ...mission, ...patch, updatedAt: nowIso() }).catch(() => {});

  return (
    <div className="relative overflow-hidden rounded-3xl border border-sage-ink/15 bg-gradient-to-br from-sage-soft to-paper p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sage-ink">
          {variant === "checkin" ? "How did your mission go?" : "Your real-world mission"}
        </p>
        {mission.status !== "pending" && (
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-sage-ink">{STATUS_LABEL[mission.status]}</span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl leading-snug">{mission.text}</p>

      {variant === "assigned" && mission.status === "pending" && (
        <p className="mt-3 text-sm text-slate">Try it in real life. Next time you open the app, we&apos;ll ask how it went.</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Mission status">
        {(["tried", "not_yet", "try_again"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={mission.status === s ? "primary" : "secondary"}
            aria-pressed={mission.status === s}
            onClick={() => {
              update({ status: s });
              setEditing(true);
            }}
          >
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {(editing || mission.reflection) && mission.status !== "pending" && (
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ reflection: reflection.trim() });
            setEditing(false);
          }}
        >
          <label htmlFor={`reflect-${mission.id}`} className="text-sm text-slate">
            Optional: how did it feel? <span className="text-slate/70">(only you can see this)</span>
          </label>
          <textarea
            id={`reflect-${mission.id}`}
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              setEditing(true);
            }}
            maxLength={500}
            rows={2}
            className="rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] focus:border-ink focus:outline-none"
            placeholder="e.g. I asked how her day was — she smiled and we chatted for a second."
          />
          {editing && (
            <Button type="submit" size="sm" variant="secondary" className="self-start">
              Save reflection
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
