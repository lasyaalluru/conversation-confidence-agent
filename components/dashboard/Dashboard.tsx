"use client";

import Link from "next/link";
import { useState } from "react";
import { useProgress } from "@/components/providers/ProgressProvider";
import { MissionCard } from "@/components/feedback/MissionCard";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Card, Eyebrow, Spinner } from "@/components/ui/primitives";
import { formatDuration, sessionDurationSeconds, summarize } from "@/lib/analytics/metrics";
import { sampleProgress } from "@/lib/demo/sample-progress";
import { recommend, type Recommendation } from "@/lib/recommendations/rules";
import { getComfortLevel, getScenario } from "@/lib/scenarios/catalog";
import type { ProgressSnapshot } from "@/types/domain";
import { ChartFrame, ConfidenceTrendChart, Legend, SERIES } from "./charts";
import { StatTile } from "./StatTile";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function Dashboard() {
  const progress = useProgress();
  const [preview, setPreview] = useState(false);

  if (!progress.ready) {
    return (
      <div className="flex justify-center py-24 text-slate" role="status">
        <Spinner className="h-6 w-6" />
        <span className="sr-only">Loading your dashboard</span>
      </div>
    );
  }

  const hasHistory = progress.sessions.some((s) => s.status !== "in_progress");
  const data: ProgressSnapshot = preview ? sampleProgress() : progress;

  if (!progress.profile && !preview) {
    return (
      <Card className="mx-auto flex max-w-2xl flex-col items-start gap-5 p-8 sm:p-12">
        <Eyebrow>Welcome</Eyebrow>
        <h1 className="font-display text-5xl leading-[1.02]">Let&apos;s set up your practice space.</h1>
        <p className="text-lg text-slate">A one-minute setup tells your AI partner how to pace things for you. No account needed.</p>
        <ButtonLink href="/onboarding" size="lg">
          Get started
        </ButtonLink>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {preview && (
        <div className="sticky top-20 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-champagne-ink/30 bg-champagne-soft px-5 py-3 text-sm text-champagne-ink shadow-soft" role="status">
          <span>
            <strong className="font-medium">Sample data preview.</strong> This is what your dashboard could look like after a couple of weeks — none of it is yours.
          </span>
          <Button size="sm" variant="secondary" onClick={() => setPreview(false)}>
            Exit preview
          </Button>
        </div>
      )}
      {hasHistory || preview ? <DashboardContent data={data} preview={preview} /> : <EmptyDashboard onPreview={() => setPreview(true)} data={data} />}
    </div>
  );
}

function RecommendationCard({ rec, eyebrow, primary }: { rec: Recommendation; eyebrow: string; primary?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-3xl p-6 sm:p-8 ${
        primary
          ? "on-dark bg-midnight text-ivory shadow-lift bg-[radial-gradient(80%_120%_at_100%_0%,rgb(186_172_247/0.22),transparent_60%)]"
          : "border border-line bg-paper shadow-soft"
      }`}
    >
      <p className={`text-xs uppercase tracking-[0.18em] ${primary ? "text-champagne/80" : "text-slate"}`}>{eyebrow}</p>
      <div>
        <h2 className={`font-display ${primary ? "text-4xl sm:text-5xl" : "text-3xl"} leading-tight`}>{rec.scenario.title}</h2>
        <p className={`mt-1 text-sm ${primary ? "text-ivory/60" : "text-slate"}`}>
          Level {rec.level} · {getComfortLevel(rec.level).name} · ~{rec.scenario.estimatedMinutes} min
        </p>
      </div>
      <p className={`leading-relaxed ${primary ? "text-ivory/80" : "text-slate"}`}>
        <span className="sr-only">Why: </span>
        {rec.reason}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
        <ButtonLink href={`/practice/${rec.scenario.id}?level=${rec.level}`} variant={primary ? "glow" : "primary"}>
          {primary ? "Start practice" : "Try this"}
        </ButtonLink>
        {primary && (
          <Link href={`/practice/${rec.scenario.id}`} className="text-sm text-ivory/60 hover:text-ivory">
            Choose a different level
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyDashboard({ data, onPreview }: { data: ProgressSnapshot; onPreview: () => void }) {
  const recs = recommend(data.profile, data.sessions);
  return (
    <>
      <header className="flex flex-col gap-3">
        <Eyebrow>{greeting()}</Eyebrow>
        <h1 className="font-display text-[clamp(2.6rem,5.5vw,4.25rem)] leading-[1.02]">Ready to find your voice?</h1>
        <p className="max-w-xl text-lg text-slate">
          This is your space to practice and watch your confidence grow. It fills in as you go — starting with your first conversation.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <RecommendationCard rec={recs.today} eyebrow="Your first practice" primary />
        <Card className="flex flex-col gap-3 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-slate">What you&apos;ll see here</p>
          <ul className="flex flex-col gap-2 text-slate">
            <li>Your confidence before and after each session</li>
            <li>Real-world missions and how they went</li>
            <li>Phrases you&apos;ve saved to remember</li>
          </ul>
          <Button variant="secondary" className="mt-auto self-start" onClick={onPreview}>
            Preview with sample data
          </Button>
        </Card>
      </div>
    </>
  );
}

function DashboardContent({ data, preview }: { data: ProgressSnapshot; preview: boolean }) {
  // Captured once per visit: missions assigned >30 min before this visit get a "how did it go?" check-in.
  const [visitTime] = useState(() => Date.now());
  const recs = recommend(data.profile, data.sessions);
  const s = summarize(data.sessions, data.missions, data.phrases);
  const done = data.sessions.filter((x) => x.status !== "in_progress").sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const checkin = data.missions.find((m) => m.status === "pending" && visitTime - Date.parse(m.createdAt) > 30 * 60 * 1000);
  const trend = done.map((x) => ({ label: shortDate(x.startedAt), before: x.confidenceBefore, after: x.confidenceAfter }));
  const recent = [...done].reverse().slice(0, 3);
  const change = s.avgConfidenceChange;

  return (
    <>
      <header className="flex flex-col gap-3">
        <Eyebrow>{greeting()}</Eyebrow>
        <h1 className="font-display text-[clamp(2.6rem,5.5vw,4.25rem)] leading-[1.02]">Ready to find your voice?</h1>
      </header>

      {checkin && !preview && <MissionCard mission={checkin} variant="checkin" />}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <RecommendationCard rec={recs.today} eyebrow="Today's recommended practice" primary />
        {recs.nextChallenge && <RecommendationCard rec={recs.nextChallenge} eyebrow="Next challenge" />}
      </div>

      <section aria-labelledby="summary" className="flex flex-col gap-4">
        <h2 id="summary" className="sr-only">
          Practice summary
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Sessions completed" value={s.sessionsCompleted} note={`${formatDuration(s.totalPracticeSeconds)} of practice`} />
          <StatTile label="Missions tried" value={`${s.missionsTried}/${s.missionsTotal}`} note="Self-reported" />
          <StatTile label="Phrases saved" value={s.phrasesSaved} />
          <StatTile
            label="Avg. confidence change"
            value={change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}`}
            note={s.avgConfidenceBefore !== null ? `${s.avgConfidenceBefore.toFixed(1)} → ${s.avgConfidenceAfter!.toFixed(1)} (self-rated)` : "Rate after a session"}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6 sm:p-8">
          <ChartFrame
            title="Your confidence journey"
            description="Self-rated, 1–5, before and after each session."
            legend={<Legend items={[{ label: "Before", color: SERIES.before }, { label: "After", color: SERIES.after }]} />}
            table={{
              headers: ["Session", "Date", "Before", "After"],
              rows: trend.map((t, i) => [i + 1, t.label, t.before ?? "—", t.after ?? "—"]),
            }}
          >
            {trend.length ? (
              <ConfidenceTrendChart sessions={trend} baseline={data.profile?.baselineConfidence ?? null} />
            ) : (
              <p className="text-slate">Rate your confidence after a session to start your journey line.</p>
            )}
          </ChartFrame>
        </Card>

        <Card className="flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Continue practicing</h2>
            <Link href="/progress" className="text-sm text-slate hover:text-ink">
              All history →
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{getScenario(x.scenarioId)?.title ?? x.scenarioId}</p>
                  <p className="text-xs text-slate">
                    {shortDate(x.startedAt)} · Level {x.comfortLevel} · {formatDuration(sessionDurationSeconds(x))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!preview && (
                    <Link href={`/feedback/${x.id}`} className="rounded-full px-3 py-1.5 text-sm text-slate hover:bg-ink/5 hover:text-ink">
                      Feedback
                    </Link>
                  )}
                  <Link
                    href={`/practice/${x.scenarioId}?level=${x.comfortLevel}`}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-ink"
                  >
                    Replay
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {recs.upcoming && (
            <p className="mt-auto rounded-2xl bg-ivory px-4 py-3 text-sm text-slate">
              Coming soon for your goals: <span className="text-ink">{recs.upcoming.title}</span>
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

