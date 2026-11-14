"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { clearSessions, loadSessions, updateMissionStatus } from "@/lib/progress";
import { getScenario } from "@/lib/scenarios";
import type { PracticeSession } from "@/types";

export default function ProgressView() {
  const t = useTranslations();
  const format = useFormatter();
  // null = not loaded yet (localStorage is only available in the browser)
  const [sessions, setSessions] = useState<PracticeSession[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from localStorage after mount
    setSessions(loadSessions());
  }, []);

  if (sessions === null) return null;

  if (sessions.length === 0) {
    return <p className="text-muted">{t("progress.empty")}</p>;
  }

  const rated = sessions.filter((s) => s.confidenceBefore !== null && s.confidenceAfter !== null);
  const avgChange = rated.length
    ? rated.reduce((sum, s) => sum + (s.confidenceAfter! - s.confidenceBefore!), 0) / rated.length
    : 0;
  const tried = sessions.filter((s) => s.missionStatus === "tried").length;

  function setMission(id: string, status: PracticeSession["missionStatus"]) {
    updateMissionStatus(id, status);
    setSessions(loadSessions());
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("progress.sessions")} value={String(sessions.length)} />
        <Stat label={t("progress.avgChange")} value={`${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(1)}`} />
        <Stat label={t("progress.missionsTried")} value={`${tried}/${sessions.length}`} />
      </div>

      <ul className="flex flex-col gap-3">
        {sessions.map((s) => {
          const scenario = getScenario(s.scenarioId);
          return (
            <li key={s.id} className="rounded-2xl border border-line bg-surface p-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  {scenario ? t(`scenarios.${scenario.i18nKey}.title`) : s.scenarioId}
                  <span className="text-muted font-normal"> · {t(`common.languages.${s.practiceLanguage}`)}</span>
                </h2>
                <span className="text-xs text-muted">
                  {format.dateTime(new Date(s.startedAt), { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="text-sm text-muted">
                {t("progress.before")}: {s.confidenceBefore ?? "–"} → {t("progress.after")}: {s.confidenceAfter ?? "–"}
              </p>
              <div className="rounded-xl bg-accent-soft p-3 text-sm flex flex-col gap-2">
                <p>🎯 {s.mission}</p>
                <div className="flex items-center gap-3">
                  <span className="text-muted">{t(`progress.missionStatus.${s.missionStatus}`)}</span>
                  {s.missionStatus !== "tried" && (
                    <>
                      <button type="button" onClick={() => setMission(s.id, "tried")} className="text-accent font-medium underline">
                        {t("progress.missionTried")}
                      </button>
                      {s.missionStatus === "pending" && (
                        <button type="button" onClick={() => setMission(s.id, "skipped")} className="text-muted underline">
                          {t("progress.missionSkip")}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>{t("progress.localNote")}</span>
        <button
          type="button"
          onClick={() => {
            if (confirm(t("progress.clearConfirm"))) {
              clearSessions();
              setSessions([]);
            }
          }}
          className="underline"
        >
          {t("progress.clear")}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
