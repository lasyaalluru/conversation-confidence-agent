import type { ReactNode } from "react";

export function StatTile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl border border-line bg-paper p-5 shadow-soft">
      <span className="font-display text-4xl leading-none tabular-nums">{value}</span>
      <span className="mt-1 text-sm text-ink">{label}</span>
      {note && <span className="text-xs text-slate">{note}</span>}
    </div>
  );
}
