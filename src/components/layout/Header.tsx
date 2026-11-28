import Image from "next/image";
import Link from "next/link";
import { getCategories, getSettings, getSpecialties, getTaxonomyCounts, getYears } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { HeaderActions } from "./HeaderActions";
import { MobileMenu } from "./MobileMenu";
import { MainNav } from "./MainNav";
import { HeaderShell } from "./HeaderShell";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

const emptyStats = { category: {}, specialty: {}, year: {} } as Awaited<ReturnType<typeof getTaxonomyCounts>>;

export async function Header() {
  const { locale, t } = await getI18n();
  const [years, specialties, categories, settings, stats] = await Promise.all([
    safe(getYears(), []), safe(getSpecialties(), []), safe(getCategories(), []),
    safe(getSettings(), null), safe(getTaxonomyCounts(), emptyStats),
  ]);
  const ann = settings?.announcement;
  const annText = ann?.enabled ? pick(locale, ann.text_en, ann.text_ar) : "";
  const topCats = categories.filter((c) => !c.parent_id);

  const navYears = years.map((y) => ({
    slug: y.slug, name: pick(locale, y.name_en, y.name_ar), number: y.number,
    tagline: pick(locale, y.tagline_en, y.tagline_ar), count: stats.year[y.slug]?.count ?? 0,
  }));
  const navSpecs = specialties.map((s) => ({ slug: s.slug, name: pick(locale, s.name_en, s.name_ar) }));
  const navCats = topCats.map((c) => ({
    slug: c.slug, name: pick(locale, c.name_en, c.name_ar),
    count: stats.category[c.slug]?.count ?? 0, cover: c.image_url ?? stats.category[c.slug]?.covers[0] ?? null,
  }));

  return (
    <>
      <a href="#main" className="sr-only z-[100] rounded-full bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t.nav.skip}
      </a>
      {annText && (
        <div className="bg-navy-deep text-center text-[0.8rem] text-white">
          <div className="container-x py-2">
            {ann?.href ? <Link href={ann.href} className="underline-offset-4 hover:underline">{annText}</Link> : annText}
          </div>
        </div>
      )}
      <HeaderShell>
        <div className="container-x flex h-16 items-center gap-4 lg:h-[4.75rem]">
          <MobileMenu
            t={t}
            years={navYears.map(({ slug, name }) => ({ slug, name }))}
            specialties={navSpecs}
            categories={navCats.map(({ slug, name }) => ({ slug, name }))}
          />
          <Link href="/" className="hdr-cap flex shrink-0 items-center gap-2.5 rounded-full" aria-label="EDS — Al Esraa Dental Store, home">
            <Image src="/brand/eds-mark.png" alt="" width={44} height={44} priority className="size-9 lg:size-10" />
            <span className="flex flex-col leading-none">
              <span className="display text-[1.35rem] tracking-[-0.04em]">EDS</span>
              <span className="hidden font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted sm:block">Al Esraa Dental Store</span>
            </span>
          </Link>

          <nav aria-label="Main" className="h-full lg:ms-4 xl:ms-8">
            <MainNav years={navYears} specialties={navSpecs} categories={navCats} />
          </nav>

          <HeaderActions />
        </div>
      </HeaderShell>
    </>
  );
}
