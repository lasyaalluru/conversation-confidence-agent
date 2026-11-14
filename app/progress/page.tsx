import { getTranslations } from "next-intl/server";
import ProgressView from "@/components/ProgressView";

export default async function ProgressPage() {
  const t = await getTranslations("progress");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <ProgressView />
    </div>
  );
}
