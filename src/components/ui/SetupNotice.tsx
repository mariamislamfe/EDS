import { getI18n } from "@/lib/i18n/server";

export async function SetupNotice() {
  const { t } = await getI18n();
  return (
    <div className="container-x py-24">
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-cloud p-10 text-center">
        <h1 className="text-2xl font-semibold">{t.errors.setupTitle}</h1>
        <p className="mt-3 text-muted">{t.errors.setupText}</p>
        <pre dir="ltr" className="mt-6 overflow-x-auto rounded-xl bg-white p-4 text-start text-xs text-ink">{`DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require`}</pre>
      </div>
    </div>
  );
}
