import type { Metadata } from "next";
import Link from "next/link";
import { getBundles, getCategories, getTaxonomyCounts } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { BundleCard } from "@/components/commerce/BundleCard";
import { ClinicPlan, type Station } from "@/components/clinic/ClinicPlan";
import { MotionReady } from "@/components/fx/MotionLayer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Clinic setup",
  description: "Everything to equip a dental clinic — chair, handpieces, X-ray, endo, restorative and sterilisation — plus ready clinic packages.",
};

/** Stations on the plan → the category that equips each one (x/y in % of the plan). */
const STATIONS: { key: string; slug: string; title: string; text: string; x: number; y: number }[] = [
  { key: "unit", slug: "equipment", title: "Dental unit & equipment", text: "Chair, light, compressor, curing lights and devices.", x: 50, y: 52 },
  { key: "handpieces", slug: "handpieces", title: "Handpieces", text: "High- and low-speed, contra-angles, couplings.", x: 33, y: 73 },
  { key: "xray", slug: "radiology", title: "Radiology", text: "Sensors, films, holders and protection.", x: 91, y: 56 },
  { key: "endo", slug: "endodontic-supplies", title: "Endodontics", text: "Files, motors, obturation and irrigation.", x: 70, y: 33 },
  { key: "restorative", slug: "composites", title: "Restorative", text: "Composites, bonding and finishing.", x: 30, y: 17 },
  { key: "instruments", slug: "operative-instruments", title: "Instruments", text: "Operative and hand instruments for every tray.", x: 50, y: 17 },
  { key: "burs", slug: "burs", title: "Burs & polishing", text: "Diamond and carbide burs, polishing kits.", x: 32, y: 54 },
  { key: "disposables", slug: "disposables", title: "Disposables & isolation", text: "Gloves, masks, bibs, rubber dam and more.", x: 84, y: 22 },
];

export default async function ClinicSetupPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const [{ for: who }, { t, locale }] = await Promise.all([searchParams, getI18n()]);
  const audience = who === "student" || who === "dentist" ? who : undefined;
  const [bundles, categories, stats] = await Promise.all([getBundles({ kind: "clinic_setup", audience }), getCategories(), getTaxonomyCounts()]);

  const stations: Station[] = STATIONS.flatMap((s) => {
    const c = categories.find((x) => x.slug === s.slug);
    if (!c) return [];
    return [{ key: s.key, title: s.title, text: s.text, x: s.x, y: s.y, href: `/categories/${c.slug}${audience === "dentist" ? "?audience=dentist" : ""}`, count: stats.category[c.slug]?.count ?? 0 }];
  });

  const tabs = [
    { href: "/clinic-setup", label: "Everyone", on: !audience },
    { href: "/clinic-setup?for=student", label: "Graduating students", on: audience === "student" },
    { href: "/clinic-setup?for=dentist", label: "Dentists", on: audience === "dentist" },
  ];

  return (
    <>
      <section className="on-dark relative overflow-hidden bg-navy-deep text-white">
        <div aria-hidden className="mm-grid-dark absolute inset-0" />
        <div aria-hidden className="absolute -left-40 top-10 size-[40rem] rounded-full bg-[radial-gradient(circle,rgb(101_194_199/0.16),transparent_65%)]" />
        <div className="container-x relative pb-16 pt-10 lg:pb-24 lg:pt-16">
          <p className="eyebrow animate-rise">Clinic setup</p>
          <h1 className="display mt-5 max-w-5xl text-[clamp(3rem,9vw,8rem)] leading-[0.86] tracking-[-0.055em] text-white animate-rise [animation-delay:80ms]">
            Build your <span className="font-serif font-normal italic text-teal">clinic</span>, station by station.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70 animate-rise [animation-delay:160ms]">
            Whether you&apos;re graduating or opening a new room: walk the plan, open any station, or start from a ready package.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2 animate-rise [animation-delay:240ms]">
            {tabs.map((tab) => (
              <li key={tab.href}>
                <Link href={tab.href} scroll={false} aria-current={tab.on ? "page" : undefined}
                  className={cn("inline-flex h-10 items-center rounded-full px-4 text-sm transition-colors", tab.on ? "bg-teal text-navy-deep" : "border border-white/20 text-white/80 hover:border-teal hover:text-teal")}>
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-14">
            <ClinicPlan stations={stations} />
          </div>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24" aria-labelledby="packages-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="packages-title" className="display text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95]">
            Ready <span className="font-serif font-normal italic text-teal-strong">packages.</span>
          </h2>
          <p className="max-w-sm text-muted">Curated sets for a complete room — one order, everything in its place.</p>
        </div>
        {bundles.length ? (
          <ul className="grid gap-5 lg:grid-cols-2" data-stagger>
            {bundles.map((b) => <li key={b.id}><BundleCard bundle={b} t={t} locale={locale} /></li>)}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[2rem] bg-aqua p-8 sm:p-10">
            <p className="max-w-xl font-display text-xl font-semibold text-navy">
              Packages are being prepared. Tell us your room and budget — we&apos;ll put a clinic list together for you.
            </p>
            <button type="button" className="btn btn-primary" data-open-assistant>Plan it with the assistant</button>
          </div>
        )}
      </section>
      <MotionReady />
    </>
  );
}
