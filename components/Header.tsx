import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import UiLanguageSwitcher from "@/components/UiLanguageSwitcher";
import type { Language } from "@/types";

export default async function Header() {
  const t = await getTranslations("common");
  const locale = (await getLocale()) as Language;

  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          {t("appName")}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/progress" className="text-muted hover:text-foreground">
            {t("progress")}
          </Link>
          <UiLanguageSwitcher current={locale} />
        </nav>
      </div>
    </header>
  );
}
