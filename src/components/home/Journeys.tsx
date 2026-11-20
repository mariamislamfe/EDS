import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/types";
import { pick } from "@/lib/i18n";
import { InstrumentStage } from "@/components/three/InstrumentStage";
import { Words } from "@/components/fx/Words";
import { Exhibits } from "./Exhibits";

type Spec = { slug: string; name: string; count: number };

/**
 * Two journeys, two art directions:
 *  Students — bright, aqua, an exhibition of real kit items on the wall.
 *  Dentists — deep navy, rim-lit steel, a clinical index of specialties.
 */
export function Journeys({ studentProducts, specialties, yearsCount }: { studentProducts: CatalogProduct[]; specialties: Spec[]; yearsCount: number }) {
  const exhibits = studentProducts.filter((p) => p.image_url).slice(0, 10);
  return (
    <>
      {/* ---------------- Students ---------------- */}
      <section className="relative overflow-hidden bg-aqua" aria-labelledby="j-students">
        <div aria-hidden className="mm-grid absolute inset-0 opacity-60" />
        <div className="relative pt-24 lg:pt-32">
          <div className="container-x flex items-end justify-between gap-6">
            <p className="eyebrow">Journey 01 — For dental students</p>
            <p className="hidden font-mono text-xs text-muted sm:block">{yearsCount} academic years · one list at a time</p>
          </div>
          <h2 id="j-students" className="display relative mt-4 whitespace-nowrap text-[clamp(5.5rem,19vw,19rem)] leading-[0.82] tracking-[-0.06em]" data-drift="-12">
            <span className="block pl-[4vw]">Students<span className="font-serif font-normal italic text-teal-strong">.</span></span>
          </h2>
          {/* instruments float over the word */}
          <InstrumentStage
            className="absolute inset-x-0 top-[3.5rem] h-[clamp(18rem,40vw,34rem)] lg:top-[4rem]"
            items={[
              { kind: "tweezers", x: 2.6, y: 0.2, z: 1, rz: -0.9, rx: 0.3, scale: 1.05 },
              { kind: "mirror", x: -2.8, y: 0.4, z: 0.5, rz: 0.75, rx: 0.2, scale: 1.05 },
              { kind: "carver", x: 0.4, y: -0.3, z: 1.6, rz: -1.35, rx: 0.4, scale: 1.1 },
              { kind: "explorer", x: 4.3, y: -0.6, z: -0.5, rz: 0.5, scale: 0.95 },
            ]}
          />
        </div>

        <div className="container-x relative grid gap-14 pb-24 pt-14 lg:grid-cols-[0.9fr_1.6fr] lg:gap-20 lg:pb-32 lg:pt-20">
          <div className="flex flex-col gap-6">
            <h3 className="display text-[clamp(1.9rem,3.2vw,2.9rem)] leading-[1.02]" data-split>
              <Words text="Your year's list," accent="already curated." />
            </h3>
            <p className="max-w-md text-lg leading-relaxed text-muted" data-rise>
              From the first wax-up to final-year clinics: every instrument your curriculum asks for, organised by year, packed into ready-made kits.
            </p>
            <ul className="grid max-w-md grid-cols-3 border-y border-navy/10 py-5 font-mono text-xs text-muted" data-stagger>
              <li><span className="display block font-sans text-3xl text-navy-deep">{yearsCount}</span>academic years</li>
              <li><span className="display block font-sans text-3xl text-navy-deep">1</span>checklist each</li>
              <li><span className="display block font-sans text-3xl text-navy-deep">∞</span>fewer trips</li>
            </ul>
            <Link href="/students" className="btn btn-primary btn-lg w-fit" data-magnetic>
              Explore Student Essentials <ArrowUpRight className="size-4" />
            </Link>
          </div>

          {/* exhibition wall: real catalogue photography */}
          <Exhibits items={exhibits.map((p) => ({ slug: p.slug, name: pick("en", p.name_en, p.name_ar), image: p.image_url!, price: p.price }))} />
        </div>
      </section>

      {/* ---------------- Dentists ---------------- */}
      <section className="on-dark relative overflow-hidden bg-navy-deep text-white" aria-labelledby="j-dentists">
        <div aria-hidden className="mm-grid-dark absolute inset-0" />
        <div aria-hidden className="absolute -right-40 top-20 size-[42rem] rounded-full bg-[radial-gradient(circle,rgb(101_194_199/0.18),transparent_65%)]" />
        <div className="relative pt-24 lg:pt-32">
          <div className="container-x flex items-end justify-between gap-6">
            <p className="hidden font-mono text-xs text-white/50 sm:block">Clinical grade · {specialties.length} specialties</p>
            <p className="eyebrow">Journey 02 — For dentists</p>
          </div>
          <h2 id="j-dentists" className="display relative mt-4 whitespace-nowrap text-right text-[clamp(5.5rem,19vw,19rem)] leading-[0.82] tracking-[-0.06em]" data-drift="12">
            <span className="block pr-[4vw]"><span className="font-serif font-normal italic text-teal">D</span>entists</span>
          </h2>
          <InstrumentStage
            dark
            spin={-1}
            className="absolute inset-x-0 top-[3.5rem] h-[clamp(18rem,40vw,34rem)] lg:top-[4rem]"
            items={[
              { kind: "handpiece", x: -2.9, y: 0.1, z: 1.4, rz: -1.1, rx: 0.4, scale: 1.25 },
              { kind: "forceps", x: 1.0, y: 0.2, z: 0.6, rz: 0.4, rx: 0.1, scale: 1.0 },
              { kind: "scaler", x: 3.9, y: -0.2, z: 1.2, rz: -0.7, scale: 1.0 },
              { kind: "probe", x: -0.6, y: -0.5, z: -0.8, rz: 1.9, scale: 0.95 },
            ]}
          />
        </div>

        <div className="container-x relative grid gap-14 pb-24 pt-14 lg:grid-cols-[1.4fr_1fr] lg:gap-24 lg:pb-32 lg:pt-20">
          <nav aria-label="Specialties" className="order-2 lg:order-1">
            <ol className="border-t border-white/10" data-stagger>
              {specialties.map((s, i) => (
                <li key={s.slug} className="border-b border-white/10">
                  <Link href={`/dentists/${s.slug}`} className="group/s flex items-center gap-5 py-4 sm:py-5" data-cursor="link">
                    <span className="w-8 font-mono text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span>
                    <span className="display flex-1 text-[clamp(1.4rem,2.6vw,2.2rem)] leading-none text-white transition-[transform,color] duration-500 ease-[var(--ease-out-soft)] group-hover/s:translate-x-3 group-hover/s:text-teal">
                      {s.name}
                    </span>
                    {s.count > 0 && <span className="font-mono text-xs text-white/40">{s.count}</span>}
                    <ArrowUpRight className="size-5 text-white/30 transition-all duration-500 group-hover/s:rotate-45 group-hover/s:text-teal" />
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <h3 className="display text-[clamp(1.9rem,3.2vw,2.9rem)] leading-[1.02]" data-split>
              <Words text="Clinical precision," accent="sourced for you." accentClass="font-serif font-normal italic text-teal" />
            </h3>
            <p className="max-w-md text-lg leading-relaxed text-white/65" data-rise>
              Handpieces, burs, endodontic files, composites and equipment — organised by the work you do, with real stock and real prices.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dentists" className="btn btn-light btn-lg w-fit" data-magnetic>
                Shop Professional Supplies <ArrowUpRight className="size-4" />
              </Link>
              <Link href="/categories/equipment" className="btn btn-outline-light btn-lg w-fit" data-magnetic>Equipment</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
