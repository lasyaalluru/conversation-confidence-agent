"use client";

import { useState } from "react";
import { useProgress } from "@/components/providers/ProgressProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Eyebrow, Spinner } from "@/components/ui/primitives";
import { speak } from "@/lib/audio/speech";
import { newId, nowIso } from "@/lib/database/store";

export default function PhrasesPage() {
  const { ready, phrases, savePhrase, deletePhrase } = useProgress();
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Eyebrow>Saved phrases</Eyebrow>
        <h1 className="font-display text-[clamp(2.6rem,5.5vw,4rem)] leading-[1.02]">Phrases worth keeping.</h1>
        <p className="max-w-2xl text-lg text-slate">
          Say each one out loud a few times. Retrieval — not re-reading — is what makes a phrase come to you in the moment.
        </p>
      </header>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const phrase = draft.trim();
          if (!phrase) return;
          void savePhrase({ id: newId(), phrase, context: "Added by you", scenarioId: null, savedAt: nowIso() }).catch(() => {});
          setDraft("");
        }}
      >
        <label htmlFor="new-phrase" className="sr-only">
          Add your own phrase
        </label>
        <input
          id="new-phrase"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={200}
          placeholder="Add your own phrase, e.g. “I see where you're coming from.”"
          className="h-12 flex-1 rounded-full border border-line-strong bg-paper px-5 focus:border-ink focus:outline-none"
        />
        <Button type="submit" disabled={!draft.trim()} className="h-12">
          Save phrase
        </Button>
      </form>

      {!ready ? (
        <Spinner className="h-6 w-6 text-slate" />
      ) : phrases.length === 0 ? (
        <Card className="flex flex-col items-start gap-4 p-8">
          <h2 className="font-display text-3xl">No saved phrases yet</h2>
          <p className="text-slate">After a conversation, tap “Save phrase” on any suggestion in your feedback to keep it here.</p>
          <ButtonLink href="/scenarios">Start a conversation</ButtonLink>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {phrases.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col gap-3 p-6">
                <p className="font-display text-2xl leading-snug">&ldquo;{p.phrase}&rdquo;</p>
                <p className="text-sm text-slate">
                  {p.context} · saved {new Date(p.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" variant="secondary" onClick={() => void speak(p.phrase, 0.92)}>
                    Listen
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deletePhrase(p.id).catch(() => {})} aria-label={`Remove “${p.phrase}”`}>
                    Remove
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-slate">Coming later: saved phrases will come back for quick spaced-repetition practice.</p>
    </div>
  );
}
