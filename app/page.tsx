import { getTranslations } from "next-intl/server";
import ScenarioPicker from "@/components/ScenarioPicker";
import { isLanguage } from "@/lib/scenarios";

// Home: value proposition + practice-language choice + scenario cards.
// The practice language lives in the URL (?lang=zh-CN) so it's shareable and survives refresh.
export default async function Home({ searchParams }: PageProps<"/">) {
  const t = await getTranslations("home");
  const { lang } = await searchParams;
  const practiceLanguage = isLanguage(lang) ? lang : "en";

  return (
    <div className="flex flex-col gap-10">
      <section className="pt-6 flex flex-col gap-4">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted leading-relaxed max-w-2xl">{t("subtitle")}</p>
      </section>
      <ScenarioPicker practiceLanguage={practiceLanguage} />
    </div>
  );
}
