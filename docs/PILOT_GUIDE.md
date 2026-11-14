# Pilot guide — 5 international students (Dec 1–3)

The goal is honest evidence, not a good-looking result. Record what actually happens.

## What we're testing (from the Idea Brief)

1. Can participants complete a practice session on their own?
2. Do they understand the feedback?
3. Does their **self-rated** confidence change (before → after)?
4. Do **at least 3 of 5** attempt a real-world mission within the week?
5. Do they want to try another scenario?
6. Does the structured coaching feel different from a generic AI voice chat?
7. Is speech recognition reliable across their accents?

## Before the sessions

- [ ] Deployed URL with a live `OPENAI_API_KEY` and a spending limit set
- [ ] Tested on the device each participant will use (bring a backup laptop)
- [ ] Consent script read and agreed (below)
- [ ] Facilitator notes template ready (one per participant)
- [ ] Optional: a generic AI voice chat ready for the comparison task

### Consent script (read aloud)
> "You'll practice a short café conversation with an AI. Your voice is sent to a speech-to-text service and is not stored. The app saves your ratings, the transcript and feedback in this browser only, and you can delete everything in Settings. You can stop at any time. We'll take notes on how the app works for you — not on your English."

## During each session (~25 min)

1. Open the site. Ask them to start without guidance. *Note where they hesitate.*
2. Let them onboard and complete **Ordering Coffee** at the level they choose.
3. On the feedback page, ask: "In your own words, what is the feedback telling you?"
4. Ask them to fill in the optional "Help us improve" reflection.
5. *(Optional comparison)* 3 minutes ordering coffee with a generic AI voice chat. "What was different?"
6. Remind them about the mission. Ask them to reopen the app after trying it and mark it.

### Facilitator notes — per participant (no names in shared files; use P1–P5)

| Field | Notes |
| --- | --- |
| Device / browser | |
| Native language(s) | |
| Completed without help? | |
| Transcription errors (quote them) | |
| Confidence before → after | |
| Understood feedback? | |
| Wanted another scenario? | |
| Different from generic chat? How? | |
| Mission tried by end of week? | |

## Collecting results without exposing private data

Participants can use **Settings → Download my data** and send you the JSON file if they choose. Before sharing within the team:
- rename files to P1–P5,
- delete transcripts unless the participant explicitly agreed to share them,
- never commit participant files to GitHub.

## After the pilot

Compare against the kill criteria in `ROADMAP.md`. Report what didn't work as clearly as what did.
