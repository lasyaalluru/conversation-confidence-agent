"use client";

import { useTranslations } from "next-intl";
import type { FeedbackItem } from "@/types";

const RATING_STYLE: Record<FeedbackItem["rating"], string> = {
  strong: "bg-accent-soft text-accent",
  developing: "bg-warn-soft text-warn",
  try_next_time: "bg-line text-muted",
};

export default function FeedbackCard({ item }: { item: FeedbackItem }) {
  const t = useTranslations("feedback");

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{item.skill}</h3>
        <span className={`text-xs rounded-full px-2 py-0.5 ${RATING_STYLE[item.rating]}`}>
          {t(`ratings.${item.rating}`)}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{item.comment}</p>
      {item.suggestedPhrase && (
        <p className="text-sm text-muted">
          {t("tryThis")}: <span className="text-foreground font-medium">“{item.suggestedPhrase}”</span>
        </p>
      )}
    </div>
  );
}
