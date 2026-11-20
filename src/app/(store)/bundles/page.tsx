import type { Metadata } from "next";
import Link from "next/link";
import { getBundles, getYears } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { BundleCard } from "@/components/commerce/BundleCard";
import { Breadcrumbs, EmptyState } from "@/components/ui/Section";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.bundle.title, description: t.bundle.text };
}

export default async function BundlesPage() {
  const { t, locale } = await getI18n();
  const [bundles, years] = await Promise.all([getBundles(), getYears()]);
  const groups = [
    ...years.map((y) => ({ key: y.slug, title: pick(locale, y.name_en, y.name_ar), items: bundles.filter((b) => b.year_slug === y.slug) })),
    { key: "other", title: t.bundle.title, items: bundles.filter((b) => !b.year_slug || !years.some((y) => y.slug === b.year_slug)) },
  ].filter((g) => g.items.length);

  return (
    <div className="container-x pb-10 pt-8">
      <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.bundle.title }]} />
      <header className="mb-12 mt-4 max-w-2xl">
        <h1 className="text-[clamp(2.2rem,5vw,3.8rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{t.bundle.title}</h1>
        <p className="mt-4 text-lg text-muted">{t.bundle.text}</p>
      </header>
      {groups.length === 0 ? (
        <EmptyState title={t.bundle.empty}>
          <Link href="/students" className="btn btn-primary btn-sm">{t.home.shopStudent}</Link>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-16">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`g-${g.key}`}>
              <h2 id={`g-${g.key}`} className="mb-6 text-2xl font-semibold">{g.title}</h2>
              <ul className="grid gap-5 lg:grid-cols-2">
                {g.items.map((b) => <li key={b.id} data-reveal><BundleCard bundle={b} t={t} locale={locale} /></li>)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
