import { MotionReady } from "@/components/fx/MotionLayer";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSettings, getTaxonomyCounts, getYears } from "@/lib/catalog";
import { InstrumentStage } from "@/components/three/InstrumentStage";
import { Words } from "@/components/fx/Words";
import { ContactBlock } from "@/components/home/Sections";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "About",
  description: "Al Esraa Dental Store (EDS) supplies dental students and dentists across Egypt with instruments, materials and equipment.",
};

const PRINCIPLES = [
  { k: "01", title: "Precision first", text: "We stock instruments that hold an edge and a tolerance — the tools you would choose for your own hands." },
  { k: "02", title: "Organised by how you learn", text: "Five academic years, five lists. Students buy exactly what each practical asks for, nothing more." },
  { k: "03", title: "Honest stock, honest prices", text: "What you see on the site is what is on our shelves, priced the same online and in store." },
  { k: "04", title: "Delivered across Egypt", text: "From Cairo to Aswan, orders are packed carefully and shipped to every governorate." },
];

export default async function AboutPage() {
  const [{ t }, settings, years, stats] = await Promise.all([getI18n(), getSettings(), getYears(), getTaxonomyCounts()]);
  const products = Object.values(stats.category).reduce((n, s) => Math.max(n, s.count), 0);
  return (
    <>
      <section className="relative overflow-hidden bg-white pb-16 pt-16 lg:pt-24">
        <div aria-hidden className="mm-grid absolute inset-0" />
        <div className="container-x relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow mb-5">About EDS</p>
            <h1 className="display text-[clamp(3rem,7.4vw,6.6rem)] leading-[0.9]" data-split>
              <Words text="Built for the hands" accent="that build smiles." />
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted" data-rise>
              Al Esraa Dental Store began as a counter for dental students who needed the right instrument before tomorrow&apos;s practical.
              Today it supplies students in all {years.length || 5} academic years and the dentists they become — with the same care for the details.
            </p>
          </div>
          <InstrumentStage
            className="h-[22rem] sm:h-[30rem]"
            items={[
              { kind: "mirror", x: -2.2, y: 0.2, z: 0.6, rz: 0.5, rx: 0.3, scale: 1.4 },
              { kind: "explorer", x: 0.2, y: 0.0, z: 1.2, rz: -0.3, scale: 1.4 },
              { kind: "probe", x: 2.4, y: 0.2, z: 0, rz: -2.5, scale: 1.3 },
            ]}
          />
        </div>
      </section>

      <section className="bg-aqua py-20 lg:py-28">
        <div className="container-x grid gap-6 sm:grid-cols-3" data-stagger>
          {[
            { n: String(years.length || 5), l: "academic years, each with its own list" },
            { n: `${Object.keys(stats.category).length}`, l: "categories, from burs to equipment" },
            { n: `${products}+`, l: "products in our largest category" },
          ].map((s) => (
            <div key={s.l} className="border-t border-navy/15 pt-6">
              <p className="display text-[clamp(3rem,6vw,5.5rem)] leading-none">{s.n}</p>
              <p className="mt-3 max-w-[16rem] text-muted">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-24 lg:py-32">
        <h2 className="display mb-12 text-[clamp(2.2rem,4.4vw,4rem)] leading-[0.95]">
          What we <span className="font-serif font-normal italic text-teal-strong">stand for.</span>
        </h2>
        <dl className="grid gap-x-12 border-t border-line sm:grid-cols-2" data-stagger>
          {PRINCIPLES.map((p) => (
            <div key={p.k} className="flex flex-col gap-3 border-b border-line py-8">
              <span className="font-mono text-xs text-teal-strong">{p.k}</span>
              <dt className="display text-2xl">{p.title}</dt>
              <dd className="max-w-md leading-relaxed text-muted">{p.text}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/students" className="btn btn-primary btn-lg" data-magnetic>Explore Student Essentials <ArrowUpRight className="size-4" /></Link>
          <Link href="/dentists" className="btn btn-ghost btn-lg" data-magnetic>Shop Professional Supplies</Link>
        </div>
      </section>

      <ContactBlock store={settings.store} t={t} locale="en" />
      <MotionReady />
    </>
  );
}
