import Link from "next/link";
import { ScrollReveals } from "@/components/landing/ScrollReveals";
import { StartCta } from "@/components/landing/StartCta";
import { Logo } from "@/components/layout/Logo";
import { SculptureCanvas } from "@/components/three/SculptureCanvas";
import { buttonClass } from "@/components/ui/Button";
import { CATEGORIES, scenariosByCategory } from "@/lib/scenarios/catalog";

const GAP_LAYERS = [
  { n: "01", title: "Knowing the words", body: "You've studied for years. The vocabulary is there." },
  { n: "02", title: "Finding the words", body: "Under real-time pressure, words you know don't come fast enough." },
  { n: "03", title: "Expressing the thought", body: "Small talk, polite disagreement, ending a chat — the unwritten rules nobody taught." },
  { n: "04", title: "Speaking confidently", body: "Saying what you mean, in your own voice and your own accent." },
];

const STEPS = [
  { title: "Practice", body: "Speak out loud with an AI partner in a realistic situation — a barista, a classmate, a teammate." },
  { title: "Reflect", body: "See what went well, what to try next time, and the social convention behind the moment." },
  { title: "Improve", body: "Save natural phrases, repeat the scenario, and turn up the difficulty when you're ready." },
  { title: "Apply", body: "Take a small real-world mission into your day. Then tell us how it went." },
];

export default function LandingPage() {
  return (
    <div className="on-dark relative overflow-x-clip text-ivory">
      <SculptureCanvas />
      <ScrollReveals />

      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Logo tone="light" />
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
            <a href="#how" className="hidden rounded-full px-3 py-2 text-sm text-ivory/70 hover:text-ivory sm:inline-flex">
              How it works
            </a>
            <a href="#scenarios" className="hidden rounded-full px-3 py-2 text-sm text-ivory/70 hover:text-ivory sm:inline-flex">
              Scenarios
            </a>
            <Link href="/dashboard" className="rounded-full px-3 py-2 text-sm text-ivory/70 hover:text-ivory">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="relative z-10">
        {/* 1 · Hero */}
        <section data-cue="hero" className="relative flex min-h-[calc(100svh-5rem)] items-end pt-[34svh] md:items-center md:pt-0">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-midnight via-midnight/70 to-transparent md:hidden" />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8 md:pb-24">
            <div className="max-w-2xl">
              <p className="mb-6 text-xs uppercase tracking-[0.28em] text-champagne/80">Know the words. Find your voice.</p>
              <h1 className="font-display text-[clamp(2.6rem,7.2vw,6rem)] leading-[0.98]">
                You know English.
                <br />
                <em className="text-lavender">Now speak it</em> with confidence.
              </h1>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-ivory/72">
                Your personal AI conversation coach for real-life moments — from ordering coffee to speaking up in meetings.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <StartCta />
                <a href="#how" className={buttonClass("outline-dark", "lg")}>
                  See How It Works
                </a>
              </div>
              <p className="mt-8 text-sm text-ivory/45">Free to try · No account needed · Your accent is welcome here</p>
            </div>
          </div>
        </section>

        {/* 2 · The confidence gap */}
        <section data-cue="gap" aria-labelledby="gap-title" className="relative min-h-[130svh] py-32">
          <div className="mx-auto grid max-w-7xl px-4 sm:px-8 md:grid-cols-2">
            <div className="md:col-start-2 md:pl-12">
              <p data-reveal className="reveal text-xs uppercase tracking-[0.28em] text-sage">The confidence gap</p>
              <h2 id="gap-title" data-reveal className="reveal mt-4 font-display text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04]">
                Knowing English and speaking it comfortably are two different skills.
              </h2>
              <p data-reveal className="reveal mt-6 max-w-lg text-lg leading-relaxed text-ivory/70">
                Recognizing a word isn&apos;t the same as retrieving it mid-conversation. Nerves use up the working memory speech
                depends on — so you blank on things you know. That&apos;s not a lack of English. It&apos;s a gap you can close
                with practice.
              </p>
              <ol className="mt-12 flex flex-col gap-3">
                {GAP_LAYERS.map((l) => (
                  <li
                    key={l.n}
                    data-reveal
                    className="reveal flex gap-5 rounded-2xl border border-white/10 bg-midnight/55 p-5 backdrop-blur-md"
                  >
                    <span className="font-mono text-xs text-champagne/70">{l.n}</span>
                    <div>
                      <h3 className="font-medium">{l.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ivory/62">{l.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 3 · How it works */}
        <section id="how" data-cue="how" aria-labelledby="how-title" className="relative scroll-mt-10 py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="max-w-xl">
              <p data-reveal className="reveal text-xs uppercase tracking-[0.28em] text-lavender">How ConvoConfidence works</p>
              <h2 id="how-title" data-reveal className="reveal mt-4 font-display text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04]">
                One small loop. Repeated until it feels natural.
              </h2>
            </div>
            <ol className="mt-16 grid max-w-xl gap-4">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  data-reveal
                  className="reveal group relative flex gap-6 rounded-3xl border border-white/10 bg-midnight/55 p-6 backdrop-blur-md sm:p-8"
                >
                  <span className="font-display text-5xl leading-none text-ivory/25 transition-colors group-hover:text-lavender">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-3xl">{s.title}</h3>
                    <p className="mt-2 leading-relaxed text-ivory/65">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 · Real-world situations */}
        <section id="scenarios" data-cue="scenarios" aria-labelledby="scenarios-title" className="relative scroll-mt-10 py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p data-reveal className="reveal text-xs uppercase tracking-[0.28em] text-champagne">Real-world situations</p>
              <h2 id="scenarios-title" data-reveal className="reveal mt-4 font-display text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04]">
                Start with a coffee. Work up to the meeting.
              </h2>
              <p data-reveal className="reveal mt-5 text-lg text-ivory/65">
                A confidence ladder from low-stakes moments to high-stakes ones. Each step uses the same practice loop.
              </p>
            </div>
            <ol className="mt-16 grid gap-4 md:grid-cols-5">
              {CATEGORIES.map((c) => {
                const items = scenariosByCategory(c.id);
                const live = items.some((s) => s.status === "available");
                return (
                  <li
                    key={c.id}
                    data-reveal
                    className="reveal flex flex-col rounded-3xl border border-white/10 bg-midnight/65 p-6 backdrop-blur-md"
                  >
                    <span className="font-mono text-xs text-ivory/40">Step {c.ladderStep}</span>
                    <h3 className="mt-3 font-display text-2xl leading-tight">{c.title.replace(" Confidence", "")}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ivory/60">{c.tagline}</p>
                    <ul className="mt-5 flex flex-col gap-1.5 text-sm text-ivory/80">
                      {items.slice(0, 3).map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={`h-1.5 w-1.5 rounded-full ${s.status === "available" ? "bg-sage" : "bg-ivory/25"}`}
                          />
                          {s.title}
                        </li>
                      ))}
                    </ul>
                    <span
                      className={`mt-6 self-start rounded-full px-2.5 py-1 text-xs ${
                        live ? "bg-sage/15 text-sage" : "bg-white/8 text-ivory/50"
                      }`}
                    >
                      {live ? "Available now" : "Coming soon"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* 5 · Your confidence journey */}
        <section data-cue="journey" aria-labelledby="journey-title" className="relative py-32">
          <div className="mx-auto grid max-w-7xl px-4 sm:px-8 md:grid-cols-2">
            <div className="md:col-start-2 md:pl-12">
              <p data-reveal className="reveal text-xs uppercase tracking-[0.28em] text-sage">Your confidence journey</p>
              <h2 id="journey-title" data-reveal className="reveal mt-4 font-display text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04]">
                Adapts to your comfort — not a test score.
              </h2>
              <p data-reveal className="reveal mt-6 max-w-lg text-lg leading-relaxed text-ivory/70">
                Choose how comfortable you feel today: <em>Building Confidence</em>, <em>Finding My Flow</em> or{" "}
                <em>Expressing Myself Confidently</em>. Your partner adjusts its pace, its surprises and how much it helps. Change
                it any time.
              </p>
              <figure data-reveal className="reveal mt-10 rounded-3xl border border-white/10 bg-midnight/65 p-6 backdrop-blur-md">
                <figcaption className="flex items-center justify-between text-xs text-ivory/50">
                  <span>Self-rated confidence, before → after each session</span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5">Illustration</span>
                </figcaption>
                <svg viewBox="0 0 320 120" className="mt-4 w-full" role="img" aria-label="Illustration of a confidence line rising across sessions">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <line key={v} x1="0" x2="320" y1={120 - v * 22} y2={120 - v * 22} stroke="white" strokeOpacity="0.06" />
                  ))}
                  <path d="M10 76 C 60 72, 80 60, 110 58 S 170 40, 200 42 S 270 22, 310 20" fill="none" stroke="#BAACF7" strokeWidth="2" />
                  {[
                    [10, 76],
                    [110, 58],
                    [200, 42],
                    [310, 20],
                  ].map(([x, y]) => (
                    <circle key={x} cx={x} cy={y} r="4" fill="#0B1020" stroke="#BAACF7" strokeWidth="2" />
                  ))}
                </svg>
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-sage/15 px-2.5 py-1 text-sage">Mission tried ✓</span>
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-ivory/70">&ldquo;How about you?&rdquo; saved</span>
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* 6 · AI coaching & honest insights */}
        <section data-cue="coaching" aria-labelledby="coaching-title" className="relative py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="max-w-xl">
              <p data-reveal className="reveal text-xs uppercase tracking-[0.28em] text-lavender">Coaching &amp; insights</p>
              <h2 id="coaching-title" data-reveal className="reveal mt-4 font-display text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04]">
                Feedback on conversation — never on your accent.
              </h2>
              <div className="mt-12 grid gap-4">
                {[
                  ["Conversational moves", "Did you return the question? Handle the surprise? Close warmly? Specific, quoted from what you actually said."],
                  ["Natural alternatives", "American phrasing shown as options, not the one correct way. Keep your own style."],
                  ["Honest progress", "Your confidence ratings, sessions and missions — real data only. No mystery scores."],
                ].map(([t, b]) => (
                  <div key={t} data-reveal className="reveal rounded-3xl border border-white/10 bg-midnight/60 p-6 backdrop-blur-md">
                    <h3 className="font-medium">{t}</h3>
                    <p className="mt-1.5 leading-relaxed text-ivory/62">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7 · Final CTA */}
        <section data-cue="cta" aria-labelledby="cta-title" className="relative flex min-h-[100svh] items-end pb-24 md:items-end">
          <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-8">
            <h2 id="cta-title" data-reveal className="reveal font-display text-[clamp(2.75rem,6.5vw,5.25rem)] leading-[1]">
              Your voice deserves <em className="text-champagne">to be heard.</em>
            </h2>
            <p data-reveal className="reveal mx-auto mt-6 max-w-md text-lg text-ivory/65">
              Your first conversation takes about four minutes.
            </p>
            <div data-reveal className="reveal mt-10 flex justify-center">
              <StartCta label="Start Practicing" />
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-midnight/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-ivory/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>ConvoConfidence AI · A speaking coach, not therapy.</span>
          <span>We never store your voice recordings.</span>
        </div>
      </footer>
    </div>
  );
}
