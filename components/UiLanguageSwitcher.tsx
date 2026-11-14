"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSelector from "@/components/LanguageSelector";
import type { Language } from "@/types";

/** Switches the INTERFACE language by setting the NEXT_LOCALE cookie (read in i18n/request.ts). */
export default function UiLanguageSwitcher({ current }: { current: Language }) {
  const router = useRouter();
  const t = useTranslations("common");

  function change(lang: Language) {
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return <LanguageSelector value={current} onChange={change} label={t("interfaceLanguage")} size="sm" />;
}
