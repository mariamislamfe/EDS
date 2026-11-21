import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { TrackForm } from "./TrackForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.track.title, robots: { index: false } };
}

export default async function TrackPage() {
  const { t } = await getI18n();
  return (
    <div className="container-x pb-16 pt-10">
      <h1 className="mb-3 text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{t.track.title}</h1>
      <p className="mb-8 max-w-xl text-muted">{t.track.text}</p>
      <TrackForm />
    </div>
  );
}
