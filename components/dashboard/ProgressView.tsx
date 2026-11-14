"use client";

import Link from "next/link";
import { useProgress } from "@/components/providers/ProgressProvider";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Eyebrow, Spinner } from "@/components/ui/primitives";
import { activityByDay, confidenceChange, formatDuration, practiceStreak, sessionDurationSeconds, sessionsByCategory, summarize } from "@/lib/analytics/metrics";
import { SPEECH_METRICS } from "@/lib/analytics/registry";
import { getScenario } from "@/lib/scenarios/catalog";
import { ActivityChart, BeforeAfterChart, CategoryBars, ChartFrame, ConfidenceTrendChart, Legend, SERIES } from "./charts";
import { StatTile } from "./StatTile";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function ProgressView() {
  const { ready, profile, sessions, missions, phrases } = useProgress();
  if (!ready)
    return (
      <div className="flex justify-center py-24" role="status">
        <Spinner className="h-6 w-6 text-slate" />
      </div>
    );

  const done = sessions.filter((s) => s.status !== "in_progress").sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const s = summarize(sessions, missions, phrases);
  const activity = activityByDay(sessions, 28);
  const rated = done.filter((x) => x.confidenceBefore !== null && x.confidenceAfter !== null);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Eyebrow>Progress</Eyebrow>
        <h1 className="font-display text-[clamp(2.6rem,5.5vw,4rem)] leading-[1.02]">Your progress, honestly measured.</h1>
        <p className="max-w-2xl text-lg text-slate">
          Everything here comes from your own ratings, your sessions and the missions you report. No hidden scores.
        </p>
      </header>

      {!done.length ? (
        <Card className="flex flex-col items-start gap-4 p-8">
          <h2 className="font-display text-3xl">Nothing to show yet</h2>
          <p className="text-slate">Complete your first conversation and your progress will start here.</p>
          <ButtonLink href="/scenarios">Start practicing</ButtonLink>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Sessions" value={done.length} note={`${s.sessionsCompleted} completed`} />
            <StatTile label="Time practicing" value={formatDuration(s.totalPracticeSeconds)} note={`${s.totalTurns} turns spoken or typed`} />
            <StatTile label="Day streak" value={practiceStreak(sessions)} />
            <StatTile label="Missions tried" value={`${s.missionsTried}/${s.missionsTotal}`} note="Self-reported" />
          </div>

          <Card className="p-6 sm:p-8">
            <ChartFrame
              title="Confidence trend"
              description="Your self-ratings (1–5). The dashed line is your starting point from setup."
              legend={<Legend items={[{ label: "Before", color: SERIES.before }, { label: "After", color: SERIES.after }]} />}
              table={{ headers: ["Session", "Date", "Before", "After"], rows: done.map((x, i) => [i + 1, shortDate(x.startedAt), x.confidenceBefore ?? "—", x.confidenceAfter ?? "—"]) }}
            >
              <ConfidenceTrendChart
                sessions={done.map((x) => ({ label: shortDate(x.startedAt), before: x.confidenceBefore, after: x.confidenceAfter }))}
                baseline={profile?.baselineConfidence ?? null}
              />
            </ChartFrame>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6 sm:p-8">
              <ChartFrame
                title="Practice activity"
                description="Sessions per day, last 4 weeks."
                table={{ headers: ["Date", "Sessions"], rows: activity.filter((d) => d.count).map((d) => [d.date, d.count]) }}
              >
                <ActivityChart days={activity} />
              </ChartFrame>
            </Card>
            <Card className="p-6 sm:p-8">
              <ChartFrame
                title="Progress across the confidence ladder"
                description="Sessions by category."
                table={{ headers: ["Category", "Sessions"], rows: sessionsByCategory(sessions).map((r) => [r.title, r.available ? r.count : "Coming soon"]) }}
              >
                <CategoryBars rows={sessionsByCategory(sessions)} />
              </ChartFrame>
            </Card>
          </div>

          {rated.length > 0 && (
            <Card className="p-6 sm:p-8">
              <ChartFrame
                title="Before vs. after"
                description="How each session changed how you felt (most recent 8)."
                legend={<Legend items={[{ label: "Before", color: SERIES.before }, { label: "After", color: SERIES.after }]} />}
                table={{
                  headers: ["Date", "Before", "After", "Change"],
                  rows: rated.slice(-8).map((x) => [shortDate(x.startedAt), x.confidenceBefore!, x.confidenceAfter!, (confidenceChange(x)! > 0 ? "+" : "") + confidenceChange(x)]),
                }}
              >
                <BeforeAfterChart
                  rows={rated.slice(-8).map((x) => ({ label: `${shortDate(x.startedAt)} · L${x.comfortLevel}`, before: x.confidenceBefore!, after: x.confidenceAfter! }))}
                />
              </ChartFrame>
            </Card>
          )}

          <section aria-labelledby="history" className="flex flex-col gap-4">
            <h2 id="history" className="font-display text-3xl">Practice history</h2>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-slate">
                  <tr className="border-b border-line">
                    {["Date", "Scenario", "Level", "Duration", "Turns", "Confidence", ""].map((h) => (
                      <th key={h} className="px-5 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...done].reverse().map((x) => (
                    <tr key={x.id} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-3 tabular-nums">{shortDate(x.startedAt)}</td>
                      <td className="px-5 py-3">
                        {getScenario(x.scenarioId)?.title}
                        {x.mode === "demo" && <Badge tone="champagne" className="ml-2">Demo</Badge>}
                      </td>
                      <td className="px-5 py-3">{x.comfortLevel}</td>
                      <td className="px-5 py-3 tabular-nums">{formatDuration(sessionDurationSeconds(x))}</td>
                      <td className="px-5 py-3 tabular-nums">{x.userTurnCount}</td>
                      <td className="px-5 py-3 tabular-nums">
                        {x.confidenceBefore ?? "—"} → {x.confidenceAfter ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/feedback/${x.id}`} className="text-lavender-ink hover:underline">
                          Feedback
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}

      <section aria-labelledby="speech" className="flex flex-col gap-4">
        <div>
          <h2 id="speech" className="font-display text-3xl">Speech insights</h2>
          <p className="max-w-2xl text-slate">
            We&apos;ll only show speech measurements once they&apos;re reliable for every accent. Until then, nothing here is a
            score — here&apos;s what&apos;s coming and why it isn&apos;t shown yet.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {SPEECH_METRICS.map((m) => (
            <Card key={m.id} className="flex flex-col gap-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{m.name}</h3>
                <Badge tone={m.status === "collecting" ? "lavender" : "neutral"}>
                  {m.status === "collecting" ? "Collecting data" : "Not measured yet"}
                </Badge>
              </div>
              <p className="text-sm text-slate">{m.description}</p>
              <p className="text-xs text-slate/80">{m.validationNeeded}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
