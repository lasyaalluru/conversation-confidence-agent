import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLanguage } from "@/lib/scenarios";

/**
 * Interface language (UI) config for next-intl.
 *
 * We don't put the locale in the URL. Instead the LanguageSelector component
 * writes a `NEXT_LOCALE` cookie and refreshes the page.
 *
 * Practice language is separate — it's passed as `?lang=` on the practice page.
 */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value;
  const locale = isLanguage(cookieValue) ? cookieValue : "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
