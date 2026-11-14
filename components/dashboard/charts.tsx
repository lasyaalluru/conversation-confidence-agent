"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Small, dependency-free SVG charts.
 * Palette validated with the dataviz validator (light surface, all checks pass):
 *   BEFORE = #B0823F (champagne), AFTER = #5B48C2 (lavender). Single-series charts use AFTER.
 * Every chart: thin marks, recessive grid, hover tooltip, legend for ≥2 series, and a table view.
 */
export const SERIES = { before: "#B0823F", after: "#5B48C2" } as const;
const GRID = "rgb(22 26 38 / 0.07)";
const AXIS_TEXT = "#596171";

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 80), width - 80);
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lift"
      style={{ left, top: y - 10 }}
    >
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-slate" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Toggle between chart and an accessible data table. */
export function ChartFrame({
  title,
  description,
  legend,
  table,
  children,
}: {
  title: string;
  description?: string;
  legend?: ReactNode;
  table: { headers: string[]; rows: (string | number)[][] };
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <figcaption>
          <h3 className="font-medium">{title}</h3>
          {description && <p className="text-sm text-slate">{description}</p>}
        </figcaption>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="text-xs text-slate underline-offset-4 hover:text-ink hover:underline"
        >
          {showTable ? "Show chart" : "View as table"}
        </button>
      </div>
      {legend}
      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-slate">
                {table.headers.map((h) => (
                  <th key={h} className="py-2 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-line/60">
                  {r.map((c, j) => (
                    <td key={j} className="py-2 pr-4 tabular-nums">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------

export interface TrendSession {
  label: string; // e.g. "Nov 14"
  before: number | null;
  after: number | null;
}

/** Confidence trend: before & after lines per session, plus the onboarding baseline as a reference line. */
export function ConfidenceTrendChart({ sessions, baseline }: { sessions: TrendSession[]; baseline: number | null }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 220;
  const pad = { l: 28, r: 56, t: 16, b: 30 };
  const iw = Math.max(1, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const n = sessions.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - 1) / 4) * ih;

  const path = (key: "before" | "after") =>
    sessions
      .map((s, i) => (s[key] === null ? null : `${x(i)},${y(s[key]!)}`))
      .filter(Boolean)
      .map((p, i) => `${i ? "L" : "M"}${p}`)
      .join(" ");

  const lastIdx = (key: "before" | "after") => {
    for (let i = n - 1; i >= 0; i--) if (sessions[i][key] !== null) return i;
    return -1;
  };

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Line chart of self-rated confidence before and after each session">
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={pad.l + iw} y1={y(v)} y2={y(v)} stroke={GRID} />
              <text x={pad.l - 10} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>
                {v}
              </text>
            </g>
          ))}
          {baseline !== null && (
            <g>
              <line x1={pad.l} x2={pad.l + iw} y1={y(baseline)} y2={y(baseline)} stroke={AXIS_TEXT} strokeDasharray="3 4" strokeOpacity="0.6" />
              <text x={pad.l + iw + 6} y={y(baseline)} dy="0.32em" fontSize="11" fill={AXIS_TEXT}>
                Start
              </text>
            </g>
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="rgb(22 26 38 / 0.2)" />}
          {(["before", "after"] as const).map((key) => (
            <g key={key}>
              <path d={path(key)} fill="none" stroke={SERIES[key]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {sessions.map((s, i) =>
                s[key] === null ? null : (
                  <circle key={i} cx={x(i)} cy={y(s[key]!)} r={hover === i ? 5.5 : 4} fill={SERIES[key]} stroke="#FFFEFA" strokeWidth="2" />
                ),
              )}
              {lastIdx(key) >= 0 && (
                <text
                  x={x(lastIdx(key)) + 9}
                  y={y(sessions[lastIdx(key)][key]!) + (key === "after" ? -9 : 12)}
                  fontSize="11"
                  fill="#161A26"
                  fontWeight="500"
                >
                  {key === "after" ? "After" : "Before"}
                </text>
              )}
            </g>
          ))}
          {sessions.map((s, i) =>
            n <= 8 || i % Math.ceil(n / 8) === 0 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
                {s.label}
              </text>
            ) : null,
          )}
          {/* Hit targets wider than the marks */}
          {sessions.map((_, i) => (
            <rect
              key={i}
              x={x(i) - Math.max(12, iw / Math.max(1, n - 1) / 2)}
              y={pad.t}
              width={Math.max(24, iw / Math.max(1, n - 1))}
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}
      {hover !== null && sessions[hover] && (
        <Tooltip x={x(hover)} y={pad.t + 8} width={width}>
          <p className="font-medium text-ink">Session {hover + 1} · {sessions[hover].label}</p>
          <p className="text-slate">
            Before <span className="font-medium text-ink">{sessions[hover].before ?? "—"}</span> · After{" "}
            <span className="font-medium text-ink">{sessions[hover].after ?? "—"}</span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}

/** Practice activity: sessions per day (single series). */
export function ActivityChart({ days }: { days: { date: string; count: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 120;
  const pad = { l: 4, r: 4, t: 10, b: 22 };
  const max = Math.max(1, ...days.map((d) => d.count));
  const iw = Math.max(1, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const slot = iw / days.length;
  const bw = Math.max(3, slot - 2); // 2px gap between bars
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Bar chart of practice sessions per day over the last four weeks">
          <line x1={pad.l} x2={pad.l + iw} y1={pad.t + ih} y2={pad.t + ih} stroke={GRID} />
          {days.map((d, i) => {
            const h = d.count ? Math.max(4, (d.count / max) * ih) : 0;
            const bx = pad.l + i * slot + 1;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)}>
                <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" />
                {h > 0 ? (
                  <path
                    d={`M${bx},${pad.t + ih} V${pad.t + ih - h + 4} Q${bx},${pad.t + ih - h} ${bx + 4},${pad.t + ih - h} H${bx + bw - 4} Q${bx + bw},${pad.t + ih - h} ${bx + bw},${pad.t + ih - h + 4} V${pad.t + ih} Z`}
                    fill={SERIES.after}
                    opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                ) : (
                  <rect x={bx} y={pad.t + ih - 2} width={bw} height={2} rx={1} fill={GRID} />
                )}
              </g>
            );
          })}
          <text x={pad.l} y={height - 6} fontSize="11" fill={AXIS_TEXT}>
            {fmt(days[0].date)}
          </text>
          <text x={pad.l + iw} y={height - 6} fontSize="11" fill={AXIS_TEXT} textAnchor="end">
            Today
          </text>
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={pad.l + hover * slot + slot / 2} y={pad.t + 10} width={width}>
          <p className="font-medium text-ink">{fmt(days[hover].date)}</p>
          <p className="text-slate">
            {days[hover].count} session{days[hover].count === 1 ? "" : "s"}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

/** Sessions per confidence-ladder category (horizontal bars, single series). */
export function CategoryBars({ rows }: { rows: { title: string; count: number; available: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.title} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm" title={`${r.title}: ${r.count} sessions`}>
          <span className="truncate text-ink">{r.title.replace(" Confidence", "")}</span>
          <span className="relative h-2.5 rounded-full bg-ink/[0.05]">
            {r.count > 0 && (
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: SERIES.after }} />
            )}
          </span>
          <span className="w-24 text-right tabular-nums text-slate">
            {r.available ? `${r.count} session${r.count === 1 ? "" : "s"}` : "Coming soon"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Before → after per session (dumbbell). */
export function BeforeAfterChart({ rows }: { rows: { label: string; before: number; after: number }[] }) {
  const pct = (v: number) => `${((v - 1) / 4) * 100}%`;
  return (
    <div className="flex flex-col gap-1">
      <div className="ml-[6.5rem] mr-2 flex justify-between text-[11px] text-slate" aria-hidden>
        {[1, 2, 3, 4, 5].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
      <ul className="flex flex-col">
        {rows.map((r, i) => {
          const lo = Math.min(r.before, r.after);
          const hi = Math.max(r.before, r.after);
          return (
            <li
              key={i}
              className="group grid grid-cols-[6rem_1fr] items-center gap-2 rounded-lg py-2 hover:bg-ink/[0.03]"
              title={`${r.label}: before ${r.before}, after ${r.after}`}
            >
              <span className="truncate pl-1 text-sm text-slate">{r.label}</span>
              <span className="relative mr-2 h-4">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/[0.07]" />
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink/25" style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
                <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-paper" style={{ left: pct(r.before), background: SERIES.before }} />
                <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-paper" style={{ left: pct(r.after), background: SERIES.after }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
